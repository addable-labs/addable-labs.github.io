import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { appendStepSummary, CATEGORIES, CLS_LIMIT, evaluate, formatLine, judgePage, THRESHOLD } from "../scripts/lib/lighthouse-report.mjs";
import { skipMessage, SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { fixture, ROOT, tempDir } from "./helpers.mjs";

// The Lighthouse gate's threshold logic on fixture reports (REQ-021, REQ-025;
// AC-19, AC-22; plan D-08), the re-measure of a page that is only slow and
// the step summary (si-0rxb) — no Chrome needed — and the gate's explicit
// SKIP when no Chrome is found (REQ-024: a skip is never a PASS).

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

describe("a page whose only problem is performance is measured twice more (si-0rxb)", () => {
  let pass;
  before(async () => {
    pass = JSON.parse(await readFile(fixture("lighthouse", "lhr-pass.json"), "utf8"));
  });

  /** The passing fixture report with other scores (in percent, null for none) or another CLS. */
  function report({ cls, ...scores }) {
    const lhr = structuredClone(pass);
    for (const [category, score] of Object.entries(scores)) lhr.categories[category].score = score === null ? null : score / 100;
    if (cls !== undefined) lhr.audits["cumulative-layout-shift"].numericValue = cls;
    return lhr;
  }

  /** Stands in for one Lighthouse run per call: hands out `reports` in order and counts the calls. */
  function measurer(...reports) {
    const measure = async () => {
      assert.ok(measure.calls < reports.length, `measured more than ${reports.length} times`);
      return reports[measure.calls++];
    };
    measure.calls = 0;
    return measure;
  }

  it("takes one sample when the first run passes, and prints the documented line", async () => {
    const measure = measurer(pass, pass, pass);
    const result = await judgePage(measure);
    assert.equal(measure.calls, 1);
    assert.deepEqual(result.samples, [97]);
    assert.equal(result.ok, true);
    assert.equal(formatLine("/", result), "lighthouse /: performance 97 · accessibility 100 · best-practices 100 · seo 100 · CLS 0.003 ok");
  });

  it("passes on the median when a first run of 85 is followed by 97 and 96", async () => {
    const measure = measurer(report({ performance: 85 }), report({ performance: 97 }), report({ performance: 96 }));
    const result = await judgePage(measure);
    assert.equal(measure.calls, 3);
    assert.deepEqual(result.samples, [85, 97, 96]);
    assert.equal(result.scores.performance, 96);
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
    assert.equal(formatLine("/", result), "lighthouse /: performance 96 (85, 97, 96) · accessibility 100 · best-practices 100 · seo 100 · CLS 0.003 ok");
  });

  it("fails on the median when a first run of 85 is followed by 94 and 97, naming the samples", async () => {
    const measure = measurer(report({ performance: 85 }), report({ performance: 94 }), report({ performance: 97 }));
    const result = await judgePage(measure);
    assert.equal(measure.calls, 3);
    assert.deepEqual(result.samples, [85, 94, 97]);
    assert.equal(result.scores.performance, 94);
    assert.deepEqual(result.problems, ["performance 94 < 95 (median of 85, 94, 97)"]);
    assert.equal(result.ok, false);
    assert.equal(formatLine("/", result), "lighthouse /: performance 94 (85, 94, 97) · accessibility 100 · best-practices 100 · seo 100 · CLS 0.003 FAIL — performance 94 < 95 (median of 85, 94, 97)");
  });

  it("passes on a median of exactly 95, as it passes a first run of 95", async () => {
    const measure = measurer(report({ performance: 85 }), report({ performance: 99 }), report({ performance: 95 }));
    const result = await judgePage(measure);
    assert.equal(measure.calls, 3);
    assert.deepEqual(result.samples, [85, 99, 95]);
    assert.equal(result.scores.performance, 95);
    assert.equal(result.ok, true);
  });

  it("fails at once, without measuring again, when accessibility is under the bar too", async () => {
    const measure = measurer(report({ performance: 85, accessibility: 94 }), pass, pass);
    const result = await judgePage(measure);
    assert.equal(measure.calls, 1);
    assert.deepEqual(result.samples, [85]);
    assert.deepEqual(result.problems, ["performance 85 < 95", "accessibility 94 < 95"]);
    assert.equal(result.ok, false);
  });

  it("fails at once, without measuring again, when the layout shifts too", async () => {
    const measure = measurer(report({ performance: 85, cls: 0.25 }), pass, pass);
    const result = await judgePage(measure);
    assert.equal(measure.calls, 1);
    assert.deepEqual(result.samples, [85]);
    assert.deepEqual(result.problems, ["performance 85 < 95", "CLS 0.250 > 0.1"]);
    assert.equal(result.ok, false);
  });

  it("fails at once, without measuring again, when another category or the layout shift is the only problem", async () => {
    const cases = [
      [{ accessibility: 94 }, "accessibility 94 < 95"],
      [{ "best-practices": 94 }, "best-practices 94 < 95"],
      [{ seo: 94 }, "seo 94 < 95"],
      [{ cls: 0.25 }, "CLS 0.250 > 0.1"],
    ];
    for (const [edits, problem] of cases) {
      // Performance exactly at the bar: it passes, so it is not the problem.
      const measure = measurer(report({ performance: 95, ...edits }), pass, pass);
      const result = await judgePage(measure);
      assert.equal(measure.calls, 1, problem);
      assert.deepEqual(result.samples, [95]);
      assert.deepEqual(result.problems, [problem]);
      assert.equal(result.ok, false);
    }
  });

  it("fails at once, without measuring again, when the first run has no performance score", async () => {
    const measure = measurer(report({ performance: null }), pass, pass);
    const result = await judgePage(measure);
    assert.equal(measure.calls, 1);
    assert.deepEqual(result.samples, [null]);
    assert.deepEqual(result.problems, ["performance: no score in the report"]);
    assert.equal(result.ok, false);
  });

  it("counts a run without a performance score as the lowest sample", async () => {
    const measure = measurer(report({ performance: 85 }), report({ performance: null }), report({ performance: 97 }));
    const result = await judgePage(measure);
    assert.equal(measure.calls, 3);
    assert.deepEqual(result.samples, [85, null, 97]);
    assert.deepEqual(result.problems, ["performance 85 < 95 (median of 85, –, 97)"]);
    assert.equal(result.ok, false);
  });
});

describe("lighthouse lines in the GitHub Actions step summary (si-0rxb)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("lighthouse-summary-");
  });
  after(() => tmp.cleanup());

  it("appends the lines to the file GITHUB_STEP_SUMMARY names, and writes nothing when it is unset", async () => {
    const file = path.join(tmp.dir, "summary.md");
    await writeFile(file, "earlier output\n");
    const lines = [
      "lighthouse /: performance 96 (85, 97, 96) · accessibility 100 · best-practices 100 · seo 100 · CLS 0.000 ok",
      "lighthouse /sv/: performance 97 · accessibility 100 · best-practices 100 · seo 100 · CLS 0.000 ok",
    ];
    assert.equal(await appendStepSummary(lines, {}), false);
    assert.equal(await appendStepSummary(lines, { GITHUB_STEP_SUMMARY: "" }), false);
    assert.equal(await readFile(file, "utf8"), "earlier output\n");
    assert.equal(await appendStepSummary(lines, { GITHUB_STEP_SUMMARY: file }), true);
    assert.equal(await readFile(file, "utf8"), `earlier output\n### Lighthouse\n\n\`\`\`text\n${lines.join("\n")}\n\`\`\`\n`);
  });

  it("reads GITHUB_STEP_SUMMARY from the environment, as the gate calls it", async () => {
    const file = path.join(tmp.dir, "from-env.md");
    const module = pathToFileURL(path.join(ROOT, "scripts", "lib", "lighthouse-report.mjs")).href;
    const script = `const { appendStepSummary } = await import(${JSON.stringify(module)}); await appendStepSummary(["lighthouse /: a line"]);`;
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: file } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(file, "utf8"), "### Lighthouse\n\n```text\nlighthouse /: a line\n```\n");
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
