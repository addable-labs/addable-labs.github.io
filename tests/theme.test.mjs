import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { parse } from "node-html-parser";
import { parseTokens } from "../scripts/lib/contrast.mjs";
import { walk } from "../scripts/lib/site.mjs";
import { resolve } from "../scripts/lib/theme-logic.mjs";
import { buildSite, ROOT, SRC, tempDir } from "./helpers.mjs";

const SCRIPT_FILE = path.join(ROOT, "src", "assets", "js", "theme.js");
const LOGIC_FILE = path.join(ROOT, "scripts", "lib", "theme-logic.mjs");
const TOKENS_FILE = path.join(ROOT, "src", "assets", "css", "tokens.css");
const TOKENS = parseTokens(await readFile(TOKENS_FILE, "utf8"));
const DARK_BACKGROUND = TOKENS.dark["--color-bg"];

// Three files repeat token values as literals, changed by hand
// (docs/identity.md, "Changing a colour"). Every hex literal in each file, in
// source order, with the token and theme it copies.
const COPIES = {
  "src/_includes/partials/head.njk": [
    ["the theme-color meta", "--color-bg", "dark"],
  ],
  "src/assets/js/theme.js": [
    ["the theme-color for dark", "--color-bg", "dark"],
    ["the theme-color for light", "--color-bg", "light"],
  ],
  "src/favicon.svg": [
    ["the tile fill", "--color-bg", "dark"],
    ["the tile edge", "--color-bg", "dark"],
    ["the tile edge on a light tab bar", "--color-accent-text", "light"],
    ["the plus", "--color-accent", "dark"],
  ],
};

// A hex colour literal, as both tests below find one: "#" and three to eight
// hex digits. "&#8212;" is a character reference, not a colour.
const HEX_COLOUR = /(?<!&)#[0-9a-f]{3,8}\b/gi;

describe("theme logic (REQ-007)", () => {
  it("returns light only for a stored \"light\" choice", () => {
    assert.equal(resolve("light"), "light");
    assert.equal(resolve("dark"), "dark");
  });

  it("returns dark for anything else — no OS input, no third state", () => {
    for (const stored of [undefined, null, "", "system", "auto", "LIGHT", 0, {}]) {
      assert.equal(resolve(stored), "dark", `resolve(${JSON.stringify(stored)})`);
    }
  });

  it("consults no media query", async () => {
    const logic = await readFile(LOGIC_FILE, "utf8");
    assert.doesNotMatch(logic, /matchMedia|prefers-color-scheme/);
  });
});

describe("colours copied by hand from tokens.css", () => {
  it("head.njk, theme.js and favicon.svg repeat the token values they copy, literal for literal", async () => {
    // Collect every stale copy before failing: a changed token leaves several.
    const stale = [];
    for (const [file, copies] of Object.entries(COPIES)) {
      const text = await readFile(path.join(ROOT, file), "utf8");
      const literals = [...text.matchAll(HEX_COLOUR)];
      assert.equal(literals.length, copies.length, `${file} has ${literals.length} colour literals (${literals.map(([hex]) => hex).join(", ")}), COPIES lists ${copies.length}: name the token each one copies`);
      copies.forEach(([what, token, scheme], i) => {
        const [literal] = literals[i];
        const value = TOKENS[scheme][token];
        if (literal.toLowerCase() !== value?.toLowerCase()) {
          const line = text.slice(0, literals[i].index).split("\n").length;
          stale.push(`${file}:${line}: ${what} is ${literal}, but ${token} (${scheme}) in tokens.css is ${value}`);
        }
      });
    }
    assert.deepEqual(stale, []);
  });

  it("no other file under src/ has a hex colour literal (a new copy goes in COPIES)", async () => {
    // tokens.css holds the colours and COPIES names every file that repeats
    // one; a literal anywhere else would be a copy that nothing checks. Binary
    // files (the fonts) are skipped: they contain a NUL byte, text never does.
    const covered = new Set([TOKENS_FILE, ...Object.keys(COPIES).map((file) => path.join(ROOT, file))]);
    const found = [];
    for (const file of await walk(SRC)) {
      if (covered.has(file)) continue;
      const bytes = await readFile(file);
      if (bytes.includes(0)) continue;
      const text = bytes.toString("utf8");
      for (const match of text.matchAll(HEX_COLOUR)) {
        const line = text.slice(0, match.index).split("\n").length;
        found.push(`${path.relative(ROOT, file)}:${line}: ${match[0]}`);
      }
    }
    assert.deepEqual(found, []);
  });
});

