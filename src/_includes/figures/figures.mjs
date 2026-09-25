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
// Mono advance per character at the four type sizes used (0.6 em).
const ADVANCE = { label: 13 * 0.6, small: 12 * 0.6, note: 10.5 * 0.6, head: 11 * 0.6 };

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
    panels: [{ title: t.title, head: t.head, headRight: { value: fit(`${id}.score`, t.score, 60, "head"), cls: "fig-ok" }, height: 296, body: parts.join("") }],
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
    headRight: { value: fit(`${id}.panels.${key}.window`, t.panels[key].window, 104, "head"), cls: "" },
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
// key set, one test for the nivå article. Both draw only what the articles
// say; the nivå one is schematic (abstract bars, no real strings).

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
    panels: [{ title: t.title, head: t.head, headRight: { value: fit(`${id}.wall`, t.wall, 104, "head"), cls: "" }, height: 332, body: parts.join("") }],
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
    headRight: { value: fit(`${id}.panels.${key}.value`, t.panels[key].value, 104, "head"), cls: "" },
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

// The four figures of the context study (founder feedback 2026-09-24,
// si-t64i; 2026-09-25, si-pvns): one session and the next, the task
// database's sync in problem 4, the hand-off points against the model's
// window and the two counts side by side (drawn after the hand-off figure,
// though the article shows it first). The article's tables hold its numbers,
// so these draw the mechanisms and the proportions the text describes; every
// label is the article's own wording, and what happened in a run is told in
// the past tense or dated.

/** A dot on the timeline at x = 24, with the accent glow behind it when `glow`. */
function dot(y, glow = false) {
  return `${glow ? `<circle cx="24" cy="${y}" r="9" class="fig-glow"/>` : ""}<circle cx="24" cy="${y}" r="4" class="fig-dot"/>`;
}

