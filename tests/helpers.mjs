// Shared helpers for the gate tests (node:test, no network; no browser except
// in tests/chrome.test.mjs, which kills a real Chrome under the Chrome gates,
// and tests/games.test.mjs, which plays the Gaimer article's games in one).
//
// Positive cases run each gate against a fresh build of the real site written
// to a temporary output directory. Negative cases use the committed fixtures
// under tests/fixtures/ or a modified temporary copy of the real build. Only
// the aggregator suite (check.test.mjs) runs scripts/check/run.mjs, whose
// first gate is `pnpm build` into the real _site/.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cp, mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { crc32, deflateSync } from "node:zlib";
import { siteNow } from "../scripts/lib/frontmatter.mjs";
import { MEDIA_DIR } from "../scripts/lib/games.mjs";
import { WEBP_WIDTHS, webpName } from "../scripts/lib/images.mjs";

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
 * The environment that stops a process's clock at `instant` (an ISO 8601
 * string): tests/fixtures/clock.mjs, preloaded. With it a case builds the
 * site, or runs a gate, as a machine would at a moment it chooses — just
 * before 00:00 UTC, or just after — and the process reads that moment however
 * long it takes to ask.
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
 * Run one gate script against `out` and `src`; returns { status, output,
 * stdout, stderr }, where `output` is stdout followed by stderr.
 * SITE_ENV is cleared for the same reason as in `buildSite`: a gate must be
 * told what kind of build it is looking at, and these cases build development
 * sites unless they say otherwise. CHECK_REQUIRE_CHROME is cleared too, because
 * CI sets it to 1 for the whole job: a case for a Chrome-backed gate states
 * whether Chrome is required, so the suite behaves in CI as it does locally.
 * GITHUB_STEP_SUMMARY is cleared as well, because GitHub sets it for the step
 * that runs the tests and the Lighthouse gate appends its page lines to the
 * file it names: a case's staged lines (a page killed twice) would show on
 * the summary page of every green run, the one place a real relaunch in CI
 * shows.
 * SITE_NOW is this file's `NOW`, as in `buildSite`, unless the case passes
 * its own.
 */
export function runGate(gate, out, src = SRC, env = {}) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "check", `${gate}.mjs`), out, src], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, SITE_ENV: "", CHECK_REQUIRE_CHROME: "", GITHUB_STEP_SUMMARY: "", CHECK_OFFLINE: "1", ...env },
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}`, stdout: result.stdout, stderr: result.stderr };
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

/**
 * The image lines of the front matter of an article a case writes (si-awlu):
 * every article names a PNG in its media directory and describes it. Give
 * the article the files too, with `writeArticleImage`.
 */
export const IMAGE_FRONT_MATTER = ["image: cover.png", "imageAlt: A picture of the article."];

/**
 * Give the article `slug` of a project copy the files `IMAGE_FRONT_MATTER`
 * names: a real article's PNG and its WebP copies, copied into
 * src/media/<slug>/. The build fails on an article whose image is missing.
 */
export async function writeArticleImage(project, slug) {
  const from = path.join(SRC, MEDIA_DIR, "how-this-site-was-built-by-agents");
  const to = path.join(project, "src", MEDIA_DIR, slug);
  await mkdir(to, { recursive: true });
  for (const file of ["cover.png", ...WEBP_WIDTHS.map((width) => webpName("cover.png", width))]) await cp(path.join(from, file), path.join(to, file));
}

/**
 * A real PNG of `width` × `height` px in one grey, or in noise, which does
 * not compress: 1200 × 630 px of it is over 700 KB. The image checks read
 * only a PNG's header and its length (scripts/lib/images.mjs), but a file a
 * case writes for them is a real PNG.
 */
export function makePng(width, height, { noise = false } = {}) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits a sample, greyscale
  // Each row: filter type 0, then the row's samples.
  const rows = Buffer.concat(Array.from({ length: height }, () => Buffer.concat([Buffer.alloc(1), noise ? randomBytes(width) : Buffer.alloc(width)])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
