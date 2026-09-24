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
// Lighthouse run whose Chrome died does. KILL_CHROME_LOG names a file that
// gets a JSON line per try, { label, attempt, pid, profile, killed, at }, one
// per kill, { kill: pid, at }, and one as the gate exits, { exit: code, at };
// `at` is in milliseconds since the epoch.

import diagnosticsChannel from "node:diagnostics_channel";
import { appendFileSync } from "node:fs";
import process from "node:process";
import { MEASURE_CHANNEL } from "../../scripts/lib/chrome.mjs";

const kills = JSON.parse(process.env.KILL_CHROME ?? "{}");
const strays = JSON.parse(process.env.KILL_CHROME_STRAY ?? "{}");
const tries = {};
// The try whose Chrome dies when it requests `path`.
let armed = null;

function record(entry) {
  if (process.env.KILL_CHROME_LOG) appendFileSync(process.env.KILL_CHROME_LOG, `${JSON.stringify({ ...entry, at: Date.now() })}\n`);
}

process.on("exit", (code) => record({ exit: code }));

diagnosticsChannel.subscribe(MEASURE_CHANNEL, ({ label, attempt, pid, profile }) => {
  tries[label] = (tries[label] ?? 0) + 1;
  const killed = tries[label] <= (kills[label] ?? 0);
  record({ label, attempt, pid, profile, killed });
  armed = killed ? { label, attempt, pid, path: label.split(" ")[0] } : null;
  if (strays[label] === attempt) Promise.reject(new Error(`kill-chrome: an error nobody handles, in try ${attempt} of ${label}`));
});

diagnosticsChannel.subscribe("http.server.request.start", ({ request }) => {
  if (armed === null || request.url !== armed.path) return;
  const { label, attempt, pid } = armed;
  armed = null;
  process.kill(pid, "SIGKILL");
  record({ kill: pid });
  console.log(`kill-chrome: killed Chrome ${pid} while it loaded ${label} (try ${attempt})`);
});
