import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { CATEGORIES, CLS_LIMIT, evaluate, formatLine, THRESHOLD } from "../scripts/lib/lighthouse-report.mjs";
import { skipMessage, SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { fixture, ROOT, tempDir } from "./helpers.mjs";

// The Lighthouse gate's threshold logic on fixture reports (REQ-021, REQ-025;
// AC-19, AC-22; plan D-08) — no Chrome needed — and the gate's explicit SKIP
// when no Chrome is found (REQ-024: a skip is never a PASS).

/** Run the gate script with a controlled environment; returns { status, output }. */
function runLighthouseGate(out, env) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", "lighthouse.mjs"), out], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_REQUIRE_CHROME: "", ...env },
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("lighthouse report evaluation (REQ-021, AC-22)", () => {
  let pass;
  let fail;
  before(async () => {
    pass = JSON.parse(await readFile(fixture("lighthouse", "lhr-pass.json"), "utf8"));
    fail = JSON.parse(await readFile(fixture("lighthouse", "lhr-fail.json"), "utf8"));
  });

  it("scores the four categories and reads them as percentages", () => {
    assert.deepEqual(CATEGORIES, ["performance", "accessibility", "best-practices", "seo"]);
    assert.equal(THRESHOLD, 95);
    assert.equal(CLS_LIMIT, 0.1);
    const result = evaluate(pass);
    assert.deepEqual(result.scores, { performance: 97, accessibility: 100, "best-practices": 100, seo: 100 });
    assert.equal(result.cls, 0.003);
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
  });

  it("passes a category at exactly 95 and fails one at 94", () => {
    const at95 = structuredClone(pass);
    at95.categories.performance.score = 0.95;
    assert.equal(evaluate(at95).ok, true);
    const at94 = structuredClone(pass);
    at94.categories.accessibility.score = 0.94;
    const result = evaluate(at94);
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, ["accessibility 94 < 95"]);
    assert.equal(evaluate(at94, 90).ok, true, "the threshold is a parameter");
  });

  it("fails the fixture report with a 94, a missing category and a layout shift, naming each", () => {
    const result = evaluate(fail);
    assert.equal(result.ok, false);
    assert.deepEqual(result.scores, { performance: 94, accessibility: 95, "best-practices": 100, seo: null });
    assert.deepEqual(result.problems, ["performance 94 < 95", "seo: no score in the report", "CLS 0.250 > 0.1"]);
  });

  it("fails a report without a CLS value and one over the limit (AC-19)", () => {
    const noCls = structuredClone(pass);
    delete noCls.audits["cumulative-layout-shift"];
    assert.deepEqual(evaluate(noCls).problems, ["cumulative-layout-shift: no value in the report"]);
    const shifted = structuredClone(pass);
    shifted.audits["cumulative-layout-shift"].numericValue = 0.11;
    assert.deepEqual(evaluate(shifted).problems, ["CLS 0.110 > 0.1"]);
  });

  it("formats the documented one-line result", () => {
    assert.equal(formatLine("/", evaluate(pass)), "lighthouse /: performance 97 · accessibility 100 · best-practices 100 · seo 100 · CLS 0.003 ok");
    assert.match(formatLine("/sv/", evaluate(fail)), /^lighthouse \/sv\/: performance 94 · accessibility 95 · best-practices 100 · seo – · CLS 0\.250 FAIL — performance 94 < 95; seo: no score in the report; CLS 0\.250 > 0\.1$/);
  });
});

describe("lighthouse gate without Chrome (REQ-024: an explicit skip)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("lighthouse-");
  });
  after(() => tmp.cleanup());

  it("exits 3 and prints the SKIP line when CHROME_PATH points nowhere", () => {
    const { status, output } = runLighthouseGate(tmp.dir, { CHROME_PATH: "/nonexistent" });
    assert.equal(status, SKIP_EXIT_CODE, output);
    assert.equal(output.trim(), skipMessage("lighthouse"));
    assert.match(output, /^SKIP lighthouse: no Chrome found \(run pnpm check:lighthouse after installing Chrome or set CHROME_PATH\)/);
    assert.doesNotMatch(output, /PASS/);
  });

  it("exits 1 under CHECK_REQUIRE_CHROME=1 when CHROME_PATH points nowhere", () => {
    const { status, output } = runLighthouseGate(tmp.dir, { CHROME_PATH: "/nonexistent", CHECK_REQUIRE_CHROME: "1" });
    assert.equal(status, 1, output);
    assert.match(output, /FAIL lighthouse: CHECK_REQUIRE_CHROME=1 and no Chrome was found/);
  });
});