describe("theme script and toggle in the built site", () => {
  let temp;
  let out;
  let script;
  let pages;
  before(async () => {
    temp = await tempDir("theme-");
    out = buildSite(temp.dir);
    script = await readFile(SCRIPT_FILE, "utf8");
    pages = await walk(out, ".html");
  });
  after(() => temp.cleanup());

  it("ships the tested resolve() verbatim and no matchMedia (no drift)", async () => {
    // The module's function sits at column 0, the script's inside an IIFE:
    // compare line by line with the indentation removed, nothing else.
    const dedent = (text) => text.split("\n").map((line) => line.trimStart()).join("\n");
    const logic = await readFile(LOGIC_FILE, "utf8");
    const source = /function resolve\(stored\) \{[\s\S]*?\n\}/.exec(logic)?.[0];
    assert.ok(source, "theme-logic.mjs exports function resolve(stored)");
    const shipped = /function resolve\(stored\) \{[\s\S]*?\n\s*\}/.exec(script)?.[0];
    assert.ok(shipped, "theme.js defines function resolve(stored)");
    assert.equal(dedent(shipped), dedent(source), "theme.js's resolve() differs from scripts/lib/theme-logic.mjs");
    assert.doesNotMatch(script, /matchMedia|prefers-color-scheme/);
    assert.match(script, /"addable-theme"/);
    assert.match(script, /data-theme-toggle/);
  });

  it("inlines the script unchanged in every page, before the stylesheets", async () => {
    assert.ok(pages.length > 0);
    for (const file of pages) {
      const html = await readFile(file, "utf8");
      const doc = parse(html);
      const scripts = doc.querySelectorAll("script:not([src])");
      assert.equal(scripts.length, 1, `${file}: expected exactly one inline <script>`);
      assert.equal(scripts[0].textContent, script, `${file}: inline script differs from src/assets/js/theme.js`);
      const head = html.slice(0, html.indexOf("</head>"));
      assert.ok(head.indexOf("<script>") < head.indexOf('rel="stylesheet"'), `${file}: the script must precede the stylesheets`);
      assert.doesNotMatch(html, /matchMedia/);
    }
  });

  it("carries one theme-color meta with the dark background and color-scheme dark light", async () => {
    for (const file of pages) {
      const doc = parse(await readFile(file, "utf8"));
      const metas = doc.querySelectorAll('meta[name="theme-color"]');
      assert.equal(metas.length, 1, `${file}: expected exactly one theme-color meta`);
      assert.equal(metas[0].getAttribute("content")?.toLowerCase(), DARK_BACKGROUND.toLowerCase(), `${file}: theme-color must be --color-bg (dark) in tokens.css`);
      assert.equal(metas[0].getAttribute("media"), undefined, `${file}: theme-color must not depend on the OS scheme`);
      assert.equal(doc.querySelector('meta[name="color-scheme"]')?.getAttribute("content"), "dark light", file);
    }
  });

  it("has an accessible, pressed toggle button in the header and the footer of every page", async () => {
    const expectedLabel = { en: "Dark mode", sv: "Mörkt läge" };
    for (const file of pages) {
      const doc = parse(await readFile(file, "utf8"));
      const lang = doc.querySelector("html")?.getAttribute("lang");
      for (const landmark of ["header", "footer"]) {
        const buttons = doc.querySelectorAll(`${landmark} button[data-theme-toggle]`);
        assert.equal(buttons.length, 1, `${file}: expected one toggle in the ${landmark}`);
        const button = buttons[0];
        assert.equal(button.getAttribute("type"), "button", file);
        assert.equal(button.getAttribute("aria-pressed"), "true", `${file}: dark is the default, so aria-pressed starts as "true"`);
        assert.equal(button.querySelector(".theme-toggle-label")?.textContent.trim(), expectedLabel[lang], `${file}: toggle label in ${lang}`);
        assert.equal(button.querySelector("svg")?.getAttribute("aria-hidden"), "true", file);
      }
    }
  });

  it("keeps the two font preloads (AC-05); the only external script is the same-origin deferred reveal.js", async () => {
    const doc = parse(await readFile(path.join(out, "index.html"), "utf8"));
    assert.equal(doc.querySelectorAll('link[rel="preload"][as="font"]').length, 2);
    const external = doc.querySelectorAll("script[src]");
    assert.equal(external.length, 1);
    assert.equal(external[0].getAttribute("src"), "/assets/js/reveal.js");
    assert.equal(external[0].getAttribute("type"), "module");
  });

  it("hides the toggle without JavaScript and declares the view transition under no-preference only", async () => {
    const css = await readFile(path.join(out, "assets", "css", "base.css"), "utf8");
    assert.match(css, /html:not\(\.js\)\s+\.theme-toggle\s*\{\s*display:\s*none;?\s*\}/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*auto;?\s*\}\s*\}/);
    assert.doesNotMatch(css, /prefers-color-scheme/);
  });

  it("prints the light set with every section in place, regardless of scroll (REQ-018, REQ-022)", async () => {
    // Print never scrolls, so nothing may wait for reveal.js; and the dark set
    // on white paper (backgrounds off by default) is faint. String-level: the
    // block exists once and covers the switch rule and the entrance rules.
    const css = await readFile(path.join(out, "assets", "css", "base.css"), "utf8");
    const starts = [...css.matchAll(/@media\s+print\s*\{/g)];
    assert.equal(starts.length, 1, "expected exactly one @media print block");
    let depth = 1;
    let end = starts[0].index + starts[0][0].length;
    while (end < css.length && depth > 0) {
      if (css[end] === "{") depth += 1;
      else if (css[end] === "}") depth -= 1;
      end += 1;
    }
    const block = css.slice(starts[0].index, end);
    assert.match(block, /:root\[data-theme\][^{]*\{[^}]*color-scheme:\s*light;/, "print must force the light set past the data-theme switch");
    assert.match(block, /html\.js \.reveal[^{]*\{[^}]*opacity:\s*1;[^}]*animation:\s*none;/, "print must show every .reveal in place");
    assert.match(block, /html\.js \.console \.log-line[^{]*\{/, "print must show the console's log lines in place");
    assert.doesNotMatch(block, /--color-/, "no token is redefined for print (tokens.css owns colour)");
  });
});
