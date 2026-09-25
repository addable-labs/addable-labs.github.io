// The rules of the layout gate — the card balance of the landing pages
// (redesign AC-30), the article measure and figure
// placement (founder feedback 2026-09-21, si-55iu; centred composition,
// founder feedback 2026-09-22), the article tables (founder feedback
// 2026-09-24, si-t64i), the games (si-y6pp) and the article's image
// (si-awlu) — judged on plain measurements so
// tests/layout.test.mjs runs on fixtures without Chrome.
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
//       figures: [{ id, placement, left, right, top, bottom,   // each .figure's box
//                   panel: { left, right, top, bottom },        // its .figure-panels row
//                   caption: { left, right, top, bottom },      // its figcaption
//                   scale }, …],
//       tables:  [{ left, right, top, bottom,                  // each table's box
//                   scrollBox: { left, right, top, bottom } }, …] // the box it scrolls in
//       games:   [{ id, left, right, top, bottom,              // each .games block's box
//                   versions: [{ left, right, top, bottom,     // each .game figure in it
//                                screens: [{ left, right, top, bottom }, …] }, …] }, …]
//                                                              // its screenshots and frames
//       image:   { left, right, top, bottom, summaryBottom }   // the header's image, and the
//     }                                                        // bottom of the summary above it
//   }
//
// where `blocks` are the body's children other than figures, `placement` is
// "inline" or "wide", `panel` and `caption` are null when the element was
// not found, `scale` is the smallest render scale of the figure's SVG
// panels (box width over viewBox width), and a table's `scrollBox` is the
// box of the table itself or of its nearest ancestor in the body whose
// overflow-x is auto or scroll, null when there is none. A measurement
// without `tables` (one taken before si-t64i) has none to judge, and one
// without `games` (before si-y6pp) no games. The blocks leave out the games
// blocks as well as the figures. `image` is null when the page has no
// article image, and a measurement without it (one taken before si-awlu)
// has none to judge.

import { IMAGE_HEIGHT, IMAGE_WIDTH } from "./images.mjs";

/** Pixel tolerance for "equal" (AC-30: ± 1 px). */
export const TOLERANCE = 1;

/** A title or chip row is one line when its box is at most this × its line height. */
export const LINE_RATIO = 1.1;

/** The article's reading measure (base.css `--measure`), in rem. */
export const MEASURE_REM = 44;

/** An inline figure's panel: its floor and ceiling (base.css .figure-inline, .figure-panels-1), in rem. */
export const PANEL_REM = { min: 20, max: 24.5 };

/** The viewport width from which an inline figure's caption sits beside its panel, in px (base.css, 48rem). */
export const BESIDE_FROM_PX = 768;

/** The gap between an inline figure's panel and the caption beside it (base.css `--space-4`), in rem. */
export const INLINE_GAP_REM = 1.5;

/** A game's screen, its screenshot or the frame it plays in: 4:3 (base.css .game-shot, .game-frame). */
export const GAME_RATIO = 4 / 3;

/** The article's image: 1200:630, the proportions of every share image (scripts/lib/images.mjs). */
export const IMAGE_RATIO = IMAGE_WIDTH / IMAGE_HEIGHT;

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

