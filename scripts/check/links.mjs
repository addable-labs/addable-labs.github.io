#!/usr/bin/env node
// Gate: links (REQ-021, AC-03).
//
// Every internal href/src in every built page, feed and sitemap must resolve
// to a file in the built site ("/x/" → x/index.html, "/x" → x or
// x/index.html); fragment-only links must point at an id on the same page;
// mailto:/tel: are ignored. External links are fetched with a 10 s timeout
// and reported as warnings only (they never fail the gate); CHECK_OFFLINE=1
// skips them and CHECK_LINK_TIMEOUT (milliseconds) shortens the timeout.
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { XMLParser } from "fast-xml-parser";
import { parse as parseHtml } from "node-html-parser";
import { loadPage, references } from "../lib/html.mjs";
import { candidatesForPath, exists, internalPath, loadSite, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const report = reporter("links");
const timeoutMs = Number(process.env.CHECK_LINK_TIMEOUT) || 10_000;
const relativeOut = path.relative(process.cwd(), out);
const outLabel = relativeOut && !relativeOut.startsWith("..") ? relativeOut : out;

const external = new Map(); // url → first source
let internalChecked = 0;

async function checkInternal(value, source, doc) {
  if (value.startsWith("#")) {
    const id = value.slice(1);
    if (!doc) return;
    const target = id === "" ? true : doc.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
    internalChecked += 1;
    if (!target) report.fail(`${source}: fragment ${value} has no element with that id`);
    return;
  }
  const urlPath = internalPath(value, site);
  if (urlPath === null) {
    if (/^https?:\/\//i.test(value) || value.startsWith("//")) {
      const url = value.startsWith("//") ? `https:${value}` : value;
      if (!external.has(url)) external.set(url, source);
    }
    return;
  }
  internalChecked += 1;
  for (const candidate of candidatesForPath(urlPath)) {
    if (await exists(path.join(out, candidate))) return;
  }
  report.fail(`${source}: ${value} does not resolve to a file in ${outLabel}`);
}

// HTML pages
for (const file of await walk(out, ".html")) {
  const page = await loadPage(file, out, site);
  for (const ref of references(page.doc)) {
    await checkInternal(ref.value, `${page.relPath} <${ref.tag} ${ref.attribute}>`, page.doc);
  }
}

// Feeds and sitemap: every <link>, <guid>, <loc> and href attribute, plus the
// URLs inside content:encoded HTML.
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: (name) => name === "item" || name === "url" || name === "xhtml:link" });
function collectXmlUrls(node, into) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const entry of node) collectXmlUrls(entry, into);
    return;
  }
  if (typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    if (key === "link" || key === "guid" || key === "loc" || key === "@_href") {
      const text = typeof value === "object" && value !== null && !Array.isArray(value) ? value["#text"] : value;
      if (typeof text === "string") into.push({ key, value: text });
      else if (Array.isArray(value)) for (const v of value) into.push({ key, value: typeof v === "object" ? v["#text"] : v });
    } else if (key === "content:encoded") {
      const html = typeof value === "string" ? value : value?.["#text"];
      if (typeof html === "string") {
        for (const ref of references(parseHtml(html))) into.push({ key: `content:encoded <${ref.tag} ${ref.attribute}>`, value: ref.value });
      }
    } else {
      collectXmlUrls(value, into);
    }
  }
}
for (const file of await walk(out, ".xml")) {
  const relPath = path.relative(out, file);
  const doc = parser.parse(await readFile(file, "utf8"));
  const urls = [];
  collectXmlUrls(doc, urls);
  for (const { key, value } of urls) {
    if (typeof value !== "string") continue;
    if (value.startsWith("http://www.w3.org/") || value.startsWith("http://purl.org/") || value.startsWith("http://www.sitemaps.org/")) continue; // namespaces
    await checkInternal(value, `${relPath} <${key}>`, null);
  }
}

report.check(true, `${internalChecked} internal reference(s) checked`);

// External links: warnings only.
if (process.env.CHECK_OFFLINE === "1") {
  report.warn(`CHECK_OFFLINE=1: skipped ${external.size} external link(s)`);
} else {
  for (const [url, source] of external) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
      if (response.status === 405 || response.status === 403 || response.status === 404) {
        response = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
      }
      if (response.ok) report.ok(`external ${url} → ${response.status}`);
      else report.warn(`external ${url} → HTTP ${response.status} (from ${source})`);
    } catch (error) {
      report.warn(`external ${url} → ${error.name === "AbortError" ? `timed out after ${timeoutMs / 1000} s` : error.message} (from ${source})`);
    } finally {
      clearTimeout(timer);
    }
  }
}

report.finish();
