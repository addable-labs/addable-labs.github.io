// The names that become URLs (si-2a7h), shared by eleventy.config.js and the
// unit tests. An article's URL is its file's name
// (src/<lang>/blog/posts/<slug>.md → /blog/<slug>/, posts.11tydata.js) and a
// page's is its path under src/ (en.11tydata.js, sv.11tydata.js), so a file's
// name is part of an address the site publishes. The build holds every URL it
// forms to the rule below, refuses the file names Eleventy would change on
// the way to the URL (si-ok07) and a file in a subdirectory of posts/
// (si-73wj), and the articles of one date are ordered by those names the same
// way on every machine.

import { isSlug } from "./frontmatter.mjs";

// Articles live directly in src/<lang>/blog/posts/, as <slug>.md; the same
// slug in both languages.
export const ARTICLE_PATH = /^\.?\/?src\/([^/]+)\/blog\/posts\/[^/]+\.md$/;

// A file in a subdirectory of posts/, as src/en/blog/posts/sub/name.md, with
// that subdirectory, "sub". The posts directory's data file
// (posts.11tydata.js) reaches into its subdirectories, so Eleventy makes such
// a file an article all the same, with the article layout and /blog/name/,
// while ARTICLE_PATH, the collections and the gates take only the files
// directly in posts/.
const IN_POSTS_SUBDIRECTORY = /^\.?\/?src\/[^/]+\/blog\/posts\/(?<dir>.+)\/[^/]+$/;

// A date and the hyphen after it, Eleventy's own pattern for a date in a file
// name (TemplateFileSlug.js, Eleventy 3.1.6). It is not anchored: Eleventy
// drops the first date it finds anywhere in the name, and everything before
// it, when it makes the URL. A date at the end of a name has no hyphen after
// it and stays.
const DATE_IN_NAME = /\d{4}-\d{2}-\d{2}-/;

// The one exception to "every part is a slug": the last part of a URL that
// does not end in "/" names a file, as in /feed.xml or /404.html, and may
// carry one extension of lowercase letters or digits.
const FILE_NAME = /^(?<stem>[^.]*)\.[a-z0-9]+$/;

function isFileName(part) {
  const match = FILE_NAME.exec(part);
  return match !== null && isSlug(match.groups.stem);
}

/**
 * What is wrong with a URL the build gives a page, or null when nothing is.
 *
 * Split on "/", with the empty parts dropped, every part must be a slug —
 * lowercase letters, digits and single hyphens, the rule `translationKey`
 * already follows — except that the last part of a URL that does not end in
 * "/" may be a file name: a slug and one extension. A "#", "?" or "%" would
 * be read as a fragment, a query or an escape; a letter outside ASCII is
 * percent-encoded in the sitemap and the feeds; a capital makes an address
 * that differs from the one people type. A page with no URL (permalink:
 * false) has nothing to check.
 *
 * The reason names every part that breaks the rule: `URL /blog/a#b/ has "a#b"`.
 *
 * @param {string|false} url   a page's URL as Eleventy formed it
 */
export function urlProblem(url) {
  if (typeof url !== "string") return null;
  const parts = url.split("/").filter(Boolean);
  const fileName = url.endsWith("/") ? -1 : parts.length - 1;
  const bad = parts.filter((part, index) => !isSlug(part) && !(index === fileName && isFileName(part)));
  return bad.length === 0 ? null : `URL ${url} has ${bad.map((part) => JSON.stringify(part)).join(" and ")}`;
}

/**
 * The part of a file's name Eleventy would drop from the URL — everything up
 * to the first date and the hyphen after it, as "notes-2026-09-24-" of
 * notes-2026-09-24-name.md — or null when the name holds no such date.
 *
 * @param {string} inputPath  a file's path as Eleventy gives it, ./src/…
 */
function droppedPart(inputPath) {
  const name = inputPath.slice(inputPath.lastIndexOf("/") + 1);
  const date = DATE_IN_NAME.exec(name);
  return date === null ? null : name.slice(0, date.index + date[0].length);
}

/**
 * The subdirectory of posts/ a file is in — "sub" of
 * src/en/blog/posts/sub/name.md, "2026/09" of src/en/blog/posts/2026/09/name.md
 * — or null when the file is anywhere else, directly in posts/ included.
 *
 * @param {string} inputPath  a file's path as Eleventy gives it, ./src/…
 */
function postsSubdirectory(inputPath) {
  return IN_POSTS_SUBDIRECTORY.exec(inputPath)?.groups.dir ?? null;
}

