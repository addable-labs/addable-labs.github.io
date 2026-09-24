#!/usr/bin/env node
// The browser walkthrough (si-yszh; review finding O-02/E-02 of run si-d2h):
// the six criteria of the redesign that only a browser shows, measured in
// headless Chrome on a built site. Not a gate: no check: entry, not in
// scripts/check/run.mjs, not in CI. Run it by hand after a build:
//
//   pnpm build && pnpm walkthrough [<built-site dir>] [<source dir>]
//
//   first-frame     every page is dark at its first frame under a light OS
//                   with empty storage (AC-31, which amends AC-07)
//   theme-switch    on /, the toggle turns the page light; the language
//                   switch leads to /sv/, light from its first frame, and
//                   back to /, light; with storage cleared / is dark again
//                   (AC-07, AC-31)
//   no-js           with JavaScript off every page is dark under a light OS,
//                   its content shown, the toggle hidden, and the header
//                   navigation and the language switch load (AC-23, AC-31)
//   no-hscroll      no page scrolls horizontally at 360 or 3840 px (AC-20;
//                   the layout gate checks this on articles only, up to
//                   1920 px)
//   focus           Tab from the top of every page, in dark and in light,
//                   reaches the skip link first, then every rendered link
//                   and button, each with a visible ring (AC-18, AC-23)
//   reduced-motion  under prefers-reduced-motion: reduce nothing moves or
//                   scales on any page, on load or at its bottom (AC-19)
//
// Every page is the built site's .html files. One line per check × page
// (× width, theme or step), "ok (…)" or "FAIL — …", then a summary line with
// the run time; the rules are scripts/lib/walkthrough-report.mjs. Exit 0
// when every line is ok, 1 when one fails, 2 when the walkthrough cannot run
// (no built site, no Chrome). Chrome and the static server are withChrome's
// (scripts/lib/chrome.mjs): Chrome is killed by its own pid and the server
// closed on success, on failure and on SIGINT/SIGTERM, and a page whose
// Chrome is lost is measured again, once, in a new Chrome. Each measurement
// runs in a browser context of its own, so its storage starts empty.
// WALKTHROUGH_DUMP=<file> writes the raw measurements and what the pages
// must show as JSON (the source of tests/fixtures/walkthrough/run.json).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import puppeteer, { ProtocolError } from "puppeteer-core";
import { findChrome, withChrome } from "./lib/chrome.mjs";
import { parseTokens } from "./lib/contrast.mjs";
import { exists, fileToUrl, loadSite, loadStrings, resolveDirs, walk } from "./lib/site.mjs";
import { judge, rgbOf, summaryLine, THEMES, WIDTHS } from "./lib/walkthrough-report.mjs";

/** The viewport of every check but no-hscroll: a desktop, where the header shows its call to action. */
const VIEWPORT = { width: 1280, height: 800 };

/** The height of the no-hscroll viewports; only the width matters. */
const HSCROLL_HEIGHT = 900;

/** How long to wait for a first frame or a view transition. */
const WAIT_MS = 10_000;

/** Tab presses past the number of focusable elements before a walk counts as a focus trap. */
const EXTRA_TABS = 10;

const TOGGLE = "[data-theme-toggle]";
const HEADER_TOGGLE = `.site-header ${TOGGLE}`;
const NAV_LINKS = ".site-header nav a[href]";
const LANGUAGE_SWITCH = ".site-header a.lang-switch[href]";

const started = performance.now();

/** Stop before measuring anything: say why and exit 2. */
function cannotRun(reason) {
  console.log(`walkthrough: ${reason}; nothing was measured`);
  process.exit(2);
}

const { out, src } = resolveDirs();
if (!(await exists(path.join(out, "index.html")))) cannotRun(`no built site in ${out} (run pnpm build first)`);
if ((await findChrome()) === null) cannotRun("no Chrome found (install Google Chrome or set CHROME_PATH)");

// What the pages must show: each theme's page background, from the built
// tokens.css by name, and the toggle's name in each language.
let expected;
try {
  const tokens = parseTokens(await readFile(path.join(out, "assets", "css", "tokens.css"), "utf8"));
  const site = await loadSite(src);
  const strings = await loadStrings(src, site);
  expected = {
    background: { dark: rgbOf(tokens.dark["--color-bg"]), light: rgbOf(tokens.light["--color-bg"]) },
    toggleNames: Object.fromEntries(site.languages.codes.map((lang) => [lang, strings[lang].theme.toggleLabel])),
  };
} catch (error) {
  cannotRun(`cannot read what the pages must show (${error.message})`);
}

