// Shared helpers for the quality gates: where the built site and the source
// tree are, how to walk them, how URLs map to output files, and how to read
// site.js, the strings files and the article sources.
//
// Every gate accepts an optional built-site directory as its first argument
// and an optional source directory as its second (defaults: _site and src
// under the repository root), so the tests under tests/ can point a gate at a
// fixture instead of the real build.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { eleventyDate, frontMatterBlock, isOmitted, isScheduled, parseFrontMatter } from "./frontmatter.mjs";
import { byDateDescThenSlug } from "./urls.mjs";

export const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);

/** Resolve the output and source directories from argv / environment. */
export function resolveDirs(argv = process.argv.slice(2)) {
  const out = path.resolve(argv[0] || process.env.CHECK_OUT || path.join(ROOT, "_site"));
  const src = path.resolve(argv[1] || process.env.CHECK_SRC || path.join(ROOT, "src"));
  return { out, src };
}

/** Load src/_data/site.js (honours SITE_URL like the build does). */
export async function loadSite(srcDir) {
  const module = await import(pathToFileURL(path.join(srcDir, "_data", "site.js")).href);
  return module.default;
}

/** Load the strings files as { en: {...}, sv: {...} }. */
export async function loadStrings(srcDir, site) {
  const strings = {};
  for (const lang of site.languages.codes) {
    strings[lang] = JSON.parse(await readFile(path.join(srcDir, "_data", "strings", `${lang}.json`), "utf8"));
  }
  return strings;
}

/** Flatten a nested strings object to "a.b.c" keys. */
export function flattenKeys(object, prefix = "", into = {}) {
  for (const [key, value] of Object.entries(object)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flattenKeys(value, name, into);
    else into[name] = value;
  }
  return into;
}

/** Recursively list files under dir (absolute paths, sorted), optionally filtered by extension. */
export async function walk(dir, extension) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full, extension)));
    else if (entry.isFile() && (!extension || entry.name.endsWith(extension))) files.push(full);
  }
  return files.sort();
}

/** "sv" for files under <out>/sv/, otherwise the default language. */
export function langFromPath(relPath, site) {
  const first = relPath.split(path.sep)[0];
  return site.languages.codes.includes(first) && first !== site.languages.default ? first : site.languages.default;
}

/**
 * What a language's URLs start with: "" for the default language, at the
 * root; "/sv" for "sv". The templates get the same value from `langPrefix`
 * in src/src.11tydata.js.
 */
export function langPrefix(lang, site) {
  return lang === site.languages.default ? "" : `/${lang}`;
}

/** Output file → site URL ("/about/index.html" → "/about/", "/feed.xml" → "/feed.xml"). */
export function fileToUrl(relPath) {
  const posix = relPath.split(path.sep).join("/");
  if (posix === "index.html") return "/";
  if (posix.endsWith("/index.html")) return `/${posix.slice(0, -"index.html".length)}`;
  return `/${posix}`;
}

/** Strip the site origin, query and fragment from a URL; null when it is not internal. */
export function internalPath(url, site) {
  if (!url) return null;
  let value = url.trim();
  if (/^(mailto|tel|javascript|data):/i.test(value)) return null;
  if (value.startsWith("#")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//")) {
    const origin = site.url.replace(/\/$/, "");
    if (value.startsWith(`${origin}/`) || value === origin) {
      value = value.slice(origin.length) || "/";
    } else {
      return null; // external
    }
  }
  value = value.split("#")[0].split("?")[0];
  return value;
}

