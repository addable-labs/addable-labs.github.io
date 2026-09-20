import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio, findColorLiterals, parseTokens, relativeLuminance } from "../scripts/lib/contrast.mjs";
import { fixture, runGate, SRC } from "./helpers.mjs";

describe("contrast library", () => {
  it("computes WCAG luminance and ratios", () => {
    assert.equal(relativeLuminance("#000000"), 0);
    assert.equal(relativeLuminance("#ffffff"), 1);
    assert.equal(Number(contrastRatio("#000", "#fff").toFixed(2)), 21);
    assert.equal(Number(contrastRatio("#1B1F23", "#FAFAF7").toFixed(2)), 15.85);
  });

  it("parses light and dark token sets, falling back to light values", () => {
    const tokens = parseTokens(`
      :root { --color-bg: #fff; --color-text: #000; }
      @media (prefers-color-scheme: dark) { :root { --color-bg: #000; } }
    `);
    assert.deepEqual(tokens.light, { "--color-bg": "#fff", "--color-text": "#000" });
    assert.deepEqual(tokens.dark, { "--color-bg": "#000", "--color-text": "#000" });
  });

  it("finds colour literals in declaration values only", () => {
    const findings = findColorLiterals(`
      .a { color: #333; }
      .b { background: white; }
      .c { border-color: rgb(1 2 3); }
      .d { white-space: nowrap; content: "red"; color: var(--color-text); }
    `);
    assert.deepEqual(findings.map((f) => f.literal), ["#333", "white", "rgb("]);
  });
});

describe("contrast gate", () => {
  it("passes on the real stylesheets", () => {
    const { status, output } = runGate("contrast", "", SRC);
    assert.equal(status, 0, output);
    assert.match(output, /PASS contrast/);
  });

  it("fails when a text pair drops below 4.5:1", () => {
    const { status, output } = runGate("contrast", "", fixture("contrast-weak", "src"));
    assert.equal(status, 1);
    assert.match(output, /light {2}--color-text-muted {5}on --color-bg .* text ≥ 4\.5:1 {2}FAIL/);
    assert.match(output, /FAIL contrast/);
  });

  it("fails on a colour literal outside tokens.css, naming the file and line", () => {
    const { status, output } = runGate("contrast", "", fixture("contrast-literal", "src"));
    assert.equal(status, 1);
    assert.match(output, /base\.css:\d+ {2}colour literal "#333" in "color: #333" {2}FAIL/);
  });
});