// (17) One session and the next — wide, two panels. Panel 1, not to scale:
// a session's life down a line — the start-up content, re-orientation until
// the first outward action (with the finding of 20–22 September in orange),
// the first outward action in the accent glow, work, the hand-off advised
// and called in orange — and the new session that continues from there.
// Panel 2, to scale (founder's go 2026-09-25, si-pvns): what every step
// sends, from a session's first step to its end, on one scale — the track's
// 288 units are 300,000 tokens, the point at which Gas City has called a
// hand-off since 24 September. The first two bars are the first two steps, the last two the
// last two steps, ending at the median end of the count of 24–25 September;
// each bar is the unchanged beginning, read from the cache (muted; the
// start-up content of a 24 September start is its first part in every bar,
// cut off by a notch), and what is new since the step before, processed (the
// accent): that count's median growth per call. Every number is taken from
// the digits of its label, so a rewording keeps the bars honest; the new
// part is drawn at least 2 units wide so that it shows (1,500 tokens are
// 1.44 units).
function session(t, id, figureId) {
  const height = 308;
  const rows = [
    { key: "start", y: 64 },
    { key: "reorient", y: 98, finding: true },
    { key: "outward", y: 144, glow: true },
    { key: "work", y: 178 },
    { key: "advised", y: 212, wait: true },
    { key: "called", y: 246, wait: true },
  ];
  const life = [`<line x1="24" y1="60" x2="24" y2="242" class="fig-hair"/>`];
  for (const row of rows) {
    const r = t.rows[row.key];
    life.push(dot(row.y - 4, row.glow));
    life.push(text(40, row.y, fit(`${id}.rows.${row.key}.label`, r.label, 220, "label"), `fig-label${row.wait ? " fig-wait" : row.glow ? " fig-ok" : ""}`));
    life.push(text(40, row.y + 13, fit(`${id}.rows.${row.key}.note`, r.note, 250), "fig-note"));
    if (row.finding) life.push(text(40, row.y + 26, fit(`${id}.rows.${row.key}.finding`, r.finding, 250), "fig-note fig-wait"));
  }
  life.push(`<line x1="16" y1="266" x2="${WIDTH - 16}" y2="266" class="fig-hair"/>`);
  life.push(footer(id, `${id}.next`, t.next, 286));
  life.push(text(40, 299, fit(`${id}.nextNote`, t.nextNote, 250), "fig-note"));

  const scale = count(`${id}.axisEnd`, t.axisEnd);
  const startup = count(`${id}.startup`, t.startup);
  const growth = count(`${id}.first`, t.first);
  const end = count(`${id}.end`, t.end);
  if (count(`${id}.second`, t.second) !== growth || !(startup + 2 * growth < end - growth && end <= scale)) {
    throw new Error(`Figure "${id}": the start-up content, the growth per step and the end must fit the scale in that order ("${t.startup}", "${t.first}", "${t.end}", "${t.axisEnd}")`);
  }
  const x = (tokens) => 16 + (288 * tokens) / scale;
  const notch = x(startup);
  const SLIVER = 2; // the new part's least width
  const bars = [
    `<path d="M16 64V60H${round(notch)}V64" class="fig-hair"/>`,
    text(16, 55, fit(`${id}.startup`, t.startup, 288), "fig-note"),
  ];
  // One bar per step shown: the start-up content up to the notch, the rest of
  // the unchanged beginning, and the new part at the end.
  const step = (y, tokens) => {
    const tip = x(tokens);
    const fresh = Math.min(x(tokens - growth), tip - SLIVER);
    bars.push(`<rect x="16" y="${y}" width="${round(notch - 16.5)}" height="12" rx="2" class="fig-bar-muted"/>`);
    if (fresh > notch + 0.5) bars.push(`<rect x="${round(notch + 0.5)}" y="${y}" width="${round(fresh - notch - 0.5)}" height="12" rx="2" class="fig-bar-muted"/>`);
    bars.push(`<rect x="${round(fresh)}" y="${y}" width="${round(tip - fresh)}" height="12" rx="1" class="fig-cell"/>`);
    return tip;
  };
  const labelAt = x(startup + 2 * growth) + 8;
  step(68, startup + growth);
  bars.push(text(labelAt, 78, fit(`${id}.first`, t.first, WIDTH - 16 - labelAt), "fig-note"));
  step(86, startup + 2 * growth);
  bars.push(text(labelAt, 96, fit(`${id}.second`, t.second, WIDTH - 16 - labelAt), "fig-note"));
  bars.push(text(16, 116, fit(`${id}.between`, t.between, 288), "fig-note"));
  step(142, end - growth);
  const tip = step(160, end);
  bars.push(text(tip, 134, fit(`${id}.end`, t.end, tip - 16), "fig-note", "end"));
  // The scale: the track from 0 to the panel's width in tokens.
  bars.push(`<path d="M16 180V186H${WIDTH - 16}V180" class="fig-hair"/>`);
  bars.push(text(16, 199, fit(`${id}.axisStart`, t.axisStart, 60), "fig-note"));
  bars.push(text(WIDTH - 16, 199, fit(`${id}.axisEnd`, t.axisEnd, 220), "fig-note", "end"));
  const legendY = 226;
  bars.push(`<rect x="16" y="${legendY - 9}" width="10" height="10" rx="2" class="fig-cell"/>`);
  bars.push(text(32, legendY, fit(`${id}.legendNew`, t.legendNew, 272), "fig-note"));
  bars.push(`<rect x="16" y="${legendY + 7}" width="10" height="10" rx="2" class="fig-bar-muted"/>`);
  bars.push(text(32, legendY + 16, fit(`${id}.legendCached`, t.legendCached, 272), "fig-note"));
  bars.push(`<line x1="16" y1="266" x2="${WIDTH - 16}" y2="266" class="fig-hair"/>`);
  bars.push(footer(id, `${id}.cost`, t.cost, 286));
  bars.push(text(40, 299, fit(`${id}.costNote`, t.costNote, 250), "fig-note"));

  return {
    caption: t.caption,
    panels: [
      { title: t.panels.life.title, head: t.panels.life.head, height, body: life.join("") },
      {
        title: t.panels.steps.title,
        head: t.panels.steps.head,
        headRight: { value: fit(`${id}.panels.steps.scale`, t.panels.steps.scale, 84, "head"), cls: "" },
        height,
        body: bars.join(""),
      },
    ],
  };
}

