// Load and query built HTML pages with node-html-parser.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "node-html-parser";
import { fileToUrl, langFromPath } from "./site.mjs";

/**
 * Parse a page. node-html-parser keeps the inside of <pre> as raw text by
 * default, so a highlighted code block (spans inside it, si-20k4) would
 * read as its markup and the word count would take every tag and class name
 * for words; <pre> is left out of blockTextElements (false would drop its
 * content) and parsed like any other element. Script, style and noscript
 * stay raw.
 */
export function parseHtml(html) {
  return parse(html, { comment: false, blockTextElements: { script: true, noscript: true, style: true } });
}

/** Load one built page: { file, relPath, url, lang, size, html, doc }. */
export async function loadPage(file, outDir, site) {
  const html = await readFile(file, "utf8");
  const relPath = path.relative(outDir, file);
  return {
    file,
    relPath,
    url: fileToUrl(relPath),
    lang: langFromPath(relPath, site),
    size: Buffer.byteLength(html, "utf8"),
    html,
    doc: parseHtml(html),
  };
}

/** Normalised text content of an element (collapsed whitespace), "" when null. */
export function text(element) {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Attribute value or undefined. */
export function attr(element, name) {
  return element?.getAttribute(name);
}

/** Headings in document order as [{ level, text }]. */
export function headings(doc) {
  return doc.querySelectorAll("h1, h2, h3, h4, h5, h6").map((el) => ({
    level: Number(el.tagName.slice(1)),
    text: text(el),
  }));
}

/** Elements that can receive keyboard focus, in document order. */
export function focusables(doc) {
  return doc
    .querySelectorAll("a[href], button, input, select, textarea, [tabindex], [contenteditable]")
    .filter((el) => {
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== undefined && Number(tabindex) < 0) return false;
      if (el.hasAttribute("disabled")) return false;
      if (el.tagName === "INPUT" && el.getAttribute("type") === "hidden") return false;
      return true;
    });
}

/** All URL-bearing attributes in a page: [{ tag, attribute, value }]. */
export function references(doc) {
  const found = [];
  const selectors = [
    ["a", "href"],
    ["link", "href"],
    ["img", "src"],
    ["img", "srcset"],
    ["script", "src"],
    ["iframe", "src"],
    ["source", "src"],
    ["source", "srcset"],
    ["video", "src"],
    ["audio", "src"],
    ["video", "poster"],
    ["object", "data"],
    ["embed", "src"],
    ["form", "action"],
  ];
  for (const [tag, attribute] of selectors) {
    for (const el of doc.querySelectorAll(`${tag}[${attribute}]`)) {
      const value = el.getAttribute(attribute);
      if (attribute === "srcset") {
        for (const candidate of value.split(",")) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) found.push({ tag, attribute, value: url });
        }
      } else if (value !== undefined) {
        found.push({ tag, attribute, value });
      }
    }
  }
  return found;
}
