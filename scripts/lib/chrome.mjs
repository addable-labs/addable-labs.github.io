// Headless Chrome for the two Chrome-backed gates (redesign REQ-021,
// REQ-024): discovery, launch, the shared skip behaviour and the measure that
// survives a lost Chrome (si-828d).
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
//
// Stopped by a signal: SIGINT or SIGTERM stops the run where it is, with
// nothing measured again and nothing more printed, kills Chrome, removes its
// profile and exits 130 or 143 (si-shkd). Before, chrome-launcher's own SIGINT
// handler exited at once and left the profile in the temp dir, and on SIGTERM
// the measure-again that failed on the killed Chrome printed a FAIL line and
// the gate exited 1 before the profile was removed.

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
 * Chrome and removes the profile, every call resolving once that is done. A
 * Chrome that never opens its DevTools port is killed, its profile removed,
 * and the launch rejects with "Chrome did not start: <cause>". The two
 * polling options are chrome-launcher's (50 polls, 500 ms apart, by default).
 * @param {{ chromePath: string, maxConnectionRetries?: number, connectionPollInterval?: number }} options
 */
export async function launchChrome({ chromePath, maxConnectionRetries, connectionPollInterval }) {
  const profile = await mkdtemp(path.join(os.tmpdir(), "addable-chrome-"));
  // Retried, as chrome-launcher removes the profiles it makes: a file that
  // appears during the removal, as from a Chrome still ending, fails it once.
  const removeProfile = () => rm(profile, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  let chrome;
  try {
    // chrome-launcher's own SIGINT handler kills Chrome and exits at once,
    // leaving the profile behind: withChrome stops the run on SIGINT itself.
    chrome = await launch({ chromePath, chromeFlags: CHROME_FLAGS, userDataDir: profile, logLevel: "silent", handleSIGINT: false, maxConnectionRetries, connectionPollInterval });
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
  // One kill, however often it is asked for: a second call waits for the
  // profile's removal the first began.
  let killing = null;
  const kill = () =>
    (killing ??= (async () => {
      try {
        chrome.kill();
      } finally {
        await removeProfile();
      }
    })());
  return { port: chrome.port, pid: chrome.pid, profile, exited, kill };
}

/**
 * The line `measure` prints for a page whose try failed, before it measures
 * the page again in a new Chrome. The runner (scripts/check/run.mjs) hides a
 * passing gate's lines, so it looks for this one in the gate's output and
 * names the page on the gate's PASS line (si-acma).
 */
export function measuredAgainLine(gate, label, cause) {
  return `${gate} ${label}: not measured (${cause}), measuring it again in a new Chrome`;
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
 *
 * A SIGINT or SIGTERM stops the run where it is: no measure settles after it
 * and withChrome never resolves, so the gate measures and prints nothing
 * more. Every Chrome launched is killed and its profile removed, the server
 * is closed, and the process exits 130 (SIGINT) or 143 (SIGTERM).
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
  // launching waits for the launch and kills what it launched. `launches`
  // holds every Chrome launched, so that the cleanup also waits for a kill a
  // failed try has begun.
  let chrome = null;
  const launches = [];
  let closing = false;
  // The signal that stops the run, once one has come.
  let stopping = null;
  // failTry rejects the try in flight; abandoned is set once a try has failed
  // and its Chrome was killed, which may leave the try's run going on.
  let failTry = null;
  let abandoned = false;
  const dropChrome = async () => {
    const dropped = chrome;
    chrome = null;
    await (await dropped?.catch(() => null))?.kill();
  };
  // One cleanup, however often it is asked for: every Chrome killed and its
  // profile removed, then the server closed.
  let cleaned = null;
  const cleanup = () =>
    (cleaned ??= (async () => {
      closing = true;
      chrome = null;
      await Promise.all(launches.map(async (launch) => (await launch.catch(() => null))?.kill()));
      await server.close();
    })());
  // Once a signal has come, what a measure and withChrome itself come to: a
  // promise that never settles, so the gate goes no further and the signal's
  // handler exits when the cleanup is done.
  const halt = new Promise(() => {});
  const unlessStopped = (promise) =>
    promise.then(
      (value) => (stopping ? halt : value),
      (error) => {
        if (stopping) return halt;
        throw error;
      },
    );
  // A signal after the first changes nothing: pnpm passes Ctrl-C on to the
  // script it runs, which so gets SIGINT twice.
  const onSignal = (signal) => {
    if (stopping) return;
    stopping = signal;
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
        if (chrome === null) {
          chrome = launchChrome({ chromePath });
          launches.push(chrome);
        }
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

  // Each step goes on only while no signal has come: a try that fails because
  // the signal's cleanup killed its Chrome is not measured again or reported.
  const measure = async (label, run) => {
    try {
      return await unlessStopped(attempt(label, 1, run));
    } catch (error) {
      log(measuredAgainLine(gate, label, await unlessStopped(giveUp(error))));
    }
    try {
      return await unlessStopped(attempt(label, 2, run));
    } catch (error) {
      throw new NotMeasured(label, await unlessStopped(giveUp(error)));
    }
  };

  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  process.on("uncaughtException", onStray);
  process.on("unhandledRejection", onStray);
  try {
    return await unlessStopped(fn({ baseUrl: server.url, measure }));
  } catch (error) {
    if (!(error instanceof NotMeasured)) throw error;
    log(`${gate} ${error.label}: FAIL — not measured in a new Chrome either (${error.reason})`);
    console.log(`FAIL ${gate} (${error.label} not measured)`);
    return 1;
  } finally {
    try {
      await cleanup();
      // A signal during the cleanup: its handler exits once the cleanup is done.
      if (stopping) await halt;
    } finally {
      // Not before: Chrome runs in a process group of its own, so a signal
      // with no handler would end the gate and leave Chrome running.
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      process.off("uncaughtException", onStray);
      process.off("unhandledRejection", onStray);
    }
  }
}
