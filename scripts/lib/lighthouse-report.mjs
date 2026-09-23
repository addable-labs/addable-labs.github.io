// Threshold logic of the Lighthouse gate (redesign REQ-021, AC-19, AC-22,
// AC-23; plan D-08), kept apart from the browser run so tests/lighthouse.test.mjs
// exercises it on fixture reports without Chrome: how one report is judged,
// when a page is measured again (si-0rxb), and what the gate prints.

import { appendFile } from "node:fs/promises";
import process from "node:process";

/** The four categories the gate scores (REQ-021). */
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

/** Every category must score at least this, as a percentage (REQ-021, AC-22). */
export const THRESHOLD = 95;

/** Cumulative layout shift limit (REQ-018, AC-19: no animation moves layout). */
export const CLS_LIMIT = 0.1;

/**
 * How many performance scores decide a page whose first run's only problem
 * is its performance score (si-0rxb): that run and two more, median wins.
 */
export const PERFORMANCE_SAMPLES = 3;

/** A category's score as a percentage, or null when the report has none. */
function scoreOf(lhr, category) {
  const raw = lhr?.categories?.[category]?.score;
  // Lighthouse scores are 0–1; the gate speaks in percentages.
  return typeof raw === "number" && !Number.isNaN(raw) ? Math.round(raw * 100) : null;
}

/** A score as the line prints it, "–" for none. */
function show(score) {
  return score ?? "–";
}

/**
 * Judge one Lighthouse result (an `lhr` object).
 * @param {object} lhr — Lighthouse's report object (categories[].score 0–1, audits)
 * @param {number} [threshold] — minimum score in percent
 * @param {number} [clsLimit] — maximum cumulative layout shift
 * @returns {{ ok: boolean, scores: Record<string, number|null>, cls: number|null, problems: string[] }}
 */
export function evaluate(lhr, threshold = THRESHOLD, clsLimit = CLS_LIMIT) {
  const problems = [];
  const scores = {};
  for (const category of CATEGORIES) {
    const score = scoreOf(lhr, category);
    scores[category] = score;
    if (score === null) problems.push(`${category}: no score in the report`);
    else if (score < threshold) problems.push(`${category} ${score} < ${threshold}`);
  }
  const clsRaw = lhr?.audits?.["cumulative-layout-shift"]?.numericValue;
  const cls = typeof clsRaw === "number" && !Number.isNaN(clsRaw) ? clsRaw : null;
  if (cls === null) problems.push("cumulative-layout-shift: no value in the report");
  else if (cls > clsLimit) problems.push(`CLS ${cls.toFixed(3)} > ${clsLimit}`);
  return { ok: problems.length === 0, scores, cls, problems };
}

/**
 * Judge one page, measuring it as often as the rule needs (si-0rxb). The
 * first run decides, as `evaluate` judges it, unless its only problem is a
 * performance score under the threshold. Then `measure` runs twice more and
 * the median of the three performance scores decides: one slow run cannot
 * fail the page, while a page that really got slower pulls at least two of
 * the three under the bar. Accessibility, best practices, SEO and CLS are
 * read from the first run only. They do not depend on the runner's speed,
 * so a problem there fails the page at once, whatever its performance score.
 * @param {() => Promise<object>} measure — runs Lighthouse on the page once and resolves to its `lhr`
 * @param {number} [threshold] — minimum score in percent
 * @param {number} [clsLimit] — maximum cumulative layout shift
 * @returns {Promise<{ ok: boolean, scores: Record<string, number|null>, cls: number|null, problems: string[], samples: (number|null)[] }>}
 *   `evaluate`'s result for the first run — for a page measured again, with
 *   the median as its performance score and the verdict the median gives —
 *   and `samples`, every performance score in the order measured
 */
export async function judgePage(measure, threshold = THRESHOLD, clsLimit = CLS_LIMIT) {
  const first = evaluate(await measure(), threshold, clsLimit);
  const samples = [first.scores.performance];
  const slowOnly = first.problems.length === 1 && samples[0] !== null && samples[0] < threshold;
  if (!slowOnly) return { ...first, samples };
  while (samples.length < PERFORMANCE_SAMPLES) samples.push(scoreOf(await measure(), "performance"));
  // A run without a performance score ranks below every score.
  const ranked = [...samples].sort((a, b) => (a ?? -Infinity) - (b ?? -Infinity));
  const median = ranked[Math.floor((ranked.length - 1) / 2)];
  const ok = median !== null && median >= threshold;
  const problems = ok ? [] : [`performance ${show(median)} < ${threshold} (median of ${samples.map(show).join(", ")})`];
  return { ok, scores: { ...first.scores, performance: median }, cls: first.cls, problems, samples };
}

/**
 * The documented one-line format:
 * `lighthouse <url>: performance 99 · accessibility 100 · best-practices 100 · seo 100 · CLS 0.000 ok`
 * or the same line ending in `FAIL — <problems>`. A page measured again
 * (`judgePage`) shows the median that decided, then every sample in the
 * order measured: `performance 96 (85, 97, 96)`.
 */
export function formatLine(url, result) {
  const samples = result.samples?.length > 1 ? ` (${result.samples.map(show).join(", ")})` : "";
  const scores = CATEGORIES.map((category) => `${category} ${show(result.scores[category])}${category === "performance" ? samples : ""}`).join(" · ");
  const cls = result.cls === null ? "CLS –" : `CLS ${result.cls.toFixed(3)}`;
  return `lighthouse ${url}: ${scores} · ${cls} ${result.ok ? "ok" : `FAIL — ${result.problems.join("; ")}`}`;
}

/**
 * Append the page lines to the GitHub Actions step summary (si-0rxb), so
 * every run's summary page shows the scores and any re-measure, also when
 * the gate passes. A fenced block under a heading, because the summary is
 * Markdown and would run bare lines together. Outside Actions, where
 * GITHUB_STEP_SUMMARY is unset, nothing is written. Resolves to whether it
 * wrote.
 * @param {string[]} lines — `formatLine` lines, which name page paths, never the local server's URL
 */
export async function appendStepSummary(lines, env = process.env) {
  const file = env.GITHUB_STEP_SUMMARY;
  if (!file) return false;
  await appendFile(file, `### Lighthouse\n\n\`\`\`text\n${lines.join("\n")}\n\`\`\`\n`);
  return true;
}
