// The article figures' character budgets against what base.css draws
// (si-di5e; src/_includes/figures/figures.mjs). The type table the budgets
// are computed from is the one base.css sets the figure classes in, and a
// panel's head line, the head and its value on the right, fits between the
// margins at the head's letter-spacing: a head the build lets through never
// runs into its value or past the right margin. The drawn widths here come
// from base.css, not from the module, so a budget that drifts from the CSS
// fails.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { FIGURES, MEASURED_LINES, renderFigure, TYPE } from "../src/_includes/figures/figures.mjs";
import { SRC } from "./helpers.mjs";

const CSS = await readFile(path.join(SRC, "assets", "css", "base.css"), "utf8");
const STRINGS = {};
for (const lang of ["en", "sv"]) STRINGS[lang] = JSON.parse(await readFile(path.join(SRC, "_data", "strings", `${lang}.json`), "utf8"));

// A panel is 320 units wide with margins of 16; JetBrains Mono advances 600
// of its 1000 units per em (src/assets/css/fonts.css).
const WIDTH = 320;
const MARGIN = 16;
const MONO = 0.6;

/** The declarations of base.css's rule for exactly `selector`. */
function rule(selector) {
  const match = CSS.match(new RegExp(`^${selector.replace(/\./g, "\\.")} \\{([^}]*)\\}`, "m"));
  assert.ok(match, `base.css has a rule for ${selector}`);
  return match[1];
}

/** The size (units) and letter-spacing (em) base.css draws a class's text at. */
function drawnType(selector) {
  const css = rule(selector);
  const size = css.match(/font(?:-size)?:[^;]*?([\d.]+)px/);
  assert.ok(size, `${selector} sets a font size`);
  const spacing = css.match(/letter-spacing:\s*([-\d.]+)em/);
  return { size: Number(size[1]), spacing: spacing ? Number(spacing[1]) : 0 };
}

/**
 * Where a panel's head and its value are drawn, in units, from base.css:
 * Chrome adds the letter-spacing after every character, the last one too,
 * so a text of n characters takes n advances.
 */
function headGeometry(head, value) {
  const { size, spacing } = drawnType(".fig-head");
  const advance = size * (MONO + spacing);
  return { advance, headEnd: MARGIN + head.length * advance, valueStart: value === undefined ? null : WIDTH - MARGIN - value.length * advance };
}

/** A copy of the strings in `lang`, changed by `set(strings.figures[id])`. */
function withHead(lang, id, set) {
  const strings = structuredClone(STRINGS[lang]);
  set(strings.figures[id]);
  return strings;
}

/** A copy of the strings in `lang` with every string of figure `id` that reads `from` reading `to`. */
function replaced(lang, id, from, to) {
  const strings = structuredClone(STRINGS[lang]);
  const walk = (node) => {
    for (const [key, value] of Object.entries(node)) {
      if (value === from) node[key] = to;
      else if (value && typeof value === "object") walk(value);
    }
  };
  walk(strings.figures[id]);
  return strings;
}

/** Every panel's head line of every figure in `lang`: the head and its value, if any. */
function headLines(lang) {
  return Object.entries(FIGURES).flatMap(([id, draw]) =>
    draw(STRINGS[lang].figures[id], id, `fig-${id}`).panels.map((panel, i) => ({
      id,
      key: `fig-${id}-p${i + 1}.head`,
      head: panel.head,
      value: panel.headRight?.value,
      line: panel.headRight ? `${panel.head} ${panel.headRight.value}` : panel.head,
    })),
  );
}

describe("figure type (si-di5e)", () => {
  it("budgets each type size at the size and letter-spacing base.css draws it at", () => {
    const CLASSES = { label: ".fig-label", small: ".fig-small", note: ".fig-note", head: ".fig-head" };
    assert.deepEqual(Object.keys(TYPE), Object.keys(CLASSES));
    for (const [name, selector] of Object.entries(CLASSES)) assert.deepEqual(TYPE[name], drawnType(selector), `${name}: ${selector}`);
  });

  it("spaces only the head: no other figure class sets a letter- or word-spacing", () => {
    const spaced = [...CSS.matchAll(/^(\.fig-[\w-]+) \{([^}]*)\}/gm)].filter(([, , body]) => /(letter|word)-spacing/.test(body)).map(([, selector]) => selector);
    assert.deepEqual(spaced, [".fig-head"]);
  });
});

