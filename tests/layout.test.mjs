import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, describe, it } from "node:test";
import { BESIDE_FROM_PX, evaluate, GAME_RATIO, IMAGE_RATIO, INLINE_GAP_REM, LABEL_MIN_PX, LABEL_UNITS, LINE_RATIO, MEASURE_REM, PANEL_REM, rowsOf, TOLERANCE } from "../scripts/lib/layout-report.mjs";
import { skipMessage, SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { fixture, runGate, SRC, tempDir } from "./helpers.mjs";

// The card-balance rules of the layout gate on fixture measurements (AC-30,
// REQ-025), the article rules on fixture measurements of
// the illustrated articles (si-55iu; centred composition, founder feedback
// 2026-09-22), of the article with tables (si-t64i), of the article that
// plays games (si-y6pp) and of the article's image (si-awlu) — no Chrome
// needed — and the gate's explicit SKIP when no Chrome is found. Regenerate the
// article fixture from a real run with `LAYOUT_DUMP=<file> pnpm
// check:layout` and keep its three runs.

describe("layout report evaluation (AC-30)", () => {
  let aligned;
  let misaligned;
  before(async () => {
    aligned = JSON.parse(await readFile(fixture("layout", "aligned.json"), "utf8"));
    misaligned = JSON.parse(await readFile(fixture("layout", "misaligned.json"), "utf8"));
  });

  it("passes the aligned fixture and prints the documented lines", () => {
    const result = evaluate(aligned);
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
    assert.deepEqual(result.lines, ["layout / 1280: ok (3 service cards, 6 app cards)", "layout /sv/ 360: ok (3 service cards, 6 app cards)"]);
    assert.equal(TOLERANCE, 1);
    assert.equal(LINE_RATIO, 1.1);
  });

  it("groups cards into grid rows by their tops", () => {
    const rows = rowsOf(aligned[0].grids.apps);
    assert.deepEqual(rows.map((row) => row.map((card) => card.index)), [[0, 1, 2], [3, 4, 5]]);
    assert.deepEqual(rowsOf(aligned[1].grids.services).map((row) => row.length), [1, 1, 1]);
  });

  it("fails a two-line title, unequal heights, an offset summary top, an unpinned action row and a wrapped chip row, naming grid, card and rule", () => {
    const result = evaluate(misaligned);
    assert.equal(result.ok, false);
    // Problems are reported grid by grid: the per-card rules, then the rows.
    assert.deepEqual(result.problems, [
      "/ 1024: services card 2 title wraps (46 px for a 23 px line)",
      "/ 1024: services cards 1, 2, 3 differ in height (559 / 559 / 571 px)",
      "/ 1024: apps card 4 chip row wraps (60 px for a 28 px line)",
      "/ 1024: apps cards 1, 2 summaries start at different heights (2131 / 2136 px)",
      "/ 1024: apps cards 3, 4 action rows are not bottom-aligned (2562 / 2555 px)",
    ]);
    assert.equal(result.lines.length, 1);
    assert.match(result.lines[0], /^layout \/ 1024: FAIL — services card 2 title wraps/);
  });

  it("names a services row whose \"What you get\" headings start at different heights", () => {
    const offset = structuredClone(aligned);
    offset[0].grids.services[2].midTop += 3;
    assert.deepEqual(evaluate(offset).problems, ['/ 1280: services cards 1, 2, 3 "What you get" headings start at different heights (1263 / 1263 / 1266 px)']);
  });

  it("tolerates differences of one pixel", () => {
    const nudged = structuredClone(aligned);
    nudged[0].grids.apps[1].height += 1;
    nudged[0].grids.apps[2].midTop -= 1;
    nudged[0].grids.apps[0].actionBottom += 1;
    nudged[0].grids.services[1].top += 1;
    assert.deepEqual(evaluate(nudged).problems, []);
    const twoPx = structuredClone(aligned);
    twoPx[0].grids.apps[1].height += 2;
    assert.equal(evaluate(twoPx).ok, false);
    assert.equal(evaluate(twoPx, 2).ok, true, "the tolerance is a parameter");
  });

  it("fails an empty grid", () => {
    const empty = structuredClone(aligned);
    empty[1].grids.apps = [];
    assert.deepEqual(evaluate(empty).problems, ["/sv/ 360: apps grid has no cards"]);
  });

  it("names a card whose element was not found instead of passing on NaN or null (AC-30: never silently)", () => {
    const missing = structuredClone(aligned);
    missing[0].grids.apps[1].midTop = null; // a NaN measurement arrives as null over the protocol
    missing[0].grids.apps[1].actionBottom = NaN;
    missing[1].grids.services[0].title = { height: NaN, lineHeight: NaN };
    assert.deepEqual(evaluate(missing).problems, [
      "/ 1280: apps card 2 has no measurable summary, action row (element not found)",
      "/sv/ 360: services card 1 has no measurable title, title line height (element not found)",
    ]);
    assert.match(evaluate(missing).lines[0], /^layout \/ 1280: FAIL — apps card 2 has no measurable/);
  });
});

describe("layout report evaluation — article measure and figures (si-55iu, centred 2026-09-22)", () => {
  // Real measurements: the first article at 1024 and at 360 (everything
  // stacked, the panels at the body's width), the nivå article at 1920 (two
  // inline figures with the caption beside the panel, a wide three-panel
  // figure across the body).
  let article;
  before(async () => {
    article = JSON.parse(await readFile(fixture("layout", "article.json"), "utf8"));
  });

  it("passes the fixture and prints the documented lines", () => {
    const result = evaluate(article);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.lines, [
      "layout /blog/how-this-site-was-built-by-agents/ 1024: ok (11 blocks on the measure, 3 figures)",
      "layout /blog/how-this-site-was-built-by-agents/ 360: ok (11 blocks on the measure, 3 figures)",
      "layout /blog/lessons-from-building-niva/ 1920: ok (15 blocks on the measure, 3 figures)",
    ]);
    assert.equal(MEASURE_REM, 44);
    assert.deepEqual(PANEL_REM, { min: 20, max: 24.5 });
    assert.equal(BESIDE_FROM_PX, 768);
    assert.equal(INLINE_GAP_REM, 1.5);
    assert.equal(LABEL_UNITS, 13);
    assert.equal(LABEL_MIN_PX, 12);
  });

  it("fails a page that scrolls horizontally", () => {
    const wide = structuredClone(article);
    wide[1].article.scrollWidth = 372;
    assert.deepEqual(evaluate(wide).problems, ["/blog/how-this-site-was-built-by-agents/ 360: the page scrolls horizontally (372 px wide for a 360 px viewport)"]);
  });

  it("fails a text block wider than the 44rem measure, one off the body's centre and one off the shared left edge", () => {
    const off = structuredClone(article);
    off[2].article.blocks[3].left -= 2; // 708 px: 4 px past the measure at 1920, still centred, 2 px off the edge
    off[2].article.blocks[3].right += 2;
    off[2].article.blocks[5].left += 4; // shifted right: off centre and off the shared edge
    off[2].article.blocks[5].right += 4;
    assert.deepEqual(evaluate(off).problems, [
      "/blog/lessons-from-building-niva/ 1920: block 4 (h2) is 708 px wide, wider than the 704 px measure",
      "/blog/lessons-from-building-niva/ 1920: block 4 (h2) starts at 606 px, off the shared left edge (608 px)",
      "/blog/lessons-from-building-niva/ 1920: block 6 (h2) spans 612–1316 px, not centred in the body (392–1528 px)",
      "/blog/lessons-from-building-niva/ 1920: block 6 (h2) starts at 612 px, off the shared left edge (608 px)",
    ]);
  });

  it("fails an inline figure off the measure or off centre, a panel outside 20–24.5rem, and a caption not beside its panel from 48rem", () => {
    const astray = structuredClone(article);
    const [, loop, gates] = astray[0].article.figures;
    loop.right += 8; // 712 px wide and 4 px off centre
    loop.panel.right -= 80; // a 312 px panel, under the 20rem floor
    gates.caption.left = gates.panel.right + 12; // inside the 24 px gap
    gates.caption.top += 30; // not top-aligned
    const harness = astray[2].article.figures[2];
    harness.panel.right += 10; // 402 px, over the 24.5rem ceiling (the caption keeps its gap)
    harness.caption.left += 10;
    assert.deepEqual(evaluate(astray).problems, [
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-loop is 712 px wide, wider than the 704 px measure",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-loop spans 160–872 px, not centred in the body (40–984 px)",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-loop panel is 312 px wide, outside 320–392 px",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-gates caption starts at 564 px, not beside the panel (which ends at 552 px, plus the 24 px gap)",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-gates caption starts at 1998.16 px, not top-aligned with the panel (1968.16 px)",
      "/blog/lessons-from-building-niva/ 1920: fig-harness panel is 402 px wide, outside 320–392 px",
    ]);
  });

  it("fails, below 48rem, a caption not under its panel and a panel wider than the figure", () => {
    const stacked = structuredClone(article);
    const [, loop, gates] = stacked[1].article.figures;
    loop.caption.top = loop.panel.bottom - 40; // the caption climbs into the panel
    gates.panel.right += 6; // wider than the 328 px figure
    assert.deepEqual(evaluate(stacked).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: fig-loop caption starts at 2549.14 px, not under the panel (which ends at 2589.14 px)",
      "/blog/how-this-site-was-built-by-agents/ 360: fig-gates panel is 334 px wide, outside up to 328 px",
    ]);
  });

  it("fails a wide figure that does not span the body at any width", () => {
    const short = structuredClone(article);
    short[2].article.figures[1].right -= 40; // the wide team figure stops short at 1920
    short[1].article.figures[0].left += 5; // the stacked stages figure is indented at 360
    assert.deepEqual(evaluate(short).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: fig-stages is wide but spans 21–344 px, not the body (16–344 px)",
      "/blog/lessons-from-building-niva/ 1920: fig-team is wide but spans 392–1488 px, not the body (392–1528 px)",
    ]);
  });

  it("fails a panel rendered too small for a 12 px label, one that was not found, and an inline figure without a panel row or caption", () => {
    const tiny = structuredClone(article);
    tiny[0].article.figures[0].scale = 0.9; // a 13-unit label at 11.7 px
    tiny[2].article.figures[2].scale = null;
    tiny[2].article.figures[0].caption = null;
    tiny[1].article.figures[1].panel = { left: 16, right: 344, top: NaN, bottom: null }; // an unmeasured box arrives as null over the protocol
    assert.deepEqual(evaluate(tiny).problems, [
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-stages renders a 13-unit label at 11.7 px, below 12 px",
      "/blog/how-this-site-was-built-by-agents/ 360: fig-loop has no measurable panel row (element not found)",
      "/blog/lessons-from-building-niva/ 1920: fig-assessment has no measurable caption (element not found)",
      "/blog/lessons-from-building-niva/ 1920: fig-harness has no measurable panel (svg[viewBox] not found)",
    ]);
  });

  it("tolerates one pixel and names a missing article body", () => {
    const nudged = structuredClone(article);
    nudged[0].article.figures[1].right -= 1;
    nudged[0].article.figures[2].caption.top -= 1;
    nudged[0].article.figures[2].caption.left -= 1;
    nudged[1].article.figures[1].caption.top -= 1;
    nudged[2].article.blocks[0].left += 1;
    nudged[2].article.figures[1].left += 1;
    assert.deepEqual(evaluate(nudged).problems, []);
    const missing = structuredClone(article);
    missing[1].article.body = null;
    assert.deepEqual(evaluate(missing).problems, ["/blog/how-this-site-was-built-by-agents/ 360: no measurable article body (element not found)"]);
    assert.match(evaluate(missing).lines[1], /^layout \/blog\/how-this-site-was-built-by-agents\/ 360: FAIL — no measurable article body/);
  });
});

