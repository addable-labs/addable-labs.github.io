// The torch figure ("torch-lights-up", src/_includes/figures/figures.mjs,
// drawn from scripts/lib/torch.mjs) against the product's approved torch and
// the article's cover, and its motion against what must stay still.
//
// The figure's markup is its last frame: the cover's central square, the
// approved torch with one route lit. So the markup is held to the cover
// (docs/images/the-pivot-to-fluentor.svg) element by element, and the torch
// to the approved file's checksum. The motion is classes reveal.js adds, and
// base.css plays it only under them, fills it only backwards, and stops it
// under reduced motion and in print.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { parse } from "node-html-parser";
import { renderFigure } from "../src/_includes/figures/figures.mjs";
import { COVER, MARK, MARK_SHA256 } from "../scripts/lib/torch.mjs";
import { ROOT, SRC } from "./helpers.mjs";

const ID = "torch-lights-up";
const PREFIX = `fig-${ID}-`;
const CSS = await readFile(path.join(SRC, "assets", "css", "base.css"), "utf8");
const REVEAL = await readFile(path.join(SRC, "assets", "js", "reveal.js"), "utf8");
const COVER_TEXT = await readFile(path.join(ROOT, "docs", "images", "the-pivot-to-fluentor.svg"), "utf8");
const COVER_SVG = parse(COVER_TEXT).querySelector("svg");
const STRINGS = {};
for (const lang of ["en", "sv"]) STRINGS[lang] = JSON.parse(await readFile(path.join(SRC, "_data", "strings", `${lang}.json`), "utf8"));
const HTML = renderFigure(ID, { placement: "inline", strings: STRINGS.en });
const FIGURE = parse(HTML).querySelector("figure");
const PANEL = FIGURE.querySelector("svg");

const elements = (node) => node.childNodes.filter((child) => child.nodeType === 1);
const numbers = (text) => text.match(/-?[\d.]+/g).map(Number);

// The cover's layers: the plate, the grid, then four groups in the mark's
// place: the glow, the mark, the dimming plate and the route.
const [, coverPlate, coverGrid, coverGlow, coverMark, coverDim, coverRoute] = elements(COVER_SVG);
// The figure's: the same, inside the group that puts the cover's central
// square under the panel's head.
const square = elements(PANEL).find((el) => el.rawTagName === "g" && el.getAttribute("transform")?.startsWith("translate(0 "));
const [figurePlate, figureGrid, figureGlow, figureMark, figureDim, figureRoute] = elements(square);

/** An element's attributes, with `drop` left out and the figure's id prefix taken off every id and reference. */
function attributesOf(el, drop = []) {
  return Object.fromEntries(
    Object.entries(el.attributes)
      .filter(([name]) => !drop.includes(name))
      .map(([name, value]) => [name, value.replace(new RegExp(`(^|#)${PREFIX}`, "g"), "$1")])
      .map(([name, value]) => [name, /^-?[\d.]+$/.test(value) ? Number(value) : value]),
  );
}

/** Whether a cover element and a figure element are the same drawing: name, attributes and children. */
function assertSame(cover, figure, where, drop = ["class", "data-h", "data-t"]) {
  assert.equal(figure.rawTagName, cover.rawTagName, `${where}: element`);
  assert.deepEqual(attributesOf(figure, drop), attributesOf(cover, drop), `${where}: attributes of <${cover.rawTagName}>`);
  const [a, b] = [elements(cover), elements(figure)];
  assert.equal(b.length, a.length, `${where}: children of <${cover.rawTagName}>`);
  a.forEach((child, i) => assertSame(child, b[i], `${where} > ${child.rawTagName}[${i}]`, drop));
}

/** A curve's points, [x0, y0, x1, y1, x2, y2, x3, y3], from the d of one cubic. */
const curve = (d) => numbers(d);
const reversed = ([x0, y0, x1, y1, x2, y2, x3, y3]) => [x3, y3, x2, y2, x1, y1, x0, y0];

