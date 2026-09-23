// A clock for the process this module is preloaded into (`clockAt` in
// tests/helpers.mjs, si-nka4): `new Date()`, `Date()` and `Date.now()` start
// at the instant TEST_CLOCK names and run on from there, so a case can build
// the site, or run a gate, as a machine would a moment before 00:00 UTC or a
// moment after it. A Date made of a value is left alone, and so is everything
// else about Date.

const RealDate = Date;
const offset = RealDate.parse(process.env.TEST_CLOCK) - RealDate.now();
if (Number.isNaN(offset)) throw new Error(`TEST_CLOCK must be an ISO 8601 instant, got ${JSON.stringify(process.env.TEST_CLOCK)}`);
const now = () => RealDate.now() + offset;

globalThis.Date = new Proxy(RealDate, {
  construct: (target, args, newTarget) => Reflect.construct(target, args.length > 0 ? args : [now()], newTarget),
  apply: () => new RealDate(now()).toString(),
  get: (target, key, receiver) => (key === "now" ? now : Reflect.get(target, key, receiver)),
});
