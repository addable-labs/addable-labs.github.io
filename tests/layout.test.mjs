import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { evaluate, LINE_RATIO, rowsOf, TOLERANCE } from "../scripts/lib/layout-report.mjs";
import { skipMessage, SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { fixture, ROOT, tempDir } from "./helpers.mjs";

// The card-balance rules of the layout gate on fixture measurements (A-02,
// AC-30, REQ-025; plan D-14) — no Chrome needed — and the gate's explicit SKIP
// when no Chrome is found.

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
