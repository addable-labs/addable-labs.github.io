// Headless Chrome for the two Chrome-backed gates (redesign REQ-021, REQ-024;
// plan D-08, D-14): discovery, launch, the shared skip behaviour and the
// measure that survives a lost Chrome (si-828d).
//
// Discovery: an explicit CHROME_PATH wins and must exist (a wrong path is
// "no Chrome", never a fallback to a search), otherwise chrome-launcher's
// default search of the installed browsers. chrome-launcher is a pinned
// devDependency, used to find and launch the installed Chrome; it never
// downloads a browser.
//
// Skip: when nothing is found the gate prints an explicit SKIP line and exits
// with code 3, which scripts/check/run.mjs reports as SKIP — never PASS.
// CHECK_REQUIRE_CHROME=1 (CI, where Chrome is preinstalled) turns that skip
// into a failure so the gate can never pass silently.
//
// Lost Chrome: a gate measures every page through `measure`, which launches
// Chrome when there is none and, when the measure fails, measures the page
// again, once, in a new Chrome; a second failure fails the gate with one
// line naming the page and the cause, and nothing after it is measured. On
// CI run 35903450397 (2026-09-23) a Chrome never opened its DevTools port:
// chrome-launcher gave up after 50 polls (25 s) with a bare "connect
// ECONNREFUSED 127.0.0.1:42401", which passed through withChrome's
// try/finally and the gate's top-level await, and Node printed it as a crash.

