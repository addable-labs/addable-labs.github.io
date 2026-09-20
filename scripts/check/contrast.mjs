#!/usr/bin/env node
// Gate: contrast (REQ-014, AC-05, AC-17; plan review PR-03).
//
// 1. Parses src/assets/css/tokens.css and evaluates an explicit list of
//    foreground/background token pairs in both colour schemes. Text pairs must
//    reach 4.5:1 and UI pairs 3:1 (WCAG 2.2 AA). Every pair is printed with its
//    ratio; a new colour token must be added to PAIRS below or it goes unchecked.
// 2. Fails if any CSS file under src/ other than tokens.css contains a colour
//    literal (#hex, rgb(), hsl(), color-mix(), named colours, …), so every colour
//    on every page is one of the checked tokens.
//
// Exit status 0 when everything passes, 1 otherwise. No network, no browser.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { contrastRatio, findColorLiterals, formatRatio, parseTokens } from "../lib/contrast.mjs";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const CSS_DIR = path.join(ROOT, "src");
const TOKENS_FILE = path.join(CSS_DIR, "assets", "css", "tokens.css");

const THRESHOLDS = { text: 4.5, ui: 3 };

// Foreground on background. `text` pairs carry body or link text; `ui` pairs are
// borders and the focus ring (non-text contrast, SC 1.4.11).
const PAIRS = [
  { fg: "--color-text", bg: "--color-bg", kind: "text" },
  { fg: "--color-text", bg: "--color-surface", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-bg", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-surface", kind: "text" },
  { fg: "--color-accent", bg: "--color-bg", kind: "text" },
  { fg: "--color-accent", bg: "--color-surface", kind: "text" },
  { fg: "--color-accent-strong", bg: "--color-bg", kind: "text" },
  { fg: "--color-accent-strong", bg: "--color-surface", kind: "text" },
  { fg: "--color-border", bg: "--color-bg", kind: "ui" },
  { fg: "--color-border", bg: "--color-surface", kind: "ui" },
  { fg: "--color-focus", bg: "--color-bg", kind: "ui" },
  { fg: "--color-focus", bg: "--color-surface", kind: "ui" },
];

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

  const tokens = parseTokens(await readFile(TOKENS_FILE, "utf8"));
  for (const scheme of ["light", "dark"]) {
    const set = tokens[scheme];
    for (const { fg, bg, kind } of PAIRS) {
      const label = `${scheme.padEnd(5)}  ${fg.padEnd(22)} on ${bg.padEnd(16)}`;
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
    `checked ${PAIRS.length} token pairs × 2 schemes from ${rel(TOKENS_FILE)}; ` +
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