describe("the torch figure draws the approved torch (torch-lights-up)", () => {
  it("is the approved file, byte for byte, and the cover holds the same markup", () => {
    assert.equal(createHash("sha256").update(MARK).digest("hex"), MARK_SHA256);
    const inner = MARK.slice(MARK.indexOf(">") + 1, MARK.lastIndexOf("</svg>"));
    assert.equal(COVER_TEXT.split(inner).length, 2, "the cover holds the approved markup once");
  });

  it("draws every line and node where the cover draws it, in the cover's order, widths and colours", () => {
    assert.equal(figureMark.getAttribute("transform"), coverMark.getAttribute("transform"));
    const [coverLines, coverNodes] = elements(coverMark);
    const [figureLines, figureHalos, figureNodes] = elements(figureMark);
    assert.equal(elements(coverLines).length, 74);
    assert.equal(elements(coverNodes).length, 35);
    assertSame(coverLines, figureLines, "lines");
    assertSame(coverNodes, figureNodes, "nodes");
    // The glow of the motion round each node: the node itself, invisible at rest.
    assertSame(coverNodes, figureHalos, "halos");
    assert.match(CSS, /^\.fig-torch-halo \{\n {2}opacity: 0;/m);
    for (const el of elements(figureLines)) assert.equal(el.getAttribute("class"), "fig-torch-line");
    for (const el of elements(figureNodes)) assert.equal(el.getAttribute("class"), "fig-torch-node");
    for (const el of elements(figureHalos)) assert.equal(el.getAttribute("class"), "fig-torch-halo");
  });

  it("carries each node's height in the torch, 0 at the foot and 1 at the top node, and each line its lower end's", () => {
    const [figureLines, , figureNodes] = elements(figureMark);
    const ys = elements(figureNodes).map((el) => Number(el.getAttribute("cy")));
    const [top, foot] = [Math.min(...ys), Math.max(...ys)];
    const height = (y) => Math.round(((foot - y) / (foot - top)) * 10000) / 10000;
    for (const el of elements(figureNodes)) assert.equal(Number(el.getAttribute("data-h")), height(Number(el.getAttribute("cy"))));
    for (const el of elements(figureLines)) {
      const [, y0, , , , , , y3] = curve(el.getAttribute("d"));
      assert.equal(Number(el.getAttribute("data-h")), height(Math.max(y0, y3)), el.getAttribute("d"));
    }
    assert.deepEqual([Math.min(...ys.map(height)), Math.max(...ys.map(height))], [0, 1]);
  });
});

describe("the torch figure ends on the cover (torch-lights-up)", () => {
  it("draws the cover's central square under the panel's head, its plate and its grid", () => {
    const [x, y, side] = COVER.square;
    assert.equal(square.getAttribute("transform"), `translate(0 38.5) scale(${Math.round((320 / side) * 1e6) / 1e6}) translate(${-x} ${-y})`);
    assert.equal(COVER_SVG.getAttribute("width"), "1200");
    assert.deepEqual([x + side / 2, y + side / 2, side], [600, 315, 630], "the square is the cover's centre, the plate's full height");
    for (const [cover, figure, what] of [[coverPlate, figurePlate, "plate"], [coverGrid, figureGrid, "grid"]]) {
      assert.deepEqual(attributesOf(figure, ["x", "y", "width", "height"]), attributesOf(cover, ["width", "height"]), what);
      assert.deepEqual(numbers(`${figure.getAttribute("x")} ${figure.getAttribute("y")} ${figure.getAttribute("width")} ${figure.getAttribute("height")}`), [x, y, side, side], what);
    }
  });

  it("draws the cover's glow, dimming plate and route groups, in the cover's order", () => {
    assertSame(coverGlow, figureGlow, "glow");
    assertSame(coverDim, figureDim, "dimming plate");
    assert.deepEqual(attributesOf(figureRoute), attributesOf(coverRoute), "the route's stroke, width, ends and mask");
  });

  it("draws the cover's route as one path through its lines' own curves, from the lowest node of the route to the top node", () => {
    const paths = elements(figureRoute);
    assert.equal(paths.length, 1);
    const [route] = paths;
    assert.equal(route.getAttribute("pathLength"), "1");
    const d = route.getAttribute("d");
    assert.match(d, /^M[\d.]+ [\d.]+(C[\d.]+ [\d.]+ [\d.]+ [\d.]+ [\d.]+ [\d.]+)+$/);
    const values = numbers(d);
    const segments = [];
    for (let i = 2; i < values.length; i += 6) segments.push([...values.slice(i - 2, i), ...values.slice(i, i + 6)]);
    const lines = elements(coverRoute).map((el) => curve(el.getAttribute("d")));
    assert.equal(segments.length, lines.length);
    const left = [...lines];
    for (const segment of segments) {
      const i = left.findIndex((line) => line.join() === segment.join() || reversed(line).join() === segment.join());
      assert.ok(i >= 0, `the segment ${segment.join(" ")} is one of the cover's route lines, either way`);
      left.splice(i, 1);
    }
    // From the route's lowest node to the top node of the torch.
    const ends = lines.flatMap(([x0, y0, , , , , x3, y3]) => [[x0, y0], [x3, y3]]);
    const [first, last] = [values.slice(0, 2), values.slice(-2)];
    assert.deepEqual(first, ends.reduce((low, end) => (end[1] > low[1] ? end : low)));
    const [, , nodes] = elements(figureMark);
    assert.equal(last[1], Math.min(...elements(nodes).map((el) => Number(el.getAttribute("cy")))));
    // Each glow, in route order, knows when the route reaches its node.
    const reached = elements(figureGlow).map((el) => Number(el.getAttribute("data-t")));
    assert.equal(reached[0], 0);
    assert.equal(reached.at(-1), 1);
    for (let i = 1; i < reached.length; i += 1) assert.ok(reached[i] > reached[i - 1], `glow ${i} comes up after glow ${i - 1}`);
  });

  it("keeps the cover's gradients, masks, filter and grid pattern", () => {
    const coverDefs = elements(elements(COVER_SVG)[0]);
    const figureDefs = new Map(elements(PANEL).filter((el) => el.rawTagName === "defs").flatMap(elements).map((el) => [el.getAttribute("id"), el]));
    assert.equal(coverDefs.length, 9);
    for (const def of coverDefs) {
      const id = def.getAttribute("id");
      const mine = figureDefs.get(`${PREFIX}${id}`);
      assert.ok(mine, `the figure has the cover's ${id}`);
      // The grid's fade is masked over the square the figure draws, not the whole plate.
      if (id === "gridmask") assertSame(def, mine, id, ["x", "y", "width", "height"]);
      else assertSame(def, mine, id);
    }
  });

  it("is complete as it stands: nothing in the markup is hidden or half drawn", () => {
    assert.doesNotMatch(PANEL.toString(), /is-ready|is-playing|stroke-dash|(?<![\w-])opacity=|style=/);
    assert.equal(square.getAttribute("class"), "fig-motion");
  });
});

describe("the torch figure's motion (torch-lights-up)", () => {
  /** The declarations of every base.css rule whose selector names a torch class, with the selector. */
  const torchRules = [...CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/^([^\s@{}][^{}]*?) \{([^}]*)\}/gm)].filter(([, selector]) => /fig-torch-|fig-motion/.test(selector)).map(([, selector, body]) => ({ selector, body }));

  /** The text of the at-rule block that starts with `head`. */
  function block(head) {
    const start = CSS.indexOf(`${head} {`);
    assert.ok(start >= 0, `base.css has ${head}`);
    let depth = 0;
    for (let i = CSS.indexOf("{", start); i < CSS.length; i += 1) {
      if (CSS[i] === "{") depth += 1;
      if (CSS[i] === "}") depth -= 1;
      if (depth === 0) return CSS.slice(start, i + 1);
    }
    throw new Error(`${head} is not closed`);
  }

  const MOVING = [".fig-torch-node", ".fig-torch-line", ".fig-torch-halo", ".fig-torch-path", ".fig-torch-dim", ".fig-torch-glow"];

  it("plays only under the class reveal.js adds, and fills only backwards", () => {
    const animated = torchRules.filter(({ body }) => /\banimation:/.test(body) && !/animation: none/.test(body));
    assert.deepEqual(animated.flatMap(({ selector }) => selector.split(",").map((s) => s.trim().split(" ").at(-1))).sort(), [...MOVING].sort());
    for (const { selector, body } of animated) {
      for (const part of selector.split(",")) assert.match(part.trim(), /^\.fig-motion\.is-ready \.fig-torch-/, part);
      assert.match(body, /animation: torch-[a-z]+ [\d.]+s .*backwards;/, selector);
      assert.doesNotMatch(body, /forwards|both|infinite/, selector);
    }
    assert.ok(torchRules.some(({ selector, body }) => selector === ".fig-motion.is-ready:not(.is-playing) *" && /animation-play-state: paused/.test(body)), "held at the first frame until it plays");
  });

  it("stands still under reduced motion and in print", () => {
    for (const head of ["@media (prefers-reduced-motion: reduce)", "@media print"]) {
      const text = block(head);
      const rule = text.match(/((?:\.fig-torch-[a-z]+,?\s*)+)\{\s*animation: none;\s*\}/);
      assert.ok(rule, `${head} stops the torch`);
      assert.deepEqual(rule[1].split(",").map((s) => s.trim()).sort(), [...MOVING].sort(), head);
    }
    // reveal.js marks nothing where motion is not wanted, or cannot run.
    const stop = REVEAL.indexOf("return;");
    assert.ok(stop > 0 && stop < REVEAL.indexOf('"is-ready"') && stop < REVEAL.indexOf('querySelectorAll(".fig-motion")'), "reveal.js returns before it marks the drawing");
    const guard = REVEAL.slice(0, stop);
    assert.match(guard, /var reduce = window\.matchMedia && window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches;/);
    assert.match(guard, /if \(reduce \|\| !\("IntersectionObserver" in window\)\) \{/);
  });

  it("moves on the product's numbers: 0.75 s on its spring, a height's 0.36 s late, the route once the top node is up", () => {
    const rule = (selector) => torchRules.find((r) => r.selector === selector)?.body ?? assert.fail(`base.css has ${selector}`);
    const rise = rule(".fig-motion.is-ready .fig-torch-node,\n.fig-motion.is-ready .fig-torch-line");
    const spring = rise.match(/animation: torch-ash 0\.75s linear\(([^)]*)\) backwards;/);
    assert.ok(spring, "the rise: 0.75 s on a sampled spring");
    // SwiftUI's spring, response 0.55 and damping 0.72, sampled at 60 steps
    // over the 0.75 s, to four places, and ending on 1.
    const [w0, zeta] = [(2 * Math.PI) / 0.55, 0.72];
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const at = (s) => 1 - Math.exp(-zeta * w0 * s) * (Math.cos(wd * s) + ((zeta * w0) / wd) * Math.sin(wd * s));
    const expected = Array.from({ length: 61 }, (_, i) => (i === 60 ? 1 : Math.round(at((i / 60) * 0.75) * 10000) / 10000));
    assert.deepEqual(spring[1].split(",").map(Number), expected);
    assert.match(rise, /animation-delay: calc\(var\(--h\) \* 0\.36s\);/);
    assert.match(rule(".fig-motion.is-ready .fig-torch-halo"), /animation: torch-flare 0\.75s ease-out backwards;\s*animation-delay: calc\(var\(--h\) \* 0\.36s\);/);
    assert.match(rule(".fig-motion.is-ready"), /--torch-lit: calc\(0\.36s \+ 0\.75s\);/);
    assert.match(rule(".fig-motion.is-ready .fig-torch-path"), /animation: torch-draw 0\.8s ease-out backwards;\s*animation-delay: var\(--torch-lit\);/);
    assert.match(rule(".fig-motion.is-ready .fig-torch-glow"), /animation-delay: calc\(var\(--torch-lit\) \+ var\(--t\) \* 0\.8s\);/);
  });

  it("has no script of its own: reveal.js gives each timed part its moment and plays the drawing once in view", () => {
    assert.deepEqual(elements(FIGURE).map((el) => el.rawTagName), ["div", "figcaption"]);
    const play = REVEAL.slice(REVEAL.indexOf("function play("));
    assert.match(play, /querySelectorAll\("\[data-h\], \[data-t\]"\)/);
    assert.match(play, /setProperty\("--h", h\)/);
    assert.match(play, /setProperty\("--t", t\)/);
    assert.match(play, /classList\.add\("is-ready"\)[\s\S]*classList\.add\("is-playing"\)/);
  });
});