describe("layout report evaluation — article tables (founder feedback 2026-09-24, si-t64i)", () => {
  // Real measurements of the context study, the first article with tables:
  // the English page at 360 (the body narrower than the measure, every table
  // as wide as the column) and the Swedish page at 1280 (the column 288–992
  // px, two tables narrower than it on its left edge). Every table scrolls in
  // its div.table-scroll. Regenerate from a real run with
  // `LAYOUT_DUMP=<file> pnpm check:layout` and keep these two runs.
  let tables;
  before(async () => {
    tables = JSON.parse(await readFile(fixture("layout", "tables.json"), "utf8"));
  });

  it("passes the fixture and counts the tables after the figures", () => {
    const result = evaluate(tables);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.lines, [
      "layout /blog/what-the-mayors-context-costs/ 360: ok (27 blocks on the measure, 3 figures, 5 tables)",
      "layout /sv/blog/what-the-mayors-context-costs/ 1280: ok (27 blocks on the measure, 3 figures, 5 tables)",
    ]);
  });

  it("fails a narrow table centred in the text column, where base.css put one before si-t64i", () => {
    const centred = structuredClone(tables);
    Object.assign(centred[1].article.tables[2], { left: 395.24, right: 884.77 }); // 490 px of the 704 px column
    assert.deepEqual(evaluate(centred).problems, ["/sv/blog/what-the-mayors-context-costs/ 1280: table 3 starts at 395.24 px, off the text column's left edge (288 px)"]);
  });

  it("fails a table past the column's right edge with no box around it that scrolls, where the page itself does not scroll", () => {
    const loose = structuredClone(tables);
    Object.assign(loose[1].article.tables[3], { right: 1100, scrollBox: null });
    assert.deepEqual(evaluate(loose).problems, ["/sv/blog/what-the-mayors-context-costs/ 1280: table 4 reaches 1100 px, past the text column's right edge (992 px), and no box around it scrolls"]);
  });

  it("passes a table wider than the column that scrolls inside a box on the column, and fails one whose box reaches past it", () => {
    const scrolling = structuredClone(tables);
    scrolling[1].article.tables[3].right = 1100;
    assert.deepEqual(evaluate(scrolling).problems, []);
    const wideBox = structuredClone(scrolling);
    wideBox[1].article.tables[3].scrollBox.right = 1010;
    assert.deepEqual(evaluate(wideBox).problems, ["/sv/blog/what-the-mayors-context-costs/ 1280: table 4 reaches 1010 px, past the text column's right edge (992 px)"]);
  });

  it("takes the body as the column where the body is narrower than the measure, tolerates one pixel and names a table that was not measured", () => {
    const nudged = structuredClone(tables);
    nudged[0].article.tables[1].left += 1;
    nudged[1].article.tables[4].left -= 1;
    assert.deepEqual(evaluate(nudged).problems, []);
    const off = structuredClone(tables);
    off[0].article.tables[1].left += 2;
    off[0].article.tables[0].left = null; // an unmeasured box arrives as null over the protocol
    assert.deepEqual(evaluate(off).problems, [
      "/blog/what-the-mayors-context-costs/ 360: table 1 has no measurable box",
      "/blog/what-the-mayors-context-costs/ 360: table 2 starts at 18 px, off the text column's left edge (16 px)",
    ]);
  });

  it("judges a measurement without tables, as the gate took them before si-t64i, as a page without tables", () => {
    const older = structuredClone(tables);
    delete older[0].article.tables;
    const result = evaluate(older);
    assert.deepEqual(result.problems, []);
    assert.equal(result.lines[0], "layout /blog/what-the-mayors-context-costs/ 360: ok (27 blocks on the measure, 3 figures)");
  });
});

