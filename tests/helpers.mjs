// Shared helpers for the gate tests (node:test, no network, no browser).
//
// Positive cases run each gate against a fresh build of the real site written
// to a temporary output directory. Negative cases use the committed fixtures
// under tests/fixtures/ or a modified temporary copy of the real build. Only
// the aggregator suite (check.test.mjs) runs scripts/check/run.mjs, whose
// first gate is `pnpm build` into the real _site/.

import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
export const SRC = path.join(ROOT, "src");
export const FIXTURES = path.join(ROOT, "tests", "fixtures");

export function fixture(name, ...parts) {
  return path.join(FIXTURES, name, ...parts);
}

/** Create a temporary directory; call the returned cleanup in an `after` hook. */
export async function tempDir(prefix = "gates-") {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** Build the real site into `outDir` with Eleventy (quiet). Throws on failure. */
export function buildSite(outDir, env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "node_modules", "@11ty", "eleventy", "cmd.cjs"), "--quiet", `--output=${outDir}`], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`eleventy build failed:\n${result.stdout}\n${result.stderr}`);
  }
  return outDir;
}

/** Run one gate script against `out` and `src`; returns { status, output }. */
export function runGate(gate, out, src = SRC, env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", `${gate}.mjs`), out, src], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CHECK_OFFLINE: "1", ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** Run html-validate on a directory of built pages. */
export function runHtmlValidate(out) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "node_modules", "html-validate", "bin", "html-validate.mjs"), path.join(out, "**", "*.html")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/** Copy a directory tree. */
export async function copyDir(from, to) {
  await cp(from, to, { recursive: true });
  return to;
}
