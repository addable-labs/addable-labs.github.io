import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { evaluate, LABEL_MIN_PX, LABEL_UNITS, LANE_FROM_PX, LANE_REM, LINE_RATIO, MEASURE_REM, rowsOf, TOLERANCE } from "../scripts/lib/layout-report.mjs";
import { skipMessage, SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { fixture, ROOT, tempDir } from "./helpers.mjs";

// The card-balance rules of the layout gate on fixture measurements (A-02,
// AC-30, REQ-025; plan D-14), the article rules on fixture measurements of
// the illustrated articles (founder feedback 2026-09-21, si-55iu) — no
// Chrome needed — and the gate's explicit SKIP when no Chrome is found.

function runLayoutGate(out, env) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", "layout.mjs"), out], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_REQUIRE_CHROME: "", ...env },
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("layout report evaluation (A-02, AC-30)", () => {
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

describe("layout report evaluation — article measure and figures (si-55iu)", () => {
  // Real measurements: the first article at 1024 (the lane's floor) and at
  // 360 (everything stacked), the nivå article at 1920 (the lane at its
  // ceiling, a wide three-panel figure).
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
    assert.deepEqual(LANE_REM, { min: 20, max: 24.5 });
    assert.equal(LANE_FROM_PX, 1024);
    assert.equal(LABEL_UNITS, 13);
    assert.equal(LABEL_MIN_PX, 12);
  });

  it("fails a page that scrolls horizontally", () => {
    const wide = structuredClone(article);
    wide[1].article.scrollWidth = 372;
    assert.deepEqual(evaluate(wide).problems, ["/blog/how-this-site-was-built-by-agents/ 360: the page scrolls horizontally (372 px wide for a 360 px viewport)"]);
  });

  it("fails a text block wider than the 44rem measure or off the body's left edge", () => {
    const off = structuredClone(article);
    off[2].article.blocks[3].right = 392 + 44 * 16 + 3; // 3 px past the measure at 1920
    off[2].article.blocks[5].left += 4;
    assert.deepEqual(evaluate(off).problems, [
      "/blog/lessons-from-building-niva/ 1920: block 4 (h2) is 707 px wide, wider than the 704 px measure",
      "/blog/lessons-from-building-niva/ 1920: block 6 (h2) starts at 396 px, not at the body's left edge (392 px)",
    ]);
  });

  it("fails a side figure that leaves the lane from 64rem: not at the right edge, too narrow or too wide, above its paragraph, under its paragraph's lines", () => {
    const astray = structuredClone(article);
    const [loop, gates] = [astray[0].article.figures[1], astray[0].article.figures[2]];
    loop.right -= 8; // 312 px wide: off the right edge and under the 20rem floor
    gates.top -= 30; // above the paragraph it accompanies
    gates.nextLinesRight = gates.left + 12; // the text runs under it
    assert.deepEqual(evaluate(astray).problems, [
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-loop ends at 976 px, not at the body's right edge (984 px)",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-loop is 312 px wide, outside the 320–392 px lane",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-gates starts at 1622.75 px, above the paragraph it accompanies (1652.75 px)",
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-gates at 664 px overlaps the text beside it, which reaches 676 px",
    ]);
  });

  it("fails a wide figure that does not span the body, and any figure past the body below 64rem", () => {
    const short = structuredClone(article);
    short[2].article.figures[1].right -= 40; // the wide team figure stops short at 1920
    short[1].article.figures[0].right += 6; // the stacked stages figure overflows at 360
    short[1].article.figures[1].left += 5; // the stacked loop figure is indented at 360
    assert.deepEqual(evaluate(short).problems, [
      "/blog/how-this-site-was-built-by-agents/ 360: fig-stages ends at 350 px, past the body's right edge (344 px)",
      "/blog/how-this-site-was-built-by-agents/ 360: fig-stages is wide but ends at 350 px, not at the body's right edge (344 px)",
      "/blog/how-this-site-was-built-by-agents/ 360: fig-loop starts at 21 px, not at the body's left edge (16 px)",
      "/blog/lessons-from-building-niva/ 1920: fig-team is wide but ends at 1488 px, not at the body's right edge (1528 px)",
    ]);
  });

  it("fails a panel rendered too small for a 12 px label, and one that was not found", () => {
    const tiny = structuredClone(article);
    tiny[0].article.figures[0].scale = 0.9; // a 13-unit label at 11.7 px
    tiny[2].article.figures[2].scale = null;
    assert.deepEqual(evaluate(tiny).problems, [
      "/blog/how-this-site-was-built-by-agents/ 1024: fig-stages renders a 13-unit label at 11.7 px, below 12 px",
      "/blog/lessons-from-building-niva/ 1920: fig-harness has no measurable panel (svg[viewBox] not found)",
    ]);
  });

  it("tolerates one pixel and names a missing article body", () => {
    const nudged = structuredClone(article);
    nudged[0].article.figures[1].right -= 1;
    nudged[0].article.figures[2].top -= 1;
    nudged[2].article.blocks[0].left += 1;
    assert.deepEqual(evaluate(nudged).problems, []);
    const missing = structuredClone(article);
    missing[1].article.body = null;
    assert.deepEqual(evaluate(missing).problems, ["/blog/how-this-site-was-built-by-agents/ 360: no measurable article body (element not found)"]);
    assert.match(evaluate(missing).lines[1], /^layout \/blog\/how-this-site-was-built-by-agents\/ 360: FAIL — no measurable article body/);
  });
});

describe("layout gate without Chrome (REQ-024: an explicit skip)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("layout-");
  });
  after(() => tmp.cleanup());

  it("exits 3 and prints the SKIP line when CHROME_PATH points nowhere", () => {
    const { status, output } = runLayoutGate(tmp.dir, { CHROME_PATH: "/nonexistent" });
    assert.equal(status, SKIP_EXIT_CODE, output);
    assert.equal(output.trim(), skipMessage("layout"));
    assert.match(output, /^SKIP layout: no Chrome found \(run pnpm check:layout after installing Chrome or set CHROME_PATH\)/);
  });

  it("exits 1 under CHECK_REQUIRE_CHROME=1 when CHROME_PATH points nowhere", () => {
    const { status, output } = runLayoutGate(tmp.dir, { CHROME_PATH: "/nonexistent", CHECK_REQUIRE_CHROME: "1" });
    assert.equal(status, 1, output);
    assert.match(output, /FAIL layout: CHECK_REQUIRE_CHROME=1 and no Chrome was found/);
  });
});