const pages = (await walk(out, ".html")).map((file) => fileToUrl(path.relative(out, file))).sort();

// Registered with evaluateOnNewDocument, so it runs as each document is
// created — before the page's own scripts and before its first paint. The
// requestAnimationFrame callback runs in the first frame's rendering steps,
// ahead of that frame's paint: what it records is what the first frame
// shows. `revealed` turns "done" when the document is shown, or when the
// cross-document view transition that shows it (base.css, @view-transition)
// is over: the transition covers the page and swallows clicks until then.
function firstFrameProbe() {
  const state = { frame: null, revealed: "onpagereveal" in window ? "pending" : "done" };
  window.__walkthrough = state;
  addEventListener("pagereveal", (event) => {
    const done = () => {
      state.revealed = "done";
    };
    if (event.viewTransition) event.viewTransition.finished.then(done, done);
    else done();
  });
  requestAnimationFrame(() => {
    let storage = null;
    try {
      storage = localStorage.length;
    } catch {
      // null: not measured
    }
    state.frame = {
      theme: document.documentElement.getAttribute("data-theme"),
      background: document.body ? getComputedStyle(document.body).backgroundColor : null,
      painted: performance.getEntriesByType("paint").length,
      storage,
      osLight: matchMedia("(prefers-color-scheme: light)").matches,
    };
  });
}

/** The first frame of the tab's document, once the document is shown; null when none came in time. */
async function firstFrameOf(tab) {
  try {
    await tab.waitForFunction(() => window.__walkthrough?.frame != null && window.__walkthrough.revealed === "done", { timeout: WAIT_MS });
  } catch (error) {
    if (error.name !== "TimeoutError") throw error;
  }
  return tab.evaluate(() => window.__walkthrough?.frame ?? null);
}

/** Resolves once one whole frame has been rendered after the call. */
function nextFrame(tab) {
  return tab.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
}

/** Emulate the OS settings a check runs under: `scheme` (light, dark) and `motion` (reduce, no-preference). */
function emulate(tab, { scheme, motion }) {
  const features = [];
  if (scheme) features.push({ name: "prefers-color-scheme", value: scheme });
  if (motion) features.push({ name: "prefers-reduced-motion", value: motion });
  return tab.emulateMediaFeatures(features);
}

/** The path of the tab's current URL. */
const pathOf = (tab) => new URL(tab.url()).pathname;

/**
 * What went wrong with the page, as a problem for its line: an element that
 * cannot be clicked, a navigation that never comes. A protocol error means
 * Chrome itself is in trouble: it is thrown on, so that withChrome measures
 * the page again in a new Chrome.
 */
function pageError(error) {
  if (error instanceof ProtocolError) throw error;
  return String(error?.message ?? error).split("\n")[0];
}

/** Press `handle` with the mouse: null, or why it could not be pressed. */
async function press(handle) {
  try {
    await handle.click();
    return null;
  } catch (error) {
    return pageError(error);
  }
}

/** Click the link `handle` and wait for the page it leads to: { status, landed }, with `error` when it leads nowhere. */
async function follow(tab, handle) {
  try {
    const [response] = await Promise.all([tab.waitForNavigation({ waitUntil: "load", timeout: WAIT_MS }), handle.click()]);
    return { status: response?.status() ?? null, landed: pathOf(tab) };
  } catch (error) {
    return { status: null, landed: null, error: pageError(error) };
  }
}

// Runs inside the page: how an element is named in the lines — its tag, its
// first class and the start of its text.
function describe(el) {
  const name = el.tagName.toLowerCase() + (el.classList.length > 0 ? `.${el.classList[0]}` : "");
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  return text ? `${name} "${text.length > 32 ? `${text.slice(0, 31)}…` : text}"` : name;
}

/**
 * Run `fn(describe, ...args)` inside the tab's page, `fn` being one of the
 * in-page functions below. A function reaches the page as source text, so
 * `describe` goes with it as an argument; a closure would not.
 */
function inPage(tab, fn, ...args) {
  return tab.evaluate(`(${fn})(${[describe, ...args.map((arg) => JSON.stringify(arg))].join(", ")})`);
}

/** The theme, background and toggles of the page in the tab (see walkthrough-report.mjs). */
async function pageState(tab) {
  const state = await tab.evaluate(() => ({
    lang: document.documentElement.lang,
    theme: document.documentElement.getAttribute("data-theme"),
    background: getComputedStyle(document.body).backgroundColor,
  }));
  state.toggles = [];
  for (const handle of await tab.$$(TOGGLE)) {
    const node = await tab.accessibility.snapshot({ root: handle, interestingOnly: false });
    const { tag, pressed } = await handle.evaluate((el) => ({ tag: el.tagName.toLowerCase(), pressed: el.getAttribute("aria-pressed") }));
    state.toggles.push({ tag, role: node?.role ?? null, name: node?.name ?? null, pressed });
  }
  return state;
}

