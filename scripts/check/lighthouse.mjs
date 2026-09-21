#!/usr/bin/env node
// Gate: lighthouse (redesign REQ-021, REQ-024; AC-19, AC-22, AC-23; plan
// D-08). Serves the production build over http, launches headless Chrome
// and runs Lighthouse 13 (default mobile configuration, the four scored
// categories) against seven pages; every category must score ≥ 95 and the
// page's cumulative layout shift must stay ≤ 0.1. One line per page with
// the four scores and CLS; exit 1 on any failure. Without Chrome the gate
// prints an explicit SKIP line and exits 3 (1 under CHECK_REQUIRE_CHROME=1);
// set CHROME_PATH to point at a browser. Optional argument: <built-site dir>.

import lighthouse from "lighthouse";
import { withChrome } from "../lib/chrome.mjs";
import { CATEGORIES, evaluate, formatLine } from "../lib/lighthouse-report.mjs";
import { resolveDirs } from "../lib/site.mjs";

// The pages the gate measures (REQ-021): both landing pages, the about page,
// the blog index, a category page, an article and the 404 page.
const PAGES = ["/", "/sv/", "/about/", "/blog/", "/blog/app-development/", "/blog/how-this-site-was-built-by-agents/", "/404.html"];

const { out } = resolveDirs();

const exitCode = await withChrome("lighthouse", out, async ({ baseUrl, port }) => {
  let failures = 0;
  for (const page of PAGES) {
    const url = `${baseUrl}${page}`;
    const runnerResult = await lighthouse(url, { port, output: "json", logLevel: "error", onlyCategories: CATEGORIES });
    const result = evaluate(runnerResult?.lhr);
    console.log(formatLine(page, result));
    if (!result.ok) failures += 1;
  }
  if (failures > 0) {
    console.log(`FAIL lighthouse (${failures} problem${failures === 1 ? "" : "s"})`);
    return 1;
  }
  console.log("PASS lighthouse");
  return 0;
});

process.exit(exitCode);
