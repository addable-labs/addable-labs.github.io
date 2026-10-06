// Source lists (si-1q9z, the founder's order of 6 October 2026): beside an
// article that rests on vendor documentation, a machine-readable list of the
// sentences it bases on a vendor's page, the page and the quote that page
// held. One file per article, both languages, in docs/sources/<slug>.yaml —
// outside src/, so it is never built and never shown on a page. A list is
// for the monthly check (`pnpm sources:check`, scripts/lib/source-check.mjs),
// which fetches every page again and looks for every quote; it is the
// contract between the article's author and the check:
//
//   - id: C3                    unique in the file; the research notes' id
//     article: <slug>           the article, the file's own name
//     sentence:
//       sv: "<the Swedish article's sentence or clause, verbatim, as plain text>"
//       en: "<the English one, verbatim, as plain text>"
//     vendor: Anthropic         who publishes the page
//     url: https://…            the link in the article
//     final_url: https://…      where it ended after redirects when last checked
//     quote: "…"                the words on the page the sentence rests on
//     retrieved: 2026-10-06     the day the quote was taken from the page
//     last_checked: 2026-10-06  the last day a check found it there
//
// The keys mirror the series plan's example field for field ("Underhåll av
// leverantörsdetaljer"), its Swedish keys in English like the rest of the
// repository. tests/sources.test.mjs holds every list in docs/sources/ to
// these rules (`validateSourceList`), offline, so an edit of an article that
// breaks one of its sentences fails `pnpm test` until the list follows.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

/** Where the source lists live, from the repository root. */
export const SOURCES_DIR = path.join("docs", "sources");

/** Every key of an entry, in the order the format lists them: exactly these. */
export const ENTRY_KEYS = ["id", "article", "sentence", "vendor", "url", "final_url", "quote", "retrieved", "last_checked"];

/** The languages of `sentence`, each a directory of articles under src/. */
export const SENTENCE_LANGUAGES = ["sv", "en"];

/**
 * The source lists in `dir`: every `.yaml` file, sorted, and a problem for
 * anything else there but a hidden file — a `.yml`, a note, a subdirectory —
 * which neither the schema test nor the check would ever read. A directory
 * that does not exist holds no lists. `label` gives the path a problem names.
 */
export async function sourceListFiles(dir, { label = (file) => file } = {}) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return { files: [], problems: [] };
    throw error;
  }
  const files = [];
  const problems = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const file = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".yaml")) files.push(file);
    else problems.push(`${label(file)}: not a source list; the directory holds only <article slug>.yaml files`);
  }
  return { files: files.sort(), problems };
}

/**
 * Read a list's YAML with js-yaml's core schema: no timestamp type, so a date
 * stays the text that was typed and the check below judges what was written
 * (frontmatter.mjs tells how YAML's dates once turned 2026-09-31 into
 * 1 October); no merge keys or other tags either. Throws on a syntax error
 * and on a key given twice.
 */
export function parseSourceList(text) {
  return yaml.load(text, { schema: yaml.CORE_SCHEMA });
}

/**
 * The body of an article file: what follows its front matter, split off as
 * the build splits it (gray-matter, as `frontMatterBlock` in frontmatter.mjs
 * reads it): a byte-order mark dropped, `----` no front matter at all, and
 * the block closed by the first line that starts with `---`. A sentence the
 * front matter holds — the description, say — is not in the body.
 */