/** first-frame: a fresh context (empty storage) under a light OS. */
async function firstFrame(tab, origin, page) {
  await emulate(tab, { scheme: "light", motion: "no-preference" });
  await tab.evaluateOnNewDocument(firstFrameProbe);
  const response = await tab.goto(`${origin}${page}`, { waitUntil: "load" });
  return { check: "first-frame", page, status: response?.status() ?? null, frame: await firstFrameOf(tab) };
}

/**
 * theme-switch, one visit from /. The press and the two switches run under a
 * dark OS, so light at a first frame can only come from the stored choice;
 * the cleared storage is reloaded under a light OS, so dark there cannot come
 * from the OS. Motion is on, so each switch runs its view transition.
 */
async function themeSwitch(tab, origin) {
  const measurements = [];
  await emulate(tab, { scheme: "dark", motion: "no-preference" });
  await tab.evaluateOnNewDocument(firstFrameProbe);
  await tab.goto(`${origin}/`, { waitUntil: "load" });
  await firstFrameOf(tab);
  const before = await pageState(tab);
  const toggle = await tab.$(HEADER_TOGGLE);
  const error = toggle === null ? null : await press(toggle);
  await nextFrame(tab);
  const after = await pageState(tab);
  measurements.push({ check: "theme-switch", page: pathOf(tab), step: "toggle pressed", lang: before.lang, before, after, ...(error ? { error } : {}) });
  for (const step of ["language switch", "language switch back"]) {
    const from = pathOf(tab);
    const link = await tab.$(LANGUAGE_SWITCH);
    if (link === null) {
      measurements.push({ check: "theme-switch", page: from, step, href: null });
      return measurements;
    }
    const href = await link.evaluate((a) => new URL(a.href).pathname);
    const { status, error } = await follow(tab, link);
    if (error) {
      // The rest of the visit needs the other page.
      measurements.push({ check: "theme-switch", page: from, step, href, status, error });
      return measurements;
    }
    const frame = await firstFrameOf(tab);
    const { lang, toggles } = await pageState(tab);
    measurements.push({ check: "theme-switch", page: pathOf(tab), step, href, status, lang, frame, toggles });
  }
  await tab.evaluate(() => localStorage.clear());
  await emulate(tab, { scheme: "light", motion: "no-preference" });
  await tab.reload({ waitUntil: "load" });
  measurements.push({ check: "theme-switch", page: pathOf(tab), step: "storage cleared", frame: await firstFrameOf(tab) });
  return measurements;
}

// Runs inside a page loaded without JavaScript (CDP evaluates it all the same).
function measureWithoutJavaScript(describe, navLinks, languageSwitch) {
  const root = document.documentElement;
  const main = document.querySelector("main");
  const link = (kind) => (el) => ({ kind, text: el.textContent.trim().replace(/\s+/g, " "), href: new URL(el.href).pathname });
  const switchLink = document.querySelector(languageSwitch);
  return {
    js: root.classList.contains("js") || root.hasAttribute("data-theme"),
    background: document.body ? getComputedStyle(document.body).backgroundColor : null,
    main: main ? { height: main.getBoundingClientRect().height, text: main.innerText.trim().length } : null,
    reveal: [...document.querySelectorAll(".reveal")].map((el) => {
      const style = getComputedStyle(el);
      return { element: describe(el), opacity: parseFloat(style.opacity), visibility: style.visibility };
    }),
    toggles: [...document.querySelectorAll("[data-theme-toggle]")].map((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return { display: style.display, visibility: style.visibility, width: box.width, height: box.height, disabled: el.disabled === true, inert: el.closest("[inert]") !== null };
    }),
    alternate: document.querySelector(`link[rel="alternate"][hreflang]:not([hreflang="x-default"]):not([hreflang="${root.lang}"])`)?.getAttribute("href") ?? null,
    links: [...[...document.querySelectorAll(navLinks)].map(link("nav")), ...(switchLink ? [link("language switch")(switchLink)] : [])],
  };
}

/**
 * no-js: the page under a light OS with motion on (so the entrance styles
 * would hide what they could), then each header link clicked from a fresh
 * load of the page.
 */
