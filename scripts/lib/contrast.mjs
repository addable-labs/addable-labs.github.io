// WCAG 2.x colour maths and the tokens.css parser shared by the contrast gate
// (scripts/check/contrast.mjs) and its tests.
//
// Relative luminance and contrast ratio follow WCAG 2.2 "Contrast (Minimum)"
// (success criterion 1.4.3): channels are linearised from sRGB, luminance is
// 0.2126 R + 0.7152 G + 0.0722 B, and the ratio is (L1 + 0.05) / (L2 + 0.05)
// with L1 the lighter of the two colours.
//
// tokens.css structure (redesign plan D-03, D-13; REQ-006, REQ-024 as amended
// by A-03): every colour token lives on `:root` as a plain declaration equal
// to its dark value immediately followed by a `light-dark(<light>, <dark>)`
// declaration; `color-scheme` is the only switch (dark on `:root`, light only
// under `:root[data-theme="light"]`); there is no `prefers-color-scheme`
// media query and no `--color-*` outside `:root`. The parser below reads that
// structure, still reads the first build's structure (light on `:root`, dark
// under `@media (prefers-color-scheme: dark)`) so old fixtures parse, and
// reports every structural violation for the gate to print.

/** Parse a #rgb, #rgba, #rrggbb or #rrggbbaa literal into [r, g, b] (0–255). */
export function parseHexColor(hex) {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a hex colour: ${hex}`);
  let digits = m[1];
  if (digits.length <= 4) {
    digits = [...digits].map((d) => d + d).join("");
  }
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
}

function linearise(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (0 = black, 1 = white) of a hex colour. */
export function relativeLuminance(hex) {
  const [r, g, b] = parseHexColor(hex).map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Format a ratio the way audits print it, e.g. "15.85:1". */
export function formatRatio(ratio) {
  return `${ratio.toFixed(2)}:1`;
}

/** Remove CSS comments. */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Blank out CSS comments but keep their line breaks, so line numbers stay true. */
function blankComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

const BLOCK_AT_RULES = /^@(media|supports|layer|container|scope|document)\b/i;
const LEGACY_DARK_MEDIA = /^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/i;
const LIGHT_SWITCH_SELECTOR = /^:root\[data-theme\s*=\s*["']?light["']?\]$/i;
const COLOR_DECLARATION = /(--color-[-\w]+)\s*:\s*([^;]+)/g;

/** Collapse whitespace in a selector or at-rule prelude. */
function normaliseSelector(text) {
  return text.replace(/\s+/g, " ").trim();
}

/** Line number (1-based) of an offset in the source text. */
function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

/**
 * Walk every style rule in a (comment-free) stylesheet, recursing into block
 * at-rules such as @media and @supports. `visit` receives
 * { selector, body, ancestors }: the normalised selector, the raw declaration
 * block and the enclosing at-rule preludes (outermost first). Braces are
 * matched with a small counter so nested blocks work; strings containing
 * braces are not expected here.
 */
function walkRules(css, visit, ancestors = []) {
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    let prelude = css.slice(i, open);
    const statement = prelude.lastIndexOf(";"); // drop `@import …;`-style statements
    if (statement !== -1) prelude = prelude.slice(statement + 1);
    prelude = normaliseSelector(prelude);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    const body = css.slice(open + 1, Math.max(open + 1, j - 1));
    if (BLOCK_AT_RULES.test(prelude)) {
      walkRules(body, visit, [...ancestors, prelude]);
    } else {
      visit({ selector: prelude, body, ancestors });
    }
    i = j;
  }
}

/** Split a value at top-level separators (commas inside rgba() are kept). */
function splitTopLevel(value, separator = ",") {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim());
}

/**
 * Read a `light-dark(<light>, <dark>)` value into { light, dark }, or null
 * when the value is not a light-dark() call.
 */
export function parseLightDark(value) {
  const m = /^light-dark\s*\(([\s\S]*)\)$/i.exec(value.trim());
  if (!m) return null;
  const parts = splitTopLevel(m[1]);
  if (parts.length !== 2 || parts.some((part) => part === "")) {
    throw new Error(`light-dark() takes exactly two colours: ${value.trim()}`);
  }
  return { light: parts[0], dark: parts[1] };
}

/** Compare two colour values ignoring case and whitespace ("rgba(1, 2, 3, .5)" = "rgba(1,2,3,.5)"). */
function sameValue(a, b) {
  return a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
}

/**
 * Read the colour tokens declared in tokens.css.
 *
 * Returns { light, dark, problems }. For every `--color-*` on `:root` the last
 * declaration wins: a `light-dark(L, D)` value yields light[name] = L and
 * dark[name] = D, a plain value yields both. `problems` lists, in source
 * order, every structural violation the parser can see (REQ-006 and REQ-024
 * as amended by A-03; plan D-03):
 *
 *   - a plain declaration that precedes a `light-dark()` one for the same
 *     token must equal its dark value (the fallback set for browsers without
 *     light-dark() is the dark set — the equality check);
 *   - a `light-dark()` token must have that plain fallback at all, and no
 *     plain declaration may follow the pair (it would override both themes);
 *   - `--color-*` may be declared only on `:root` (not under the light
 *     switch, not in any other selector or block), so nothing can fork the
 *     two themes.
 *
 * The first build's structure — light values on `:root`, the dark set
 * re-declared inside `@media (prefers-color-scheme: dark)` — still parses:
 * the media block's values fill `dark`. The gate rejects that media query
 * separately (auditTokens), so old fixtures parse but do not pass.
 */
export function parseTokens(css) {
  const source = stripComments(css);
  const light = {};
  const dark = {};
  const problems = [];
  const fallbacks = {}; // plain value seen before a light-dark() one, per token
  const pairs = new Set(); // tokens whose last declaration is a light-dark() pair
  const legacyDark = {};

  walkRules(source, ({ selector, body, ancestors }) => {
    const declarations = [...body.matchAll(COLOR_DECLARATION)];
    if (declarations.length === 0) return;
    const onRoot = selector === ":root" && ancestors.length === 0;
    const inLegacyDark = selector === ":root" && ancestors.length === 1 && LEGACY_DARK_MEDIA.test(ancestors[0]);
    for (const [, name, rawValue] of declarations) {
      const value = rawValue.trim();
      if (inLegacyDark) {
        legacyDark[name] = value;
        continue;
      }
      if (!onRoot) {
        const where = [...ancestors, selector].join(" > ");
        problems.push(`${name} is declared outside :root (in "${where}"); colour tokens live only on :root (REQ-024, A-03)`);
        continue;
      }
      const pair = parseLightDark(value);
      if (pair) {
        if (!(name in fallbacks)) {
          problems.push(`${name}: light-dark() declaration has no plain fallback before it; browsers without light-dark() would lose the token (D-03)`);
        } else if (!sameValue(fallbacks[name], pair.dark)) {
          problems.push(`${name}: plain fallback ${fallbacks[name]} does not equal its dark value ${pair.dark} (REQ-006, A-03)`);
        }
        light[name] = pair.light;
        dark[name] = pair.dark;
        pairs.add(name);
      } else {
        if (pairs.has(name)) {
          problems.push(`${name}: plain declaration ${value} follows the light-dark() pair and overrides both themes; the fallback must precede the pair (D-03)`);
          pairs.delete(name);
        }
        light[name] = value;
        dark[name] = value;
        fallbacks[name] = value;
      }
    }
  });

  for (const [name, value] of Object.entries(legacyDark)) {
    dark[name] = value;
    if (!(name in light)) light[name] = value;
  }
  return { light, dark, problems };
}

/**
 * The two switch rules the structure relies on (plan D-03, D-13):
 * `:root { color-scheme: dark }` (dark is the default for every first visit)
 * and `:root[data-theme="light"] { color-scheme: light }` (the toggle's only
 * entry point to the light set). Returns one problem per missing rule.
 */
export function checkSwitchRules(css) {
  const source = stripComments(css);
  let rootScheme = null;
  let lightScheme = null;
  const schemeOf = (body) => {
    let found = null;
    for (const [, value] of body.matchAll(/(?:^|[;\s])color-scheme\s*:\s*([^;]+)/g)) found = value.trim();
    return found;
  };
  walkRules(source, ({ selector, body, ancestors }) => {
    if (ancestors.length > 0) return;
    const scheme = schemeOf(body);
    if (scheme === null) return;
    if (selector === ":root") rootScheme = scheme;
    else if (LIGHT_SWITCH_SELECTOR.test(selector)) lightScheme = scheme;
  });
  const problems = [];
  if (rootScheme !== "dark") {
    problems.push(`missing switch rule :root { color-scheme: dark } (found ${rootScheme === null ? "none" : `color-scheme: ${rootScheme}`}); dark must be the default for every first visit (D-13, REQ-006)`);
  }
  if (lightScheme !== "light") {
    problems.push(`missing switch rule :root[data-theme="light"] { color-scheme: light } (found ${lightScheme === null ? "none" : `color-scheme: ${lightScheme}`}); the toggle is the only entry point to the light set (A-03, REQ-006)`);
  }
  return problems;
}

/**
 * Every `@media` query mentioning `prefers-color-scheme`, with its line
 * number. tokens.css may contain none (plan D-13, A-03): the light set has
 * one entry point, the toggle, so the stylesheet and the script cannot
 * disagree.
 */
export function findSchemeMediaQueries(css) {
  const source = blankComments(css);
  const found = [];
  for (const match of source.matchAll(/@media[^{;]*prefers-color-scheme[^{;]*(?=\{)/g)) {
    found.push({ line: lineAt(source, match.index), query: normaliseSelector(match[0]) });
  }
  return found;
}

/**
 * Everything the gate needs from tokens.css in one call: the two token sets
 * and every structural problem — parser problems (fallback equality, tokens
 * outside :root), missing switch rules and prefers-color-scheme media queries.
 */
export function auditTokens(css) {
  const parsed = parseTokens(css);
  const problems = [
    ...parsed.problems,
    ...checkSwitchRules(css),
    ...findSchemeMediaQueries(css).map(
      ({ line, query }) => `line ${line}: "${query}" — tokens.css may not contain a prefers-color-scheme media query; dark is the default and light is reached only through the toggle (D-13, A-03)`,
    ),
  ];
  return { light: parsed.light, dark: parsed.dark, problems };
}

// The 148 named colours of CSS Color Level 4. `transparent` and `currentcolor`
// are keywords, not colours, and are allowed outside tokens.css.
export const NAMED_COLORS = [
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque",
  "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
  "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
  "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray",
  "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen",
  "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
  "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
  "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
  "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
  "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey",
  "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
  "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
  "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
  "lightpink", "lightsalmon", "lightseagreen", "lightskyblue",
  "lightslategray", "lightslategrey", "lightsteelblue", "lightyellow", "lime",
  "limegreen", "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
  "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
  "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
  "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace",
  "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
  "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red",
  "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen",
  "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
  "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle",
  "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
  "yellowgreen",
];

const namedColorRe = new RegExp(`\\b(${NAMED_COLORS.join("|")})\\b`, "i");
const functionalRe = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\s*\(/i;
const hexRe = /#[0-9a-f]{3,8}\b/i;

/**
 * Find colour literals in a stylesheet that is not tokens.css.
 *
 * Only declaration values are inspected (selectors and property names are
 * skipped, so `white-space: nowrap` is fine). Quoted strings, url() and var()
 * references are removed from each value before matching. Returns one entry
 * per offending declaration: { line, property, value, literal }.
 */
export function findColorLiterals(css) {
  const source = blankComments(css);
  const findings = [];
  const declaration = /([-\w]+)\s*:\s*([^;{}]*)(?=[;}])/g;
  for (const match of source.matchAll(declaration)) {
    const [, property, rawValue] = match;
    const value = rawValue
      .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
      .replace(/\burl\([^)]*\)/gi, "url()")
      .replace(/\bvar\([^)]*\)/gi, "var()");
    const literal =
      hexRe.exec(value)?.[0] ?? functionalRe.exec(value)?.[0] ?? namedColorRe.exec(value)?.[0];
    if (literal) {
      const line = lineAt(source, match.index);
      findings.push({ line, property, value: rawValue.trim(), literal });
    }
  }
  return findings;
}