describe("layout report evaluation — games in the page (si-y6pp)", () => {
  // Real measurements of the Gaimer article, the first that plays games: the
  // English page at 360, where each block's two versions are stacked across
  // the body (16–344 px), and at 1280, where they sit side by side in the
  // body (72–1208 px, versions 72–628 and 652–1208 px). Each version holds
  // two screens, its start screen and a moment of play, at 4:3.
  // Regenerate from a real run with `LAYOUT_DUMP=<file> pnpm check:layout`
  // and keep these two runs.
  let games;
  before(async () => {
    games = JSON.parse(await readFile(fixture("layout", "games.json"), "utf8"));
  });

  it("passes the fixture and counts the blocks of games after the tables", () => {
    const result = evaluate(games);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.lines, [
      "layout /blog/cleaning-up-gaimer/ 360: ok (29 blocks on the measure, 0 figures, 1 table, 2 blocks of games)",
      "layout /blog/cleaning-up-gaimer/ 1280: ok (29 blocks on the measure, 0 figures, 1 table, 2 blocks of games)",
    ]);
    assert.equal(games[0].width < BESIDE_FROM_PX && games[1].width >= BESIDE_FROM_PX, true, "one run stacked, one side by side");
    assert.equal(GAME_RATIO, 4 / 3);
  });

  it("fails a block of games that does not span the body", () => {
    const narrow = structuredClone(games);
    narrow[1].article.games[0].right = 1000;
    assert.deepEqual(evaluate(narrow).problems, ["/blog/cleaning-up-gaimer/ 1280: games-tetris spans 72–1000 px, not the body (72–1208 px)"]);
  });

  it("fails, from 48rem, a version under the one before it or over it", () => {
    const stacked = structuredClone(games);
    Object.assign(stacked[1].article.games[0].versions[1], { left: 72, right: 628, top: 5000, bottom: 5921.19 });
    const over = structuredClone(games);
    Object.assign(over[1].article.games[1].versions[1], { left: 600 });
    assert.deepEqual(evaluate(stacked).problems.filter((problem) => !problem.includes("screen")), ["/blog/cleaning-up-gaimer/ 1280: games-tetris version 2 starts at 5000 px, not beside version 1 (4062.48 px)"]);
    assert.deepEqual(evaluate(over).problems.filter((problem) => !problem.includes("screen")), ["/blog/cleaning-up-gaimer/ 1280: games-pong version 2 starts at 600 px, over version 1 (which ends at 628 px)"]);
  });

  it("fails, below 48rem, a version that does not span the block and one that is not under the one before it", () => {
    const beside = structuredClone(games);
    Object.assign(beside[0].article.games[0].versions[1], { left: 180 });
    Object.assign(beside[0].article.games[1].versions[1], { top: 8900 });
    assert.deepEqual(evaluate(beside).problems.filter((problem) => !problem.includes("screen")), [
      "/blog/cleaning-up-gaimer/ 360: games-tetris version 2 spans 180–344 px, not the block (16–344 px)",
      "/blog/cleaning-up-gaimer/ 360: games-pong version 2 starts at 8900 px, not under version 1 (which ends at 8952.05 px)",
    ]);
  });

  it("fails a screen that is not 4:3 and one that reaches outside its version", () => {
    const off = structuredClone(games);
    const [start, play] = off[1].article.games[0].versions[0].screens;
    start.bottom = start.top + 300;
    Object.assign(play, { left: 144, right: 700 });
    assert.deepEqual(evaluate(off).problems, [
      "/blog/cleaning-up-gaimer/ 1280: games-tetris version 1 screen 1 is 556 × 300 px, not 4:3",
      "/blog/cleaning-up-gaimer/ 1280: games-tetris version 1 screen 2 spans 144–700 px, outside its version (72–628 px)",
    ]);
  });

  it("tolerates one pixel and names what was not measured or not found", () => {
    const nudged = structuredClone(games);
    nudged[1].article.games[0].left += 1;
    nudged[1].article.games[1].versions[1].top -= 1;
    nudged[0].article.games[0].versions[0].screens[0].bottom += 1;
    assert.deepEqual(evaluate(nudged).problems, []);
    const missing = structuredClone(games);
    missing[0].article.games[0].versions[1].screens[1].left = null; // an unmeasured box arrives as null over the protocol
    missing[0].article.games[1].versions[0].screens = [];
    missing[1].article.games[0].versions = [];
    missing[1].article.games[1].left = null;
    assert.deepEqual(evaluate(missing).problems, [
      "/blog/cleaning-up-gaimer/ 360: games-tetris version 2 screen 2 has no measurable box",
      "/blog/cleaning-up-gaimer/ 360: games-pong version 1 has no screens (element not found)",
      "/blog/cleaning-up-gaimer/ 1280: games-tetris has no versions (element not found)",
      "/blog/cleaning-up-gaimer/ 1280: games-pong has no measurable box",
    ]);
  });

  it("judges a measurement without games, as the gate took them before si-y6pp, as a page without games", () => {
    const older = structuredClone(games);
    delete older[0].article.games;
    const result = evaluate(older);
    assert.deepEqual(result.problems, []);
    assert.equal(result.lines[0], "layout /blog/cleaning-up-gaimer/ 360: ok (29 blocks on the measure, 0 figures, 1 table)");
  });
});