async function withoutJavaScript(tab, origin, page) {
  await tab.setJavaScriptEnabled(false);
  await emulate(tab, { scheme: "light", motion: "no-preference" });
  const response = await tab.goto(`${origin}${page}`, { waitUntil: "load" });
  const measurement = { check: "no-js", page, status: response?.status() ?? null, ...(await inPage(tab, measureWithoutJavaScript, NAV_LINKS, LANGUAGE_SWITCH)) };
  // The navigation links come first, in document order, then the switch.
  for (const [index, link] of measurement.links.entries()) {
    if (index > 0) await tab.goto(`${origin}${page}`, { waitUntil: "load" });
    const handle = link.kind === "nav" ? (await tab.$$(NAV_LINKS))[index] : await tab.$(LANGUAGE_SWITCH);
    Object.assign(link, await follow(tab, handle));
  }
  return measurement;
}

// Runs inside the page: how wide the document is, and when it is too wide
// the element reaching furthest right outside any box that clips or scrolls.
function measureWidth(describe) {
  const scrollWidth = document.documentElement.scrollWidth;
  let widest = null;
  if (scrollWidth > innerWidth) {
    const clipped = (el) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== "visible") return true;
      }
      return false;
    };
    for (const el of document.body.querySelectorAll("*")) {
      const right = el.getBoundingClientRect().right;
      if (right > innerWidth && (widest === null || right > widest.right) && !clipped(el)) widest = { el, right };
    }
  }
  return { scrollWidth, innerWidth, widest: widest && `${describe(widest.el)} reaching ${Math.round(widest.right)} px` };
}

/** no-hscroll: the page at `width`, fonts loaded and one frame rendered. */
async function horizontalScroll(tab, origin, page, width) {
  await emulate(tab, { motion: "no-preference" });
  const response = await tab.goto(`${origin}${page}`, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready.then(() => true));
  await nextFrame(tab);
  return { check: "no-hscroll", page, width, status: response?.status() ?? null, ...(await inPage(tab, measureWidth)) };
}

// Runs inside the page before the walk, with nothing focused: every rendered
// focusable element, numbered in document order on the element itself (a
// property, not an attribute, so no style can see it), with its box-shadow
// unfocused, and how many toggles the page holds, rendered or not.
function listFocusables(describe) {
  const selector = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable=""], [contenteditable="true"]';
  const focusables = [...document.querySelectorAll(selector)].filter((el) => el.tabIndex >= 0 && !el.disabled && !el.closest("[inert]") && el.getClientRects().length > 0 && getComputedStyle(el).visibility === "visible");
  return {
    theme: document.documentElement.getAttribute("data-theme"),
    toggles: document.querySelectorAll("[data-theme-toggle]").length,
    focusables: focusables.map((el, index) => {
      el.__walkthroughIndex = index;
      el.__walkthroughBoxShadow = getComputedStyle(el).boxShadow;
      return { index, element: describe(el), toggle: el.matches("[data-theme-toggle]") };
    }),
  };
}

// Runs inside the page after each Tab: the focused element and how it shows
// its focus; null when focus has left the page.
function readFocus(describe) {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const style = getComputedStyle(el);
  const box = el.getBoundingClientRect();
  return {
    index: Number.isInteger(el.__walkthroughIndex) ? el.__walkthroughIndex : null,
    element: describe(el),
    skipLink: el.matches('a.skip-link[href^="#"]'),
    outline: { style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor },
    boxShadow: style.boxShadow,
    unfocusedBoxShadow: el.__walkthroughBoxShadow ?? null,
    box: { width: box.width, height: box.height },
    clipPath: style.clipPath,
  };
}

/**
 * focus: Tab from the top of the page until focus leaves it. Light is
 * reached as a visitor reaches it — the header toggle pressed, then the page
 * reloaded, so the walk starts from the top with nothing focused.
 */
async function focusWalk(tab, origin, page, theme) {
  await emulate(tab, { motion: "no-preference" });
  const response = await tab.goto(`${origin}${page}`, { waitUntil: "load" });
  let error = null;
  if (theme === "light") {
    const toggle = await tab.$(HEADER_TOGGLE);
    error = toggle === null ? null : await press(toggle);
    await tab.reload({ waitUntil: "load" });
  }
  const { theme: measuredTheme, toggles, focusables } = await inPage(tab, listFocusables);
  const steps = [];
  let ended = "limit";
  for (let press = 0; press < focusables.length + EXTRA_TABS; press += 1) {
    await tab.keyboard.press("Tab");
    const step = await inPage(tab, readFocus);
    if (step === null) {
      ended = "left";
      break;
    }
    if (steps.length > 0 && step.index !== null && step.index === steps[0].index) {
      ended = "wrapped";
      break;
    }
    steps.push(step);
  }
  return { check: "focus", page, theme, status: response?.status() ?? null, measuredTheme, toggles, focusables, steps, ended, ...(error ? { error } : {}) };
}

