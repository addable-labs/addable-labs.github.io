#!/usr/bin/env node
// Gate: parity (REQ-009, REQ-011; AC-14, AC-16).
//   - every HTML file outside sv/ (except 404.html) has the same relative path
//     under sv/, and vice versa; feed.xml ↔ sv/feed.xml
//   - strings/en.json and strings/sv.json have identical flattened key sets
//     and no empty values
//   - every page pairs with exactly one counterpart: the hreflang alternates
//     in the built pages form a one-to-one mapping between the two languages
//     (each translationKey occurs once per language)
// A game page (si-y6pp) — one of the paths src/_data/games.json names
// (gamePagePaths in scripts/lib/games.mjs), and no other — is in English like
// its game and has no counterpart: it is left out of the mirror and the
// pairing, and a line names each one left out.
// An English article without a Swedish file (D206, scripts/lib/fallback.mjs)
// has no translation: the Swedish side shows it in English, at the same path
// under sv/, so it is in the mirror, but neither page claims an hreflang
// alternate. The two are left out of the pairing, and instead each such
// English page and the Swedish page that shows it are both built and claim
// no alternates, the English page's switch leads to the Swedish page and
// the Swedish page's back; a line names each pair.
// Failures name the offending path or key. Optional arguments: <built-site
// dir> [<source dir>].

import path from "node:path";
import { attr, loadPage } from "../lib/html.mjs";
import { fallbackPages } from "../lib/fallback.mjs";
import { gamePagePaths } from "../lib/games.mjs";
import { exists, fileToUrl, flattenKeys, loadSite, loadStrings, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const report = reporter("parity");
const origin = site.url.replace(/\/$/, "");
const defaultLang = site.languages.default;
const others = site.languages.codes.filter((code) => code !== defaultLang);
const GAME_PAGES = gamePagePaths(src);
const FALLBACKS = (await fallbackPages(src, site)).filter((entry) => !entry.omitted);
const IN_ENGLISH_ONLY = new Set(FALLBACKS.flatMap((entry) => [entry.path, entry.original]));

// 1. Page-set mirror (game pages aside)
const allHtml = (await walk(out, ".html")).map((file) => path.relative(out, file).split(path.sep).join("/"));
const gameFiles = allHtml.filter((file) => GAME_PAGES.has(fileToUrl(file)));
for (const file of gameFiles) report.ok(`${file} is a game page: in English like its game, with no counterpart`);
const htmlFiles = allHtml.filter((file) => !gameFiles.includes(file));
for (const lang of others) {
  const prefix = `${lang}/`;
  const base = htmlFiles.filter((file) => !file.startsWith(prefix) && file !== "404.html" && !others.some((o) => file.startsWith(`${o}/`)));
  const mirrored = htmlFiles.filter((file) => file.startsWith(prefix)).map((file) => file.slice(prefix.length));
  let mismatches = 0;
  for (const file of base) {
    if (!mirrored.includes(file)) {
      mismatches += 1;
      report.fail(`${prefix}${file} is missing (counterpart of ${file})`);
    }
  }
  for (const file of mirrored) {
    if (!base.includes(file)) {
      mismatches += 1;
      report.fail(`${file} is missing (counterpart of ${prefix}${file})`);
    }
  }
  report.check(mismatches === 0, `${base.length} ${defaultLang} page(s) mirrored under ${prefix}`);
  for (const feed of ["feed.xml"]) {
    report.check(await exists(path.join(out, feed)) && await exists(path.join(out, lang, feed)), `${feed} ↔ ${prefix}${feed}`);
  }
}

// 2. Strings key sets
const strings = await loadStrings(src, site);
const flat = Object.fromEntries(site.languages.codes.map((lang) => [lang, flattenKeys(strings[lang])]));
const reference = Object.keys(flat[defaultLang]).sort();
for (const lang of others) {
  const keys = Object.keys(flat[lang]).sort();
  const missing = reference.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !reference.includes(key));
  report.check(missing.length === 0 && extra.length === 0, `strings/${defaultLang}.json and strings/${lang}.json have identical key sets (${reference.length} keys)${missing.length ? `; missing in ${lang}: ${missing.join(", ")}` : ""}${extra.length ? `; extra in ${lang}: ${extra.join(", ")}` : ""}`);
}
for (const lang of site.languages.codes) {
  const empty = Object.entries(flat[lang]).filter(([, value]) => typeof value !== "string" || value.trim() === "").map(([key]) => key);
  report.check(empty.length === 0, `strings/${lang}.json has no empty values${empty.length ? ` (empty: ${empty.join(", ")})` : ""}`);
}

