// The torch ("torch-lights-up", the hero of the article on Fluentor's name
// and logo: renderHero in src/_includes/figures/figures.mjs, drawn from
// scripts/lib/torch.mjs) against the product's approved torch and the
// article's cover, in its place in the article page, and its motion against
// what must stay still.
//
// The hero's markup is its last frame: the whole cover, the approved torch
// with one route lit. So the markup is held to the cover
// (docs/images/the-pivot-to-fluentor.svg) element by element, and the torch
// to the approved file's checksum. The motion is base.css's, which plays it
// only on a screen, for a reader who has not asked for less motion, and only
// when the page's script runs; it fills only backwards, so it ends on the
// markup.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { parse } from "node-html-parser";
import { FIGURES, HEROES, renderHero } from "../src/_includes/figures/figures.mjs";
import { loadSite, readArticleSources } from "../scripts/lib/site.mjs";
import { COVER, MARK, MARK_SHA256 } from "../scripts/lib/torch.mjs";
import { buildSite, ROOT, SRC, tempDir } from "./helpers.mjs";

const ID = "torch-lights-up";
const SLUG = "the-pivot-to-fluentor";
const PREFIX = "hero-";
const ALT = "The torch, described.";
const SITE = await loadSite(SRC);
const CSS = await readFile(path.join(SRC, "assets", "css", "base.css"), "utf8");
const REVEAL = await readFile(path.join(SRC, "assets", "js", "reveal.js"), "utf8");
const COVER_TEXT = await readFile(path.join(ROOT, "docs", "images", `${SLUG}.svg`), "utf8");
const COVER_SVG = parse(COVER_TEXT).querySelector("svg");
const HERO = parse(renderHero(ID, { alt: ALT })).querySelector("svg");

const elements = (node) => node.childNodes.filter((child) => child.nodeType === 1);
const numbers = (text) => text.match(/-?[\d.]+/g).map(Number);

// The cover's layers: its definitions, the plate, the grid, then four groups
// in the mark's place: the glow, the mark, the dimming plate and the route.
// The hero's are the same, in the same order.
const [coverDefs, coverPlate, coverGrid, coverGlow, coverMark, coverDim, coverRoute] = elements(COVER_SVG);
const [heroDefs, heroPlate, heroGrid, heroGlow, heroMark, heroDim, heroRoute] = elements(HERO);

/** An element's attributes, with `drop` left out and the hero's id prefix taken off every id and reference. */
function attributesOf(el, drop = []) {
  return Object.fromEntries(
    Object.entries(el.attributes)
      .filter(([name]) => !drop.includes(name))
      .map(([name, value]) => [name, value.replace(new RegExp(`(^|#)${PREFIX}`, "g"), "$1")])
      .map(([name, value]) => [name, /^-?[\d.]+$/.test(value) ? Number(value) : value]),
  );
}

/** Whether a cover element and a hero element are the same drawing: name, attributes and children. */
function assertSame(cover, hero, where, drop = ["class", "data-h", "data-t"]) {
  assert.equal(hero.rawTagName, cover.rawTagName, `${where}: element`);
  assert.deepEqual(attributesOf(hero, drop), attributesOf(cover, drop), `${where}: attributes of <${cover.rawTagName}>`);
  const [a, b] = [elements(cover), elements(hero)];
  assert.equal(b.length, a.length, `${where}: children of <${cover.rawTagName}>`);
  a.forEach((child, i) => assertSame(child, b[i], `${where} > ${child.rawTagName}[${i}]`, drop));
}

/** A curve's points, [x0, y0, x1, y1, x2, y2, x3, y3], from the d of one cubic. */
const curve = (d) => numbers(d);
const reversed = ([x0, y0, x1, y1, x2, y2, x3, y3]) => [x3, y3, x2, y2, x1, y1, x0, y0];

