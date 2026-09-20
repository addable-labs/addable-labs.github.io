import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./helpers.mjs";

describe("pnpm check aggregator", () => {
  it("prints exactly eight PASS lines and exits 0 (external links skipped)", () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", "run.mjs")], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, CHECK_OFFLINE: "1" },
      maxBuffer: 64 * 1024 * 1024,
    });
    const lines = result.stdout.trim().split("\n");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(lines, ["build", "links", "html", "pages", "contrast", "parity", "feeds", "content"].map((gate) => `PASS ${gate}`));
  });
});
