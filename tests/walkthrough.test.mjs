import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { SKIP_EXIT_CODE } from "../scripts/lib/chrome.mjs";
import { alphaOf, CHECKS, evaluate, focusIndicator, judge, MOVING, rgbOf, ringsOf, summaryLine, SWITCH_STEPS, THEMES, where, WIDTHS } from "../scripts/lib/walkthrough-report.mjs";
import { fixture, ROOT, tempDir } from "./helpers.mjs";

// The rules of the browser walkthrough (scripts/walkthrough.mjs, si-yszh) on
// a recorded run, without Chrome: the run passes with the documented lines,
// and one failing measurement per check fails with a line naming what and
// where — a NaN or a missing value among them, which must fail, not pass
// (review finding F-01). Then the script's own exits without a built site
// and without Chrome. Regenerate the fixture from a real run with
// `WALKTHROUGH_DUMP=<file> pnpm walkthrough` and keep its measurements of /,
// /about/, /404.html and the theme switch.

let run;
before(async () => {
  run = JSON.parse(await readFile(fixture("walkthrough", "run.json"), "utf8"));
});

/** A copy of the recorded measurement whose line starts with `prefix`, changed by `change`. */
function measured(prefix, change = () => {}) {
  const original = run.measurements.find((m) => where(m) === prefix);
  assert.ok(original, `the fixture has no ${prefix} measurement`);
  const copy = structuredClone(original);
  change(copy);
  return copy;
}

/** The line of a measurement that must fail. */
function failing(m) {
  const result = judge(m, run.expected);
  assert.equal(result.ok, false, result.line);
  return result.line;
}

describe("walkthrough report: the recorded run", () => {
  it("passes and prints the documented lines", () => {
    const { dark, light } = run.expected.background;
    const result = evaluate(run.measurements, run.expected);
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
    assert.deepEqual(result.lines, [
      `first-frame /: ok (dark at the first frame under a light OS, background ${dark})`,
      `theme-switch / toggle pressed: ok (light, background ${light}; 2 buttons "Dark mode", aria-pressed true → false)`,
      `theme-switch /sv/ language switch: ok (light at the first frame, background ${light}; 2 buttons "Mörkt läge", aria-pressed false)`,
      `theme-switch / language switch back: ok (light at the first frame, background ${light}; 2 buttons "Dark mode", aria-pressed false)`,
      `theme-switch / storage cleared: ok (dark at the first frame under a light OS, background ${dark})`,
      "no-js /about/: ok (dark under a light OS, main shown with 12 .reveal at opacity 1, 2 toggles hidden; Home, About, Blog and Svenska load (200))",
      "no-js /404.html: ok (dark under a light OS, main shown with 5 .reveal at opacity 1, 2 toggles hidden; Home, About and Blog load (200))",
      "no-hscroll / 360: ok (360 px wide in a 360 px viewport)",
      "no-hscroll / 3840: ok (3840 px wide in a 3840 px viewport)",
      "focus /about/ dark: ok (16 Tab stops from the skip link, all 16 focusable elements, the 2 toggles among them; each shows outline 2px solid rgb(131, 243, 93))",
      "focus /about/ light: ok (16 Tab stops from the skip link, all 16 focusable elements, the 2 toggles among them; each shows outline 2px solid rgb(168, 70, 0))",
      "reduced-motion /about/: ok (12 .reveal in place and nothing moving, on load and at the bottom)",
    ]);
  });

  it("walks the criteria's widths, themes and steps", () => {
    assert.deepEqual(CHECKS, ["first-frame", "theme-switch", "no-js", "no-hscroll", "focus", "reduced-motion"]);
    assert.deepEqual(WIDTHS, [360, 3840]);
    assert.deepEqual(THEMES, ["dark", "light"]);
    assert.deepEqual(SWITCH_STEPS, { "toggle pressed": "light", "language switch": "light", "language switch back": "light", "storage cleared": "dark" });
  });

  it("fails a run in which a check measured nothing", () => {
    const withoutFocus = run.measurements.filter((m) => m.check !== "focus");
    const result = evaluate(withoutFocus, run.expected);
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, ["walkthrough: no focus measurement, so that check did not run"]);
    assert.equal(summaryLine(result.results, 21, 3.04), "FAIL walkthrough (focus measured nothing, on 21 pages, 3.0 s)");
    assert.equal(summaryLine([], 21, 3), "FAIL walkthrough (first-frame, theme-switch, no-js, no-hscroll, focus and reduced-motion measured nothing, on 21 pages, 3.0 s)");
  });

  it("sums a run up in one line with the run time", () => {
    const { results } = evaluate(run.measurements, run.expected);
    assert.equal(summaryLine(results, 21, 36.66), "PASS walkthrough (12 checks on 21 pages, 36.7 s)");
    const broken = [...results, judge(measured("no-hscroll / 360", (m) => (m.scrollWidth = 372)), run.expected)];
    assert.equal(summaryLine(broken, 21, 36.66), "FAIL walkthrough (1 of 13 checks failed, on 21 pages, 36.7 s)");
  });

  it("fails a page that did not load, before anything it failed to show", () => {
    assert.match(failing(measured("no-hscroll / 360", (m) => (m.status = 404))), /^no-hscroll \/ 360: FAIL — \/ answered 404, not 200$/);
    assert.match(failing(measured("first-frame /", (m) => delete m.status)), /^first-frame \/: FAIL — \/ answered nothing, not 200$/);
  });

  it("fails an unknown check", () => {
    assert.equal(failing({ check: "colour", page: "/" }), "colour /: FAIL — unknown check");
  });
});