// 3. One-to-one pairing through hreflang alternates
const pages = [];
for (const file of await walk(out, ".html")) {
  const page = await loadPage(file, out, site);
  if (page.relPath === "404.html" || GAME_PAGES.has(page.url)) continue;
  const alternates = new Map(page.doc.querySelectorAll('link[rel="alternate"][hreflang]').map((el) => [attr(el, "hreflang"), attr(el, "href")]));
  pages.push({ ...page, alternates });
}
const byUrl = new Map(pages.map((page) => [`${origin}${page.url}`, page]));
const byPath = new Map(pages.map((page) => [page.url, page]));
for (const lang of others) {
  const targets = new Map();
  let problems = 0;
  for (const page of pages.filter((p) => p.lang === defaultLang && !IN_ENGLISH_ONLY.has(p.url))) {
    const target = page.alternates.get(lang);
    const counterpart = target ? byUrl.get(target) : undefined;
    if (!counterpart || counterpart.lang !== lang) {
      problems += 1;
      report.fail(`${page.relPath}: hreflang="${lang}" target ${target ?? "(none)"} is not a built ${lang} page`);
      continue;
    }
    if (counterpart.alternates.get(defaultLang) !== `${origin}${page.url}`) {
      problems += 1;
      report.fail(`${counterpart.relPath}: points back at ${counterpart.alternates.get(defaultLang)} instead of ${origin}${page.url}`);
    }
    if (targets.has(target)) {
      problems += 1;
      report.fail(`${counterpart.relPath} is the counterpart of both ${targets.get(target)} and ${page.relPath} (translationKey used twice)`);
    }
    targets.set(target, page.relPath);
  }
  const unpaired = pages.filter((p) => p.lang === lang && !IN_ENGLISH_ONLY.has(p.url) && !targets.has(`${origin}${p.url}`)).map((p) => p.relPath);
  if (unpaired.length) {
    problems += 1;
    report.fail(`${lang} page(s) without a ${defaultLang} counterpart: ${unpaired.join(", ")}`);
  }
  report.check(problems === 0, `${targets.size} ${defaultLang} ↔ ${lang} page pair(s) map one-to-one`);
}

// 4. The articles in English only (D206): the English page and the page that
// shows it on the other side, each built, neither claiming an alternate, each
// switching to the other.
const switchTarget = (page) => attr(page.doc.querySelector("header a.lang-switch"), "href");
for (const entry of FALLBACKS) {
  const english = byPath.get(entry.original);
  const shown = byPath.get(entry.path);
  const wrong = [];
  if (!english) wrong.push(`${entry.original} is not built`);
  if (!shown) wrong.push(`${entry.path} is not built`);
  for (const page of [english, shown].filter(Boolean)) {
    if (page.alternates.size > 0) wrong.push(`${page.relPath} claims hreflang alternates (${[...page.alternates.keys()].join(", ")})`);
  }
  if (english && shown) {
    if (switchTarget(english) !== entry.path) wrong.push(`${english.relPath}: the language switch leads to ${switchTarget(english) ?? "nothing"}, not ${entry.path}`);
    if (switchTarget(shown) !== entry.original) wrong.push(`${shown.relPath}: the language switch leads to ${switchTarget(shown) ?? "nothing"}, not ${entry.original}`);
  }
  report.check(wrong.length === 0, `${entry.original} is in English only: ${entry.path} shows it in English, neither claims an alternate and each switches to the other${wrong.length > 0 ? ` — ${wrong.join("; ")}` : ""}`);
}

report.finish();
