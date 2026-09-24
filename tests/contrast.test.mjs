import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import {
  auditTokens,
  checkSwitchRules,
  contrastRatio,
  findColorLiterals,
  findSchemeMediaQueries,
  parseLightDark,
  parseTokens,
  relativeLuminance,
} from "../scripts/lib/contrast.mjs";
import { runGate, SRC, tempDir } from "./helpers.mjs";

const TOKENS_FILE = path.join(SRC, "assets", "css", "tokens.css");
const LIGHT_SWITCH = ':root[data-theme="light"] { color-scheme: light; }';
const PAIR_LINE = /^(light|dark) +--color-/;

// The redesign's tokens.css structure in miniature: fallback,
// then the light-dark() pair, per token; invariant tokens plain.
const SIGNAL_LIKE = `
  :root {
    color-scheme: dark;
    --color-bg: #0B0E10;
    --color-bg: light-dark(#F7F8F6, #0B0E10);
    --color-accent: #83F35D;
    --color-glow: rgba(131, 243, 93, 0.16);
    --color-glow: light-dark(rgba(131, 243, 93, 0.22), rgba(131,243,93,0.16));
  }
  ${LIGHT_SWITCH}
  :root[data-theme="dark"] { color-scheme: dark; }
`;

describe("contrast library", () => {
  it("computes WCAG luminance and ratios", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#ffffff"), 1);
    assert.equal(Number(contrastRatio("#000", "#fff").toFixed(2)), 21);
    assert.equal(Number(contrastRatio("#14191D", "#F7F8F6").toFixed(2)), 16.61);
    assert.equal(Number(contrastRatio("#83F35D", "#0B0E10").toFixed(2)), 13.78);
  });

  it("parses the light-dark() structure into light and dark sets (REQ-006)", () => {
    const tokens = parseTokens(SIGNAL_LIKE);
    assert.deepEqual(tokens.light, {
      "--color-bg": "#F7F8F6",
      "--color-accent": "#83F35D",
      "--color-glow": "rgba(131, 243, 93, 0.22)",
    });
    assert.deepEqual(tokens.dark, {
      "--color-bg": "#0B0E10",
      "--color-accent": "#83F35D",
      "--color-glow": "rgba(131,243,93,0.16)",
    });
    assert.deepEqual(tokens.problems, []);
  });

  it("reads light-dark() values, keeping commas inside nested functions", () => {
    assert.deepEqual(parseLightDark("light-dark(rgba(1, 2, 3, 0.2), #fff)"), { light: "rgba(1, 2, 3, 0.2)", dark: "#fff" });
    assert.equal(parseLightDark("#fff"), null);
    assert.throws(() => parseLightDark("light-dark(#fff)"), /exactly two colours/);
  });

  it("fails the equality check when a fallback differs from the dark value, naming the token", () => {
    const { problems } = parseTokens(`:root { --color-bg: #000000; --color-bg: light-dark(#F7F8F6, #0B0E10); }`);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^--color-bg: plain fallback #000000 does not equal its dark value #0B0E10/);
  });

  it("requires the plain fallback to precede the pair", () => {
    const missing = parseTokens(`:root { --color-bg: light-dark(#fff, #000); }`).problems;
    assert.equal(missing.length, 1);
    assert.match(missing[0], /^--color-bg: light-dark\(\) declaration has no plain fallback before it/);

    const overridden = parseTokens(`:root { --color-bg: #000; --color-bg: light-dark(#fff, #000); --color-bg: #111; }`);
    assert.match(overridden.problems.join("\n"), /--color-bg: plain declaration #111 follows the light-dark\(\) pair/);
    assert.equal(overridden.light["--color-bg"], "#111");
    assert.equal(overridden.dark["--color-bg"], "#111");
  });

  it("rejects colour tokens declared outside :root, naming where (REQ-024)", () => {
    const { problems, light } = parseTokens(`
      :root { --color-bg: #000; }
      :root[data-theme="light"] { color-scheme: light; --color-bg: #fff; }
      @supports (color: light-dark(#000, #fff)) { :root { --color-text: #eee; } }
      .card { --color-card: #333; }
    `);
    assert.deepEqual(
      problems.map((p) => p.split(";")[0]),
      [
        '--color-bg is declared outside :root (in ":root[data-theme="light"]")',
        '--color-text is declared outside :root (in "@supports (color: light-dark(#000, #fff)) > :root")',
        '--color-card is declared outside :root (in ".card")',
      ],
    );
    assert.deepEqual(light, { "--color-bg": "#000" });
  });

  it("checks the two switch rules", () => {
    assert.deepEqual(checkSwitchRules(SIGNAL_LIKE), []);
    const noLight = checkSwitchRules(SIGNAL_LIKE.replace(LIGHT_SWITCH, ""));
    assert.equal(noLight.length, 1);
    assert.match(noLight[0], /^missing switch rule :root\[data-theme="light"\] \{ color-scheme: light \} \(found none\)/);
    const lightFirst = checkSwitchRules(SIGNAL_LIKE.replace("color-scheme: dark;", "color-scheme: light;"));
    assert.equal(lightFirst.length, 1);
    assert.match(lightFirst[0], /^missing switch rule :root \{ color-scheme: dark \} \(found color-scheme: light\)/);
  });

  it("finds prefers-color-scheme media queries with their line", () => {
    assert.deepEqual(findSchemeMediaQueries(SIGNAL_LIKE), []);
    const found = findSchemeMediaQueries(`:root { color-scheme: dark; }\n@media screen and (prefers-color-scheme: light) {\n  :root:not([data-theme]) { color-scheme: light; }\n}`);
    assert.deepEqual(found, [{ line: 2, query: "@media screen and (prefers-color-scheme: light)" }]);
  });

  it("rejects the first build's structure: a token outside :root and a media query (REQ-024)", () => {
    // The first build's tokens: the light set on :root, the dark set
    // re-declared under the OS media query. The switch rules are in place, so
    // the problems left are the two that structure causes.
    const firstBuild = `
      :root { color-scheme: dark; }
      ${LIGHT_SWITCH}
      :root { --color-bg: #fff; --color-text: #000; }
      @media (prefers-color-scheme: dark) {
        :root { --color-bg: #000; }
      }
    `;
    assert.deepEqual(auditTokens(firstBuild).problems, [
      '--color-bg is declared outside :root (in "@media (prefers-color-scheme: dark) > :root"); colour tokens live only on :root (REQ-024)',
      'line 5: "@media (prefers-color-scheme: dark)" — tokens.css may not contain a prefers-color-scheme media query; dark is the default and light is reached only through the toggle',
    ]);
  });

  it("finds colour literals in declaration values only", () => {
    const findings = findColorLiterals(`
      .a { color: #333; }
      .b { background: white; }
      .c { border-color: rgb(1 2 3); }
      .d { white-space: nowrap; content: "red"; color: var(--color-text); }
      @font-face { font-family: "Fallback Menlo"; src: local("Menlo"), url("/assets/fonts/x.woff2") format("woff2"); }
    `);
    assert.deepEqual(findings.map((f) => f.literal), ["#333", "white", "rgb("]);
  });
});

