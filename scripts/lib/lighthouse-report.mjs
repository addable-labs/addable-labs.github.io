// Threshold logic of the Lighthouse gate (redesign REQ-021, AC-19, AC-22,
// AC-23; plan D-08), kept apart from the browser run so tests/lighthouse.test.mjs
// exercises it on fixture reports without Chrome.

/** The four categories the gate scores (REQ-021). */
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

/** Every category must score at least this, as a percentage (REQ-021, AC-22). */
export const THRESHOLD = 95;

/** Cumulative layout shift limit (REQ-018, AC-19: no animation moves layout). */
export const CLS_LIMIT = 0.1;

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
    const raw = lhr?.categories?.[category]?.score;
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      scores[category] = null;
      problems.push(`${category}: no score in the report`);
      continue;
    }
    // Lighthouse scores are 0–1; the gate speaks in percentages.
    const score = Math.round(raw * 100);
    scores[category] = score;
    if (score < threshold) problems.push(`${category} ${score} < ${threshold}`);
  }
  const clsRaw = lhr?.audits?.["cumulative-layout-shift"]?.numericValue;
  const cls = typeof clsRaw === "number" && !Number.isNaN(clsRaw) ? clsRaw : null;
  if (cls === null) problems.push("cumulative-layout-shift: no value in the report");
  else if (cls > clsLimit) problems.push(`CLS ${cls.toFixed(3)} > ${clsLimit}`);
  return { ok: problems.length === 0, scores, cls, problems };
}

/**
 * The documented one-line format:
 * `lighthouse <url>: performance 99 · accessibility 100 · best-practices 100 · seo 100 · CLS 0.000 ok`
 * or the same line ending in `FAIL — <problems>`.
 */
export function formatLine(url, result) {
  const scores = CATEGORIES.map((category) => `${category} ${result.scores[category] ?? "–"}`).join(" · ");
  const cls = result.cls === null ? "CLS –" : `CLS ${result.cls.toFixed(3)}`;
  return `lighthouse ${url}: ${scores} · ${cls} ${result.ok ? "ok" : `FAIL — ${result.problems.join("; ")}`}`;
}
