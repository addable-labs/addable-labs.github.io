// The source check (si-1q9z): `pnpm sources:check [file ...]` checks every
// entry of the source lists (scripts/lib/sources.mjs, docs/sources/*.yaml)
// against the live page, as the founder's order of 6 October 2026 has a
// factory agent do once a month:
//
//   1. fetch the entry's url, following redirects; record every hop (status,
//      location), the final status and the final URL, and compare the final
//      URL with the list's final_url;
//   2. look for the quote in the page's text;
//   3. one result per entry:
//        ok             reached at final_url, the quote is there
//        moved          the quote is there, but the link now ends elsewhere
//        quote-missing  the page answers, the quote is not in it
//        unreachable    no 2xx after the redirects: an HTTP error, a network
//                       error, a timeout
//
// It is not a gate, and neither `pnpm check` nor CI runs it: it needs the
// network, and a vendor's page changes without any commit here, so it would
// fail a build that changed nothing. Its rules are proved offline, on a local
// server, in tests/source-check.test.mjs.
//
// It never writes to a list or an article (the founder's rule: the check
// never changes a quote to make itself pass), and refuses to write a report
// into docs/sources/ or src/. Updating an entry is a person's job, or a
// reviewed bead's.
//
// Every page in the part 1 research notes (del-1-sources.md) has its text in
// the HTML a plain fetch gets, server-rendered, heading ids included, so no
// page needs a browser or the vendor's Markdown version: a Markdown page is
// read too, should a list ever name one. openai.com answers 403 to any
// script, so its pages cannot be checked; the series cites OpenAI's
// documentation on learn.chatgpt.com, which answers.

import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parse as parseHtml } from "node-html-parser";
import { ROOT } from "./site.mjs";
import { plainText, readSourceList, SOURCES_DIR, sourceListFiles } from "./sources.mjs";

/** The User-Agent of every request: the site that asks. */
export const USER_AGENT = "addablelabs.se source check (+https://addablelabs.se)";

/** How long one request may take, its body included. */
export const TIMEOUT_MS = 20_000;

/** The wait before the one retry a network error or a timeout gets. */
export const RETRY_DELAY_MS = 2_000;

/** Redirects followed before a page counts as unreachable. */
export const MAX_REDIRECTS = 10;

/** The results, from the best to the worst. */
export const RESULTS = ["ok", "moved", "quote-missing", "unreachable"];

const REQUEST_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml;q=0.9,text/markdown;q=0.8,text/plain;q=0.8,*/*;q=0.5",
  // The same language every month, so a page that picks one by it lands on
  // the same URL every month.
  "accept-language": "en",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A network error or a timeout, in a few words. */
function describeError(error, timeoutMs) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return `timed out after ${timeoutMs / 1000} s`;
  const cause = error?.cause ?? error;
  const message = cause?.message ?? String(cause);
  return cause?.code && !message.includes(cause.code) ? `${cause.code}: ${message}` : message;
}

/** A response's body as text, in the charset its Content-Type names (UTF-8 when it names none). */
async function bodyText(response) {
  const buffer = await response.arrayBuffer();
  const charset = /charset\s*=\s*"?([^";\s]+)/i.exec(response.headers.get("content-type") ?? "")?.[1] ?? "utf-8";
  let decoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  return decoder.decode(buffer);
}

/**
 * Fetch a page as a reader's browser would reach it, one request at a time:
 * every redirect is followed by hand and recorded, so the chain is known.
 * The fragment never reaches the server; the final URL carries it on, as a
 * browser does, unless a redirect names a fragment of its own. A network
 * error or a timeout gets one retry, after `retryDelayMs`.
 *
 * @returns {Promise<{url: string, hops: {url: string, status: number, location: string}[],
 *   status: number|null, finalUrl: string, contentType: string, body: string,
 *   error: string|null, retried: boolean, seconds: number}>}
 */
