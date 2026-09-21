// The rules of the layout gate — the card balance of the landing pages
// (redesign A-02, AC-30; plan D-14) and the article measure and figure
// placement (founder feedback 2026-09-21, si-55iu) — judged on plain
// measurements so tests/layout.test.mjs runs on fixtures without Chrome.
// scripts/check/layout.mjs collects one measurement per page × viewport
// width, of one of two kinds. A landing page:
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
// that is taller — a pill is taller than a line of text). An article page:
//
//   {
//     page: "/blog/<slug>/", width: 1024,
//     article: {
//       rem, scrollWidth, innerWidth,
//       body: { left, right },                                  // .article-body
//       blocks:  [{ tag, left, right, top }, …],                // its text blocks
//       figures: [{ id, placement, left, right, top, nextTop, nextLinesRight, scale }, …]
//     }
//   }
//
// where `blocks` are the body's children other than figures, `placement` is
// "side" or "wide", `nextTop` the top of the block that follows the figure
// (the paragraph a side figure accompanies), `nextLinesRight` the right edge
// of that block's lines of text (its line boxes, which a float shortens,
// unlike its box) and `scale` the smallest render scale of the figure's SVG
// panels (box width over viewBox width).

/** Pixel tolerance for "equal" (AC-30: ± 1 px). */
export const TOLERANCE = 1;

/** A title or chip row is one line when its box is at most this × its line height. */
export const LINE_RATIO = 1.1;

/** The article's reading measure (base.css `--measure`), in rem. */
export const MEASURE_REM = 44;

/** The figure lane's floor and ceiling from 64rem (base.css .figure-side), in rem. */
export const LANE_REM = { min: 20, max: 24.5 };

/** The viewport width from which the figure lane exists, in px (base.css). */
export const LANE_FROM_PX = 1024;

/** A figure label is 13 user units (base.css .fig-label) and must render at 12 px or more. */
export const LABEL_UNITS = 13;
export const LABEL_MIN_PX = 12;

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
 * The elements of a card that were not measured: a selector that matches
 * nothing measures NaN in the page, which arrives as null over the protocol;
 * either would compare as "equal" and let the card pass silently (AC-30).
 */
function unmeasured(card, grid) {
  const numbers = [
    ["title", card.title?.height],
    ["title line height", card.title?.lineHeight],
    [grid === "services" ? '"What you get" heading' : "summary", card.midTop],
    ["action row", card.actionBottom],
  ];
  if (card.chip) numbers.push(["chip row", card.chip.height], ["chip row line height", card.chip.lineHeight]);
  return numbers.filter(([, value]) => !Number.isFinite(value)).map(([element]) => element);
}

/**
 * The article rules (si-55iu) for one run; returns its problems, each
 * prefixed with `where`.
 */