// (18) Problem 4 as a sequence — one panel. Above: the task database and the
// two places that name where it goes, the sync setting (to the private
// repository, green) and the database's own remote (still the public one,
// orange, with the timed push). Below: what happened, down a line, the
// failed push in orange and the repointed remote with the check; beneath,
// the article's rule for old facts.
function sync(t, id, figureId) {
  const pid = `${figureId}-p1`;
  const parts = [text(16, 60, fit(`${id}.database`, t.database, 288, "label"), "fig-label")];
  parts.push(`<path d="M24 66V108M24 84H32M24 108H32" class="fig-hair"/>`);
  const branch = (y, key, target, cls) =>
    [
      text(40, y + 4, fit(`${id}.${key}`, t[key], 108), "fig-note"),
      arrow(pid, 152, y, 168, y),
      text(174, y + 4, fit(`${id}.${target}`, t[target], 130, "small"), `fig-label fig-small ${cls}`),
    ].join("");
  parts.push(branch(84, "setting", "private", "fig-ok"));
  parts.push(branch(108, "remote", "public", "fig-wait"));
  parts.push(text(40, 126, fit(`${id}.unchanged`, t.unchanged, 264), "fig-note"));
  parts.push(`<line x1="16" y1="140" x2="${WIDTH - 16}" y2="140" class="fig-hair"/>`);
  const rows = [
    { key: "set", y: 162 },
    { key: "failed", y: 196, wait: true },
    { key: "recheck", y: 242 },
    { key: "repointed", y: 288, done: true },
  ];
  parts.push(`<line x1="24" y1="158" x2="24" y2="284" class="fig-hair"/>`);
  for (const row of rows) {
    const r = t.rows[row.key];
    parts.push(dot(row.y - 4));
    parts.push(text(40, row.y, fit(`${id}.rows.${row.key}.label`, r.label, 220, "label"), `fig-label${row.wait ? " fig-wait" : ""}`));
    parts.push(text(40, row.y + 13, fit(`${id}.rows.${row.key}.note`, r.note, 250), "fig-note"));
    if (r.note2) parts.push(text(40, row.y + 25, fit(`${id}.rows.${row.key}.note2`, r.note2, 250), "fig-note"));
    if (row.done) parts.push(check(WIDTH - 22, row.y - 4));
  }
  parts.push(`<line x1="16" y1="316" x2="${WIDTH - 16}" y2="316" class="fig-hair"/>`);
  parts.push(text(16, 334, fit(`${id}.trust`, t.trust, 288), "fig-note"));
  parts.push(text(16, 347, fit(`${id}.trustNote`, t.trustNote, 288), "fig-note"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 360, body: parts.join("") }] };
}

