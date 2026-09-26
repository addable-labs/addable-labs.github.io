#!/usr/bin/env node
// Gate: layout (redesign AC-30; article layout si-55iu and founder feedback
// 2026-09-22; article tables si-t64i; lists of article cards si-a4it).
// Measures, in headless Chrome at 360, 768, 1024, 1280 and 1920 CSS px:
//   - the balanced cards of both landing pages: in the services grid and the
//     apps grid every title is one line, cards sharing a grid row have equal
//     heights, equal "What you get" heading / summary tops and bottom-aligned
//     action rows (± 1 px), and every chip row is one line;
//   - the lists of article cards (si-a4it): the landing's "Notes from the
//     work" in both languages, both blog indexes, in each language the
//     category page that lists the most articles, and the "More from the
//     blog" band under every article: cards sharing a row have equal heights
//     and each part of a card — image, metadata, title, description — starts
//     at the same top (± 1 px), and a row holds one card below 768 px
//     (48rem), two from 768 px and three from 1024 px (64rem), the last row
//     that many or fewer;
//   - every article page in both languages: the page never scrolls
//     horizontally, every text block of the body is at most 44rem wide and
//     centred in the body on one shared left edge, and every figure is where
//     base.css puts it — a wide figure across the whole body at every width;
//     an inline figure at most the measure wide and centred like a text
//     block, its panel 20–24.5rem wide with the caption beside it from
//     768 px (48rem) and under it below — with every panel rendered at a
//     scale that keeps a 13-unit label at 12 px or more; every table
//     starts on the text column's left edge, and nothing of it reaches past
//     the column's right edge but what scrolls inside a box of its own; and
//     every block of games (si-y6pp) spans the body, with the game's
//     versions side by side from 768 px (48rem) and stacked below, and each
//     screenshot or playing game inside its version at the game's 4:3; and
//     the article's image (si-awlu) lies under its summary, across the text
//     column, at 1200:630.
// Reduced motion is emulated so .reveal elements render in place and fonts
// are awaited before measuring. One line per page × width; exit 1 on any
// failure. A page × width whose measure fails, as when its Chrome is lost, is
// measured again, once, in a new Chrome; one that fails twice is not
// measured: one FAIL line names it and the cause, and the gate stops there
// (si-828d; withChrome in scripts/lib/chrome.mjs). The same SKIP (exit 3) as
// the Lighthouse gate when no Chrome is found. Optional arguments:
// <built-site dir> [<source dir>] (the source dir lists the articles).
// LAYOUT_DUMP=<file> writes the raw measurements as JSON (to regenerate
// tests/fixtures/layout/article.json, tables.json, games.json, image.json
// and posts.json).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { withChrome } from "../lib/chrome.mjs";
import { evaluate } from "../lib/layout-report.mjs";
import { langPrefix, loadSite, readArticleSources, resolveDirs } from "../lib/site.mjs";

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
// whose overflow-x is auto or scroll (div.table-scroll, eleventy.config.js);
// a block of games is the games shortcode's `.games`, its versions the
// `.game` figures in it and their screens the `.game-shot` images and
// `.game-frame` frames (scripts/lib/games.mjs); the article's image is the
// header's `img.article-image`, measured with the bottom of the summary
// above it (layouts/article.njk).
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
    .filter((el) => !el.classList.contains("figure") && !el.classList.contains("games"))
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
  const games = children
    .filter((el) => el.classList.contains("games"))
    .map((el) => ({
      id: el.id,
      ...rect(el),
      versions: [...el.querySelectorAll(":scope > .game")].map((version) => ({
        ...rect(version),
        screens: [...version.querySelectorAll(".game-shot, .game-frame")].map(rect),
      })),
    }));
  const image = document.querySelector(".article-header img.article-image");
  const summary = rect(document.querySelector(".article-header .article-summary"));
  return {
    rem,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    body: bodyBox ? { left: round(bodyBox.left), right: round(bodyBox.right) } : null,
    blocks,
    figures,
    tables,
    games,
    image: image ? { ...rect(image), summaryBottom: summary ? summary.bottom : null } : null,
  };
}

