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

// The figures — six from si-55iu, four for the factory article from
// si-hct0 (from (7) on), one more for each of the two earlier articles from
// si-ubr3 ((11) and (12)). Each takes the figure's strings, its id (for the error
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

export const FIGURES = { stages, gates, loop, assessment, team, harness, ledger, timeline, setup, build, words, bilingual };

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