describe("the torch draws the approved torch (torch-lights-up)", () => {
  it("is the approved file, byte for byte, and the cover holds the same markup", () => {
    assert.equal(createHash("sha256").update(MARK).digest("hex"), MARK_SHA256);
    const inner = MARK.slice(MARK.indexOf(">") + 1, MARK.lastIndexOf("</svg>"));
    assert.equal(COVER_TEXT.split(inner).length, 2, "the cover holds the approved markup once");
  });

  it("draws every line and node where the cover draws it, in the cover's order, widths and colours", () => {
    assert.equal(heroMark.getAttribute("transform"), coverMark.getAttribute("transform"));
    const [coverLines, coverNodes] = elements(coverMark);
    const [heroLines, heroHalos, heroNodes] = elements(heroMark);
    assert.equal(elements(coverLines).length, 74);
    assert.equal(elements(coverNodes).length, 35);
    assertSame(coverLines, heroLines, "lines");
    assertSame(coverNodes, heroNodes, "nodes");
    // The glow of the motion round each node: the node itself, invisible at rest.
    assertSame(coverNodes, heroHalos, "halos");
    assert.match(CSS, /^\.torch-halo \{\n {2}opacity: 0;/m);
    for (const el of elements(heroLines)) assert.equal(el.getAttribute("class"), "torch-line");
    for (const el of elements(heroNodes)) assert.equal(el.getAttribute("class"), "torch-node");
    for (const el of elements(heroHalos)) assert.equal(el.getAttribute("class"), "torch-halo");
  });

  it("carries each node's height in the torch, 0 at the foot and 1 at the top node, and each line its lower end's", () => {
    const [heroLines, , heroNodes] = elements(heroMark);
    const ys = elements(heroNodes).map((el) => Number(el.getAttribute("cy")));
    const [top, foot] = [Math.min(...ys), Math.max(...ys)];
    const height = (y) => Math.round(((foot - y) / (foot - top)) * 10000) / 10000;
    for (const el of elements(heroNodes)) assert.equal(Number(el.getAttribute("data-h")), height(Number(el.getAttribute("cy"))));
    for (const el of elements(heroLines)) {
      const [, y0, , , , , , y3] = curve(el.getAttribute("d"));
      assert.equal(Number(el.getAttribute("data-h")), height(Math.max(y0, y3)), el.getAttribute("d"));
    }
    assert.deepEqual([Math.min(...ys.map(height)), Math.max(...ys.map(height))], [0, 1]);
  });
});

describe("the hero's last frame is the cover (torch-lights-up)", () => {
  it("is the whole cover, 1200 x 630, layer for layer and in the cover's order", () => {
    assert.deepEqual(COVER.size, [1200, 630]);
    assert.equal(HERO.getAttribute("viewBox"), COVER_SVG.getAttribute("viewBox"));
    assert.equal(HERO.getAttribute("width"), COVER_SVG.getAttribute("width"));
    assert.equal(HERO.getAttribute("height"), COVER_SVG.getAttribute("height"));
    assert.deepEqual(elements(HERO).map((el) => el.rawTagName), elements(COVER_SVG).map((el) => el.rawTagName));
    assert.equal(elements(HERO).length, 7);
    assertSame(coverPlate, heroPlate, "plate");
    assertSame(coverGrid, heroGrid, "grid");
    assertSame(coverGlow, heroGlow, "glow");
    assertSame(coverDim, heroDim, "dimming plate");
    assert.deepEqual(attributesOf(heroRoute), attributesOf(coverRoute), "the route's stroke, width, ends and mask");
  });

  it("keeps the cover's gradients, masks, filter and grid pattern, each under the hero's own id", () => {
    assertSame(coverDefs, heroDefs, "defs");
    assert.equal(elements(coverDefs).length, 9);
    for (const def of elements(heroDefs)) assert.ok(def.getAttribute("id").startsWith(PREFIX), def.getAttribute("id"));
  });

  it("draws the cover's lit route as one path through its lines' own curves, from the lowest node of the route to the top node", () => {
    const paths = elements(heroRoute);
    assert.equal(paths.length, 1);
    const [route] = paths;
    assert.equal(route.getAttribute("class"), "torch-path");
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
    const [, , nodes] = elements(heroMark);
    assert.equal(last[1], Math.min(...elements(nodes).map((el) => Number(el.getAttribute("cy")))));
    // Each glow, in route order, knows when the route reaches its node.
    const reached = elements(heroGlow).map((el) => Number(el.getAttribute("data-t")));
    assert.equal(reached[0], 0);
    assert.equal(reached.at(-1), 1);
    for (let i = 1; i < reached.length; i += 1) assert.ok(reached[i] > reached[i - 1], `glow ${i} comes up after glow ${i - 1}`);
  });

  it("is complete as it stands: the lit route drawn, nothing hidden or half drawn, described and without a caption", () => {
    assert.doesNotMatch(HERO.toString(), /is-playing|stroke-dash|(?<![\w-])opacity=|style=|<title|<text|<figcaption/);
    assert.equal(HERO.getAttribute("class"), "article-image plays-once");
    assert.equal(HERO.getAttribute("role"), "img");
    assert.equal(HERO.getAttribute("aria-label"), ALT);
    const quoted = 'A "quoted" <torch> & more';
    const markup = renderHero(ID, { alt: quoted });
    assert.match(markup, / aria-label="A &quot;quoted&quot; &lt;torch&gt; &amp; more">/);
    assert.equal(parse(markup).querySelector("svg").getAttribute("aria-label"), quoted);
    assert.throws(() => renderHero("another", { alt: ALT }), /Unknown hero figure "another"/);
    assert.throws(() => renderHero(ID, { alt: " " }), /needs the article's imageAlt/);
  });
});

describe("the hero in the article page (torch-lights-up)", () => {
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("torch-");
    out = buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  const page = async (article) => parse(await readFile(path.join(out, article.path, "index.html"), "utf8"));

  it("only this article uses the hero figure, in both languages, and the torch is no figure in the text", async () => {
    assert.deepEqual(Object.keys(HEROES), [ID]);
    assert.equal(FIGURES[ID], undefined, "no figure of that name");
    for (const lang of SITE.languages.codes) {
      const articles = await readArticleSources(SRC, SITE, lang);
      assert.deepEqual(articles.filter((article) => article.heroFigure !== undefined).map((article) => [article.slug, article.heroFigure]), [[SLUG, ID]], lang);
      const strings = JSON.parse(await readFile(path.join(SRC, "_data", "strings", `${lang}.json`), "utf8"));
      assert.equal(strings.figures[ID], undefined, `${lang}: no strings for a torch figure`);
      const source = await readFile(path.join(SRC, lang, "blog", "posts", `${SLUG}.md`), "utf8");
      assert.doesNotMatch(source, /\{% figure "torch/, `${lang}: no torch figure in the text`);
    }
  });

  it("shows the hero in the image's place, under the summary, described as each language's imageAlt, with no image beside it", async () => {
    for (const lang of SITE.languages.codes) {
      const article = (await readArticleSources(SRC, SITE, lang)).find((item) => item.slug === SLUG);
      const doc = await page(article);
      const header = doc.querySelector(".article-header");
      assert.deepEqual(elements(header).map((el) => el.rawTagName), ["p", "h1", "p", "svg"], `${lang}: metadata, title, summary, hero`);
      assert.equal(header.querySelectorAll("img").length, 0, `${lang}: no image in the header`);
      const hero = doc.querySelector(".article-header .article-summary + svg.article-image");
      assert.ok(hero, `${lang}: the hero right under the summary`);
      assert.equal(hero.getAttribute("aria-label"), article.imageAlt, `${lang}: described as its own imageAlt`);
      assertSame(parse(renderHero(ID, { alt: article.imageAlt })).querySelector("svg"), hero, `${lang} hero`, []);
      assert.equal(doc.querySelectorAll(".plays-once").length, 1, `${lang}: one drawing that plays`);
      assert.equal(doc.querySelectorAll(".article-body .torch-node, .article-body [id^=fig-torch]").length, 0, `${lang}: no torch in the text`);
      // The still cover keeps serving the link preview.
      assert.equal(doc.querySelector('meta[property="og:image"]').getAttribute("content"), `${SITE.url}/blog/${SLUG}/cover.png`, lang);
    }
  });

  it("every other article still has its <img>, and no drawing that plays", async () => {
    let count = 0;
    for (const lang of SITE.languages.codes) {
      for (const article of (await readArticleSources(SRC, SITE, lang)).filter((item) => item.slug !== SLUG)) {
        const doc = await page(article);
        const image = doc.querySelector(".article-header .article-summary + img.article-image");
        assert.ok(image, article.path);
        assert.equal(image.getAttribute("alt"), article.imageAlt, article.path);
        assert.ok(image.getAttribute("src").startsWith(`/blog/${article.slug}/`), article.path);
        assert.equal(doc.querySelectorAll(".article-header svg, .plays-once").length, 0, article.path);
        count += 1;
      }
    }
    assert.ok(count >= 10, `the other articles (${count})`);
  });
});

describe("the torch's motion (torch-lights-up)", () => {
  /** The text of the at-rule block that starts with `head`. */
  function block(head) {
    const start = CSS.indexOf(`${head} {`);
    assert.ok(start >= 0, `base.css has ${head}`);
    assert.equal(CSS.indexOf(`${head} {`, start + 1), -1, `base.css has one ${head}`);
    let depth = 0;
    for (let i = CSS.indexOf("{", start); i < CSS.length; i += 1) {
      if (CSS[i] === "{") depth += 1;
      if (CSS[i] === "}") depth -= 1;
      if (depth === 0) return CSS.slice(start, i + 1);
    }
    throw new Error(`${head} is not closed`);
  }

  /** The rules of `text` whose selector names the torch or the drawing that plays, with their declarations. */
  const torchRules = (text) =>
    [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/^\s*([^\s@{}][^{}]*?) \{([^}]*)\}/gm)].filter(([, selector]) => /torch-|plays-once/.test(selector)).map(([, selector, body]) => ({ selector, body }));

  const MOTION = "@media screen and (prefers-reduced-motion: no-preference)";
  const MOVING = [".torch-node", ".torch-line", ".torch-halo", ".torch-path", ".torch-dim", ".torch-glow"];

  it("moves only on a screen, for a reader who has not asked for less motion, when the script runs, and fills only backwards", () => {
    const inside = torchRules(block(MOTION));
    const animated = inside.filter(({ body }) => /\banimation:/.test(body));
    assert.deepEqual(animated.flatMap(({ selector }) => selector.split(",").map((s) => s.trim().split(" ").at(-1))).sort(), [...MOVING].sort());
    for (const { selector, body } of animated) {
      for (const part of selector.split(",")) assert.match(part.trim(), /^html\.js \.plays-once \.torch-[a-z]+$/, part);
      assert.match(body, /animation: torch-[a-z]+ [\d.]+s .*backwards;/, selector);
      assert.doesNotMatch(body, /forwards|both|infinite/, selector);
    }
    // Held at the first frame from the first paint until reveal.js plays it.
    assert.ok(inside.some(({ selector, body }) => selector === "html.js .plays-once:not(.is-playing) *" && /animation-play-state: paused/.test(body)), "held at the first frame until it plays");
    // Nowhere else: outside that block a torch rule moves nothing, so print,
    // reduced motion and a page without the script get the still picture.
    const outside = torchRules(CSS.replace(block(MOTION), ""));
    assert.deepEqual(outside.map(({ selector }) => selector), [".torch-halo"]);
    for (const { selector, body } of outside) assert.doesNotMatch(body, /animation|stroke-dash/, selector);
    // The route's dashes are the drawing motion's own, so none is left once it has run.
    for (const { selector, body } of inside) assert.doesNotMatch(body, /stroke-dash/, selector);
    assert.match(block("@keyframes torch-draw"), /from \{\s*stroke-dasharray: 1 2;\s*stroke-dashoffset: 1;\s*\}\s*to \{\s*stroke-dasharray: 1 2;\s*stroke-dashoffset: 0;\s*\}/);
  });

  it("stands still under reduced motion: base.css removes every animation and reveal.js leaves the drawing alone", () => {
    assert.match(block("@media (prefers-reduced-motion: reduce)"), /\*,\s*\*::before,\s*\*::after \{\s*animation: none !important;/);
    const reduce = REVEAL.indexOf("var reduce = ");
    assert.ok(reduce >= 0 && reduce < REVEAL.indexOf('querySelectorAll(".plays-once")'));
    assert.match(REVEAL, /var reduce = window\.matchMedia && window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches;\n {2}var drawings = reduce \? \[\] : document\.querySelectorAll\("\.plays-once"\);/);
  });

  it("moves on the product's numbers: 0.75 s on its spring, a height's 0.36 s late, the route once the top node is up", () => {
    const rules = torchRules(block(MOTION));
    const rule = (selector) => rules.find((r) => r.selector === selector)?.body ?? assert.fail(`base.css has ${selector}`);
    const rise = rule("html.js .plays-once .torch-node,\n  html.js .plays-once .torch-line");
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
    assert.match(rule("html.js .plays-once .torch-halo"), /animation: torch-flare 0\.75s ease-out backwards;\s*animation-delay: calc\(var\(--h\) \* 0\.36s\);/);
    assert.match(rule("html.js .plays-once"), /--torch-lit: calc\(0\.36s \+ 0\.75s\);/);
    assert.match(rule("html.js .plays-once .torch-path"), /animation: torch-draw 0\.8s ease-out backwards;\s*animation-delay: var\(--torch-lit\);/);
    assert.match(rule("html.js .plays-once .torch-glow"), /animation-delay: calc\(var\(--torch-lit\) \+ var\(--t\) \* 0\.8s\);/);
  });

  it("has no script of its own: reveal.js gives each timed part its moment and plays the drawing once half of it is in view", () => {
    const play = REVEAL.slice(REVEAL.indexOf("function play("));
    assert.match(play, /querySelectorAll\("\[data-h\], \[data-t\]"\)/);
    assert.match(play, /setProperty\("--h", h\)/);
    assert.match(play, /setProperty\("--t", t\)/);
    assert.match(play, /if \(!\("IntersectionObserver" in window\)\) \{\s*drawing\.classList\.add\("is-playing"\);\s*return;\s*\}/, "at once without IntersectionObserver");
    assert.match(play, /e\.intersectionRatio >= 0\.5[\s\S]*classList\.add\("is-playing"\)[\s\S]*\{ threshold: \[0, 0\.5\] \}/);
    assert.doesNotMatch(REVEAL, /is-ready/);
  });
});