// Runs inside a page that lists article cards: the shape
// scripts/lib/layout-report.mjs documents under `posts`, for the page's
// .post-list (partials/post-list.njk): each .post card's box and the top of
// each of its parts, img.post-image, .post-meta, .post-title and .post-text;
// null when the page has no list.
function measurePosts() {
  const box = (el) => el.getBoundingClientRect();
  const round = (value) => Math.round(value * 100) / 100;
  const top = (el) => (el ? round(box(el).top + scrollY) : NaN);
  const list = document.querySelector(".post-list");
  if (!list) return null;
  return [...list.querySelectorAll(":scope > .post")].map((card, index) => ({
    index,
    top: top(card),
    height: round(box(card).height),
    parts: {
      image: top(card.querySelector(".post-image")),
      metadata: top(card.querySelector(".post-meta")),
      title: top(card.querySelector(".post-title")),
      description: top(card.querySelector(".post-text")),
    },
  }));
}

const GRIDS = ["grids", measureGrids];
const ARTICLE = ["article", measureArticle];
const POSTS = ["posts", measurePosts];

const { out, src } = resolveDirs();
const site = await loadSite(src);
const categories = JSON.parse(await readFile(path.join(src, "_data", "categories.json"), "utf8"));
// The pages and what each is measured for, in the order they are measured
// at each width: both landing pages, then each language's blog index and
// the category page that lists the most of its articles (the first in
// categories.json of those that list as many), then every article page.
// Each is measured for its list of article cards where the templates list
// some: the landing page, the blog index and the category page where the
// language lists an article at all, an article's page where it lists
// another (layouts/article.njk).
const LANDINGS = [];
const LISTS = [];
const ARTICLES = [];
for (const lang of site.languages.codes) {
  const prefix = langPrefix(lang, site);
  const articles = await readArticleSources(src, site, lang);
  const listed = articles.filter((article) => article.listed);
  LANDINGS.push({ page: `${prefix}/`, kinds: listed.length > 0 ? [GRIDS, POSTS] : [GRIDS] });
  if (listed.length > 0) {
    const count = (key) => listed.filter((article) => article.category === key).length;
    const busiest = categories.map(({ key }) => key).reduce((best, key) => (count(key) > count(best) ? key : best));
    LISTS.push({ page: `${prefix}/blog/`, kinds: [POSTS] }, { page: `${prefix}/blog/${busiest}/`, kinds: [POSTS] });
  }
  // A draft has no page in the production build (si-mzf1), so there is
  // nothing to measure and asking for it would be a 404.
  for (const article of articles) {
    if (article.omitted) continue;
    const band = listed.some((other) => other.path !== article.path);
    ARTICLES.push({ page: article.path, kinds: band ? [ARTICLE, POSTS] : [ARTICLE] });
  }
}
const PAGES = [...LANDINGS, ...LISTS, ...ARTICLES];

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
  /** Load `page` at `width` and take each of `kinds`' measurements in it: { page, width, <kind>: … }. */
  const measurePage = (page, width, kinds) =>
    measure(`${page} ${width}`, async (chrome) => {
      if (tab?.chrome !== chrome) tab = await openTab(chrome);
      if (tab.width !== width) {
        await tab.page.setViewport({ width, height: HEIGHT, deviceScaleFactor: 1 });
        tab.width = width;
      }
      await tab.page.goto(`${baseUrl}${page}`, { waitUntil: "load" });
      await tab.page.evaluate(() => document.fonts.ready.then(() => true));
      const run = { page, width };
      for (const [kind, measureIn] of kinds) run[kind] = await tab.page.evaluate(measureIn);
      return run;
    });
  const measurements = [];
  try {
    for (const width of WIDTHS) {
      for (const { page, kinds } of PAGES) measurements.push(await measurePage(page, width, kinds));
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
