// The article illustrations (founder feedback 2026-09-21, si-55iu; REQ-008:
// custom SVG only, no stock imagery).
//
// `renderFigure(id, { placement, lang, strings })` returns the HTML of one
// figure: a <figure> holding one or more <svg> panels and a <figcaption>. The
// `figure` shortcode in eleventy.config.js calls it from the article Markdown
// (`{% figure "stages", "wide" %}`), so the same drawing serves both
// languages: every visible word — panel titles, labels, notes, captions —
// comes from `strings.figures.<id>` in src/_data/strings/{en,sv}.json (the
// parity gate keeps the two key sets identical) and nothing is hard-coded
// here. Colours come from the site's tokens through the `fig-*` classes in
// base.css (currentColor and custom properties, so the figures follow the
// theme); the mono font carries the labels, in the console-log spirit of the
// hero: hairlines, the green for passed/highlight, the orange for
// waiting/attention.
//
// Every panel is drawn on a 320-unit-wide viewBox — a panel is 24.5 rem
// (392 px) at the widest and 20 rem on a 360 px phone — so a 13-unit label
// renders at 12–16 px everywhere. A wide figure is a row of such panels that
// stacks below 48 rem instead of one wide drawing that would shrink its
// type; an inline figure is one panel with its caption beside it. Each label
// slot has a character budget (JetBrains Mono advances 0.6 em per character,
// plus the letter-spacing: see TYPE); a string that does not fit fails the
// build naming the key, like the front-matter validator, so a longer Swedish
// translation cannot overflow its panel silently.
//
// The values in the charts of the Fluentor figures (levels, cells, bars) are
// deliberately made-up shapes: the product is in preview and the
// figures are schematic — no real people, scores or screenshots.
//
// One drawing here is not a figure: `renderHero(id, { alt })` returns an
// article's hero, the picture under its title and summary drawn in the page
// instead of shown as its image, for an article whose front matter names
// one (`heroFigure`, layouts/article.njk). The only one, "torch-lights-up",
// draws the product's torch, the approved artwork, in the artwork's own
// colours in both themes, read from scripts/lib/torch.mjs, and it moves (see
// its function).

import { COVER, MARK } from "../../../scripts/lib/torch.mjs";

const WIDTH = 320;
// The landscape view of a flow figure (si-05r9): a left-to-right drawing on a
// viewBox this wide, shown from FLOW_FROM_REM rem. base.css gives it at most
// FLOW_WIDTH × FLOW_SCALE / 16 rem, so its type never grows past FLOW_SCALE ×
// its size; below FLOW_FROM_REM its place is taken by the stacked drawing,
// which is a normal 320-unit panel. FLOW_FROM_REM is the smallest whole rem at
// which a 13-unit label renders at 12 px (the layout gate's floor) with a
// little to spare (the founder asked for 48 rem, where it is 11.5 px). A test
// holds the three numbers and the CSS together.
export const FLOW_WIDTH = 800;
export const FLOW_SCALE = 1.1;
export const FLOW_FROM_REM = 51;
// The four type sizes the figures' text is set in, as base.css sets them
// (.fig-label, .fig-small, .fig-note, .fig-head): the size in units and the
// letter-spacing in em. A change to one there is a change here, or the
// budgets stop matching what is drawn; tests/figures.test.mjs reads base.css
// and fails when the two part (si-di5e).
export const TYPE = {
  label: { size: 13, spacing: 0 },
  small: { size: 12, spacing: 0 },
  note: { size: 10.5, spacing: 0 },
  head: { size: 11, spacing: 0.04 },
};
// Mono advance per character at each size: 0.6 em, plus the letter-spacing,
// which Chrome adds after every character, the last one too.
const ADVANCE = Object.fromEntries(Object.entries(TYPE).map(([name, { size, spacing }]) => [name, size * (0.6 + spacing)]));

// A panel's head line holds the head and, when the panel has one, its value
// on the right, as if one line with a space between them: at most 40
// characters at the head's size. Two Swedish lines, drawn before the check
// counted the letter-spacing (si-di5e, 11 October 2026), are one character
// longer: the head of bilingual, and the head and window of build's last
// panel. Measured in Chrome, the first's ink ends 0.6 units inside the margin
// and the second's head and window are 8.3 units apart, so they stay as the
// founder read them; any other line is held to the budget, and so are these
// once their words change.
export const MEASURED_LINES = ["två språk, en nyckeluppsättning, ett test", "innan det blir offentligt 00:04–00:14 UTC"];

/** Escape a string for an attribute value or text node. */
function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/** Throw when `value` cannot fit `slot` units at the given type size. */
function fit(key, value, slot, size = "note") {
  const max = Math.floor(slot / ADVANCE[size]);
  if (value.length > max) {
    throw new Error(`Figure label "${key}" is ${value.length} characters; at most ${max} fit its slot ("${value}")`);
  }
  return value;
}

/**
 * A <text> element; `cls` names the fig-* classes, `anchor` the text-anchor
 * and `struck` strikes the line through (the agent that never ran).
 */
function text(x, y, value, cls, anchor, struck = false) {
  const attrs = [`x="${round(x)}"`, `y="${round(y)}"`, `class="${cls}"`];
  if (anchor) attrs.push(`text-anchor="${anchor}"`);
  if (struck) attrs.push(`text-decoration="line-through"`);
  return `<text ${attrs.join(" ")}>${esc(value)}</text>`;
}

/** A tick mark (✓) drawn as a path, centred on (x, y). */
function check(x, y) {
  return `<path d="M${round(x - 4.5)} ${round(y)}l3.2 3.2 6.3-7" class="fig-check"/>`;
}

/** A small diamond (the founder's gate) centred on (x, y). */
function diamond(x, y, size = 5.5) {
  return `<path d="M${round(x)} ${round(y - size)}l${size} ${size}-${size} ${size}-${size}-${size}z" class="fig-gate"/>`;
}

/** A point on a circle; angle 0 is straight up, clockwise. */
function polar(cx, cy, r, index, count) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return [round(cx + r * Math.cos(angle)), round(cy + r * Math.sin(angle))];
}

function polygon(points, cls, extra = "") {
  return `<polygon points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" class="${cls}"${extra}/>`;
}

/**
 * The radar's scaffold and a polygon per series: `count` axes (hairlines),
 * `rings` concentric polygons, then each series as a closed polygon whose
 * vertex i sits at values[i] / max of the radius.
 */
function radar(cx, cy, r, count, series, rings = 3) {
  const parts = [];
  for (let ring = 1; ring <= rings; ring += 1) {
    const points = Array.from({ length: count }, (_, i) => polar(cx, cy, (r * ring) / rings, i, count));
    parts.push(polygon(points, "fig-hair"));
  }
  for (let i = 0; i < count; i += 1) {
    const [x, y] = polar(cx, cy, r, i, count);
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="fig-hair"/>`);
  }
  for (const { values, max, cls, dots } of series) {
    const points = values.map((value, i) => polar(cx, cy, (r * value) / max, i, count));
    parts.push(polygon(points, cls));
    if (dots) {
      for (const [x, y] of points) parts.push(`<circle cx="${x}" cy="${y}" r="2.5" class="fig-dot"/>`);
    }
  }
  return parts.join("");
}

/**
 * One panel: an <svg> with its own accessible name (the panel title and the
 * figure caption), a hairline grid, the mono header line and the body. Ids
 * are prefixed with the panel id so two panels on one page never share one.
 * The header line is the head from the left margin and headRight's value up
 * to the right one, budgeted together as one line (MEASURED_LINES above), so
 * neither runs into the other or past a margin.
 */
function panel({ id, captionId, height, width = WIDTH, view, title, head, headRight, body }) {
  const H = height;
  const line = headRight ? `${head} ${headRight.value}` : head;
  // The head is budgeted for the narrow panel even in the landscape view: the
  // two views of a figure share one head, and the narrow one is the tighter.
  if (!MEASURED_LINES.includes(line)) fit(`${id}.head`, line, WIDTH - 32, "head");
  const parts = [
    `<svg class="figure-panel${view ? ` figure-panel-${view}` : ""}" viewBox="0 0 ${width} ${H}" role="img" aria-labelledby="${id}-title ${captionId}">`,
    `<title id="${id}-title">${esc(title)}</title>`,
    `<defs><pattern id="${id}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" class="fig-grid"/></pattern>`,
    `<marker id="${id}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0l8 4-8 4z" class="fig-arrowhead"/></marker></defs>`,
    `<rect width="${width}" height="${H}" fill="url(#${id}-grid)"/>`,
    text(16, 25, head, "fig-head"),
  ];
  if (headRight) parts.push(text(width - 16, 25, headRight.value, `fig-head ${headRight.cls}`, "end"));
  parts.push(`<line x1="0" y1="38" x2="${width}" y2="38" class="fig-hair"/>`, body, "</svg>");
  return parts.join("");
}

/** An arrow from (x1, y1) to (x2, y2), solid or dashed. */
function arrow(id, x1, y1, x2, y2, dashed = false) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fig-line${dashed ? " fig-dashed" : ""}" marker-end="url(#${id}-arrow)"/>`;
}

/**
 * A list of stages down a vertical line: a dot (or the founder's diamond) at
 * x = 24, the name beside it, a note beneath, and on the right a check, a
 * state word or nothing. Rows are 34 units apart from `top`.
 */
function stageList(id, rows, top = 64) {
  const parts = [];
  const first = top - 4;
  const last = top + (rows.length - 1) * 34 - 4;
  parts.push(`<line x1="24" y1="${first}" x2="24" y2="${last}" class="fig-hair"/>`);
  rows.forEach((row, i) => {
    const y = top + i * 34;
    const cy = y - 4;
    if (row.gate) {
      parts.push(diamond(24, cy));
      parts.push(text(40, y, fit(`${id}.${row.key}.label`, row.label, 220, "label"), "fig-label fig-wait"));
    } else {
      if (row.commit) parts.push(`<circle cx="24" cy="${cy}" r="9" class="fig-glow"/>`);
      parts.push(`<circle cx="24" cy="${cy}" r="4" class="fig-dot"/>`);
      parts.push(text(40, y, fit(`${id}.${row.key}.label`, row.label, 220, "label"), "fig-label"));
    }
    parts.push(text(40, y + 13, fit(`${id}.${row.key}.note`, row.note, 250), "fig-note"));
    if (row.state) parts.push(text(WIDTH - 16, y, fit(`${id}.${row.key}.state`, row.state.value, 60), `fig-note ${row.state.cls}`, "end"));
    else if (!row.gate && !row.commit) parts.push(check(WIDTH - 22, cy));
  });
  return parts.join("");
}

// The figures — six from si-55iu, four for the factory article from
// si-hct0 (from (7) on), one more for each of the two earlier articles from
// si-ubr3 ((11) and (12)). Each takes the figure's strings, its id (for the error
// messages of `fit`) and the figure's DOM id (`fig-<id>`, which prefixes the
// panel ids and so the marker ids an arrow references) and returns
// { panels: [...], caption }; a panel is { title, head, headRight?, height,
// body }.

// (1) The stages of the build with the founder's two gates — wide, three
// panels: the documents before the code, the build, the steps before it is
// public. Facts from the article and the factory's own record of the run:
// ten work items, ten gates, no text published unread.
function stages(t, id, figureId) {
  const ok = { value: t.done, cls: "fig-ok" };
  const row = (key, extra = {}) => ({ key, label: t.rows[key].label, note: t.rows[key].note, ...extra });
  const height = 192;
  return {
    caption: t.caption,
    panels: [
      {
        title: t.panels.documents.title,
        head: t.panels.documents.head,
        height,
        body: stageList(id, [row("requirements"), row("plan"), row("review"), row("direction", { gate: true })]),
      },
      {
        title: t.panels.build.title,
        head: t.panels.build.head,
        height,
        body: stageList(id, [row("decomposition"), row("implementation"), row("gates", { state: { value: t.gatesState, cls: "fig-ok" } })]),
      },
      {
        title: t.panels.release.title,
        head: t.panels.release.head,
        height,
        body: stageList(id, [row("resultReview"), row("acceptance", { gate: true }), row("publication", { state: ok })]),
      },
    ],
  };
}

// (2) The ten checks as a gate board: name, what it guards, PASS — the list
// in scripts/check/run.mjs, in its order.
function gates(t, id, figureId) {
  const names = ["build", "links", "html", "pages", "contrast", "parity", "feeds", "content", "lighthouse", "layout"];
  const parts = [];
  names.forEach((name, i) => {
    const y = 62 + i * 22;
    parts.push(text(16, y, name, "fig-label fig-small"));
    parts.push(text(104, y, fit(`${id}.guards.${name}`, t.guards[name], 168), "fig-note"));
    parts.push(text(WIDTH - 16, y, fit(`${id}.pass`, t.pass, 40), "fig-note fig-ok fig-strong", "end"));
    if (i < names.length - 1) parts.push(`<line x1="16" y1="${y + 8}" x2="${WIDTH - 16}" y2="${y + 8}" class="fig-hair"/>`);
  });
  return {
    caption: t.caption,
    panels: [{ title: t.title, head: t.head, headRight: { value: t.score, cls: "fig-ok" }, height: 296, body: parts.join("") }],
  };
}

// (3) The loop: change → gates → the founder reads the text → published
// page, and the next change starts it again. The caption says what the
// drawing cannot: only a change to what the site says waits for the founder.
function loop(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const node = (x, y, label, note, cls = "") => {
    const parts = [`<rect x="${x}" y="${y}" width="116" height="44" rx="8" class="fig-node"/>`];
    parts.push(text(x + 58, y + 19, fit(`${id}.${label.key}`, label.value, 108, "label"), `fig-label${cls}`, "middle"));
    parts.push(text(x + 58, y + 34, fit(`${id}.${note.key}`, note.value, 108), `fig-note${cls}`, "middle"));
    return parts.join("");
  };
  const body = [
    node(16, 48, { key: "change", value: t.change }, { key: "changeNote", value: t.changeNote }),
    node(188, 48, { key: "gates", value: t.gates }, { key: "gatesNote", value: t.gatesNote }, " fig-ok"),
    node(188, 134, { key: "founder", value: t.founder }, { key: "founderNote", value: t.founderNote }, " fig-wait"),
    // The blinking caret after the founder's name, as in the hero console:
    // placed after the centred label, whose width is its length × 0.6 em.
    `<rect x="${round(246 + (t.founder.length * ADVANCE.label) / 2 + 4)}" y="143.5" width="5" height="9.5" class="fig-caret"/>`,
    node(16, 134, { key: "published", value: t.published }, { key: "publishedNote", value: t.publishedNote }),
    arrow(pid, 134, 70, 186, 70),
    arrow(pid, 246, 94, 246, 132),
    arrow(pid, 186, 156, 134, 156),
    arrow(pid, 74, 132, 74, 94, true),
    text(82, 117, fit(`${id}.again`, t.again, 100), "fig-note"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 200, body }] };
}

// (4) The individual's assessment: one area's five behavioural levels, one
// chosen, becoming a radar — abstract text bars stand in for the statements.
function assessment(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const parts = [];
  const chosen = 2;
  for (let i = 0; i < 5; i += 1) {
    const y = 64 + i * 26;
    if (i === chosen) {
      parts.push(`<rect x="8" y="${y - 16}" width="156" height="24" rx="6" class="fig-row"/>`);
      parts.push(text(16, y, String(i + 1), "fig-label fig-ok"));
      parts.push(`<rect x="34" y="${y - 7}" width="72" height="3" rx="1.5" class="fig-bar"/><rect x="34" y="${y - 1}" width="50" height="3" rx="1.5" class="fig-bar"/>`);
      parts.push(check(152, y - 4));
    } else {
      parts.push(text(16, y, String(i + 1), "fig-label fig-muted"));
      parts.push(`<rect x="34" y="${y - 7}" width="${72 - i * 6}" height="3" rx="1.5" class="fig-bar-muted"/><rect x="34" y="${y - 1}" width="${44 + i * 5}" height="3" rx="1.5" class="fig-bar-muted"/>`);
    }
  }
  parts.push(text(16, 214, fit(`${id}.levels`, t.levels, 156), "fig-note"));
  parts.push(arrow(pid, 168, 116, 190, 116));
  parts.push(radar(244, 132, 60, 6, [{ values: [3, 4, 2, 3, 5, 3], max: 5, cls: "fig-area", dots: true }]));
  parts.push(text(244, 214, fit(`${id}.radar`, t.radar, 120), "fig-note", "middle"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 224, body: parts.join("") }] };
}

// (5) The team's picture — wide, three panels: the aggregate radar over the
// members' own, the heatmap of members against areas, the gap to the target.
function team(t, id, figureId) {
  const height = 232;
  const members = [
    [3, 4, 2, 3, 5, 3],
    [2, 3, 3, 4, 3, 2],
    [4, 5, 3, 2, 4, 4],
    [3, 2, 4, 3, 3, 5],
    [1, 3, 2, 4, 2, 3],
    [4, 4, 3, 3, 4, 2],
  ];
  const areas = ["A", "B", "C", "D", "E", "F"];
  const aggregate = areas.map((_, a) => members.reduce((sum, m) => sum + m[a], 0) / members.length);
  const target = [4, 4, 3, 4, 4, 4];
  const opacity = (level) => [0.14, 0.32, 0.5, 0.7, 0.92][level - 1];

  // Panel 1: radar — members as hairline polygons, the team as the bold one.
  const radarBody = [
    radar(160, 122, 72, 6, [
      ...members.slice(0, 4).map((values) => ({ values, max: 5, cls: "fig-member" })),
      { values: aggregate, max: 5, cls: "fig-area", dots: true },
    ]),
    `<line x1="16" y1="212" x2="36" y2="212" class="fig-accent-stroke"/>`,
    text(42, 216, fit(`${id}.legendTeam`, t.legendTeam, 90), "fig-note"),
    `<line x1="150" y1="212" x2="170" y2="212" class="fig-member"/>`,
    text(176, 216, fit(`${id}.legendMembers`, t.legendMembers, 128), "fig-note"),
  ].join("");

  // Panel 2: heatmap — a row per member (an anonymous bar for the name), a
  // column per area, one hue at five opacities.
  const cell = { w: 30, h: 20, gap: 3, x: 88, y: 60 };
  const heat = [];
  areas.forEach((area, a) => heat.push(text(cell.x + a * (cell.w + cell.gap) + cell.w / 2, 52, area, "fig-note", "middle")));
  members.forEach((values, m) => {
    const y = cell.y + m * (cell.h + cell.gap);
    heat.push(`<rect x="16" y="${y + 8}" width="${40 + (m % 3) * 8}" height="3" rx="1.5" class="fig-bar-muted"/>`);
    values.forEach((level, a) => {
      heat.push(`<rect x="${cell.x + a * (cell.w + cell.gap)}" y="${y}" width="${cell.w}" height="${cell.h}" rx="3" class="fig-cell" fill-opacity="${opacity(level)}"/>`);
    });
  });
  const legendY = 212;
  heat.push(text(16, legendY + 4, fit(`${id}.legendLevel`, t.legendLevel, 84), "fig-note"));
  for (let level = 1; level <= 5; level += 1) {
    const x = 112 + (level - 1) * 40;
    heat.push(`<rect x="${x}" y="${legendY - 6}" width="12" height="12" rx="2" class="fig-cell" fill-opacity="${opacity(level)}"/>`);
    heat.push(text(x + 16, legendY + 4, String(level), "fig-note"));
  }

  // Panel 3: gap to target — a bar per area, the target tick, the gap in orange.
  const bars = [];
  const track = { x: 44, w: 244 };
  const scale = (value) => track.x + (track.w * value) / 5;
  areas.forEach((area, a) => {
    const y = 58 + a * 24;
    const current = aggregate[a];
    bars.push(text(16, y + 9, area, "fig-note"));
    bars.push(`<line x1="${track.x}" y1="${y + 5}" x2="${track.x + track.w}" y2="${y + 5}" class="fig-hair"/>`);
    bars.push(`<rect x="${track.x}" y="${y}" width="${round(scale(current) - track.x)}" height="10" rx="2" class="fig-cell" fill-opacity="0.85"/>`);
    if (current < target[a]) {
      bars.push(`<line x1="${round(scale(current) + 2)}" y1="${y + 5}" x2="${round(scale(target[a]) - 2)}" y2="${y + 5}" class="fig-gap"/>`);
    }
    bars.push(`<rect x="${round(scale(target[a]) - 1)}" y="${y - 3}" width="2" height="16" class="fig-tick"/>`);
  });
  bars.push(`<rect x="16" y="${legendY - 6}" width="12" height="12" rx="2" class="fig-cell" fill-opacity="0.85"/>`);
  bars.push(text(32, legendY + 4, fit(`${id}.legendCurrent`, t.legendCurrent, 66), "fig-note"));
  bars.push(`<rect x="112" y="${legendY - 7}" width="2" height="14" class="fig-tick"/>`);
  bars.push(text(120, legendY + 4, fit(`${id}.legendTarget`, t.legendTarget, 66), "fig-note"));
  bars.push(`<line x1="200" y1="${legendY}" x2="220" y2="${legendY}" class="fig-gap"/>`);
  bars.push(text(226, legendY + 4, fit(`${id}.legendGap`, t.legendGap, 78), "fig-note"));

  return {
    caption: t.caption,
    panels: [
      { title: t.panels.radar.title, head: t.panels.radar.head, height, body: radarBody },
      { title: t.panels.heatmap.title, head: t.panels.heatmap.head, height, body: heat.join("") },
      { title: t.panels.gap.title, head: t.panels.gap.head, height, body: bars.join("") },
    ],
  };
}

// (6) The harness before the features: the checks that stand before every
// commit, then the commit itself (the accent dot with the glow ring).
function harness(t, id, figureId) {
  const row = (key, extra = {}) => ({ key, label: t.rows[key].label, note: t.rows[key].note, ...extra });
  const rows = [row("types"), row("lint"), row("unit"), row("e2e"), row("migrations"), row("commit", { commit: true })];
  return {
    caption: t.caption,
    panels: [{ title: t.title, head: t.head, height: 250, body: stageList(id, rows, 62) }],
  };
}

// The four figures of the factory article (founder request 2026-09-22,
// si-hct0), redrawn from the factory's design documents in the site's own
// language: the before/after of the shared ledger, the timeline of what the
// setup is built on, the setup in one picture and the second build as a
// clock. Facts come from the article and the run records it cites; nothing
// private from the documents (no ports, hosts, session names, model tiers).

