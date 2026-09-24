#!/usr/bin/env node
// Gate: lighthouse (redesign REQ-021, REQ-024; AC-19, AC-22, AC-23).
// Serves the production build over http, launches headless Chrome
// and runs Lighthouse 13 (default mobile configuration, the four scored
// categories) against seven pages; every category must score ≥ 95 and the
// page's cumulative layout shift must stay ≤ 0.1. A page whose only problem
// is a performance score under 95 is measured twice more in the same Chrome
// and the median of its three performance scores decides (si-0rxb; the rule
// is judgePage in scripts/lib/lighthouse-report.mjs). One line per page with
// the four scores and CLS, a re-measured page's performance followed by its
// three samples; under GitHub Actions the lines also go to the step summary.
// A Lighthouse run that fails, as when its Chrome is lost, is run again, once,
// in a new Chrome; a page whose run fails twice is not measured: one FAIL
// line names it and the cause, and the gate stops there (si-828d; withChrome
// in scripts/lib/chrome.mjs). Exit 1 on any failure. Without Chrome the gate
// prints an explicit SKIP line and exits 3 (1 under CHECK_REQUIRE_CHROME=1);
// set CHROME_PATH to point at a browser. Optional argument: <built-site dir>.

import lighthouse from "lighthouse";
import { withChrome } from "../lib/chrome.mjs";
import { appendStepSummary, CATEGORIES, formatLine, judgePage } from "../lib/lighthouse-report.mjs";
import { resolveDirs } from "../lib/site.mjs";

// The pages the gate measures (REQ-021): both landing pages, the about page,
// the blog index, a category page, an article and the 404 page.
const PAGES = ["/", "/sv/", "/about/", "/blog/", "/blog/app-development/", "/blog/how-this-site-was-built-by-agents/", "/404.html"];

const { out } = resolveDirs();

// The page lines, for the step summary too: the gate's own, and withChrome's
// for a page measured again in a new Chrome or not measured.
const lines = [];
const report = (line) => {
  console.log(line);
  lines.push(line);
};

const exitCode = await withChrome(
  "lighthouse",
  out,
  async ({ baseUrl, measure }) => {
    let failures = 0;
    for (const page of PAGES) {
      const url = `${baseUrl}${page}`;
      const run = async ({ port }) => (await lighthouse(url, { port, output: "json", logLevel: "error", onlyCategories: CATEGORIES }))?.lhr;
      const result = await judgePage(() => measure(page, run));
      report(formatLine(page, result));
      if (!result.ok) failures += 1;
    }
    if (failures > 0) {
      console.log(`FAIL lighthouse (${failures} problem${failures === 1 ? "" : "s"})`);
      return 1;
    }
    console.log("PASS lighthouse");
    return 0;
  },
  { log: report },
);

await appendStepSummary(lines);
process.exit(exitCode);
