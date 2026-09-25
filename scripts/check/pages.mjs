#!/usr/bin/env node
// Gate: pages (REQ-014, REQ-015, REQ-010, REQ-016; AC-05, AC-15, AC-19,
// AC-20, AC-21, AC-22). Per built HTML page:
//   - header, nav, main, footer exactly once; exactly one h1; no skipped
//     heading levels; the skip link is the first focusable element and
//     targets an existing id
//   - html[lang] matches the path (sv/ ↔ sv, else the default language)
//   - every img has alt, width and height
//   - a unique <title>, a meta description, a canonical URL, og:title and
//     og:description
//   - a link-preview image (si-awlu): og:image an absolute URL on the site's
//     origin whose file in the build is a PNG of 1200 × 630 px and at most
//     300 KB, og:image:type image/png, og:image:width 1200 and
//     og:image:height 630, an og:image:alt, twitter:card
//     summary_large_image and a twitter:image:alt equal to og:image:alt
//   - three hreflang alternates (both languages + x-default → the English
//     URL) with absolute URLs, and the language's feed link (404.html has no
//     counterpart and is exempt from the alternates and the switch)
//   - the language switch targets the same path in the other language with
//     hreflang/lang and the target language's name
//   - every script[src] resolves on the site's origin and inline scripts are
//     allowed (the first release's "no <script> at all" rule, re-targeted by
//     the redesign's REQ-024); no cross-origin subresource: stylesheets,
//     scripts, images, icons, preloads (fonts, modules) and the @font-face
//     src URLs of every same-origin stylesheet (REQ-004, REQ-020)
//   - HTML + same-origin CSS ≤ 150 KB; on the two landing pages the gzip size
//     of the same-origin CSS + JS plus inline <style>/<script> content is
//     ≤ 61,440 B and is printed per page (REQ-020, AC-21), and so it is on
//     every game page and every page that plays a game (si-y6pp)
// A game page (si-y6pp) — one of the paths src/_data/games.json names
// (gamePagePaths in scripts/lib/games.mjs), and no other — is the game and
// nothing else, as in the app: it has main and no header, nav or footer, no
// skip link, and, in English like its game, no hreflang alternates and no
// language switch. Every other rule above holds for it as for any page.
// Redesign re-targetings (REQ-024 pages bullet; REQ-004, REQ-020; AC-04,
// AC-21) are marked with the requirement they enforce (AC-25); every other
// assertion is the first release's, unchanged.
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMPRESSED_BUDGET, compressedSize, fontFaceSources, formatBytes } from "../lib/budget.mjs";
import { gamePagePaths } from "../lib/games.mjs";
import { attr, focusables, headings, loadPage, text } from "../lib/html.mjs";
import { IMAGE_HEIGHT, IMAGE_WIDTH, pngProblems } from "../lib/images.mjs";
import { candidatesForPath, exists, internalPath, langPrefix, loadSite, loadStrings, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const strings = await loadStrings(src, site);
const report = reporter("pages");
const origin = site.url.replace(/\/$/, "");
const SIZE_BUDGET = 150 * 1024;
const NOT_FOUND = "404.html";
const GAME_PAGES = gamePagePaths(src);

const other = (lang) => site.languages.codes.find((code) => code !== lang);
function counterpartPath(urlPath, lang) {
  const target = other(lang);
  const own = langPrefix(lang, site);
  const bare = own && urlPath.startsWith(`${own}/`) ? urlPath.slice(own.length) : urlPath;
  return `${langPrefix(target, site)}${bare}`;
}

const titles = new Map();

// Same-origin asset text by URL path — stylesheets for the @font-face check
// (REQ-004) and the HTML + CSS size budget, stylesheets and scripts for the
// compressed budget (REQ-020). null for a cross-origin URL or a file missing
// from the build (the links gate reports missing files).
const assetText = new Map();
async function readAsset(href) {
  const urlPath = internalPath(href, site);
  if (urlPath === null) return null;
  if (!assetText.has(urlPath)) {
    let asset = null;
    for (const candidate of candidatesForPath(urlPath)) {
      const file = path.join(out, candidate);
      if (await exists(file)) {
        asset = { name: urlPath, text: await readFile(file, "utf8") };
        break;
      }
    }
    assetText.set(urlPath, asset);
  }
  return assetText.get(urlPath);
}

// What is wrong with the file a page's og:image names, by URL path (si-awlu):
// missing from the build, or not a PNG of 1200 × 630 px of at most 300 KB.
// Read once for all the pages that name it.
const imageFileProblems = new Map();
async function imageProblemsAt(urlPath) {
  if (!imageFileProblems.has(urlPath)) {
    let problems = [`og:image ${urlPath} is not a file in the build`];
    for (const candidate of candidatesForPath(urlPath)) {
      const file = path.join(out, candidate);
      if (await exists(file)) {
        problems = pngProblems(await readFile(file), `og:image ${urlPath}`);
        break;
      }
    }
    imageFileProblems.set(urlPath, problems);
  }
  return imageFileProblems.get(urlPath);
}

const files = await walk(out, ".html");
for (const file of files) {
  const page = await loadPage(file, out, site);
  const { doc, relPath } = page;
  const isNotFound = relPath === NOT_FOUND;
  const isGamePage = GAME_PAGES.has(page.url);
  const problems = [];
  const expect = (condition, message) => {
    if (!condition) problems.push(message);
  };

  // Landmarks and headings: a game page has main and nothing around it
  for (const landmark of ["header", "nav", "main", "footer"]) {
    const count = doc.querySelectorAll(landmark).length;
    const expected = isGamePage && landmark !== "main" ? 0 : 1;
    expect(count === expected, `${landmark} appears ${count} time(s), expected ${expected}${isGamePage ? " on a game page" : ""}`);
  }
  const h1s = doc.querySelectorAll("h1");
  expect(h1s.length === 1, `${h1s.length} h1 element(s), expected 1`);
  let previous = 0;
  for (const heading of headings(doc)) {
    expect(heading.level <= previous + 1, `heading level skipped: h${previous} → h${heading.level} ("${heading.text}")`);
    previous = heading.level;
  }

  // Skip link (a game page has nothing to skip)
  if (!isGamePage) {
    const first = focusables(doc)[0];
    expect(first && first.tagName === "A" && first.classList.contains("skip-link"), "first focusable element is not the skip link");
    const skipHref = attr(first, "href") ?? "";
    expect(skipHref.startsWith("#") && doc.querySelector(`[id="${skipHref.slice(1)}"]`), `skip link target ${skipHref || "(none)"} not found`);
  }

  // Language
  const htmlLang = attr(doc.querySelector("html"), "lang");
  expect(htmlLang === page.lang, `html[lang] is ${JSON.stringify(htmlLang)}, path implies ${JSON.stringify(page.lang)}`);

  // Images
  for (const img of doc.querySelectorAll("img")) {
    for (const name of ["alt", "width", "height"]) {
      expect(img.hasAttribute(name), `img ${attr(img, "src") ?? ""} lacks ${name}`);
    }
  }

  // Head
  const title = text(doc.querySelector("title"));
  expect(title.length > 0, "empty <title>");
  if (titles.has(title)) problems.push(`title "${title}" duplicates ${titles.get(title)}`);
  else titles.set(title, relPath);
  const description = (attr(doc.querySelector('meta[name="description"]'), "content") ?? "").trim();
  expect(description.length > 0, "missing meta description");
  const canonical = attr(doc.querySelector('link[rel="canonical"]'), "href");
  expect(canonical === `${origin}${page.url}`, `canonical is ${JSON.stringify(canonical)}, expected ${origin}${page.url}`);
  for (const property of ["og:title", "og:description"]) {
    expect((attr(doc.querySelector(`meta[property="${property}"]`), "content") ?? "").trim().length > 0, `missing ${property}`);
  }

  // The link-preview image (si-awlu): what a platform shows when the page is
  // shared. Open Graph wants an absolute URL; the file must be there, and be
  // the 1200 × 630 PNG of at most 300 KB the tags announce.
  const meta = (key, name = "property") => attr(doc.querySelector(`meta[${name}="${key}"]`), "content");
  const image = meta("og:image") ?? "";
  const imagePath = internalPath(image, site);
  if (!image) problems.push("missing og:image");
  else if (!image.startsWith(`${origin}/`) || imagePath === null) problems.push(`og:image ${image} is not an absolute URL on ${origin}`);
  else problems.push(...(await imageProblemsAt(imagePath)));
  for (const [key, want] of [["og:image:type", "image/png"], ["og:image:width", String(IMAGE_WIDTH)], ["og:image:height", String(IMAGE_HEIGHT)]]) {
    expect(meta(key) === want, `${key} is ${JSON.stringify(meta(key) ?? null)}, expected "${want}"`);
  }
  const imageAlt = (meta("og:image:alt") ?? "").trim();
  expect(imageAlt.length > 0, "missing og:image:alt");
  expect(meta("twitter:card", "name") === "summary_large_image", `twitter:card is ${JSON.stringify(meta("twitter:card", "name") ?? null)}, expected "summary_large_image"`);
  expect((meta("twitter:image:alt", "name") ?? "").trim() === imageAlt, "twitter:image:alt is not og:image:alt");

  // hreflang alternates and the switch (not for the 404 page or a game page,
  // which have no counterpart)
  const alternates = new Map(doc.querySelectorAll('link[rel="alternate"][hreflang]').map((el) => [attr(el, "hreflang"), attr(el, "href")]));
  if (isGamePage) {
    expect(alternates.size === 0, "a game page should carry no hreflang alternates");
    expect(doc.querySelectorAll("a.lang-switch").length === 0, "a game page should carry no language switch");
  } else if (!isNotFound) {
    const counterpart = counterpartPath(page.url, page.lang);
    const english = page.lang === site.languages.default ? page.url : counterpart;
    expect(alternates.size === 3, `${alternates.size} hreflang alternate(s), expected 3`);
    expect(alternates.get(page.lang) === `${origin}${page.url}`, `hreflang="${page.lang}" is ${JSON.stringify(alternates.get(page.lang))}, expected ${origin}${page.url}`);
    expect(alternates.get(other(page.lang)) === `${origin}${counterpart}`, `hreflang="${other(page.lang)}" is ${JSON.stringify(alternates.get(other(page.lang)))}, expected ${origin}${counterpart}`);
    expect(alternates.get("x-default") === `${origin}${english}`, `hreflang="x-default" is ${JSON.stringify(alternates.get("x-default"))}, expected ${origin}${english}`);
    for (const [, href] of alternates) expect(/^https?:\/\//.test(href ?? ""), `hreflang href ${href} is not absolute`);

    const switches = doc.querySelectorAll("header a.lang-switch");
    expect(switches.length === 1, `${switches.length} language switch(es) in the header, expected 1`);
    const sw = switches[0];
    if (sw) {
      expect(attr(sw, "href") === counterpart, `language switch targets ${attr(sw, "href")}, expected ${counterpart}`);
      expect(attr(sw, "hreflang") === other(page.lang) && attr(sw, "lang") === other(page.lang), `language switch lacks hreflang/lang="${other(page.lang)}"`);
      expect(text(sw) === strings[page.lang].languages[other(page.lang)], `language switch text is "${text(sw)}", expected "${strings[page.lang].languages[other(page.lang)]}"`);
    }
  } else {
    expect(alternates.size === 0, "404.html should carry no hreflang alternates");
  }
  const feedPath = `${langPrefix(page.lang, site)}/feed.xml`;
  const feedLinks = doc.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]').map((el) => attr(el, "href"));
  expect(feedLinks.includes(`${origin}${feedPath}`), `no feed link to ${origin}${feedPath} (found: ${feedLinks.join(", ") || "none"})`);

  // Scripts and cross-origin subresources
  // REQ-024: same-origin scripts only; the page stays usable without them
  // (REQ-020). The first release's "no <script> at all" rule is re-targeted:
  // inline scripts are allowed, and every script[src] must resolve on the
  // site's origin (root-relative, or absolute under site.url) — the
  // script[src] entry of the list below enforces it.
  // REQ-020: no cross-origin request of any kind — the list also covers
  // link[rel~=modulepreload] and link[rel~=preload][as=font] hrefs (the font
  // preloads of REQ-005). An element matched by two selectors is reported
  // once, under the more specific one.
  const seen = new Set();
  for (const [selector, attribute] of [["link[rel~=stylesheet]", "href"], ["script[src]", "src"], ["img[src]", "src"], ["iframe[src]", "src"], ["source[src]", "src"], ["video[src]", "src"], ["audio[src]", "src"], ["link[rel~=icon]", "href"], ["link[rel~=modulepreload]", "href"], ["link[rel~=preload][as=font]", "href"], ["link[rel~=preload]", "href"]]) {
    for (const el of doc.querySelectorAll(selector)) {
      if (seen.has(el)) continue;
      seen.add(el);
      const value = attr(el, attribute) ?? "";
      expect(internalPath(value, site) !== null, `cross-origin ${selector} ${value}`);
    }
  }

  // REQ-004, REQ-020 (AC-04): fonts are served from the site's own origin —
  // every url() in the @font-face src declarations of every same-origin
  // stylesheet the page references must resolve on the site's origin.
  const stylesheets = new Map();
  for (const el of doc.querySelectorAll("link[rel~=stylesheet]")) {
    const asset = await readAsset(attr(el, "href") ?? "");
    if (asset) stylesheets.set(asset.name, asset);
  }
  for (const { name, text: css } of stylesheets.values()) {
    for (const url of fontFaceSources(css)) {
      expect(internalPath(url, site) !== null, `@font-face src ${url} in ${name} is not on the site's origin`);
    }
  }

  // Size budget: HTML + same-origin stylesheets. Every link counts, so a
  // stylesheet linked twice counts twice; one that is cross-origin or
  // missing from the build counts 0.
  let total = page.size;
  for (const el of doc.querySelectorAll("link[rel~=stylesheet]")) {
    const asset = await readAsset(attr(el, "href") ?? "");
    total += asset ? Buffer.byteLength(asset.text, "utf8") : 0;
  }
  expect(total <= SIZE_BUDGET, `HTML + CSS is ${(total / 1024).toFixed(1)} KB, budget ${SIZE_BUDGET / 1024} KB`);

  // REQ-020 (AC-21): on the landing pages, gzip (default level) of every
  // same-origin stylesheet and script the page references plus its inline
  // <style> and <script> content is at most 61,440 B, printed per page; a
  // page over budget fails naming the total. Fonts and images are budgeted
  // separately (REQ-005; tests/fonts.test.mjs). Measured by
  // scripts/lib/budget.mjs, which tests/pages.test.mjs shares. The same
  // budget holds for a game page, whose game's code is inline, and for a page
  // that plays a game (si-y6pp): what it loads before a game is chosen.
  if (page.url === `${langPrefix(page.lang, site)}/` || isGamePage || doc.querySelector(".games")) {
    const scripts = new Map();
    for (const el of doc.querySelectorAll("script[src]")) {
      const asset = await readAsset(attr(el, "src") ?? "");
      if (asset) scripts.set(asset.name, asset);
    }
    const compressed = compressedSize(page.html, { stylesheets: [...stylesheets.values()], scripts: [...scripts.values()] }).total;
    if (compressed <= COMPRESSED_BUDGET) report.ok(`pages: ${page.url} compressed css+js ${formatBytes(compressed)} B (limit ${formatBytes(COMPRESSED_BUDGET)})`);
    expect(compressed <= COMPRESSED_BUDGET, `compressed css+js is ${formatBytes(compressed)} B, limit ${formatBytes(COMPRESSED_BUDGET)} B (REQ-020)`);
  }

  if (problems.length === 0) report.ok(`${relPath} (${(total / 1024).toFixed(1)} KB)`);
  for (const problem of problems) report.fail(`${relPath}: ${problem}`);
}

report.check(files.length > 0, `${files.length} page(s) checked`);
report.finish();
