import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./helpers.mjs";

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
});