// (19) The hand-off points against the window — one panel, to scale: a
// track per period is the model's window of 1,000,000 tokens (Configuration).
// Until 23 September Gas City took the window to be 200,000 tokens (the
// muted part) and called hand-offs at about 160,000, 16% (problem 5); on 23
// September a hand-off was advised at 20% and called at 25%, and since 24
// September at 25% and 30% (Changes). The accent sliver is the start-up
// content of a 24 September start, 46,290 tokens (the configuration
// table); the ticks are orange for advised, the text colour for called.
// Beneath, the trade-off the open questions name.
function handoffs(t, id, figureId) {
  const WINDOW = 1_000_000;
  const STARTUP = 46_290;
  const x = (share) => round(16 + 288 * share);
  const track = (y) => `<rect x="16" y="${y}" width="288" height="12" rx="2" class="fig-node"/>`;
  const tick = (share, y, cls) => `<rect x="${round(x(share) - 1)}" y="${y - 4}" width="2" height="20" class="${cls}"/>`;
  const label = (key, y) => text(16, y, fit(`${id}.rows.${key}.label`, t.rows[key].label, 288, "label"), "fig-label");
  const note = (key, field, y) => text(16, y, fit(`${id}.rows.${key}.${field}`, t.rows[key][field], 288), "fig-note");
  const parts = [
    label("before", 60),
    track(68),
    `<rect x="16" y="68" width="${round(x(200_000 / WINDOW) - 16)}" height="12" rx="2" class="fig-bar-muted"/>`,
    tick(0.16, 68, "fig-tick"),
    note("before", "window", 96),
    note("before", "called", 109),
    label("first", 134),
    track(142),
    tick(0.2, 142, "fig-gate"),
    tick(0.25, 142, "fig-tick"),
    note("first", "points", 170),
    label("since", 194),
    track(202),
    `<rect x="16" y="202" width="${round(x(STARTUP / WINDOW) - 16)}" height="12" rx="2" class="fig-cell"/>`,
    tick(0.25, 202, "fig-gate"),
    tick(0.3, 202, "fig-tick"),
    note("since", "points", 230),
  ];
  const legend = [
    ["fig-gate", "legendAdvised"],
    ["fig-tick", "legendCalled"],
  ];
  legend.forEach(([cls, key], i) => {
    const y = 254 + i * 16;
    parts.push(`<rect x="20" y="${y - 9}" width="2" height="12" class="${cls}"/>`);
    parts.push(text(32, y, fit(`${id}.${key}`, t[key], 272), "fig-note"));
  });
  parts.push(`<rect x="16" y="277" width="10" height="10" rx="2" class="fig-cell"/>`);
  parts.push(text(32, 286, fit(`${id}.legendStartup`, t.legendStartup, 272), "fig-note"));
  parts.push(`<line x1="16" y1="300" x2="${WIDTH - 16}" y2="300" class="fig-hair"/>`);
  parts.push(text(16, 318, fit(`${id}.later`, t.later, 288), "fig-note"));
  parts.push(text(16, 331, fit(`${id}.laterNote`, t.laterNote, 288), "fig-note"));
  return { caption: t.caption, panels: [{ title: t.title, head: t.head, height: 344, body: parts.join("") }] };
}

// (20) The two counts side by side (founder's go 2026-09-25, si-pvns) — wide,
// two panels of two measures each; every measure has a bar per count, the
// count of 22–23 September muted, the count of 24–25 September in the text
// colour, each measure drawn to its own scale (its larger value fills the
// track) and every length taken from the digits of its value label. Panel 1:
// all tokens processed and the tokens per call after the first outward
// action, marked in the accent: the same tokens overall with a third more
// calls after the first outward action. Panel 2: the share of tokens
// processed before the first outward action and the sessions, with why the
// share fell. The caption names what changed at once between the counts.
function counts(t, id, figureId) {
  const height = 258;
  const TRACK = { x: 80, w: 130 };
  const measure = (key, top) => {
    const m = t.measures[key];
    const values = ["second", "third"].map((c) => count(`${id}.measures.${key}.${c}`, m[c]));
    const max = Math.max(...values);
    const parts = [
      text(16, top, fit(`${id}.measures.${key}.label`, m.label, 288, "small"), "fig-label fig-small"),
      text(16, top + 13, fit(`${id}.measures.${key}.note`, m.note, 288), "fig-note"),
    ];
    ["second", "third"].forEach((c, i) => {
      const y = top + 22 + i * 16;
      const width = (TRACK.w * values[i]) / max;
      parts.push(text(16, y + 8.5, fit(`${id}.counts.${c}`, t.counts[c], TRACK.x - 20), "fig-note"));
      parts.push(`<rect x="${TRACK.x}" y="${y}" width="${round(width)}" height="10" rx="2" class="${c === "second" ? "fig-bar-muted" : "fig-bar"}"/>`);
      const at = TRACK.x + width + 6;
      parts.push(text(at, y + 8.5, fit(`${id}.measures.${key}.${c}`, m[c], WIDTH - 16 - (TRACK.x + TRACK.w + 6), "small"), "fig-label fig-small fig-strong"));
    });
    return parts.join("");
  };
  const lines = (key, rows, cls) =>
    rows.map((row, i) => text(40, 218 + i * 13, fit(`${id}.${key}.${row}`, t[key][row], 264), cls)).join("");
  const tokens = [
    measure("all", 58),
    `<line x1="16" y1="118" x2="${WIDTH - 16}" y2="118" class="fig-hair"/>`,
    measure("perCall", 138),
    `<line x1="16" y1="198" x2="${WIDTH - 16}" y2="198" class="fig-hair"/>`,
    dot(214, true),
    lines("same", ["a", "b", "c"], "fig-note fig-ok"),
  ];
  const reorientation = [
    measure("share", 58),
    `<line x1="16" y1="118" x2="${WIDTH - 16}" y2="118" class="fig-hair"/>`,
    measure("sessions", 138),
    `<line x1="16" y1="198" x2="${WIDTH - 16}" y2="198" class="fig-hair"/>`,
    dot(214),
    lines("fewer", ["a", "b"], "fig-note"),
  ];
  return {
    caption: t.caption,
    panels: [
      { title: t.panels.tokens.title, head: t.panels.tokens.head, height, body: tokens.join("") },
      { title: t.panels.reorientation.title, head: t.panels.reorientation.head, height, body: reorientation.join("") },
    ],
  };
}