describe("walkthrough report: first-frame (AC-31)", () => {
  it("fails a page that is light at its first frame under a light OS", () => {
    const { dark, light } = run.expected.background;
    const line = failing(measured("first-frame /", (m) => Object.assign(m.frame, { theme: "light", background: light })));
    assert.equal(line, `first-frame /: FAIL — data-theme is "light" at the first frame, not "dark"; the page background is ${light} at the first frame, not the dark ${dark}`);
  });

  it("fails a frame taken after the first paint, without the light OS or with storage", () => {
    assert.equal(failing(measured("first-frame /", (m) => (m.frame.painted = 1))), "first-frame /: FAIL — measured after the first paint (1 paint entry), not at the first frame");
    assert.equal(failing(measured("first-frame /", (m) => (m.frame.osLight = false))), "first-frame /: FAIL — the light OS setting was not in effect (prefers-color-scheme: light did not match)");
    assert.equal(failing(measured("first-frame /", (m) => (m.frame.storage = 1))), "first-frame /: FAIL — storage was not empty (1 item)");
  });

  it("fails a missing frame and a missing or NaN value instead of passing on it", () => {
    const { dark } = run.expected.background;
    assert.equal(failing(measured("first-frame /", (m) => (m.frame = null))), "first-frame /: FAIL — no first frame recorded");
    assert.equal(failing(measured("first-frame /", (m) => (m.frame.painted = NaN))), "first-frame /: FAIL — whether the page had painted was not measured");
    assert.equal(failing(measured("first-frame /", (m) => delete m.frame.storage)), "first-frame /: FAIL — storage was not measured");
    assert.equal(failing(measured("first-frame /", (m) => delete m.frame.background)), `first-frame /: FAIL — the page background is unmeasured at the first frame, not the dark ${dark}`);
    assert.equal(failing(measured("first-frame /", (m) => (m.frame.theme = null))), 'first-frame /: FAIL — no data-theme at the first frame (not "dark")');
  });
});

