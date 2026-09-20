// The card-balance rules of the layout gate (redesign A-02, AC-30; plan
// D-14), judged on plain measurements so tests/layout.test.mjs runs on
// fixtures without Chrome. scripts/check/layout.mjs collects one measurement
// per page × viewport width:
//
//   {
//     page: "/", width: 1280,
//     grids: {
//       services: [{ index, top, height, title: { height, lineHeight }, midTop, actionBottom, chip: null }, …],
//       apps:     [{ …, chip: { height, lineHeight } }, …]
//     }
//   }
//
// where `top`/`height` are the card's box, `title` is the h3/.app-name box
// and its computed line-height, `midTop` the top of the "What you get"
// heading (services) or the summary (apps), `actionBottom` the bottom of
// the action row, and `chip` the .app-top row's box height and the height
// of one line of it (its computed line-height, or the chip's own height when
// that is taller — a pill is taller than a line of text).

/** Pixel tolerance for "equal" (AC-30: ± 1 px). */
export const TOLERANCE = 1;

/** A title or chip row is one line when its box is at most this × its line height. */
export const LINE_RATIO = 1.1;

/** Group cards by grid row: cards whose tops are within the tolerance of each other. */
export function rowsOf(cards, tolerance = TOLERANCE) {
  const rows = [];
  for (const card of [...cards].sort((a, b) => a.top - b.top || a.index - b.index)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].top - card.top) <= tolerance);
    if (row) row.push(card);
    else rows.push([card]);
  }
  return rows;
}

const spread = (values) => Math.max(...values) - Math.min(...values);

/**
 * Judge the measurements of one or more page × width runs.
 * @param {Array<object>} measurements
 * @param {number} [tolerance]
 * @returns {{ ok: boolean, problems: string[], lines: string[] }} — `lines` are the
 *   documented per-run lines (`layout /sv/ 1024: ok (3 service cards, 6 app cards)`)
 */
export function evaluate(measurements, tolerance = TOLERANCE) {
  const problems = [];
  const lines = [];
  for (const run of measurements) {
    const where = `${run.page} ${run.width}`;
    const before = problems.length;
    for (const [grid, cards] of Object.entries(run.grids ?? {})) {
      if (!Array.isArray(cards) || cards.length === 0) {
        problems.push(`${where}: ${grid} grid has no cards`);
        continue;
      }
      for (const card of cards) {
        const name = `${grid} card ${card.index + 1}`;
        // AC-30: the title's box is one line tall.
        if (!(card.title.height <= LINE_RATIO * card.title.lineHeight)) {
          problems.push(`${where}: ${name} title wraps (${card.title.height} px for a ${card.title.lineHeight} px line)`);
        }
        // D-14 (decomposition decision 4): the chip row is one line.
        if (card.chip && !(card.chip.height <= LINE_RATIO * card.chip.lineHeight)) {
          problems.push(`${where}: ${name} chip row wraps (${card.chip.height} px for a ${card.chip.lineHeight} px line)`);
        }
      }
      for (const row of rowsOf(cards, tolerance)) {
        if (row.length < 2) continue;
        const names = row.map((card) => card.index + 1).join(", ");
        // AC-30: cards sharing a grid row have equal heights …
        if (spread(row.map((card) => card.height)) > tolerance) {
          problems.push(`${where}: ${grid} cards ${names} differ in height (${row.map((card) => card.height).join(" / ")} px)`);
        }
        // … their "What you get" heading / summary tops are equal …
        if (spread(row.map((card) => card.midTop)) > tolerance) {
          problems.push(`${where}: ${grid} cards ${names} ${grid === "services" ? '"What you get" headings' : "summaries"} start at different heights (${row.map((card) => card.midTop).join(" / ")} px)`);
        }
        // … and their action rows end on the same line.
        if (spread(row.map((card) => card.actionBottom)) > tolerance) {
          problems.push(`${where}: ${grid} cards ${names} action rows are not bottom-aligned (${row.map((card) => card.actionBottom).join(" / ")} px)`);
        }
      }
    }
    const counts = Object.entries(run.grids ?? {}).map(([grid, cards]) => `${Array.isArray(cards) ? cards.length : 0} ${grid === "services" ? "service" : grid === "apps" ? "app" : grid} cards`).join(", ");
    const runProblems = problems.slice(before);
    lines.push(runProblems.length === 0 ? `layout ${run.page} ${run.width}: ok (${counts})` : `layout ${run.page} ${run.width}: FAIL — ${runProblems.map((problem) => problem.slice(where.length + 2)).join("; ")}`);
  }
  return { ok: problems.length === 0, problems, lines };
}
