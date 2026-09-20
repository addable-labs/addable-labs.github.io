#!/usr/bin/env node
// Gate: feeds (REQ-007, AC-12).
//
// Checks the built feeds in _site/: both are well-formed XML, RSS 2.0 with a
// channel title/link/description, every item has title/link/guid/pubDate, item
// links are absolute (site.url) and carry the language prefix of their feed,
// each feed lists exactly that language's articles (from src/<lang>/blog/posts),
// draft articles carry the localised label in the item title, and every built
// HTML page links its language's feed with <link rel="alternate"
// type="application/rss+xml">. Exit 0 when everything passes, 1 otherwise.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parse as parseHtml } from "node-html-parser";
import site from "../../src/_data/site.js";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const OUT = path.join(ROOT, "_site");
const SRC = path.join(ROOT, "src");
const STRINGS = {};
for (const lang of site.languages.codes) {
  STRINGS[lang] = JSON.parse(await readFile(path.join(SRC, "_data", "strings", `${lang}.json`), "utf8"));
}

const FEEDS = site.languages.codes.map((lang) => ({
  lang,
  prefix: lang === site.languages.default ? "" : `/${lang}`,
  file: lang === site.languages.default ? "feed.xml" : `${lang}/feed.xml`,
}));

let failures = 0;
function ok(message) {
  console.log(`ok    ${message}`);
}
function fail(message) {
  failures += 1;
  console.log(`FAIL  ${message}`);
}
function check(condition, message) {
  if (condition) ok(message);
  else fail(message);
}
function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Articles of a language from the source tree: slug, draft flag, expected absolute URL. */
async function sourceArticles(feed) {
  const dir = path.join(SRC, feed.lang, "blog", "posts");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  const articles = [];
  for (const name of files) {
    const text = await readFile(path.join(dir, name), "utf8");
    const frontMatter = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
    const draft = /^draft:\s*true\b/m.test(frontMatter);
    const slug = name.replace(/\.md$/, "");
    articles.push({ slug, draft, url: `${site.url}${feed.prefix}/blog/${slug}/` });
  }
  return articles;
}

async function listHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtmlFiles(full)));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
  return files.sort();
}

async function checkFeed(feed) {
  const file = path.join(OUT, feed.file);
  let xml;
  try {
    xml = await readFile(file, "utf8");
  } catch {
    fail(`${feed.file}: missing`);
    return;
  }
  const valid = XMLValidator.validate(xml);
  check(valid === true, `${feed.file}: well-formed XML${valid === true ? "" : ` (${valid.err?.msg})`}`);
  if (valid !== true) return;

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const rss = doc.rss;
  check(rss && rss["@_version"] === "2.0", `${feed.file}: <rss version="2.0">`);
  const channel = rss?.channel ?? {};
  for (const key of ["title", "link", "description"]) {
    check(typeof channel[key] === "string" && channel[key].trim().length > 0, `${feed.file}: channel <${key}>`);
  }
  check(
    typeof channel.link === "string" && channel.link.startsWith(site.url),
    `${feed.file}: channel link is absolute (${channel.link})`,
  );

  const items = asArray(channel.item);
  const expected = await sourceArticles(feed);
  const draftLabel = STRINGS[feed.lang].article.draftLabel;
  check(items.length > 0, `${feed.file}: has items (${items.length})`);

  const seen = new Set();
  for (const item of items) {
    const title = String(item.title ?? "");
    for (const key of ["title", "link", "guid", "pubDate"]) {
      check(item[key] !== undefined && String(typeof item[key] === "object" ? item[key]["#text"] : item[key]).trim() !== "", `${feed.file}: item "${title}" has <${key}>`);
    }
    const link = String(item.link ?? "");
    check(link.startsWith(`${site.url}${feed.prefix}/blog/`), `${feed.file}: item link absolute with language prefix (${link})`);
    check(
      !Number.isNaN(Date.parse(String(typeof item.pubDate === "object" ? item.pubDate["#text"] : item.pubDate))),
      `${feed.file}: item "${title}" pubDate parses`,
    );
    const article = expected.find((entry) => entry.url === link);
    check(article !== undefined, `${feed.file}: item link is a ${feed.lang} article (${link})`);
    if (article) {
      seen.add(article.slug);
      if (article.draft) {
        check(title.startsWith(`${draftLabel}: `), `${feed.file}: draft item "${title}" carries the "${draftLabel}" label`);
      } else {
        check(!title.startsWith(`${draftLabel}: `), `${feed.file}: non-draft item "${title}" has no "${draftLabel}" label`);
      }
    }
  }
  const missing = expected.filter((entry) => !seen.has(entry.slug)).map((entry) => entry.slug);
  check(missing.length === 0, `${feed.file}: every ${feed.lang} article appears${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
}

async function checkPageFeedLinks() {
  const files = await listHtmlFiles(OUT);
  let problems = 0;
  for (const file of files) {
    const html = parseHtml(await readFile(file, "utf8"));
    const lang = html.querySelector("html")?.getAttribute("lang") ?? site.languages.default;
    const feed = FEEDS.find((entry) => entry.lang === lang) ?? FEEDS[0];
    const expectedHref = `${site.url}/${feed.file}`;
    const links = html.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]');
    const hrefs = links.map((link) => link.getAttribute("href"));
    if (!hrefs.includes(expectedHref)) {
      problems += 1;
      fail(`${path.relative(OUT, file)}: no <link rel="alternate" type="application/rss+xml" href="${expectedHref}"> (found: ${hrefs.join(", ") || "none"})`);
    }
  }
  check(problems === 0, `${files.length} HTML page(s) link their language's feed`);
}

for (const feed of FEEDS) {
  await checkFeed(feed);
}
await checkPageFeedLinks();

if (failures > 0) {
  console.log(`FAIL feeds (${failures} problem${failures === 1 ? "" : "s"})`);
  process.exit(1);
}
console.log("PASS feeds");
