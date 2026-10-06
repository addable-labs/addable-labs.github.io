#!/usr/bin/env node
// `pnpm sources:check [--out <file>] [--json <file>] [--no-article-check] [file ...]`
// (si-1q9z): checks every entry of the articles' source lists — by default
// every docs/sources/*.yaml — against the live page, and reports ok, moved,
// quote-missing or unreachable for each. Not a gate: no check: entry, not in
// scripts/check/run.mjs, not in CI, since it needs the network and a vendor's
// page changes without any commit here. A factory agent runs it once a month.
// The format is scripts/lib/sources.mjs, the check and the report
// scripts/lib/source-check.mjs. Exit 0 when every entry is ok, 1 when one is
// not, 2 on a usage or format error (and then nothing is fetched) — and 2 too
// when the check itself fails, which must never read as an entry's result.

import process from "node:process";
import { main } from "./lib/source-check.mjs";

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`sources:check: the check failed: ${error?.stack ?? error}`);
  process.exitCode = 2;
}