export function articleBody(text) {
  const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
  if (!content.startsWith("---") || content.charAt(3) === "-") return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return "";
  const lineEnd = content.indexOf("\n", end + 4);
  return lineEnd === -1 ? "" : content.slice(lineEnd + 1);
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0" };

function decodeEntities(text) {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, decimal, hex, name) => {
    if (decimal || hex) {
      const code = decimal ? Number(decimal) : Number.parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/**
 * The text a reader reads in a piece of Markdown, whitespace collapsed: link
 * and image syntax, emphasis, code spans, headings, list and quote markers,
 * table pipes, HTML tags and the site's template tags ({% figure %},
 * {% games %}) are gone, a link's text stays. Both sides of the sentence
 * rule go through it — the article's body and the sentence the list quotes —
 * so a sentence may be written as plain text or with the article's own
 * Markdown, and it is found either way. The check reads a vendor's Markdown
 * page with it too (pageText, source-check.mjs).
 */
export function plainText(markdown) {
  let text = markdown.replace(/\r\n?/g, "\n");
  text = text
    .replace(/\{#[\s\S]*?#\}/g, " ")
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  text = text
    .split("\n")
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) return ""; // a code fence
      if (/^\s{0,3}\[[^\]]+\]:\s*\S/.test(line)) return ""; // a link reference definition
      if (/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line)) return ""; // a table's separator row, or a rule
      const bare = line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s{0,3}(?:>\s?)+/, "")
        .replace(/^\s*(?:[-*+]|\d{1,9}[.)])\s+/, "");
      return /^\s*\|/.test(bare) ? bare.replace(/\|/g, " ") : bare;
    })
    .join("\n");
  const destination = String.raw`(?:[^()\s]|\([^()\s]*\))*(?:\s+"[^"]*")?`;
  text = text
    .replace(new RegExp(String.raw`!\[[^\]]*\]\(${destination}\)`, "g"), " ")
    .replace(new RegExp(String.raw`\[([^\]]*)\]\(${destination}\)`, "g"), "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<((?:https?|mailto):[^>\s]+)>/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/\\([!-/:-@[-`{-~])/g, "$1")
    .replace(/`+/g, "")
    .replace(/\*+/g, "")
    .replace(/~~/g, "")
    // An underscore at a word's edge is emphasis; one inside a word, as in
    // project_doc_max_bytes, is the word's own.
    .replace(/(^|[^\p{L}\p{N}_])_+|_+(?=[^\p{L}\p{N}_]|$)/gu, "$1");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

/** An https URL with a host and nothing around it. */
function isHttpsUrl(value) {
  if (typeof value !== "string" || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "";
  } catch {
    return false;
  }
}

/** A day that exists, written YYYY-MM-DD. */
function isDay(value) {
  const parts = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (parts === null) return false;
  const [year, month, day] = parts.slice(1).map(Number);
  const when = new Date(Date.UTC(year, month - 1, day));
  return when.getUTCFullYear() === year && when.getUTCMonth() === month - 1 && when.getUTCDate() === day;
}

function quoted(value) {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

/**
 * Validate one source list: `{ ok, problems }`, every problem a line that
 * names the file and the entry, and the list itself unchanged.
 *
 * @param {*} entries                the parsed YAML
 * @param {object} options
 * @param {string} options.file      the list's path: its name is the article's slug
 * @param {object|null} [options.articles]
 *   the article's files, `{ sv, en }`, each its text or null when the file
 *   does not exist; null skips the two rules that read the articles (the
 *   article exists in both languages; each sentence is in its body), for a
 *   list written before its article, as `--no-article-check` does
 */
export function validateSourceList(entries, { file, articles = null }) {
  const problems = [];
  const slug = path.basename(file, ".yaml");
  if (!Array.isArray(entries) || entries.length === 0) {
    problems.push(`${file}: must be a YAML list of entries, got ${entries === undefined || entries === null ? "nothing" : Array.isArray(entries) ? "an empty list" : `a ${typeof entries === "object" ? "mapping" : typeof entries}`}`);
    return { ok: false, problems };
  }
  const bodies = {};
  if (articles) {
    const missing = SENTENCE_LANGUAGES.filter((lang) => typeof articles[lang] !== "string");
    if (missing.length > 0) {
      problems.push(`${file}: the article ${quoted(slug)} does not exist in ${missing.map((lang) => `src/${lang}/blog/posts/${slug}.md`).join(" or ")}`);
    }
    for (const lang of SENTENCE_LANGUAGES) {
      if (typeof articles[lang] === "string") bodies[lang] = plainText(articleBody(articles[lang]));
    }
  }
  const seen = new Map();
  entries.forEach((entry, index) => {
    const number = index + 1;
    const where = `${file}: entry ${number}${entry && typeof entry === "object" && isNonEmptyString(entry.id) ? ` (${entry.id})` : ""}`;
    const problem = (text) => problems.push(`${where}: ${text}`);
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      problem(`must be a mapping of the keys ${ENTRY_KEYS.join(", ")}, got ${quoted(entry)}`);
      return;
    }
    const missing = ENTRY_KEYS.filter((key) => !Object.hasOwn(entry, key));
    if (missing.length > 0) problem(`missing key${missing.length === 1 ? "" : "s"} ${missing.join(", ")}`);
    const unknown = Object.keys(entry).filter((key) => !ENTRY_KEYS.includes(key));
    if (unknown.length > 0) problem(`unknown key${unknown.length === 1 ? "" : "s"} ${unknown.join(", ")}; the keys are exactly ${ENTRY_KEYS.join(", ")}`);

    if (Object.hasOwn(entry, "id")) {
      if (!isNonEmptyString(entry.id)) problem(`id must be a non-empty string, got ${quoted(entry.id)}`);
      else if (seen.has(entry.id)) problem(`id ${quoted(entry.id)} is also entry ${seen.get(entry.id)}'s; an id is unique in the file`);
      else seen.set(entry.id, number);
    }
    if (Object.hasOwn(entry, "article") && entry.article !== slug) {
      problem(`article must be the file's name, ${quoted(slug)}, got ${quoted(entry.article)}`);
    }
    if (Object.hasOwn(entry, "sentence")) {
      const { sentence } = entry;
      if (sentence === null || typeof sentence !== "object" || Array.isArray(sentence)) {
        problem(`sentence must be a mapping of ${SENTENCE_LANGUAGES.join(" and ")}, got ${quoted(sentence)}`);
      } else {
        const absent = SENTENCE_LANGUAGES.filter((lang) => !Object.hasOwn(sentence, lang));
        if (absent.length > 0) problem(`sentence has no ${absent.join(" or ")}`);
        const other = Object.keys(sentence).filter((key) => !SENTENCE_LANGUAGES.includes(key));
        if (other.length > 0) problem(`sentence has ${other.join(", ")}; its keys are exactly ${SENTENCE_LANGUAGES.join(" and ")}`);
        for (const lang of SENTENCE_LANGUAGES) {
          if (!Object.hasOwn(sentence, lang)) continue;
          const text = sentence[lang];
          if (typeof text !== "string" || plainText(text) === "") {
            problem(`sentence.${lang} must be a non-empty string, got ${quoted(text)}`);
          } else if (bodies[lang] !== undefined && entry.article === slug && !bodies[lang].includes(plainText(text))) {
            problem(`sentence.${lang} is not in the body of src/${lang}/blog/posts/${slug}.md: ${quoted(plainText(text))}`);
          }
        }
      }
    }
    if (Object.hasOwn(entry, "vendor") && !isNonEmptyString(entry.vendor)) problem(`vendor must be a non-empty string, got ${quoted(entry.vendor)}`);
    for (const key of ["url", "final_url"]) {
      if (Object.hasOwn(entry, key) && !isHttpsUrl(entry[key])) problem(`${key} must be an https URL, got ${quoted(entry[key])}`);
    }
    if (Object.hasOwn(entry, "quote") && !isNonEmptyString(entry.quote)) problem(`quote must be a non-empty string, got ${quoted(entry.quote)}`);
    for (const key of ["retrieved", "last_checked"]) {
      if (Object.hasOwn(entry, key) && !isDay(entry[key])) problem(`${key} must be a real day, YYYY-MM-DD, got ${quoted(entry[key])}`);
    }
  });
  return { ok: problems.length === 0, problems };
}

async function readIfExists(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Read and validate one list file: `{ file, article, entries, problems }`,
 * the article's slug its file name. A file that is not YAML is one problem.
 *
 * @param {string} file              the list's path
 * @param {object} options
 * @param {string} options.src       the source tree its article lives in
 * @param {string} [options.label]   the path the problems name (default: `file`)
 * @param {boolean} [options.checkArticles]  false skips the article rules
 */
export async function readSourceList(file, { src, label = file, checkArticles = true }) {
  const article = path.basename(file, ".yaml");
  let entries;
  try {
    entries = parseSourceList(await readFile(file, "utf8"));
  } catch (error) {
    return { file, article, entries: [], problems: [`${label}: not valid YAML: ${error.message.split("\n")[0]}`] };
  }
  let articles = null;
  if (checkArticles) {
    articles = {};
    for (const lang of SENTENCE_LANGUAGES) articles[lang] = await readIfExists(path.join(src, lang, "blog", "posts", `${article}.md`));
  }
  const { problems } = validateSourceList(entries, { file: label, articles });
  return { file, article, entries: problems.length === 0 ? entries : [], problems };
}