describe("walkthrough report: theme-switch (AC-07, AC-31)", () => {
  it("fails a choice that does not survive the language switch", () => {
    const { dark, light } = run.expected.background;
    const line = failing(measured("theme-switch /sv/ language switch", (m) => Object.assign(m.frame, { theme: "dark", background: dark })));
    assert.equal(line, `theme-switch /sv/ language switch: FAIL — data-theme is "dark" at the first frame, not "light"; the page background is ${dark} at the first frame, not the light ${light}`);
  });

  it("fails a toggle press that changes nothing", () => {
    const { dark, light } = run.expected.background;
    const line = failing(
      measured("theme-switch / toggle pressed", (m) => {
        Object.assign(m.after, { theme: "dark", background: dark });
        for (const toggle of m.after.toggles) toggle.pressed = "true";
      }),
    );
    assert.equal(line, `theme-switch / toggle pressed: FAIL — data-theme is "dark" after the press, not "light"; the page background is ${dark} after the press, not the light ${light}; after the press, toggle 1 has aria-pressed "true" in light, not "false"; after the press, toggle 2 has aria-pressed "true" in light, not "false"`);
  });

  it("fails a toggle that is not a button, has no aria-pressed or is not named in the page language", () => {
    const line = failing(
      measured("theme-switch /sv/ language switch", (m) => {
        Object.assign(m.toggles[0], { tag: "div", role: "generic" });
        m.toggles[1].name = "Dark mode";
        m.toggles[1].pressed = null;
      }),
    );
    assert.equal(line, 'theme-switch /sv/ language switch: FAIL — toggle 1 is div with role generic, not a button; toggle 2 is named "Dark mode", not "Mörkt läge" (the sv name); toggle 2 has aria-pressed null in light, not "false"');
    assert.equal(failing(measured("theme-switch /sv/ language switch", (m) => (m.toggles = []))), "theme-switch /sv/ language switch: FAIL — no toggle found ([data-theme-toggle])");
  });

  it("fails a toggle that cannot be pressed and a switch that cannot be followed, with why", () => {
    const { dark, light } = run.expected.background;
    const unpressed = measured("theme-switch / toggle pressed", (m) => {
      m.error = "Node is either not visible or not an HTMLElement";
      m.after = structuredClone(m.before);
    });
    assert.equal(
      failing(unpressed),
      `theme-switch / toggle pressed: FAIL — the toggle could not be pressed (Node is either not visible or not an HTMLElement); data-theme is "dark" after the press, not "light"; the page background is ${dark} after the press, not the light ${light}; after the press, toggle 1 has aria-pressed "true" in light, not "false"; after the press, toggle 2 has aria-pressed "true" in light, not "false"`,
    );
    const stuck = { check: "theme-switch", page: "/", step: "language switch", href: "/sv/", status: null, error: "Navigation timeout of 10000 ms exceeded" };
    assert.equal(failing(stuck), "theme-switch / language switch: FAIL — the language switch to /sv/ could not be followed (Navigation timeout of 10000 ms exceeded)");
  });

  it("fails a switch that answers 404, lands elsewhere or is missing", () => {
    assert.equal(failing(measured("theme-switch /sv/ language switch", (m) => (m.status = 404))), "theme-switch /sv/ language switch: FAIL — the language switch to /sv/ answered 404, not 200");
    assert.equal(failing(measured("theme-switch /sv/ language switch", (m) => (m.page = "/sv/about/"))), "theme-switch /sv/about/ language switch: FAIL — the language switch to /sv/ landed on /sv/about/");
    assert.equal(failing(measured("theme-switch /sv/ language switch", (m) => (m.href = null))), "theme-switch /sv/ language switch: FAIL — no language switch found (.site-header a.lang-switch)");
  });

  it("fails a switch measured under a light OS, where the OS could explain the light", () => {
    assert.equal(failing(measured("theme-switch / language switch back", (m) => (m.frame.osLight = true))), "theme-switch / language switch back: FAIL — the dark OS setting was not in effect (prefers-color-scheme: light matched)");
  });

  it("fails a site that is light again with its storage cleared", () => {
    const { dark, light } = run.expected.background;
    const line = failing(measured("theme-switch / storage cleared", (m) => Object.assign(m.frame, { theme: "light", background: light })));
    assert.equal(line, `theme-switch / storage cleared: FAIL — data-theme is "light" at the first frame, not "dark"; the page background is ${light} at the first frame, not the dark ${dark}`);
    assert.equal(failing(measured("theme-switch / storage cleared", (m) => (m.frame.storage = 1))), "theme-switch / storage cleared: FAIL — storage was not empty (1 item)");
  });

  it("fails a NaN frame value", () => {
    assert.equal(failing(measured("theme-switch /sv/ language switch", (m) => (m.frame.painted = NaN))), "theme-switch /sv/ language switch: FAIL — whether the page had painted was not measured");
  });
});

