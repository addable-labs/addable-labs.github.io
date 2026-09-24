// A clock for the process this module is preloaded into (`clockAt` in
// tests/helpers.mjs, si-nka4): `new Date()`, `Date()` and `Date.now()` read
// the instant TEST_CLOCK names, and go on reading it however long the process
// runs. With it a case builds the site, or runs a gate, as a machine would a
// moment before 00:00 UTC or a moment after it, and the build or the gate is
// still on that side of midnight when it asks the day, however slow the
// machine (si-0xjb): a clock that ran on from that instant had passed
// midnight by then on the CI runner, which took longer than the half second a
// case leaves it. A Date made of a value is left alone, and so is everything
// else about Date; timers do not read it. Code that waits for the clock to
// move on waits for ever, though: `eleventy --serve` on this clock never
// rebuilds, because its file watcher (chokidar's awaitWriteFinish) waits by
// the clock for a changed file to stop changing.
//
// The clock can also pass midnight while the process runs (si-vv7h): with
// TEST_CLOCK_THEN set, the first TEST_CLOCK_READS reads take TEST_CLOCK and
// every read after them the instant TEST_CLOCK_THEN names. It counts reads,
// not time, so a slow machine moves it at the same point of a build as a
// fast one. TEST_CLOCK_LOG, when set, names a file to which each read
// appends the instant it took, one line each, so a case can count a build's
// reads and see which side of midnight each one fell on.

import { appendFileSync } from "node:fs";

const RealDate = Date;

function instantOf(name) {
  const instant = RealDate.parse(process.env[name]);
  if (Number.isNaN(instant)) throw new Error(`${name} must be an ISO 8601 instant, got ${JSON.stringify(process.env[name])}`);
  return instant;
}

const first = instantOf("TEST_CLOCK");
let then = first;
let firstReads = Infinity;
if (process.env.TEST_CLOCK_THEN) {
  then = instantOf("TEST_CLOCK_THEN");
  const count = process.env.TEST_CLOCK_READS ?? "";
  if (!/^\d+$/.test(count)) throw new Error(`TEST_CLOCK_READS must be a whole number of reads, got ${JSON.stringify(count)}`);
  firstReads = Number(count);
}
const log = process.env.TEST_CLOCK_LOG;
let reads = 0;

function now() {
  const instant = reads++ < firstReads ? first : then;
  if (log) appendFileSync(log, `${new RealDate(instant).toISOString()}\n`);
  return instant;
}

globalThis.Date = new Proxy(RealDate, {
  construct: (target, args, newTarget) => Reflect.construct(target, args.length > 0 ? args : [now()], newTarget),
  apply: () => new RealDate(now()).toString(),
  get: (target, key, receiver) => (key === "now" ? now : Reflect.get(target, key, receiver)),
});
