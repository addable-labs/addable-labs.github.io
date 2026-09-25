// The rules of the browser walkthrough (scripts/walkthrough.mjs; si-yszh,
// review finding O-02/E-02 of run si-d2h): six criteria of the redesign that
// only a browser shows and no gate measures — AC-07 as amended by AC-31
// (dark for everyone, the OS preference is never an input), AC-18,
// AC-19, AC-20 and AC-23 — judged on plain measurements, so
// tests/walkthrough.test.mjs proves every rule can fail without Chrome.
//
// scripts/walkthrough.mjs takes one measurement per check × page (× width,
// theme or step). Each has `check` and `page` (the path loaded), a page load
// also its HTTP `status`, and one whose toggle could not be pressed or whose
// link could not be followed says why in `error` (a link in no-js: on the
// link):
//
//   first-frame     { frame }
//   theme-switch    { step: "toggle pressed", lang, before, after }
//                   { step: "language switch" | "language switch back",
//                     href, status, lang, frame, toggles }
//                   { step: "storage cleared", frame }
//   no-js           { js, background, main: { height, text }, reveal, toggles,
//                     alternate, links: [{ kind, text, href, status, landed }] }
//   no-hscroll      { width, scrollWidth, innerWidth, widest }
//   focus           { theme, measuredTheme, toggles, focusables, steps, ended }
//   reduced-motion  { reduce, load, bottom }
//
// where
//
//   - a `frame` is what the document showed at its first frame, recorded in a
//     requestAnimationFrame callback registered when the document is created,
//     so before its first paint: { theme (data-theme), background (the body's
//     computed background colour, which the page canvas takes), painted (paint
//     entries so far: 0 before the first paint), storage (localStorage items),
//     osLight (prefers-color-scheme: light matched) }, or null when none came;
//   - `before` / `after` are the page around the toggle press: { theme,
//     background, toggles }, and `toggles` every [data-theme-toggle] as
//     { tag, role, name (its accessible name), pressed (aria-pressed) };
//   - in no-js, `js` is whether the theme script ran (html.js or data-theme),
//     `reveal` every .reveal as { element, opacity, visibility }, `toggles`
//     every [data-theme-toggle] as { display, visibility, width, height,
//     disabled, inert }, `alternate` the href of the page's hreflang link to
//     the other language (null on a page without a counterpart), and `links`
//     the header navigation and language switch, each clicked with its
//     `status` and the path it `landed` on;
//   - in no-hscroll, `widest` names the element reaching furthest right when
//     the page is too wide (null otherwise);
//   - in focus, `focusables` are the page's rendered focusable elements as
//     { index, element, toggle }, `toggles` how many [data-theme-toggle] the
//     page holds, rendered or not, and `steps` what each Tab from the top
//     focused:
//     { index (in focusables, null for another element), element, skipLink,
//     outline: { style, width, color }, boxShadow, unfocusedBoxShadow, box:
//     { width, height }, clipPath }; `ended` is "left" when Tab left the page,
//     "wrapped" when it came back to the first stop, "limit" when neither;
//   - in reduced-motion, `load` and `bottom` are the page one frame after
//     load and one frame after a scroll to the bottom: { animations: [{ name,
//     playState, properties, target }], reveal: [{ element, transform,
//     translate, rotate, scale, opacity }], scrollY, maxScrollY }.
//
// A value that is missing or not a number never passes (review finding F-01:
// NaN compares false both ways, so a check written as "fail when x > limit"
// passes it silently).

import { parseHexColor } from "./contrast.mjs";

/** The six checks, in the order the walkthrough runs them. */
export const CHECKS = ["first-frame", "theme-switch", "no-js", "no-hscroll", "focus", "reduced-motion"];

/** The widths at which no page may scroll horizontally (AC-20), in CSS px. */
export const WIDTHS = [360, 3840];

/**
 * The pages a check measures, of the built site's `pages`: every page for
 * no-hscroll, and for the other checks every page but a game page (si-y6pp),
 * one of `gamePages`, the paths src/_data/games.json names (gamePagePaths in
 * scripts/lib/games.mjs), and no other. A game page is the game alone, as in
 * the app: it has no theme, header, skip link or toggle, and a game moves as
 * it plays, so of the six criteria it can meet only "no horizontal scroll".
 * theme-switch measures / and /sv/ and takes no list.
 */
