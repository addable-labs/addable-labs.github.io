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
// type; an inline figure is one panel with its caption beside it. Each label slot has a character budget (JetBrains Mono
// advances 0.6 em per character); a string that does not fit fails the build
// naming the key, like the front-matter validator, so a longer Swedish
// translation cannot overflow its panel silently.
//
// The values in the charts of the nivå figures (levels, cells, bars) are
// deliberately made-up shapes: the product is in development and the
// figures are schematic — no real people, scores or screenshots.

const WIDTH = 320;
// Mono advance per character at the three type sizes used (0.6 em).
const ADVANCE = { label: 13 * 0.6, note: 10.5 * 0.6, head: 11 * 0.6 };

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

/** A <text> element; `cls` names the fig-* classes, `anchor` the text-anchor. */
function text(x, y, value, cls, anchor) {
  const attrs = [`x="${round(x)}"`, `y="${round(y)}"`, `class="${cls}"`];
  if (anchor) attrs.push(`text-anchor="${anchor}"`);
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
 */
function panel({ id, captionId, height, title, head, headRight, body }) {
  const H = height;
  const parts = [
    `<svg class="figure-panel" viewBox="0 0 ${WIDTH} ${H}" role="img" aria-labelledby="${id}-title ${captionId}">`,
    `<title id="${id}-title">${esc(title)}</title>`,
    `<defs><pattern id="${id}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" class="fig-grid"/></pattern>`,
    `<marker id="${id}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0l8 4-8 4z" class="fig-arrowhead"/></marker></defs>`,
    `<rect width="${WIDTH}" height="${H}" fill="url(#${id}-grid)"/>`,
    text(16, 25, fit(`${id}.head`, head, headRight ? 200 : 288, "head"), "fig-head"),
  ];
  if (headRight) parts.push(text(WIDTH - 16, 25, headRight.value, `fig-head ${headRight.cls}`, "end"));
  parts.push(`<line x1="0" y1="38" x2="${WIDTH}" y2="38" class="fig-hair"/>`, body, "</svg>");
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

// The six figures. Each takes the figure's strings, its id (for the error
// messages of `fit`) and the figure's DOM id (`fig-<id>`, which prefixes the
// panel ids and so the marker ids an arrow references) and returns
// { panels: [...], caption }; a panel is { title, head, headRight?, height,
// body }.

// (1) The stages of the build with the founder's two gates — wide, three
// panels: the documents before the code, the build, the steps before it is
// public. Facts from the article and plans/website-redesign/build/factory-run.md:
// ten work items, ten gates, no publication on an agent's say-so.
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
    panels: [{ title: t.title, head: t.head, headRight: { value: fit(`${id}.score`, t.score, 60, "head"), cls: "fig-ok" }, height: 296, body: parts.join("") }],
  };
}

// (3) The loop: change → gates → founder review → published page, and the
// next change starts it again.
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

export const FIGURES = { stages, gates, loop, assessment, team, harness };

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
  const svgs = panels.map((spec, i) => panel({ ...spec, id: `${figureId}-p${i + 1}`, captionId }));
  return [
    `<figure class="figure figure-${placement}" id="${figureId}">`,
    `<div class="figure-panels figure-panels-${panels.length}">${svgs.join("")}</div>`,
    `<figcaption id="${captionId}">${esc(caption)}</figcaption>`,
    "</figure>",
  ].join("\n");
}
