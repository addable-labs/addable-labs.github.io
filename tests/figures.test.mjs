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
import { FIGURES, FLOW_FROM_REM, FLOW_SCALE, FLOW_WIDTH, MEASURED_LINES, renderFigure, TYPE } from "../src/_includes/figures/figures.mjs";
import { LABEL_MIN_PX, LABEL_UNITS } from "../scripts/lib/layout-report.mjs";
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

describe("a drawing in two views (si-05r9)", () => {
  // mcp-server and read-only-limits are drawn twice from one set of strings: a
  // flow view, left to right on FLOW_WIDTH units and shown from FLOW_FROM_REM, and the
  // stacked 320-unit panel they had before, shown below it.
  const TWO_VIEWS = ["mcp-server", "read-only-limits"];
  const SIZE_CLASS = [["fig-head", "head"], ["fig-small", "small"], ["fig-label", "label"], ["fig-note", "note"]];

  /** Every <text> of a panel's body: its left and right ends in units, from the type table and the anchor. */
  function textExtents(body) {
    return [...body.matchAll(/<text x="([\d.-]+)" y="[\d.-]+" class="([^"]*)"(?: text-anchor="(\w+)")?>([^<]*)<\/text>/g)].map(([, x, cls, anchor = "start", content]) => {
      const [, size] = SIZE_CLASS.find(([name]) => cls.split(" ").includes(name));
      const advance = TYPE[size].size * (MONO + TYPE[size].spacing);
      const width = content.length * advance;
      const left = anchor === "start" ? Number(x) : anchor === "middle" ? Number(x) - width / 2 : Number(x) - width;
      return { content, left, right: left + width };
    });
  }

  it("draws the flow view FLOW_WIDTH wide and the stacked view as an ordinary panel, one after the other, with the same words", () => {
    for (const lang of ["en", "sv"]) {
      for (const id of TWO_VIEWS) {
        const { panels, caption } = FIGURES[id](STRINGS[lang].figures[id], id, `fig-${id}`);
        assert.deepEqual(panels.map((panel) => panel.view), ["flow", "stack"], `${lang}: ${id}`);
        assert.equal(panels[0].width, FLOW_WIDTH);
        assert.equal(panels[1].width, undefined, "the stacked view is the 320-unit default");
        assert.equal(panels[0].title, panels[1].title);
        assert.equal(panels[0].head, panels[1].head);
        assert.equal(caption, STRINGS[lang].figures[id].caption);
        const words = (body) => new Set(textExtents(body).map((item) => item.content));
        assert.deepEqual(words(panels[0].body), words(panels[1].body), `${lang}: ${id} says the same in both views`);
      }
    }
  });

  it("shows the flow view from FLOW_FROM_REM at most FLOW_WIDTH x FLOW_SCALE / 16 rem wide, and the stacked view below it at most as wide as any panel", () => {
    assert.equal(FLOW_WIDTH, 800);
    assert.equal(FLOW_SCALE, 1.1);
    assert.equal(FLOW_FROM_REM, 51);
    const maxWidth = (selector) => rule(selector).match(/max-width:\s*([\d.]+)rem/)[1];
    assert.equal(Number(maxWidth(".figure-panel-flow")), Math.round(((FLOW_WIDTH * FLOW_SCALE) / 16) * 1000) / 1000);
    assert.equal(maxWidth(".figure-panel-stack"), "24.5");
    assert.match(rule(".figure-panel-flow"), /display:\s*none/);
    assert.match(CSS, new RegExp(`@media \\(min-width: ${FLOW_FROM_REM}rem\\) \\{\\s*\\.figure-panel-stack \\{\\s*display: none;\\s*\\}\\s*\\.figure-panel-flow \\{\\s*display: block;\\s*\\}\\s*\\}`));
  });

  it("switches to the flow view only where a 13-unit label renders at 12 px, the layout gate's floor, at every width from there (the gate measures five widths, so the widths between are held here)", async () => {
    // The flow panel is the container less its two gutters, up to the cap of
    // its own rule, and the gutter is clamp(1rem, 4vw, 2.5rem) (tokens.css). At
    // a root size of 16 px a viewport of v px gives the panel
    // min(cap, v - 2 x clamp(16, 0.04 v, 40)) px, and the label is LABEL_UNITS
    // x that / FLOW_WIDTH.
    const TOKENS = await readFile(path.join(SRC, "assets", "css", "tokens.css"), "utf8");
    assert.match(TOKENS, /--gutter:\s*clamp\(1rem, 4vw, 2\.5rem\);/, "the gutter this test computes with");
    const cap = Number(rule(".figure-panel-flow").match(/max-width:\s*([\d.]+)rem/)[1]) * 16;
    const labelPx = (viewport) => (LABEL_UNITS * Math.min(cap, viewport - 2 * Math.min(Math.max(16, 0.04 * viewport), 40))) / FLOW_WIDTH;
    for (let viewport = FLOW_FROM_REM * 16; viewport <= 1920; viewport += 1) {
      assert.ok(labelPx(viewport) >= LABEL_MIN_PX, `a ${viewport} px window shows the flow view with a 13-unit label at ${Math.round(labelPx(viewport) * 100) / 100} px, below ${LABEL_MIN_PX} px`);
    }
    // And FLOW_FROM_REM is the smallest whole rem that does so: a rem lower would not.
    assert.ok(labelPx((FLOW_FROM_REM - 1) * 16) < LABEL_MIN_PX, `${FLOW_FROM_REM - 1}rem would do, so FLOW_FROM_REM is not the smallest`);
  });

  it("draws every text of both views inside its panel, in both languages", () => {
    for (const lang of ["en", "sv"]) {
      for (const id of TWO_VIEWS) {
        const { panels } = FIGURES[id](STRINGS[lang].figures[id], id, `fig-${id}`);
        for (const { view, width = WIDTH, body } of panels) {
          const items = textExtents(body);
          assert.ok(items.length > 10, `${lang}: ${id} ${view} has its texts`);
          for (const { content, left, right } of items) {
            assert.ok(left >= MARGIN - 8 && right <= width - MARGIN + 8, `${lang}: ${id} ${view}: "${content}" is drawn from ${left} to ${right} on a ${width}-unit panel`);
          }
        }
      }
    }
  });

  it("gives the two panels ids of their own, so the arrowheads of one never serve the other", () => {
    const html = renderFigure("mcp-server", { placement: "wide", strings: STRINGS.en });
    assert.match(html, /<div class="figure-panels figure-panels-views">/);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(new Set(ids).size, ids.length, "every id appears once");
    assert.equal((html.match(/marker-end="url\(#fig-mcp-server-p1-arrow\)"/g) ?? []).length > 0, true);
    assert.equal((html.match(/marker-end="url\(#fig-mcp-server-p2-arrow\)"/g) ?? []).length > 0, true);
    assert.equal(html.match(/<svg class="figure-panel figure-panel-flow"/g).length, 1);
    assert.equal(html.match(/<svg class="figure-panel figure-panel-stack"/g).length, 1);
  });

  it("is placed wide: the flow view is wider than a panel may be on the measure", () => {
    for (const id of TWO_VIEWS) {
      assert.throws(() => renderFigure(id, { placement: "inline", strings: STRINGS.en }), new RegExp(`^Error: Figure "${id}": a figure with a flow view is placed "wide", not "inline"$`));
      assert.doesNotThrow(() => renderFigure(id, { placement: "wide", strings: STRINGS.en }));
    }
  });
});