function evaluateArticle(run, where, tolerance) {
  const problems = [];
  const article = run.article;
  if (!article || !article.body || !Number.isFinite(article.rem)) {
    problems.push(`${where}: no measurable article body (element not found)`);
    return problems;
  }
  const { rem, body } = article;
  const measure = MEASURE_REM * rem;
  if (article.scrollWidth > article.innerWidth) {
    problems.push(`${where}: the page scrolls horizontally (${article.scrollWidth} px wide for a ${article.innerWidth} px viewport)`);
  }
  if (!Array.isArray(article.blocks) || article.blocks.length === 0) {
    problems.push(`${where}: the article body has no text blocks`);
  }
  for (const [index, block] of (article.blocks ?? []).entries()) {
    const name = `block ${index + 1} (${block.tag})`;
    if (![block.left, block.right].every(Number.isFinite)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    // The measure: every text block at most 44rem wide, at the body's left edge.
    if (block.right - block.left > measure + tolerance) {
      problems.push(`${where}: ${name} is ${block.right - block.left} px wide, wider than the ${measure} px measure`);
    }
    if (Math.abs(block.left - body.left) > tolerance) {
      problems.push(`${where}: ${name} starts at ${block.left} px, not at the body's left edge (${body.left} px)`);
    }
  }
  const lane = run.width >= LANE_FROM_PX;
  for (const figure of article.figures ?? []) {
    const name = figure.id || "figure";
    if (![figure.left, figure.right, figure.top].every(Number.isFinite)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    const width = figure.right - figure.left;
    if (lane && figure.placement === "side") {
      // In the lane: the right edge at the body's, between the lane's floor
      // and ceiling, never above the paragraph it accompanies and never
      // under that paragraph's lines of text.
      if (Math.abs(figure.right - body.right) > tolerance) {
        problems.push(`${where}: ${name} ends at ${figure.right} px, not at the body's right edge (${body.right} px)`);
      }
      if (width < LANE_REM.min * rem - tolerance || width > LANE_REM.max * rem + tolerance) {
        problems.push(`${where}: ${name} is ${width} px wide, outside the ${LANE_REM.min * rem}–${LANE_REM.max * rem} px lane`);
      }
      if (Number.isFinite(figure.nextTop) && figure.top < figure.nextTop - tolerance) {
        problems.push(`${where}: ${name} starts at ${figure.top} px, above the paragraph it accompanies (${figure.nextTop} px)`);
      }
      if (Number.isFinite(figure.nextLinesRight) && figure.nextLinesRight > figure.left + tolerance) {
        problems.push(`${where}: ${name} at ${figure.left} px overlaps the text beside it, which reaches ${figure.nextLinesRight} px`);
      }
    } else {
      // Across the body, between the paragraphs (a wide figure from 64rem,
      // every figure below it), never wider than the body.
      if (Math.abs(figure.left - body.left) > tolerance) {
        problems.push(`${where}: ${name} starts at ${figure.left} px, not at the body's left edge (${body.left} px)`);
      }
      if (figure.right > body.right + tolerance) {
        problems.push(`${where}: ${name} ends at ${figure.right} px, past the body's right edge (${body.right} px)`);
      }
      if (figure.placement === "wide" && Math.abs(figure.right - body.right) > tolerance) {
        problems.push(`${where}: ${name} is wide but ends at ${figure.right} px, not at the body's right edge (${body.right} px)`);
      }
    }
    if (!Number.isFinite(figure.scale)) {
      problems.push(`${where}: ${name} has no measurable panel (svg[viewBox] not found)`);
    } else if (LABEL_UNITS * figure.scale < LABEL_MIN_PX - 0.05) {
      problems.push(`${where}: ${name} renders a ${LABEL_UNITS}-unit label at ${Math.round(LABEL_UNITS * figure.scale * 100) / 100} px, below ${LABEL_MIN_PX} px`);
    }
  }
  return problems;
}

/**
 * Judge the measurements of one or more page × width runs.
 * @param {Array<object>} measurements
 * @param {number} [tolerance]
 * @returns {{ ok: boolean, problems: string[], lines: string[] }} — `lines` are the
 *   documented per-run lines (`layout /sv/ 1024: ok (3 service cards, 6 app cards)`,
 *   `layout /blog/<slug>/ 1024: ok (12 blocks on the measure, 3 figures)`)
 */
export function evaluate(measurements, tolerance = TOLERANCE) {
  const problems = [];
  const lines = [];
  for (const run of measurements) {
    const where = `${run.page} ${run.width}`;
    const before = problems.length;
    if (run.article !== undefined) {
      problems.push(...evaluateArticle(run, where, tolerance));
      const runProblems = problems.slice(before);
      const counts = `${run.article?.blocks?.length ?? 0} blocks on the measure, ${run.article?.figures?.length ?? 0} figures`;
      lines.push(runProblems.length === 0 ? `layout ${run.page} ${run.width}: ok (${counts})` : `layout ${run.page} ${run.width}: FAIL — ${runProblems.map((problem) => problem.slice(where.length + 2)).join("; ")}`);
      continue;
    }
    for (const [grid, cards] of Object.entries(run.grids ?? {})) {
      if (!Array.isArray(cards) || cards.length === 0) {
        problems.push(`${where}: ${grid} grid has no cards`);
        continue;
      }
      const measured = [];
      for (const card of cards) {
        const name = `${grid} card ${card.index + 1}`;
        // A card with an element that was not found is named, never compared.
        const missing = unmeasured(card, grid);
        if (missing.length > 0) {
          problems.push(`${where}: ${name} has no measurable ${missing.join(", ")} (element not found)`);
          continue;
        }
        measured.push(card);
        // AC-30: the title's box is one line tall.
        if (!(card.title.height <= LINE_RATIO * card.title.lineHeight)) {
          problems.push(`${where}: ${name} title wraps (${card.title.height} px for a ${card.title.lineHeight} px line)`);
        }
        // D-14 (decomposition decision 4): the chip row is one line.
        if (card.chip && !(card.chip.height <= LINE_RATIO * card.chip.lineHeight)) {
          problems.push(`${where}: ${name} chip row wraps (${card.chip.height} px for a ${card.chip.lineHeight} px line)`);
        }
      }
      for (const row of rowsOf(measured, tolerance)) {
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
