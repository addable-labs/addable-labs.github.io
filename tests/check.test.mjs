import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { ROOT, tempDir } from "./helpers.mjs";

// The runner (REQ-021, AC-02; redesign REQ-024, AC-25): ten gate lines, the
// two Chrome-backed gates reported as SKIP — never PASS — when no Chrome is
// found, and as failures under CHECK_REQUIRE_CHROME=1. Both runs point
// CHROME_PATH nowhere so the suite stays fast and Chrome-free; the real
// ten-PASS run is `pnpm check` on a machine with Chrome (CI requires it).
const GATES = ["build", "links", "html", "pages", "contrast", "parity", "feeds", "content", "lighthouse", "layout"];

function runCheck(env) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", "run.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_OFFLINE: "1", CHROME_PATH: "/nonexistent", CHECK_REQUIRE_CHROME: "", ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status, lines: result.stdout.trim().split("\n"), output: result.stdout + result.stderr };
}

describe("pnpm check aggregator", () => {
  it("prints ten gate lines — eight PASS and two SKIP without Chrome — and exits 0 (external links skipped)", () => {
    const { status, lines, output } = runCheck({});
    assert.equal(status, 0, output);
    const statusLines = lines.filter((line) => /^(PASS|FAIL|SKIP) /.test(line));
    assert.deepEqual(statusLines, GATES.map((gate) => (gate === "lighthouse" || gate === "layout" ? `SKIP ${gate} (run pnpm check:${gate})` : `PASS ${gate}`)));
    assert.match(output, /SKIP lighthouse: no Chrome found/);
    assert.match(output, /SKIP layout: no Chrome found/);
    assert.doesNotMatch(output, /PASS lighthouse|PASS layout/);
  });

  it("fails the two Chrome-backed gates under CHECK_REQUIRE_CHROME=1 when no Chrome is found", () => {
    const { status, lines, output } = runCheck({ CHECK_REQUIRE_CHROME: "1" });
    assert.notEqual(status, 0, output);
    const statusLines = lines.filter((line) => /^(PASS|FAIL|SKIP) /.test(line));
    assert.deepEqual(statusLines, GATES.map((gate) => (gate === "lighthouse" || gate === "layout" ? `FAIL ${gate}` : `PASS ${gate}`)));
  });

  describe("after a failed build", () => {
    // A pnpm stand-in first on PATH: `pnpm -s run build` fails, every other
    // invocation is handed to the real pnpm, so the gates could run against
    // the stale _site/ if the runner let them.
    let tmp;
    before(async () => {
      tmp = await tempDir("check-");
      const realPnpm = spawnSync("sh", ["-c", "command -v pnpm"], { encoding: "utf8" }).stdout.trim();
      assert.ok(realPnpm, "pnpm on PATH");
      const stub = path.join(tmp.dir, "pnpm");
      await writeFile(stub, `#!/bin/sh\ncase "$*" in *"run build"*) echo "eleventy: simulated build failure" >&2; exit 1;; esac\nexec "${realPnpm}" "$@"\n`);
      await chmod(stub, 0o755);
    });
    after(() => tmp.cleanup());

    it("names the cause, reports the other nine gates as not run — no PASS line after FAIL build — and exits 1", () => {
      const { status, lines, output } = runCheck({ PATH: `${tmp.dir}${path.delimiter}${process.env.PATH}` });
      assert.equal(status, 1, output);
      assert.match(output, /simulated build failure/);
      const statusLines = lines.filter((line) => /^(PASS|FAIL|SKIP) /.test(line));
      assert.deepEqual(statusLines, GATES.map((gate) => (gate === "build" ? "FAIL build" : `FAIL ${gate} (not run: build failed)`)));
    });
  });

  // One moment for the whole run (si-nka4): the build and every gate read the
  // day in a process of their own, so the runner fixes the moment as it starts
  // and hands the same SITE_NOW to each. A pnpm stand-in first on PATH writes
  // down the SITE_NOW and the arguments of every invocation, and passes.
  describe("one moment for the build and every gate", () => {
    let tmp;
    let log;
    before(async () => {
      tmp = await tempDir("check-now-");
      log = path.join(tmp.dir, "invocations");
      const stub = path.join(tmp.dir, "pnpm");
      await writeFile(stub, `#!/bin/sh\nprintf '%s %s\\n' "$SITE_NOW" "$*" >> "${log}"\n`);
      await chmod(stub, 0o755);
    });
    after(() => tmp.cleanup());

    /** Run the runner on the stand-in; returns [SITE_NOW, pnpm arguments] for each invocation, in order. */
    async function invocations(env) {
      await rm(log, { force: true });
      const { status, output } = runCheck({ PATH: `${tmp.dir}${path.delimiter}${process.env.PATH}`, ...env });
      assert.equal(status, 0, output);
      return (await readFile(log, "utf8")).trimEnd().split("\n").map((line) => {
        const [now, ...args] = line.split(" ");
        return [now, args.join(" ")];
      });
    }

    const ARGUMENTS = GATES.map((gate) => (gate === "build" ? "-s run build" : `-s run check:${gate}`));

    it("hands the build and all nine gates the moment the run started when SITE_NOW is unset", async () => {
      const start = Date.now();
      const seen = await invocations({ SITE_NOW: "" });
      const end = Date.now();
      assert.deepEqual(seen.map(([, args]) => args), ARGUMENTS);
      const moments = [...new Set(seen.map(([now]) => now))];
      assert.equal(moments.length, 1, `one moment, not ${moments.join(", ")}`);
      assert.match(moments[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      assert.ok(start <= Date.parse(moments[0]) && Date.parse(moments[0]) <= end, `${moments[0]} is within the run`);
    });

    it("hands on the moment SITE_NOW names when it is set, as it is", async () => {
      const seen = await invocations({ SITE_NOW: "2026-09-24T04:17" });
      assert.deepEqual(seen, ARGUMENTS.map((args) => ["2026-09-24T04:17", args]));
    });
  });

  // The runner passes on a SITE_NOW it is given as it is, so one the build
  // cannot read fails the build, in the build's words, and no gate runs.
  it("fails the build on a SITE_NOW it cannot read and runs no gate", () => {
    const { status, lines, output } = runCheck({ SITE_NOW: "tomorrow" });
    assert.equal(status, 1, output);
    assert.match(output, /SITE_NOW must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\), got "tomorrow"/);
    const statusLines = lines.filter((line) => /^(PASS|FAIL|SKIP) /.test(line));
    assert.deepEqual(statusLines, GATES.map((gate) => (gate === "build" ? "FAIL build" : `FAIL ${gate} (not run: build failed)`)));
  });
});