import diagnosticsChannel from "node:diagnostics_channel";
import { accessSync, constants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { killAll, launch, Launcher } from "chrome-launcher";

/** Exit code of a gate that found no Chrome (the runner prints SKIP). */
export const SKIP_EXIT_CODE = 3;

/** The Chrome flags every gate launches with: headless, no first-run UI. */
export const CHROME_FLAGS = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-extensions"];

/**
 * The diagnostics channel on which `measure` announces each try as it starts:
 * { gate, label, attempt, pid, profile }, the last two those of the Chrome it
 * runs in. Nothing listens in a gate run; the kill test preloads
 * tests/fixtures/kill-chrome.mjs, which kills that Chrome mid-measure.
 */
export const MEASURE_CHANNEL = "addable:chrome:measure";

/**
 * How long a failed try waits for Chrome's process to end, so that the end
 * is named as the cause rather than the protocol error it caused.
 */
const EXIT_WAIT_MS = 1000;

function isExecutable(file) {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** The first line of an error's message (a protocol error can carry more). */
function firstLine(error) {
  return String(error?.message ?? error).split("\n")[0];
}

/**
 * The Chrome executable to use, or null when none is found.
 * CHROME_PATH, when set, is the only candidate.
 */
export async function findChrome(env = process.env) {
  const explicit = env.CHROME_PATH;
  if (explicit !== undefined && explicit !== "") return isExecutable(explicit) ? explicit : null;
  try {
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
 * { port, pid, profile, exited, kill() }: `exited` resolves to how Chrome's
 * process ended ("on SIGKILL", "with code 1") once it has, and kill() stops
 * Chrome and removes the profile. A Chrome that never opens its DevTools
 * port is killed, its profile removed, and the launch rejects with "Chrome
 * did not start: <cause>". The two polling options are chrome-launcher's
 * (50 polls, 500 ms apart, by default).
 * @param {{ chromePath: string, maxConnectionRetries?: number, connectionPollInterval?: number }} options
 */
export async function launchChrome({ chromePath, maxConnectionRetries, connectionPollInterval }) {
  const profile = await mkdtemp(path.join(os.tmpdir(), "addable-chrome-"));
  const removeProfile = () => rm(profile, { recursive: true, force: true }).catch(() => {});
  let chrome;
  try {
    chrome = await launch({ chromePath, chromeFlags: CHROME_FLAGS, userDataDir: profile, logLevel: "silent", maxConnectionRetries, connectionPollInterval });
  } catch (error) {
    // chrome-launcher leaves the Chrome it spawned running when the port never
    // opens. killAll() stops it: it is the only Chrome this process launched
    // and has not killed, as withChrome kills one before launching the next.
    killAll();
    await removeProfile();
    throw new Error(`Chrome did not start: ${firstLine(error)}`);
  }
  const exited = new Promise((resolve) => {
    const how = (code, signal) => (signal ? `on ${signal}` : `with code ${code}`);
    const child = chrome.process;
    if (child.exitCode !== null || child.signalCode !== null) resolve(how(child.exitCode, child.signalCode));
    else child.once("exit", (code, signal) => resolve(how(code, signal)));
  });
  let killed = false;
  const kill = async () => {
    if (killed) return;
    killed = true;
    try {
      await chrome.kill();
    } finally {
      await removeProfile();
    }
  };
  return { port: chrome.port, pid: chrome.pid, profile, exited, kill };
}

/**
 * A page whose measure failed in two Chromes: `measure` throws it, and
 * withChrome reports it as the gate's failure.
 */
class NotMeasured extends Error {
  constructor(label, reason) {
    super(`${label} not measured: ${reason}`);
    this.label = label;
    this.reason = reason;
  }
}

/**
 * Serve the built site and run `fn` with its base URL and `measure`, always
 * killing Chrome (by its own pid, never pkill) and closing the server — on
 * success, on failure and on SIGINT/SIGTERM.
 *
 * `measure(label, run)` resolves to what `run(chrome)` resolves to, where
 * `chrome` ({ port, pid, … }) is the Chrome the page is measured in: launched
 * when there is none, and the same object until a failed try replaces it. A
 * try fails when `run` rejects, when Chrome's process ends under it, or when
 * an error is left unhandled while it runs (see onStray); a Chrome that does
 * not start fails it too. Chrome is then killed, a line says why, and the
 * page is measured again, once, in a new Chrome. When that try fails as
 * well, withChrome prints one FAIL line naming the page and the cause, then
 * `FAIL <gate> (<label> not measured)`, and resolves to 1 without measuring
 * anything more, so a page that was not measured never passes or skips.
 * @param {string} gate — for the skip and failure lines
 * @param {string} outDir — the built site to serve
 * @param {(context: { baseUrl: string, measure: (label: string, run: (chrome: { port: number, pid: number }) => Promise<any>) => Promise<any> }) => Promise<number>} fn — resolves to the exit code
 * @param {{ log?: (line: string) => void }} [options] — where the lines about a
 *   page measured again or not measured go; console.log by default
 */
export async function withChrome(gate, outDir, fn, { log = console.log } = {}) {
  const chromePath = await findChrome();
  if (chromePath === null) skip(gate);
  const { start } = await import("./static-server.mjs");
  const server = await start(outDir);
  const tries = diagnosticsChannel.channel(MEASURE_CHANNEL);
  // The Chrome in use, as a promise, so that dropping it while it is still
  // launching waits for the launch and kills what it launched.
  let chrome = null;
  let closing = false;
  // failTry rejects the try in flight; abandoned is set once a try has failed
  // and its Chrome was killed, which may leave the try's run going on.
  let failTry = null;
  let abandoned = false;
  const dropChrome = async () => {
    const dropped = chrome;
    chrome = null;
    await (await dropped?.catch(() => null))?.kill();
  };
  const cleanup = async () => {
    closing = true;
    await dropChrome();
    await server.close();
  };
  const onSignal = (signal) => {
    cleanup().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  // Node crashes the gate on an error nobody handles. When Chrome dies under a
  // Lighthouse run, the run leaves one (a Runtime.evaluate on the closed
  // session), and later wakes from its 45 s load wait to fail on the dead
  // connection. Until a Chrome has been abandoned, such an error fails the try
  // in flight; after, it is taken for the abandoned run's and dropped, like
  // one that arrives between tries.
  const onStray = (error) => {
    if (!abandoned) failTry?.(error);
  };

  /**
   * One try: rejects when `run` rejects, when Chrome's process ends under
   * it, or on a stray error.
   */
  const attempt = (label, number, run) =>
    new Promise((resolve, reject) => {
      failTry = reject;
      (async () => {
        if (closing) throw new Error(`the ${gate} gate is stopping`);
        chrome ??= launchChrome({ chromePath });
        const launched = await chrome;
        launched.exited.then((how) => reject(new Error(`Chrome exited ${how}`)));
        tries.publish({ gate, label, attempt: number, pid: launched.pid, profile: launched.profile });
        return run(launched);
      })().then(resolve, reject);
    }).finally(() => {
      failTry = null;
    });

  /**
   * After a failed try: kill its Chrome and say why the try failed, naming
   * Chrome's end when it ended.
   */
  const giveUp = async (error) => {
    // Chrome's exit can reach Node a moment after the protocol error it caused.
    const launched = await chrome?.catch(() => null);
    const how = launched && (await Promise.race([launched.exited, delay(EXIT_WAIT_MS)]));
    abandoned = true;
    await dropChrome();
    return how ? `Chrome exited ${how}` : firstLine(error);
  };

  const measure = async (label, run) => {
    try {
      return await attempt(label, 1, run);
    } catch (error) {
      log(`${gate} ${label}: not measured (${await giveUp(error)}), measuring it again in a new Chrome`);
    }
    try {
      return await attempt(label, 2, run);
    } catch (error) {
      throw new NotMeasured(label, await giveUp(error));
    }
  };

  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  process.on("uncaughtException", onStray);
  process.on("unhandledRejection", onStray);
  try {
    return await fn({ baseUrl: server.url, measure });
  } catch (error) {
    if (!(error instanceof NotMeasured)) throw error;
    log(`${gate} ${error.label}: FAIL — not measured in a new Chrome either (${error.reason})`);
    console.log(`FAIL ${gate} (${error.label} not measured)`);
    return 1;
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    try {
      await cleanup();
    } finally {
      process.off("uncaughtException", onStray);
      process.off("unhandledRejection", onStray);
    }
  }
}