/** A double-headed arrow: the marker at both ends. */
function exchange(id, x1, y1, x2, y2, dashed = false) {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" class="fig-line${dashed ? " fig-dashed" : ""}" marker-start="url(#${id}-arrow)" marker-end="url(#${id}-arrow)"/>`;
}

/** A rounded node with a centred label; `cls` colours the label. */
function box(x, y, width, key, value, cls = "") {
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="24" rx="6" class="fig-node"/>`,
    text(x + width / 2, y + 16, fit(key, value, width - 12, "label"), `fig-label${cls}`, "middle"),
  ].join("");
}

/** A muted footer line under a panel's rows, with a dot or the founder's diamond in front. */
function footer(id, key, value, y, gate = false) {
  const mark = gate ? diamond(24, y - 4, 4.5) : `<circle cx="24" cy="${y - 4}" r="2.5" class="fig-dot"/>`;
  return mark + text(40, y, fit(key, value, 250), `fig-note${gate ? " fig-wait" : ""}`);
}

// (7) Before and after the ledger — one panel in two halves. Before: four
// agents on one laptop, each on its own project, the founder at the centre
// carrying every message by hand (the dashed lines). After: the sessions
// read and write one shared ledger, the mayor is the one the founder talks
// to, and the founder is involved at two known points.
function ledger(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const parts = [];
  // Before.
  parts.push(text(16, 54, fit(`${id}.before`, t.before, 288), "fig-note"));
  const agents = [48, 122, 198, 272];
  const founderBox = { x: 116, y: 116, w: 88 };
  agents.forEach((x, i) => {
    parts.push(text(x, 72, fit(`${id}.agent`, t.agent, 70), "fig-note", "middle"));
    parts.push(`<circle cx="${x}" cy="84" r="4" class="fig-dot"/>`);
    parts.push(exchange(pid, x, 90, founderBox.x + 20 + i * 16, founderBox.y, true));
  });
  parts.push(box(founderBox.x, founderBox.y, founderBox.w, `${id}.founder`, t.founder, " fig-wait"));
  parts.push(text(160, 156, fit(`${id}.byHand`, t.byHand, 288), "fig-note", "middle"));
  parts.push(`<line x1="16" y1="168" x2="${WIDTH - 16}" y2="168" class="fig-hair"/>`);
  // After.
  parts.push(text(16, 186, fit(`${id}.after`, t.after, 288), "fig-note"));
  parts.push(box(16, 198, 88, `${id}.founder`, t.founder, " fig-wait"));
  parts.push(exchange(pid, 106, 210, 134, 210));
  parts.push(box(136, 198, 110, `${id}.mayor`, t.mayor));
  parts.push(text(16, 234, fit(`${id}.points`, t.points, 134), "fig-note"));
  parts.push(diamond(22, 246, 4.5));
  parts.push(text(32, 250, fit(`${id}.plan`, t.plan, 108), "fig-note fig-wait"));
  parts.push(diamond(22, 262, 4.5));
  parts.push(text(32, 266, fit(`${id}.branch`, t.branch, 108), "fig-note fig-wait"));
  parts.push(exchange(pid, 160, 224, 160, 270));
  parts.push(text(238, 234, fit(`${id}.sessions`, t.sessions, 120), "fig-note", "middle"));
  for (const x of [196, 238, 280]) {
    parts.push(`<circle cx="${x}" cy="246" r="4" class="fig-dot"/>`);
    parts.push(exchange(pid, x, 254, x, 270));
  }
  parts.push(`<rect x="16" y="272" width="288" height="24" rx="6" class="fig-node"/>`);
  parts.push(text(160, 288, fit(`${id}.ledger`, t.ledger, 276, "label"), "fig-label fig-ok", "middle"));
  parts.push(text(16, 316, fit(`${id}.handoff`, t.handoff, 288), "fig-note"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 328, body: parts.join("") }] };
}

// (8) The timeline: what the setup is built on, dated as the article dates
// it, with the credit the article gives; our own two builds close the list
// with the commit's glow.
function timeline(t, id, figureId) {
  const keys = ["beads", "gastown", "gascity", "fences", "builds"];
  const parts = [];
  const top = 66;
  const pitch = 44;
  parts.push(`<line x1="100" y1="${top - 4}" x2="100" y2="${top + (keys.length - 1) * pitch - 4}" class="fig-hair"/>`);
  keys.forEach((key, i) => {
    const row = t.rows[key];
    const y = top + i * pitch;
    const ours = key === "builds";
    parts.push(text(16, y, fit(`${id}.rows.${key}.date`, row.date, 72), "fig-note"));
    if (ours) parts.push(`<circle cx="100" cy="${y - 4}" r="9" class="fig-glow"/>`);
    parts.push(`<circle cx="100" cy="${y - 4}" r="4" class="fig-dot"/>`);
    parts.push(text(112, y, fit(`${id}.rows.${key}.label`, row.label, 192, "label"), `fig-label${ours ? " fig-ok" : ""}`));
    parts.push(text(112, y + 13, fit(`${id}.rows.${key}.note`, row.note, 192), "fig-note"));
    parts.push(text(112, y + 25, fit(`${id}.rows.${key}.credit`, row.credit, 192), "fig-note"));
  });
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 288, body: parts.join("") }] };
}

// (9) The setup in one picture: the founder talks to the mayor over Discord;
// the mayor and the floor roles read and write one Beads ledger; Gas City
// drives the graph of beads and restarts sessions that crash; there is no
// other message bus. Beneath, a bead's states as the article gives them.
function setup(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const parts = [];
  // The founder and the mayor.
  parts.push(text(16, 64, fit(`${id}.founder`, t.founder, 76, "label"), "fig-label fig-wait"));
  parts.push(text(116, 52, fit(`${id}.discord`, t.discord, 60), "fig-note", "middle"));
  parts.push(exchange(pid, 96, 60, 136, 60));
  parts.push(text(144, 64, fit(`${id}.mayor`, t.mayor, 120, "label"), "fig-label"));
  parts.push(exchange(pid, 160, 72, 160, 88));
  // The ledger.
  parts.push(`<rect x="16" y="90" width="288" height="36" rx="6" class="fig-node"/>`);
  parts.push(text(28, 106, fit(`${id}.ledger`, t.ledger, 264, "label"), "fig-label fig-ok"));
  parts.push(text(28, 120, fit(`${id}.noBus`, t.noBus, 264), "fig-note"));
  // The floor, and Gas City driving both.
  parts.push(exchange(pid, 48, 128, 48, 144));
  parts.push(text(58, 141, fit(`${id}.floorArrow`, t.floorArrow, 150), "fig-note"));
  parts.push(`<rect x="16" y="146" width="272" height="62" rx="6" class="fig-node"/>`);
  parts.push(text(28, 162, fit(`${id}.floor`, t.floor, 100, "label"), "fig-label"));
  parts.push(text(276, 162, fit(`${id}.floorNote`, t.floorNote, 140), "fig-note", "end"));
  ["a", "b", "c"].forEach((key, i) => {
    parts.push(text(28, 177 + i * 12.5, fit(`${id}.roles.${key}`, t.roles[key], 248), "fig-note"));
  });
  parts.push(arrow(pid, 256, 228, 256, 210));
  parts.push(arrow(pid, 296, 228, 296, 128));
  parts.push(text(304, 244, fit(`${id}.orchestrator`, t.orchestrator, 120, "label"), "fig-label", "end"));
  parts.push(text(304, 258, fit(`${id}.orchestratorNote`, t.orchestratorNote, 288), "fig-note", "end"));
  parts.push(`<line x1="16" y1="268" x2="${WIDTH - 16}" y2="268" class="fig-hair"/>`);
  // A bead's states: open (hollow), claimed (the accent dot), closed (the check).
  parts.push(text(16, 284, fit(`${id}.bead.head`, t.bead.head, 288), "fig-note"));
  parts.push(`<circle cx="22" cy="298" r="4.5" class="fig-node"/>`);
  parts.push(text(32, 302, fit(`${id}.bead.open`, t.bead.open, 46, "label"), "fig-label"));
  parts.push(arrow(pid, 80, 298, 98, 298));
  parts.push(`<circle cx="108" cy="298" r="4" class="fig-dot"/>`);
  parts.push(text(118, 302, fit(`${id}.bead.claimed`, t.bead.claimed, 62, "label"), "fig-label"));
  parts.push(arrow(pid, 182, 298, 200, 298));
  parts.push(check(210, 298));
  parts.push(text(220, 302, fit(`${id}.bead.closed`, t.bead.closed, 84, "label"), "fig-label fig-ok"));
  parts.push(text(16, 318, fit(`${id}.bead.blocked`, t.bead.blocked, 288), "fig-note"));
  parts.push(text(16, 332, fit(`${id}.bead.dies`, t.bead.dies, 288), "fig-note"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 344, body: parts.join("") }] };
}

// (10) The second build as a clock — wide, three panels like the stages
// figure of the earlier article, but every row closes with its time (UTC,
// from the run's stage table) or its count, the founder's pick and plan gate
// are the orange rows, and each panel ends with a footer line.
function build(t, id, figureId) {
  const height = 288;
  const row = (key, extra = {}) => {
    const r = t.rows[key];
    const spec = { key, label: r.label, note: r.note, ...extra };
    if (r.state) spec.state = { value: r.state, cls: extra.gate ? "fig-wait" : extra.count ? "fig-ok fig-strong" : "" };
    return spec;
  };
  const panelSpec = (key, rows, gate) => ({
    title: t.panels[key].title,
    head: t.panels[key].head,
    headRight: { value: t.panels[key].window, cls: "" },
    height,
    body: stageList(id, rows) + footer(id, `${id}.footers.${key}`, t.footers[key], 64 + rows.length * 34, gate),
  });
  return {
    caption: t.caption,
    panels: [
      panelSpec("documents", [row("brief"), row("requirements"), row("pick", { gate: true }), row("plan"), row("planReview"), row("gate", { gate: true })], true),
      panelSpec("build", [row("decomposition"), row("implementation"), row("commits", { count: true }), row("gates", { count: true }), row("tests", { count: true }), row("summary")], false),
      panelSpec("release", [row("review"), row("fixes"), row("report"), row("lighthouse", { count: true }), row("verdict", { gate: true })], false),
    ],
  };
}

// Two more, one per earlier article (founder request 2026-09-22, si-ubr3):
// documents against code for the site-build article, and two languages, one
// key set, one test for the Fluentor article. Both draw only what the
// articles say; the Fluentor one is schematic (abstract bars, no real
// strings).

/** The digits of a count string ("6,900", "6 900") as a number; throws naming the key when there are none. */
function count(key, value) {
  const digits = Number(String(value).replace(/\D/g, ""));
  if (!Number.isFinite(digits) || digits <= 0) throw new Error(`Figure label "${key}" must carry a count ("${value}")`);
  return digits;
}

/** A horizontal bar from the baseline at x: square at the baseline, rounded at the data end. */
function bar(x, y, width, height, cls) {
  const r = Math.min(4, width / 2);
  return `<path d="M${round(x)} ${round(y)}h${round(width - r)}a${r} ${r} 0 0 1 ${r} ${r}v${round(height - 2 * r)}a${r} ${r} 0 0 1 -${r} ${r}H${round(x)}z" class="${cls}"/>`;
}

// (11) Documents against code — one panel, two proportional bars: the lines
// of requirements, plans, summaries and reviews the agents wrote in the first
// build against the lines of site, gates and tests, as the article counts
// them (the proportion comes from the digits of the two count strings, so a
// rewording keeps the bars honest); beneath, the paragraph's point and the
// one fix the review required.
function words(t, id, figureId) {
  const parts = [];
  const track = { x: 16, w: 288 };
  const rows = ["documents", "code"];
  const lines = Object.fromEntries(rows.map((key) => [key, count(`${id}.rows.${key}.lines`, t.rows[key].lines)]));
  const max = Math.max(...Object.values(lines));
  rows.forEach((key, i) => {
    const row = t.rows[key];
    const y = 62 + i * 59;
    parts.push(text(track.x, y, fit(`${id}.rows.${key}.label`, row.label, 200, "label"), "fig-label"));
    parts.push(text(WIDTH - 16, y, fit(`${id}.rows.${key}.lines`, row.lines, 80, "label"), "fig-label fig-strong", "end"));
    parts.push(bar(track.x, y + 7, (track.w * lines[key]) / max, 12, key === "documents" ? "fig-cell" : "fig-bar-muted"));
    parts.push(text(track.x, y + 33, fit(`${id}.rows.${key}.kinds`, row.kinds, 288), "fig-note"));
  });
  parts.push(`<line x1="16" y1="168" x2="${WIDTH - 16}" y2="168" class="fig-hair"/>`);
  parts.push(text(16, 186, fit(`${id}.point.a`, t.point.a, 288, "small"), "fig-label fig-small"));
  parts.push(text(16, 201, fit(`${id}.point.b`, t.point.b, 288, "small"), "fig-label fig-small"));
  parts.push(footer(id, `${id}.fix.a`, t.fix.a, 221));
  parts.push(text(40, 234, fit(`${id}.fix.b`, t.fix.b, 250), "fig-note"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 248, body: parts.join("") }] };
}

// (12) Two languages, one key set, one test — one panel in two columns: the
// English and Swedish routes, which existed before any feature; under each,
// its strings file with the keys as abstract bars (no real strings), one key
// missing on the Swedish side (the orange dashed gap); both files feed the
// unit test that compares the key sets; the outcome — a missing key fails the
// build instead of shipping — and the footer: this website adopted the same rule.
function bilingual(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const parts = [];
  const columns = { en: 16, sv: 172 };
  const width = 132;
  const centre = (x) => x + width / 2;
  // The routes, before any feature.
  parts.push(text(16, 54, fit(`${id}.routesNote`, t.routesNote, 288), "fig-note"));
  for (const [lang, x] of Object.entries(columns)) {
    parts.push(box(x, 60, width, `${id}.routes.${lang}`, t.routes[lang]));
    parts.push(arrow(pid, centre(x), 86, centre(x), 100));
  }
  // The two strings files: a key bar and a value bar per row; the third key
  // is missing from the Swedish file.
  const keys = [44, 58, 36, 52];
  for (const [lang, x] of Object.entries(columns)) {
    parts.push(`<rect x="${x}" y="102" width="${width}" height="76" rx="6" class="fig-node"/>`);
    parts.push(text(x + 12, 116, fit(`${id}.files.${lang}`, t.files[lang], 108), "fig-note"));
    keys.forEach((valueWidth, i) => {
      const y = 126 + i * 12;
      if (lang === "sv" && i === 2) {
        parts.push(`<line x1="${x + 12}" y1="${y + 1.5}" x2="${x + 34}" y2="${y + 1.5}" class="fig-gap"/>`);
        parts.push(text(x + 40, y + 5, fit(`${id}.missing`, t.missing, 80), "fig-note fig-wait"));
      } else {
        parts.push(`<rect x="${x + 12}" y="${y}" width="22" height="3" rx="1.5" class="fig-bar"/>`);
        parts.push(`<rect x="${x + 40}" y="${y}" width="${valueWidth}" height="3" rx="1.5" class="fig-bar-muted"/>`);
      }
    });
  }
  // The unit test both files feed, and what it compares.
  parts.push(arrow(pid, centre(columns.en), 180, 128, 196));
  parts.push(arrow(pid, centre(columns.sv), 180, 192, 196));
  parts.push(box(96, 196, 128, `${id}.test`, t.test));
  parts.push(text(160, 236, fit(`${id}.testNote`, t.testNote, 288), "fig-note", "middle"));
  // The outcome, marked with the same gap as the missing key.
  parts.push(`<line x1="16" y1="252" x2="32" y2="252" class="fig-gap"/>`);
  parts.push(text(40, 256, fit(`${id}.fails`, t.fails, 264), "fig-note fig-wait"));
  parts.push(text(40, 269, fit(`${id}.failsNote`, t.failsNote, 264), "fig-note"));
  parts.push(`<line x1="16" y1="282" x2="${WIDTH - 16}" y2="282" class="fig-hair"/>`);
  parts.push(footer(id, `${id}.adopted`, t.adopted, 300));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 314, body: parts.join("") }] };
}

// The three figures of the Ashlands post (founder request 2026-09-22,
// si-wqb7): the Gauntlet Loop drawn as a gauntlet, what the closing phase's
// six sub-agents cost, and the properties of the critic that decide whether
// the loop is cheap or expensive. The method's parts are Matt Shumer's,
// credited in the caption and linked in the prose; every number is the
// repository's evaluation report as the article states it.

/** A multi-segment arrow along a path, solid or dashed. */
function pathArrow(id, d, dashed = false) {
  return `<path d="${d}" class="fig-line${dashed ? " fig-dashed" : ""}" fill="none" marker-end="url(#${id}-arrow)"/>`;
}

/** The reference a critic holds: an empty dashed card — none was ever obtained here. */
function emptyCard(x, y, size = 14) {
  return `<rect x="${round(x)}" y="${round(y)}" width="${size}" height="${size}" rx="2" class="fig-gap"/>`;
}

// (13) The Gauntlet Loop as a gauntlet — wide, three panels: the goal the
// lead agent splits into pieces, the corridor of critics the work runs, and
// the rule that nothing grades its own homework. The critics' references are
// drawn empty, because no reference was ever obtained in this run.
function gauntlet(t, id, figureId) {
  const height = 248;
  const [p1, p2, p3] = [1, 2, 3].map((n) => `${figureId}-p${n}`);

  // Panel 1 — the goal, not the plan.
  const brief = [
    box(88, 46, 144, `${id}.goal`, t.goal),
    text(160, 86, fit(`${id}.goalNote`, t.goalNote, 288), "fig-note", "middle"),
    text(160, 99, fit(`${id}.goalNote2`, t.goalNote2, 288), "fig-note", "middle"),
    arrow(p1, 160, 104, 160, 118),
    box(76, 120, 168, `${id}.lead`, t.lead),
    text(160, 158, fit(`${id}.leadNote`, t.leadNote, 288), "fig-note", "middle"),
    arrow(p1, 140, 166, 60, 180),
    arrow(p1, 160, 166, 160, 180),
    arrow(p1, 180, 166, 260, 180),
    box(8, 184, 96, `${id}.pieces.a`, t.pieces.a),
    box(112, 184, 96, `${id}.pieces.b`, t.pieces.b),
    box(216, 184, 96, `${id}.pieces.c`, t.pieces.c),
    text(160, 224, fit(`${id}.piecesNote`, t.piecesNote, 288), "fig-note", "middle"),
    footer(id, `${id}.contracts`, t.contracts, 240),
  ].join("");

  // Panel 2 — the corridor: two rows of critics, each holding its reference.
  const criticBox = (x, y) =>
    [
      `<rect x="${x}" y="${y}" width="96" height="24" rx="6" class="fig-node"/>`,
      emptyCard(x + 8, y + 5),
      text(x + 30, y + 16, fit(`${id}.critic`, t.critic, 58), "fig-note"),
    ].join("");
  const corridor = [
    criticBox(100, 52),
    criticBox(204, 52),
    `<line x1="96" y1="88" x2="304" y2="88" class="fig-hair"/>`,
    `<line x1="96" y1="144" x2="304" y2="144" class="fig-hair"/>`,
    box(8, 104, 76, `${id}.builder`, t.builder),
    arrow(p2, 88, 116, 222, 116),
    text(96, 110, fit(`${id}.work`, t.work, 114), "fig-note"),
    text(232, 121, fit(`${id}.wowed`, t.wowed, 72, "label"), "fig-label fig-ok"),
    arrow(p2, 148, 78, 148, 86),
    arrow(p2, 252, 78, 252, 86),
    arrow(p2, 148, 154, 148, 146),
    arrow(p2, 252, 154, 252, 146),
    criticBox(100, 156),
    criticBox(204, 156),
    pathArrow(p2, "M252 182V202H46V132", true),
    text(160, 216, fit(`${id}.back`, t.back, 250), "fig-note", "middle"),
    emptyCard(18, 226, 12),
    text(40, 236, fit(`${id}.noReference`, t.noReference, 250), "fig-note fig-wait"),
  ].join("");

  // Panel 3 — the builder and the critic, side by side.
  const sees = (x, lines, budget, keyPrefix) =>
    ["a", "b"].map((key, i) => text(x, 80 + i * 16, fit(`${keyPrefix}.${key}`, lines[key], budget), "fig-note")).join("");
  const grading = [
    `<line x1="160" y1="46" x2="160" y2="178" class="fig-hair"/>`,
    text(16, 58, fit(`${id}.builderCol`, t.builderCol, 140, "small"), "fig-label fig-small"),
    text(172, 58, fit(`${id}.criticCol`, t.criticCol, 132, "small"), "fig-label fig-small"),
    sees(16, t.builderSees, 140, `${id}.builderSees`),
    text(16, 112, fit(`${id}.builderSees.c`, t.builderSees.c, 140), "fig-note"),
    sees(172, t.criticSees, 132, `${id}.criticSees`),
    emptyCard(172, 102, 12),
    text(190, 112, fit(`${id}.criticSees.c`, t.criticSees.c, 114), "fig-note"),
    `<line x1="16" y1="130" x2="304" y2="130" class="fig-hair"/>`,
    text(16, 150, fit(`${id}.gradedItself`, t.gradedItself, 140), "fig-note"),
    text(172, 150, fit(`${id}.independent`, t.independent, 132), "fig-note"),
    text(16, 166, fit(`${id}.declared`, t.declared, 140, "small"), "fig-label fig-small fig-wait"),
    text(172, 166, fit(`${id}.foundDefects`, t.foundDefects, 132, "small"), "fig-label fig-small fig-ok"),
    `<line x1="16" y1="186" x2="304" y2="186" class="fig-hair"/>`,
    emptyCard(18, 198, 12),
    text(40, 208, fit(`${id}.noRef`, t.noRef, 250), "fig-note fig-wait"),
    text(40, 221, fit(`${id}.recollection`, t.recollection, 250), "fig-note"),
  ].join("");

  return {
    caption: t.caption,
    panels: [
      { title: t.panels.brief.title, head: t.panels.brief.head, height, body: brief },
      { title: t.panels.gauntlet.title, head: t.panels.gauntlet.head, height, body: corridor },
      { title: t.panels.grading.title, head: t.panels.grading.head, height, body: grading },
    ],
  };
}

// (14) What the closing phase cost: the report's six sub-agents, their tokens
// and what each round produced — five completed, the sixth killed by the
// weekly token limit before it read a file (struck through).
function agents(t, id, figureId) {
  const keys = ["silhouettes", "chevron", "lattice", "lighting", "aerial", "waterline"];
  const parts = [];
  keys.forEach((key, i) => {
    const row = t.rows[key];
    const y = 58 + i * 32;
    const dead = key === "waterline";
    // The one round that shipped a visible fix is the green row.
    const cls = dead ? " fig-muted" : key === "lattice" ? " fig-ok" : "";
    parts.push(text(16, y, fit(`${id}.rows.${key}.label`, row.label, 230, "small"), `fig-label fig-small${cls}`, undefined, dead));
    parts.push(text(WIDTH - 16, y, fit(`${id}.rows.${key}.tokens`, row.tokens, 60, "small"), `fig-label fig-small fig-strong${cls}`, "end"));
    parts.push(text(16, y + 13, fit(`${id}.rows.${key}.outcome`, row.outcome, 288), `fig-note${dead ? " fig-wait" : ""}`));
    if (i < keys.length - 1) parts.push(`<line x1="16" y1="${y + 21}" x2="${WIDTH - 16}" y2="${y + 21}" class="fig-hair"/>`);
  });
  parts.push(`<line x1="16" y1="244" x2="${WIDTH - 16}" y2="244" class="fig-hair"/>`);
  parts.push(text(16, 264, fit(`${id}.total`, t.total, 100, "label"), "fig-label"));
  parts.push(text(WIDTH - 16, 264, fit(`${id}.totalValue`, t.totalValue, 200, "label"), "fig-label fig-strong", "end"));
  parts.push(text(16, 278, fit(`${id}.totalNote`, t.totalNote, 288), "fig-note fig-ok"));
  parts.push(footer(id, `${id}.footer`, t.footer, 302));
  parts.push(text(40, 315, fit(`${id}.footerNote`, t.footerNote, 250), "fig-note"));
  return {
    caption: t.caption,
    panels: [{ title: t.title, head: t.head, headRight: { value: t.wall, cls: "" }, height: 332, body: parts.join("") }],
  };
}

// (15) The critic decides the cost: the five properties of §9.1, this run
// against what you want, and the two questions that predict the outcome.
function critic(t, id, figureId) {
  const keys = ["cost", "parallel", "fidelity", "determinism", "attribution"];
  const parts = [
    `<line x1="162" y1="46" x2="162" y2="258" class="fig-hair"/>`,
    text(16, 58, fit(`${id}.columns.ashlands`, t.columns.ashlands, 140, "small"), "fig-label fig-small fig-wait"),
    text(172, 58, fit(`${id}.columns.want`, t.columns.want, 132, "small"), "fig-label fig-small fig-ok"),
  ];
  keys.forEach((key, i) => {
    const row = t.rows[key];
    const y = 82 + i * 36;
    parts.push(text(16, y, fit(`${id}.rows.${key}.label`, row.label, 140, "small"), "fig-label fig-small"));
    parts.push(text(16, y + 15, fit(`${id}.rows.${key}.ashlands`, row.ashlands, 140), "fig-note fig-wait"));
    parts.push(text(172, y + 15, fit(`${id}.rows.${key}.want`, row.want, 132), "fig-note fig-ok"));
    if (i < keys.length - 1) parts.push(`<line x1="16" y1="${y + 23}" x2="${WIDTH - 16}" y2="${y + 23}" class="fig-hair"/>`);
  });
  parts.push(`<line x1="16" y1="270" x2="${WIDTH - 16}" y2="270" class="fig-hair"/>`);
  parts.push(footer(id, `${id}.questions.a`, t.questions.a, 290));
  parts.push(footer(id, `${id}.questions.b`, t.questions.b, 306));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 320, body: parts.join("") }] };
}

// (16) Total against concurrent (founder request 2026-09-22, si-z0d3) — wide,
// two panels in one mark: 242 squares for every sub-agent the run started,
// against the ten slots of which seven were ever filled at the same time, so
// the eye does the arithmetic the sentence asks for. The counts come from the
// mayor's sweep of the run's own session transcripts (every sub-agent writes
// its own transcript; each file's first and last event is that agent's live
// span, and the spans were swept for maximum overlap): 242 in total, 236 of
// them inside 34 workflow launches and 6 called directly; at most 7 alive at
// once and never 10; 5 or more for 17 of the run's ~72 hours; a median life of
// 40 minutes and a longest of 3 h 10. Nothing else is drawn.
function fleet(t, id, figureId) {
  const height = 276;
  const MARK = 8;
  const PITCH = 13;
  const square = (x, y, cls) => `<rect x="${round(x)}" y="${round(y)}" width="${MARK}" height="${MARK}" rx="1.5" class="${cls}"/>`;

  // Panel 1 — the whole run, one square per sub-agent; the six direct calls
  // are the empty squares at the end of the block.
  const total = count(`${id}.panels.total.value`, t.panels.total.value);
  const direct = count(`${id}.direct`, t.direct);
  const COLS = 22; // 242 = 22 x 11, so the block is exactly full
  const marks = Array.from({ length: total }, (_, i) =>
    square(17 + (i % COLS) * PITCH, 52 + Math.floor(i / COLS) * PITCH, i < total - direct ? "fig-cell" : "fig-node"));
  const legend = (y, cls, key, value) => square(16, y, cls) + text(32, y + 7, fit(key, value, 264), "fig-note");
  const whole = [
    marks.join(""),
    legend(204, "fig-cell", `${id}.launches`, t.launches),
    legend(218, "fig-node", `${id}.direct`, t.direct),
    `<line x1="16" y1="238" x2="${WIDTH - 16}" y2="238" class="fig-hair"/>`,
    footer(id, `${id}.largest`, t.largest, 256),
    text(40, 269, fit(`${id}.largestNote`, t.largestNote, 250), "fig-note"),
  ].join("");

  // Panel 2 — the same square, ten slots wide: the seven the run reached and
  // the three it never did, then the hours with five or more alive and how
  // long one agent lived (the bars are minutes, to scale).
  const peak = count(`${id}.panels.once.value`, t.panels.once.value);
  const SLOTS = 10; // the line the run never crossed
  const PLATEAU = 17;
  const SPAN = 72; // hours with five or more alive, of the run's span
  const MEDIAN = 40;
  const LONGEST = 190; // an agent's life in minutes: median, and 3 h 10
  const LIFE = 130; // the longest bar's width; the median is drawn to scale
  const slots = Array.from({ length: SLOTS }, (_, i) =>
    (i < peak ? square(16 + i * PITCH, 58, "fig-cell") : emptyCard(16 + i * PITCH, 58, MARK)));
  const once = [
    slots.join(""),
    text(152, 65, fit(`${id}.never`, t.never, 152), "fig-note fig-wait"),
    text(16, 86, fit(`${id}.peak`, t.peak, 288, "label"), "fig-label fig-ok"),
    text(16, 99, fit(`${id}.peakNote`, t.peakNote, 288), "fig-note"),
    `<line x1="16" y1="112" x2="${WIDTH - 16}" y2="112" class="fig-hair"/>`,
    text(16, 130, fit(`${id}.hours`, t.hours, 160, "small"), "fig-label fig-small"),
    text(WIDTH - 16, 130, fit(`${id}.hoursValue`, t.hoursValue, 130, "label"), "fig-label fig-strong", "end"),
    `<rect x="16" y="136" width="288" height="10" class="fig-row"/>`,
    bar(16, 136, (288 * PLATEAU) / SPAN, 10, "fig-cell"),
    text(16, 162, fit(`${id}.hoursNote`, t.hoursNote, 288), "fig-note"),
    `<line x1="16" y1="174" x2="${WIDTH - 16}" y2="174" class="fig-hair"/>`,
    text(16, 192, fit(`${id}.life`, t.life, 200, "small"), "fig-label fig-small"),
    bar(16, 198, (LIFE * MEDIAN) / LONGEST, 7, "fig-cell"),
    text(154, 204, fit(`${id}.median`, t.median, 150), "fig-note"),
    bar(16, 212, LIFE, 7, "fig-bar-muted"),
    text(154, 218, fit(`${id}.longest`, t.longest, 150), "fig-note"),
    `<line x1="16" y1="232" x2="${WIDTH - 16}" y2="232" class="fig-hair"/>`,
    footer(id, `${id}.footer`, t.footer, 252),
    text(40, 265, fit(`${id}.footerNote`, t.footerNote, 250), "fig-note"),
  ].join("");

  const head = (key) => ({
    title: t.panels[key].title,
    head: t.panels[key].head,
    headRight: { value: t.panels[key].value, cls: "" },
    height,
  });
  return {
    caption: t.caption,
    panels: [
      { ...head("total"), body: whole },
      { ...head("once"), body: once },
    ],
  };
}

// The figure of the context study (founder feedback 2026-09-25, si-dj3c: one
// point, what a unit of work cost the mayor; it replaced the four figures of
// si-t64i and si-pvns). Its shares are the study's own: the growth of the
// context from one call to the next split over what caused it (the mayor's
// output exactly, from the token counts; tool results and messages by their
// size) and weighted by the calls that sent it again. What the two periods
// recorded is told in the past tense.

// (17) What filled the mayor's context — one panel, to one scale: the five
// largest sources of the tokens processed, each with a bar per period
// (22–23 September muted, 24–25 September in the text colour) whose length
// comes from the digits of its share label, so a rewording keeps the bars
// honest. In three bars the part the next changes would target — the
// mayor's reasoning, the diffs, the workers' reports — is orange from the
// baseline, keyed by the orange square before its row's note, which names
// the part and its two shares. The panel's accessible name is built from
// the same labels.
function sources(t, id, figureId) {
  const ROWS = ["startup", "output", "notes", "git", "mail"];
  const PERIODS = [
    ["first", "partFirst", "fig-bar-muted"],
    ["second", "partSecond", "fig-bar"],
  ];
  const TRACK = { x: 80, w: 170 };
  const TOP = 58;
  const PITCH = 70;
  const share = (key, field) => count(`${id}.rows.${key}.${field}`, t.rows[key][field]);
  const most = Math.max(...ROWS.flatMap((key) => PERIODS.map(([field]) => share(key, field))));
  const length = (value) => (TRACK.w * value) / most;
  const parts = [];
  const named = [];
  ROWS.forEach((key, i) => {
    const row = t.rows[key];
    const y = TOP + i * PITCH;
    const shares = (fields) => PERIODS.map(([field, part]) => `${t.periods[field]} ${row[fields === "part" ? part : field]}`).join(", ");
    parts.push(text(16, y, fit(`${id}.rows.${key}.label`, row.label, 288, "small"), "fig-label fig-small"));
    if (row.part === undefined) {
      parts.push(text(16, y + 13, fit(`${id}.rows.${key}.note`, row.note, 288), "fig-note"));
      named.push(`${row.label}: ${shares("share")}`);
    } else {
      const note = t.partNote.replace("{part}", row.part).replace("{first}", row.partFirst).replace("{second}", row.partSecond);
      parts.push(`<rect x="16" y="${y + 5}" width="8" height="8" rx="1.5" class="fig-gate"/>`);
      parts.push(text(30, y + 13, fit(`${id}.rows.${key}.part`, note, WIDTH - 46), "fig-note"));
      named.push(`${row.label}: ${shares("share")} (${row.part}: ${shares("part")})`);
    }
    PERIODS.forEach(([field, part, cls], n) => {
      const top = y + 22 + n * 16;
      const value = share(key, field);
      parts.push(text(16, top + 8.5, fit(`${id}.periods.${field}`, t.periods[field], TRACK.x - 20), "fig-note"));
      parts.push(bar(TRACK.x, top, length(value), 10, cls));
      if (row.part !== undefined) {
        const of = share(key, part);
        if (of >= value) throw new Error(`Figure "${id}": the part "${row[part]}" must be less than its row's share "${row[field]}" (${key}, ${field})`);
        parts.push(bar(TRACK.x, top, length(of), 10, "fig-gate"));
      }
      parts.push(text(TRACK.x + length(value) + 6, top + 8.5, fit(`${id}.rows.${key}.${field}`, row[field], WIDTH - 16 - (TRACK.x + TRACK.w + 6), "small"), "fig-label fig-small fig-strong"));
    });
    if (i < ROWS.length - 1) parts.push(`<line x1="16" y1="${y + 54}" x2="${WIDTH - 16}" y2="${y + 54}" class="fig-hair"/>`);
  });
  const height = TOP + (ROWS.length - 1) * PITCH + 22 + 16 + 10 + 14;
  return {
    caption: t.caption,
    panels: [{ title: `${t.title}: ${named.join("; ")}`, head: t.head, height, body: parts.join("") }],
  };
}

// The four figures of the Gaimer article (founder feedback 2026-09-25,
// si-syhr: the draft read as a wall of text): its pull requests on one time
// scale, the Claude call before and after the cleanup, a game's life in the
// app and what the new system prompt cost. Each element is traceable to the
// pull requests or to the code on Gaimer's main branch; times are UTC, as
// GitHub gives them, and what the two runs of the six games recorded is
// told in the past tense.

// The 49 pull requests the factory merged into Gaimer on 24 and 25
// September, Swedish time (gh pr list --repo addable-labs/gaimer --state
// merged: #11–#46 and #48–#60), each with its merge time and the part of the
// article that tells what it changed. #32, which let the game page's style
// and Tauri's IPC through the window's Content Security Policy, is under
// security, the part about that policy; #53 (every call for a game at effort
// low) and #55 (the effort level chosen in Settings) change the Claude call,
// so they are under the Claude connection, though the part on how the games
// were made tells them. #60, which made the logo the founder chose the
// app's icon, has a part of its own (the founder's call, 26 September 2026:
// the agents' four proposals are worth showing). "smaller" holds the eleven
// of the last part, "Smaller changes", which tells only the significant ones
// (his call of the same day): a model per provider (#14), model lists
// without the models that could not work (#25), the GPT-5 models with their
// request (#38), the keyboard focus for a game when it is ready (#54) and
// when the player clicks it (#57), the focus off the description box after
// sending (#48), the system prompt's claim that keys reach a game only after
// a click dropped (#58; the article's games from after the cleanup were made
// with the prompt before it) and a game kept running when the window changes
// size (#26). It leaves out the default model shown in Settings (#41), a
// game's controls and rules in a dialog clear of an iPhone's status bar
// (#56) and that status bar readable in light and dark (#59).
const GAIMER_MERGES = [
  [11, "2026-09-24T17:56:58Z", "saving"],
  [12, "2026-09-24T18:13:29Z", "cleanup"],
  [13, "2026-09-24T18:39:28Z", "cleanup"],
  [14, "2026-09-24T19:07:37Z", "smaller"],
  [15, "2026-09-24T19:28:02Z", "errors"],
  [16, "2026-09-24T20:09:51Z", "claude"],
  [17, "2026-09-24T20:35:50Z", "tests"],
  [18, "2026-09-24T20:56:07Z", "claude"],
  [19, "2026-09-24T21:15:34Z", "claude"],
  [20, "2026-09-24T22:02:15Z", "security"],
  [21, "2026-09-24T22:46:55Z", "security"],
  [22, "2026-09-24T23:07:05Z", "claude"],
  [23, "2026-09-24T23:27:09Z", "security"],
  [24, "2026-09-24T23:55:27Z", "cleanup"],
  [25, "2026-09-25T00:29:02Z", "smaller"],
  [26, "2026-09-25T00:51:45Z", "smaller"],
  [27, "2026-09-25T01:15:17Z", "saving"],
  [28, "2026-09-25T01:33:43Z", "saving"],
  [29, "2026-09-25T01:59:31Z", "saving"],
  [30, "2026-09-25T02:16:54Z", "cleanup"],
  [31, "2026-09-25T02:48:56Z", "errors"],
  [32, "2026-09-25T03:08:47Z", "security"],
  [33, "2026-09-25T03:41:53Z", "errors"],
  [34, "2026-09-25T04:05:59Z", "cleanup"],
  [35, "2026-09-25T04:39:48Z", "claude"],
  [36, "2026-09-25T05:02:04Z", "saving"],
  [37, "2026-09-25T05:26:42Z", "claude"],
  [38, "2026-09-25T06:04:59Z", "smaller"],
  [39, "2026-09-25T06:43:42Z", "fix"],
  [40, "2026-09-25T11:59:29Z", "prompt"],
  [41, "2026-09-25T07:38:04Z", "smaller"],
  [42, "2026-09-25T07:52:30Z", "cleanup"],
  [43, "2026-09-25T08:20:04Z", "errors"],
  [44, "2026-09-25T08:55:03Z", "errors"],
  [45, "2026-09-25T09:19:22Z", "errors"],
  [46, "2026-09-25T09:48:09Z", "tests"],
  [48, "2026-09-25T10:32:38Z", "smaller"],
  [49, "2026-09-25T12:57:25Z", "fix"],
  [50, "2026-09-25T14:08:16Z", "change"],
  [51, "2026-09-25T14:32:39Z", "claude"],
  [52, "2026-09-25T15:12:27Z", "change"],
  [53, "2026-09-25T16:52:17Z", "claude"],
  [54, "2026-09-25T17:26:26Z", "smaller"],
  [55, "2026-09-25T18:00:03Z", "claude"],
  [56, "2026-09-25T18:48:58Z", "smaller"],
  [57, "2026-09-25T19:25:37Z", "smaller"],
  [58, "2026-09-25T20:04:37Z", "smaller"],
  [59, "2026-09-25T20:57:51Z", "smaller"],
  [60, "2026-09-25T21:43:16Z", "icon"],
];

/** The parts of the Gaimer article that tell what its pull requests changed, in its order. */
const GAIMER_AREAS = ["saving", "errors", "claude", "security", "cleanup", "tests", "prompt", "fix", "change", "icon", "smaller"];

