#!/usr/bin/env node
// Gate: feeds (REQ-007, AC-12).
//
// Checks the built feeds: both are well-formed XML, RSS 2.0 with a channel
// title/link/description, every item has title/link/guid/pubDate, item links
// are absolute (site.url) and carry the language prefix of their feed, each
// feed lists exactly that language's articles (from src/<lang>/blog/posts),
// draft articles carry the localised label in the item title, and every built
// HTML page links its language's feed with <link rel="alternate"
// type="application/rss+xml">. Exit 0 when everything passes, 1 otherwise.
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { attr, loadPage } from "../lib/html.mjs";
import { loadSite, loadStrings, readArticleSources, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const strings = await loadStrings(src, site);
const report = reporter("feeds");

const FEEDS = site.languages.codes.map((lang) => ({
  lang,
  prefix: lang === site.languages.default ? "" : `/${lang}`,
  file: lang === site.languages.default ? "feed.xml" : `${lang}/feed.xml`,
}));

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
function textOf(value) {
  return String(typeof value === "object" && value !== null ? value["#text"] ?? "" : value ?? "");
}

async function checkFeed(feed) {
  const file = path.join(out, feed.file);
  let xml;
  try {
    xml = await readFile(file, "utf8");
  } catch {
    report.fail(`${feed.file}: missing`);
    return;
  }
  const valid = XMLValidator.validate(xml);
  report.check(valid === true, `${feed.file}: well-formed XML${valid === true ? "" : ` (${valid.err?.msg})`}`);
  if (valid !== true) return;

  const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml);
  const rss = doc.rss;
  report.check(rss && rss["@_version"] === "2.0", `${feed.file}: <rss version="2.0">`);
  const channel = rss?.channel ?? {};
  for (const key of ["title", "link", "description"]) {
    report.check(textOf(channel[key]).trim().length > 0, `${feed.file}: channel <${key}>`);
  }
  report.check(textOf(channel.link).startsWith(site.url), `${feed.file}: channel link is absolute (${textOf(channel.link)})`);

  const items = asArray(channel.item);
  const expected = await readArticleSources(src, site, feed.lang);
  const draftLabel = strings[feed.lang].article.draftLabel;
  report.check(items.length > 0, `${feed.file}: has items (${items.length})`);

  const seen = new Set();
  for (const item of items) {
    const title = textOf(item.title);
    for (const key of ["title", "link", "guid", "pubDate"]) {
      report.check(item[key] !== undefined && textOf(item[key]).trim() !== "", `${feed.file}: item "${title}" has <${key}>`);
    }
    const link = textOf(item.link);
    report.check(link.startsWith(`${site.url}${feed.prefix}/blog/`), `${feed.file}: item link absolute with language prefix (${link})`);
    report.check(!Number.isNaN(Date.parse(textOf(item.pubDate))), `${feed.file}: item "${title}" pubDate parses`);
    const article = expected.find((entry) => entry.url === link);
    report.check(article !== undefined, `${feed.file}: item link is a ${feed.lang} article (${link})`);
    if (article) {
      seen.add(article.slug);
      if (article.draft) {
        report.check(title.startsWith(`${draftLabel}: `), `${feed.file}: draft item "${title}" carries the "${draftLabel}" label`);
      } else {
        report.check(!title.startsWith(`${draftLabel}: `), `${feed.file}: non-draft item "${title}" has no "${draftLabel}" label`);
      }
    }
  }
  const missing = expected.filter((entry) => !seen.has(entry.slug)).map((entry) => entry.slug);
  report.check(missing.length === 0, `${feed.file}: every ${feed.lang} article appears${missing.length ? ` (missing: ${missing.join(", ")})` : ""}`);
}

async function checkPageFeedLinks() {
  const files = await walk(out, ".html");
  let problems = 0;
  for (const file of files) {
    const page = await loadPage(file, out, site);
    const feed = FEEDS.find((entry) => entry.lang === page.lang) ?? FEEDS[0];
    const expectedHref = `${site.url}/${feed.file}`;
    const hrefs = page.doc.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]').map((link) => attr(link, "href"));
    if (!hrefs.includes(expectedHref)) {
      problems += 1;
      report.fail(`${page.relPath}: no <link rel="alternate" type="application/rss+xml" href="${expectedHref}"> (found: ${hrefs.join(", ") || "none"})`);
    }
  }
  report.check(problems === 0, `${files.length} HTML page(s) link their language's feed`);
}

for (const feed of FEEDS) {
  await checkFeed(feed);
}
await checkPageFeedLinks();
report.finish();
