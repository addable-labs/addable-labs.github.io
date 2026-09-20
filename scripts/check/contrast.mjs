#!/usr/bin/env node
// Gate: contrast (REQ-006, REQ-024 as amended by A-03; AC-06, AC-25; plan
// D-03, D-13; first build: REQ-014, AC-05, AC-17, plan review PR-03).
//
// 1. Audits the structure of src/assets/css/tokens.css (scripts/lib/contrast.mjs
//    auditTokens): dark on :root and light only through the toggle's switch
//    rule, every plain fallback equal to its dark value, no prefers-color-scheme
//    media query, no --color-* outside :root.
// 2. Evaluates an explicit list of foreground/background token pairs in both
//    colour schemes. Text pairs must reach 4.5:1 and UI pairs 3:1 (WCAG 2.2
//    AA). Every pair is printed with its ratio; a pair may be restricted to
//    one scheme. Every colour token must be either in PAIRS or listed in
//    DECORATIVE (printed as a skip line), so a new colour cannot go unchecked.
// 3. Fails if any CSS file under src/ other than tokens.css contains a colour
//    literal (#hex, rgb(), hsl(), color-mix(), named colours, …), so every colour
//    on every page is one of the checked tokens.
//
// Exit status 0 when everything passes, 1 otherwise. No network, no browser.
// Optional arguments: <built-site dir> [<source dir>] (only the source dir is used).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { auditTokens, contrastRatio, findColorLiterals, formatRatio } from "../lib/contrast.mjs";
import { ROOT, resolveDirs } from "../lib/site.mjs";

// Optional arguments follow the other gates: <built-site dir> [<source dir>];
// this gate reads only the source stylesheets.
const CSS_DIR = resolveDirs().src;
const TOKENS_FILE = path.join(CSS_DIR, "assets", "css", "tokens.css");

const THRESHOLDS = { text: 4.5, ui: 3 };
const SCHEMES = ["light", "dark"];

// Foreground on background: the plan's pair table (Design system: tokens).
// `text` pairs carry body, link, label or button text (SC 1.4.3, ≥ 4.5:1);
// `ui` pairs are borders, chip outlines and the focus ring (SC 1.4.11, ≥ 3:1).
// `schemes` restricts a pair to one theme. REQ-006 / AC-06.
const PAIRS = [
  // Body and secondary text on the page and both surfaces (REQ-006).
  { fg: "--color-text", bg: "--color-bg", kind: "text" },
  { fg: "--color-text", bg: "--color-surface", kind: "text" },
  { fg: "--color-text", bg: "--color-surface-2", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-bg", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-surface", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-surface-2", kind: "text" },
  // Brand text variants: links, eyebrows, "+" marks, status text. On light
  // these are the darkened variants, never the pure hues (REQ-006, AC-06).
  { fg: "--color-accent-text", bg: "--color-bg", kind: "text" },
  { fg: "--color-accent-text", bg: "--color-surface", kind: "text" },
  { fg: "--color-accent-text", bg: "--color-surface-2", kind: "text" },
  { fg: "--color-accent-strong", bg: "--color-bg", kind: "text" },
  { fg: "--color-accent-strong", bg: "--color-surface", kind: "text" },
  { fg: "--color-secondary-text", bg: "--color-bg", kind: "text" },
  { fg: "--color-secondary-text", bg: "--color-surface", kind: "text" },
  { fg: "--color-secondary-text", bg: "--color-surface-2", kind: "text" },
  // Dark text on the brand surfaces: primary button, skip link, orange
  // attention surfaces (REQ-006 "button text on brand surfaces", AC-06).
  { fg: "--color-on-accent", bg: "--color-accent", kind: "text" },
  { fg: "--color-on-accent", bg: "--color-secondary", kind: "text" },
  // Borders and chip outlines against the page and both surfaces (AC-06).
  { fg: "--color-border", bg: "--color-bg", kind: "ui" },
  { fg: "--color-border", bg: "--color-surface", kind: "ui" },
  { fg: "--color-border", bg: "--color-surface-2", kind: "ui" },
  // Focus ring, drawn with outline-offset against the page or a surface (AC-06).
  { fg: "--color-focus", bg: "--color-bg", kind: "ui" },
  { fg: "--color-focus", bg: "--color-surface", kind: "ui" },
  // Primary button edge: on light the green surface has no 3:1 edge against
  // the page, so a 1 px accent-strong border gives the button its boundary;
  // on dark the edge is deliberately the surface colour (plan D-03, Risks).
  { fg: "--color-accent-strong", bg: "--color-accent", kind: "ui", schemes: ["light"] },
];

// Tokens that never carry text or bound an interactive component: section
// hairlines and the hero glow (an alpha colour). They are skipped by name and
// printed as `skip` lines so the omission is visible (REQ-006).
const DECORATIVE = ["--color-hairline", "--color-glow"];

async function listCssFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listCssFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".css")) files.push(full);
  }
  return files.sort();
}

