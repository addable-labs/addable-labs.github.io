#!/usr/bin/env node
// Gate: layout (redesign A-02, AC-30; plan D-14; article layout si-55iu).
// Measures, in headless Chrome at 360, 768, 1024, 1280 and 1920 CSS px:
//   - the balanced cards of both landing pages: in the services grid and the
//     apps grid every title is one line, cards sharing a grid row have equal
//     heights, equal "What you get" heading / summary tops and bottom-aligned
//     action rows (± 1 px), and every chip row is one line;
//   - every article page in both languages (founder feedback 2026-09-21,
//     si-55iu): the page never scrolls horizontally, every text block of the
//     body sits on the 44rem measure at the body's left edge, and every
//     figure is where base.css puts it — from 64rem a side figure in the lane
//     to the right (its right edge at the body's, 20–24.5rem wide, never
//     above the paragraph it accompanies and never under that paragraph's
//     lines) and a wide figure across the whole body; below 64rem every
//     figure across the body between the paragraphs — with every panel
//     rendered at a scale that keeps a 13-unit label at 12 px or more.
// Reduced motion is emulated so .reveal elements render in place and fonts
// are awaited before measuring. One line per page × width; exit 1 on any
// failure; the same SKIP (exit 3) as the Lighthouse gate when no Chrome is
// found. Optional arguments: <built-site dir> [<source dir>] (the source dir
// lists the articles).

import puppeteer from "puppeteer-core";
import { withChrome } from "../lib/chrome.mjs";
import { evaluate } from "../lib/layout-report.mjs";
import { loadSite, readArticleSources, resolveDirs } from "../lib/site.mjs";

const PAGES = ["/", "/sv/"];
const WIDTHS = [360, 768, 1024, 1280, 1920];
const HEIGHT = 1000;

// Runs inside the page: plain numbers per card, in the shape
// scripts/lib/layout-report.mjs documents. Selectors follow the built HTML
// (partials/home/services.njk and apps.njk).
function measureGrids() {
  const box = (el) => el.getBoundingClientRect();
  const lineHeight = (el) => parseFloat(getComputedStyle(el).lineHeight);
  const round = (value) => Math.round(value * 100) / 100;
  const grids = {};
  const specs = [
    ["services", ".service-grid > .service", "h3", ".gets-heading", ".text-link", null],
    ["apps", ".app-grid > .app", ".app-name", ".app-text", ".app-action, .app-private", ".app-top"],
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
// figure shortcode (`.figure`, `.figure-side` / `.figure-wide`, its panels).
function measureArticle() {
  const box = (el) => el.getBoundingClientRect();
  const round = (value) => Math.round(value * 100) / 100;
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
      const b = box(el);
      const next = el.nextElementSibling;
      // The right edge of the accompanying block's lines of text (its line
      // boxes, not its box, which extends under a float).
      let nextLinesRight = null;
      if (next && !next.classList.contains("figure")) {
        const range = document.createRange();
        range.selectNodeContents(next);
        const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
        nextLinesRight = rects.length > 0 ? round(Math.max(...rects.map((rect) => rect.right))) : null;
        range.detach();
      }
      // Each panel's render scale: its box width over its viewBox width.
      const scales = [...el.querySelectorAll("svg[viewBox]")].map((svg) => box(svg).width / svg.viewBox.baseVal.width);
      return {
        id: el.id,
        placement: el.classList.contains("figure-wide") ? "wide" : "side",
        left: round(b.left),
        right: round(b.right),
        top: round(b.top + scrollY),
        nextTop: next ? round(box(next).top + scrollY) : null,
        nextLinesRight,
        scale: scales.length > 0 ? round(Math.min(...scales)) : null,
      };
    });
  return {
    rem,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    body: bodyBox ? { left: round(bodyBox.left), right: round(bodyBox.right) } : null,
    blocks,
    figures,
  };
}

const { out, src } = resolveDirs();
const site = await loadSite(src);
const ARTICLES = [];
for (const lang of site.languages.codes) {
  for (const article of await readArticleSources(src, site, lang)) ARTICLES.push(article.path);
}

const exitCode = await withChrome("layout", out, async ({ baseUrl, port }) => {
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}` });
  const measurements = [];
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    for (const width of WIDTHS) {
      await page.setViewport({ width, height: HEIGHT, deviceScaleFactor: 1 });
      for (const path of PAGES) {
        await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready.then(() => true));
        const grids = await page.evaluate(measureGrids);
        measurements.push({ page: path, width, grids });
      }
      for (const path of ARTICLES) {
        await page.goto(`${baseUrl}${path}`, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready.then(() => true));
        const article = await page.evaluate(measureArticle);
        measurements.push({ page: path, width, article });
      }
    }
    await page.close();
  } finally {
    await browser.disconnect();
  }
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
