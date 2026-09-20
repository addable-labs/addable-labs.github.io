#!/usr/bin/env node
// Gate: layout (redesign A-02, AC-30; plan D-14). Measures the balanced
// cards of both landing pages in headless Chrome at 360, 768, 1024, 1280 and
// 1920 CSS px: in the services grid and the apps grid every title is one
// line, cards sharing a grid row have equal heights, equal "What you get"
// heading / summary tops and bottom-aligned action rows (± 1 px), and every
// chip row is one line. Reduced motion is emulated so .reveal elements render
// in place and fonts are awaited before measuring. One line per page × width;
// exit 1 on any failure; the same SKIP (exit 3) as the Lighthouse gate when
// no Chrome is found. Optional argument: <built-site dir>.

import puppeteer from "puppeteer-core";
import { withChrome } from "../lib/chrome.mjs";
import { evaluate } from "../lib/layout-report.mjs";
import { resolveDirs } from "../lib/site.mjs";

export const PAGES = ["/", "/sv/"];
export const WIDTHS = [360, 768, 1024, 1280, 1920];
export const HEIGHT = 1000;

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

const { out } = resolveDirs();

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