describe("walkthrough report: no-js (AC-23, AC-31)", () => {
  it("fails a page on which JavaScript ran, or not measured for it", () => {
    assert.equal(failing(measured("no-js /about/", (m) => (m.js = true))), "no-js /about/: FAIL — JavaScript ran (html.js or data-theme is set), so the page was not measured without it");
    assert.equal(failing(measured("no-js /about/", (m) => delete m.js)), "no-js /about/: FAIL — whether JavaScript ran was not measured");
  });

  it("fails a light page", () => {
    const { dark, light } = run.expected.background;
    assert.equal(failing(measured("no-js /about/", (m) => (m.background = light))), `no-js /about/: FAIL — the page background is ${light}, not the dark ${dark}`);
  });

  it("fails content held hidden by the entrance styles, a NaN opacity included", () => {
    const line = failing(
      measured("no-js /about/", (m) => {
        m.reveal[0].opacity = 0;
        m.reveal[1].opacity = NaN;
        m.reveal[2].visibility = "hidden";
      }),
    );
    assert.equal(line, 'no-js /about/: FAIL — .reveal held hidden: p.eyebrow "Addable Labs · Sweden" (opacity 0, visible), h1.reveal "About" (opacity NaN, visible) and p.lead "An AI-native software company f…" (opacity 1, hidden)');
    assert.equal(failing(measured("no-js /about/", (m) => (m.reveal = []))), "no-js /about/: FAIL — no .reveal element found");
    assert.equal(failing(measured("no-js /about/", (m) => (m.main = null))), "no-js /about/: FAIL — main shows nothing (no height or no text)");
  });

  it("fails a toggle shown and operable without JavaScript", () => {
    const line = failing(measured("no-js /about/", (m) => (m.toggles[1] = { display: "inline-flex", visibility: "visible", width: 44, height: 44, disabled: false, inert: false })));
    assert.equal(line, "no-js /about/: FAIL — toggle 2 is shown and operable, though it cannot work without JavaScript");
    assert.equal(failing(measured("no-js /about/", (m) => (m.toggles[1] = { display: "inline-flex", visibility: "visible", width: NaN, height: 44 }))), "no-js /about/: FAIL — toggle 2 is shown and operable, though it cannot work without JavaScript");
    assert.equal(judge(measured("no-js /about/", (m) => (m.toggles[1] = { display: "inline-flex", visibility: "visible", width: 44, height: 44, disabled: true, inert: false })), run.expected).ok, true, "a disabled toggle is inert");
  });

  it("fails a header link that cannot be followed, with why", () => {
    const line = failing(measured("no-js /about/", (m) => Object.assign(m.links[1], { status: null, landed: null, error: "Node is either not clickable or not an Element" })));
    assert.equal(line, 'no-js /about/: FAIL — nav "About" to /about/ could not be followed (Node is either not clickable or not an Element)');
  });

  it("fails a header link that answers 404 or lands elsewhere, and a missing language switch", () => {
    assert.equal(failing(measured("no-js /about/", (m) => (m.links[2].status = 404))), 'no-js /about/: FAIL — nav "Blog" to /blog/ answered 404, not 200');
    assert.equal(failing(measured("no-js /about/", (m) => (m.links[3].landed = "/"))), 'no-js /about/: FAIL — language switch "Svenska" to /sv/about/ landed on /');
    assert.equal(failing(measured("no-js /about/", (m) => m.links.pop())), "no-js /about/: FAIL — no language switch, though the page has a counterpart (https://addablelabs.se/sv/about/)");
    assert.equal(failing(measured("no-js /about/", (m) => (m.links = []))), "no-js /about/: FAIL — no header navigation link found; no language switch, though the page has a counterpart (https://addablelabs.se/sv/about/)");
  });
});

describe("walkthrough report: no-hscroll (AC-20)", () => {
  it("fails a page wider than the viewport, naming the widest element", () => {
    const line = failing(measured("no-hscroll / 360", (m) => Object.assign(m, { scrollWidth: 372, widest: 'pre.code "const x = 1" reaching 372 px' })));
    assert.equal(line, 'no-hscroll / 360: FAIL — 372 px wide in a 360 px viewport (widest: pre.code "const x = 1" reaching 372 px)');
  });

  it("fails a NaN or missing width instead of passing on it", () => {
    assert.equal(failing(measured("no-hscroll / 3840", (m) => (m.scrollWidth = NaN))), "no-hscroll / 3840: FAIL — not measured (scrollWidth NaN, innerWidth 3840)");
    assert.equal(failing(measured("no-hscroll / 3840", (m) => (m.scrollWidth = null))), "no-hscroll / 3840: FAIL — not measured (scrollWidth missing, innerWidth 3840)");
  });

  it("fails a viewport that is not the width asked for", () => {
    assert.equal(failing(measured("no-hscroll / 360", (m) => Object.assign(m, { scrollWidth: 800, innerWidth: 800 }))), "no-hscroll / 360: FAIL — the viewport is 800 px wide, not the 360 px asked for");
  });
});