// The four figures of the Gaimer article (founder feedback 2026-09-25,
// si-syhr: the draft read as a wall of text): its pull requests on one time
// scale, the Claude call before and after the cleanup, a game's life in the
// app and what the new system prompt cost. Each element is traceable to the
// pull requests or to the code on Gaimer's main branch; times are UTC, as
// GitHub gives them, and what the run of the four games recorded is told in
// the past tense.

// The 41 pull requests the factory merged into Gaimer (gh pr list --repo
// addable-labs/gaimer --state merged: #11–#46 and #48–#52), each with its
// merge time and the part of the article that tells what it changed. #32,
// which let the game page's style and Tauri's IPC through the window's
// Content Security Policy, is under security, the part about that policy;
// "other" holds the six the article does not tell: the choice of a model
// (#14, #25, #38, #41), a game kept running when the window changes size
// (#26) and the focus after sending (#48).
const GAIMER_MERGES = [
  [11, "2026-09-24T17:56:58Z", "saving"],
  [12, "2026-09-24T18:13:29Z", "cleanup"],
  [13, "2026-09-24T18:39:28Z", "cleanup"],
  [14, "2026-09-24T19:07:37Z", "other"],
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
  [25, "2026-09-25T00:29:02Z", "other"],
  [26, "2026-09-25T00:51:45Z", "other"],
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
  [38, "2026-09-25T06:04:59Z", "other"],
  [39, "2026-09-25T06:43:42Z", "fix"],
  [40, "2026-09-25T11:59:29Z", "prompt"],
  [41, "2026-09-25T07:38:04Z", "other"],
  [42, "2026-09-25T07:52:30Z", "cleanup"],
  [43, "2026-09-25T08:20:04Z", "errors"],
  [44, "2026-09-25T08:55:03Z", "errors"],
  [45, "2026-09-25T09:19:22Z", "errors"],
  [46, "2026-09-25T09:48:09Z", "tests"],
  [48, "2026-09-25T10:32:38Z", "other"],
  [49, "2026-09-25T12:57:25Z", "fix"],
  [50, "2026-09-25T14:08:16Z", "change"],
  [51, "2026-09-25T14:32:39Z", "claude"],
  [52, "2026-09-25T15:12:27Z", "change"],
];

/** The parts of the Gaimer article that tell what its pull requests changed, in its order, and "other". */
const GAIMER_AREAS = ["saving", "errors", "claude", "security", "cleanup", "tests", "prompt", "fix", "change", "other"];

