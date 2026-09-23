// A clock for the process this module is preloaded into (`clockAt` in
// tests/helpers.mjs, si-nka4): `new Date()`, `Date()` and `Date.now()` read
// the instant TEST_CLOCK names, and go on reading it however long the process
// runs. With it a case builds the site, or runs a gate, as a machine would a
// moment before 00:00 UTC or a moment after it, and the build or the gate is
// still on that side of midnight when it asks the day, however slow the
// machine (si-0xjb): a clock that ran on from that instant had passed
// midnight by then on the CI runner, which took longer than the half second a
// case leaves it. A Date made of a value is left alone, and so is everything
// else about Date; timers do not read it.

const RealDate = Date;
const instant = RealDate.parse(process.env.TEST_CLOCK);
if (Number.isNaN(instant)) throw new Error(`TEST_CLOCK must be an ISO 8601 instant, got ${JSON.stringify(process.env.TEST_CLOCK)}`);
const now = () => instant;

globalThis.Date = new Proxy(RealDate, {
  construct: (target, args, newTarget) => Reflect.construct(target, args.length > 0 ? args : [instant], newTarget),
  apply: () => new RealDate(instant).toString(),
  get: (target, key, receiver) => (key === "now" ? now : Reflect.get(target, key, receiver)),
});