describe("walkthrough report: focus (AC-18, AC-23)", () => {
  it("fails a walk whose first stop is not the skip link", () => {
    const line = failing(measured("focus /about/ dark", (m) => m.steps.shift()));
    assert.equal(line, 'focus /about/ dark: FAIL — the first Tab reached a.brand "addablelabs", not the skip link; not reached by Tab: a.skip-link "Skip to content"');
  });

  it("fails a focused element with no visible indicator, a NaN width or a transparent outline included", () => {
    const line = failing(
      measured("focus /about/ light", (m) => {
        m.steps[1].outline = { style: "none", width: 0, color: "rgb(168, 70, 0)" };
        m.steps[2].outline.width = NaN;
        m.steps[3].outline.color = "rgba(0, 0, 0, 0)";
      }),
    );
    // The About link's underline (aria-current) is an inset shadow with no spread: not a ring.
    assert.equal(line, 'focus /about/ light: FAIL — no visible focus indicator on a.brand "addablelabs" (outline none 0px, box-shadow none), a "Home" (outline solid NaNpx, box-shadow none) and a "About" (outline solid 2px, box-shadow rgb(131, 243, 93) 0px -2px 0px 0px inset)');
  });

  it("counts a box-shadow ring only when the element does not wear it unfocused", () => {
    const ring = "rgb(168, 70, 0) 0px 0px 0px 3px";
    const onFocus = measured("focus /about/ light", (m) => Object.assign(m.steps[1], { outline: { style: "none", width: 0, color: "rgb(0, 0, 0)" }, boxShadow: ring }));
    const result = judge(onFocus, run.expected);
    assert.equal(result.ok, true, result.line);
    assert.match(result.line, /each shows outline 2px solid rgb\(168, 70, 0\) \(15\) and box-shadow rgb\(168, 70, 0\) 0px 0px 0px 3px \(1\)\)$/);
    const always = measured("focus /about/ light", (m) => Object.assign(m.steps[1], { outline: { style: "none", width: 0, color: "rgb(0, 0, 0)" }, boxShadow: ring, unfocusedBoxShadow: ring }));
    assert.equal(failing(always), `focus /about/ light: FAIL — no visible focus indicator on a.brand "addablelabs" (outline none 0px, box-shadow ${ring})`);
  });

  it("fails a focusable element Tab never reaches", () => {
    const line = failing(measured("focus /about/ dark", (m) => m.steps.splice(6, 1)));
    assert.equal(line, 'focus /about/ dark: FAIL — not reached by Tab: button.theme-toggle "Dark mode"; Tab reached 1 of the 2 toggles');
  });

  it("fails a page whose toggle is not rendered, or that has none", () => {
    // Hidden, the header toggle drops out of the focusable elements: the walk
    // reaches everything else, and only the page's own count gives it away.
    const hidden = measured("focus /about/ dark", (m) => {
      m.focusables.splice(6, 1);
      m.steps.splice(6, 1);
    });
    assert.equal(failing(hidden), "focus /about/ dark: FAIL — Tab reached 1 of the 2 toggles");
    assert.equal(failing(measured("focus /about/ dark", (m) => (m.toggles = 0))), "focus /about/ dark: FAIL — no toggle found ([data-theme-toggle])");
    assert.equal(failing(measured("focus /about/ dark", (m) => delete m.toggles)), "focus /about/ dark: FAIL — no toggle found ([data-theme-toggle])");
  });

  it("fails a focused element that is not visible", () => {
    const line = failing(measured("focus /about/ dark", (m) => Object.assign(m.steps[0], { box: { width: 1, height: 1 }, clipPath: "inset(50%)" })));
    assert.equal(line, 'focus /about/ dark: FAIL — focused but not visible: a.skip-link "Skip to content" (1 × 1 px, clip-path inset(50%))');
  });

  it("fails a light walk whose toggle cannot be pressed, with why", () => {
    const line = failing(measured("focus /about/ light", (m) => Object.assign(m, { error: "Node is either not visible or not an HTMLElement", measuredTheme: "dark" })));
    assert.equal(line, "focus /about/ light: FAIL — the toggle could not be pressed to reach light (Node is either not visible or not an HTMLElement); the walk ran in dark, not light");
  });

  it("fails a walk in the wrong theme, a focus trap and a page with nothing to focus", () => {
    assert.equal(failing(measured("focus /about/ light", (m) => (m.measuredTheme = "dark"))), "focus /about/ light: FAIL — the walk ran in dark, not light");
    assert.equal(failing(measured("focus /about/ dark", (m) => (m.ended = "limit"))), "focus /about/ dark: FAIL — Tab did not leave the page after 16 stops (a focus trap?)");
    assert.equal(failing(measured("focus /about/ dark", (m) => Object.assign(m, { focusables: [], steps: [] }))), "focus /about/ dark: FAIL — no focusable element found; Tab reached nothing; Tab reached 0 of the 2 toggles");
  });
});

