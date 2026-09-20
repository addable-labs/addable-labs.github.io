// Headless Chrome for the two Chrome-backed gates (redesign REQ-021, REQ-024;
// plan D-08, D-14): discovery, launch and the shared skip behaviour.
//
// Discovery: an explicit CHROME_PATH wins and must exist (a wrong path is
// "no Chrome", never a fallback to a search), otherwise chrome-launcher's
// default search of the installed browsers. chrome-launcher is lighthouse's
// own dependency, resolved through lighthouse so the project adds no
// devDependency for it; it never downloads a browser.
//
// Skip: when nothing is found the gate prints an explicit SKIP line and exits
// with code 3, which scripts/check/run.mjs reports as SKIP — never PASS.
// CHECK_REQUIRE_CHROME=1 (CI, where Chrome is preinstalled) turns that skip
// into a failure so the gate can never pass silently.

import { accessSync, constants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/** Exit code of a gate that found no Chrome (the runner prints SKIP). */
export const SKIP_EXIT_CODE = 3;

/** The Chrome flags every gate launches with: headless, no first-run UI. */
export const CHROME_FLAGS = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-extensions"];

const requireFromLighthouse = createRequire(createRequire(import.meta.url).resolve("lighthouse"));

/** chrome-launcher, loaded lazily from lighthouse's dependency tree. */
export async function loadChromeLauncher() {
  return import(requireFromLighthouse.resolve("chrome-launcher"));
}

function isExecutable(file) {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The Chrome executable to use, or null when none is found.
 * CHROME_PATH, when set, is the only candidate.
 */
export async function findChrome(env = process.env) {
  const explicit = env.CHROME_PATH;
  if (explicit !== undefined && explicit !== "") return isExecutable(explicit) ? explicit : null;
  try {
    const { Launcher } = await loadChromeLauncher();
    return Launcher.getFirstInstallation() ?? null;
  } catch {
    return null;
  }
}

/** The SKIP message a gate prints when no Chrome is found. */
export function skipMessage(gate) {
  return `SKIP ${gate}: no Chrome found (run pnpm check:${gate} after installing Chrome or set CHROME_PATH)`;
}

/**
 * Print the skip line and exit: code 3, or 1 under CHECK_REQUIRE_CHROME=1.
 * @param {string} gate
 */
export function skip(gate, env = process.env) {
  if (env.CHECK_REQUIRE_CHROME === "1") {
    console.log(`${skipMessage(gate)}`);
    console.log(`FAIL ${gate}: CHECK_REQUIRE_CHROME=1 and no Chrome was found`);
    process.exit(1);
  }
  console.log(skipMessage(gate));
  process.exit(SKIP_EXIT_CODE);
}

/**
 * Launch headless Chrome with a temporary profile. Resolves to
 * { port, pid, kill() }; kill() stops Chrome and removes the profile.
 * @param {{ chromePath: string }} options
 */
export async function launchChrome({ chromePath }) {
  const { launch } = await loadChromeLauncher();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "addable-chrome-"));
  const chrome = await launch({ chromePath, chromeFlags: CHROME_FLAGS, userDataDir, logLevel: "silent" });
  let killed = false;
  const kill = async () => {
    if (killed) return;
    killed = true;
    try {
      await chrome.kill();
    } finally {
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    }
  };
  return { port: chrome.port, pid: chrome.pid, kill };
}

/**
 * Run `fn` against a launched Chrome and a started static server, always
 * killing Chrome (by its own pid, never pkill) and closing the server — on
 * success, on failure and on SIGINT/SIGTERM.
 * @param {string} gate — for the skip line
 * @param {string} outDir — the built site to serve
 * @param {(context: { baseUrl: string, port: number }) => Promise<number>} fn — resolves to the exit code
 */
export async function withChrome(gate, outDir, fn) {
  const chromePath = await findChrome();
  if (chromePath === null) skip(gate);
  const { start } = await import("./static-server.mjs");
  const server = await start(outDir);
  let chrome = null;
  const cleanup = async () => {
    if (chrome) await chrome.kill();
    await server.close();
  };
  const onSignal = (signal) => {
    cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    chrome = await launchChrome({ chromePath });
    return await fn({ baseUrl: server.url, port: chrome.port, chromePath });
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await cleanup();
  }
}