describe("contrast gate", () => {
  let tokens;
  let temp;
  before(async () => {
    tokens = await readFile(TOKENS_FILE, "utf8");
    temp = await tempDir("contrast-");
  });
  after(() => temp.cleanup());

  // A source tree whose tokens.css is the real one, transformed unless
  // `transform` is null, with `extraFiles` (file name → text) beside it. A
  // transform must change the text so a stale replacement cannot pass silently.
  let variants = 0;
  async function variant(transform, extraFiles = {}) {
    const dir = path.join(temp.dir, `variant-${(variants += 1)}`);
    await mkdir(path.join(dir, "assets", "css"), { recursive: true });
    const changed = transform ? transform(tokens) : tokens;
    if (transform) assert.notEqual(changed, tokens, "the variant transform changed nothing");
    await writeFile(path.join(dir, "assets", "css", "tokens.css"), changed);
    for (const [name, text] of Object.entries(extraFiles)) {
      await writeFile(path.join(dir, "assets", "css", name), text);
    }
    return dir;
  }

  it("passes on the real stylesheets with 43 pair lines and two skips (AC-06)", () => {
    const { status, output } = runGate("contrast", "", SRC);
    assert.equal(status, 0, output);
    const lines = output.split("\n");
    const pairLines = lines.filter((line) => PAIR_LINE.test(line));
    assert.equal(pairLines.length, 43, pairLines.join("\n"));
    assert.equal(pairLines.filter((line) => line.startsWith("light")).length, 22);
    assert.equal(pairLines.filter((line) => line.startsWith("dark")).length, 21);
    assert.ok(pairLines.every((line) => / (text ≥ 4\.5:1|ui {3}≥ 3:1) {2}ok$/.test(line)), pairLines.join("\n"));
    // The primary-button edge pair is light-only (on dark the edge is the surface colour).
    const edge = pairLines.filter((line) => /--color-accent-strong {3}on --color-accent /.test(line));
    assert.equal(edge.length, 1);
    assert.match(edge[0], /^light .* ui {3}≥ 3:1 {2}ok$/);
    // Every brand pair AC-06 names is evaluated.
    for (const pair of ["--color-accent-text     on --color-bg", "--color-accent-text     on --color-surface", "--color-on-accent       on --color-accent", "--color-on-accent       on --color-secondary", "--color-border          on --color-surface-2", "--color-focus           on --color-bg"]) {
      assert.ok(pairLines.some((line) => line.includes(pair)), `no pair line for ${pair}`);
    }
    const skips = lines.filter((line) => line.startsWith("skip "));
    assert.deepEqual(
      skips.map((line) => line.split(/\s+/)[1]),
      ["--color-hairline", "--color-glow"],
    );
    assert.match(output, /tokens\.css {2}structure {2}dark on :root, light only under :root\[data-theme="light"\], every fallback equals its dark value, no prefers-color-scheme media query, no --color-\* outside :root {2}ok/);
    assert.match(output, /checked 22 token pairs \(43 evaluations over 2 schemes\) and 15 colour tokens/);
    assert.match(output, /scanned for colour literals: src\/assets\/css\/base\.css, src\/assets\/css\/fonts\.css/);
    assert.match(output, /PASS contrast/);
  });

  it("fails when a text pair drops below 4.5:1", async () => {
    // The light --color-text-muted becomes a mid grey, below 4.5:1 on every
    // background but a near-black one, so exactly its light pairs fail. The
    // count follows those pairs, so a new surface it sits on needs no edit here.
    const src = await variant((css) => css.replace(/(--color-text-muted: light-dark\()[^,]+/, "$1#9AA0A6"));
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /light {2}--color-text-muted {6}on --color-bg .* text ≥ 4\.5:1 {2}FAIL/);
    const lines = output.split("\n");
    const failed = lines.filter((line) => line.endsWith("  FAIL"));
    assert.deepEqual(failed, lines.filter((line) => line.startsWith("light  --color-text-muted ")));
    assert.match(output, new RegExp(`FAIL contrast \\(${failed.length} problems\\)`));
  });

  it("fails on a colour literal outside tokens.css, naming the file and line", async () => {
    const src = await variant(null, { "base.css": "body {\n  color: #333;\n  background: var(--color-bg);\n}\n" });
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /base\.css:2 {2}colour literal "#333" in "color: #333" {2}FAIL/);
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });

  it("fails when a fallback does not equal its dark value, naming the token", async () => {
    // The plain --color-bg declaration (the fallback before its light-dark()
    // pair) takes the light value, whatever the two values are.
    const { light, dark } = parseTokens(tokens);
    const src = await variant((css) => css.replace(/--color-bg: (?!light-dark\()[^;]+;/, `--color-bg: ${light["--color-bg"]};`));
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, new RegExp(`structure {2}--color-bg: plain fallback ${light["--color-bg"]} does not equal its dark value ${dark["--color-bg"]} .* FAIL`));
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });

  it("fails when the light switch rule is missing", async () => {
    const src = await variant((css) => css.replace(LIGHT_SWITCH, ""));
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /structure {2}missing switch rule :root\[data-theme="light"\] \{ color-scheme: light \} .* FAIL/);
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });

  it("fails when tokens.css contains a prefers-color-scheme media query", async () => {
    const src = await variant((css) => `${css}\n@media (prefers-color-scheme: light) {\n  :root { color-scheme: light; }\n}\n`);
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /structure {2}line \d+: "@media \(prefers-color-scheme: light\)" — tokens\.css may not contain a prefers-color-scheme media query.* FAIL/);
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });

  it("fails when a colour token is declared outside :root", async () => {
    const src = await variant((css) => css.replace(LIGHT_SWITCH, ':root[data-theme="light"] { color-scheme: light; --color-bg: #FFFFFF; }'));
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /structure {2}--color-bg is declared outside :root \(in ":root\[data-theme="light"\]"\).* FAIL/);
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });

  it("fails when a colour token is in no pair and not decorative", async () => {
    // A new token as the first line of the :root block.
    const src = await variant((css) => css.replace(/^:root \{$/m, ":root {\n  --color-extra: #FFFFFF;"));
    const { status, output } = runGate("contrast", "", src);
    assert.equal(status, 1);
    assert.match(output, /--color-extra is in no PAIRS entry and not listed in DECORATIVE.* FAIL/);
    assert.match(output, /FAIL contrast \(1 problem\)/);
  });
});
