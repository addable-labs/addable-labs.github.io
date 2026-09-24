#!/usr/bin/env node
// Gate: layout (redesign A-02, AC-30; plan D-14; article layout si-55iu and
// founder feedback 2026-09-22; article tables si-t64i).
// Measures, in headless Chrome at 360, 768, 1024, 1280 and 1920 CSS px:
//   - the balanced cards of both landing pages: in the services grid and the
//     apps grid every title is one line, cards sharing a grid row have equal
//     heights, equal "What you get" heading / summary tops and bottom-aligned
//     action rows (± 1 px), and every chip row is one line;
//   - every article page in both languages: the page never scrolls
//     horizontally, every text block of the body is at most 44rem wide and
//     centred in the body on one shared left edge, and every figure is where
//     base.css puts it — a wide figure across the whole body at every width;
//     an inline figure at most the measure wide and centred like a text
//     block, its panel 20–24.5rem wide with the caption beside it from
//     768 px (48rem) and under it below — with every panel rendered at a
//     scale that keeps a 13-unit label at 12 px or more; and every table
//     starts on the text column's left edge, and nothing of it reaches past
//     the column's right edge but what scrolls inside a box of its own.
// Reduced motion is emulated so .reveal elements render in place and fonts
// are awaited before measuring. One line per page × width; exit 1 on any
// failure. A page × width whose measure fails, as when its Chrome is lost, is
// measured again, once, in a new Chrome; one that fails twice is not
// measured: one FAIL line names it and the cause, and the gate stops there
// (si-828d; withChrome in scripts/lib/chrome.mjs). The same SKIP (exit 3) as
// the Lighthouse gate when no Chrome is found. Optional arguments:
// <built-site dir> [<source dir>] (the source dir lists the articles).
// LAYOUT_DUMP=<file> writes the raw measurements as JSON (to regenerate
// tests/fixtures/layout/article.json and tables.json).

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { withChrome } from "../lib/chrome.mjs";
import { evaluate } from "../lib/layout-report.mjs";
import { loadSite, readArticleSources, resolveDirs } from "../lib/site.mjs";

const PAGES = ["/", "/sv/"];
const WIDTHS = [360, 768, 1024, 1280, 1920];
const HEIGHT = 1000;

// Runs inside the page: plain numbers per card, in the shape
// scripts/lib/layout-report.mjs documents. Selectors follow the built HTML
// (partials/home/services.njk and apps.njk). An app card's action row is
// div.app-actions (si-3hpa), whether it holds one link, two or the private
// note, so the gate measures the row's bottom, not a link's.
function measureGrids() {
  const box = (el) => el.getBoundingClientRect();
  const lineHeight = (el) => parseFloat(getComputedStyle(el).lineHeight);
  const round = (value) => Math.round(value * 100) / 100;
  const grids = {};
  const specs = [
    ["services", ".service-grid > .service", "h3", ".gets-heading", ".text-link", null],
    ["apps", ".app-grid > .app", ".app-name", ".app-text", ".app-actions", ".app-top"],
  ];
  for (const [grid, cardSelector, titleSelector, midSelector, actionSelector, chipSelector] of specs) {
    grids[grid] = [...document.querySelectorAll(cardSelector)].map((card, index) => {
      const title = card.querySelector(titleSelector);
      const mid = card.querySelector(midSelector);
      const action = card.querySelector(actionSelector);
      const chipRow = chipSelector ? card.querySelector(chipSelector) : null;
      const chip = chipRow?.querySelector(".chip");
      const cardBox = box(card);
      return {
        index,
        top: round(cardBox.top + window.scrollY),
        height: round(cardBox.height),
        title: title ? { height: round(box(title).height), lineHeight: round(lineHeight(title)) } : { height: NaN, lineHeight: NaN },
        midTop: mid ? round(box(mid).top + window.scrollY) : NaN,
        actionBottom: action ? round(box(action).bottom + window.scrollY) : NaN,
        chip: chipRow ? { height: round(box(chipRow).height), lineHeight: round(Math.max(lineHeight(chipRow), chip ? box(chip).height : 0)) } : null,
      };
    });
  }
  return grids;
}