export function pagesFor(check, pages, gamePages = new Set()) {
  return check === "no-hscroll" ? [...pages] : pages.filter((page) => !gamePages.has(page));
}

/** The themes of the keyboard walk (AC-18: a visible ring in both). */
export const THEMES = ["dark", "light"];

/** The steps of the theme switch (AC-07 as amended, AC-31) and the theme each must show. */
export const SWITCH_STEPS = {
  "toggle pressed": "light",
  "language switch": "light",
  "language switch back": "light",
  "storage cleared": "dark",
};

/**
 * CSS properties whose animation moves an element or scales it (AC-19: "no
 * element animates position or scale"): the transform family and the
 * properties that place a box. Opacity and colour may still change.
 */
export const MOVING = /^(transform|translate|rotate|scale|top|right|bottom|left|inset(-[a-z-]+)?|margin(-[a-z-]+)?|offset(-[a-z-]+)?)$/;

const finite = (value) => typeof value === "number" && Number.isFinite(value);

const quote = (value) => (typeof value === "string" ? `"${value}"` : String(value));

/** "rgb(r, g, b)", as Chrome computes an opaque colour, for a hex literal from tokens.css. */
export function rgbOf(hex) {
  const [r, g, b] = parseHexColor(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

/** The alpha (0–1) of a computed colour, NaN when it cannot be read. */
export function alphaOf(color) {
  if (typeof color !== "string") return NaN;
  const value = color.trim().toLowerCase();
  if (value === "transparent") return 0;
  const call = /^[a-z-]+\((.*)\)$/.exec(value);
  if (!call) return NaN;
  const args = call[1];
  const slash = args.split("/");
  const commas = args.split(",");
  let alpha = "1";
  if (slash.length === 2) alpha = slash[1].trim();
  else if (commas.length === 4) alpha = commas[3].trim();
  const number = alpha.endsWith("%") ? parseFloat(alpha) / 100 : Number(alpha);
  return finite(number) ? number : NaN;
}

/** Split a computed value at its top-level commas ("rgb(1, 2, 3) 0px 0px, …"). */
function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    else if (value[i] === ")") depth -= 1;
    else if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * The shadows of a computed box-shadow that draw a ring: a spread above 0 and
 * a colour that is not transparent. Chrome computes each shadow as
 * "<colour> <x> <y> <blur> <spread>", with " inset" after an inset one.
 */
export function ringsOf(boxShadow) {
  if (typeof boxShadow !== "string" || boxShadow.trim() === "none") return [];
  return splitTopLevel(boxShadow).filter((shadow) => {
    const color = /^([a-z-]+\([^)]*\)|[a-z]+)/i.exec(shadow)?.[0];
    const lengths = shadow
      .slice(color?.length ?? 0)
      .trim()
      .split(/\s+/)
      .filter((part) => part !== "inset")
      .map((part) => (part.endsWith("px") ? Number(part.slice(0, -2)) : NaN));
    return lengths.length === 4 && lengths.every(finite) && lengths[3] > 0 && alphaOf(color) > 0;
  });
}

/**
 * What shows a focused element's focus (AC-18), or null: an outline — a style
 * other than none or hidden, a width above 0 and a colour that is not
 * transparent — or a box-shadow ring the element does not wear unfocused.
 */
export function focusIndicator(step) {
  const outline = step?.outline;
  if (typeof outline?.style === "string" && !["none", "hidden"].includes(outline.style) && finite(outline.width) && outline.width > 0 && alphaOf(outline.color) > 0) {
    return `outline ${outline.width}px ${outline.style} ${outline.color}`;
  }
  if (typeof step?.unfocusedBoxShadow === "string") {
    const before = ringsOf(step.unfocusedBoxShadow);
    const added = ringsOf(step.boxShadow).filter((ring) => !before.includes(ring));
    if (added.length > 0) return `box-shadow ${added.join(", ")}`;
  }
  return null;
}

/** "a, b and c" */
function list(items) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** At most `max` items named, then how many more. */
function some(items, max = 3) {
  return items.length <= max ? list(items) : `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}

/**
 * The rules of a first frame that must show `theme`: `os` is the OS setting
 * it was taken under, which must have been in effect, and `emptyStorage`
 * that no choice may have been stored.
 */
function frameProblems(frame, theme, expected, { os, emptyStorage = false }) {
  if (frame === null || typeof frame !== "object") return ["no first frame recorded"];
  const problems = [];
  if (frame.osLight !== (os === "light")) problems.push(`the ${os} OS setting was not in effect (prefers-color-scheme: light ${frame.osLight === true ? "matched" : frame.osLight === false ? "did not match" : "was not measured"})`);
  if (emptyStorage && frame.storage !== 0) problems.push(finite(frame.storage) ? `storage was not empty (${frame.storage} item${frame.storage === 1 ? "" : "s"})` : "storage was not measured");
  if (frame.painted !== 0) problems.push(finite(frame.painted) ? `measured after the first paint (${frame.painted} paint entr${frame.painted === 1 ? "y" : "ies"}), not at the first frame` : "whether the page had painted was not measured");
  if (frame.theme !== theme) problems.push(frame.theme ? `data-theme is ${quote(frame.theme)} at the first frame, not "${theme}"` : `no data-theme at the first frame (not "${theme}")`);
  if (frame.background !== expected.background[theme]) problems.push(`the page background is ${frame.background ?? "unmeasured"} at the first frame, not the ${theme} ${expected.background[theme]}`);
  return problems;
}

/** The rules every toggle meets on a page in `lang` showing `theme`: a button, its name in the page language, pressed = dark. */
function toggleProblems(toggles, lang, theme, expected) {
  if (!Array.isArray(toggles) || toggles.length === 0) return ["no toggle found ([data-theme-toggle])"];
  const problems = [];
  const name = expected.toggleNames[lang];
  const pressed = theme === "dark" ? "true" : "false";
  toggles.forEach((toggle, index) => {
    const which = `toggle ${index + 1}`;
    if (toggle.tag !== "button" || toggle.role !== "button") problems.push(`${which} is ${toggle.tag ?? "an unmeasured element"} with role ${toggle.role ?? "none"}, not a button`);
    if (typeof name !== "string" || toggle.name !== name) problems.push(`${which} is named ${quote(toggle.name)}, not ${quote(name)} (the ${lang} name)`);
    if (toggle.pressed !== pressed) problems.push(`${which} has aria-pressed ${quote(toggle.pressed)} in ${theme}, not "${pressed}"`);
  });
  return problems;
}

function judgeFirstFrame(m, expected) {
  const problems = frameProblems(m.frame, "dark", expected, { os: "light", emptyStorage: true });
  return { problems, summary: `dark at the first frame under a light OS, background ${expected.background.dark}` };
}

function judgeThemeSwitch(m, expected) {
  const theme = SWITCH_STEPS[m.step];
  if (theme === undefined) return { problems: [`unknown step ${quote(m.step)}`], summary: "" };
  const problems = [];
  if (m.step === "toggle pressed") {
    if (m.error) problems.push(`the toggle could not be pressed (${m.error})`);
    if (m.before?.theme !== "dark") problems.push(`the page was ${m.before?.theme ?? "unmeasured"} before the press, not dark`);
    problems.push(...toggleProblems(m.before?.toggles, m.lang, "dark", expected).map((problem) => `before the press, ${problem}`));
    if (m.after?.theme !== theme) problems.push(`data-theme is ${quote(m.after?.theme ?? null)} after the press, not "${theme}"`);
    if (m.after?.background !== expected.background[theme]) problems.push(`the page background is ${m.after?.background ?? "unmeasured"} after the press, not the ${theme} ${expected.background[theme]}`);
    problems.push(...toggleProblems(m.after?.toggles, m.lang, theme, expected).map((problem) => `after the press, ${problem}`));
    const count = m.after?.toggles?.length ?? 0;
    return { problems, summary: `light, background ${expected.background.light}; ${count} button${count === 1 ? "" : "s"} ${quote(expected.toggleNames[m.lang])}, aria-pressed true → false` };
  }
  if (m.step === "storage cleared") {
    problems.push(...frameProblems(m.frame, theme, expected, { os: "light", emptyStorage: true }));
    return { problems, summary: `dark at the first frame under a light OS, background ${expected.background.dark}` };
  }
  if (typeof m.href !== "string") return { problems: ["no language switch found (.site-header a.lang-switch)"], summary: "" };
  if (m.error) return { problems: [`the language switch to ${m.href} could not be followed (${m.error})`], summary: "" };
  if (m.status !== 200) problems.push(`the language switch to ${m.href} answered ${m.status ?? "nothing"}, not 200`);
  if (m.page !== m.href) problems.push(`the language switch to ${m.href} landed on ${m.page ?? "no page"}`);
  problems.push(...frameProblems(m.frame, theme, expected, { os: "dark" }));
  problems.push(...toggleProblems(m.toggles, m.lang, theme, expected));
  const count = m.toggles?.length ?? 0;
  return { problems, summary: `light at the first frame, background ${expected.background.light}; ${count} button${count === 1 ? "" : "s"} ${quote(expected.toggleNames[m.lang])}, aria-pressed false` };
}

function judgeNoJs(m, expected) {
  const problems = [];
  if (m.js !== false) problems.push(m.js === true ? "JavaScript ran (html.js or data-theme is set), so the page was not measured without it" : "whether JavaScript ran was not measured");
  if (m.background !== expected.background.dark) problems.push(`the page background is ${m.background ?? "unmeasured"}, not the dark ${expected.background.dark}`);
  if (!(finite(m.main?.height) && m.main.height > 0 && finite(m.main?.text) && m.main.text > 0)) problems.push("main shows nothing (no height or no text)");
  const reveal = Array.isArray(m.reveal) ? m.reveal : [];
  if (reveal.length === 0) problems.push("no .reveal element found");
  const hidden = reveal.filter((el) => !(el.opacity === 1 && el.visibility === "visible"));
  if (hidden.length > 0) problems.push(`.reveal held hidden: ${some(hidden.map((el) => `${el.element} (opacity ${el.opacity}, ${el.visibility})`))}`);
  const toggles = Array.isArray(m.toggles) ? m.toggles : [];
  if (toggles.length === 0) problems.push("no toggle found ([data-theme-toggle])");
  toggles.forEach((toggle, index) => {
    const hiddenToggle = toggle.display === "none" || (typeof toggle.visibility === "string" && toggle.visibility !== "visible") || (finite(toggle.width) && finite(toggle.height) && toggle.width * toggle.height === 0);
    if (!hiddenToggle && toggle.disabled !== true && toggle.inert !== true) problems.push(`toggle ${index + 1} is shown and operable, though it cannot work without JavaScript`);
  });
  const links = Array.isArray(m.links) ? m.links : [];
  const nav = links.filter((link) => link.kind === "nav");
  const switches = links.filter((link) => link.kind === "language switch");
  if (nav.length === 0) problems.push("no header navigation link found");
  if (m.alternate && switches.length === 0) problems.push(`no language switch, though the page has a counterpart (${m.alternate})`);
  for (const link of links) {
    if (link.error) problems.push(`${link.kind} ${quote(link.text)} to ${link.href} could not be followed (${link.error})`);
    else if (link.status !== 200) problems.push(`${link.kind} ${quote(link.text)} to ${link.href} answered ${link.status ?? "nothing"}, not 200`);
    else if (link.landed !== link.href) problems.push(`${link.kind} ${quote(link.text)} to ${link.href} landed on ${link.landed ?? "no page"}`);
  }
  return {
    problems,
    summary: `dark under a light OS, main shown with ${reveal.length} .reveal at opacity 1, ${toggles.length} toggle${toggles.length === 1 ? "" : "s"} hidden; ${list(links.map((link) => link.text))} load${links.length === 1 ? "s" : ""} (200)`,
  };
}

function judgeNoHscroll(m) {
  const problems = [];
  if (!finite(m.scrollWidth) || !finite(m.innerWidth)) problems.push(`not measured (scrollWidth ${m.scrollWidth ?? "missing"}, innerWidth ${m.innerWidth ?? "missing"})`);
  else {
    if (m.innerWidth !== m.width) problems.push(`the viewport is ${m.innerWidth} px wide, not the ${m.width} px asked for`);
    if (m.scrollWidth !== m.innerWidth) problems.push(`${m.scrollWidth} px wide in a ${m.innerWidth} px viewport${m.widest ? ` (widest: ${m.widest})` : ""}`);
  }
  return { problems, summary: `${m.scrollWidth} px wide in a ${m.innerWidth} px viewport` };
}

function judgeFocus(m) {
  const problems = [];
  if (m.error) problems.push(`the toggle could not be pressed to reach ${m.theme} (${m.error})`);
  if (m.measuredTheme !== m.theme) problems.push(`the walk ran in ${m.measuredTheme ?? "an unmeasured theme"}, not ${m.theme}`);
  const focusables = Array.isArray(m.focusables) ? m.focusables : [];
  const steps = Array.isArray(m.steps) ? m.steps : [];
  if (focusables.length === 0) problems.push("no focusable element found");
  if (steps.length === 0) problems.push("Tab reached nothing");
  else if (steps[0].skipLink !== true) problems.push(`the first Tab reached ${steps[0].element}, not the skip link`);
  if (m.ended === "limit") problems.push(`Tab did not leave the page after ${steps.length} stops (a focus trap?)`);
  const indicators = new Map();
  const unringed = [];
  const unseen = [];
  for (const step of steps) {
    const indicator = focusIndicator(step);
    if (indicator === null) unringed.push(`${step.element} (outline ${step.outline?.style ?? "?"} ${step.outline?.width ?? "?"}px, box-shadow ${step.boxShadow ?? "?"})`);
    else indicators.set(indicator, (indicators.get(indicator) ?? 0) + 1);
    const box = step.box;
    if (!(finite(box?.width) && finite(box?.height) && box.width >= 2 && box.height >= 2 && step.clipPath === "none")) {
      unseen.push(`${step.element} (${box?.width ?? "?"} × ${box?.height ?? "?"} px, clip-path ${step.clipPath ?? "?"})`);
    }
  }
  if (unringed.length > 0) problems.push(`no visible focus indicator on ${some(unringed)}`);
  if (unseen.length > 0) problems.push(`focused but not visible: ${some(unseen)}`);
  const reached = new Set(steps.map((step) => step.index));
  const missed = focusables.filter((el) => !reached.has(el.index));
  if (missed.length > 0) problems.push(`not reached by Tab: ${some(missed.map((el) => el.element))}`);
  // A toggle that is not rendered is not in `focusables` at all, so the
  // toggles are counted in the page: Tab must reach every one.
  const toggles = focusables.filter((el) => el.toggle === true && reached.has(el.index)).length;
  if (!(finite(m.toggles) && m.toggles > 0)) problems.push("no toggle found ([data-theme-toggle])");
  else if (toggles < m.toggles) problems.push(`Tab reached ${toggles} of the ${m.toggles} toggles`);
  const rings = [...indicators].map(([indicator, count]) => (indicators.size === 1 ? indicator : `${indicator} (${count})`));
  return {
    problems,
    summary: `${steps.length} Tab stops from the skip link, all ${focusables.length} focusable elements, the ${m.toggles} toggles among them; each shows ${rings.length === 1 ? rings[0] : list(rings)}`,
  };
}

function judgeReducedMotion(m) {
  const problems = [];
  if (m.reduce !== true) problems.push("reduced motion was not in effect (prefers-reduced-motion: reduce did not match)");
  let count = 0;
  for (const [phase, where] of [
    ["load", "on load"],
    ["bottom", "at the bottom"],
  ]) {
    const state = m[phase];
    if (state === null || typeof state !== "object") {
      problems.push(`not measured ${where}`);
      continue;
    }
    const moving = (Array.isArray(state.animations) ? state.animations : []).filter((animation) => animation.playState === "running" && (animation.properties ?? []).some((property) => MOVING.test(property)));
    if (moving.length > 0) {
      problems.push(`${where}, ${some(moving.map((animation) => `${animation.target ?? "an element"} animates ${animation.properties.filter((property) => MOVING.test(property)).join(" and ")} (${animation.name ?? "unnamed"})`))}`);
    }
    const reveal = Array.isArray(state.reveal) ? state.reveal : [];
    count = reveal.length;
    if (reveal.length === 0) problems.push(`no .reveal element found ${where}`);
    const displaced = reveal.filter((el) => !(["transform", "translate", "rotate", "scale"].every((property) => el[property] === "none") && el.opacity === 1));
    if (displaced.length > 0) {
      problems.push(`${where}, .reveal not in place: ${some(displaced.map((el) => `${el.element} (transform ${el.transform}, translate ${el.translate}, rotate ${el.rotate}, scale ${el.scale}, opacity ${el.opacity})`))}`);
    }
    if (phase === "bottom" && !(finite(state.scrollY) && finite(state.maxScrollY) && Math.abs(state.scrollY - state.maxScrollY) <= 1)) {
      problems.push(`the scroll did not reach the bottom (scrollY ${state.scrollY ?? "unmeasured"} of ${state.maxScrollY ?? "unmeasured"})`);
    }
  }
  return { problems, summary: `${count} .reveal in place and nothing moving, on load and at the bottom` };
}

const JUDGES = {
  "first-frame": judgeFirstFrame,
  "theme-switch": judgeThemeSwitch,
  "no-js": judgeNoJs,
  "no-hscroll": judgeNoHscroll,
  focus: judgeFocus,
  "reduced-motion": judgeReducedMotion,
};

/** The line's prefix: `<check> <page>`, then the width, theme or step. */
export function where(m) {
  const variant = m.check === "no-hscroll" ? m.width : m.check === "focus" ? m.theme : m.check === "theme-switch" ? m.step : undefined;
  return [m.check, m.page, variant].filter((part) => part !== undefined && part !== null).join(" ");
}

/**
 * Judge one measurement against what the pages must show: `expected` is
 * { background: { dark, light } (the computed --color-bg of each theme),
 * toggleNames: { <lang>: <the toggle's name> } }.
 * @returns {{ check: string, ok: boolean, problems: string[], line: string }} — the
 *   line is `<where>: ok (<what was seen>)` or `<where>: FAIL — <problem>; <problem>`
 */
export function judge(m, expected) {
  const rules = JUDGES[m?.check];
  const prefix = where(m ?? {});
  if (rules === undefined) return { check: m?.check, ok: false, problems: [`${prefix}: unknown check`], line: `${prefix}: FAIL — unknown check` };
  const { problems, summary } = rules(m, expected);
  // A page that did not load is named before whatever it failed to show (the
  // theme switch names its own loads).
  if (m.check !== "theme-switch" && m.status !== 200) problems.unshift(`${m.page} answered ${m.status ?? "nothing"}, not 200`);
  return {
    check: m.check,
    ok: problems.length === 0,
    problems: problems.map((problem) => `${prefix}: ${problem}`),
    line: problems.length === 0 ? `${prefix}: ok (${summary})` : `${prefix}: FAIL — ${problems.join("; ")}`,
  };
}

/**
 * Judge a whole run: every measurement, and that each of the six checks ran
 * at least once — a check that measured nothing must not pass.
 * @returns {{ ok: boolean, problems: string[], lines: string[], results: object[] }}
 */
export function evaluate(measurements, expected) {
  const results = measurements.map((m) => judge(m, expected));
  const problems = results.flatMap((result) => result.problems);
  const missing = CHECKS.filter((check) => !results.some((result) => result.check === check));
  if (missing.length > 0) problems.push(`walkthrough: no ${list(missing)} measurement, so ${missing.length === 1 ? "that check" : "those checks"} did not run`);
  return { ok: problems.length === 0, problems, lines: results.map((result) => result.line), results };
}

/**
 * The last line of a run: PASS with the number of checks, pages and seconds,
 * or FAIL with how many failed — FAIL too when a check measured nothing.
 */
export function summaryLine(results, pages, seconds) {
  const time = `${seconds.toFixed(1)} s`;
  const failed = results.filter((result) => !result.ok).length;
  const missing = CHECKS.filter((check) => !results.some((result) => result.check === check));
  if (failed > 0) return `FAIL walkthrough (${failed} of ${results.length} checks failed, on ${pages} pages, ${time})`;
  if (missing.length > 0) return `FAIL walkthrough (${list(missing)} measured nothing, on ${pages} pages, ${time})`;
  return `PASS walkthrough (${results.length} checks on ${pages} pages, ${time})`;
}
