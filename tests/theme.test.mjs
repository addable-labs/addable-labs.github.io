import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { parse } from "node-html-parser";
import { resolve } from "../scripts/lib/theme-logic.mjs";
import { buildSite, ROOT, tempDir } from "./helpers.mjs";

const SCRIPT_FILE = path.join(ROOT, "src", "assets", "js", "theme.js");
const LOGIC_FILE = path.join(ROOT, "scripts", "lib", "theme-logic.mjs");
const DARK_BACKGROUND = "#0B0E10";

async function walkHtml(dir) {
  const { walk } = await import("../scripts/lib/site.mjs");
  return walk(dir, ".html");
}

describe("theme logic (REQ-007 as amended by A-03/A-04, D-13)", () => {
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

describe("theme script and toggle in the built site", () => {
  let temp;
  let out;
  let script;
  let pages;
  before(async () => {
    temp = await tempDir("theme-");
    out = buildSite(temp.dir);
    script = await readFile(SCRIPT_FILE, "utf8");
    pages = await walkHtml(out);
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
      const scripts = doc.querySelectorAll("script");
      assert.equal(scripts.length, 1, `${file}: expected exactly one <script>`);
      assert.equal(scripts[0].getAttribute("src"), undefined, `${file}: the theme script must be inline`);
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
      assert.equal(metas[0].getAttribute("content"), DARK_BACKGROUND, file);
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

  it("keeps the two font preloads (AC-05) and adds no external script", async () => {
    const doc = parse(await readFile(path.join(out, "index.html"), "utf8"));
    assert.equal(doc.querySelectorAll('link[rel="preload"][as="font"]').length, 2);
    assert.equal(doc.querySelectorAll("script[src]").length, 0);
  });

  it("hides the toggle without JavaScript and declares the view transition under no-preference only", async () => {
    const css = await readFile(path.join(out, "assets", "css", "base.css"), "utf8");
    assert.match(css, /html:not\(\.js\)\s+\.theme-toggle\s*\{\s*display:\s*none;?\s*\}/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*auto;?\s*\}\s*\}/);
    assert.doesNotMatch(css, /prefers-color-scheme/);
  });
});