describe("walkthrough report: reduced-motion (AC-19)", () => {
  it("fails a running animation that moves or scales an element, and passes one that only fades or has finished", () => {
    const rise = { name: "animation rise", playState: "running", properties: ["opacity", "translate"], target: 'h1.reveal "About"' };
    const line = failing(measured("reduced-motion /about/", (m) => m.load.animations.push(rise)));
    assert.equal(line, 'reduced-motion /about/: FAIL — on load, h1.reveal "About" animates translate (animation rise)');
    const grow = { name: "transition", playState: "running", properties: ["scale"], target: "a.card" };
    assert.equal(failing(measured("reduced-motion /about/", (m) => m.bottom.animations.push(grow))), "reduced-motion /about/: FAIL — at the bottom, a.card animates scale (transition)");
    const blink = { name: "animation blink", playState: "running", properties: ["opacity"], target: "span.caret" };
    const finished = { ...rise, playState: "finished" };
    assert.equal(judge(measured("reduced-motion /about/", (m) => m.load.animations.push(blink, finished)), run.expected).ok, true);
  });

  it("fails a .reveal element out of place, a NaN opacity included", () => {
    const line = failing(
      measured("reduced-motion /about/", (m) => {
        m.load.reveal[0].translate = "0px 14px";
        m.load.reveal[1].opacity = NaN;
      }),
    );
    assert.equal(line, 'reduced-motion /about/: FAIL — on load, .reveal not in place: p.eyebrow "Addable Labs · Sweden" (transform none, translate 0px 14px, rotate none, scale none, opacity 1) and h1.reveal "About" (transform none, translate none, rotate none, scale none, opacity NaN)');
    assert.equal(failing(measured("reduced-motion /about/", (m) => (m.bottom.reveal = []))), "reduced-motion /about/: FAIL — no .reveal element found at the bottom");
  });

  it("fails a page without reduced motion in effect, unmeasured at the bottom or not scrolled to it", () => {
    assert.equal(failing(measured("reduced-motion /about/", (m) => (m.reduce = false))), "reduced-motion /about/: FAIL — reduced motion was not in effect (prefers-reduced-motion: reduce did not match)");
    assert.equal(failing(measured("reduced-motion /about/", (m) => delete m.bottom)), "reduced-motion /about/: FAIL — not measured at the bottom");
    assert.equal(failing(measured("reduced-motion /about/", (m) => (m.bottom.scrollY = 0))), `reduced-motion /about/: FAIL — the scroll did not reach the bottom (scrollY 0 of ${run.measurements.at(-1).bottom.maxScrollY})`);
    assert.equal(failing(measured("reduced-motion /about/", (m) => (m.bottom.scrollY = NaN))), `reduced-motion /about/: FAIL — the scroll did not reach the bottom (scrollY NaN of ${run.measurements.at(-1).bottom.maxScrollY})`);
  });

  it("counts the transform family and the offsets that place a box as motion, not opacity or colour", () => {
    for (const property of ["transform", "translate", "rotate", "scale", "top", "left", "inset-inline-start", "margin-top", "offset-distance"]) assert.match(property, MOVING);
    for (const property of ["opacity", "color", "background-color", "box-shadow", "width"]) assert.doesNotMatch(property, MOVING);
  });
});