describe("a panel's head line (si-di5e)", () => {
  // The old budgets took 6.6 units a character and gave a head beside a
  // value 200 units (30 characters) and the value 104 (15): both at their
  // most, the head is drawn 28.8 units into the value. A head alone had 288
  // units (43 characters) and is drawn 14.7 units past the right margin.
  it("refuses a head the old budget let through that is drawn into its value", () => {
    const head = "x".repeat(30);
    const value = STRINGS.en.figures.build.panels.release.window;
    assert.equal(value.length, 15);
    const { headEnd, valueStart } = headGeometry(head, value);
    assert.ok(headEnd > valueStart, `drawn into the value: the head ends at ${headEnd}, the value starts at ${valueStart}`);
    const strings = withHead("en", "build", (t) => (t.panels.release.head = head));
    assert.throws(() => renderFigure("build", { placement: "wide", strings }), /^Error: Figure label "fig-build-p3\.head" is 46 characters; at most 40 fit its slot \("x{30} 00:04–00:14 UTC"\)$/);
  });

  it("refuses a head the old budget let through that is drawn past the right margin", () => {
    const head = "x".repeat(43);
    const { headEnd } = headGeometry(head);
    assert.ok(headEnd > WIDTH - MARGIN, `past the margin: the head ends at ${headEnd}`);
    const strings = withHead("en", "loop", (t) => (t.head = head));
    assert.throws(() => renderFigure("loop", { placement: "inline", strings }), /^Error: Figure label "fig-loop-p1\.head" is 43 characters; at most 40 fit its slot/);
  });

  it("takes the longest head that is drawn inside the margins, and at least a space before its value, and no character more", () => {
    // Alone: 40 characters end inside the margin, 41 do not.
    for (const [length, fits] of [[40, true], [41, false]]) {
      const head = "x".repeat(length);
      assert.equal(headGeometry(head).headEnd <= WIDTH - MARGIN, fits, `${length} characters drawn inside the margin`);
      const render = () => renderFigure("loop", { placement: "inline", strings: withHead("en", "loop", (t) => (t.head = head)) });
      if (fits) assert.doesNotThrow(render, `${length} characters`);
      else assert.throws(render, /is 41 characters; at most 40 fit/);
    }
    // Beside the 15 characters of a window: 24 leave at least a space, 25 do not.
    for (const [length, fits] of [[24, true], [25, false]]) {
      const head = "x".repeat(length);
      const { advance, headEnd, valueStart } = headGeometry(head, "00:04–00:14 UTC");
      assert.equal(valueStart - headEnd >= advance, fits, `${length} characters a space or more before the value`);
      const render = () => renderFigure("build", { placement: "wide", strings: withHead("en", "build", (t) => (t.panels.release.head = head)) });
      if (fits) assert.doesNotThrow(render, `${length} characters`);
      else assert.throws(render, /is 41 characters; at most 40 fit/);
    }
  });

  it("draws every head line of every figure inside the margins and a space before its value, in both languages, but for the measured lines", () => {
    for (const lang of ["en", "sv"]) {
      for (const id of Object.keys(FIGURES)) assert.doesNotThrow(() => renderFigure(id, { placement: "wide", strings: STRINGS[lang] }), `${lang}: ${id}`);
      for (const { key, head, value, line } of headLines(lang)) {
        if (MEASURED_LINES.includes(line)) continue;
        const { advance, headEnd, valueStart } = headGeometry(head, value);
        if (value === undefined) assert.ok(headEnd <= WIDTH - MARGIN, `${lang}: ${key} ends at ${headEnd} ("${head}")`);
        else assert.ok(valueStart - headEnd >= advance, `${lang}: ${key} ends at ${headEnd}, its value starts at ${valueStart} ("${line}")`);
      }
    }
  });

  it("keeps each measured line only as it is drawn today: one character over, in one panel, and a character more fails", () => {
    for (const measured of MEASURED_LINES) {
      const rows = ["en", "sv"].flatMap((lang) => headLines(lang).filter((row) => row.line === measured).map((row) => ({ lang, ...row })));
      assert.equal(rows.length, 1, `"${measured}" is the head line of one panel`);
      assert.equal(measured.length, 41, `"${measured}" is one character over`);
      const [{ lang, id, key, head }] = rows;
      const strings = replaced(lang, id, head, `${head}s`);
      assert.throws(() => renderFigure(id, { placement: "wide", strings }), /is 42 characters; at most 40 fit/, `${lang}: ${key} one character longer`);
    }
  });
});