export async function fetchPage(url, { fetch = globalThis.fetch, timeoutMs = TIMEOUT_MS, retryDelayMs = RETRY_DELAY_MS } = {}) {
  const started = performance.now();
  const hops = [];
  let retried = false;
  let current = new URL(url);
  let fragment = current.hash;
  current.hash = "";
  const page = (fields) => ({ url, hops, status: null, finalUrl: `${current.href}${fragment}`, contentType: "", body: "", error: null, retried, ...fields, seconds: (performance.now() - started) / 1000 });
  for (;;) {
    let response;
    let body = "";
    for (;;) {
      try {
        response = await fetch(current.href, { redirect: "manual", headers: REQUEST_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
        const redirect = response.status >= 300 && response.status < 400 && response.headers.has("location");
        if (redirect) await response.body?.cancel();
        else body = await bodyText(response);
        break;
      } catch (error) {
        if (retried) return page({ error: `${describeError(error, timeoutMs)}, also on the one retry` });
        retried = true;
        await wait(retryDelayMs);
      }
    }
    const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
    if (location === null) {
      return page({ status: response.status, contentType: response.headers.get("content-type") ?? "", body });
    }
    hops.push({ url: current.href, status: response.status, location });
    if (hops.length > MAX_REDIRECTS) return page({ error: `more than ${MAX_REDIRECTS} redirects` });
    let next;
    try {
      next = new URL(location, current);
    } catch {
      return page({ error: `a redirect to ${JSON.stringify(location)}, which is not a URL` });
    }
    if (next.hash) fragment = next.hash;
    next.hash = "";
    current = next;
  }
}

// What a page shows as text: no script, style or template, nothing of the
// document's head, and none of an inline drawing's labels.
const HIDDEN = new Set(["head", "script", "style", "noscript", "template", "svg", "math", "iframe", "object", "canvas"]);

// Elements a browser lays out as blocks or cells: their text never runs on
// into the next one's ("Copy as Markdown" in one, "Overview" in the next).
const BLOCKS = new Set([
  "address", "article", "aside", "blockquote", "body", "br", "button", "caption", "dd", "details", "dialog", "div", "dl",
  "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "html",
  "img", "input", "label", "legend", "li", "main", "menu", "nav", "ol", "option", "p", "pre", "section", "select",
  "summary", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "tr", "ul",
]);

/**
 * The text an HTML page shows, entities decoded and whitespace collapsed,
 * and the ids (and names) a link's fragment can point at.
 */
export function htmlText(html) {
  // node-html-parser keeps a doctype as text, and by default the inside of a
  // <pre> as raw markup: parse <pre> as HTML, so its code reads as text.
  const root = parseHtml(html.replace(/^\s*<!doctype[^>]*>/i, ""), { blockTextElements: { script: true, noscript: true, style: true } });
  const parts = [];
  const ids = new Set();
  const walk = (node) => {
    if (node.nodeType === 3) {
      parts.push(node.text);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node.rawTagName ?? "").toLowerCase();
    if (HIDDEN.has(tag)) return;
    for (const attribute of ["id", "name"]) {
      const value = node.getAttribute?.(attribute);
      if (value) ids.add(value);
    }
    const block = BLOCKS.has(tag);
    if (block) parts.push(" ");
    for (const child of node.childNodes) walk(child);
    if (block) parts.push(" ");
  };
  walk(root);
  return { text: parts.join("").replace(/\s+/g, " ").trim().normalize("NFC"), ids };
}

/**
 * The text of a fetched page: an HTML page's as `htmlText` reads it; a
 * Markdown page's (text/markdown, or a URL ending .md) as `plainText` reads
 * an article; anything else as it comes, whitespace collapsed. `ids` is null
 * when the page is not HTML.
 */
export function pageText(body, contentType = "", url = "") {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const pathname = URL.canParse(url) ? new URL(url).pathname : "";
  if (type === "text/markdown" || type === "text/x-markdown" || /\.(?:md|mdx|markdown)$/i.test(pathname)) {
    return { text: plainText(body).normalize("NFC"), ids: null };
  }
  if (type.includes("html") || (type === "" && /^\s*<(?:!doctype|html|head|body)\b/i.test(body))) return htmlText(body);
  return { text: body.replace(/\s+/g, " ").trim().normalize("NFC"), ids: null };
}

// Characters a page and a quote may write differently and mean the same:
// typographic double quotes, single quotes and apostrophes, dashes.
const SAME = new Map();
for (const char of "\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u301D\u301E\uFF02") SAME.set(char, '"');
for (const char of "\u2018\u2019\u201A\u201B\u2032\u2039\u203A\uFF07") SAME.set(char, "'");
for (const char of "\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D") SAME.set(char, "-");

// Characters that are no text at all: the backtick, which marks code in a
// quote written in Markdown and is not on an HTML page, a soft hyphen, the
// zero-width characters.
const NOTHING = new Set(["`", "\u00AD", "\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"]);

const WHITESPACE = /\s/u;

/**
 * Text folded for matching: whitespace collapsed, typographic quotes,
 * apostrophes and dashes made plain, backticks and invisible characters
 * dropped, case ignored. `at[i]` is the index in `text` of the character
 * that gave `folded[i]`, so a passage found in the folded text can be shown
 * as the page wrote it.
 */
export function fold(text) {
  let folded = "";
  const at = [];
  let space = true;
  for (let index = 0; index < text.length; ) {
    const char = String.fromCodePoint(text.codePointAt(index));
    const next = index + char.length;
    if (WHITESPACE.test(char)) {
      if (!space) {
        folded += " ";
        at.push(index);
        space = true;
      }
    } else if (!NOTHING.has(char)) {
      const plain = SAME.get(char) ?? char;
      const lower = plain.toLowerCase();
      const out = lower.length === plain.length ? lower : plain;
      folded += out;
      for (let k = 0; k < out.length; k += 1) at.push(index);
      space = false;
    }
    index = next;
  }
  if (folded.endsWith(" ")) {
    folded = folded.slice(0, -1);
    at.pop();
  }
  return { folded, at };
}

// An omission in a quote: "…" or "...", bare or in brackets.
const ELLIPSIS = /\[\s*(?:…|\.{3,})\s*\]|\(\s*(?:…|\.{3,})\s*\)|…|\.{3,}/u;

/** The parts of a quote that must all be on the page, in order: the text between its omissions. */
export function quoteParts(quote) {
  return quote
    .normalize("NFC")
    .split(ELLIPSIS)
    .map((piece) => {
      const text = piece.trim();
      return { text, ...fold(text) };
    })
    .filter((part) => part.folded !== "");
}

/** At most `length` characters of `text` before `end`, not before `start`, with "…" where they were cut. */
function before(text, end, length, start = 0) {
  const from = Math.max(start, end - length);
  return `${from > start ? "…" : ""}${text.slice(from, end)}`;
}

/** At most `length` characters of `text` from `start`, not past `end`, with "…" where they were cut. */
function after(text, start, length, end = text.length) {
  const to = Math.min(end, start + length);
  return `${text.slice(start, to)}${to < end ? "…" : ""}`;
}

const SHOWN = 60; // characters a note shows of a page or a quote on each side of a difference

/** The index just past the character that starts at `index`: a surrogate pair is one character. */
function endOf(text, index) {
  return index + String.fromCodePoint(text.codePointAt(index)).length;
}

/**
 * Why a part of a quote is not on the page, in a sentence the agent can act
 * on: the part is there but out of order, or where the page and the quote
 * part ways — the longest start (or end) of the part the page has, then what
 * the page says next (or before) and what the quote says, each in its own
 * words.
 */
function missingNote(part, previous, page, from) {
  const { folded, at, text } = page;
  if (previous && folded.indexOf(part.folded) !== -1) {
    return `«${after(part.text, 0, SHOWN)}» is on the page, but not after «${after(previous.text, 0, SHOWN)}»`;
  }
  const longest = (piece) => {
    let low = 0;
    let high = part.folded.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (folded.indexOf(piece(mid), from) !== -1) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const head = longest((k) => part.folded.slice(0, k));
  const tail = longest((k) => part.folded.slice(part.folded.length - k));
  if (Math.max(head, tail) < Math.min(12, part.folded.length)) {
    return `the page has no passage like «${after(part.text, 0, SHOWN)}»`;
  }
  if (head >= tail) {
    // The page has the part's first `head` characters, then something else.
    const found = folded.indexOf(part.folded.slice(0, head), from);
    const pageEnd = endOf(text, at[found + head - 1]);
    const quoteEnd = endOf(part.text, part.at[head - 1]);
    const pageSide = `${before(text, pageEnd, 40, at[found])}${after(text, pageEnd, SHOWN)}`;
    const quoteSide = `${before(part.text, quoteEnd, 40)}${after(part.text, quoteEnd, SHOWN)}`;
    return `the page reads «${pageSide}» where the quote has «${quoteSide}»`;
  }
  // The page has the part's last `tail` characters, after something else.
  const found = folded.indexOf(part.folded.slice(part.folded.length - tail), from);
  const pageStart = at[found];
  const quoteStart = part.at[part.folded.length - tail];
  const pageSide = `${before(text, pageStart, SHOWN)}${after(text, pageStart, 40, endOf(text, at[found + tail - 1]))}`;
  const quoteSide = `${before(part.text, quoteStart, SHOWN)}${after(part.text, quoteStart, 40)}`;
  return `the page reads «${pageSide}» where the quote has «${quoteSide}»`;
}

/**
 * Look for a quote in a page's text: each part of it (`quoteParts`) must be
 * in the folded text (`fold`), after the one before. `{ found, note }`, the
 * note saying where the page parts ways with the quote.
 *
 * @param {string} quote
 * @param {{text: string, folded: string, at: number[]}} page  the page's text, and `fold` of it
 */
export function findQuote(quote, page) {
  const parts = quoteParts(quote);
  if (parts.length === 0) return { found: false, note: "the quote has no words outside its omissions" };
  let from = 0;
  for (const [index, part] of parts.entries()) {
    const found = page.folded.indexOf(part.folded, from);
    if (found === -1) return { found: false, note: missingNote(part, parts[index - 1], page, from) };
    from = found + part.folded.length;
  }
  return { found: true, note: "" };
}

/** Two URLs name the same page: equal once parsed, the fragment left out. */
export function samePage(a, b) {
  if (!URL.canParse(a) || !URL.canParse(b)) return false;
  const [one, two] = [new URL(a), new URL(b)];
  one.hash = "";
  two.hash = "";
  return one.href === two.href;
}

/** Where a redirect sent the check: its Location resolved, or as given when it is no URL. */
function hopTarget(hop) {
  return URL.canParse(hop.location, hop.url) ? new URL(hop.location, hop.url).href : JSON.stringify(hop.location);
}

/** The statuses of a page's responses, as "301 → 308 → 200". */
export function statusChain(page) {
  return [...page.hops.map((hop) => hop.status), page.status ?? "—"].join(" → ");
}

/**
 * The result of one entry, given the page its url led to (`fetchPage`, its
 * text read once per page: `{ ...page, text: pageText, folded, at, ids }`).
 */
export function judge(entry, page) {
  const notes = [];
  const result = (name) => ({
    entry,
    result: name,
    status: page.status,
    statuses: statusChain(page),
    final_url: page.finalUrl,
    hops: page.hops,
    note: notes.join("; "),
  });
  if (page.hops.length > 0) notes.push(`redirected ${page.hops.map((hop) => `${hop.status} to ${hopTarget(hop)}`).join(", then ")}`);
  if (page.error) {
    notes.unshift(page.error);
    return result("unreachable");
  }
  if (page.status < 200 || page.status > 299) {
    notes.unshift(`HTTP ${page.status}`);
    return result("unreachable");
  }
  if (page.retried) notes.push("answered on the one retry");
  const moved = !samePage(page.finalUrl, entry.final_url);
  if (moved) notes.unshift(`final_url is ${entry.final_url}`);
  const quote = findQuote(entry.quote, page);
  if (!quote.found) notes.unshift(`quote not found: ${quote.note}`);
  const fragment = new URL(page.finalUrl).hash.slice(1);
  if (fragment && page.ids && !fragment.startsWith(":~:")) {
    let id = fragment;
    try {
      id = decodeURIComponent(fragment);
    } catch {
      // a malformed escape: look for the fragment as written
    }
    if (!page.ids.has(id)) notes.push(`the page has no element with id ${JSON.stringify(id)}, the link's fragment`);
  }
  return result(!quote.found ? "quote-missing" : moved ? "moved" : "ok");
}

/**
 * Check every entry of the lists, one page at a time: each URL is fetched
 * once (without its fragment) however many entries cite it, so one host
 * never gets two requests at once. `log` hears one line per page fetched.
 *
 * @param {{file: string, label: string, article: string, entries: object[]}[]} lists
 */
export async function checkSources(lists, { fetch, timeoutMs, retryDelayMs, log = () => {} } = {}) {
  const pages = new Map();
  const results = [];
  for (const list of lists) {
    for (const entry of list.entries) {
      const address = new URL(entry.url);
      address.hash = "";
      if (!pages.has(address.href)) {
        const fetched = await fetchPage(address.href, { fetch, timeoutMs, retryDelayMs });
        const shown = fetched.status !== null && fetched.status >= 200 && fetched.status <= 299 ? pageText(fetched.body, fetched.contentType, fetched.finalUrl) : { text: "", ids: null };
        pages.set(address.href, { ...fetched, body: undefined, ...shown, ...fold(shown.text) });
        log(`${address.href} → ${statusChain(fetched)}${fetched.error ? ` (${fetched.error})` : ""} in ${fetched.seconds.toFixed(1)} s`);
      }
      const page = pages.get(address.href);
      // The entry's own fragment, unless a redirect named one.
      const finalUrl = new URL(page.finalUrl);
      if (!finalUrl.hash) finalUrl.hash = new URL(entry.url).hash;
      results.push({ list: list.label, article: list.article, ...judge(entry, { ...page, url: entry.url, finalUrl: finalUrl.href }) });
    }
  }
  return { results, pages: pages.size };
}

/** How many entries got each result. */
export function tally(results) {
  return Object.fromEntries(RESULTS.map((name) => [name, results.filter((result) => result.result === name).length]));
}

/** "1 entry", "2 entries". */
function count(number, one, many = `${one}s`) {
  return `${number} ${number === 1 ? one : many}`;
}

/** The one line that sums a run up. */
export function summaryLine(run) {
  const counts = tally(run.results);
  return `${RESULTS.map((name) => `${counts[name]} ${name}`).join(", ")} (${count(run.results.length, "entry", "entries")} in ${count(run.lists.length, "source list")}, ${count(run.pages, "page")}, ${run.seconds.toFixed(1)} s)`;
}

/** A Markdown table cell: no line break, no bare pipe. */
function cell(text) {
  return String(text ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

/**
 * The report: per article, a row per entry with its id, result, statuses,
 * final URL and note.
 *
 * @param {{checkedAt: Date, seconds: number, pages: number, lists: object[], results: object[]}} run
 */
export function markdownReport(run) {
  const lines = ["# Source check", "", `Checked ${run.checkedAt.toISOString().slice(0, 16).replace("T", " ")} UTC: ${summaryLine(run)}.`];
  if (run.lists.length === 0) lines.push("", `No source lists: ${SOURCES_DIR}/ holds none.`);
  for (const list of run.lists) {
    lines.push("", `## ${list.article}`, "", `\`${list.label}\`: ${count(list.entries.length, "entry", "entries")}.`, "");
    lines.push("| Id | Result | Status | Final URL | Note |", "| --- | --- | --- | --- | --- |");
    for (const row of run.results.filter((result) => result.list === list.label)) {
      lines.push(`| ${cell(row.entry.id)} | ${cell(row.result)} | ${cell(row.statuses)} | ${cell(row.final_url)} | ${cell(row.note)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

/** The report as data: the run, and per entry the entry as listed and what the check found. */
export function jsonReport(run) {
  return `${JSON.stringify(
    {
      checkedAt: run.checkedAt.toISOString(),
      seconds: Number(run.seconds.toFixed(1)),
      summary: { entries: run.results.length, lists: run.lists.length, pages: run.pages, ...tally(run.results) },
      lists: run.lists.map((list) => ({ file: list.label, article: list.article, entries: list.entries.length })),
      results: run.results.map((row) => ({
        file: row.list,
        article: row.article,
        id: row.entry.id,
        result: row.result,
        status: row.status,
        final_url: row.final_url,
        hops: row.hops,
        note: row.note,
        entry: row.entry,
      })),
    },
    null,
    2,
  )}\n`;
}

export const USAGE = `usage: pnpm sources:check [--out <file>] [--json <file>] [--no-article-check] [file ...]

Checks every entry of the source lists (default: every ${SOURCES_DIR}/*.yaml)
against the live page: fetches its url, following redirects, compares where it
ends with final_url and looks for the quote. One result per entry: ok, moved,
quote-missing or unreachable.

  --out <file>        write the Markdown report to <file> instead of stdout
  --json <file>       also write the report as JSON to <file>
  --no-article-check  do not check that each list's article exists in src/ and
                      holds its sentences (for a list written before its article)

Exit 0 when every entry is ok, 1 when one is not, 2 on a usage or format error
(nothing is fetched then) or when the check cannot run. It never writes to
${SOURCES_DIR}/ or src/.`;

/** Parse the command line: `{ files, out, json, checkArticles }`, or `{ error }`. */
export function parseArguments(argv) {
  const options = { files: [], out: null, json: null, checkArticles: true, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const [flag, inline] = argument.startsWith("--") && argument.includes("=") ? [argument.slice(0, argument.indexOf("=")), argument.slice(argument.indexOf("=") + 1)] : [argument, null];
    if (flag === "--out" || flag === "--json") {
      const value = inline ?? argv[(index += 1)];
      if (!value || value.startsWith("--")) return { error: `${flag} needs a file` };
      options[flag.slice(2)] = value;
    } else if (argument === "--no-article-check") {
      options.checkArticles = false;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--") {
      options.files.push(...argv.slice(index + 1));
      break;
    } else if (argument.startsWith("-")) {
      return { error: `unknown option ${argument}` };
    } else {
      options.files.push(argument);
    }
  }
  return options;
}

/** Is `file` `dir` itself or inside it? */
function isInside(file, dir) {
  const relative = path.relative(dir, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * The command (scripts/sources-check.mjs): parse the arguments, read and
 * validate every list — a problem stops it before any request — check every
 * entry, write the report, and return the exit code. Everything it touches
 * comes in through `io`, so the tests run it against a local server.
 */
export async function main(argv, io = {}) {
  const { fetch = globalThis.fetch, stdout = process.stdout, stderr = process.stderr, root = ROOT, src = path.join(root, "src"), cwd = process.cwd(), timeoutMs, retryDelayMs, now = () => new Date() } = io;
  const say = (stream, text) => stream.write(`${text}\n`);
  const options = parseArguments(argv);
  if (options.error) {
    say(stderr, `sources:check: ${options.error}\n\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    say(stdout, USAGE);
    return 0;
  }
  const label = (file) => (isInside(file, root) ? path.relative(root, file) : file);
  const sourcesDir = path.join(root, SOURCES_DIR);
  let files;
  const problems = [];
  if (options.files.length > 0) {
    files = [...new Set(options.files.map((file) => path.resolve(cwd, file)))];
    for (const file of files) {
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) {
        say(stderr, `sources:check: no such file: ${file}\n\n${USAGE}`);
        return 2;
      }
    }
  } else {
    const listing = await sourceListFiles(sourcesDir, { label });
    files = listing.files;
    problems.push(...listing.problems);
  }
  // The founder's rule: the check never writes to a list or an article.
  for (const flag of ["out", "json"]) {
    if (!options[flag]) continue;
    const target = path.resolve(cwd, options[flag]);
    const forbidden = [sourcesDir, src].find((dir) => isInside(target, dir));
    if (forbidden || files.includes(target)) {
      say(stderr, `sources:check: --${flag} ${options[flag]}: the check never writes to ${forbidden ? `${label(forbidden)}/` : "a source list"}\n\n${USAGE}`);
      return 2;
    }
    const directory = await stat(path.dirname(target)).catch(() => null);
    if (!directory?.isDirectory()) {
      say(stderr, `sources:check: --${flag} ${options[flag]}: no such directory\n\n${USAGE}`);
      return 2;
    }
    options[flag] = target;
  }
  if (options.out && options.out === options.json) {
    say(stderr, `sources:check: --out and --json name the same file\n\n${USAGE}`);
    return 2;
  }
  const lists = [];
  for (const file of files) {
    const list = await readSourceList(file, { src, label: label(file), checkArticles: options.checkArticles });
    problems.push(...list.problems);
    lists.push({ ...list, label: label(file) });
  }
  if (problems.length > 0) {
    for (const problem of problems) say(stderr, problem);
    say(stderr, `sources:check: ${count(problems.length, "format problem")}; nothing was fetched`);
    return 2;
  }
  const checkedAt = now();
  const started = performance.now();
  const { results, pages } = await checkSources(lists, { fetch, timeoutMs, retryDelayMs, log: (line) => say(stderr, line) });
  const run = { checkedAt, seconds: (performance.now() - started) / 1000, pages, lists, results };
  const report = markdownReport(run);
  if (options.out) {
    await writeFile(options.out, report);
    say(stdout, `sources:check: ${summaryLine(run)}; report in ${options.out}`);
  } else {
    stdout.write(report);
  }
  if (options.json) await writeFile(options.json, jsonReport(run));
  return results.every((row) => row.result === "ok") ? 0 : 1;
}