// (18) The work at a glance — redrawn on the founder's calls of 26
// September 2026 (the marks by merge time were messy and hard to read; each
// part's label, squares and count on one row, so the figure is wider and
// less tall): a row per part of the article, in its order, with its label,
// a square per pull request and its count, the parts split over two panels
// that stand side by side from 48rem and one above the other below it, each
// panel as tall as the first. The squares of a row end at a common edge
// beside the counts, so rows compare like bars, and they are as large as the
// longest row beside its label allows. A square is a solid shape in the
// accent's text colour, which holds its contrast in both themes.
// The counts, the total in the head and the lists in the panels' accessible
// names all come from the list above, so a pull request moved to another
// part moves everywhere at once; a merge outside 24–25 September in Sweden,
// the head's dates, fails the build, and so does a label that would run
// into its row's squares.
function merges(t, id, figureId) {
  const unknown = GAIMER_MERGES.find(([, , area]) => !GAIMER_AREAS.includes(area));
  if (unknown) throw new Error(`Figure "${id}": pull request #${unknown[0]} is in no part of the article ("${unknown[2]}")`);
  const total = count(`${id}.head`, t.head);
  if (total !== GAIMER_MERGES.length) throw new Error(`Figure label "${id}.head" counts ${total} pull requests, the list ${GAIMER_MERGES.length} ("${t.head}")`);
  // 24 and 25 September in Sweden, on summer time (UTC+2).
  const START = Date.parse("2026-09-23T22:00:00Z");
  const END = Date.parse("2026-09-25T22:00:00Z");
  const outside = GAIMER_MERGES.find(([, at]) => !(Date.parse(at) >= START && Date.parse(at) < END));
  if (outside) throw new Error(`Figure "${id}": pull request #${outside[0]} was merged at ${outside[1]}, outside 24–25 September in Sweden`);
  const TOP = 62;
  const PITCH = 25;
  const SIZE = 9;
  const STEP = 11;
  // The squares end 6 units short of the widest count, which ends at the edge.
  const counts = GAIMER_AREAS.map((area) => GAIMER_MERGES.filter((pr) => pr[2] === area).length);
  const edge = WIDTH - 16 - String(Math.max(...counts)).length * ADVANCE.small - 6;
  const half = Math.ceil(GAIMER_AREAS.length / 2);
  const height = TOP + (half - 1) * PITCH + 18;
  const rows = GAIMER_AREAS.map((area, i) => ({ area, n: counts[i] }));
  const draw = (group) => {
    const parts = [];
    group.forEach(({ area, n }, i) => {
      const y = TOP + i * PITCH;
      const first = edge - n * STEP + (STEP - SIZE);
      // The label runs up to 8 units short of the row's first square.
      parts.push(text(16, y, fit(`${id}.areas.${area}`, t.areas[area], first - 8 - 16, "small"), "fig-label fig-small"));
      for (let k = 0; k < n; k++) {
        parts.push(`<rect x="${round(first + k * STEP)}" y="${y - SIZE}" width="${SIZE}" height="${SIZE}" rx="1.5" class="fig-ok"/>`);
      }
      parts.push(text(WIDTH - 16, y, String(n), "fig-label fig-small fig-strong", "end"));
    });
    return parts.join("");
  };
  const listed = (group) => group.map(({ area, n }) => `${t.areas[area]} (${n})`).join("; ");
  const [first, second] = [rows.slice(0, half), rows.slice(half)];
  return {
    caption: t.caption,
    panels: [
      { title: `${t.title}: ${listed(first)}`, head: t.head, headRight: { value: t.window, cls: "" }, height, body: draw(first) },
      { title: `${t.titleMore}: ${listed(second)}`, head: t.headMore, height, body: draw(second) },
    ],
  };
}

// The four logos one agent proposed for Gaimer's icon on 25 September 2026
// (bead ga-fd5 on the gaimer rig), in its order, each an SVG as the agent
// wrote it, copied byte for byte into the article's media directory; the
// founder chose the first, which #60 made the app's icon.
const GAIMER_LOGOS = ["spark-pad", "prompt", "say-and-play", "pixel-spark"];
const GAIMER_LOGO_CHOSEN = "spark-pad";
const GAIMER_LOGO_DIR = "/blog/cleaning-up-gaimer/logos";

// (22) The four logo proposals — two panels side by side from 48rem, two
// proposals each, one above the other below it: each logo on the app's
// dark rounded tile, as on a home screen, with its name and the idea the
// agent gave it, the chosen one marked. The logos keep their own colours,
// Gaimer's green and orange, which is the point, so they are drawn from
// their own files (<image>) on a tile of Gaimer's dark, which keeps them
// legible in both themes; the site's colours stay in tokens.css. An idea
// is three hand-broken lines in the strings (idea, idea2, idea3), each
// within its budget.
function logos(t, id, figureId) {
  const unknown = Object.keys(t.proposals).find((key) => !GAIMER_LOGOS.includes(key));
  if (unknown || Object.keys(t.proposals).length !== GAIMER_LOGOS.length) throw new Error(`Figure "${id}": the strings name ${Object.keys(t.proposals).join(", ")}, the logos are ${GAIMER_LOGOS.join(", ")}`);
  // An idea's three lines, each a string of its own.
  const IDEA = ["idea", "idea2", "idea3"];
  const TILE = 64;
  const TOP = 56;
  const ROW = 88;
  const X = 16 + TILE + 12;
  const height = TOP + ROW + TILE + 16;
  const draw = (keys) => {
    const parts = [];
    keys.forEach((key, i) => {
      const y = TOP + i * ROW;
      const p = t.proposals[key];
      parts.push(`<image href="${GAIMER_LOGO_DIR}/tile.svg" x="16" y="${y}" width="${TILE}" height="${TILE}"/>`);
      parts.push(`<image href="${GAIMER_LOGO_DIR}/${key}.svg" x="16" y="${y}" width="${TILE}" height="${TILE}"/>`);
      // The tile's edge in the border colour, so that it stands out on the
      // dark theme's panel too (the tile's corners are 229 of 1024).
      parts.push(`<rect x="16.5" y="${y + 0.5}" width="${TILE - 1}" height="${TILE - 1}" rx="${round((229 / 1024) * TILE)}" class="fig-member"/>`);
      const chosen = key === GAIMER_LOGO_CHOSEN;
      // The name, and beside it for the chosen one a tick and the word.
      const mark = chosen ? t.chosen.length * ADVANCE.note + 16 : 0;
      parts.push(text(X, y + 11, fit(`${id}.proposals.${key}.name`, p.name, WIDTH - 16 - X - mark, "small"), "fig-label fig-small"));
      if (chosen) {
        parts.push(check(WIDTH - 16 - t.chosen.length * ADVANCE.note - 9, y + 7));
        parts.push(text(WIDTH - 16, y + 11, t.chosen, "fig-note fig-ok", "end"));
      }
      IDEA.forEach((line, k) => parts.push(text(X, y + 28 + k * 13, fit(`${id}.proposals.${key}.${line}`, p[line], WIDTH - 16 - X), "fig-note")));
    });
    return parts.join("");
  };
  const named = (keys) => keys.map((key) => `${t.proposals[key].name}${key === GAIMER_LOGO_CHOSEN ? ` (${t.chosen})` : ""}: ${IDEA.map((line) => t.proposals[key][line]).join(" ")}`).join(" ");
  const [first, second] = [GAIMER_LOGOS.slice(0, 2), GAIMER_LOGOS.slice(2)];
  return {
    caption: t.caption,
    panels: [
      { title: `${t.panels.first.title}: ${named(first)}`, head: t.panels.first.head, headRight: { value: t.window, cls: "" }, height, body: draw(first) },
      { title: `${t.panels.second.title}: ${named(second)}`, head: t.panels.second.head, height, body: draw(second) },
    ],
  };
}

// (19) The Claude call for a game, before and after the cleanup — one panel
// in two columns, set against each other as the critic figure sets a run
// against what you want: before (orange), Gaimer's prompt pasted into a
// whole Claude Code session with Claude Code's own system prompt and
// built-in tools, the user's own setup taking part and a transcript saved
// (the provider at 7cef601; #18, #19); after (green), one plain completion
// (src/providers/anthropic-provider.js on main), which keeps the user's
// CLAUDE.md files, hooks, plugins, skills and MCP servers out but still reads
// their settings.json, so the caption names those five, not all of the
// user's setup. The last two rows are how the app runs the call: the login
// shells when the user picks Claude (#35) and the time limit (#22, #37,
// #51). A row's label spans the panel and its two values sit under it, with
// a second line where a row needs one.
function connection(t, id, figureId) {
  const COLUMNS = [
    ["before", 16, 144, "fig-wait"],
    ["after", 172, 132, "fig-ok"],
  ];
  const parts = [];
  for (const [side, x, slot, cls] of COLUMNS) {
    parts.push(text(x, 58, fit(`${id}.${side}`, t[side], slot, "small"), `fig-label fig-small ${cls}`));
    parts.push(text(x, 71, fit(`${id}.calls.${side}`, t.calls[side], slot), "fig-note"));
  }
  parts.push(`<line x1="16" y1="80" x2="${WIDTH - 16}" y2="80" class="fig-hair"/>`);
  const keys = ["system", "message", "tools", "setup", "session", "signin", "limit"];
  let y = 98;
  keys.forEach((key, i) => {
    const row = t.rows[key];
    const labels = row.label2 === undefined ? ["label"] : ["label", "label2"];
    const lines = row.before2 === undefined ? [""] : ["", "2"];
    labels.forEach((field, n) => {
      parts.push(text(16, y + n * 13, fit(`${id}.rows.${key}.${field}`, row[field], 288, "small"), "fig-label fig-small"));
    });
    const first = y + (labels.length - 1) * 13 + 14;
    lines.forEach((suffix, n) => {
      for (const [side, x, slot, cls] of COLUMNS) {
        parts.push(text(x, first + n * 12, fit(`${id}.rows.${key}.${side}${suffix}`, row[`${side}${suffix}`], slot), `fig-note ${cls}`));
      }
    });
    const last = first + (lines.length - 1) * 12;
    parts.push(`<line x1="164" y1="${first - 9}" x2="164" y2="${last + 3}" class="fig-hair"/>`);
    if (i < keys.length - 1) parts.push(`<line x1="16" y1="${last + 9}" x2="${WIDTH - 16}" y2="${last + 9}" class="fig-hair"/>`);
    y = last + 27;
  });
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: y - 11, body: parts.join("") }] };
}

// (20) A game's life in the app — wide, two panels, each down a line of
// steps. A new game: a description, one call with Gaimer's system prompt,
// the answer read as a game and saved, the game running in the sandboxed
// page; a game that fails as it starts (an error before it is ready, or in
// the 5 s after that or after the player's first input) goes back once to
// the provider that wrote it, with its code and its error, and the fixed
// game takes its place (src/App.vue generateGame and fixGame,
// src/components/GameContainer.vue). The open game: a change typed in the
// box goes in one call with the game and the requests it was made from;
// the answer is change blocks, made to the code, or the whole game,
// changed, taken as it is, and blocks that cannot be used get the whole
// game asked for once (App.vue requestChange, src/helpers/change-blocks.js);
// the new version runs and, if it fails as it starts, gets one fix too
// (App.vue fixGame); Undo change goes back one version and New game closes
// the game. A question is the orange diamond
// of a flowchart's decision.
function lifecycle(t, id, figureId) {
  const height = 352;
  const p1 = `${figureId}-p1`;
  // One step: its mark at (x, y - 4), its label at x + 16 and its notes
  // beneath; `ask` makes it a question, `glow` the step the line leads to
  // and `small` sets the label a size down (the fix round's branch).
  const step = (rows, key, x, y, { ask = false, glow = false, small = false } = {}) => {
    const row = t[rows][key];
    const at = `${id}.${rows}.${key}`;
    const slot = WIDTH - 16 - (x + 16);
    const mark = ask
      ? diamond(x, y - 4)
      : `${glow ? `<circle cx="${x}" cy="${y - 4}" r="9" class="fig-glow"/>` : ""}<circle cx="${x}" cy="${y - 4}" r="4" class="fig-dot"/>`;
    const cls = `fig-label${small ? " fig-small" : ""}${ask ? " fig-wait" : glow ? " fig-ok" : ""}`;
    const parts = [mark, text(x + 16, y, fit(`${at}.label`, row.label, slot, small ? "small" : "label"), cls)];
    ["note", "note2"].forEach((field, n) => {
      if (row[field] !== undefined) parts.push(text(x + 16, y + 13 + n * 12, fit(`${at}.${field}`, row[field], slot), "fig-note"));
    });
    return parts.join("");
  };

  // Panel 1 — a new game; the fix round branches off to the right and joins
  // the line again at play.
  const made = [
    `<line x1="24" y1="58" x2="24" y2="336" class="fig-hair"/>`,
    step("made", "describe", 24, 62),
    step("made", "call", 24, 96),
    step("made", "answer", 24, 130),
    step("made", "runs", 24, 164),
    step("made", "fails", 24, 198, { ask: true }),
    pathArrow(p1, "M24 232H64V244"),
    text(70, 242, fit(`${id}.yes`, t.yes, 60), "fig-note fig-wait"),
    text(30, 262, fit(`${id}.no`, t.no, 28), "fig-note"),
    `<line x1="64" y1="250" x2="64" y2="296" class="fig-hair"/>`,
    step("made", "back", 64, 258, { small: true }),
    step("made", "fixed", 64, 300, { small: true }),
    pathArrow(p1, "M64 310V320H30"),
    step("made", "play", 24, 340, { glow: true }),
  ].join("");

  // Panel 2 — the open game: the two answers side by side, then the new
  // version and the two buttons, drawn as the app's buttons.
  const answer = (key, x) =>
    [
      `<rect x="${x}" y="140" width="128" height="24" rx="6" class="fig-node"/>`,
      text(x + 64, 156, fit(`${id}.answers.${key}.label`, t.answers[key].label, 116, "small"), "fig-label fig-small", "middle"),
      text(x + 64, 178, fit(`${id}.answers.${key}.note`, t.answers[key].note, 128), "fig-note", "middle"),
    ].join("");
  const button = (key, y) =>
    [
      `<rect x="16" y="${y - 16}" width="100" height="24" rx="6" class="fig-node"/>`,
      text(66, y, fit(`${id}.buttons.${key}.label`, t.buttons[key].label, 88, "small"), "fig-label fig-small", "middle"),
      text(128, y, fit(`${id}.buttons.${key}.note`, t.buttons[key].note, 176), "fig-note"),
    ].join("");
  const open = [
    `<line x1="24" y1="58" x2="24" y2="234" class="fig-hair"/>`,
    step("changed", "change", 24, 62),
    step("changed", "call", 24, 96),
    step("changed", "answer", 24, 130),
    answer("blocks", 40),
    answer("whole", 176),
    step("changed", "unusable", 24, 206, { ask: true }),
    step("changed", "version", 24, 240, { glow: true }),
    `<line x1="16" y1="270" x2="${WIDTH - 16}" y2="270" class="fig-hair"/>`,
    button("undo", 296),
    button("newGame", 330),
  ].join("");

  return {
    caption: t.caption,
    panels: [
      { title: t.panels.made.title, head: t.panels.made.head, height, body: made },
      { title: t.panels.changed.title, head: t.panels.changed.head, height, body: open },
    ],
  };
}

// (21) What the new system prompt cost, as the two runs of the six games
// recorded it (the article's numbers; #51's table has the first run's):
// Tetris and Pong on 25 September, Space Invaders on 26 September, the same
// way — wide, two panels. The calls: each call's time as a bar on one scale,
// the prompt from before muted and the one from after in the accent, with
// its output tokens and the game's lines of code; the dashed marks are the
// limit the app had when the new prompt went in, 300 seconds (#51 raised it
// to 15 minutes later that day), which both runs held every call to and
// which the first calls for the Tetris and the Space Invaders from after
// ran past. The games: what each of the six has of the four things the new
// prompt asks for (#40) — a start screen, a best score, sound, and mouse
// and touch — as each plays in its game page (HAS); a game that takes touch
// but not the mouse shows "touch". Every bar and the limit come from the
// digits of their labels, so a rewording keeps them honest; the first
// panel's accessible name is built from the same labels.
const PRICE_FEATURES = ["start", "best", "sound", "pointer"];
const HAS = {
  tetris: { before: ["touch"], after: ["start", "best", "sound", "pointer"] },
  pong: { before: ["touch"], after: ["start", "best", "sound", "pointer"] },
  "space-invaders": { before: ["start", "touch"], after: ["start", "best", "sound", "pointer"] },
};
function price(t, id, figureId) {
  const games = Object.keys(HAS);
  const sides = ["before", "after"];
  for (const game of games) {
    if (!t.games?.[game] || !sides.every((side) => t.rows?.[game]?.[side])) throw new Error(`Figure "${id}": no strings for the game "${game}" (figures.${id}.games.${game} and figures.${id}.rows.${game}.before and .after)`);
  }
  // A game's two calls take 88 units; the notes below the last take 48
  const height = 108 + games.length * 88;
  const bottom = height - 48;
  const TRACK = { x: 64, w: 180 };
  const seconds = (game, side) => count(`${id}.rows.${game}.${side}.time`, t.rows[game][side].time);
  const longest = Math.max(...games.flatMap((game) => sides.map((side) => seconds(game, side))));
  const limit = count(`${id}.limit`, t.limit);
  const x = (s) => TRACK.x + (TRACK.w * s) / longest;
  const calls = [text(x(limit), 58, fit(`${id}.limit`, t.limit, 170), "fig-note", "middle")];
  const named = [];
  games.forEach((game, g) => {
    const top = 58 + g * 88;
    // The first game's name shares its line with the limit's label
    calls.push(text(16, top, fit(`${id}.games.${game}`, t.games[game], g === 0 ? 48 : WIDTH - 32, "label"), "fig-label"));
    const runs = sides.map((side, s) => {
      const row = t.rows[game][side];
      const y = top + 18 + s * 32;
      const width = x(seconds(game, side)) - TRACK.x;
      calls.push(text(16, y, fit(`${id}.${side}`, t[side], 44), "fig-note"));
      calls.push(bar(TRACK.x, y - 9, width, 10, side === "before" ? "fig-bar-muted" : "fig-cell"));
      calls.push(`<line x1="${round(x(limit))}" y1="${y - 12}" x2="${round(x(limit))}" y2="${y + 4}" class="fig-line fig-dashed"/>`);
      calls.push(text(WIDTH - 16, y, fit(`${id}.rows.${game}.${side}.time`, row.time, WIDTH - 16 - (TRACK.x + TRACK.w + 8), "small"), "fig-label fig-small fig-strong", "end"));
      const note = `${row.tokens} · ${row.lines}`;
      calls.push(text(TRACK.x, y + 13, fit(`${id}.rows.${game}.${side}.tokens`, note, WIDTH - 16 - TRACK.x), "fig-note"));
      return `${t[side]} ${row.time} (${row.tokens}, ${row.lines})`;
    });
    named.push(`${t.games[game]}: ${runs.join(", ")}`);
  });
  calls.push(`<line x1="16" y1="${bottom}" x2="${WIDTH - 16}" y2="${bottom}" class="fig-hair"/>`);
  calls.push(text(16, bottom + 18, fit(`${id}.thinking`, t.thinking, 288), "fig-note"));
  calls.push(text(16, bottom + 31, fit(`${id}.scope`, t.scope, 288), "fig-note"));

  // Panel 2 — a pair of columns per game, before and after, and a row per
  // thing asked for, its name on a line of its own above its marks: six
  // columns leave no room for the names beside them.
  const PAIR = { first: 60, step: 95, half: 22 };
  const columns = games.flatMap((game, g) => sides.map((side, s) => ({ game, side, cx: PAIR.first + g * PAIR.step + (s === 0 ? -PAIR.half : PAIR.half) })));
  const has = [];
  let previousEnd = 16;
  games.forEach((game, g) => {
    const cx = PAIR.first + g * PAIR.step;
    const name = fit(`${id}.games.${game}`, t.games[game], 2 * Math.min(cx - 16, WIDTH - 16 - cx), "small");
    // A name wider than its pair must still clear its neighbour's
    const start = cx - (name.length * ADVANCE.small) / 2;
    if (start < previousEnd + 8) throw new Error(`Figure label "${id}.games.${game}" ("${name}") runs into the name of the game before it`);
    previousEnd = cx + (name.length * ADVANCE.small) / 2;
    has.push(text(cx, 60, name, "fig-label fig-small", "middle"));
  });
  for (const { side, cx } of columns) has.push(text(cx, 76, fit(`${id}.${side}`, t[side], 2 * PAIR.half - 4), "fig-note", "middle"));
  has.push(`<line x1="16" y1="86" x2="${WIDTH - 16}" y2="86" class="fig-hair"/>`);
  const rowStep = (bottom - 86) / PRICE_FEATURES.length;
  PRICE_FEATURES.forEach((key, i) => {
    const y = 86 + i * rowStep + 22;
    has.push(text(16, y, fit(`${id}.features.${key}`, t.features[key], 288, "small"), "fig-label fig-small"));
    for (const { game, side, cx } of columns) {
      const features = HAS[game][side];
      if (features.includes(key)) has.push(check(cx, y + 16));
      else if (key === "pointer" && features.includes("touch")) has.push(text(cx, y + 20, fit(`${id}.touch`, t.touch, 2 * PAIR.half - 4), "fig-note", "middle"));
      else has.push(`<rect x="${cx - 5}" y="${y + 15}" width="10" height="2" rx="1" class="fig-bar-muted"/>`);
    }
    if (i < PRICE_FEATURES.length - 1) has.push(`<line x1="16" y1="${round(86 + (i + 1) * rowStep)}" x2="${WIDTH - 16}" y2="${round(86 + (i + 1) * rowStep)}" class="fig-hair"/>`);
  });
  has.push(`<line x1="16" y1="${bottom}" x2="${WIDTH - 16}" y2="${bottom}" class="fig-hair"/>`);
  has.push(footer(id, `${id}.asked`, t.asked, bottom + 22));

  return {
    caption: t.caption,
    panels: [
      { title: `${t.panels.calls.title}: ${named.join("; ")}`, head: t.panels.calls.head, height, body: calls.join("") },
      { title: t.panels.games.title, head: t.panels.games.head, height, body: has.join("") },
    ],
  };
}

// The figure of the article on how many agents the factory runs at once
// (founder's request, 6 October 2026): the site's two workers on 26 September
// 2026, the first day of two workers per project, from 10:00 to 16:00 UTC in
// two panels of three hours. A lane per worker holds its sessions (outlined),
// each job of its that held the factory's lock on Chrome and WebKit (solid)
// and each wait for that lock (orange); a third lane holds the mayor's own
// jobs; beneath, the machine's one-minute load average. Every element is a
// record of that day: the sessions from the workers' transcripts (finished
// sessions, mayor-bin/worker-sessions.py), the jobs and their waits from the
// lock's log (mayor-bin/state/verify-lock.log: a job's wait ends when it
// starts) and the load from the sampler that ran from 10:05 to 16:59 UTC
// (mayor-bin/state/perf.log). Times are seconds after 10:00:00 UTC.
const LOCK_DAY = {
  // [lane, start, end]: lane 1 is the session that started first in each pair.
  sessions: [
    [1,448,4231], [2,518,3153], [1,4432,10509], [2,4560,5643], [1,11417,15605], [2,11816,17008], [1,18111,18970],
    [2,18220,19864],
  ],
  // [lane, waiting from, start, end]: lane 3 is the mayor's; a job that did not wait has waiting from = start.
  jobs: [
    [1,571,571,649], [1,723,723,803], [1,804,804,872], [1,908,908,915], [1,983,983,1053], [1,1054,1054,1151],
    [1,1147,1152,1185], [1,1497,1497,1511], [1,1521,1521,1556], [2,1602,1602,1739], [2,1740,1740,1892],
    [1,1629,1893,1896], [1,1933,1933,2047], [2,2046,2050,2209], [1,2063,2212,2222], [1,2286,2286,2329],
    [1,2557,2557,2586], [1,2712,2712,2919], [2,2864,2923,3083], [1,2927,3088,3260], [1,3329,3329,3349],
    [1,3373,3373,3414], [1,3447,3447,3510], [1,3646,3646,3709], [1,3710,3710,3806], [1,3807,3807,3895],
    [1,3896,3896,3990], [1,3990,3990,4050], [3,4184,4184,4255], [3,4255,4255,4349], [1,4718,4718,4991],
    [2,4906,4996,5239], [1,5103,5240,5247], [2,5299,5299,5530], [1,5345,5533,5603], [1,5739,5739,5801],
    [1,5922,5922,5985], [1,6014,6014,6103], [1,6201,6201,6245], [1,6331,6331,6343], [1,6430,6430,6525],
    [1,6739,6739,7008], [1,7112,7112,7167], [1,7197,7197,7340], [1,7354,7354,7499], [1,7561,7561,8170],
    [1,8218,8218,8508], [1,8508,8508,9090], [1,9090,9090,10285], [3,11016,11016,11128], [3,11128,11128,11264],
    [3,11264,11264,11349], [1,11735,11735,11766], [1,11812,11812,11848], [2,12080,12080,12099],
    [2,12130,12130,12152], [2,12308,12308,12332], [3,12347,12347,12411], [1,12372,12414,12795],
    [1,12813,12813,12979], [2,12906,12980,12981], [1,13288,13288,13298], [1,13492,13492,13557],
    [2,13559,13559,13609], [1,13640,13640,13669], [1,13693,13693,13736], [2,13798,13798,13802],
    [1,13802,13808,13813], [1,13905,13905,14010], [2,13909,14015,14048], [1,14032,14049,14066],
    [1,14075,14075,14606], [2,14096,14608,15000], [1,14637,15006,15473], [2,15070,15476,15691],
    [2,15744,15744,16106], [2,16173,16173,16341], [2,16341,16341,16782], [3,17008,17008,17126],
    [3,17128,17128,17137], [3,17137,17137,17468], [3,17502,17502,17742], [1,18530,18530,18530],
    [1,18536,18536,18537], [1,18628,18628,18706], [1,18712,18712,18849], [2,18856,18856,18873],
    [2,19023,19023,19025], [3,19036,19036,19101], [3,19101,19101,19206], [2,19228,19228,19252],
    [2,19276,19276,19313], [2,19332,19332,19344], [2,19541,19541,19604], [2,19604,19604,19709],
    [3,19892,19892,19955], [3,19955,19955,20042],
  ],
  // [time, one-minute load average, rounded], one sample a minute from 10:05:31.
  load: [
    [331,4], [391,4], [451,4], [511,3], [571,6], [632,32], [692,15], [752,22], [812,28], [872,26], [933,12],
    [993,12], [1053,26], [1113,58], [1173,34], [1233,17], [1293,8], [1353,5], [1414,4], [1474,4], [1534,8],
    [1594,5], [1654,6], [1714,42], [1774,24], [1835,43], [1895,30], [1955,14], [2015,10], [2075,7], [2136,16],
    [2196,45], [2256,21], [2316,11], [2376,7], [2437,6], [2497,4], [2557,4], [2617,3], [2677,3], [2737,4],
    [2798,5], [2858,4], [2918,5], [2978,6], [3038,60], [3098,47], [3159,29], [3219,15], [3279,9], [3339,6],
    [3399,5], [3459,4], [3519,4], [3580,4], [3640,5], [3700,6], [3760,37], [3820,33], [3881,47], [3941,98],
    [4001,50], [4061,22], [4121,12], [4181,7], [4242,12], [4302,37], [4362,25], [4422,12], [4482,13], [4542,7],
    [4602,6], [4663,5], [4723,4], [4783,7], [4843,7], [4903,9], [4964,9], [5024,9], [5084,13], [5144,24],
    [5205,29], [5265,20], [5325,12], [5385,15], [5446,26], [5506,27], [5566,15], [5626,11], [5686,11], [5746,9],
    [5806,14], [5867,9], [5927,7], [5987,8], [6047,8], [6107,10], [6167,7], [6227,7], [6287,8], [6348,7],
    [6408,10], [6468,14], [6528,11], [6588,6], [6648,5], [6708,10], [6768,9], [6828,8], [6889,7], [6949,6],
    [7009,7], [7069,6], [7129,4], [7189,4], [7249,15], [7309,12], [7370,11], [7430,14], [7490,14], [7550,9],
    [7610,21], [7671,42], [7731,72], [7791,51], [7851,31], [7912,22], [7972,16], [8032,20], [8092,17], [8152,10],
    [8213,9], [8273,39], [8333,35], [8393,47], [8453,64], [8514,39], [8574,29], [8634,19], [8694,13], [8755,11],
    [8815,21], [8875,30], [8935,38], [8995,33], [9056,53], [9116,68], [9176,113], [9237,133], [9297,138],
    [9357,175], [9417,219], [9478,210], [9538,166], [9599,162], [9659,161], [9719,155], [9780,125], [9840,111],
    [9900,90], [9960,75], [10021,94], [10081,104], [10141,127], [10202,98], [10262,88], [10322,92], [10382,98],
    [10443,70], [10503,80], [10564,86], [10624,81], [10684,61], [10745,67], [10805,55], [10865,62], [10926,58],
    [10986,56], [11046,79], [11106,67], [11167,94], [11227,84], [11287,57], [11348,41], [11408,32], [11468,24],
    [11528,24], [11589,28], [11649,49], [11709,39], [11770,31], [11830,27], [11890,28], [11950,32], [12011,38],
    [12071,35], [12132,35], [12194,69], [12255,63], [12315,44], [12379,51], [12439,70], [12501,58], [12562,68],
    [12622,110], [12682,154], [12742,114], [12802,56], [12863,99], [12923,120], [12983,80], [13043,37],
    [13104,26], [13164,40], [13224,26], [13284,24], [13344,59], [13405,34], [13465,24], [13525,43], [13585,64],
    [13646,70], [13706,103], [13766,93], [13826,53], [13887,36], [13947,38], [14007,38], [14067,35], [14128,65],
    [14188,61], [14249,50], [14309,49], [14370,76], [14431,106], [14491,102], [14552,85], [14612,62], [14673,46],
    [14733,54], [14794,48], [14854,41], [14914,31], [14975,32], [15035,41], [15096,59], [15157,60], [15217,52],
    [15278,64], [15338,57], [15398,50], [15459,32], [15519,25], [15579,22], [15639,24], [15700,27], [15760,25],
    [15821,38], [15881,69], [15941,46], [16002,35], [16062,29], [16122,23], [16183,18], [16243,22], [16304,30],
    [16364,30], [16424,37], [16485,43], [16546,45], [16606,38], [16666,31], [16727,30], [16787,37], [16847,45],
    [16908,36], [16968,37], [17028,31], [17088,26], [17149,20], [17209,29], [17269,31], [17330,30], [17390,27],
    [17450,24], [17511,55], [17571,158], [17631,157], [17692,145], [17752,122], [17812,60], [17872,32],
    [17932,16], [17992,11], [18053,15], [18113,41], [18173,54], [18233,26], [18294,20], [18354,14], [18414,9],
    [18474,8], [18534,6], [18594,6], [18654,15], [18715,14], [18775,68], [18835,70], [18895,38], [18955,20],
    [19016,14], [19076,11], [19136,36], [19196,51], [19256,28], [19317,17], [19377,10], [19437,8], [19497,6],
    [19557,6], [19617,18], [19677,66], [19738,43], [19798,20], [19858,15], [19918,9], [19978,17], [20038,34],
    [20098,17], [20158,9], [20219,7], [20279,5], [20339,4], [20399,4], [20459,4], [20519,4], [20579,5],
    [20639,4], [20699,4], [20759,4], [20820,4], [20880,4], [20940,4], [21000,4], [21060,4], [21120,4], [21180,4],
    [21240,4], [21300,4], [21360,5], [21420,5], [21481,4], [21541,4],
  ],
};