function rel(file) {
  return path.relative(ROOT, file);
}

async function main() {
  let failures = 0;
  const tokensPath = rel(TOKENS_FILE);

  // 1. Structure (D-03, D-13, A-03): one violation per line, then the pairs.
  const tokens = auditTokens(await readFile(TOKENS_FILE, "utf8"));
  for (const problem of tokens.problems) {
    console.log(`${tokensPath}  structure  ${problem}  FAIL`);
    failures += 1;
  }
  if (tokens.problems.length === 0) {
    console.log(
      `${tokensPath}  structure  dark on :root, light only under :root[data-theme="light"], ` +
        "every fallback equals its dark value, no prefers-color-scheme media query, no --color-* outside :root  ok",
    );
  }

  // 2. Pairs, per scheme.
  let evaluations = 0;
  for (const scheme of SCHEMES) {
    const set = tokens[scheme];
    for (const { fg, bg, kind, schemes = SCHEMES } of PAIRS) {
      if (!schemes.includes(scheme)) continue;
      evaluations += 1;
      const label = `${scheme.padEnd(5)}  ${fg.padEnd(23)} on ${bg.padEnd(18)}`;
      if (!(fg in set) || !(bg in set)) {
        const missing = [fg, bg].filter((name) => !(name in set)).join(", ");
        console.log(`${label}  missing token ${missing}  FAIL`);
        failures += 1;
        continue;
      }
      let ratio;
      try {
        ratio = contrastRatio(set[fg], set[bg]);
      } catch (error) {
        console.log(`${label}  ${error.message}  FAIL`);
        failures += 1;
        continue;
      }
      const threshold = THRESHOLDS[kind];
      const ok = ratio >= threshold;
      if (!ok) failures += 1;
      console.log(
        `${label}  ${formatRatio(ratio).padStart(8)}  ${kind.padEnd(4)} ≥ ${threshold}:1  ${ok ? "ok" : "FAIL"}`,
      );
    }
  }

  // Every colour token is either evaluated above or a named decorative skip,
  // so a token added to tokens.css cannot ship unchecked (REQ-006, REQ-024).
  const covered = new Set(PAIRS.flatMap(({ fg, bg }) => [fg, bg]));
  const names = [...new Set([...Object.keys(tokens.light), ...Object.keys(tokens.dark)])];
  for (const name of names) {
    if (covered.has(name)) continue;
    if (DECORATIVE.includes(name)) {
      console.log(`skip   ${name.padEnd(23)} decorative (never text, never the boundary of a control), not evaluated`);
      continue;
    }
    console.log(`${tokensPath}  ${name} is in no PAIRS entry and not listed in DECORATIVE; add the pair it is used in  FAIL`);
    failures += 1;
  }

  // 3. Colour literals only in tokens.css.
  const cssFiles = (await listCssFiles(CSS_DIR)).filter((file) => file !== TOKENS_FILE);
  for (const file of cssFiles) {
    const findings = findColorLiterals(await readFile(file, "utf8"));
    for (const finding of findings) {
      console.log(
        `${rel(file)}:${finding.line}  colour literal "${finding.literal}" in "${finding.property}: ${finding.value}"  FAIL`,
      );
      failures += 1;
    }
  }
  console.log(
    `checked ${PAIRS.length} token pairs (${evaluations} evaluations over ${SCHEMES.length} schemes) and ${names.length} colour tokens from ${tokensPath}; ` +
      `${cssFiles.length} other stylesheet(s) scanned for colour literals: ${cssFiles.map(rel).join(", ") || "none"}`,
  );

  if (failures > 0) {
    console.log(`FAIL contrast (${failures} problem${failures === 1 ? "" : "s"})`);
    process.exit(1);
  }
  console.log("PASS contrast");
}

main().catch((error) => {
  console.error(`contrast gate crashed: ${error.stack || error.message}`);
  process.exit(1);
});
