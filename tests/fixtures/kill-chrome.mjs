// Preloaded into a Chrome gate by tests/chrome.test.mjs (si-828d): kills the
// Chrome a page is being measured in, by that Chrome's own pid, while it loads
// the page: when its request for the page reaches the gate's static server.
//
// KILL_CHROME is a JSON object from a measure's label (the page, or for the
// layout gate "<page> <width>") to how many of its tries to kill, counted from
// its first: {"/": 1} kills the first try of "/", so the gate measures the
// page again in a new Chrome; {"/sv/": 2} kills that try too, so "/sv/" is not
// measured. Each kill prints a line. KILL_CHROME_STRAY, a JSON object from a
// label to a try, leaves a rejection nobody handles as that try starts, as a
// Lighthouse run whose Chrome died does. KILL_CHROME_SIGNAL, a JSON object
// from a label to a list of signals, stops the gate mid-measure (si-shkd): it
// sends the first signal to the gate's own process while Chrome loads the
// label's page in its first try, and each next one as soon as the gate has
// taken the one before, as pnpm passes a Ctrl-C on to the script it runs,
// which so gets SIGINT twice: {"/": ["SIGINT", "SIGINT"]}. Each signal prints
// a line. KILL_CHROME_LOG names a file that gets a JSON line per try,
// { label, attempt, pid, profile, killed, at }, one per kill, { kill: pid, at },
// one per signal, { signal, at }, and one as the gate exits, { exit: code, at };
// `at` is in milliseconds since the epoch.

import diagnosticsChannel from "node:diagnostics_channel";
import { appendFileSync } from "node:fs";
import process from "node:process";
import { MEASURE_CHANNEL } from "../../scripts/lib/chrome.mjs";

const kills = JSON.parse(process.env.KILL_CHROME ?? "{}");
const strays = JSON.parse(process.env.KILL_CHROME_STRAY ?? "{}");
const signals = JSON.parse(process.env.KILL_CHROME_SIGNAL ?? "{}");
const tries = {};
// The try whose Chrome dies, or whose gate gets signals, when it requests `path`.
let armed = null;

function record(entry) {
  if (process.env.KILL_CHROME_LOG) appendFileSync(process.env.KILL_CHROME_LOG, `${JSON.stringify({ ...entry, at: Date.now() })}\n`);
}

/** Send the first of `list` to this process now, and each next one once the process has taken the one before. */
function send([signal, ...rest], when) {
  record({ signal });
  console.log(`kill-chrome: sent ${signal} to the gate ${when}`);
  if (rest.length > 0) process.once(signal, () => setImmediate(() => send(rest, `again, once it had taken ${signal}`)));
  process.kill(process.pid, signal);
}

process.on("exit", (code) => record({ exit: code }));

diagnosticsChannel.subscribe(MEASURE_CHANNEL, ({ label, attempt, pid, profile }) => {
  tries[label] = (tries[label] ?? 0) + 1;
  const killed = tries[label] <= (kills[label] ?? 0);
  const signalled = tries[label] === 1 ? (signals[label] ?? []) : [];
  record({ label, attempt, pid, profile, killed });
  // The page is the label's first part that is a path: all of a Lighthouse
  // label, "<page> <width>" in the layout gate, and "<check> <page> …" in the
  // walkthrough (pnpm walkthrough, run with this fixture by hand).
  armed = killed || signalled.length > 0 ? { label, attempt, pid, killed, signalled, path: label.split(" ").find((part) => part.startsWith("/")) } : null;
  if (strays[label] === attempt) Promise.reject(new Error(`kill-chrome: an error nobody handles, in try ${attempt} of ${label}`));
});

diagnosticsChannel.subscribe("http.server.request.start", ({ request }) => {
  if (armed === null || request.url !== armed.path) return;
  const { label, attempt, pid, killed, signalled } = armed;
  armed = null;
  if (killed) {
    process.kill(pid, "SIGKILL");
    record({ kill: pid });
    console.log(`kill-chrome: killed Chrome ${pid} while it loaded ${label} (try ${attempt})`);
  }
  if (signalled.length > 0) send(signalled, `while Chrome ${pid} loaded ${label} (try ${attempt})`);
});