// Runs inside the page: its running animations, what each animates, and
// where every .reveal element is.
function measureMotion(describe) {
  const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const notProperties = new Set(["offset", "computedOffset", "easing", "composite"]);
  return {
    animations: document.getAnimations().map((animation) => {
      const keyframes = animation.effect?.getKeyframes?.() ?? [];
      const target = animation.effect?.target;
      return {
        name: animation.animationName ? `animation ${animation.animationName}` : animation.transitionProperty ? "transition" : `script animation${animation.id ? ` ${animation.id}` : ""}`,
        playState: animation.playState,
        properties: animation.transitionProperty ? [animation.transitionProperty] : [...new Set(keyframes.flatMap((keyframe) => Object.keys(keyframe)).filter((key) => !notProperties.has(key)).map(kebab))],
        target: target ? describe(target) : null,
      };
    }),
    reveal: [...document.querySelectorAll(".reveal")].map((el) => {
      const style = getComputedStyle(el);
      return { element: describe(el), transform: style.transform, translate: style.translate, rotate: style.rotate, scale: style.scale, opacity: parseFloat(style.opacity) };
    }),
    scrollY,
    maxScrollY: document.documentElement.scrollHeight - innerHeight,
  };
}

/** reduced-motion: one frame after load, then one frame after a scroll to the bottom. */
async function reducedMotion(tab, origin, page) {
  await emulate(tab, { motion: "reduce" });
  const response = await tab.goto(`${origin}${page}`, { waitUntil: "load" });
  await nextFrame(tab);
  const reduce = await tab.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const load = await inPage(tab, measureMotion);
  await tab.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await nextFrame(tab);
  const bottom = await inPage(tab, measureMotion);
  return { check: "reduced-motion", page, status: response?.status() ?? null, reduce, load, bottom };
}

const measurements = [];
const results = [];
const exitCode = await withChrome("walkthrough", out, async ({ baseUrl, measure }) => {
  // The puppeteer connection to the Chrome in use, made again when a lost
  // Chrome is replaced.
  let connection = null;
  /** Run `use(tab)` in a new browser context of `chrome` (empty storage), then close the context. */
  const inContext = async (chrome, use, viewport = VIEWPORT) => {
    if (connection?.chrome !== chrome) {
      const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
      if (connection === null) console.log(`walkthrough: ${pages.length} pages of ${out} in ${await browser.version()}`);
      connection = { chrome, browser };
    }
    const context = await connection.browser.createBrowserContext();
    try {
      const tab = await context.newPage();
      await tab.setViewport(viewport);
      return await use(tab);
    } finally {
      await context.close().catch(() => {});
    }
  };
  const record = (measurement) => {
    measurements.push(measurement);
    const result = judge(measurement, expected);
    results.push(result);
    console.log(result.line);
  };
  try {
    for (const page of pages) record(await measure(`first-frame ${page}`, (chrome) => inContext(chrome, (tab) => firstFrame(tab, baseUrl, page))));
    for (const measurement of await measure("theme-switch /", (chrome) => inContext(chrome, (tab) => themeSwitch(tab, baseUrl)))) record(measurement);
    for (const page of pages) record(await measure(`no-js ${page}`, (chrome) => inContext(chrome, (tab) => withoutJavaScript(tab, baseUrl, page))));
    for (const width of WIDTHS) {
      for (const page of pages) {
        record(await measure(`no-hscroll ${page} ${width}`, (chrome) => inContext(chrome, (tab) => horizontalScroll(tab, baseUrl, page, width), { width, height: HSCROLL_HEIGHT })));
      }
    }
    for (const theme of THEMES) {
      for (const page of pages) record(await measure(`focus ${page} ${theme}`, (chrome) => inContext(chrome, (tab) => focusWalk(tab, baseUrl, page, theme))));
    }
    for (const page of pages) record(await measure(`reduced-motion ${page}`, (chrome) => inContext(chrome, (tab) => reducedMotion(tab, baseUrl, page))));
  } finally {
    // Disconnect only: withChrome kills Chrome, which may be gone already.
    await connection?.browser.disconnect().catch(() => {});
  }
  if (process.env.WALKTHROUGH_DUMP) await writeFile(process.env.WALKTHROUGH_DUMP, `${JSON.stringify({ expected, measurements }, null, 2)}\n`);
  const line = summaryLine(results, pages.length, (performance.now() - started) / 1000);
  console.log(line);
  return line.startsWith("PASS") ? 0 : 1;
});

process.exit(exitCode);
