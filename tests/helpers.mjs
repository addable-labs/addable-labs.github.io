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
import { pathToFileURL } from "node:url";
import { siteNow } from "../scripts/lib/frontmatter.mjs";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
export const SRC = path.join(ROOT, "src");
export const FIXTURES = path.join(ROOT, "tests", "fixtures");

/**
 * The one moment every build, gate and check of this test file takes for now
 * (si-nka4). node --test runs each test file in a process of its own, which
 * loads this module once, so a file pins one instant: the one SITE_NOW names
 * when the suite runs with it, and the moment the file starts otherwise. It
 * is set in this process's own environment, which every build and gate
 * started below inherits and which `isScheduled` reads in the test process
 * itself, so the builds a test compares, the gates it runs on them and the
 * dates it works out for itself all agree on the day, even when the file runs
 * across 00:00 UTC. A case that means a moment of its own passes SITE_NOW.
 */
process.env.SITE_NOW ||= new Date().toISOString();
export const NOW = siteNow();

/** YYYY-MM-DD, `offset` days from the day of `NOW` in UTC — the unit the collections compare. */
export function utcDate(offset) {
  return new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate() + offset)).toISOString().slice(0, 10);
}

/**
 * The environment that starts a process's clock at `instant` (an ISO 8601
 * string) and lets it run on from there: tests/fixtures/clock.mjs, preloaded.
 * With it a case builds the site, or runs a gate, as a machine would at a
 * moment it chooses — just before 00:00 UTC, or just after.
 */
export function clockAt(instant) {
  const preload = `--import=${pathToFileURL(path.join(FIXTURES, "clock.mjs")).href}`;
  return { NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(" "), TEST_CLOCK: instant };
}

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
 *
 * SITE_ENV is cleared first, so every build here is a development build —
 * drafts present and listed — whatever the environment the suite runs in (CI
 * sets SITE_ENV=production for the job). A case that wants the production
 * build asks for it: `buildSite(out, { SITE_ENV: "production" })`. SITE_NOW
 * is this file's `NOW` unless the case passes its own.
 */
export function buildSite(outDir, env = {}, cwd = ROOT) {
  const args = [path.join(ROOT, "node_modules", "@11ty", "eleventy", "cmd.cjs"), "--quiet", `--output=${outDir}`];
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, SITE_ENV: "", ...env },
  });
  if (result.status !== 0) {
    throw new Error(`eleventy build failed:\n${result.stdout}\n${result.stderr}`);
  }
  return outDir;
}

/**
 * Run one gate script against `out` and `src`; returns { status, output }.
 * SITE_ENV is cleared for the same reason as in `buildSite`: a gate must be
 * told what kind of build it is looking at, and these cases build development
 * sites unless they say otherwise. CHECK_REQUIRE_CHROME is cleared too, because
 * CI sets it to 1 for the whole job: a case for a Chrome-backed gate states
 * whether Chrome is required, so the suite behaves in CI as it does locally.
 * SITE_NOW is this file's `NOW`, as in `buildSite`, unless the case passes
 * its own.
 */
export function runGate(gate, out, src = SRC, env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", `${gate}.mjs`), out, src], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, SITE_ENV: "", CHECK_REQUIRE_CHROME: "", CHECK_OFFLINE: "1", ...env },
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