/** Candidate output files for an internal URL path ("/x/" → x/index.html, "/x" → x or x/index.html). */
export function candidatesForPath(urlPath) {
  const clean = decodeURIComponent(urlPath.replace(/^\//, ""));
  if (clean === "") return ["index.html"];
  if (clean.endsWith("/")) return [`${clean}index.html`];
  return [clean, `${clean}/index.html`];
}

export async function exists(file) {
  try {
    const info = await stat(file);
    return info.isFile();
  } catch {
    return false;
  }
}

/**
 * Articles of a language from the source tree: slug, draft flag, title,
 * category, url path, date, and what this build owes each one. The gates
 * read the source tree, so they see every article; these three flags say
 * what the built site must therefore show, and they read the same rules the
 * build does (frontmatter.mjs), so the two cannot drift:
 *
 *   scheduled — dated after today (si-gxyg): built at its URL, listed nowhere
 *   omitted   — a draft in the production build (si-mzf1): no page at all
 *   listed    — neither of the above: built and in every listing
 *
 * `omitted` follows SITE_ENV, which the gates inherit from the build that
 * produced the site they are checking, so `pnpm check` asserts the right
 * thing in both modes: locally a draft is present and listed, in CI it is
 * absent everywhere. `scheduled` takes today from SITE_NOW when it is set
 * (`siteNow`, frontmatter.mjs), and `pnpm check` sets it once for the build
 * and every gate, so the two agree on the day even across midnight.
 *
 * The front matter is read with the build's own parser (`parseFrontMatter`,
 * si-8zyg), so every value means here what it means to the build: a quoted
 * date without its quotes, `draft: True` a draft, and a date the text that
 * was typed, which `isScheduled` reads as Eleventy does. It is split off the
 * file by the build's rules too (`frontMatterBlock`, si-0eez), so an article
 * saved with Windows line endings or a byte-order mark, or opened with
 * `---yaml`, has here the front matter it has in the build.
 */
export async function readArticleSources(srcDir, site, lang) {
  const dir = path.join(srcDir, lang, "blog", "posts");
  // The .md files directly in posts/: the build refuses a template in a
  // subdirectory or of another type (checkPageUrls, urls.mjs), so these are
  // all of the language's articles.
  let files = [];
  try {
    files = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const prefix = langPrefix(lang, site);
  const articles = [];
  for (const name of files) {
    const file = path.join(dir, name);
    const data = parseFrontMatter(frontMatterBlock(await readFile(file, "utf8"), { file }) ?? "") ?? {};
    // The whole file name: the build refuses a name Eleventy would make
    // another URL of (checkPageUrls, urls.mjs), so it is the build's slug too.
    const slug = name.replace(/\.md$/, "");
    const draft = data.draft === true;
    const scheduled = isScheduled(data.date);
    const omitted = isOmitted({ draft });
    articles.push({
      slug,
      lang,
      draft,
      title: data.title,
      category: data.category,
      date: data.date,
      scheduled,
      omitted,
      listed: !omitted && !scheduled,
      path: `${prefix}/blog/${slug}/`,
      url: `${site.url}${prefix}/blog/${slug}/`,
    });
  }
  return articles;
}

/**
 * Articles from `readArticleSources` in the order every listing shows them:
 * newest first, and the articles of one date by slug. The comparison is the
 * build's own (`byDateDescThenSlug`, scripts/lib/urls.mjs), handed each
 * article as the collections hold it — the date as Eleventy maps it and the
 * file's slug — so a gate cannot order the articles one way and the build
 * another (si-thf3).
 */
export function newestFirst(articles) {
  return articles
    .map((article) => ({ article, date: eleventyDate(article.date), fileSlug: article.slug }))
    .sort(byDateDescThenSlug)
    .map(({ article }) => article);
}

/** A tiny result collector shared by the gates: ok()/fail() lines and a summary. */
export function reporter(gate) {
  let failures = 0;
  const quiet = process.env.CHECK_QUIET === "1";
  return {
    ok(message) {
      if (!quiet) console.log(`ok    ${message}`);
    },
    fail(message) {
      failures += 1;
      console.log(`FAIL  ${message}`);
    },
    warn(message) {
      console.log(`warn  ${message}`);
    },
    check(condition, message) {
      if (condition) this.ok(message);
      else this.fail(message);
      return condition;
    },
    get failures() {
      return failures;
    },
    finish() {
      if (failures > 0) {
        console.log(`FAIL ${gate} (${failures} problem${failures === 1 ? "" : "s"})`);
        process.exit(1);
      }
      console.log(`PASS ${gate}`);
    },
  };
}