function lock(t, id, figureId) {
  const X = 16;
  const TRACK = WIDTH - 32;
  const SPAN = 3 * 3600;
  const LANES = [
    ["worker1", 56],
    ["worker2", 90],
    ["mayor", 124],
  ];
  const BAR = 12;
  const LOAD = { label: 160, top: 168, bottom: 236, max: 220 };
  const LEGEND = 272;
  const height = 284;
  const mark = count(`${id}.mark`, t.mark);
  if (mark >= LOAD.max) throw new Error(`Figure "${id}": the load mark ${mark} must be under the scale's top, ${LOAD.max}`);
  const top = Math.max(...LOCK_DAY.load.map(([, load]) => load));
  if (top > LOAD.max) throw new Error(`Figure "${id}": a load of ${top} is past the scale's top, ${LOAD.max}`);
  const loadY = (load) => LOAD.bottom - ((LOAD.bottom - LOAD.top) * load) / LOAD.max;
  const hhmm = (s) => t.time.replace("{h}", String(10 + Math.floor(s / 3600)).padStart(2, "0")).replace("{m}", String(Math.floor((s % 3600) / 60)).padStart(2, "0"));
  const draw = (from) => {
    const to = from + SPAN;
    const x = (s) => X + (TRACK * (Math.min(Math.max(s, from), to) - from)) / SPAN;
    // A span clipped to the panel, at least 1.2 units wide so a job of seconds shows.
    const span = (a, b, y, h, cls) => {
      if (b <= from || a >= to) return "";
      const x1 = x(a);
      const w = Math.max(x(b) - x1, 1.2);
      return `<rect x="${round(x1)}" y="${y}" width="${round(w)}" height="${h}" rx="1" class="${cls}"/>`;
    };
    const parts = [];
    LANES.forEach(([key, y], i) => {
      const lane = i + 1;
      parts.push(text(X, y, fit(`${id}.lanes.${key}`, t.lanes[key], TRACK, "note"), "fig-note"));
      const bar = y + 5;
      parts.push(`<line x1="${X}" y1="${bar + BAR / 2}" x2="${X + TRACK}" y2="${bar + BAR / 2}" class="fig-hair"/>`);
      for (const [l, a, b] of LOCK_DAY.sessions) if (l === lane) parts.push(span(a, b, bar, BAR, "fig-node"));
      for (const [l, w, a] of LOCK_DAY.jobs) if (l === lane && a > w) parts.push(span(w, a, bar + 2, BAR - 4, "fig-gate"));
      for (const [l, , a, b] of LOCK_DAY.jobs) if (l === lane) parts.push(span(a, b, bar + 2, BAR - 4, "fig-bar"));
    });
    parts.push(text(X, LOAD.label, fit(`${id}.load`, t.load, TRACK - 40, "note"), "fig-note"));
    const markY = loadY(mark);
    parts.push(`<line x1="${X}" y1="${round(markY)}" x2="${X + TRACK}" y2="${round(markY)}" class="fig-hair fig-dashed"/>`);
    parts.push(text(X, round(markY - 3), t.mark, "fig-note"));
    const samples = LOCK_DAY.load.filter(([s]) => s >= from && s < to);
    if (samples.length) {
      const line = samples.map(([s, load]) => `L${round(x(s))} ${round(loadY(load))}`).join("");
      parts.push(`<path d="M${round(x(samples[0][0]))} ${LOAD.bottom}${line}L${round(x(samples.at(-1)[0]))} ${LOAD.bottom}z" class="fig-area"/>`);
      const [ps, peak] = samples.reduce((best, sample) => (sample[1] > best[1] ? sample : best));
      const px = x(ps);
      const label = fit(`${id}.peak`, t.peak.replace("{n}", String(peak)), 120, "note");
      parts.push(`<circle cx="${round(px)}" cy="${round(loadY(peak))}" r="2.5" class="fig-dot"/>`);
      const right = px > X + TRACK / 2;
      parts.push(text(right ? px - 6 : px + 6, round(loadY(peak) + 3.5), label, "fig-note", right ? "end" : undefined));
    }
    parts.push(`<line x1="${X}" y1="${LOAD.bottom}" x2="${X + TRACK}" y2="${LOAD.bottom}" class="fig-line"/>`);
    for (let h = 0; h <= 3; h++) {
      const s = from + h * 3600;
      const hx = x(s);
      parts.push(`<line x1="${round(hx)}" y1="${LOAD.bottom}" x2="${round(hx)}" y2="${LOAD.bottom + 4}" class="fig-line"/>`);
      parts.push(text(hx, LOAD.bottom + 16, hhmm(s), "fig-note", h === 0 ? undefined : h === 3 ? "end" : "middle"));
    }
    const legend = [
      ["session", "fig-node"],
      ["held", "fig-bar"],
      ["waiting", "fig-gate"],
    ];
    legend.forEach(([key, cls], i) => {
      const lx = X + i * 96;
      parts.push(`<rect x="${lx}" y="${LEGEND - 8}" width="10" height="8" rx="1" class="${cls}"/>`);
      parts.push(text(lx + 15, LEGEND, fit(`${id}.legend.${key}`, t.legend[key], 96 - 15 - 6, "note"), "fig-note"));
    });
    const jobs = LOCK_DAY.jobs.filter(([, , a]) => a >= from && a < to);
    const waits = jobs.filter(([, w, a]) => a > w);
    const peak = Math.max(...samples.map(([, load]) => load));
    const summary = t.summary
      .replace("{jobs}", String(jobs.length))
      .replace("{waits}", String(waits.length))
      .replace("{minutes}", (waits.reduce((sum, [, w, a]) => sum + a - w, 0) / 60).toFixed(1).replace(".", t.decimal))
      .replace("{peak}", String(peak));
    return { body: parts.join(""), summary };
  };
  const panels = [
    ["am", 0],
    ["pm", SPAN],
  ].map(([key, from]) => {
    const { body, summary } = draw(from);
    return { title: `${t.title}, ${t.heads[key]}: ${summary}`, head: t.heads[key], height, body };
  });
  return { caption: t.caption, panels };
}

// The figure of the article on what an agent costs while it waits (the
// founder, 9 October 2026: "This is an important finding and should be
// documented"): the mayor's tokens per UTC day from 27 September to 10
// October 2026, each day's total and, of it, the tokens spent restarting a
// watch that had reported nothing, both in millions, as the mayor measured
// them from its own transcripts on 9 and 11 October; the rest of the day is
// the difference. Two days have no bar: 6 October, with no calls for 1.8
// hours after a login expired, and 9 October, the day of the change, with
// no calls until the evening; 8 October's data end at 21:23 UTC.
const WAITING_DAYS = [
  // [UTC day, tokens, of them restarts, note?], or [UTC day, null, null, note]
  ["2026-09-27", 31.08, 22.63],
  ["2026-09-28", 40.02, 8.42],
  ["2026-09-29", 73.75, 13.32],
  ["2026-09-30", 12.15, 11.93],
  ["2026-10-01", 28.62, 19.94],
  ["2026-10-02", 15.6, 11.85],
  ["2026-10-03", 72.31, 10.48],
  ["2026-10-04", 35.73, 14.16],
  ["2026-10-05", 33.09, 18.57],
  ["2026-10-06", null, null, "login"],
  ["2026-10-07", 56.71, 11.35],
  ["2026-10-08", 11.73, 8.03, "partial"],
  ["2026-10-09", null, null, "change"],
  ["2026-10-10", 10.78, 0],
];
const WAITING_MONTHS = { "09": "sep", "10": "oct" };

// (24) Waiting against everything else, per day — one panel, a row per UTC
// day: a bar to one scale whose orange part, from the baseline, is the
// restarts, then the day's total, and at the right the restarts' share of
// it, computed from the two numbers, under its heading at the legend's
// right. A day without a bar carries its note instead; the change's is
// green. The panel's accessible name gives every row in words.
function waitingPerDay(t, id, figureId) {
  const X = 16;
  const BAR = 60;
  const TRACK = 172;
  const TOP = 100;
  const PITCH = 16;
  const right = WIDTH - 16;
  const most = Math.max(...WAITING_DAYS.map(([, total]) => total ?? 0));
  const length = (value) => (TRACK * value) / most;
  const decimal = (value) => value.toFixed(1).replace(".", t.decimal);
  const width = (value, size) => value.length * ADVANCE[size];
  const legend = (y, cls, key) => [
    `<rect x="${X}" y="${y - 8}" width="8" height="8" rx="1.5" class="${cls}"/>`,
    text(30, y, fit(`${id}.legend.${key}`, t.legend[key], right - 30), "fig-note"),
  ].join("");
  const parts = [
    legend(56, "fig-gate", "restarts"),
    legend(71, "fig-bar-muted", "rest"),
    text(right, 71, fit(`${id}.share`, t.share, right - 30 - width(t.legend.rest, "note") - 12), "fig-note fig-wait", "end"),
    `<line x1="${X}" y1="82" x2="${right}" y2="82" class="fig-hair"/>`,
  ];
  const named = [];
  WAITING_DAYS.forEach(([date, total, restarts, note], i) => {
    const y = TOP + i * PITCH;
    const day = fit(`${id}.day`, t.day.replace("{d}", String(Number(date.slice(8)))).replace("{m}", t.months[WAITING_MONTHS[date.slice(5, 7)]]), BAR - X - 4);
    parts.push(text(X, y, day, "fig-note"));
    if (total === null) {
      const value = fit(`${id}.notes.${note}`, t.notes[note], right - BAR);
      parts.push(text(BAR, y, value, note === "change" ? "fig-note fig-ok" : "fig-note"));
      named.push(`${day}: ${value}`);
      return;
    }
    const share = t.percent.replace("{n}", String(Math.round((100 * restarts) / total)));
    const end = BAR + length(total);
    if (restarts > 0) parts.push(`<rect x="${BAR}" y="${y - 8}" width="${round(length(restarts))}" height="9" class="fig-gate"/>`);
    parts.push(`<rect x="${round(BAR + length(restarts))}" y="${y - 8}" width="${round(length(total - restarts))}" height="9" class="fig-bar-muted"/>`);
    parts.push(text(end + 5, y, decimal(total), "fig-note"));
    parts.push(text(right, y, share, "fig-label fig-small fig-wait", "end"));
    let line = t.named.replace("{day}", day).replace("{total}", decimal(total)).replace("{share}", share);
    if (note) {
      const from = end + 5 + width(decimal(total), "note") + 8;
      const value = fit(`${id}.notes.${note}`, t.notes[note], right - width(share, "small") - 8 - from);
      parts.push(text(from, y, value, "fig-note"));
      line += ` (${value})`;
    }
    named.push(line);
  });
  const height = TOP + (WAITING_DAYS.length - 1) * PITCH + 12;
  return {
    caption: t.caption,
    panels: [{ title: `${t.title}: ${named.join("; ")}`, head: t.head, height, body: parts.join("") }],
  };
}

// The two figures of the first part of the series "From AI chat to agentic
// work" (si-mcvo), drawn after the founder's sketches of 6 October 2026: the
// same fix made in a chat and by an AI agent, and the five parts of an AI
// agent. The human is orange, as the founder in the loop figure; the model
// and the AI agent are green.

/**
 * A 40-unit node: a label with a note under it, `t` holding both. `tone` is
 * "wait" for the human (orange outline and label) or "ok" for the model
 * (green); without it the node is plain.
 */
function card(x, y, width, key, t, tone = "") {
  const parts = [`<rect x="${x}" y="${y}" width="${width}" height="40" rx="8" class="fig-node"/>`];
  if (tone) parts.push(`<rect x="${x}" y="${y}" width="${width}" height="40" rx="8" class="${tone === "ok" ? "fig-accent-stroke" : "fig-wait-stroke"}"/>`);
  parts.push(text(x + width / 2, y + 17, fit(`${key}.label`, t.label, width - 8, "label"), `fig-label${tone ? ` fig-${tone}` : ""}`, "middle"));
  parts.push(text(x + width / 2, y + 31, fit(`${key}.note`, t.note, width - 8), "fig-note", "middle"));
  return parts.join("");
}

// (25) The same fix twice — wide, two panels. In the chat the human carries
// every round: the question to the chat, its suggestion to the editor, the
// tests and the error back. With an AI agent the rounds happen inside the
// tool (the dashed green box), and the human gives the task and reviews.
function chatOrAgent(t, id, figureId) {
  const height = 316;
  const [p1, p2] = [1, 2].map((n) => `${figureId}-p${n}`);
  const c = t.chat;
  const chat = [
    card(110, 50, 100, `${id}.chat.chat`, c.chat),
    card(16, 128, 128, `${id}.chat.human`, c.human, "wait"),
    card(196, 128, 108, `${id}.chat.editor`, c.editor),
    card(110, 206, 100, `${id}.chat.tests`, c.tests),
    pathArrow(p1, "M80 126C80 96 92 72 106 70"),
    pathArrow(p1, "M214 70C236 72 250 96 250 124"),
    pathArrow(p1, "M250 170C250 200 236 222 214 225"),
    pathArrow(p1, "M106 225C92 222 80 200 80 172"),
    text(160, 286, fit(`${id}.chat.note`, c.note, 288), "fig-note", "middle"),
    text(160, 300, fit(`${id}.chat.note2`, c.note2, 288), "fig-note", "middle"),
  ].join("");
  const a = t.agent;
  const agent = [
    card(16, 50, 116, `${id}.agent.task`, a.task, "wait"),
    `<rect x="12" y="108" width="296" height="128" rx="10" class="fig-accent-stroke fig-dashed"/>`,
    text(298, 124, fit(`${id}.agent.agent`, a.agent, 140), "fig-note fig-ok fig-strong", "end"),
    arrow(p2, 74, 92, 74, 134),
    card(20, 136, 88, `${id}.agent.read`, a.read),
    card(116, 136, 88, `${id}.agent.change`, a.change),
    card(212, 136, 88, `${id}.agent.test`, a.test),
    arrow(p2, 108, 156, 114, 156),
    arrow(p2, 204, 156, 210, 156),
    pathArrow(p2, "M256 178C256 214 104 214 66 180", true),
    text(160, 228, fit(`${id}.agent.again`, a.again, 200), "fig-note", "middle"),
    card(184, 256, 120, `${id}.agent.review`, a.review, "wait"),
    arrow(p2, 244, 236, 244, 254),
    text(16, 266, fit(`${id}.agent.note`, a.note, 160), "fig-note"),
    text(16, 280, fit(`${id}.agent.note2`, a.note2, 160), "fig-note"),
    text(16, 294, fit(`${id}.agent.note3`, a.note3, 160), "fig-note"),
  ].join("");
  return {
    caption: t.caption,
    panels: [
      { title: c.title, head: c.head, height, body: chat },
      { title: a.title, head: a.head, height, body: agent },
    ],
  };
}

// (26) The five parts of an AI agent — one panel: the model in the middle,
// the instructions and the tools feeding it, the loop under it and the
// harness, dashed, around it all.
function fiveParts(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const body = [
    `<rect x="16" y="52" width="288" height="220" rx="12" class="fig-line fig-dashed"/>`,
    card(30, 70, 112, `${id}.instructions`, t.instructions),
    card(178, 70, 112, `${id}.tools`, t.tools),
    card(116, 128, 88, `${id}.model`, t.model, "ok"),
    arrow(pid, 104, 112, 126, 126),
    arrow(pid, 216, 112, 194, 126),
    pathArrow(pid, "M204 162C228 178 212 208 160 208C108 208 92 178 114 164"),
    text(160, 232, fit(`${id}.loop`, t.loop, 272), "fig-note", "middle"),
    text(160, 260, fit(`${id}.harness`, t.harness, 272), "fig-note fig-strong", "middle"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 288, body }] };
}

/**
 * Break `value` into lines that fit `slot` units at `size`, at most `max`
 * of them, at spaces outside backticks, so a command such as
 * `npm test -- <file>` is never split. Lines after the first are `indent`
 * characters narrower: a list item's hanging indent. Throws, naming the key,
 * when a word does not fit or the text needs more lines.
 */
function wrap(key, value, slot, size = "note", max = 3, indent = 0) {
  // The characters line n holds: the slot, less the indent after the first.
  const room = (n) => Math.floor((slot - (n > 0 ? indent * ADVANCE[size] : 0)) / ADVANCE[size]);
  const lines = [];
  for (const word of value.match(/(?:`[^`]*`|[^\s`])+/g)) {
    const n = lines.length - 1;
    if (n >= 0 && lines[n].length + 1 + word.length <= room(n)) {
      lines[n] = `${lines[n]} ${word}`;
    } else {
      if (word.length > room(n + 1)) throw new Error(`Figure label "${key}" has a word of ${word.length} characters; at most ${room(n + 1)} fit its slot ("${word}")`);
      lines.push(word);
    }
  }
  if (lines.length > max) throw new Error(`Figure label "${key}" needs ${lines.length} lines; at most ${max} fit ("${value}")`);
  return lines;
}

// (27) The instruction file of part 2's story, on its first day and a few
// weeks later — wide, two panels, the file's lines in English in both
// languages (the founder: no Swedish instruction files). The first day is
// part 1's eight lines; a few weeks later the root file has the line on a
// single test file (added, "+"), the migrations rule with its reason and way
// out (changed, "~"), the section on every file struck out (cut, "−", grey)
// and, under it, web/AGENTS.md as a card of its own (a new file, green
// frame). Each mark is a sign in the gutter and a word in the key, not a
// colour alone. A long line breaks at a space with a list item's hanging
// indent, never inside a command. Each panel is as tall as its file, so the
// first day's card is the shorter one.
function fileBeforeAfter(t, id, figureId) {
  const L = t.lines;
  const GUTTER = 14;
  const X = 24;
  const SLOT = WIDTH - X - 12;
  const STEP = 14;
  const INDENT = 2 * ADVANCE.note;
  const MARK = {
    added: { sign: "+", cls: "fig-note fig-ok fig-strong" },
    changed: { sign: "~", cls: "fig-note fig-wait fig-strong" },
    cut: { sign: "−", cls: "fig-note fig-muted", struck: true },
  };
  // A file drawn line by line from `top`: each row is [key, mark] with mark
  // "added", "changed", "cut" or none; null is the file's blank line.
  const file = (rows, top) => {
    const parts = [];
    let y = top;
    for (const row of rows) {
      if (row === null) {
        y += STEP / 2;
        continue;
      }
      const [key, mark] = row;
      const value = L[key];
      const heading = value.startsWith("#");
      const style = MARK[mark];
      const cls = style ? style.cls : `fig-note${heading ? " fig-strong" : ""}`;
      const lines = wrap(`${id}.lines.${key}`, value, SLOT, "note", 3, 2);
      if (style) parts.push(text(GUTTER, y, style.sign, style.cls, "middle"));
      lines.forEach((line, n) => parts.push(text(n ? X + INDENT : X, y + n * STEP, line, cls, undefined, style?.struck)));
      y += lines.length * STEP;
    }
    return { body: parts.join(""), bottom: y - STEP };
  };

  const first = file([["title"], null, ["build"], ["install"], ["test"], null, ["rules"], ["bug"], ["migrations"], ["package"]], 60);
  const later = file(
    [["title"], null, ["build"], ["install"], ["single", "added"], ["test"], null, ["rules"], ["bug"], ["migrationsLater", "changed"], ["package"], null, ["overview", "cut"]],
    60,
  );

  // web/AGENTS.md, a new file: a green-framed card with its name and its line.
  const cardTop = later.bottom + 20;
  const webLines = wrap(`${id}.lines.web`, L.web, WIDTH - 16 - 8 - X, "note", 3, 2);
  const cardHeight = 30 + webLines.length * STEP;
  const card = [
    `<rect x="16" y="${cardTop}" width="${WIDTH - 32}" height="${cardHeight}" rx="6" class="fig-node"/>`,
    `<rect x="16" y="${cardTop}" width="${WIDTH - 32}" height="${cardHeight}" rx="6" class="fig-accent-stroke"/>`,
    text(X, cardTop + 17, fit(`${id}.webFile`, t.webFile, WIDTH - 32 - 16), "fig-note fig-ok fig-strong"),
    ...webLines.map((line, n) => text(n ? X + INDENT : X, cardTop + 17 + (n + 1) * STEP, line, "fig-note fig-ok")),
  ];

  // The key: each mark's sign and what it means.
  const keyTop = cardTop + cardHeight + 18;
  const legend = [`<line x1="16" y1="${keyTop - 4}" x2="${WIDTH - 16}" y2="${keyTop - 4}" class="fig-hair"/>`];
  ["added", "changed", "cut"].forEach((mark, i) => {
    const y = keyTop + 14 + i * STEP;
    legend.push(text(GUTTER, y, MARK[mark].sign, MARK[mark].cls, "middle"));
    legend.push(text(X, y, fit(`${id}.marks.${mark}`, t.marks[mark], SLOT), MARK[mark].cls.replace(" fig-strong", "")));
  });
  const newY = keyTop + 14 + 3 * STEP;
  legend.push(`<rect x="${GUTTER - 4.5}" y="${newY - 8}" width="9" height="9" rx="2" class="fig-accent-stroke"/>`);
  legend.push(text(X, newY, fit(`${id}.marks.newFile`, t.marks.newFile, SLOT), "fig-note fig-ok"));

  return {
    caption: t.caption,
    panels: [
      { title: t.first.title, head: t.first.head, headRight: { value: t.file, cls: "" }, height: first.bottom + 18, body: first.body },
      { title: t.later.title, head: t.later.head, headRight: { value: t.file, cls: "" }, height: newY + 14, body: [later.body, ...card, ...legend].join("") },
    ],
  };
}

// (28) Which of the project's files each tool reads — one panel, the files
// on the left and the three tools on the right, an arrow from a file to each
// tool that reads it, as the vendors' pages stood on 12 October 2026: Codex
// reads AGENTS.md; GitHub Copilot reads AGENTS.md and
// .github/copilot-instructions.md; Claude Code reads AGENTS.md when there is
// no CLAUDE.md, and a CLAUDE.md (dashed: a project need not have one) when
// there is one, whose line @AGENTS.md (the dashed line) imports AGENTS.md.
// The file and tool names and the @ line are the same in both languages.
function whichToolReadsWhat(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const F = t.files;
  const T = t.tools;
  const node = (x, y, width, height, dashed = false) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" class="fig-node${dashed ? " fig-dashed" : ""}"/>`;
  const frame = (x, y, width, height) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" class="fig-accent-stroke"/>`;
  const name = (x, y, key, value, slot, cls = "fig-label fig-small", anchor) => text(x, y, fit(key, value, slot, "small"), cls, anchor);
  const TX = 196;
  const TW = WIDTH - 16 - TX;
  const tool = (y, key) => [node(TX, y, TW, 26), name(TX + TW / 2, y + 17.5, `${id}.tools.${key}`, T[key], TW - 6, "fig-label fig-small", "middle")].join("");
  // .github/copilot-instructions.md on two lines: the folder, then the file.
  const slash = F.copilot.indexOf("/") + 1;
  const [folder, file] = [F.copilot.slice(0, slash), F.copilot.slice(slash)];
  const ifNone = wrap(`${id}.ifNone`, t.ifNone, WIDTH - 16 - 146, "note", 2);
  const body = [
    // The files.
    node(16, 50, 158, 38),
    text(21, 65, fit(`${id}.files.copilot`, folder, 147), "fig-note"),
    text(21, 79, fit(`${id}.files.copilot`, file, 147), "fig-note fig-strong"),
    node(16, 118, 84, 26),
    frame(16, 118, 84, 26),
    name(22, 135.5, `${id}.files.agents`, F.agents, 72),
    node(16, 188, 108, 46, true),
    name(22, 205.5, `${id}.files.claude`, F.claude, 96),
    text(22, 223, fit(`${id}.files.import`, F.import, 96), "fig-note fig-strong"),
    text(16, 250, fit(`${id}.ifClaude`, t.ifClaude, WIDTH - 32), "fig-note"),
    // The tools.
    tool(70, "copilot"),
    tool(118, "codex"),
    tool(196, "claude"),
    // Who reads what.
    arrow(pid, 174, 78, 194, 82),
    arrow(pid, 100, 124, 194, 94),
    arrow(pid, 100, 131, 194, 131),
    pathArrow(pid, "M92 144C120 176 160 196 194 202"),
    arrow(pid, 124, 216, 194, 216),
    ...ifNone.map((line, n) => text(146, 164 + n * 13, line, "fig-note")),
    // @AGENTS.md in CLAUDE.md imports AGENTS.md.
    pathArrow(pid, "M90 219C112 214 112 168 70 146", true),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 264, body }] };
}

// (29) The same project as a folder tree, in the cover's drawing: the top
// folder with its files, a folder inside it and the folder of its own
// instruction file, `web/`. Under each file the tools that read it, each with
// a tick and its name (a sign and a word, not a colour alone); where a tool
// reads it only on a condition the condition stands beside it, in words. The
// optional CLAUDE.md has a dashed glyph and the word, and its one line
// (`@AGENTS.md`, a chip) pulls in the AGENTS.md in the top folder (the dashed
// arrow). The file in `web/` is framed in green and says it has the last
// word: the file closest to the work, as the article has it. File, folder and
// tool names are the same in both languages (the founder: no Swedish file
// names).
function fileHierarchy(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const F = t.files;
  const T = t.tools;
  const RIGHT = WIDTH - 16;
  const TREE = 28; // the top folder's stem
  const KIDS = 54; // the stem of a folder one level down
  const NAME1 = 70; // a name at the first level; the second level's is at NAME2
  const NAME2 = 92;
  const note = (x, y, key, value, slot, cls = "fig-note", anchor) => text(x, y, fit(key, value, slot), cls, anchor);
  const name = (x, y, key, value, slot) => text(x, y, fit(key, value, slot, "small"), "fig-label fig-small");
  // The folder glyph of the cover: a tab on an outline; `w` and `h` its size.
  const folder = (x, y, w = 16, h = 13) => `<path d="M${x} ${y + h}V${y}h6.5l2 3H${x + w}V${y + h}z" class="fig-node"/>`;
  const file = (x, y, dashed = false) => `<rect x="${x}" y="${y}" width="12" height="16" rx="2.5" class="fig-node${dashed ? " fig-dashed" : ""}"/>`;
  const branch = (d) => `<path d="${d}" class="fig-line"/>`;
  // A line of readers from x: a tick and the tool's name, then the condition
  // when there is one (`when` is [value, class]); the line must end at the margin.
  const reads = (x, y, key, items) => {
    const parts = [];
    let at = x;
    for (const { tool, when } of items) {
      parts.push(check(at + 4.5, y - 3.2), text(at + 14, y, T[tool], "fig-note fig-strong"));
      at += 14 + T[tool].length * ADVANCE.note;
      if (when) {
        at += 6;
        parts.push(text(at, y, when[0], when[1]));
        at += when[0].length * ADVANCE.note;
      }
      at += 12;
    }
    if (at - 12 > RIGHT) throw new Error(`Figure label "${key}" runs to ${round(at - 12)} units; at most ${RIGHT} fit its line`);
    return parts.join("");
  };
  const unlessClaude = [t.ifNoClaude, "fig-note fig-wait"];

  const body = [
    // The tree.
    branch(`M${TREE} 67V262`),
    ...[90, 150, 194, 262].map((y) => branch(`M${TREE} ${y}H44`)),
    branch(`M${KIDS} 201V218H68`),
    branch(`M${KIDS} 269V286H68`),
    // The top folder.
    folder(16, 50, 24, 17),
    name(48, 63, `${id}.root`, t.root, 80),
    note(RIGHT, 63, `${id}.atStart`, t.atStart, 160, "fig-note", "end"),
    // AGENTS.md: Codex, Copilot, and Claude Code where there is no CLAUDE.md.
    file(48, 82),
    name(NAME1, 94, `${id}.files.agents`, F.agents, 80),
    reads(NAME1, 110, `${id}.reads.agents`, [{ tool: "codex" }, { tool: "copilot" }]),
    reads(NAME1, 124, `${id}.reads.agentsClaude`, [{ tool: "claude", when: unlessClaude }]),
    // CLAUDE.md: optional, read by Claude Code, whose one line pulls in AGENTS.md.
    file(48, 142, true),
    name(NAME1, 154, `${id}.files.claude`, F.claude, 80),
    note(NAME1 + F.claude.length * ADVANCE.small + 10, 154, `${id}.optional`, t.optional, 80),
    reads(NAME1, 170, `${id}.reads.claude`, [{ tool: "claude" }]),
    `<rect x="176" y="158" width="76" height="16" rx="4" class="fig-node"/>`,
    text(214, 169.5, fit(`${id}.import`, F.import, 70), "fig-note fig-strong", "middle"),
    pathArrow(pid, "M252 166H294V90H140", true),
    text(217, 85, fit(`${id}.pulls`, t.pulls, 100), "fig-note", "middle"),
    // .github/copilot-instructions.md: read by Copilot.
    folder(46, 188),
    name(NAME1, 198, `${id}.files.github`, F.github, 100),
    file(70, 210),
    name(NAME2, 222, `${id}.files.copilot`, F.copilot, RIGHT - NAME2),
    reads(NAME2, 238, `${id}.reads.copilot`, [{ tool: "copilot" }]),
    // web/ and its own AGENTS.md: read when the tool works in that folder,
    // and the closest file has the last word.
    folder(46, 256),
    name(NAME1, 266, `${id}.files.web`, F.web, 60),
    note(RIGHT, 266, `${id}.inWeb`, t.inWeb, RIGHT - NAME1 - F.web.length * ADVANCE.small - 8, "fig-note", "end"),
    `<rect x="62" y="272" width="250" height="58" rx="6" class="fig-accent-stroke"/>`,
    file(70, 278),
    name(NAME2, 290, `${id}.files.agents`, F.agents, 80),
    note(RIGHT, 290, `${id}.lastWord`, t.lastWord, 90, "fig-note fig-ok fig-strong", "end"),
    reads(NAME2, 306, `${id}.reads.web`, [{ tool: "codex" }, { tool: "copilot", when: [t.inVsCode, "fig-note"] }]),
    reads(NAME2, 320, `${id}.reads.webClaude`, [{ tool: "claude", when: unlessClaude }]),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 346, body }] };
}

// (27) The four things outside the model that steer the work in the factory —
// one panel: the founder approving the plan and the task with a clear end
// above, the instructions and the model in the loop inside the dashed agent
// box, the gates and the founder reading the result below.
function fourThings(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const body = [
    card(16, 52, 124, `${id}.founderPlan`, t.founderPlan, "wait"),
    card(180, 52, 124, `${id}.task`, t.task),
    arrow(pid, 140, 72, 178, 72),
    `<rect x="12" y="112" width="296" height="88" rx="10" class="fig-accent-stroke fig-dashed"/>`,
    text(24, 129, fit(`${id}.agent`, t.agent, 272), "fig-note fig-ok fig-strong"),
    arrow(pid, 242, 94, 242, 138),
    card(24, 140, 124, `${id}.instructions`, t.instructions),
    card(172, 140, 124, `${id}.model`, t.model, "ok"),
    arrow(pid, 148, 160, 170, 160),
    arrow(pid, 86, 202, 86, 226),
    card(16, 228, 124, `${id}.gates`, t.gates),
    `<rect x="126" y="236" width="4" height="10" rx="1" class="fig-gate"/>`,
    `<rect x="126" y="250" width="4" height="10" rx="1" class="fig-gate"/>`,
    arrow(pid, 140, 248, 178, 248),
    card(180, 228, 124, `${id}.founderResult`, t.founderResult, "wait"),
    text(160, 292, fit(`${id}.note`, t.note, 288), "fig-note", "middle"),
    text(160, 306, fit(`${id}.note2`, t.note2, 288), "fig-note", "middle"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 320, body }] };
}

// (30) A job handed over — wide, one panel: the made-up reviewer of part 3.
// The main agent, which wrote the change, hands a task down; the reviewer, in
// a frame of its own with its own context, may read and search (ticks) and
// may not edit files or run commands (crosses); the comments come back to
// the developer, a card in the orange of the people in the other figures,
// who reads them and decides. A sign and a word say what is allowed, not a
// colour alone.
function agentHandover(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const R = t.reviewer;
  const RIGHT = WIDTH - 28;
  const cross = (x, y) => `<path d="M${round(x - 3.5)} ${round(y - 3.5)}l7 7m0-7l-7 7" class="fig-wait-stroke" stroke-linecap="round"/>`;
  // A line of tools from x: a sign and the tool's word, left to right; the
  // line must end inside the frame.
  const tools = (x, y, key, words, sign) => {
    const parts = [];
    let at = x;
    for (const word of words) {
      parts.push(sign(at + 4.5, y - 3.2), text(at + 14, y, word, "fig-note fig-strong"));
      at += 14 + word.length * ADVANCE.note + 12;
    }
    if (at - 12 > RIGHT) throw new Error(`Figure label "${key}" runs to ${round(at - 12)} units; at most ${RIGHT} fit its line`);
    return parts.join("");
  };
  const body = [
    card(90, 48, 140, `${id}.main`, t.main),
    arrow(pid, 160, 88, 160, 120),
    text(170, 108, fit(`${id}.task`, t.task, 134), "fig-note"),
    `<rect x="16" y="122" width="288" height="108" rx="10" class="fig-node"/>`,
    `<rect x="16" y="122" width="288" height="108" rx="10" class="fig-accent-stroke"/>`,
    text(28, 144, fit(`${id}.reviewer.name`, R.name, 100, "label"), "fig-label fig-ok fig-strong"),
    text(292, 144, fit(`${id}.reviewer.context`, R.context, 160), "fig-note", "end"),
    text(28, 176, fit(`${id}.reviewer.may`, R.may, 56), "fig-note"),
    tools(90, 176, `${id}.reviewer.read`, [R.read, R.search], check),
    text(28, 206, fit(`${id}.reviewer.mayNot`, R.mayNot, 56), "fig-note"),
    tools(90, 206, `${id}.reviewer.edit`, [R.edit, R.run], cross),
    arrow(pid, 160, 230, 160, 252),
    text(170, 246, fit(`${id}.back`, t.back, 134), "fig-note"),
    card(90, 254, 140, `${id}.you`, t.you, "wait"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 310, body }] };
}

