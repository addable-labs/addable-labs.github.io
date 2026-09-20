#!/usr/bin/env node
// `pnpm check`: the one command that proves the built site (REQ-021, AC-02).
//
// Runs `pnpm build` as the first gate, then every gate script against _site/
// as a child process, prints exactly one `PASS <gate>` or `FAIL <gate>` line
// per gate (a failing gate's output — the offending paths or keys — is printed
// before its FAIL line; set CHECK_VERBOSE=1 to see passing output too), and
// exits non-zero if any gate fails. Every gate is also available on its own
// as `pnpm check:<gate>`.

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const GATES = ["build", "links", "html", "pages", "contrast", "parity", "feeds", "content"];
const verbose = process.env.CHECK_VERBOSE === "1";

function run(gate) {
  const args = gate === "build" ? ["-s", "run", "build"] : ["-s", "run", `check:${gate}`];
  const result = spawnSync("pnpm", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_QUIET: verbose ? "0" : "1" },
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const passed = result.status === 0;
  if (!passed || verbose) {
    for (const line of output.split("\n")) console.log(`  ${line}`);
  }
  console.log(`${passed ? "PASS" : "FAIL"} ${gate}`);
  return passed;
}

let failed = 0;
for (const gate of GATES) {
  if (!run(gate)) failed += 1;
}
process.exit(failed === 0 ? 0 : 1);