// Runs inside an article page: the shape scripts/lib/layout-report.mjs
// documents under `article`. Selectors follow layouts/article.njk and the
// figure shortcode (`.figure`, `.figure-inline` / `.figure-wide`, its
// `.figure-panels` row and `figcaption`); a table is any `table` in the body,
// with the box it scrolls in: itself or its nearest ancestor below the body
// whose overflow-x is auto or scroll (div.table-scroll, eleventy.config.js).
function measureArticle() {
  const box = (el) => el.getBoundingClientRect();
  const round = (value) => Math.round(value * 100) / 100;
  const rect = (el) => {
    if (!el) return null;
    const b = box(el);
    return { left: round(b.left), right: round(b.right), top: round(b.top + scrollY), bottom: round(b.bottom + scrollY) };
  };
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const body = document.querySelector(".article-body");
  const bodyBox = body ? box(body) : null;
  const children = body ? [...body.children] : [];
  const blocks = children
    .filter((el) => !el.classList.contains("figure"))
    .map((el) => ({ tag: el.tagName.toLowerCase(), left: round(box(el).left), right: round(box(el).right), top: round(box(el).top + scrollY) }));
  const figures = children
    .filter((el) => el.classList.contains("figure"))
    .map((el) => {
      // Each panel's render scale: its box width over its viewBox width.
      const scales = [...el.querySelectorAll("svg[viewBox]")].map((svg) => box(svg).width / svg.viewBox.baseVal.width);
      return {
        id: el.id,
        placement: el.classList.contains("figure-wide") ? "wide" : "inline",
        ...rect(el),
        panel: rect(el.querySelector(".figure-panels")),
        caption: rect(el.querySelector("figcaption")),
        scale: scales.length > 0 ? round(Math.min(...scales)) : null,
      };
    });
  const scrollBox = (el) => {
    for (let node = el; node && node !== body; node = node.parentElement) {
      if (["auto", "scroll"].includes(getComputedStyle(node).overflowX)) return rect(node);
    }
    return null;
  };
  const tables = body ? [...body.querySelectorAll("table")].map((el) => ({ ...rect(el), scrollBox: scrollBox(el) })) : [];
  return {
    rem,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    body: bodyBox ? { left: round(bodyBox.left), right: round(bodyBox.right) } : null,
    blocks,
    figures,
    tables,
  };
}

const { out, src } = resolveDirs();
const site = await loadSite(src);
const ARTICLES = [];
for (const lang of site.languages.codes) {
  // A draft has no page in the production build (si-mzf1), so there is
  // nothing to measure and asking for it would be a 404.
  for (const article of await readArticleSources(src, site, lang)) {
    if (!article.omitted) ARTICLES.push(article.path);
  }
}

const exitCode = await withChrome("layout", out, async ({ baseUrl, measure }) => {
  // The tab every page is measured in, opened in the first Chrome and again
  // in the new one when a Chrome is lost; `width` is its viewport's.
  let tab = null;
  const openTab = async (chrome) => {
    const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    return { chrome, browser, page, width: null };
  };
  /** Load `path` at `width` and run `measureIn` in the page. */
  const measurePage = (path, width, measureIn) =>
    measure(`${path} ${width}`, async (chrome) => {
      if (tab?.chrome !== chrome) tab = await openTab(chrome);
      if (tab.width !== width) {
        await tab.page.setViewport({ width, height: HEIGHT, deviceScaleFactor: 1 });
        tab.width = width;
      }
      await tab.page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
      await tab.page.evaluate(() => document.fonts.ready.then(() => true));
      return tab.page.evaluate(measureIn);
    });
  const measurements = [];
  try {
    for (const width of WIDTHS) {
      for (const path of PAGES) measurements.push({ page: path, width, grids: await measurePage(path, width, measureGrids) });
      for (const path of ARTICLES) measurements.push({ page: path, width, article: await measurePage(path, width, measureArticle) });
    }
  } finally {
    // Disconnect only: withChrome kills Chrome, and the tab's Chrome may be
    // gone already.
    await tab?.browser.disconnect().catch(() => {});
  }
  if (process.env.LAYOUT_DUMP) await writeFile(process.env.LAYOUT_DUMP, `${JSON.stringify(measurements, null, 2)}\n`);
  const result = evaluate(measurements);
  for (const line of result.lines) console.log(line);
  if (!result.ok) {
    console.log(`FAIL layout (${result.problems.length} problem${result.problems.length === 1 ? "" : "s"})`);
    return 1;
  }
  console.log("PASS layout");
  return 0;
});

process.exit(exitCode);