// (31) The agent's file in four parts — one panel, a file as four rows: the
// key (or, for the instructions, the text under the dashes), the made-up
// reviewer's value in English as in the file in the article, and in words what
// the part is for. The description is framed in green: it is the part the main
// agent reads when it decides whether to hand a task over.
function agentFile(t, id, figureId) {
  const ROW = 52;
  const TOP = 50;
  const VALUE_X = 130;
  const parts = [`<rect x="16" y="${TOP}" width="288" height="${ROW * 4}" rx="8" class="fig-node"/>`];
  ["name", "description", "tools", "instructions"].forEach((key, i) => {
    const y = TOP + i * ROW;
    if (i > 0) parts.push(`<line x1="16" y1="${y}" x2="304" y2="${y}" class="fig-hair"/>`);
    parts.push(text(28, y + 22, fit(`${id}.parts.${key}`, t.parts[key], VALUE_X - 28 - 4, "small"), "fig-label fig-small"));
    parts.push(text(VALUE_X, y + 21, fit(`${id}.values.${key}`, t.values[key], 304 - VALUE_X - 8), "fig-note fig-strong"));
    parts.push(text(28, y + 39, fit(`${id}.for.${key}`, t.for[key], 304 - 28 - 8), "fig-note"));
  });
  parts.push(`<rect x="16" y="${TOP + ROW}" width="288" height="${ROW}" rx="6" class="fig-accent-stroke"/>`);
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: TOP + ROW * 4 + 16, body: parts.join("") }] };
}

// (32) A skill as a folder tree, in the cover's drawing: the skill's folder,
// its SKILL.md with the two things the agent meets in it (the name and
// description, always in view; the instructions, read when the task needs
// them) and the scripts folder with the script, which is run when the
// instructions say so and of which only the output is read. Each part carries
// its "when" in words, not in a colour alone. File and folder names are the
// same in both languages (the founder: no Swedish file names).
function skillFolder(t, id, figureId) {
  const RIGHT = WIDTH - 16;
  const TREE = 28; // the top folder's stem
  const KIDS = 54; // the stem of a folder one level down
  const NAME1 = 70;
  const NAME2 = 92;
  const name = (x, y, key, value, slot) => text(x, y, fit(key, value, slot, "small"), "fig-label fig-small");
  const note = (x, y, key, value, slot, cls = "fig-note") => text(x, y, fit(key, value, slot), cls);
  const folder = (x, y, w = 16, h = 13) => `<path d="M${x} ${y + h}V${y}h6.5l2 3H${x + w}V${y + h}z" class="fig-node"/>`;
  const file = (x, y) => `<rect x="${x}" y="${y}" width="12" height="16" rx="2.5" class="fig-node"/>`;
  const branch = (d) => `<path d="${d}" class="fig-line"/>`;
  const F = t.files;
  const body = [
    // The tree.
    branch(`M${TREE} 67V183`),
    ...[90, 183].map((y) => branch(`M${TREE} ${y}H44`)),
    branch(`M${KIDS} 100V143`),
    ...[111, 143].map((y) => branch(`M${KIDS} ${y}H68`)),
    branch(`M${KIDS} 190V206H68`),
    // The skill's folder.
    folder(16, 50, 24, 17),
    name(48, 63, `${id}.files.root`, F.root, RIGHT - 48),
    // SKILL.md and the two things in it.
    file(48, 82),
    name(NAME1, 94, `${id}.files.skill`, F.skill, RIGHT - NAME1),
    note(NAME1 + 4, 115, `${id}.parts.nameDescription`, t.parts.nameDescription, RIGHT - NAME1 - 4, "fig-note fig-strong"),
    note(NAME1 + 4, 128, `${id}.when.always`, t.when.always, RIGHT - NAME1 - 4, "fig-note fig-ok fig-strong"),
    note(NAME1 + 4, 147, `${id}.parts.instructions`, t.parts.instructions, RIGHT - NAME1 - 4, "fig-note fig-strong"),
    note(NAME1 + 4, 160, `${id}.when.needed`, t.when.needed, RIGHT - NAME1 - 4),
    // The scripts folder and its script.
    folder(46, 176),
    name(NAME1, 186, `${id}.files.scripts`, F.scripts, RIGHT - NAME1),
    file(70, 198),
    name(NAME2, 210, `${id}.files.check`, F.check, RIGHT - NAME2),
    note(NAME2, 226, `${id}.when.run`, t.when.run, RIGHT - NAME2),
    note(NAME2, 239, `${id}.when.output`, t.when.output, RIGHT - NAME2),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 256, body }] };
}

// (33) Where each tool looks for a project's skills — the three folders on
// the left, a tick and the tool's name under each for every tool whose
// documentation names the folder: Claude Code .claude/skills, Codex
// .agents/skills, GitHub Copilot all three (30 October 2026). A line under
// the rows says the skill itself is the same in all three. Folder and tool
// names are the same in both languages.
function skillLocations(t, id, figureId) {
  const RIGHT = WIDTH - 16;
  const NAME = 40;
  const T = t.tools;
  const folder = (x, y, w = 16, h = 13) => `<path d="M${x} ${y + h}V${y}h6.5l2 3H${x + w}V${y + h}z" class="fig-node"/>`;
  const reads = (x, y, key, tools) => {
    const parts = [];
    let at = x;
    for (const tool of tools) {
      parts.push(check(at + 4.5, y - 3.2), text(at + 14, y, T[tool], "fig-note fig-strong"));
      at += 14 + T[tool].length * ADVANCE.note + 12;
    }
    if (at - 12 > RIGHT) throw new Error(`Figure label "${key}" runs to ${round(at - 12)} units; at most ${RIGHT} fit its line`);
    return parts.join("");
  };
  const rows = [
    ["claude", ["claude", "copilot"]],
    ["agents", ["codex", "copilot"]],
    ["github", ["copilot"]],
  ];
  const parts = [];
  rows.forEach(([key, tools], i) => {
    const y = 52 + i * 46;
    parts.push(folder(16, y), text(NAME, y + 10, fit(`${id}.folders.${key}`, t.folders[key], RIGHT - NAME, "small"), "fig-label fig-small"), reads(NAME, y + 28, `${id}.reads.${key}`, tools));
  });
  const same = wrap(`${id}.same`, t.same, WIDTH - 32, "note", 2);
  same.forEach((line, n) => parts.push(text(16, 204 + n * 13, line, "fig-note")));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 204 + same.length * 13 + 6, body: parts.join("") }] };
}

// (30) Three ways to reach a system — for developers (si-th27; the three
// routes by si-uutd after the founder's note of 31 October 2026; left to right
// by si-05r9 after his second note that day, "a system overview, not an
// architecture diagram"). The agent app on one side, GitHub's API on the other
// and between them the three routes the article names, one lane each, all
// ending in the same API. Through an MCP server (the green frame, as it is the
// article's subject): local over stdio or remote over HTTP, and the tools it
// offers, each with a word for what it does (reads, changes), so the two
// read-only limits of the next figure have something to stop. Through the CLI:
// the agent app runs the system's command-line tool, gh, in the terminal.
// Directly: no program in between, only a line, as the agent app calls the API
// itself with an HTTP request and a token. The tool names are plain words, not
// GitHub's own.
//
// Two views of one drawing (a panel is 320 units, and three routes with the
// two end cards side by side do not fit that without shrinking the type):
// the flow view, FLOW_WIDTH units wide and left to right, shown from 51rem,
// and the stacked view, the 320-unit drawing from before, the agent app at the
// top and the API at the bottom, shown below it. Both draw from the same
// strings; base.css shows one and hides the other.
function mcpServer(t, id, figureId) {
  const flow = `${figureId}-p1`;
  const stack = `${figureId}-p2`;
  return {
    caption: t.caption,
    panels: [
      { title: t.title, head: t.head, width: FLOW_WIDTH, height: 312, view: "flow", body: mcpServerFlow(t, id, flow) },
      { title: t.title, head: t.head, height: 412, view: "stack", body: mcpServerStack(t, id, stack) },
    ],
  };
}

/** The tool rows of the MCP frame, in both views: a name, and what it does on the right. */
function mcpTool(id, t, key, x, y, inner) {
  return [
    text(x, y, fit(`${id}.tools.${key}.label`, t.tools[key].label, inner - 66, "small"), "fig-label fig-small"),
    text(x + inner, y, fit(`${id}.tools.${key}.kind`, t.tools[key].kind, 60), key === "create" ? "fig-note fig-wait fig-strong" : "fig-note", "end"),
  ].join("");
}

// The flow view: the agent app and GitHub's API as tall cards at the two ends,
// and each route a lane from one to the other at its own height. The cards
// are as tall as the three lanes, so each lane's line leaves and enters at its
// own height; there is no line down an edge. The direct route is the bare
// line, with its words above it.
function mcpServerFlow(t, id, pid) {
  const W = FLOW_WIDTH;
  const CARD_W = 200;
  const CARD_Y = 54;
  const CARD_H = 242;
  const RIGHT_X = W - 16 - CARD_W;
  const LEFT_EDGE = 16 + CARD_W;
  const BOX_W = 240;
  const BOX_X = (W - BOX_W) / 2;
  const INNER = BOX_W - 24;
  const TEXT_X = BOX_X + 12;
  const MCP_Y = CARD_Y;
  const CLI_Y = 176;
  const DIRECT_Y = 280;
  const frame = (y, height, accent = false) => [
    `<rect x="${BOX_X}" y="${y}" width="${BOX_W}" height="${height}" rx="8" class="fig-node"/>`,
    accent ? `<rect x="${BOX_X}" y="${y}" width="${BOX_W}" height="${height}" rx="8" class="fig-accent-stroke"/>` : "",
  ].join("");
  // The way into a box from the agent app, and out of it to the API.
  const join = (y) => [`<line x1="${LEFT_EDGE}" y1="${y}" x2="${BOX_X}" y2="${y}" class="fig-line"/>`, arrow(pid, BOX_X + BOX_W, y, RIGHT_X - 1, y)].join("");
  const end = (x, key, card) => [
    `<rect x="${x}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="8" class="fig-node"/>`,
    text(x + CARD_W / 2, CARD_Y + CARD_H / 2 - 2, fit(`${key}.label`, card.label, CARD_W - 16, "label"), "fig-label", "middle"),
    text(x + CARD_W / 2, CARD_Y + CARD_H / 2 + 14, fit(`${key}.note`, card.note, CARD_W - 16), "fig-note", "middle"),
  ].join("");
  const body = [
    end(16, `${id}.agent`, t.agent),
    end(RIGHT_X, `${id}.api`, t.api),
    // Through an MCP server.
    frame(MCP_Y, 104, true),
    join(MCP_Y + 52),
    text(TEXT_X, MCP_Y + 20, fit(`${id}.mcp.label`, t.mcp.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, MCP_Y + 34, fit(`${id}.mcp.note`, t.mcp.note, INNER), "fig-note"),
    `<line x1="${TEXT_X}" y1="${MCP_Y + 42}" x2="${TEXT_X + INNER}" y2="${MCP_Y + 42}" class="fig-hair"/>`,
    mcpTool(id, t, "list", TEXT_X, MCP_Y + 58, INNER),
    mcpTool(id, t, "read", TEXT_X, MCP_Y + 74, INNER),
    mcpTool(id, t, "create", TEXT_X, MCP_Y + 90, INNER),
    // Through the CLI.
    frame(CLI_Y, 48),
    join(CLI_Y + 24),
    text(TEXT_X, CLI_Y + 19, fit(`${id}.cli.label`, t.cli.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, CLI_Y + 33, fit(`${id}.cli.note`, t.cli.note, INNER), "fig-note"),
    // Directly: no program in between, a line from card to card.
    text(TEXT_X, DIRECT_Y - 27, fit(`${id}.direct.label`, t.direct.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, DIRECT_Y - 13, fit(`${id}.direct.note`, t.direct.note, INNER), "fig-note"),
    arrow(pid, LEFT_EDGE, DIRECT_Y, RIGHT_X - 1, DIRECT_Y),
  ].join("");
  return body;
}

// The stacked view: one 320-unit panel, the agent app at the top, GitHub's API
// at the bottom and the three routes between them one under the other. A line
// down the left edge leaves the agent app to each route, and a line down the
// right edge takes the three to the API.
function mcpServerStack(t, id, pid) {
  const LEFT = 28;
  const RIGHT = 296;
  const BOX_X = 40;
  const BOX_W = 240;
  const INNER = BOX_W - 24;
  const TEXT_X = BOX_X + 12;
  const frame = (y, height, accent = false) => [
    `<rect x="${BOX_X}" y="${y}" width="${BOX_W}" height="${height}" rx="8" class="fig-node"/>`,
    accent ? `<rect x="${BOX_X}" y="${y}" width="${BOX_W}" height="${height}" rx="8" class="fig-accent-stroke"/>` : "",
  ].join("");
  // The way into a box from the left edge, and out of it to the right edge.
  const join = (y) => [`<line x1="${LEFT}" y1="${y}" x2="${BOX_X}" y2="${y}" class="fig-line"/>`, arrow(pid, BOX_X + BOX_W, y, RIGHT, y)].join("");
  const MCP_Y = 106;
  const CLI_Y = 224;
  const DIRECT_Y = 320;
  const API_Y = 356;
  return [
    card(16, 50, 288, `${id}.agent`, t.agent),
    // The left edge, from the agent app to the lowest route.
    `<line x1="${LEFT}" y1="90" x2="${LEFT}" y2="${DIRECT_Y}" class="fig-line"/>`,
    // The right edge, from the first route down into the API.
    arrow(pid, RIGHT, MCP_Y + 52, RIGHT, API_Y - 2),
    // Through an MCP server.
    frame(MCP_Y, 104, true),
    join(MCP_Y + 52),
    text(TEXT_X, MCP_Y + 20, fit(`${id}.mcp.label`, t.mcp.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, MCP_Y + 34, fit(`${id}.mcp.note`, t.mcp.note, INNER), "fig-note"),
    `<line x1="${TEXT_X}" y1="${MCP_Y + 42}" x2="${TEXT_X + INNER}" y2="${MCP_Y + 42}" class="fig-hair"/>`,
    mcpTool(id, t, "list", TEXT_X, MCP_Y + 58, INNER),
    mcpTool(id, t, "read", TEXT_X, MCP_Y + 74, INNER),
    mcpTool(id, t, "create", TEXT_X, MCP_Y + 90, INNER),
    // Through the CLI.
    frame(CLI_Y, 48),
    join(CLI_Y + 24),
    text(TEXT_X, CLI_Y + 19, fit(`${id}.cli.label`, t.cli.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, CLI_Y + 33, fit(`${id}.cli.note`, t.cli.note, INNER), "fig-note"),
    // Directly: no program in between, a line from edge to edge.
    text(TEXT_X, DIRECT_Y - 27, fit(`${id}.direct.label`, t.direct.label, INNER, "label"), "fig-label fig-strong"),
    text(TEXT_X, DIRECT_Y - 13, fit(`${id}.direct.note`, t.direct.note, INNER), "fig-note"),
    arrow(pid, LEFT, DIRECT_Y, RIGHT - 1, DIRECT_Y),
    // GitHub's API, where the three routes end.
    card(16, API_Y, 288, `${id}.api`, t.api),
  ].join("");
}

// (31) The two limits on the first, read-only connection: the agent app, the
// MCP server in read-only mode (limit 1), the token for the practice repo with
// Issues set to read (limit 2) and the practice repo with its three made-up
// issues. A read passes both limits. A write (a dashed arrow) is stopped at
// each limit, its own arrow at each: either limit stops it alone, and the foot
// says so and that setting both covers a limit set wrongly (our own advice, as
// the article says). The numbers in the rings are the article's "first" and
// "second". Two views of one drawing, as in (30): left to right from 51rem,
// one under the other below.
function readOnlyLimits(t, id, figureId) {
  const flow = `${figureId}-p1`;
  const stack = `${figureId}-p2`;
  return {
    caption: t.caption,
    panels: [
      { title: t.title, head: t.head, width: FLOW_WIDTH, height: 268, view: "flow", body: readOnlyLimitsFlow(t, id, flow) },
      { title: t.title, head: t.head, height: 372, view: "stack", body: readOnlyLimitsStack(t, id, stack) },
    ],
  };
}

/** A numbered ring, centred on (x, y): the article's "first" and "second" limit. */
function limitRing(x, y, n) {
  return [`<circle cx="${x}" cy="${y}" r="9" class="fig-accent-stroke"/>`, text(x, y + 4, String(n), "fig-small fig-ok fig-strong", "middle")].join("");
}

/** One of the practice repo's three made-up issues, centred on (x, y). */
function issueDot(x, y) {
  return `<circle cx="${x}" cy="${y}" r="5" class="fig-node"/><circle cx="${x}" cy="${y}" r="1.6" class="fig-dot"/>`;
}

// The flow view: the read runs along one line from the agent app through the
// two limits to the practice repo; below the limits each write has a dashed
// line of its own, from the agent app, round the limits before its own, up to
// a gate on its own limit's lower edge. The line of the second limit passes
// under the first, so neither depends on the other.
function readOnlyLimitsFlow(t, id, pid) {
  const W = FLOW_WIDTH;
  const Y = 54;
  const H = 92;
  const AGENT_W = 124;
  const BOX_W = 186;
  const REPO_W = 158;
  const GAP = Math.floor((W - 32 - AGENT_W - 2 * BOX_W - REPO_W) / 3);
  const BOX_1 = 16 + AGENT_W + GAP;
  const BOX_2 = BOX_1 + BOX_W + GAP;
  const REPO_X = BOX_2 + BOX_W + GAP;
  const MID = Y + 46;
  const frame = (x, width, accent = false) => [
    `<rect x="${x}" y="${Y}" width="${width}" height="${H}" rx="8" class="fig-node"/>`,
    accent ? `<rect x="${x}" y="${Y}" width="${width}" height="${H}" rx="8" class="fig-accent-stroke"/>` : "",
  ].join("");
  const note = (x, y, key, value, width) => text(x, y, fit(key, value, width), "fig-note");
  // A limit: its ring, its name, its two settings and the word that a read gets through.
  const limit = (x, n, key, card, first, second) => [
    frame(x, BOX_W, true),
    limitRing(x + 20, Y + 24, n),
    text(x + 36, Y + 28, fit(`${id}.${key}.label`, card.label, BOX_W - 44, "label"), "fig-label fig-strong"),
    note(x + 12, Y + 46, `${id}.${key}.${first}`, card[first], BOX_W - 24),
    note(x + 12, Y + 60, `${id}.${key}.${second}`, card[second], BOX_W - 24),
    check(x + 17, Y + 76.8),
    text(x + 27, Y + 80, fit(`${id}.passes`, t.passes, BOX_W - 35), "fig-note fig-strong"),
  ].join("");
  // A write: a dashed line out of the agent app's lower edge at `from`, down to
  // `turn`, across to under its limit and up to the limit's lower edge, where a
  // gate stops it; "a write" on the way, "stopped" beside the gate.
  const write = (from, turn, box, writeAt) => {
    const x = box + BOX_W / 2;
    const bottom = Y + H;
    return [
      `<path d="M${from} ${bottom}V${turn}H${x}V${bottom + 8}" class="fig-line fig-dashed" marker-end="url(#${pid}-arrow)"/>`,
      `<rect x="${x - 9}" y="${bottom - 2}" width="18" height="4" rx="1" class="fig-gate"/>`,
      text(from + 8, turn - 5, fit(`${id}.write`, t.write, 66), "fig-note"),
      text(x + 10, writeAt, fit(`${id}.stopped`, t.stopped, 66), "fig-note fig-wait fig-strong"),
    ].join("");
  };
  return [
    // The agent app.
    frame(16, AGENT_W),
    text(28, Y + 38, fit(`${id}.agent.label`, t.agent.label, AGENT_W - 20, "label"), "fig-label"),
    note(28, Y + 54, `${id}.agent.note`, t.agent.note, AGENT_W - 20),
    // The read, through the two limits to the practice repo.
    arrow(pid, 16 + AGENT_W, MID, BOX_1 - 1, MID),
    limit(BOX_1, 1, "server", t.server, "mode", "address"),
    arrow(pid, BOX_1 + BOX_W, MID, BOX_2 - 1, MID),
    limit(BOX_2, 2, "token", t.token, "repo", "issues"),
    arrow(pid, BOX_2 + BOX_W, MID, REPO_X - 1, MID),
    // The practice repo and its three issues.
    frame(REPO_X, REPO_W),
    text(REPO_X + 12, Y + 28, fit(`${id}.repo.label`, t.repo.label, REPO_W - 24, "label"), "fig-label fig-strong"),
    note(REPO_X + 12, Y + 46, `${id}.repo.kind`, t.repo.kind, REPO_W - 24),
    note(REPO_X + 12, Y + 60, `${id}.repo.issues`, t.repo.issues, REPO_W - 24),
    issueDot(REPO_X + 18, Y + 77),
    issueDot(REPO_X + 34, Y + 77),
    issueDot(REPO_X + 50, Y + 77),
    // The two writes, one dashed line each, each stopped at its own limit.
    write(100, 176, BOX_1, 170),
    write(52, 204, BOX_2, 184),
    // The foot.
    text(W / 2, 240, fit(`${id}.alone`, t.alone, 288), "fig-note fig-strong", "middle"),
    text(W / 2, 254, fit(`${id}.both`, t.both, 288), "fig-note", "middle"),
  ].join("");
}

// The stacked view: one 320-unit panel, the agent app, the MCP server in
// read-only mode (limit 1), the token (limit 2) and the practice repo down one
// line, with a write stopped at the right edge of each limit.
function readOnlyLimitsStack(t, id, pid) {
  const CARD = 220;
  const MID = 16 + CARD / 2;
  const TEXT = 54;
  const slot = CARD - TEXT - 6;
  const note = (x, y, key, value, width = slot) => text(x, y, fit(key, value, width), "fig-note");
  const frame = (y, height, accent = false) => [
    `<rect x="16" y="${y}" width="${CARD}" height="${height}" rx="8" class="fig-node"/>`,
    accent ? `<rect x="16" y="${y}" width="${CARD}" height="${height}" rx="8" class="fig-accent-stroke"/>` : "",
  ].join("");
  const ring = (y, n) => limitRing(36, y, n);
  // A write that stops at the gate on a limit's right edge, level with the limit's middle.
  const stop = (y) => [
    `<rect x="${16 + CARD - 2}" y="${y - 9}" width="4" height="18" rx="1" class="fig-gate"/>`,
    arrow(pid, WIDTH - 16, y, 16 + CARD + 8, y, true),
    text((16 + CARD + WIDTH - 16) / 2 + 3, y - 8, fit(`${id}.write`, t.write, 66), "fig-note", "middle"),
    text((16 + CARD + WIDTH - 16) / 2 + 3, y + 17, fit(`${id}.stopped`, t.stopped, 66), "fig-note fig-wait fig-strong", "middle"),
  ].join("");
  // A tick and the words beside an arrow: the read gets through.
  const passes = (y) => [check(MID + 12.5, y - 3.2), text(MID + 22, y, fit(`${id}.passes`, t.passes, WIDTH - 16 - MID - 22), "fig-note fig-strong")].join("");
  return [
    // The agent app.
    frame(50, 38),
    text(28, 68, fit(`${id}.agent.label`, t.agent.label, CARD - 24, "label"), "fig-label"),
    note(28, 81, `${id}.agent.note`, t.agent.note, CARD - 24),
    arrow(pid, MID, 90, MID, 106),
    // Limit 1: the MCP server in read-only mode.
    frame(108, 56, true),
    ring(136, 1),
    text(TEXT, 127, fit(`${id}.server.label`, t.server.label, slot, "label"), "fig-label fig-strong"),
    note(TEXT, 141, `${id}.server.mode`, t.server.mode),
    note(TEXT, 154, `${id}.server.address`, t.server.address),
    stop(136),
    arrow(pid, MID, 166, MID, 182),
    passes(177),
    // Limit 2: the token.
    frame(184, 56, true),
    ring(212, 2),
    text(TEXT, 203, fit(`${id}.token.label`, t.token.label, slot, "label"), "fig-label fig-strong"),
    note(TEXT, 217, `${id}.token.repo`, t.token.repo),
    note(TEXT, 230, `${id}.token.issues`, t.token.issues),
    stop(212),
    arrow(pid, MID, 242, MID, 258),
    passes(253),
    // The practice repo and its three issues.
    frame(260, 56),
    text(28, 279, fit(`${id}.repo.label`, t.repo.label, CARD - 24, "label"), "fig-label fig-strong"),
    note(28, 293, `${id}.repo.kind`, t.repo.kind, CARD - 24),
    note(28, 306, `${id}.repo.issues`, t.repo.issues, CARD - 24),
    issueDot(168, 284),
    issueDot(184, 284),
    issueDot(200, 284),
    // The foot.
    text(160, 340, fit(`${id}.alone`, t.alone, 288), "fig-note fig-strong", "middle"),
    text(160, 354, fit(`${id}.both`, t.both, 288), "fig-note", "middle"),
  ].join("");
}

// (34) What a Claude Code cloud session starts from — one panel: the files
// that are only on the computer stay behind (left, plain), the files that are
// committed to the repository go along (right, green) to the cloud run.
function whatGoesAlong(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const home = ["homeInstruction", "homeSkills", "homeMcp", "homeSignIn"];
  const repo = ["repoInstruction", "repoSkills", "repoMcp"];
  const body = [
    text(16, 58, fit(`${id}.computer`, t.computer, 136), "fig-note fig-strong"),
    text(168, 58, fit(`${id}.repo`, t.repo, 136), "fig-note fig-ok fig-strong"),
    ...home.map((key, i) => card(16, 68 + i * 44, 136, `${id}.${key}`, t[key])),
    ...repo.map((key, i) => card(168, 68 + i * 44, 136, `${id}.${key}`, t[key], "ok")),
    arrow(pid, 236, 200, 236, 262),
    card(168, 264, 136, `${id}.run`, t.run, "ok"),
    text(84, 288, fit(`${id}.staysBehind`, t.staysBehind, 136), "fig-note", "middle"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 322, body }] };
}

// (35) The job that runs by itself in part 6 — one panel: a schedule starts a
// CI job, the AI agent in it reads the commit history (read-only, in green as
// the agent is in the figures of part 1) and leaves a summary that waits on a
// GitHub page to be read later. The chain runs top to bottom: a panel is 320
// units wide, and four steps side by side would leave each a box too narrow
// for its label at the type size. The line under it says what the article
// says of an unattended run: nobody is there to answer a question.
function dailySummary(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const steps = ["schedule", "ci", "agent", "summary"];
  const TOP = 52; // the first card's top edge
  const PITCH = 62; // from one card's top edge to the next's: 40 high, 22 for the arrow
  const last = TOP + (steps.length - 1) * PITCH + 40;
  const body = [
    ...steps.map((key, i) => card(16, TOP + i * PITCH, 288, `${id}.${key}`, t[key], key === "agent" ? "ok" : "")),
    ...steps.slice(1).map((_, i) => arrow(pid, 160, TOP + i * PITCH + 42, 160, TOP + (i + 1) * PITCH - 2)),
    text(160, last + 26, fit(`${id}.nobody`, t.nobody, 288), "fig-note", "middle"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: last + 40, body }] };
}

// (36) The checks one command meets in Claude Code — one panel: the
// instruction file only asks the agent (top row); under the agent the path of
// one command: the hook, the permission rules and mode (orange: they may ask
// you), then the command inside the dashed sandbox box; below that, what runs
// outside the sandbox. The order is the one Claude Code's documentation gives
// on 30 October 2026 (PreToolUse hooks fire before any permission check).
function limitsPath(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const tag = (x, key) => [
    `<rect x="${x}" y="332" width="92" height="26" rx="6" class="fig-node"/>`,
    text(x + 46, 349.5, fit(`${id}.${key}`, t[key], 84, "small"), "fig-label fig-small", "middle"),
  ].join("");
  const body = [
    card(16, 52, 136, `${id}.instruction`, t.instruction),
    card(184, 52, 120, `${id}.agent`, t.agent, "ok"),
    arrow(pid, 152, 72, 182, 72),
    arrow(pid, 244, 94, 244, 112),
    card(16, 114, 288, `${id}.hook`, t.hook),
    arrow(pid, 160, 154, 160, 166),
    card(16, 168, 288, `${id}.permissions`, t.permissions, "wait"),
    arrow(pid, 160, 208, 160, 220),
    `<rect x="12" y="222" width="296" height="74" rx="10" class="fig-accent-stroke fig-dashed"/>`,
    text(24, 238, fit(`${id}.sandbox`, t.sandbox, 272), "fig-note fig-ok fig-strong"),
    card(24, 246, 272, `${id}.command`, t.command),
    text(16, 322, fit(`${id}.outside`, t.outside, 288), "fig-note fig-strong"),
    tag(16, "fileTools"),
    tag(114, "mcp"),
    tag(212, "hooks"),
  ].join("");
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 374, body }] };
}

// (37) Five attempts against the three limits of the practice folder — one
// panel, a table: a column for the deny rule, the hook and the sandbox, a row
// for each attempt the part walks through, in the order the part meets them
// (the three that each limit stops, then the two that get past one). A cell
// says what that limit does with that attempt, in a mark and a word: a green
// box with a tick and "stops" (the deny rule on an edit under migrations/ with
// the agent's file tool, the hook on rm -rf, the sandbox on touch ~/sandbox-probe)
// or "covers" (the sandbox on a program that opens files itself: the part says
// the sandbox covers it, not that it stops it); plain grey "passes"
// where the part says the limit does not act, or, for the deny rule and the
// hook, where the settings file and the script it shows name nothing that
// matches ("a hook that matches text stops what it lists and nothing else").
// A cell the part does not decide is left empty: the sandbox on rm -rf build
// and rm -fr build. The part says of rm -fr build that Claude Code only asks
// you, in orange under the row's label. Commands are the same in both
// languages.
function limitsAttempts(t, id, figureId) {
  const CELLS = [179, 229, 279]; // the centres of the deny rule, hook and sandbox columns
  const CELL = 48;
  const TOP = 74; // the first row's top, under the column heads
  const ROW = 44;
  const LINE = 12;
  const LABEL = 136; // the row labels run from the left margin to the cells
  const ROWS = [
    { label: "file", cells: ["stops", "pass", "pass"] },
    { label: "rmrf", cells: ["pass", "stops", null] },
    { label: "touch", cells: ["pass", "pass", "stops"] },
    { label: "rmfr", note: "asks", cells: ["pass", "pass", null] },
    { label: "python", cells: ["pass", "pass", "covers"] },
  ];
  const rule = (y) => `<line x1="16" y1="${y}" x2="${WIDTH - 16}" y2="${y}" class="fig-hair"/>`;
  const parts = [];

  // The column heads, on one or two lines that end on one baseline.
  ["deny", "hook", "sandbox"].forEach((column, i) => {
    const lines = wrap(`${id}.columns.${column}`, t.columns[column], CELL, "note", 2);
    lines.forEach((value, n) => parts.push(text(CELLS[i], 68 - (lines.length - 1 - n) * LINE, value, "fig-note fig-strong", "middle")));
  });

  ROWS.forEach(({ label, note, cells }, r) => {
    const top = TOP + r * ROW;
    parts.push(rule(top));
    const lines = wrap(`${id}.rows.${label}`, t.rows[label], LABEL, "note", 3).map((value) => [value, "fig-note fig-strong"]);
    if (note) lines.push(...wrap(`${id}.rows.${note}`, t.rows[note], 110, "note", 2).map((value) => [value, "fig-note fig-wait fig-strong"]));
    if (lines.length > 3) throw new Error(`Figure label "${id}.rows.${label}" needs ${lines.length} lines with its note; at most 3 fit a row`);
    const first = top + (ROW - (lines.length - 1) * LINE) / 2 + 3.5;
    lines.forEach(([value, cls], n) => parts.push(text(16, first + n * LINE, value, cls)));
    cells.forEach((kind, i) => {
      const x = CELLS[i];
      if (kind === "stops" || kind === "covers") {
        const box = `x="${x - CELL / 2}" y="${top + 5}" width="${CELL}" height="${ROW - 10}" rx="6"`;
        parts.push(`<rect ${box} class="fig-node"/>`, `<rect ${box} class="fig-accent-stroke"/>`, check(x, top + 16.5));
        parts.push(text(x, top + 32, fit(`${id}.cells.${kind}`, t.cells[kind], CELL), "fig-note fig-ok fig-strong", "middle"));
      } else if (kind === "pass") {
        const lines = wrap(`${id}.cells.pass`, t.cells.pass, CELL, "note", 2);
        lines.forEach((value, n) => parts.push(text(x, top + ROW / 2 + 3.5 + (n - (lines.length - 1) / 2) * LINE, value, "fig-note", "middle")));
      }
    });
  });
  const bottom = TOP + ROWS.length * ROW;
  parts.push(rule(bottom), text(16, bottom + 20, fit(`${id}.note`, t.note, WIDTH - 32), "fig-note fig-strong"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: bottom + 36, body: parts.join("") }] };
}

