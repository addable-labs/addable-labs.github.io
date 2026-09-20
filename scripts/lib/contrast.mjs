// WCAG 2.x colour maths and the tokens.css parser shared by the contrast gate
// (scripts/check/contrast.mjs) and its tests.
//
// Relative luminance and contrast ratio follow WCAG 2.2 "Contrast (Minimum)"
// (success criterion 1.4.3): channels are linearised from sRGB, luminance is
// 0.2126 R + 0.7152 G + 0.0722 B, and the ratio is (L1 + 0.05) / (L2 + 0.05)
// with L1 the lighter of the two colours.

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

/**
 * Read the colour tokens declared in tokens.css.
 *
 * Returns { light, dark }: `light` holds every `--color-*` custom property
 * declared on :root outside a media query; `dark` holds the same names as
 * redeclared inside `@media (prefers-color-scheme: dark)`, falling back to the
 * light value for tokens the dark block does not override.
 */
export function parseTokens(css) {
  const source = stripComments(css);
  const light = {};
  const dark = {};
  const declaration = /(--color-[-\w]+)\s*:\s*([^;}]+)\s*[;}]/g;

  // Split the sheet into the dark media block(s) and everything else. Blocks
  // are matched with a small brace counter so nested rules inside @media work.
  const darkBlocks = [];
  let rest = "";
  let cursor = 0;
  const mediaRe = /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{/g;
  let m;
  while ((m = mediaRe.exec(source)) !== null) {
    rest += source.slice(cursor, m.index);
    let depth = 1;
    let i = mediaRe.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    darkBlocks.push(source.slice(mediaRe.lastIndex, i - 1));
    cursor = i;
    mediaRe.lastIndex = i;
  }
  rest += source.slice(cursor);

  for (const [, name, value] of rest.matchAll(declaration)) {
    light[name] = value.trim();
  }
  for (const block of darkBlocks) {
    for (const [, name, value] of block.matchAll(declaration)) {
      dark[name] = value.trim();
    }
  }
  for (const name of Object.keys(light)) {
    if (!(name in dark)) dark[name] = light[name];
  }
  return { light, dark };
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
  const source = stripComments(css);
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
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({ line, property, value: rawValue.trim(), literal });
    }
  }
  return findings;
}
