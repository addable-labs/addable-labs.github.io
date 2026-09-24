// What a built page loads, measured for the pages gate and its tests
// (REQ-020, REQ-004; AC-21, AC-04):
//   - compressedSize(): the gzip (default level) byte count of every referenced
//     same-origin stylesheet and script plus the page's inline <style> and
//     <script> content — the 60 KB landing-page budget of REQ-020
//   - fontFaceSources(): every url() in a stylesheet's @font-face src
//     declarations, so the gate and tests/fonts.test.mjs check the same-origin
//     rule of REQ-004 with one parser
// The gate and the unit tests share this module so the number the gate prints
// is the number the test asserts.

import { gzipSync } from "node:zlib";
import { parse } from "node-html-parser";
import { stripComments } from "./contrast.mjs";

/** REQ-020: 60 KB compressed CSS + JS per landing page. */
export const COMPRESSED_BUDGET = 60 * 1024;

/** gzip byte length of a string or buffer at zlib's default level (REQ-020 measures gzip, default level). */
export function gzipBytes(content) {
  return gzipSync(Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8")).length;
}

/** "61,440" — byte counts with thousands separators, as the gate prints them. */
export function formatBytes(bytes) {
  return new Intl.NumberFormat("en-US").format(bytes);
}

/** Inline <style> and <script> (no src) contents of a page in document order: [{ kind, name, text }]. */
export function inlineParts(html) {
  const doc = parse(html, { comment: false });
  const parts = [];
  for (const [kind, tag, selector] of [["inline-style", "style", "style"], ["inline-script", "script", "script:not([src])"]]) {
    doc.querySelectorAll(selector).forEach((el, index) => {
      parts.push({ kind, name: `inline <${tag}> #${index + 1}`, text: el.textContent });
    });
  }
  return parts;
}

/**
 * The compressed CSS + JS a page loads (REQ-020, AC-21).
 *   html         the page's HTML (its inline <style> and <script> content counts)
 *   stylesheets  [{ name, text }] every same-origin stylesheet the page references
 *   scripts      [{ name, text }] every same-origin script[src] the page references
 * Returns { total, raw, parts }: `total` is gzip over the concatenation of every
 * part (files first, then the inline content, joined by newlines), `raw` the
 * uncompressed byte count, and `parts` the per-part breakdown
 * [{ kind, name, raw, bytes }] with each part's own gzip size.
 */
export function compressedSize(html, { stylesheets = [], scripts = [] } = {}) {
  const parts = [
    ...stylesheets.map(({ name, text }) => ({ kind: "stylesheet", name, text })),
    ...scripts.map(({ name, text }) => ({ kind: "script", name, text })),
    ...inlineParts(html),
  ].map(({ kind, name, text }) => ({ kind, name, raw: Buffer.byteLength(text, "utf8"), bytes: gzipBytes(text), text }));
  const concatenated = parts.map((part) => part.text).join("\n");
  return {
    total: gzipBytes(concatenated),
    raw: Buffer.byteLength(concatenated, "utf8"),
    parts: parts.map(({ kind, name, raw, bytes }) => ({ kind, name, raw, bytes })),
  };
}

const FONT_FACE_BLOCK = /@font-face\s*\{([^}]*)\}/gi;
const SRC_DECLARATION = /(?:^|[;{\s])src\s*:\s*([^;]*)/gi;
const URL_FUNCTION = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"']*))\s*\)/gi;

/**
 * Every url() in the src of every @font-face rule of a stylesheet, in order
 * (REQ-004: fonts are served from the site's own origin; REQ-020: no
 * cross-origin request). local() sources are not URLs and are skipped.
 */
export function fontFaceSources(css) {
  const sources = [];
  const source = stripComments(css);
  for (const block of source.matchAll(FONT_FACE_BLOCK)) {
    for (const declaration of block[1].matchAll(SRC_DECLARATION)) {
      for (const url of declaration[1].matchAll(URL_FUNCTION)) {
        sources.push((url[1] ?? url[2] ?? url[3]).trim());
      }
    }
  }
  return sources;
}
