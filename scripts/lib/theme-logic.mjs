// The theme decision (REQ-007), shared by tests/theme.test.mjs and
// src/assets/js/theme.js: the inline head script must contain this function's
// exact source text (the test asserts it), so the tested logic and the
// shipped script cannot drift.
//
// Dark is the default for every first visit, whatever the OS reports: the
// only way to light is a stored "light" choice made with the toggle. There is
// deliberately no OS-preference media-query input. (Should the founder ever
// want the OS preference back, this is the one line to change, plus the
// corresponding assertions.)

/** "light" if and only if the stored choice is "light"; otherwise "dark". */
export function resolve(stored) {
  return stored === "light" ? "light" : "dark";
}
