// Shared helpers for the gate tests (node:test, no network, no browser).
//
// Positive cases run each gate against a fresh build of the real site written
// to a temporary output directory. Negative cases use the committed fixtures
// under tests/fixtures/ or a modified temporary copy of the real build. Only
// the aggregator suite (check.test.mjs) runs scripts/check/run.mjs, whose
// first gate is `pnpm build` into the real _site/.

import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
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

/**
 * Build the site into `outDir` with Eleventy (quiet). Throws on failure.
 * `cwd` builds a copy of the project (see `copyProject`) instead of the
 * repository itself — used by cases that need an article the repository does
 * not carry. Eleventy reads the config, the input directory and the
 * collections' globs relative to the working directory, so a copy is built
 * from its own directory rather than with `--input`.
 */
export function buildSite(outDir, env = {}, cwd = ROOT) {
  const args = [path.join(ROOT, "node_modules", "@11ty", "eleventy", "cmd.cjs"), "--quiet", `--output=${outDir}`];
  const result = spawnSync(process.execPath, args, {
    cwd,
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

/**
 * Copy into `dir` everything a build reads — the Eleventy config, the source
 * tree and the library the config imports — and link the repository's
 * node_modules beside it, so `buildSite(out, {}, dir)` builds that copy
 * exactly as the repository builds itself. Cases that need a source tree the
 * repository does not carry edit the copy and build it.
 */
export async function copyProject(dir) {
  for (const entry of ["eleventy.config.js", "package.json", "src", "scripts"]) {
    await cp(path.join(ROOT, entry), path.join(dir, entry), { recursive: true });
  }
  await symlink(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  return dir;
}