// (21) The work at a glance — wide, one panel on one time scale from 17:00
// UTC on 24 September to 16:00 on 25 September: a row per part of the
// article, each pull request a mark at its merge time, each row's count at
// its end and midnight marked in every row; a mark is line art, so it takes
// the accent's text colour, which holds its contrast in both themes. The
// counts, the total in the head and the list in the panel's accessible name
// all come from the list above, so a pull request moved to another part
// moves everywhere at once; the six the article does not tell are the muted
// row.
function merges(t, id, figureId) {
  const unknown = GAIMER_MERGES.find(([, , area]) => !GAIMER_AREAS.includes(area));
  if (unknown) throw new Error(`Figure "${id}": pull request #${unknown[0]} is in no part of the article ("${unknown[2]}")`);
  const total = count(`${id}.head`, t.head);
  if (total !== GAIMER_MERGES.length) throw new Error(`Figure label "${id}.head" counts ${total} pull requests, the list ${GAIMER_MERGES.length} ("${t.head}")`);
  const START = Date.parse("2026-09-24T17:00:00Z");
  const x = (at) => 16 + (288 * (Date.parse(at) - START)) / (23 * 3_600_000);
  const midnight = x("2026-09-25T00:00:00Z");
  const TOP = 60;
  const PITCH = 30;
  const listed = [];
  const parts = [];
  GAIMER_AREAS.forEach((area, i) => {
    const y = TOP + i * PITCH;
    const merged = GAIMER_MERGES.filter((pr) => pr[2] === area);
    const muted = area === "other" ? " fig-muted" : "";
    listed.push(`${t.areas[area]} (${merged.length})`);
    // The label runs up to 8 units short of the count at the row's end.
    const slot = WIDTH - 32 - String(merged.length).length * ADVANCE.small - 8;
    parts.push(text(16, y, fit(`${id}.areas.${area}`, t.areas[area], slot, "small"), `fig-label fig-small${muted}`));
    parts.push(text(WIDTH - 16, y, String(merged.length), `fig-label fig-small fig-strong${muted}`, "end"));
    parts.push(`<line x1="16" y1="${y + 9}" x2="${WIDTH - 16}" y2="${y + 9}" class="fig-hair"/>`);
    parts.push(`<line x1="${round(midnight)}" y1="${y + 2}" x2="${round(midnight)}" y2="${y + 16}" class="fig-line fig-dashed"/>`);
    for (const [, at] of merged) {
      parts.push(`<rect x="${round(x(at) - 1)}" y="${y + 4}" width="2" height="10" rx="1" class="${muted ? "fig-bar-muted" : "fig-ok"}"/>`);
    }
  });
  // The scale: an hour mark every six hours, and the two days under it.
  const axis = TOP + (GAIMER_AREAS.length - 1) * PITCH + 22;
  parts.push(`<line x1="16" y1="${axis}" x2="${WIDTH - 16}" y2="${axis}" class="fig-hair"/>`);
  for (const at of ["2026-09-24T18:00:00Z", "2026-09-25T00:00:00Z", "2026-09-25T06:00:00Z", "2026-09-25T12:00:00Z"]) {
    parts.push(`<line x1="${round(x(at))}" y1="${axis}" x2="${round(x(at))}" y2="${axis + 4}" class="fig-hair"/>`);
    parts.push(text(x(at), axis + 16, at.slice(11, 16), "fig-note", "middle"));
  }
  parts.push(text(16, axis + 31, fit(`${id}.days.first`, t.days.first, midnight - 24), "fig-note"));
  parts.push(text(midnight + 4, axis + 31, fit(`${id}.days.second`, t.days.second, WIDTH - 20 - midnight), "fig-note"));
  return {
    caption: t.caption,
    panels: [
      {
        title: `${t.title}: ${listed.join("; ")}`,
        head: t.head,
        headRight: { value: fit(`${id}.window`, t.window, 104, "head"), cls: "" },
        height: axis + 42,
        body: parts.join(""),
      },
    ],
  };
}

// (22) The Claude call for a game, before and after the cleanup — one panel
// in two columns, set against each other as the critic figure sets a run
// against what you want: before (orange), Gaimer's prompt pasted into a
// whole Claude Code session with Claude Code's own system prompt and
// built-in tools, the user's own setup taking part and a transcript saved
// (the provider at 7cef601; #18, #19); after (green), one plain completion
// (src/providers/anthropic-provider.js on main). The last two rows are how
// the app runs the call: the login shells when the user picks Claude (#35)
// and the time limit (#22, #37, #51). A row's label spans the panel and its
// two values sit under it, with a second line where a row needs one.
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

// (23) A game's life in the app — wide, two panels, each down a line of
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
// the new version runs and can go back once too; Undo change goes back one
// version and New game closes the game. A question is the orange diamond
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

