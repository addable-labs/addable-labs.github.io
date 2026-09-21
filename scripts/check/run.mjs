#!/usr/bin/env node
// `pnpm check`: the one command that proves the built site (REQ-021, AC-02;
// redesign REQ-024, AC-25).
//
// Runs `pnpm build` as the first gate, then every gate script against _site/
// as a child process, prints exactly one `PASS <gate>`, `FAIL <gate>` or
// `SKIP <gate> (run pnpm check:<gate>)` line per gate (a failing or skipping
// gate's output — the offending paths or keys, or the skip reason — is
// printed before its line; set CHECK_VERBOSE=1 to see passing output too),
// and exits non-zero if any gate fails. The two Chrome-backed gates
// (lighthouse, layout) exit with code 3 when no Chrome is found; the runner
// reports that as SKIP — never PASS — and still exits 0 unless
// CHECK_REQUIRE_CHROME=1 (set in CI, where Chrome is preinstalled), under
// which a skip is a failure. When the build itself fails, the other gates
// are not run — they could only report on a stale or missing _site/ — and
// each prints `FAIL <gate> (not run: build failed)` so the count stays ten
// and no PASS line follows the failure. Every gate is also available on its
// own as `pnpm check:<gate>`.

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const GATES = ["build", "links", "html", "pages", "contrast", "parity", "feeds", "content", "lighthouse", "layout"];
// scripts/lib/chrome.mjs: the exit code of a Chrome-backed gate that found no browser.
const SKIP_EXIT_CODE = 3;
const verbose = process.env.CHECK_VERBOSE === "1";
const requireChrome = process.env.CHECK_REQUIRE_CHROME === "1";

/** Run one gate; returns "pass", "fail" or "skip". */
function run(gate) {
  const args = gate === "build" ? ["-s", "run", "build"] : ["-s", "run", `check:${gate}`];
  const result = spawnSync("pnpm", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_QUIET: verbose ? "0" : "1" },
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const outcome = result.status === 0 ? "pass" : result.status === SKIP_EXIT_CODE && !requireChrome ? "skip" : "fail";
  if (outcome !== "pass" || verbose) {
    for (const line of output.split("\n")) console.log(`  ${line}`);
  }
  if (outcome === "skip") console.log(`SKIP ${gate} (run pnpm check:${gate})`);
  else console.log(`${outcome === "pass" ? "PASS" : "FAIL"} ${gate}`);
  return outcome;
}

let failed = 0;
for (const [index, gate] of GATES.entries()) {
  if (run(gate) !== "fail") continue;
  failed += 1;
  if (gate !== "build") continue;
  // Nothing to prove without a build: name the rest as not run and stop.
  for (const rest of GATES.slice(index + 1)) console.log(`FAIL ${rest} (not run: build failed)`);
  break;
}
process.exit(failed === 0 ? 0 : 1);