// (38) A level and a route — wide, two panels, the idea of the article about
// Fluentor's name and logo in two pictures. Left, a reading: five columns of
// rising height, a level scale from one to five, the third one marked in the
// accent colour and "You are here" under it; nothing says what comes next.
// Right, a route: a small hand-placed map of ten dots joined by lines, from
// some dots two or three ways lead on; the dot where you stand is marked with
// the same words and one route of four steps is lit from it, as a road
// outlined in the accent colour, to the dot called "Next step". It is an
// illustration of the idea, not the logo: the columns and the map are drawn
// for this figure, the dots and lines are the same in both languages and only
// the words change.
function readingAndRoute(t, id, figureId) {
  const HEIGHT = 252;
  const NOTE_Y = 238;
  const LABEL_Y = 216; // the baseline of the marks' words in both panels

  // The reading: five columns on a baseline, the third one marked.
  const COLUMN = 40;
  const GAP = 12;
  const LEFT = (WIDTH - (5 * COLUMN + 4 * GAP)) / 2;
  const BASE = 172;
  const STEP = 22; // each column is one step higher than the one before
  const MARKED = 2;
  const column = (i, cls) => {
    const x = LEFT + i * (COLUMN + GAP);
    const h = (i + 1) * STEP;
    return `<path d="M${x} ${BASE}V${BASE - h + 3}a3 3 0 0 1 3-3h${COLUMN - 6}a3 3 0 0 1 3 3V${BASE}z" class="${cls}"/>`;
  };
  const centre = (i) => LEFT + i * (COLUMN + GAP) + COLUMN / 2;
  const reading = [
    `<line x1="${LEFT - 12}" y1="${BASE}" x2="${WIDTH - LEFT + 12}" y2="${BASE}" class="fig-line"/>`,
    ...[0, 1, 2, 3, 4].map((i) => column(i, i === MARKED ? "fig-cell" : "fig-bar-muted")),
    column(MARKED, "fig-accent-stroke"),
    ...[0, 1, 2, 3, 4].map((i) => text(centre(i), BASE + 16, String(i + 1), i === MARKED ? "fig-note fig-ok fig-strong" : "fig-note", "middle")),
    `<path d="M${centre(MARKED)} ${BASE + 22}l-5 7h10z" class="fig-ok"/>`,
    text(centre(MARKED), LABEL_Y, fit(`${id}.reading.here`, t.reading.here, 140, "label"), "fig-label fig-ok", "middle"),
    text(WIDTH / 2, NOTE_Y, fit(`${id}.reading.note`, t.reading.note, WIDTH - 32), "fig-note", "middle"),
  ].join("");

  // The route: the dots by name, the lines between them, and the lit route.
  const DOTS = {
    start: [64, 186], a: [116, 152], b: [172, 164], c: [226, 126], next: [262, 84],
    d: [44, 128], e: [122, 92], f: [184, 100], g: [210, 190], h: [276, 160],
  };
  const LINES = [["start", "d"], ["d", "e"], ["a", "e"], ["e", "f"], ["f", "c"], ["b", "g"], ["g", "h"], ["h", "next"]];
  const ROUTE = ["start", "a", "b", "c", "next"];
  const HALF = 3.5; // half the width of the lit road
  const at = (name) => DOTS[name];
  // The outline of a road of width 2 x HALF along the route: the offset of
  // the polyline to each side, mitred at the bends.
  const unit = ([dx, dy]) => [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)];
  const points = ROUTE.map(at);
  const dirs = points.slice(1).map(([x, y], i) => unit([x - points[i][0], y - points[i][1]]));
  const edge = (sign) =>
    points.map(([x, y], i) => {
      const [ax, ay] = dirs[Math.max(i - 1, 0)];
      const [bx, by] = dirs[Math.min(i, dirs.length - 1)];
      const [nax, nay] = [-ay * sign, ax * sign];
      const [nbx, nby] = [-by * sign, bx * sign];
      const k = HALF / (1 + nax * nbx + nay * nby);
      return [round(x + (nax + nbx) * k), round(y + (nay + nby) * k)];
    });
  const outline = [...edge(1), ...edge(-1).reverse()];
  const lit = new Set(ROUTE);
  const [sx, sy] = at("start");
  const [nx, ny] = at("next");
  const route = [
    ...LINES.map(([from, to]) => `<line x1="${at(from)[0]}" y1="${at(from)[1]}" x2="${at(to)[0]}" y2="${at(to)[1]}" class="fig-line"/>`),
    polygon(outline, "fig-area"),
    ...Object.entries(DOTS)
      .filter(([name]) => !lit.has(name))
      .map(([, [x, y]]) => `<circle cx="${x}" cy="${y}" r="4.5" class="fig-node"/>`),
    ...ROUTE.slice(1, -1).flatMap((name) => [`<circle cx="${at(name)[0]}" cy="${at(name)[1]}" r="4.5" class="fig-dot"/>`, `<circle cx="${at(name)[0]}" cy="${at(name)[1]}" r="4.5" class="fig-accent-stroke"/>`]),
    `<circle cx="${sx}" cy="${sy}" r="12" class="fig-glow"/>`,
    `<circle cx="${sx}" cy="${sy}" r="6" class="fig-dot"/>`,
    `<circle cx="${sx}" cy="${sy}" r="6" class="fig-accent-stroke"/>`,
    `<circle cx="${nx}" cy="${ny}" r="6" class="fig-dot"/>`,
    `<circle cx="${nx}" cy="${ny}" r="6" class="fig-accent-stroke"/>`,
    `<circle cx="${nx}" cy="${ny}" r="11" class="fig-accent-stroke"/>`,
    text(sx, LABEL_Y, fit(`${id}.route.here`, t.route.here, 140, "label"), "fig-label fig-ok", "middle"),
    text(nx, ny - 20, fit(`${id}.route.next`, t.route.next, 140, "label"), "fig-label fig-ok", "middle"),
    text(WIDTH / 2, NOTE_Y, fit(`${id}.route.note`, t.route.note, WIDTH - 32), "fig-note", "middle"),
  ].join("");

  return {
    caption: t.caption,
    panels: [
      { title: t.reading.title, head: t.reading.head, height: HEIGHT, body: reading },
      { title: t.route.title, head: t.route.head, height: HEIGHT, body: route },
    ],
  };
}

// The five figures of the deep dive "What fills an AI agent's context"
// (si-cmjr, 21 November 2026): one family, in which the context window is the
// same bar every time (ctxBar). The bar is a tall outline whose top, a dashed
// line, is the window's limit; the layers fill it from its foot, and the part
// still empty is outlined only. A layer keeps one look in all five: the
// start-up layer four slim grey bands (the tool's instructions, the
// instruction file, memory, the names of skills and tools), files the
// accent, command output the orange, the conversation the text colour, a
// summary the accent's outline over its glow, a written note a card with
// lines of writing on it; a rule that loads with one folder's files is one
// grey band like those of the start-up layer, as it is an instruction too.
// Sizes are drawn, not counted: the heights below are shapes, no token count
// stands behind them, and no vendor, tool or model is named. Where a figure
// shows a sequence it reads left to right; the four wide ones come in two
// views like (30): left to right from 51rem, stacked below.

const CTX_W = 44; // the bar's width
const CTX_H = 156; // its height, from the limit to its foot
const CTX_IN = 3; // the layers' inset from its sides and foot
const CTX_GAP = 2.5; // the gap between two layers
const CTX_BAND = 3.5; // a band of the start-up layer, and the rule
const CTX_BANDS = 4; // the start-up layer's bands
const CTX_BAND_GAP = 1.5;
const CTX_STARTUP = CTX_BANDS * CTX_BAND + (CTX_BANDS - 1) * CTX_BAND_GAP;
// The classes a layer is drawn in: its fill and, for the two hues that are
// pale on the light theme, the matching dark edge over it.
const CTX_KINDS = {
  startup: { fill: "fig-bar-muted" },
  rule: { fill: "fig-bar-muted" },
  files: { fill: "fig-cell", edge: "fig-accent-stroke" },
  output: { fill: "fig-gate", edge: "fig-wait-stroke" },
  talk: { fill: "fig-bar" },
  summary: { fill: "fig-area" },
  note: { fill: "fig-node" },
};

/**
 * One layer, a rounded rectangle from (x, y), `kind` one of CTX_KINDS. A
 * hatched layer (the second task) is stripes of its colour from the panel's
 * pattern; an edge or an outline is drawn inside the layer's box, so a layer
 * is as tall as its height says. A note carries a line or two of writing.
 */
function ctxLayer(pid, x, y, w, h, kind, hatch = false) {
  const { fill, edge } = CTX_KINDS[kind];
  const r = Math.min(2.5, h / 2);
  const rect = (inset, attrs) => `<rect x="${round(x + inset)}" y="${round(y + inset)}" width="${round(w - 2 * inset)}" height="${round(h - 2 * inset)}" rx="${round(Math.max(r - inset, 0.5))}" ${attrs}/>`;
  const parts = [];
  if (hatch) parts.push(rect(0, `fill="url(#${pid}-hatch-${kind})"`));
  else if (kind === "summary") parts.push(rect(0.75, `class="${fill}"`));
  else if (kind === "note") parts.push(rect(0.5, `class="${fill}"`));
  else parts.push(rect(0, `class="${fill}"`));
  if (edge) parts.push(rect(0.75, `class="${edge}"`));
  if (kind === "note") {
    const lines = h >= 14 ? [0.62, 0.42] : [0.55];
    lines.forEach((share, i) => parts.push(`<rect x="${round(x + 5)}" y="${round(y + h / (lines.length + 1) * (i + 1) - 0.75)}" width="${round((w - 10) * share)}" height="1.5" rx="0.75" class="fig-bar-muted"/>`));
  }
  return parts.join("");
}

/** The stripes a hatched layer is filled with, one pattern per kind, in the panel's defs. */
function ctxHatch(pid, kinds) {
  return `<defs>${kinds.map((kind) => `<pattern id="${pid}-hatch-${kind}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.75" height="4" class="${CTX_KINDS[kind].fill}"/></pattern>`).join("")}</defs>`;
}

/**
 * The context window: a bar CTX_W wide whose limit, the dashed line, is at
 * `top` and whose foot is CTX_H below it. `layers` fill it from the foot,
 * each { kind, h, hatch }; the start-up layer has its own four bands and no
 * h; in the deep dive on memory it says `memory: true` or `false`, whether
 * it loads a memory;
 * a layer of kind "bad" is a card that is wrong or hostile (memBad).
 * Returns the drawing, each layer's top and bottom edge (and the start-up
 * layer's bands) for the labels, and the bar's foot. Throws when the layers
 * run past the limit. A bar that `ends` (a session that is over) has a
 * dashed outline and its layers faded.
 */
function ctxBar(pid, x, top, layers, ends = false) {
  const bottom = top + CTX_H;
  const r = 7;
  const inner = { x: x + CTX_IN, w: CTX_W - 2 * CTX_IN };
  const parts = [`<path d="M${x} ${top}V${bottom - r}a${r} ${r} 0 0 0 ${r} ${r}H${x + CTX_W - r}a${r} ${r} 0 0 0 ${r} -${r}V${top}" class="fig-line${ends ? " fig-dashed" : ""}"/>`];
  const spans = [];
  let y = bottom - CTX_IN;
  for (const { kind, h, hatch, memory } of layers) {
    if (kind === "startup" && memory !== undefined) {
      // A start-up layer of the deep dive on memory, which says whether it
      // loads a memory: then its third band, where (39) names memory, is the
      // note, taller than a band so that its line of writing shows. Its grey
      // bands are one path (memBars), square-ended: the page's HTML budget
      // has no room for the arcs of ctxLayer's pills, and at 3.5 units the
      // rounding is under two pixels.
      const bands = [];
      const grey = [];
      let foot = y;
      for (let i = 0; i < CTX_BANDS; i += 1) {
        const note = memory && i === MEM_BAND_INDEX;
        const bandH = note ? MEM_BAND : CTX_BAND;
        bands.push({ top: foot - bandH, bottom: foot });
        if (note) parts.push(ctxLayer(pid, inner.x, foot - bandH, inner.w, bandH, "note"));
        else grey.push([inner.x, foot - bandH, inner.w, bandH]);
        foot -= bandH + CTX_BAND_GAP;
      }
      parts.push(memBars(grey));
      const layerTop = foot + CTX_BAND_GAP;
      spans.push({ kind, top: layerTop, bottom: y, bands, memory: memory ? bands[MEM_BAND_INDEX] : undefined });
      y = layerTop - CTX_GAP;
    } else if (kind === "startup") {
      const bands = [];
      for (let i = 0; i < CTX_BANDS; i += 1) {
        const bandTop = y - CTX_BAND - i * (CTX_BAND + CTX_BAND_GAP);
        bands.push({ top: bandTop, bottom: bandTop + CTX_BAND });
        parts.push(ctxLayer(pid, inner.x, bandTop, inner.w, CTX_BAND, "startup"));
      }
      spans.push({ kind, top: y - CTX_STARTUP, bottom: y, bands });
      y -= CTX_STARTUP + CTX_GAP;
    } else {
      parts.push(kind === "bad" ? memBad(inner.x, y - h, inner.w, h) : ctxLayer(pid, inner.x, y - h, inner.w, h, kind, hatch));
      spans.push({ kind, top: y - h, bottom: y });
      y -= h + CTX_GAP;
    }
  }
  if (y + CTX_GAP < top + 2) throw new Error(`A context bar's layers run ${round(top + 2 - y - CTX_GAP)} units past its limit`);
  if (ends) parts.splice(1, parts.length - 1, `<g opacity="0.5">${parts.slice(1).join("")}</g>`);
  parts.push(`<line x1="${x - 6}" y1="${top}" x2="${x + CTX_W + 6}" y2="${top}" class="fig-line fig-dashed"/>`);
  return { svg: parts.join(""), spans, bottom };
}

/** The middle of a span: where a label's leader meets it. */
function mid({ top, bottom }) {
  return (top + bottom) / 2;
}

/** A leader from a layer at (x1, y1) to the label it names at (x2, y2): level, then slanting, then level. */
function ctxLeader(x1, y1, x2, y2) {
  const bend = Math.min(6, (x2 - x1) / 3);
  return `<path d="M${round(x1)} ${round(y1)}H${round(x1 + bend)}L${round(x2 - bend)} ${round(y2)}H${round(x2)}" class="fig-member"/>`;
}

/** A note's baseline for a label whose middle is at y. */
const NOTE_MID = 3.6;

/**
 * A key entry: a 14 x 8 swatch of a layer and its name, from x; the
 * start-up layer as two of its bands. Returns the drawing and the x after it.
 */
function ctxSwatch(pid, x, y, kind, label, hatch = false) {
  const swatch = kind === "startup" ? [ctxLayer(pid, x, y - 7.75, 14, 3.25, "startup"), ctxLayer(pid, x, y - 3, 14, 3.25, "startup")].join("") : ctxLayer(pid, x, y - 7.75, 14, 8, kind, hatch);
  return { svg: swatch + text(x + 20, y, label, "fig-note"), end: x + 20 + label.length * ADVANCE.note };
}

// (39) Before the first prompt — one inline panel: the bar, almost empty, its
// start-up layer of four slim bands at the foot, each band named on the right
// (the tool's own instructions lowest: the article has them come before all
// the others), the empty part marked "room left" and the dashed top "the
// limit of the window".
function contextBeforeYouType(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const X = 40;
  const TOP = 60;
  const RIGHT = X + CTX_W;
  const LABEL = 104;
  const SLOT = WIDTH - 16 - LABEL;
  const bar = ctxBar(pid, X, TOP, [{ kind: "startup" }]);
  const [startup] = bar.spans;
  const emptyTop = TOP + 4;
  const emptyBottom = startup.top - 4;
  const parts = [
    bar.svg,
    // The limit: the bar's dashed top runs on to its words.
    `<line x1="${RIGHT + 6}" y1="${TOP}" x2="${LABEL - 6}" y2="${TOP}" class="fig-line fig-dashed"/>`,
    text(LABEL, TOP + NOTE_MID, fit(`${id}.limit`, t.limit, SLOT), "fig-note"),
    // The room left: a bracket the height of the empty part.
    `<path d="M${RIGHT + 4} ${emptyTop}H${RIGHT + 8}V${emptyBottom}H${RIGHT + 4}" class="fig-member"/>`,
    text(LABEL, (emptyTop + emptyBottom) / 2 + NOTE_MID, fit(`${id}.empty`, t.empty, SLOT), "fig-note fig-strong"),
  ];
  // The four bands, named from the top one down, a line apart below the bracket.
  const PITCH = 14;
  const first = emptyBottom + 12;
  startup.bands
    .map((band, i) => ({ band, key: `layer${i + 1}` }))
    .reverse()
    .forEach(({ band, key }, row) => {
      const y = first + row * PITCH;
      parts.push(ctxLeader(RIGHT + 2, mid(band), LABEL - 4, y), text(LABEL, y + NOTE_MID, fit(`${id}.${key}`, t[key], SLOT), "fig-note"));
    });
  const height = first + 3 * PITCH + 16;
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height, body: parts.join("") }] };
}

/** A figure of the family in two views from one drawing function, `draw(t, id, pid, view)` returning { body, height }. */
function ctxViews(t, id, figureId, draw) {
  const flow = draw(t, id, `${figureId}-p1`, "flow");
  const stack = draw(t, id, `${figureId}-p2`, "stack");
  return {
    caption: t.caption,
    panels: [
      { title: t.title, head: t.head, width: FLOW_WIDTH, height: flow.height, view: "flow", body: flow.body },
      { title: t.title, head: t.head, height: stack.height, view: "stack", body: stack.body },
    ],
  };
}

/** A bar's name under its foot. */
function ctxName(cx, bottom, key, value, slot) {
  return text(cx, bottom + 20, fit(key, value, slot, "small"), "fig-label fig-small", "middle");
}

// The four moments of (40), each bar's layers from its foot, in the fixed
// order start-up, files, command output, conversation; in the fourth the
// second task's files and conversation, hatched, begin above the first task's.
const CTX_MOMENTS = [
  [{ kind: "startup" }, { kind: "talk", h: 8 }],
  [{ kind: "startup" }, { kind: "files", h: 26 }, { kind: "talk", h: 12 }],
  [{ kind: "startup" }, { kind: "files", h: 26 }, { kind: "output", h: 38 }, { kind: "talk", h: 18 }],
  [{ kind: "startup" }, { kind: "files", h: 26 }, { kind: "output", h: 38 }, { kind: "talk", h: 22 }, { kind: "files", h: 20, hatch: true }, { kind: "talk", h: 10, hatch: true }],
];
const CTX_KEY = [["startup", "startup"], ["files", "files"], ["output", "output"], ["talk", "talk"], ["task2", "files", true]];

// (40) One session at four moments — wide, two views. Left to right, the bar
// after the first prompt, after a few files are read, after a test run and
// after a second, unrelated task has begun, each fuller than the one before;
// a small arrow leaves each bar to the right, as the whole bar goes with the
// next request (the first arrow says so). In the fourth bar the first task's
// layers stay at the foot as they were in the third, and the second task's,
// hatched, start above them (a thin outline round the first task's, as the
// spec had it, read as a second edge of the bar at this size). A key under the
// bars names the layers. Below 51rem the four bars stand closer, numbered, with
// the moments as a numbered list under them.
function contextAsItFills(t, id, figureId) {
  return ctxViews(t, id, figureId, contextAsItFillsView);
}

function contextAsItFillsView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const COLUMN = wide ? 192 : 72;
  const TOP = 64;
  const parts = [ctxHatch(pid, ["files", "talk"])];
  const moments = ["m1", "m2", "m3", "m4"];
  let bottom = 0;
  CTX_MOMENTS.forEach((layers, i) => {
    const cx = 16 + COLUMN / 2 + i * COLUMN;
    const x = cx - CTX_W / 2;
    const bar = ctxBar(pid, x, TOP, layers);
    bottom = bar.bottom;
    parts.push(text(cx, TOP - 10, String(i + 1), "fig-note fig-strong", "middle"), bar.svg);
    // Sent with the next request: an arrow out of the bar's right side.
    const ay = TOP + CTX_H / 2;
    const ax = x + CTX_W + (wide ? 12 : 4);
    parts.push(arrow(pid, ax, ay, ax + (wide ? 40 : 17), ay));
    if (wide) {
      // The first arrow's words, under it, centred between the two bars.
      if (i === 0) wrap(`${id}.sent`, t.sent, COLUMN - CTX_W - 16, "note", 2).forEach((line, n) => parts.push(text(x + CTX_W + (COLUMN - CTX_W) / 2, ay + 16 + n * 13, line, "fig-note", "middle")));
      wrap(`${id}.${moments[i]}`, t[moments[i]], COLUMN - 16, "note", 2).forEach((line, n) => parts.push(text(cx, bottom + 20 + n * 13, line, "fig-note fig-strong", "middle")));
    }
  });
  let y = bottom + (wide ? 54 : 20);
  if (!wide) {
    // The moments, numbered as the bars are, and what the arrows mean.
    moments.forEach((key, i) => {
      parts.push(text(16, y, String(i + 1), "fig-note fig-strong"));
      wrap(`${id}.${key}`, t[key], WIDTH - 16 - 28, "note", 2).forEach((line) => {
        parts.push(text(28, y, line, "fig-note"));
        y += 13;
      });
    });
    parts.push(arrow(pid, 16, y - 3.6, 30, y - 3.6), text(36, y, fit(`${id}.sent`, t.sent, WIDTH - 16 - 36), "fig-note"));
    y += 22;
  }
  // The key: one swatch per layer, in the order they stack.
  if (wide) {
    const entries = CTX_KEY.map(([key, kind, hatch]) => ({ key, kind, hatch, label: fit(`${id}.${key}`, t[key], 150) }));
    const width = entries.reduce((sum, { label }) => sum + 20 + label.length * ADVANCE.note, 0) + (entries.length - 1) * 22;
    let x = (W - width) / 2;
    for (const { kind, hatch, label } of entries) {
      const swatch = ctxSwatch(pid, x, y, kind, label, hatch);
      parts.push(swatch.svg);
      x = swatch.end + 22;
    }
    y += 16;
  } else {
    CTX_KEY.forEach(([key, kind, hatch], i) => {
      const x = i % 2 === 0 ? 16 : 168;
      parts.push(ctxSwatch(pid, x, y + Math.floor(i / 2) * 16, kind, fit(`${id}.${key}`, t[key], 136 - 20), hatch).svg);
    });
    y += 2 * 16 + 16;
  }
  return { body: parts.join(""), height: y };
}

// (41) A subagent's own context — wide, two views. The main agent's bar is a
// little filled: its start-up layer, the conversation and, on top, the thin
// summary it got back. The subagent's bar has a start-up layer of its own,
// the brief as its conversation, a tall layer of files and search results and
// the summary it writes. The brief goes across at the height of the
// subagent's conversation; the summary comes back from the top of the
// subagent's bar to the main bar's, a line far thinner than the search. Under
// the bars, the counter: the main context is the main bar's layers in a row,
// the total use those and the subagent's, so it holds a second start-up layer
// and the whole search; its lengths are the layers' heights.
const CTX_MAIN = [{ kind: "startup" }, { kind: "talk", h: 20 }, { kind: "summary", h: 6 }];
const CTX_SUB = [{ kind: "startup" }, { kind: "talk", h: 8 }, { kind: "files", h: 92 }, { kind: "summary", h: 6 }];

function contextSubagent(t, id, figureId) {
  return ctxViews(t, id, figureId, contextSubagentView);
}

function contextSubagentView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const TOP = 60;
  const MAIN_X = wide ? 150 : 36;
  const SUB_X = wide ? 560 : 240;
  const main = ctxBar(pid, MAIN_X, TOP, CTX_MAIN);
  const sub = ctxBar(pid, SUB_X, TOP, CTX_SUB);
  const mainSummary = main.spans[2];
  const [, brief, search, subSummary] = sub.spans;
  const from = MAIN_X + CTX_W + 8;
  const to = SUB_X - 8;
  const parts = [main.svg, sub.svg];
  // The brief, across.
  const by = mid(brief);
  parts.push(arrow(pid, from, by, to, by), text((from + to) / 2, by - 6, fit(`${id}.brief`, t.brief, to - from - 16), "fig-note fig-strong", "middle"));
  // The summary, back: level from the subagent's summary, down to the main bar's.
  const turn = from + (wide ? 36 : 12);
  const sy = mid(subSummary);
  parts.push(pathArrow(pid, `M${to} ${round(sy)}H${turn}V${round(mid(mainSummary))}H${from}`));
  parts.push(text((turn + to) / 2, sy - 6, fit(`${id}.summary`, t.summary, to - turn - 8), "fig-note fig-strong", "middle"));
  // The search, named beside its layer: on the right in the flow view, on the left of the bar below it.
  if (wide) {
    const lx = SUB_X + CTX_W + 16;
    parts.push(ctxLeader(SUB_X + CTX_W + 2, mid(search), lx - 4, mid(search)), text(lx, mid(search) + NOTE_MID, fit(`${id}.search`, t.search, W - 16 - lx), "fig-note fig-strong"));
  } else {
    const lines = wrap(`${id}.search`, t.search, to - turn - 12, "note", 2);
    const first = mid(search) - ((lines.length - 1) * 13) / 2;
    lines.forEach((line, n) => parts.push(text(to, first + n * 13 + NOTE_MID, line, "fig-note fig-strong", "end")));
  }
  // The two names.
  const slot = wide ? 180 : 120;
  parts.push(ctxName(MAIN_X + CTX_W / 2, main.bottom, `${id}.main`, t.main, slot), ctxName(SUB_X + CTX_W / 2, sub.bottom, `${id}.sub`, t.sub, slot));
  // The counter: the layers in a row, as long as they are tall; in the flow
  // view each row's name before it, in the stacked view above it.
  const LABEL_X = wide ? MAIN_X : 16;
  const METER_X = wide ? LABEL_X + 112 : 16;
  const GAP = 1.5;
  const SPLIT = 5;
  const heights = (bar) => bar.spans.map((span) => ({ kind: span.kind, len: span.bottom - span.top }));
  const mainRow = heights(main);
  const subRow = heights(sub);
  const units = [...mainRow, ...subRow].reduce((sum, { len }) => sum + len, 0);
  const gaps = (mainRow.length + subRow.length - 2) * GAP + SPLIT;
  const k = wide ? 2.2 : (W - 16 - METER_X - gaps) / units;
  const meter = (y, rows) => {
    const out = [];
    let x = METER_X;
    rows.forEach((row, r) => {
      if (r > 0) x += SPLIT - GAP;
      for (const { kind, len } of row) {
        out.push(ctxLayer(pid, x, y - 8, len * k, 8, kind));
        x += len * k + GAP;
      }
    });
    if (x - GAP > W - 16 + 0.01) throw new Error(`Figure "${id}": the counter runs to ${round(x - GAP)} units`);
    return out.join("");
  };
  const rule = main.bottom + 28;
  const rowLabel = (key, y) => text(LABEL_X, y, fit(`${id}.${key}`, t[key], wide ? METER_X - LABEL_X - 8 : W - 32), "fig-note fig-strong");
  const y0 = rule + 22;
  const y1 = y0 + (wide ? 20 : 34);
  const drop = wide ? 0 : 14; // the meter's baseline below its name's in the stacked view
  parts.push(
    `<line x1="16" y1="${rule}" x2="${W - 16}" y2="${rule}" class="fig-hair"/>`,
    rowLabel("counterMain", y0),
    meter(y0 + drop, [mainRow]),
    rowLabel("counterTotal", y1),
    meter(y1 + drop, [mainRow, subRow]),
  );
  return { body: parts.join(""), height: y1 + drop + 16 };
}

// (42) What compaction keeps — wide, two views. Before: the bar full to its
// limit with the layers of (40) and, just above the files, the rule that
// loaded with one folder's files, a grey band like the start-up layer's (it
// is an instruction too). An arrow, "compaction", to the bar after it: the
// start-up layer back from disk, a short summary in place of the
// conversation and three slim bands of files read again. The rule slides out
// of the bar at its own height, a strip crossed out, "summarised away", above
// the arrow. Below 51rem the bar after stands under the bar before.
const CTX_BEFORE = [{ kind: "startup" }, { kind: "files", h: 26 }, { kind: "rule", h: CTX_BAND + 1 }, { kind: "output", h: 34 }, { kind: "talk", h: 55 }];
const CTX_AFTER = [{ kind: "startup" }, { kind: "summary", h: 14 }, { kind: "files", h: 4 }, { kind: "files", h: 4 }, { kind: "files", h: 4 }];

function contextCompaction(t, id, figureId) {
  return ctxViews(t, id, figureId, contextCompactionView);
}