// (24) What the new system prompt cost, as the run of the four games
// recorded it (the article's numbers, and #51's table) — wide, two panels.
// The calls: each call's time as a bar on one scale, the prompt from before
// muted and the one from after in the accent, with its output tokens and
// the game's lines of code; the dashed marks are the app's limit at the
// time, 300 seconds, which the Tetris from after ran past on its first
// call. The games: what each of the four has, the four things the new
// prompt asks for (#40) — a start screen, a best score, sound, and mouse
// and touch; the two from before take touch but not the mouse. Every bar
// and the limit come from the digits of their labels, so a rewording keeps
// them honest; the first panel's accessible name is built from the same
// labels.
function price(t, id, figureId) {
  const height = 284;
  const games = ["tetris", "pong"];
  const sides = ["before", "after"];
  const TRACK = { x: 64, w: 180 };
  const seconds = (game, side) => count(`${id}.rows.${game}.${side}.time`, t.rows[game][side].time);
  const longest = Math.max(...games.flatMap((game) => sides.map((side) => seconds(game, side))));
  const limit = count(`${id}.limit`, t.limit);
  const x = (s) => TRACK.x + (TRACK.w * s) / longest;
  const calls = [text(x(limit), 58, fit(`${id}.limit`, t.limit, 170), "fig-note", "middle")];
  const named = [];
  games.forEach((game, g) => {
    const top = 58 + g * 88;
    calls.push(text(16, top, fit(`${id}.games.${game}`, t.games[game], 48, "label"), "fig-label"));
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
  calls.push(`<line x1="16" y1="236" x2="${WIDTH - 16}" y2="236" class="fig-hair"/>`);
  calls.push(text(16, 254, fit(`${id}.thinking`, t.thinking, 288), "fig-note"));
  calls.push(text(16, 267, fit(`${id}.scope`, t.scope, 288), "fig-note"));

  // Panel 2 — a column per game and prompt, a row per thing asked for.
  const COLUMNS = [
    ["tetris", "before", 164],
    ["tetris", "after", 204],
    ["pong", "before", 248],
    ["pong", "after", 288],
  ];
  const has = [];
  for (const game of games) {
    const [first, second] = COLUMNS.filter(([g]) => g === game).map(([, , cx]) => cx);
    has.push(text((first + second) / 2, 60, fit(`${id}.games.${game}`, t.games[game], second - first + 40, "small"), "fig-label fig-small", "middle"));
  }
  for (const [, side, cx] of COLUMNS) has.push(text(cx, 76, fit(`${id}.${side}`, t[side], 40), "fig-note", "middle"));
  has.push(`<line x1="16" y1="86" x2="${WIDTH - 16}" y2="86" class="fig-hair"/>`);
  ["start", "best", "sound", "pointer"].forEach((key, i) => {
    const y = 112 + i * 30;
    has.push(text(16, y, fit(`${id}.features.${key}`, t.features[key], 128, "small"), "fig-label fig-small"));
    for (const [, side, cx] of COLUMNS) {
      if (side === "after") has.push(check(cx, y - 4));
      else if (key === "pointer") has.push(text(cx, y, fit(`${id}.touch`, t.touch, 40), "fig-note", "middle"));
      else has.push(`<rect x="${cx - 5}" y="${y - 5}" width="10" height="2" rx="1" class="fig-bar-muted"/>`);
    }
    if (i < 3) has.push(`<line x1="16" y1="${y + 9}" x2="${WIDTH - 16}" y2="${y + 9}" class="fig-hair"/>`);
  });
  has.push(`<line x1="16" y1="236" x2="${WIDTH - 16}" y2="236" class="fig-hair"/>`);
  has.push(footer(id, `${id}.asked`, t.asked, 258));

  return {
    caption: t.caption,
    panels: [
      { title: `${t.panels.calls.title}: ${named.join("; ")}`, head: t.panels.calls.head, height, body: calls.join("") },
      { title: t.panels.games.title, head: t.panels.games.head, height, body: has.join("") },
    ],
  };
}

export const FIGURES = { stages, gates, loop, assessment, team, harness, ledger, timeline, setup, build, words, bilingual, gauntlet, agents, critic, fleet, session, sync, handoffs, counts, merges, connection, lifecycle, price };

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