/**
 * Hold every page's URL to `urlProblem`, every file's name to the two rules
 * that keep a name the URL it spells (si-ok07), and every file under posts/
 * to the rule that articles live directly there (si-73wj). Eleventy changes
 * two kinds of name on the way to the URL: it drops a date and everything
 * before it (2026-09-24-name.md and notes-2026-09-24-name.md both become
 * /blog/name/), and it names an index.md after its directory (an article
 * src/en/blog/posts/index.md becomes /blog/posts/). Either URL is made of
 * slugs, but the gates read an article's URL off its whole file name
 * (readArticleSources, site.mjs), so they would look for the page where the
 * build did not put it. A file's name is its URL on this site and a date
 * belongs in the front matter, so the build refuses such a name rather than
 * the gates learning Eleventy's rule. A file in a subdirectory of posts/,
 * such as src/en/blog/posts/sub/name.md, gets an article's layout and URL
 * from posts.11tydata.js, but the front-matter check, the draft rule and the
 * gates take only the files directly in posts/, so it was published
 * unchecked, even with draft: true; the build refuses it too. The names, and
 * where the files are, are checked whether or not a file has a URL: a draft
 * the production build leaves out has none there, and its name is refused
 * all the same.
 *
 * Throws one Error that lists each file at fault under the rule it breaks —
 * a URL part that is not a slug, a date in the name, an article named
 * index.md, a file in a subdirectory of posts/ — and states each rule;
 * returns nothing when every file passes.
 *
 * @param {Record<string, (string|false)[]>} inputPathToUrl  each input path
 *   with the URLs of its pages, as Eleventy's `eleventy.contentMap` event
 *   hands them over (a paginated template has several)
 */
export function checkPageUrls(inputPathToUrl) {
  const inputPaths = Object.keys(inputPathToUrl);
  const groups = [
    {
      heading: "These files give their pages URLs that are not made of slugs:",
      problems: Object.entries(inputPathToUrl)
        .flatMap(([inputPath, urls]) => urls.map((url) => [inputPath, urlProblem(url)]))
        .filter(([, problem]) => problem !== null)
        .map(([inputPath, problem]) => `${inputPath}: ${problem}`),
      rule: [
        'Each part of a URL must be lowercase letters, digits and single hyphens, as in /blog/ai-journey/; only a URL that does not end in "/" may end in one extension, as in /feed.xml.',
        "A file's name becomes its URL, so rename the file, or fix its permalink if it sets one.",
      ],
    },
    {
      heading: "These files have a date in their names:",
      problems: inputPaths
        .filter((inputPath) => droppedPart(inputPath) !== null)
        .map((inputPath) => `${inputPath}: Eleventy would drop ${JSON.stringify(droppedPart(inputPath))} from the URL`),
      rule: [
        "Eleventy drops a date and the hyphen after it (YYYY-MM-DD-) from a file name when it makes the URL, and everything before the date too.",
        "A file's name becomes its URL and an article's date goes in its front matter, so rename the file.",
      ],
    },
    {
      heading: "These articles are named index.md:",
      problems: inputPaths
        .filter((inputPath) => ARTICLE_PATH.test(inputPath) && inputPath.endsWith("/index.md"))
        .map((inputPath) => `${inputPath}: Eleventy would name it after its directory, ${JSON.stringify(inputPath.split("/").at(-2))}`),
      rule: ["An article's file name becomes its URL, and Eleventy names an index.md after its directory instead, so rename the file."],
    },
    {
      heading: "These files are in a subdirectory of posts/:",
      problems: inputPaths
        .filter((inputPath) => postsSubdirectory(inputPath) !== null)
        .map((inputPath) => `${inputPath}: in the subdirectory ${JSON.stringify(postsSubdirectory(inputPath))}`),
      rule: [
        "Eleventy gives a file in a subdirectory of posts/ an article's layout and URL, but the checks and the draft rule see only the files directly in posts/, so it would be published unchecked, even with draft: true.",
        "Articles live directly in src/<lang>/blog/posts/, so move the file there.",
      ],
    },
  ].filter(({ problems }) => problems.length > 0);
  if (groups.length === 0) return;
  throw new Error(groups.flatMap(({ heading, problems, rule }) => [heading, ...problems.sort().map((problem) => `  ${problem}`), ...rule]).join("\n"));
}

/**
 * The order of a language's articles: newest first, and articles of the same
 * date by their slugs, compared code unit by code unit.
 *
 * Not with localeCompare, which asks the build machine's locale. A letter
 * outside ASCII sorts after "z" in Swedish and before "b" in English, so
 * "åtta" and "bra" of one date could list one way on a Swedish Mac and the
 * other in CI; and even plain slugs move under Danish collation, where "aa"
 * is "å" and "aa-test" follows "zeta". Slugs are lowercase ASCII letters,
 * digits and hyphens (`urlProblem` sees to that), and for those code-unit
 * order is alphabetical order, on every machine.
 */
export function byDateDescThenSlug(a, b) {
  return b.date - a.date || (a.fileSlug < b.fileSlug ? -1 : a.fileSlug > b.fileSlug ? 1 : 0);
}