describe("layout report evaluation — the article's image (si-awlu)", () => {
  // Real measurements of two articles with their image under the summary:
  // the English page at 360, where the body (16–344 px) is narrower than the
  // measure and is the text column, and the Swedish page at 1280, where the
  // column is the 704 px measure, 288–992 px, in a body of 72–1208 px.
  // Regenerate from a real run with `LAYOUT_DUMP=<file> pnpm check:layout`
  // and keep these two runs.
  let image;
  before(async () => {
    image = JSON.parse(await readFile(fixture("layout", "image.json"), "utf8"));
  });

  it("passes the fixture, each image across the text column at 1200:630 under the summary", () => {
    const result = evaluate(image);
    assert.deepEqual(result.problems, []);
    assert.deepEqual(result.lines, [
      "layout /blog/how-this-site-was-built-by-agents/ 360: ok (11 blocks on the measure, 4 figures)",
      "layout /sv/blog/why-we-run-an-agent-run-factory/ 1280: ok (21 blocks on the measure, 4 figures)",
    ]);
    assert.equal(IMAGE_RATIO, 1200 / 630);
  });

  it("fails an image across the whole body instead of the text column, and one moved off it", () => {
    const off = structuredClone(image);
    Object.assign(off[1].article.image, { left: 72, right: 1208, bottom: 424.83 + (1136 * 630) / 1200 }); // the body's width, still 1200:630
    off[0].article.image.left += 2; // moved 2 px to the right
    off[0].article.image.right += 2;
    assert.deepEqual(evaluate(off).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: the article image spans 18–346 px, not the text column (16–344 px)",
      "/sv/blog/why-we-run-an-agent-run-factory/ 1280: the article image spans 72–1208 px, not the text column (288–992 px)",
    ]);
  });

  it("fails an image that is not 1200:630, squeezed or cut", () => {
    const squeezed = structuredClone(image);
    squeezed[1].article.image.bottom -= 20;
    squeezed[0].article.image.bottom += 10;
    assert.deepEqual(evaluate(squeezed).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: the article image is 328 × 182.19 px, not 1200:630",
      "/sv/blog/why-we-run-an-agent-run-factory/ 1280: the article image is 704 × 349.59 px, not 1200:630",
    ]);
  });

  it("fails an image that starts above the end of the summary", () => {
    const above = structuredClone(image);
    above[0].article.image.top -= 30; // 368.58 px, where the summary ends at 374.58 px
    above[0].article.image.bottom -= 30;
    assert.deepEqual(evaluate(above).problems, ["/blog/how-this-site-was-built-by-agents/ 360: the article image starts at 368.58 px, above the end of the summary (374.58 px)"]);
  });

  it("tolerates one pixel, and names an image that was not found and one without a summary above it", () => {
    const nudged = structuredClone(image);
    nudged[0].article.image.left += 1;
    nudged[0].article.image.right += 1;
    nudged[1].article.image.top = nudged[1].article.image.summaryBottom - 1;
    nudged[1].article.image.bottom = nudged[1].article.image.top + (704 * 630) / 1200;
    assert.deepEqual(evaluate(nudged).problems, []);
    const missing = structuredClone(image);
    missing[0].article.image = null; // no img.article-image in the header
    missing[1].article.image.summaryBottom = null; // an unmeasured box arrives as null over the protocol
    assert.deepEqual(evaluate(missing).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: the article image has no measurable box (element not found)",
      "/sv/blog/why-we-run-an-agent-run-factory/ 1280: the article image has no summary above it (element not found)",
    ]);
  });

  it("judges a measurement without an image, as the gate took them before si-awlu, as a page without one", () => {
    const older = structuredClone(image);
    delete older[0].article.image;
    assert.deepEqual(evaluate(older).problems, []);
  });
});

describe("layout gate without Chrome (REQ-024: an explicit skip)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("layout-");
  });
  after(() => tmp.cleanup());

  it("exits 3 and prints the SKIP line when CHROME_PATH points nowhere", () => {
    const { status, output } = runGate("layout", tmp.dir, SRC, { CHROME_PATH: "/nonexistent" });
    assert.equal(status, SKIP_EXIT_CODE, output);
    assert.equal(output.trim(), skipMessage("layout"));
    assert.match(output, /^SKIP layout: no Chrome found \(run pnpm check:layout after installing Chrome or set CHROME_PATH\)/);
  });

  it("exits 1 under CHECK_REQUIRE_CHROME=1 when CHROME_PATH points nowhere", () => {
    const { status, output } = runGate("layout", tmp.dir, SRC, { CHROME_PATH: "/nonexistent", CHECK_REQUIRE_CHROME: "1" });
    assert.equal(status, 1, output);
    assert.match(output, /FAIL layout: CHECK_REQUIRE_CHROME=1 and no Chrome was found/);
  });
});