describe("walkthrough report: colours and rings", () => {
  it("reads the alpha of a computed colour, NaN when it cannot", () => {
    assert.equal(alphaOf("rgb(1, 2, 3)"), 1);
    assert.equal(alphaOf("rgba(1, 2, 3, 0.16)"), 0.16);
    assert.equal(alphaOf("rgba(0, 0, 0, 0)"), 0);
    assert.equal(alphaOf("transparent"), 0);
    assert.equal(alphaOf("oklch(0.5 0.1 120 / 50%)"), 0.5);
    assert.ok(Number.isNaN(alphaOf("currentcolor")));
    assert.ok(Number.isNaN(alphaOf(null)));
  });

  it("finds the ring shadows of a computed box-shadow", () => {
    assert.deepEqual(ringsOf("none"), []);
    assert.deepEqual(ringsOf("rgba(1, 2, 3, 0.16) 0px 0px 0px 0px"), [], "no spread");
    assert.deepEqual(ringsOf("rgb(1, 2, 3) 0px -2px 0px 0px inset"), [], "an underline");
    assert.deepEqual(ringsOf("rgba(0, 0, 0, 0) 0px 0px 0px 3px"), [], "transparent");
    assert.deepEqual(ringsOf("rgba(1, 2, 3, 0.16) 0px 0px 0px 6px, rgb(1, 2, 3) 0px 16px 40px -24px"), ["rgba(1, 2, 3, 0.16) 0px 0px 0px 6px"]);
    assert.deepEqual(ringsOf("rgb(1, 2, 3) 0px 0px 0px 1px inset"), ["rgb(1, 2, 3) 0px 0px 0px 1px inset"]);
  });

  it("names what shows a focus: an outline, else a ring new on focus", () => {
    assert.equal(focusIndicator({ outline: { style: "auto", width: 1, color: "rgb(1, 2, 3)" } }), "outline 1px auto rgb(1, 2, 3)");
    assert.equal(focusIndicator({ outline: { style: "hidden", width: 2, color: "rgb(1, 2, 3)" }, boxShadow: "none", unfocusedBoxShadow: "none" }), null);
    assert.equal(focusIndicator({ outline: { style: "none", width: 0, color: "rgb(1, 2, 3)" }, boxShadow: "rgb(1, 2, 3) 0px 0px 0px 2px", unfocusedBoxShadow: null }), null, "a ring counts only against a measured unfocused box-shadow");
    assert.equal(focusIndicator(undefined), null);
  });

  it("writes a hex token as Chrome computes it", () => {
    assert.equal(rgbOf("#102030"), "rgb(16, 32, 48)");
    assert.equal(rgbOf("#abc"), "rgb(170, 187, 204)");
    assert.throws(() => rgbOf("light-dark(#fff, #000)"), /not a hex colour/);
  });
});

describe("walkthrough script without a built site or without Chrome", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("walkthrough-");
  });
  after(async () => {
    await tmp.cleanup();
  });

  /** Run scripts/walkthrough.mjs on `out`; CHROME_PATH as the case sets it. */
  const walkthrough = (out, env = {}) =>
    spawnSync(process.execPath, [path.join(ROOT, "scripts", "walkthrough.mjs"), out], { cwd: ROOT, encoding: "utf8", env: { ...process.env, CHECK_REQUIRE_CHROME: "", ...env } });

  it("exits 2 without a built site, naming the directory", () => {
    const result = walkthrough(tmp.dir);
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.equal(result.stdout, `walkthrough: no built site in ${tmp.dir} (run pnpm build first); nothing was measured\n`);
  });

  it("exits 2 without Chrome, with a clear message and not the gates' SKIP code 3", async () => {
    await writeFile(path.join(tmp.dir, "index.html"), "<!DOCTYPE html><title>x</title>\n");
    const result = walkthrough(tmp.dir, { CHROME_PATH: "/nonexistent" });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.notEqual(result.status, SKIP_EXIT_CODE);
    assert.equal(result.stdout, "walkthrough: no Chrome found (install Google Chrome or set CHROME_PATH); nothing was measured\n");
  });
});