function contextCompactionView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const TOP = 60;
  const BEFORE_X = wide ? 110 : 36;
  const before = ctxBar(pid, BEFORE_X, TOP, CTX_BEFORE);
  const AFTER_X = wide ? 500 : 36;
  const AFTER_TOP = wide ? TOP : before.bottom + 76;
  const after = ctxBar(pid, AFTER_X, AFTER_TOP, CTX_AFTER);
  const parts = [before.svg, after.svg];
  // The rule, out of the bar at its own height and crossed out.
  const rule = before.spans[2];
  const ry = mid(rule);
  const STRIP_W = CTX_W - 2 * CTX_IN;
  const STRIP_X = BEFORE_X + CTX_W + 30;
  parts.push(
    `<line x1="${BEFORE_X + CTX_W + 2}" y1="${ry}" x2="${STRIP_X - 4}" y2="${ry}" class="fig-line fig-dashed"/>`,
    ctxLayer(pid, STRIP_X, rule.top, STRIP_W, rule.bottom - rule.top, "rule"),
    `<line x1="${STRIP_X - 3}" y1="${round(ry + 5)}" x2="${STRIP_X + STRIP_W + 3}" y2="${round(ry - 5)}" class="fig-wait-stroke"/>`,
    text(STRIP_X + STRIP_W + 10, ry + NOTE_MID, fit(`${id}.lost`, t.lost, W - 16 - STRIP_X - STRIP_W - 10), "fig-note fig-wait fig-strong"),
  );
  const ruleLines = wrap(`${id}.rule`, t.rule, (wide ? AFTER_X - 24 : W - 16) - STRIP_X, "note", 2);
  ruleLines.forEach((line, n) => parts.push(text(STRIP_X, rule.top - 9 - (ruleLines.length - 1 - n) * 13, line, "fig-note")));
  // The compaction: across under the rule, or down between the two bars.
  if (wide) {
    const ay = rule.bottom + 24;
    const from = BEFORE_X + CTX_W + 8;
    const to = AFTER_X - 8;
    parts.push(arrow(pid, from, ay, to, ay), text((from + to) / 2, ay + 16, fit(`${id}.arrow`, t.arrow, to - from - 16), "fig-note fig-strong", "middle"));
  } else {
    const ax = BEFORE_X + CTX_W / 2;
    parts.push(arrow(pid, ax, before.bottom + 30, ax, AFTER_TOP - 10), text(ax + 14, (before.bottom + AFTER_TOP) / 2 + 10 + NOTE_MID, fit(`${id}.arrow`, t.arrow, W - 16 - ax - 14), "fig-note fig-strong"));
  }
  // The bar after, its three kinds named on the right.
  const lx = AFTER_X + CTX_W + 14;
  const [startup, summary, ...files] = after.spans;
  const named = [
    [startup, "startup"],
    [summary, "summary"],
    [{ top: files[files.length - 1].top, bottom: files[0].bottom }, "files"],
  ];
  for (const [span, key] of named) {
    parts.push(ctxLeader(AFTER_X + CTX_W + 2, mid(span), lx - 4, mid(span)), text(lx, mid(span) + NOTE_MID, fit(`${id}.${key}`, t[key], W - 16 - lx), "fig-note"));
  }
  parts.push(ctxName(BEFORE_X + CTX_W / 2, before.bottom, `${id}.before`, t.before, 120), ctxName(AFTER_X + CTX_W / 2, after.bottom, `${id}.after`, t.after, 120));
  return { body: parts.join(""), height: after.bottom + 34 };
}

// (43) A planned hand-off — wide, two views. The session's bar has risen past
// the first of two dotted lines across it: the advisory level, where the hook
// tells the agent to plan the hand-off, and higher up the urgent one, in the
// orange, where it says to hand off now. Beside the bar, under the advisory
// line, the words that the agent chooses what is written down. The note
// leaves the bar as a card at the hand-off, the top of the fill, between the
// two lines (the fact check, 22 November 2026: the agent plans at the
// advisory line and writes the note at the hand-off). An arrow takes the
// note to the next session's bar, which holds its start-up layer and the
// note, a layer thinner than the old bar's conversation. Below 51rem the card
// stands under the words beside the bar and the next session's bar under the
// first.
const CTX_SESSION = [{ kind: "startup" }, { kind: "files", h: 22 }, { kind: "output", h: 26 }, { kind: "talk", h: 30 }];
const CTX_NEXT = [{ kind: "startup" }, { kind: "note", h: 10 }];

function contextHandoff(t, id, figureId) {
  return ctxViews(t, id, figureId, contextHandoffView);
}

function contextHandoffView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const TOP = 60;
  const X = wide ? 70 : 36;
  const session = ctxBar(pid, X, TOP, CTX_SESSION);
  const HANDOFF = session.spans[session.spans.length - 1].top; // the top of the fill
  const URGENT = TOP + 26;
  const ADVISORY = HANDOFF + 30;
  const CARD = { w: 84, h: 36 };
  const LX = X + CTX_W + (wide ? 12 : 18); // the levels' words, beside the bar
  const parts = [session.svg];
  const level = (y, end, cls) => `<line x1="${X - 6}" y1="${y}" x2="${end}" y2="${y}" class="${cls}" stroke-dasharray="0.5 3.5" stroke-linecap="round"/>`;
  // The card: a note with three lines of writing on it.
  const card = (x, y, w) =>
    [
      `<rect x="${x}" y="${y}" width="${w}" height="${CARD.h}" rx="6" class="fig-node"/>`,
      ...[1, 0.8, 0.5].map((share, i) => `<rect x="${x + 10}" y="${y + 9 + i * 8}" width="${round((w - 20) * share)}" height="2.5" rx="1.25" class="fig-bar-muted"/>`),
    ].join("");
  const levelWords = (key, y, slot, cls) => {
    const lines = wrap(`${id}.${key}`, t[key], slot, "note", 2);
    return lines.map((line, n) => text(LX, y - 6 - (lines.length - 1 - n) * 13, line, cls)).join("");
  };
  const NEXT_X = wide ? 630 : X;
  // Below 51rem the card stands under the words beside the bar, and the next bar under the first.
  const STACK_CARD = { x: LX, y: ADVISORY + 42, w: 56 };
  const NEXT_TOP = wide ? TOP : Math.max(session.bottom + 40, STACK_CARD.y + CARD.h + 54);
  const next = ctxBar(pid, NEXT_X, NEXT_TOP, CTX_NEXT);
  const [nextStartup, note] = next.spans;
  parts.push(next.svg);
  if (wide) {
    const LINE_END = 380; // the two levels end short of the card's words
    const CARD_X = 420;
    const slot = LINE_END - 14 - LX;
    parts.push(
      level(URGENT, LINE_END, "fig-wait-stroke"),
      levelWords("urgent", URGENT, slot, "fig-note fig-wait fig-strong"),
      level(ADVISORY, LINE_END, "fig-line"),
      levelWords("advisory", ADVISORY, slot, "fig-note fig-strong"),
      text(LX, ADVISORY + 16, fit(`${id}.chosen`, t.chosen, LINE_END - LX), "fig-note"),
      // At the hand-off the note leaves the bar.
      arrow(pid, X + CTX_W + 4, HANDOFF, CARD_X - 4, HANDOFF),
      card(CARD_X, HANDOFF - CARD.h / 2, CARD.w),
      text(CARD_X + CARD.w / 2, HANDOFF + CARD.h / 2 + 16, fit(`${id}.note`, t.note, 180), "fig-note fig-strong", "middle"),
      pathArrow(pid, `M${CARD_X + CARD.w + 6} ${HANDOFF}H${NEXT_X - 32}V${round(mid(note))}H${NEXT_X - 8}`),
    );
  } else {
    const slot = W - 16 - LX;
    const { x: cardX, y: cardY, w: cardW } = STACK_CARD;
    const below = cardX + cardW / 2;
    const side = X + CTX_W + 7; // the way down beside the bar, from the hand-off to the card
    parts.push(
      level(URGENT, W - 16, "fig-wait-stroke"),
      levelWords("urgent", URGENT, slot, "fig-note fig-wait fig-strong"),
      level(ADVISORY, W - 16, "fig-line"),
      levelWords("advisory", ADVISORY, slot, "fig-note fig-strong"),
      ...wrap(`${id}.chosen`, t.chosen, slot, "note", 2).map((line, n) => text(LX, ADVISORY + 16 + n * 13, line, "fig-note")),
      pathArrow(pid, `M${X + CTX_W + 2} ${HANDOFF}H${side}V${cardY + CARD.h / 2}H${cardX - 2}`),
      card(cardX, cardY, cardW),
      text(cardX + cardW + 10, cardY + CARD.h / 2 + NOTE_MID, fit(`${id}.note`, t.note, W - 16 - cardX - cardW - 10), "fig-note fig-strong"),
      pathArrow(pid, `M${below} ${cardY + CARD.h + 4}V${round(mid(note))}H${NEXT_X + CTX_W + 8}`),
    );
  }
  // The next bar's start-up layer, named on the right.
  const sx = NEXT_X + CTX_W + 14;
  parts.push(ctxLeader(NEXT_X + CTX_W + 2, mid(nextStartup), sx - 4, mid(nextStartup)), text(sx, mid(nextStartup) + NOTE_MID, fit(`${id}.startup`, t.startup, W - 16 - sx), "fig-note"));
  parts.push(ctxName(X + CTX_W / 2, session.bottom, `${id}.session`, t.session, 120), ctxName(NEXT_X + CTX_W / 2, next.bottom, `${id}.next`, t.next, 120));
  return { body: parts.join(""), height: next.bottom + 34 };
}

// The five figures of the deep dive "Memory that outlives an AI agent's
// session" (si-rtd7, 22 November 2026), one family with (39)–(43): where a
// context window appears it is ctxBar, its layers in the same colours. Two
// things are new, each drawn one way in all five: the store, a drawer with
// cards standing in it, for text kept outside the window (memStore), and a
// card for one written note (memCard). A start-up layer that loads a memory
// has the note as its third band, where (39) names memory (ctxBar's
// `memory`). An entry that is wrong or hostile is marked three ways, not by
// colour alone: a jagged top edge, a warning sign and the orange (memBad, a
// layer of kind "bad" in a bar). No vendor, tool or model is named, and sizes
// are drawn, not counted. All five are wide and come in the two views of
// (40): left to right from 51rem, stacked below.

const MEM_BAND_INDEX = 2; // the start-up layer's band (39) names memory, from the foot
const MEM_BAND = 8; // a note's band in a start-up layer: room for its line of writing
const MEM_CARD = { w: 16, h: 24, up: 12, gap: 4 }; // a card in the store: its size, how far it stands above the drawer's front, the gap between two
const MEM_FRONT = 24; // the height of the drawer's front
const MEM_PAD = 8; // the drawer's margin beside its cards
const MEM_NOTE = { w: 48, h: 32 }; // one written note on its own

/**
 * Small filled bars as ONE path, each [x, y, w, h]: lines of writing,
 * bands. A page carries every figure twice (its two views) and the HTML
 * budget is 150 KB with the CSS, so the many small bars of this family are
 * drawn as subpaths of one path, not as a rect each. They are
 * square-ended: at the 1.5 to 3.5 units they are drawn at, the rounding of
 * a rect with rx = h / 2 is under two pixels.
 */
function memBars(list, cls = "fig-bar-muted") {
  const r1 = (v) => Math.round(v * 10) / 10; // a tenth of a unit is under a pixel at every width
  const d = list
    .map(([x, y, w, h]) => `M${r1(x)} ${r1(y)}h${r1(w)}v${r1(h)}h${r1(-w)}z`)
    .join("");
  return `<path d="${d}" class="${cls}"/>`;
}

/** One written note: a card with lines of writing; `small` for a card standing in the store. */
function memCard(x, y, w, h, small = false) {
  const lines = small ? { inset: 4, first: 4, pitch: 4, height: 1.5, shares: [1, 0.6] } : { inset: 9, first: 8, pitch: 7, height: 2, shares: [1, 0.8, 0.5] };
  return [
    `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${small ? 2.5 : 5}" class="fig-node"/>`,
    memBars(lines.shares.map((share, i) => [x + lines.inset, y + lines.first + i * lines.pitch, (w - 2 * lines.inset) * share, lines.height])),
  ].join("");
}

/** The outline of a card whose top edge is jagged, from (x, y). */
function memJagged(x, y, w, h, tooth = 2.5) {
  const r1 = (v) => Math.round(v * 10) / 10;
  const n = Math.max(2, Math.round(w / (2 * tooth)));
  const step = w / n;
  const half = r1(step / 2);
  const teeth = Array.from({ length: n }, () => `${half} ${r1(-tooth)} ${half} ${r1(tooth)}`).join(" ");
  return `M${r1(x)} ${r1(y + h)}V${r1(y + tooth)}l${teeth}H${r1(x + w)}V${r1(y + h)}Z`;
}

/** A warning sign centred on (cx, cy), `s` tall: a triangle with an exclamation mark, in the orange. */
function memWarn(cx, cy, s = 11) {
  const r1 = (v) => Math.round(v * 10) / 10;
  const half = s * 0.6;
  // One path: the triangle, then the mark's stroke and its dot (a stroke of no length, its round cap the dot).
  return `<path d="M${r1(cx)} ${r1(cy - s / 2)}L${r1(cx + half)} ${r1(cy + s / 2)}H${r1(cx - half)}ZM${r1(cx)} ${r1(cy - s * 0.14)}V${r1(cy + s * 0.13)}M${r1(cx)} ${r1(cy + s * 0.3)}v0" class="fig-wait-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
}

/** A card that is wrong or hostile: jagged at the top, edged in the orange, a warning sign on it when `sign` gives its size. */
function memBad(x, y, w, h, sign = 0) {
  // The fill a plain rect under the teeth (they are too small to show it), the jagged outline over it.
  const parts = [`<rect x="${round(x)}" y="${round(y + 2.5)}" width="${round(w)}" height="${round(h - 2.5)}" class="fig-row"/>`, `<path d="${memJagged(x, y, w, h)}" class="fig-wait-stroke" stroke-linejoin="round"/>`];
  if (sign) parts.push(memWarn(x + w / 2, y + 3 + sign / 2, sign));
  return parts.join("");
}

/**
 * The store: a drawer seen from the front, its cards standing in it, their
 * tops above its front, and a handle. (x, y) is its left edge and the top of
 * its cards; `cards` lists "note" or "bad" from the left (a bad card stands
 * a little higher, its sign on its top). `scale` draws it smaller, as an
 * icon, without its lines of writing. Returns the drawing, its edges and
 * each card's place.
 */
function memStore(x, y, cards, scale = 1) {
  const k = (v) => v * scale;
  const { w: cw, h: ch, up, gap } = MEM_CARD;
  const w = k(2 * MEM_PAD + cards.length * cw + (cards.length - 1) * gap);
  const front = y + k(up);
  const parts = [];
  const bars = []; // the cards' lines of writing (above the front) and the handle, drawn as one path
  const at = cards.map((kind, i) => {
    const cx = x + k(MEM_PAD + i * (cw + gap));
    if (kind === "bad") {
      parts.push(memBad(cx, y - k(4), k(cw), k(ch), scale === 1 ? 9 : 0));
      return { x: cx, top: y - k(4), cx: cx + k(cw) / 2 };
    }
    parts.push(`<rect x="${round(cx)}" y="${round(y)}" width="${round(k(cw))}" height="${round(k(ch))}" rx="${round(k(2.5))}" class="fig-node"/>`);
    if (scale === 1) bars.push([cx + 4, y + 5, cw - 8, 1.5]);
    return { x: cx, top: y, cx: cx + k(cw) / 2 };
  });
  parts.push(`<rect x="${round(x)}" y="${round(front)}" width="${round(w)}" height="${round(k(MEM_FRONT))}" rx="${round(k(5))}" class="fig-node"/>`);
  bars.push([x + w / 2 - k(10), front + k(MEM_FRONT) / 2 - k(1.5), k(20), k(3)]);
  parts.push(memBars(bars));
  return { svg: parts.join(""), left: x, right: x + w, cx: x + w / 2, top: y, front, mid: front + k(MEM_FRONT) / 2, bottom: front + k(MEM_FRONT), cards: at };
}

/** A person, centred on (cx, cy): a head and shoulders in the orange of a person's check. */
function memPerson(cx, cy) {
  return [`<circle cx="${round(cx)}" cy="${round(cy - 5)}" r="3.5" class="fig-wait-stroke"/>`, `<path d="M${round(cx - 6.5)} ${round(cy + 7)}a6.5 6.5 0 0 1 13 0" class="fig-wait-stroke" stroke-linecap="round"/>`].join("");
}

/** A file: a page with a folded corner and lines of writing, from (x, y). */
function memFile(x, y, w = 22, h = 28) {
  const fold = w * 0.3;
  return [
    `<path d="M${round(x)} ${round(y)}H${round(x + w - fold)}L${round(x + w)} ${round(y + fold)}V${round(y + h)}H${round(x)}Z" class="fig-node" stroke-linejoin="round"/>`,
    memBars([0.42, 0.58, 0.74].map((at, i) => [x + 4, y + h * at, (w - 8) * [1, 0.8, 0.6][i], 1.5])),
  ].join("");
}

/** A folder, from (x, y). */
function memFolder(x, y, w = 24, h = 18) {
  return `<path d="M${round(x)} ${round(y + h)}V${round(y)}H${round(x + w * 0.38)}L${round(x + w * 0.48)} ${round(y + 3.5)}H${round(x + w)}V${round(y + h)}Z" class="fig-node" stroke-linejoin="round"/>`;
}

/**
 * A place that starts a session (a computer, a runner): a box with a small
 * context window in it, the bar's shape drawn small with its start-up
 * layer, centred on cx from `top`.
 */
function memMachine(cx, top, w = 52, h = 56) {
  const bw = 18;
  const bh = 36;
  const bx = cx - bw / 2;
  const btop = top + (h - bh) / 2 + 1;
  const r = 4;
  const parts = [
    `<rect x="${round(cx - w / 2)}" y="${round(top)}" width="${w}" height="${h}" rx="6" class="fig-node"/>`,
    `<path d="M${round(bx)} ${round(btop)}V${round(btop + bh - r)}a${r} ${r} 0 0 0 ${r} ${r}H${round(bx + bw - r)}a${r} ${r} 0 0 0 ${r} -${r}V${round(btop)}" class="fig-line"/>`,
    `<line x1="${round(bx - 3)}" y1="${round(btop)}" x2="${round(bx + bw + 3)}" y2="${round(btop)}" class="fig-line fig-dashed"/>`,
  ];
  parts.push(memBars(Array.from({ length: CTX_BANDS }, (_, i) => [bx + 2, btop + bh - 3.5 - i * 2.75, bw - 4, 1.75])));
  return parts.join("");
}

/** A gate that stops what runs into it: an orange bar across the line, centred on (x, y); upright across a level line, level across an upright one. */
function memStop(x, y, upright = true, length = 26) {
  const [w, h] = upright ? [4, length] : [length, 4];
  return `<rect x="${round(x - w / 2)}" y="${round(y - h / 2)}" width="${w}" height="${h}" rx="1" class="fig-gate"/>`;
}

/** A gate that lets some through: a doorway of two orange posts and a lintel, the line passing through it, at (x, y). */
function memPosts(x, y) {
  return [
    `<rect x="${round(x - 9)}" y="${round(y - 11)}" width="3" height="21" rx="1" class="fig-gate"/>`,
    `<rect x="${round(x + 6)}" y="${round(y - 11)}" width="3" height="21" rx="1" class="fig-gate"/>`,
    `<rect x="${round(x - 9)}" y="${round(y - 13)}" width="18" height="3" rx="1" class="fig-gate"/>`,
  ].join("");
}

/** wrap(), its lines as even as they can be: the narrowest slot that needs no more lines. */
function memWrap(key, value, slot, size = "note", max = 3) {
  let best = wrap(key, value, slot, size, max);
  for (let narrower = slot - ADVANCE[size]; narrower > 0; narrower -= ADVANCE[size]) {
    let lines;
    try {
      lines = wrap(key, value, narrower, size, max);
    } catch {
      break;
    }
    if (lines.length > best.length) break;
    best = lines;
  }
  return best;
}

/** Lines of wrapped text, from y down, 13 apart; returns the drawing. */
function memLines(lines, x, y, cls, anchor) {
  return lines.map((line, n) => text(x, y + n * 13, line, cls, anchor)).join("");
}

// (44) A memory written down and read again — wide, two views. The session's
// bar, about half full (start-up layer, files, conversation), ends: its
// outline dashed, its layers faded, and under it that its context goes. A
// card leaves it, and an arrow, "written down", takes it down into the store
// between and below the two bars; the store stands on a line, "memory: notes
// outside the context window". An arrow, "loaded back at the start", goes up
// from the store into the next session's bar, almost empty: its start-up
// layer, whose third band is the note. Below 51rem the store stands beside
// the first bar's foot and the next bar under the first, the arrow coming
// down into it from above.
const MEM_SESSION = [{ kind: "startup", memory: false }, { kind: "files", h: 30 }, { kind: "talk", h: 34 }];
const MEM_NEXT = [{ kind: "startup", memory: true }];

function memoryWrittenAndLoaded(t, id, figureId) {
  return ctxViews(t, id, figureId, memoryWrittenAndLoadedView);
}

/** The next bar's two names on its right: the note above, the start-up layer below, each on a leader. */
function memNextLabels(t, id, x, startup, W) {
  const lx = x + CTX_W + 20;
  const slot = W - 16 - lx;
  const note = mid(startup.memory);
  const layer = mid(startup);
  return [
    ctxLeader(x + CTX_W + 2, note, lx - 4, note - 9),
    text(lx, note - 9 + NOTE_MID, fit(`${id}.note`, t.note, slot), "fig-note fig-strong"),
    `<path d="M${x + CTX_W + 4} ${round(startup.top)}H${x + CTX_W + 7}V${round(startup.bottom)}H${x + CTX_W + 4}" class="fig-member"/>`,
    ctxLeader(x + CTX_W + 7, layer, lx - 4, layer + 9),
    text(lx, layer + 9 + NOTE_MID, fit(`${id}.startup`, t.startup, slot), "fig-note"),
  ].join("");
}

function memoryWrittenAndLoadedView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const TOP = 60;
  const S_X = wide ? 110 : 36;
  const session = ctxBar(pid, S_X, TOP, MEM_SESSION, true);
  const talk = session.spans[2];
  const parts = [session.svg];
  // The card that leaves the bar.
  const card = { x: S_X + CTX_W + (wide ? 14 : 12), y: round(mid(talk) - MEM_NOTE.h / 2) };
  parts.push(memCard(card.x, card.y, MEM_NOTE.w, MEM_NOTE.h));
  const cardMid = card.y + MEM_NOTE.h / 2;
  const scx = S_X + CTX_W / 2;
  parts.push(ctxName(scx, session.bottom, `${id}.session1`, t.session1, 120));
  let height;
  if (wide) {
    // The session ends: under its name, on one line or two.
    const ends = memWrap(`${id}.ends`, t.ends, 2 * (scx - 16), "note", 2);
    parts.push(memLines(ends, scx, session.bottom + 36, "fig-note", "middle"));
    // The store, between and below the bars, on its line.
    const store = memStore(284, 252, ["note", "note", "note", "note"]);
    const floor = store.bottom + 4;
    parts.push(store.svg, `<line x1="${store.left - 44}" y1="${floor}" x2="${store.right + 44}" y2="${floor}" class="fig-line"/>`);
    parts.push(text(store.cx, floor + 16, fit(`${id}.store`, t.store, 2 * (store.cx - 16)), "fig-note fig-strong", "middle"));
    // Written down: from the card, down into the store.
    const wx = store.cards[0].cx;
    parts.push(pathArrow(pid, `M${card.x + MEM_NOTE.w + 4} ${cardMid}H${wx}V${store.top - 6}`));
    parts.push(text(wx + 8, (cardMid + store.top) / 2 + NOTE_MID, fit(`${id}.write`, t.write, 120), "fig-note fig-strong"));
    // Loaded back at the start: from the store, up into the next bar's note.
    const N_X = 580;
    const next = ctxBar(pid, N_X, TOP, MEM_NEXT);
    const [startup] = next.spans;
    const RX = 548;
    parts.push(next.svg, pathArrow(pid, `M${store.right + 4} ${store.mid}H${RX}V${round(mid(startup.memory))}H${N_X - 6}`));
    parts.push(text(RX - 8, (store.mid + mid(startup.memory)) / 2 + NOTE_MID + 6, fit(`${id}.read`, t.read, RX - 8 - store.right - 8), "fig-note fig-strong", "end"));
    parts.push(memNextLabels(t, id, N_X, startup, W));
    parts.push(ctxName(N_X + CTX_W / 2, next.bottom, `${id}.session2`, t.session2, 120));
    height = floor + 32;
  } else {
    // The session ends: beside its bar, under the limit.
    const ex = S_X + CTX_W + 12;
    parts.push(memLines(memWrap(`${id}.ends`, t.ends, W - 16 - ex, "note", 2), ex, TOP + 16, "fig-note"));
    // The store beside the bar's foot, its words under it.
    const store = memStore(W - 16 - 104, 178, ["note", "note", "note", "note"]);
    const floor = store.bottom + 4;
    parts.push(store.svg, `<line x1="${store.left - 14}" y1="${floor}" x2="${W - 16}" y2="${floor}" class="fig-line"/>`);
    const storeLines = memWrap(`${id}.store`, t.store, W - 16 - ex, "note", 2);
    parts.push(memLines(storeLines, (ex + W - 16) / 2, floor + 16, "fig-note fig-strong", "middle"));
    // Written down: from the card, across and down into the store.
    const wx = store.cards[1].cx;
    parts.push(pathArrow(pid, `M${card.x + MEM_NOTE.w + 4} ${cardMid}H${wx}V${store.top - 6}`));
    parts.push(text((card.x + MEM_NOTE.w + 4 + wx) / 2, cardMid - 8, fit(`${id}.write`, t.write, wx - card.x - MEM_NOTE.w), "fig-note fig-strong", "middle"));
    // Loaded back at the start: from the store, down beside it, across above the next bar and down into it.
    const N_TOP = floor + 16 + storeLines.length * 13 + 40;
    const next = ctxBar(pid, S_X, N_TOP, MEM_NEXT);
    const [startup] = next.spans;
    const across = N_TOP - 18;
    parts.push(next.svg, pathArrow(pid, `M${store.right + 4} ${store.mid}H${W - 8}V${across}H${scx}V${round(startup.memory.top - 5)}`));
    parts.push(text((scx + W - 8) / 2, across - 7, fit(`${id}.read`, t.read, W - 8 - scx - 8), "fig-note fig-strong", "middle"));
    parts.push(memNextLabels(t, id, S_X, startup, W));
    parts.push(ctxName(scx, next.bottom, `${id}.session2`, t.session2, 120));
    height = next.bottom + 34;
  }
  return { body: parts.join(""), height };
}

// (45) Rules in the file, recall in memory — one panel, inline: the article
// carries five figures twice over and its page has an HTML budget, and this
// drawing reads the same at every width, so it has one view. Two columns,
// each a tall card: the instruction file (a file; written by people,
// reviewed in a pull request, the same on every computer, each with a tick)
// and memory (the store; written by the agent, nobody has to have read it,
// may be old or wrong, each with an empty ring). A card leaves the store and
// a curved arrow takes it over to the file; a person stands at the arrow's
// start, and the words over the arc say it moves once a person has checked
// it. Under the two columns a lighter card, dashed, for work in flight: a
// hand-off, with no arrow to either.
function memoryFileOrMemory(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const COL_W = 140;
  const L = 16;
  const R = WIDTH - L - COL_W;
  const TOP = 112;
  const PAD = 8;
  const parts = [];
  // The move, over the top: its words above the arc.
  const moveLines = memWrap(`${id}.move`, t.move, WIDTH - 32, "note", 2);
  const arcTop = 58 + (moveLines.length - 1) * 13;
  parts.push(memLines(moveLines, WIDTH / 2, 58, "fig-note fig-strong", "middle"));
  // The columns' contents, measured first so both columns share one height.
  const bulletX = PAD + 14;
  const slot = COL_W - bulletX - PAD;
  const column = (key, keys) => ({ head: wrap(`${id}.${key}`, t[key], COL_W - 2 * PAD, "small", 2), rows: keys.map((k) => wrap(`${id}.${k}`, t[k], slot, "note", 3)) });
  const left = column("fileHead", ["file1", "file2", "file3"]);
  const right = column("memHead", ["mem1", "mem2", "mem3"]);
  const headY = TOP + 72; // under the icon row
  const rowsTop = (c) => headY + (c.head.length - 1) * 15 + 22;
  const rowsHeight = (c) => c.rows.reduce((sum, lines) => sum + lines.length * 13 + 7, 0);
  const H = Math.max(...[left, right].map((c) => rowsTop(c) + rowsHeight(c))) - TOP + 6;
  const drawColumn = (x, c, mark) => {
    const out = [`<rect x="${x}" y="${TOP}" width="${COL_W}" height="${round(H)}" rx="10" class="fig-node"/>`];
    c.head.forEach((line, n) => out.push(text(x + PAD, headY + n * 15, line, "fig-label fig-small fig-strong")));
    let y = rowsTop(c);
    c.rows.forEach((lines) => {
      out.push(mark(x + PAD + 4, y - 3.6), memLines(lines, x + bulletX, y, "fig-note"));
      y += lines.length * 13 + 7;
    });
    return out.join("");
  };
  parts.push(drawColumn(L, left, (x, y) => check(x + 1, y)));
  parts.push(drawColumn(R, right, (x, y) => `<circle cx="${round(x)}" cy="${round(y)}" r="3" class="fig-member"/>`));
  // The icons: the file on the left column's right, the store and the card that leaves it on the right column.
  const fileX = L + COL_W - PAD - 22;
  parts.push(memFile(fileX, TOP + 12, 22, 30));
  parts.push(memStore(R + COL_W - PAD - 92, TOP + 18, ["note", "note", "note", "note"]).svg);
  const card = { x: R + PAD, y: TOP + 14, w: 30, h: 22 };
  parts.push(memCard(card.x, card.y, card.w, card.h, true));
  // The arc: from the card, over the gap, down to the file; the person at its start.
  const sx = card.x + card.w / 2;
  const ex = fileX + 11;
  const lift = arcTop + 10;
  parts.push(pathArrow(pid, `M${sx} ${card.y - 22}C${sx} ${lift} ${ex} ${lift} ${ex} ${TOP + 8}`), memPerson(sx, card.y - 11));
  // Work in flight: a lighter card under both, with no arrow.
  const fy = TOP + H + 20;
  const fw = WIDTH - 32;
  const flight = memWrap(`${id}.flight`, t.flight, fw - 24, "note", 2);
  const fh = 14 + flight.length * 13;
  parts.push(`<rect x="16" y="${round(fy)}" width="${fw}" height="${fh}" rx="8" class="fig-line fig-dashed"/>`, memLines(flight, WIDTH / 2, fy + 18, "fig-note", "middle"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: round(fy + fh + 18), body: parts.join("") }] };
}

// (46) Who can read which memory — one panel, inline, for the reason (45)
// gives: a small matrix. Three columns, the places that start a session,
// each a box with a context window in it, numbered, their names (your
// computer, a colleague's, a runner) in a numbered list under the matrix;
// three rows, the places a memory can live (a folder on your computer, a
// file in the repository, a vendor's store), each name with its icon above
// its line. A row's line runs to the columns it reaches, a dot where it
// reaches one: the folder only the first; the file, through a box for the
// repository, all three with a solid line and a green dot; the vendor's
// store all three with a dashed line, an empty dot and a gate on the way, an
// orange doorway, labelled with whom the vendor lets in.
function memoryWhereItLives(t, id) {
  const CX = [156, 218, 280];
  const BOX = { w: 40, h: 48, top: 66 };
  const columns = ["c1", "c2", "c3"];
  const parts = columns.map((key, i) => text(CX[i], BOX.top - 8, String(i + 1), "fig-note fig-strong", "middle") + memMachine(CX[i], BOX.top, BOX.w, BOX.h));
  const first = BOX.top + BOX.h + 34;
  const icon = (key, x, cy) => {
    if (key === "r1") return memFolder(x, cy - 9, 24, 18);
    if (key === "r2") return memFile(x + 3, cy - 12, 18, 24);
    return memStore(x - 1, cy - 6, ["note", "note", "note"], 0.36).svg;
  };
  // The rows: an icon and a name, then the line under them.
  const rows = ["r1", "r2", "r3"].map((key, r) => {
    const top = first + r * 56;
    parts.push(icon(key, 16, top - 6), text(46, top - 2, fit(`${id}.${key}`, t[key], WIDTH - 16 - 46, "small"), "fig-label fig-small"));
    return top + 20;
  });
  const dot = (x, y, solid) => (solid ? `<circle cx="${x}" cy="${y}" r="4.5" class="fig-dot"/>` : `<circle cx="${x}" cy="${y}" r="4" class="fig-node"/>`);
  // A folder on your computer: your computer only.
  parts.push(`<line x1="16" y1="${rows[0]}" x2="${CX[0]}" y2="${rows[0]}" class="fig-line"/>`, dot(CX[0], rows[0], true));
  // A file in the repository: through the repository, to all three.
  const repoW = Math.max(64, t.repo.length * ADVANCE.note + 18);
  const repoX = 26;
  const repoEnd = repoX + repoW;
  if (repoEnd > CX[0] - 14) throw new Error(`Figure "${id}": the repository's box runs to ${round(repoEnd)} units`);
  parts.push(
    `<line x1="16" y1="${rows[1]}" x2="${repoX}" y2="${rows[1]}" class="fig-line"/>`,
    `<rect x="${repoX}" y="${rows[1] - 12}" width="${round(repoW)}" height="24" rx="6" class="fig-node"/>`,
    text(repoX + repoW / 2, rows[1] + NOTE_MID, fit(`${id}.repo`, t.repo, repoW - 12), "fig-note fig-strong", "middle"),
    `<line x1="${round(repoEnd)}" y1="${rows[1]}" x2="${CX[2]}" y2="${rows[1]}" class="fig-line"/>`,
    ...CX.map((x) => dot(x, rows[1], true)),
  );
  // A vendor's store: dashed, through the gate, to all three; the gate's words under the line.
  parts.push(`<line x1="16" y1="${rows[2]}" x2="${CX[2]}" y2="${rows[2]}" class="fig-line fig-dashed"/>`, memPosts(64, rows[2]), ...CX.map((x) => dot(x, rows[2], false)));
  const gateLines = memWrap(`${id}.gate`, t.gate, WIDTH - 32, "note", 2);
  parts.push(memLines(gateLines, 16, rows[2] + 26, "fig-note fig-wait"));
  // The columns' names, numbered as the boxes are.
  let y = rows[2] + 26 + (gateLines.length - 1) * 13 + 30;
  columns.forEach((key, i) => {
    parts.push(text(16, y, String(i + 1), "fig-note fig-strong"), text(28, y, fit(`${id}.${key}`, t[key], WIDTH - 16 - 28), "fig-note"));
    y += 14;
  });
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: y + 6, body: parts.join("") }] };
}