const round = (value) => Math.round(value * 100) / 100;

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
 * The article rules (si-55iu; centred composition, founder feedback
 * 2026-09-22) for one run; returns its problems, each prefixed with `where`.
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
  const bodyCentre = (body.left + body.right) / 2;
  const measurable = (box) => box && [box.left, box.right, box.top, box.bottom].every(Number.isFinite);
  if (article.scrollWidth > article.innerWidth) {
    problems.push(`${where}: the page scrolls horizontally (${article.scrollWidth} px wide for a ${article.innerWidth} px viewport)`);
  }
  if (!Array.isArray(article.blocks) || article.blocks.length === 0) {
    problems.push(`${where}: the article body has no text blocks`);
  }
  let leftEdge = null;
  for (const [index, block] of (article.blocks ?? []).entries()) {
    const name = `block ${index + 1} (${block.tag})`;
    if (![block.left, block.right].every(Number.isFinite)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    // The measure: every text block at most 44rem wide, centred in the
    // body, and every block on the same left edge as the first.
    if (block.right - block.left > measure + tolerance) {
      problems.push(`${where}: ${name} is ${block.right - block.left} px wide, wider than the ${measure} px measure`);
    }
    if (Math.abs((block.left + block.right) / 2 - bodyCentre) > tolerance) {
      problems.push(`${where}: ${name} spans ${block.left}–${block.right} px, not centred in the body (${body.left}–${body.right} px)`);
    }
    if (leftEdge === null) leftEdge = block.left;
    else if (Math.abs(block.left - leftEdge) > tolerance) {
      problems.push(`${where}: ${name} starts at ${block.left} px, off the shared left edge (${leftEdge} px)`);
    }
  }
  // Tables (founder feedback 2026-09-24, si-t64i). The text column is the
  // measure, or the body where the body is narrower, centred in the body:
  // where every text block above starts. A table starts on its left edge
  // however narrow the table is, and what is visible of a table (its box,
  // cut to the box it scrolls in) ends by the column's right edge — a table
  // too wide for the column scrolls inside a box of its own.
  const columnWidth = Math.min(measure, body.right - body.left);
  const column = { left: round(bodyCentre - columnWidth / 2), right: round(bodyCentre + columnWidth / 2) };
  for (const [index, table] of (article.tables ?? []).entries()) {
    const name = `table ${index + 1}`;
    if (![table.left, table.right].every(Number.isFinite)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    if (Math.abs(table.left - column.left) > tolerance) {
      problems.push(`${where}: ${name} starts at ${table.left} px, off the text column's left edge (${column.left} px)`);
    }
    const scrolls = Number.isFinite(table.scrollBox?.right);
    const visibleRight = scrolls ? Math.min(table.right, table.scrollBox.right) : table.right;
    if (visibleRight > column.right + tolerance) {
      problems.push(`${where}: ${name} reaches ${visibleRight} px, past the text column's right edge (${column.right} px)${scrolls ? "" : ", and no box around it scrolls"}`);
    }
  }
  // The article's image (si-awlu): under the summary, across the text column
  // like every text block, and at its 1200:630, so neither squeezed nor cut.
  if (article.image !== undefined) {
    const { image } = article;
    if (!measurable(image)) {
      problems.push(`${where}: the article image has no measurable box (element not found)`);
    } else {
      if (Math.abs(image.left - column.left) > tolerance || Math.abs(image.right - column.right) > tolerance) {
        problems.push(`${where}: the article image spans ${image.left}–${image.right} px, not the text column (${column.left}–${column.right} px)`);
      }
      const width = image.right - image.left;
      const height = image.bottom - image.top;
      if (Math.abs(height - width / IMAGE_RATIO) > tolerance) {
        problems.push(`${where}: the article image is ${round(width)} × ${round(height)} px, not ${IMAGE_WIDTH}:${IMAGE_HEIGHT}`);
      }
      if (!Number.isFinite(image.summaryBottom)) {
        problems.push(`${where}: the article image has no summary above it (element not found)`);
      } else if (image.top < image.summaryBottom - tolerance) {
        problems.push(`${where}: the article image starts at ${image.top} px, above the end of the summary (${image.summaryBottom} px)`);
      }
    }
  }
  const beside = run.width >= BESIDE_FROM_PX;
  for (const figure of article.figures ?? []) {
    const name = figure.id || "figure";
    if (![figure.left, figure.right, figure.top].every(Number.isFinite)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    if (figure.placement === "wide") {
      // Across the whole body at every width.
      if (Math.abs(figure.left - body.left) > tolerance || Math.abs(figure.right - body.right) > tolerance) {
        problems.push(`${where}: ${name} is wide but spans ${figure.left}–${figure.right} px, not the body (${body.left}–${body.right} px)`);
      }
    } else {
      // On the measure, centred like a text block; its panel between the
      // floor and the ceiling, the caption beside it from 48rem (to the
      // right of the panel, top-aligned) and under it below.
      if (figure.right - figure.left > measure + tolerance) {
        problems.push(`${where}: ${name} is ${figure.right - figure.left} px wide, wider than the ${measure} px measure`);
      }
      if (Math.abs((figure.left + figure.right) / 2 - bodyCentre) > tolerance) {
        problems.push(`${where}: ${name} spans ${figure.left}–${figure.right} px, not centred in the body (${body.left}–${body.right} px)`);
      }
      if (!measurable(figure.panel) || !measurable(figure.caption)) {
        problems.push(`${where}: ${name} has no measurable ${[!measurable(figure.panel) && "panel row", !measurable(figure.caption) && "caption"].filter(Boolean).join(" and ")} (element not found)`);
      } else {
        const { panel, caption } = figure;
        const panelWidth = panel.right - panel.left;
        const ceiling = Math.min(PANEL_REM.max * rem, figure.right - figure.left);
        if (panelWidth > ceiling + tolerance || (beside && panelWidth < PANEL_REM.min * rem - tolerance)) {
          problems.push(`${where}: ${name} panel is ${panelWidth} px wide, outside ${beside ? `${PANEL_REM.min * rem}–` : "up to "}${ceiling} px`);
        }
        if (beside) {
          if (caption.left < panel.right + INLINE_GAP_REM * rem - tolerance) {
            problems.push(`${where}: ${name} caption starts at ${caption.left} px, not beside the panel (which ends at ${panel.right} px, plus the ${INLINE_GAP_REM * rem} px gap)`);
          }
          if (Math.abs(caption.top - panel.top) > tolerance) {
            problems.push(`${where}: ${name} caption starts at ${caption.top} px, not top-aligned with the panel (${panel.top} px)`);
          }
        } else if (caption.top < panel.bottom - tolerance) {
          problems.push(`${where}: ${name} caption starts at ${caption.top} px, not under the panel (which ends at ${panel.bottom} px)`);
        }
      }
    }
    if (!Number.isFinite(figure.scale)) {
      problems.push(`${where}: ${name} has no measurable panel (svg[viewBox] not found)`);
    } else if (LABEL_UNITS * figure.scale < LABEL_MIN_PX - 0.05) {
      problems.push(`${where}: ${name} renders a ${LABEL_UNITS}-unit label at ${Math.round(LABEL_UNITS * figure.scale * 100) / 100} px, below ${LABEL_MIN_PX} px`);
    }
  }
  // Games played in the page (si-y6pp): a block spans the whole body like a
  // wide figure, its versions (before | after) side by side in one row from
  // 48rem and stacked below it, each across the block, and every screen — a
  // screenshot, or the frame a game plays in — inside its version at the
  // game's 4:3.
  for (const block of article.games ?? []) {
    const name = block.id || "games";
    if (!measurable(block)) {
      problems.push(`${where}: ${name} has no measurable box`);
      continue;
    }
    if (Math.abs(block.left - body.left) > tolerance || Math.abs(block.right - body.right) > tolerance) {
      problems.push(`${where}: ${name} spans ${block.left}–${block.right} px, not the body (${body.left}–${body.right} px)`);
    }
    const versions = block.versions ?? [];
    if (versions.length === 0) {
      problems.push(`${where}: ${name} has no versions (element not found)`);
      continue;
    }
    for (const [index, version] of versions.entries()) {
      const label = `${name} version ${index + 1}`;
      if (!measurable(version)) {
        problems.push(`${where}: ${label} has no measurable box`);
        continue;
      }
      const previous = versions[index - 1];
      if (beside) {
        if (Math.abs(version.top - versions[0].top) > tolerance) {
          problems.push(`${where}: ${label} starts at ${version.top} px, not beside version 1 (${versions[0].top} px)`);
        } else if (previous && measurable(previous) && version.left < previous.right - tolerance) {
          problems.push(`${where}: ${label} starts at ${version.left} px, over version ${index} (which ends at ${previous.right} px)`);
        }
      } else {
        if (Math.abs(version.left - block.left) > tolerance || Math.abs(version.right - block.right) > tolerance) {
          problems.push(`${where}: ${label} spans ${version.left}–${version.right} px, not the block (${block.left}–${block.right} px)`);
        }
        if (previous && measurable(previous) && version.top < previous.bottom - tolerance) {
          problems.push(`${where}: ${label} starts at ${version.top} px, not under version ${index} (which ends at ${previous.bottom} px)`);
        }
      }
      if (!Array.isArray(version.screens) || version.screens.length === 0) {
        problems.push(`${where}: ${label} has no screens (element not found)`);
        continue;
      }
      for (const [at, screen] of version.screens.entries()) {
        const what = `${label} screen ${at + 1}`;
        if (!measurable(screen)) {
          problems.push(`${where}: ${what} has no measurable box`);
          continue;
        }
        if (screen.left < version.left - tolerance || screen.right > version.right + tolerance) {
          problems.push(`${where}: ${what} spans ${screen.left}–${screen.right} px, outside its version (${version.left}–${version.right} px)`);
        }
        const width = screen.right - screen.left;
        const height = screen.bottom - screen.top;
        if (Math.abs(height - width / GAME_RATIO) > tolerance) {
          problems.push(`${where}: ${what} is ${round(width)} × ${round(height)} px, not 4:3`);
        }
      }
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
 *   `layout /blog/<slug>/ 1024: ok (12 blocks on the measure, 3 figures)`, with
 *   `, 2 tables` after the figures on a page that has tables)
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
      const tables = run.article?.tables?.length ?? 0;
      const games = run.article?.games?.length ?? 0;
      const counts = `${run.article?.blocks?.length ?? 0} blocks on the measure, ${run.article?.figures?.length ?? 0} figures${tables > 0 ? `, ${tables} table${tables === 1 ? "" : "s"}` : ""}${games > 0 ? `, ${games} block${games === 1 ? "" : "s"} of games` : ""}`;
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
        // The chip row is one line.
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