// (47) A runner starts empty — wide, two views. One runner in three states,
// a box each, under a timeline: the job starts (the box outlined and empty;
// a solid arrow brings the repository in, dashed ones a cache, with a
// warning sign, and a store outside the runner), the job runs (the box
// holds a context window with its start-up layer, and the note the agent
// writes), the job ends (the box crossed out in the orange: the runner is
// deleted; the note, faded, is gone). From the note in the middle box three
// arrows leave and end outside the crossed box: a commit, an artifact and a
// cache, the cache with the same sign. A key names the sign. Below 51rem
// the three boxes stand one under the other, the inputs beside the first
// and the three ways out beside the last.
const MEM_RUNNING = [{ kind: "startup", memory: false }, { kind: "files", h: 22 }, { kind: "talk", h: 14 }];

function memoryRunnerStartsEmpty(t, id, figureId) {
  return ctxViews(t, id, figureId, memoryRunnerStartsEmptyView);
}

/** A runner as a box: outlined, from (x, y). */
function memRunner(x, y, w, h) {
  return `<rect x="${round(x)}" y="${round(y)}" width="${w}" height="${h}" rx="10" class="fig-line"/>`;
}

/** The crossed box: the runner deleted, its note faded inside, the words on plates over the cross. */
function memDeleted(t, id, x, y, w, h) {
  const cx = x + w / 2;
  const card = { w: MEM_NOTE.w, h: MEM_NOTE.h };
  const cardY = y + h / 2 - card.h / 2 - 8;
  const parts = [
    memRunner(x, y, w, h),
    `<path d="M${x + 8} ${y + 8}L${x + w - 8} ${y + h - 8}M${x + w - 8} ${y + 8}L${x + 8} ${y + h - 8}" class="fig-wait-stroke"/>`,
    `<g opacity="0.35">${memCard(cx - card.w / 2, cardY, card.w, card.h)}</g>`,
  ];
  const plate = (lines, top, cls) => {
    const width = Math.max(...lines.map((line) => line.length)) * ADVANCE.note + 12;
    const height = lines.length * 13 + 6;
    return [`<rect x="${round(cx - width / 2)}" y="${round(top)}" width="${round(width)}" height="${height}" rx="4" class="fig-row"/>`, memLines(lines, cx, top + 13, cls, "middle")].join("");
  };
  const deleted = memWrap(`${id}.deleted`, t.deleted, w - 20, "note", 2);
  parts.push(plate(deleted, y + 12, "fig-note fig-wait fig-strong"));
  const gone = memWrap(`${id}.gone`, t.gone, w - 20, "note", 3);
  parts.push(plate(gone, cardY + card.h + 8, "fig-note"));
  return parts.join("");
}

function memoryRunnerStartsEmptyView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const parts = [];
  // The three boxes, their places and sizes.
  const BOX_W = wide ? 124 : 132;
  const H_RUN = 188;
  const boxes = wide
    ? [
        { x: 272, y: 92, h: H_RUN },
        { x: 432, y: 92, h: H_RUN },
        { x: 612, y: 92, h: H_RUN },
      ]
    : [
        { x: 16, y: 76, h: 150 },
        { x: 16, y: 266, h: H_RUN },
        { x: 16, y: 494, h: 156 },
      ];
  const heads = ["start", "run", "end"];
  // The timeline: the three states' names, and an arrow from one to the next.
  if (wide) {
    const y = 74;
    heads.forEach((key, i) => parts.push(text(boxes[i].x + BOX_W / 2, y - 10, fit(`${id}.${key}`, t[key], 170), "fig-note fig-strong", "middle")));
    parts.push(pathArrow(pid, `M${boxes[0].x + BOX_W / 2} ${y}H${boxes[2].x + BOX_W / 2 + 70}`));
    boxes.forEach(({ x }) => parts.push(`<circle cx="${x + BOX_W / 2}" cy="${y}" r="3.5" class="fig-dot"/>`));
  } else {
    heads.forEach((key, i) => parts.push(text(16, boxes[i].y - 9, fit(`${id}.${key}`, t[key], 110), "fig-note fig-strong")));
    [0, 1].forEach((i) => parts.push(arrow(pid, 130, boxes[i].y + boxes[i].h + 4, 130, boxes[i + 1].y - 6)));
  }
  // 1. The job starts: an empty box, and what comes in.
  const [b1, b2, b3] = boxes;
  parts.push(memRunner(b1.x, b1.y, BOX_W, b1.h));
  const inputs = [
    { key: "repo", dashed: false, icon: (x, y) => memFile(x, y - 9, 14, 18), iconW: 14 },
    { key: "cache", dashed: true, icon: (x, y) => memWarn(x + 7, y, 12), iconW: 14 },
    { key: "store", dashed: true, icon: (x, y) => memStore(x, y - 6, ["note", "note", "note"], 0.36).svg, iconW: 26 },
  ];
  if (wide) {
    inputs.forEach(({ key, dashed, icon, iconW }, i) => {
      const y = b1.y + 46 + i * 52;
      const lineX = 16 + 26 + 8; // after the widest icon
      parts.push(text(lineX, y - 9, fit(`${id}.${key}`, t[key], b1.x - 16 - lineX), "fig-note"));
      parts.push(icon(16 + (26 - iconW) / 2, y), arrow(pid, lineX, y, b1.x - 4, y, dashed));
    });
  } else {
    const lx = b1.x + BOX_W + 26;
    inputs.forEach(({ key, dashed, icon, iconW }, i) => {
      const y = b1.y + 24 + i * 46;
      const lines = memWrap(`${id}.${key}`, t[key], W - 16 - lx - iconW - 6, "note", 3);
      parts.push(icon(lx, y - 3.6), memLines(lines, lx + iconW + 6, y, "fig-note"));
      parts.push(arrow(pid, lx - 6, y - 3.6, b1.x + BOX_W + 4, y - 3.6, dashed));
    });
  }
  // 2. The job runs: the session's bar and the note the agent writes.
  parts.push(memRunner(b2.x, b2.y, BOX_W, b2.h));
  const bar = ctxBar(pid, b2.x + 12, b2.y + 16, MEM_RUNNING);
  parts.push(bar.svg);
  const card = { x: b2.x + 12 + CTX_W + 10, y: b2.y + 70, w: MEM_NOTE.w, h: MEM_NOTE.h };
  parts.push(memCard(card.x, card.y, card.w, card.h));
  const noteLines = memWrap(`${id}.note`, t.note, wide ? 170 : W - 16 - (b2.x + BOX_W + 12), "note", 2);
  if (wide) parts.push(memLines(noteLines, b2.x + BOX_W / 2, b2.y + b2.h + 18, "fig-note fig-strong", "middle"));
  else parts.push(memLines(noteLines, b2.x + BOX_W + 12, card.y - 6 - (noteLines.length - 1) * 13, "fig-note fig-strong"));
  // 3. The job ends: the runner deleted, the note gone.
  parts.push(memDeleted(t, id, b3.x, b3.y, BOX_W, b3.h));
  // The three ways out: from the note, out of the box, past the crossed box, each to its end.
  const outs = [
    { key: "commit", sign: false },
    { key: "artifact", sign: false },
    { key: "cacheOut", sign: true },
  ];
  const exitY = (i) => card.y + 7 + i * 9;
  const turnX = wide ? [594, 582, 570] : [178, 168, 158];
  const endY = wide ? (i) => b3.y + b3.h + 40 + i * 24 : (i) => b3.y + 34 + i * 40;
  const itemX = wide ? 622 : 186;
  outs.forEach(({ key, sign }, i) => {
    const y = endY(i);
    parts.push(pathArrow(pid, `M${card.x + card.w + 4} ${exitY(i)}H${turnX[i]}V${y}H${itemX - 6}`));
    parts.push(memCard(itemX, y - 9, 14, 18, true));
    const label = fit(`${id}.${key}`, t[key], W - 16 - (itemX + 22) - (sign ? 20 : 0));
    parts.push(text(itemX + 22, y + NOTE_MID, label, "fig-note fig-strong"));
    if (sign) parts.push(memWarn(itemX + 22 + label.length * ADVANCE.note + 12, y - 0.5, 12));
  });
  // The key: the sign means untrusted input.
  const keyY = wide ? endY(2) : b3.y + b3.h + 30;
  parts.push(memWarn(22, keyY - 4, 12), text(36, keyY, fit(`${id}.warn`, t.warn, wide ? 220 : W - 52), "fig-note"));
  return { body: parts.join(""), height: keyY + 18 };
}

// (48) A poisoned entry — wide, two views. Left to right: a text from
// outside, a card with a hidden line in the orange and a warning sign on it;
// an arrow into the agent's bar; from the bar an arrow, "written to memory",
// into the store, where one of five cards is the poisoned entry (jagged, in
// the orange, the sign on it). From the store, read by later sessions, an
// arrow into each of three bars, every later session, each holding a copy
// of the jagged card on its start-up layer (the fact check, 22 November
// 2026: a memory reaches the sessions that read it, not necessarily at the
// start). From the last bar, at that card, an arrow runs towards the action
// the entry asks for and stops at a gate, a limit outside the model. Below 51rem the same runs down the panel, the arrows
// into the three bars coming down into them from above.
const MEM_AGENT = [{ kind: "startup", memory: false }, { kind: "files", h: 40 }, { kind: "talk", h: 16 }];
const MEM_LATER = [{ kind: "startup", memory: false }, { kind: "bad", h: MEM_BAND }];
const MEM_POISONED = ["bad", "note", "note", "note", "note"];

function memoryPoisonedEntry(t, id, figureId) {
  return ctxViews(t, id, figureId, memoryPoisonedEntryView);
}

/** A text from outside: a page with lines of writing, one of them the hidden instruction, dashed in the orange with the sign at its end. Returns the drawing and the hidden line's height. */
function memSource(x, y, w, h) {
  const parts = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" class="fig-node"/>`];
  const rows = [10, 19, 31, 43, 52];
  const hidden = 2;
  parts.push(memBars(rows.flatMap((dy, i) => (i === hidden ? [] : [[x + 8, y + dy - 0.75, (w - 16) * [1, 0.85, 0, 0.9, 0.6][i], 1.5]]))));
  const hy = y + rows[hidden];
  parts.push(`<line x1="${x + 8}" y1="${hy}" x2="${x + w - 26}" y2="${hy}" class="fig-wait-stroke" stroke-dasharray="2 2.5"/>`, memWarn(x + w - 15, hy - 0.5, 11));
  return { svg: parts.join(""), hidden: hy };
}

function memoryPoisonedEntryView(t, id, pid, view) {
  const wide = view === "flow";
  const W = wide ? FLOW_WIDTH : WIDTH;
  const parts = [];
  const SRC = { w: wide ? 84 : 96, h: 62 };
  let height;
  if (wide) {
    const TOP = 76;
    const A_X = 152;
    const agent = ctxBar(pid, A_X, TOP, MEM_AGENT);
    const files = agent.spans[1];
    const fy = mid(files);
    // The text from outside, level with the files the agent reads.
    const src = memSource(16, round(fy - SRC.h / 2), SRC.w, SRC.h);
    parts.push(text(16, fy - SRC.h / 2 - 10, fit(`${id}.source`, t.source, A_X - 16 - 16), "fig-note fig-strong"), src.svg);
    parts.push(memLines(memWrap(`${id}.hidden`, t.hidden, A_X - 16 - 20, "note", 2), 16, fy + SRC.h / 2 + 16, "fig-note fig-wait fig-strong"));
    parts.push(arrow(pid, 16 + SRC.w + 4, fy, A_X - 6, fy), agent.svg, ctxName(A_X + CTX_W / 2, agent.bottom, `${id}.agent`, t.agent, 100));
    // Written to memory: into the store, its front level with the files.
    const S_X = 328;
    const store = memStore(S_X, round(fy - MEM_CARD.up - MEM_FRONT / 2), MEM_POISONED);
    parts.push(arrow(pid, A_X + CTX_W + 8, fy, S_X - 6, fy), text((A_X + CTX_W + 8 + S_X - 6) / 2, fy - 8, fit(`${id}.write`, t.write, S_X - 6 - A_X - CTX_W - 8), "fig-note fig-strong", "middle"));
    parts.push(store.svg, text(store.cx, store.bottom + 16, fit(`${id}.store`, t.store, store.right - store.left), "fig-note fig-strong", "middle"));
    const bad = store.cards[0];
    parts.push(text(bad.cx, bad.top - 9, fit(`${id}.bad`, t.bad, 2 * (bad.cx - 16)), "fig-note fig-wait fig-strong", "start"));
    // Every later session: three bars, each read into at the start.
    const BARS = [476, 540, 604];
    const later = BARS.map((x) => ctxBar(pid, x, TOP, MEM_LATER));
    later.forEach((b) => parts.push(b.svg));
    parts.push(text((BARS[0] + BARS[2] + CTX_W) / 2, TOP - 14, fit(`${id}.later`, t.later, 240), "fig-note fig-strong", "middle"));
    const noteY = round(mid(later[0].spans[1]));
    const BUS = later[0].bottom + 18;
    BARS.forEach((x) => parts.push(pathArrow(pid, `M${store.right + 4} ${fy}H${store.right + 22}V${BUS}H${x - 10}V${noteY}H${x - 5}`)));
    parts.push(text((store.right + 22 + BARS[2] - 10) / 2, BUS + 16, fit(`${id}.read`, t.read, 200), "fig-note fig-strong", "middle"));
    // The action the entry asks for, stopped by the limit.
    const GATE = BARS[2] + CTX_W + 36;
    parts.push(arrow(pid, BARS[2] + CTX_W + 6, noteY, GATE - 4, noteY), memStop(GATE, noteY));
    const action = memWrap(`${id}.action`, t.action, W - 16 - (GATE + 12), "note", 3);
    parts.push(memLines(action, GATE + 12, noteY + NOTE_MID - ((action.length - 1) * 13) / 2, "fig-note"));
    const gate = memWrap(`${id}.gate`, t.gate, W - 16 - (BARS[2] + CTX_W + 8), "note", 2);
    parts.push(memLines(gate, BARS[2] + CTX_W + 8, noteY + 32, "fig-note fig-wait fig-strong"));
    height = Math.max(BUS + 16, noteY + 32 + (gate.length - 1) * 13) + 20;
  } else {
    // The text from outside, then the agent's bar beside it.
    const A_X = 200;
    const TOP = 60;
    const agent = ctxBar(pid, A_X, TOP, MEM_AGENT);
    const fy = mid(agent.spans[1]);
    const src = memSource(16, round(fy - SRC.h / 2), SRC.w, SRC.h);
    parts.push(text(16, fy - SRC.h / 2 - 10, fit(`${id}.source`, t.source, A_X - 16 - 16), "fig-note fig-strong"), src.svg);
    parts.push(memLines(memWrap(`${id}.hidden`, t.hidden, A_X - 16 - 12, "note", 2), 16, fy + SRC.h / 2 + 16, "fig-note fig-wait fig-strong"));
    parts.push(arrow(pid, 16 + SRC.w + 4, fy, A_X - 6, fy), agent.svg, ctxName(A_X + CTX_W / 2, agent.bottom, `${id}.agent`, t.agent, 100));
    // Written to memory: down from the bar's side, across into the store.
    const store = memStore(128, agent.bottom + 64, MEM_POISONED);
    const wx = A_X + CTX_W + 20;
    parts.push(pathArrow(pid, `M${A_X + CTX_W + 6} ${fy}H${wx}V${store.mid}H${store.right + 6}`));
    parts.push(memLines(memWrap(`${id}.write`, t.write, 120, "note", 2), wx - 8, agent.bottom + 40, "fig-note fig-strong", "end"));
    const bad = store.cards[0];
    const badLines = memWrap(`${id}.bad`, t.bad, bad.x - 8 - 16, "note", 2);
    parts.push(store.svg, memLines(badLines, bad.x - 10, bad.top + 8, "fig-note fig-wait fig-strong", "end"));
    parts.push(text(store.cx, store.bottom + 16, fit(`${id}.store`, t.store, store.right - store.left), "fig-note fig-strong", "middle"));
    // Read at the start: down from the store and into each bar from above.
    const BARS = [96, 164, 232];
    const L_TOP = store.bottom + 80;
    const later = BARS.map((x) => ctxBar(pid, x, L_TOP, MEM_LATER));
    later.forEach((b) => parts.push(b.svg));
    const bus = L_TOP - 16;
    const noteTop = round(later[0].spans[1].top);
    BARS.forEach((x) => parts.push(pathArrow(pid, `M${store.cx} ${store.bottom + 24}V${bus}H${x + CTX_W / 2}V${noteTop - 5}`)));
    const readLines = memWrap(`${id}.read`, t.read, W - 16 - store.cx - 8, "note", 2);
    parts.push(memLines(readLines, store.cx + 8, (store.bottom + 24 + bus) / 2 + NOTE_MID - ((readLines.length - 1) * 13) / 2, "fig-note fig-strong"));
    const laterX = (BARS[0] + BARS[2] + CTX_W) / 2;
    parts.push(text(laterX, later[0].bottom + 20, fit(`${id}.later`, t.later, 2 * (laterX - 16)), "fig-label fig-small", "middle"));
    // The action the entry asks for: down from the last bar's card, stopped at the limit.
    const noteY = round(mid(later[2].spans[1]));
    const ax = BARS[2] + CTX_W + 10;
    const gateY = later[2].bottom + 52;
    parts.push(pathArrow(pid, `M${BARS[2] + CTX_W + 4} ${noteY}H${ax}V${gateY - 4}`), memStop(ax, gateY, false));
    const gate = memWrap(`${id}.gate`, t.gate, ax - 20 - 16, "note", 2);
    parts.push(memLines(gate, ax - 20, gateY + NOTE_MID - ((gate.length - 1) * 13) / 2, "fig-note fig-wait fig-strong", "end"));
    const action = memWrap(`${id}.action`, t.action, W - 32, "note", 2);
    parts.push(memLines(action, ax + 4, gateY + 26, "fig-note", "end"));
    height = gateY + 26 + (action.length - 1) * 13 + 18;
  }
  return { body: parts.join(""), height };
}

// The torch lights up: the hero of the article on Fluentor's name and logo,
// drawn in the page in its image's place (renderHero, below). It is the
// article's cover, the whole 1200 x 630 picture, drawn from its parts (COVER
// in scripts/lib/torch.mjs): the product's torch on its dark plate with the
// plate's faint grid, a glow behind the nodes of one route in the flame, the
// rest of the torch dimmed a little, and the route drawn in pale gold through
// its lines' own curves. It is drawn in the artwork's colours, the same in
// both themes, and it is the approved mark's every node and line, never
// redrawn. The markup is the still picture, complete, which is what a reader
// without JavaScript, a reader who asks for reduced motion and a printout
// see. The motion (base.css, "The torch") plays once when the page's script
// lets it (plays-once, reveal.js): the product's launch motion first, every
// node and line coming up by its height in the torch (data-h, 0 at the foot
// and 1 at the top node, a line's that of its lower end, as the product sets
// it), then the route drawing from its lowest node to the top (one path,
// pathLength 1, so a dash offset of 1 hides it), each of its glows coming up
// as the path reaches it (data-t, the share of the path's time that has
// passed by then). Every motion fills only backwards, so the picture ends as
// it stands: the cover.
function torchLightsUp({ alt, prefix: P }) {
  const lineGroup = MARK.match(/<g [^>]*>/)[0];
  const lines = [...MARK.matchAll(/<path d="M([\d.]+) ([\d.]+)C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)" stroke="([^"]+)"\/>/g)].map((m) => ({ points: m.slice(1, 9), stroke: m[9] }));
  const nodes = [...MARK.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="([^"]+)"\/>/g)].map(([, cx, cy, r, fill]) => ({ cx, cy, r, fill }));
  if (lines.length !== 74 || nodes.length !== 35) throw new Error(`The torch has 74 lines and 35 nodes, read ${lines.length} and ${nodes.length}`);

  // Each element's height in the torch: 0 at the lowest node, 1 at the top.
  const ys = nodes.map(({ cy }) => Number(cy));
  const [top, foot] = [Math.min(...ys), Math.max(...ys)];
  const heightOf = (y) => String(Math.round(((foot - y) / (foot - top)) * 10000) / 10000);
  const mark = [
    lineGroup,
    ...lines.map(({ points, stroke }) => `<path d="M${points[0]} ${points[1]}C${points.slice(2).join(" ")}" stroke="${stroke}" class="torch-line" data-h="${heightOf(Math.max(Number(points[1]), Number(points[7])))}"/>`),
    "</g><g>",
    ...nodes.map(({ cx, cy, r, fill }) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" class="torch-halo" data-h="${heightOf(Number(cy))}"/>`),
    "</g><g>",
    ...nodes.map(({ cx, cy, r, fill }) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" class="torch-node" data-h="${heightOf(Number(cy))}"/>`),
    "</g>",
  ].join("");

  // The route as one path through its lines' own curves, each line taken in
  // the direction the route runs, and where along it each node lies.
  const route = COVER.route.map((index) => nodes[index]);
  const at = ({ cx, cy }) => `${cx} ${cy}`;
  const segments = route.slice(1).map((to, i) => {
    const from = route[i];
    const line = lines.find(({ points: p }) => [`${p[0]} ${p[1]}`, `${p[6]} ${p[7]}`].sort().join() === [at(from), at(to)].sort().join());
    if (!line) throw new Error(`No line of the torch joins ${at(from)} and ${at(to)}`);
    const p = line.points;
    return `${p[0]} ${p[1]}` === at(from) ? p : [p[6], p[7], p[4], p[5], p[2], p[3], p[0], p[1]];
  });
  const lengths = segments.map(cubicLength);
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const reached = route.map((_, i) => lengths.slice(0, i).reduce((sum, length) => sum + length, 0) / total);
  const d = `M${at(route[0])}${segments.map((p) => `C${p.slice(2).join(" ")}`).join("")}`;

  const [width, height] = COVER.size;
  const plate = `width="${width}" height="${height}"`;
  const stops = (list) => list.map(([offset, color, opacity]) => `<stop offset="${offset}" stop-color="${color}"${opacity === undefined ? "" : ` stop-opacity="${opacity}"`}/>`).join("");
  const rect = ([x, y, w, h]) => `x="${x}" y="${y}" width="${w}" height="${h}"`;
  const { grid, fade, glow, dim, climb, discs } = COVER;
  return [
    `<svg class="article-image plays-once" viewBox="0 0 ${width} ${height}" ${plate} role="img" aria-label="${esc(alt)}">`,
    "<defs>",
    `<pattern id="${P}grid" width="${grid.size}" height="${grid.size}" patternUnits="userSpaceOnUse" y="${grid.y}"><path d="${grid.path}" fill="none" stroke="${grid.stroke}"/></pattern>`,
    `<radialGradient id="${P}fade" cx="${fade.cx}" cy="${fade.cy}" r="${fade.r}" gradientUnits="userSpaceOnUse">${stops(fade.stops)}</radialGradient>`,
    `<mask id="${P}gridmask"><rect ${plate} fill="url(#${P}fade)"/></mask>`,
    `<radialGradient id="${P}node-glow">${stops(glow.stops)}</radialGradient>`,
    `<linearGradient id="${P}climb" gradientUnits="userSpaceOnUse" x1="0" y1="${route[0].cy}" x2="0" y2="${route.at(-1).cy}">${stops(climb.stops)}</linearGradient>`,
    `<radialGradient id="${P}hole">${stops(dim.hole.stops)}</radialGradient>`,
    `<filter id="${P}feather" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${dim.feather}"/></filter>`,
    `<mask id="${P}dim-mask" maskUnits="userSpaceOnUse" ${rect(dim.rect)}><rect ${rect(dim.show)} fill="${dim.show[4]}" filter="url(#${P}feather)"/>${route.map(({ cx, cy }) => `<circle cx="${cx}" cy="${cy}" r="${dim.hole.r}" fill="url(#${P}hole)"/>`).join("")}</mask>`,
    `<mask id="${P}off-discs" maskUnits="userSpaceOnUse" ${rect(discs.rect)}><rect ${rect(discs.rect)} fill="${discs.rect[4]}"/>${route.map(({ cx, cy }) => `<circle cx="${cx}" cy="${cy}" r="${discs.r}" fill="${discs.fill}"/>`).join("")}</mask>`,
    "</defs>",
    `<rect ${plate} fill="${COVER.plate}"/>`,
    `<rect ${plate} fill="url(#${P}grid)" mask="url(#${P}gridmask)"/>`,
    `<g transform="${COVER.transform}">${route.map(({ cx, cy }, i) => `<circle cx="${cx}" cy="${cy}" r="${glow.r}" fill="url(#${P}node-glow)" class="torch-glow" data-t="${round6(easeOutAt(reached[i]))}"/>`).join("")}</g>`,
    `<g transform="${COVER.transform}">${mark}</g>`,
    `<g transform="${COVER.transform}"><rect ${rect(dim.rect)} fill="${dim.fill}" fill-opacity="${dim.opacity}" mask="url(#${P}dim-mask)" class="torch-dim"/></g>`,
    `<g transform="${COVER.transform}" fill="none" stroke="url(#${P}climb)" stroke-width="${climb.width}" stroke-linecap="round" stroke-linejoin="round" mask="url(#${P}off-discs)"><path d="${d}" pathLength="1" class="torch-path"/></g>`,
    "</svg>",
  ].join("");
}

/** The length of a cubic curve [x0, y0, x1, y1, x2, y2, x3, y3], as a polyline of 64 steps. */
function cubicLength(points) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = points.map(Number);
  let length = 0;
  let [px, py] = [x0, y0];
  for (let i = 1; i <= 64; i += 1) {
    const u = i / 64;
    const v = 1 - u;
    const x = v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3;
    const y = v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3;
    length += Math.hypot(x - px, y - py);
    [px, py] = [x, y];
  }
  return length;
}

/**
 * The share of its time an ease-out motion (CSS `ease-out`,
 * cubic-bezier(0, 0, 0.58, 1)) takes to cover `progress` of its way.
 */
function easeOutAt(progress) {
  const bezier = (u, a, b) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let [lo, hi] = [0, 1];
  for (let i = 0; i < 50; i += 1) {
    const u = (lo + hi) / 2;
    if (bezier(u, 0, 1) < progress) lo = u;
    else hi = u;
  }
  return bezier((lo + hi) / 2, 0, 0.58);
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

export const FIGURES = { stages, gates, loop, assessment, team, harness, ledger, timeline, setup, build, words, bilingual, gauntlet, agents, critic, fleet, sources, merges, logos, connection, lifecycle, price, lock, "waiting-per-day": waitingPerDay, "chat-or-agent": chatOrAgent, "five-parts": fiveParts, "four-things": fourThings, "file-before-after": fileBeforeAfter, "which-tool-reads-what": whichToolReadsWhat, "file-hierarchy": fileHierarchy, "agent-handover": agentHandover, "agent-file": agentFile, "skill-folder": skillFolder, "skill-locations": skillLocations, "mcp-server": mcpServer, "read-only-limits": readOnlyLimits, "what-goes-along": whatGoesAlong, "daily-summary": dailySummary, "limits-path": limitsPath, "limits-attempts": limitsAttempts, "reading-and-route": readingAndRoute, "context-before-you-type": contextBeforeYouType, "context-as-it-fills": contextAsItFills, "context-subagent": contextSubagent, "context-compaction": contextCompaction, "context-handoff": contextHandoff, "memory-written-and-loaded": memoryWrittenAndLoaded, "memory-file-or-memory": memoryFileOrMemory, "memory-where-it-lives": memoryWhereItLives, "memory-runner-starts-empty": memoryRunnerStartsEmpty, "memory-poisoned-entry": memoryPoisonedEntry };

/**
 * Render one figure as HTML: `<figure class="figure figure-inline|figure-wide">`
 * with the panel row and the caption. The output contains no blank line so
 * markdown-it keeps it as one HTML block.
 */
export function renderFigure(id, { placement = "inline", strings }) {
  const draw = FIGURES[id];
  if (!draw) throw new Error(`Unknown figure "${id}"; known figures: ${Object.keys(FIGURES).join(", ")}`);
  if (placement !== "inline" && placement !== "wide") throw new Error(`Figure "${id}": placement must be "inline" or "wide", got ${JSON.stringify(placement)}`);
  const t = strings?.figures?.[id];
  if (!t) throw new Error(`Figure "${id}": no strings under figures.${id}`);
  const figureId = `fig-${id}`;
  const captionId = `${figureId}-caption`;
  const { panels, caption } = draw(t, id, figureId);
  // A figure with two views (a flow panel from 51rem, a stacked one below) has
  // the one panel row; base.css shows the view that fits. It is wide: the flow
  // view is wider than a panel may be on the measure.
  const views = panels.some((spec) => spec.view);
  if (views && placement !== "wide") throw new Error(`Figure "${id}": a figure with a flow view is placed "wide", not "${placement}"`);
  const svgs = panels.map((spec, i) => panel({ ...spec, id: `${figureId}-p${i + 1}`, captionId }));
  return [
    `<figure class="figure figure-${placement}" id="${figureId}">`,
    `<div class="figure-panels ${views ? "figure-panels-views" : `figure-panels-${panels.length}`}">${svgs.join("")}</div>`,
    `<figcaption id="${captionId}">${esc(caption)}</figcaption>`,
    "</figure>",
  ].join("\n");
}

// The heroes an article's front matter can name (`heroFigure: <id>`).
export const HEROES = { "torch-lights-up": torchLightsUp };

/**
 * Render an article's hero as HTML: one `<svg class="article-image">` that
 * stands where the article's image would (layouts/article.njk), as wide as
 * the measure and, through its viewBox, at the image's 1200:630, described
 * by `alt`, the article's imageAlt, and without a caption. Its ids start
 * with "hero-", so they meet no figure's.
 */
export function renderHero(id, { alt }) {
  const draw = HEROES[id];
  if (!draw) throw new Error(`Unknown hero figure "${id}"; known hero figures: ${Object.keys(HEROES).join(", ")}`);
  if (typeof alt !== "string" || alt.trim() === "") throw new Error(`Hero figure "${id}": it needs the article's imageAlt to describe it`);
  return draw({ alt, prefix: "hero-" });
}
