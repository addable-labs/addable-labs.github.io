// The names that become URLs (si-2a7h), shared by eleventy.config.js and the
// unit tests. An article's URL is its file's name
// (src/<lang>/blog/posts/<slug>.md → /blog/<slug>/, posts.11tydata.js) and a
// page's is its path under src/ (en.11tydata.js, sv.11tydata.js), so a file's
// name is part of an address the site publishes. The build holds every URL it
// forms to the rule below, and the articles of one date are ordered by those
// names the same way on every machine.

import { isSlug } from "./frontmatter.mjs";

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
 * Hold every page's URL to `urlProblem`. Throws one Error that lists each
 * file at fault with its URL and the parts that break the rule, then states
 * the rule; returns nothing when every URL passes.
 *
 * @param {Record<string, (string|false)[]>} inputPathToUrl  each input path
 *   with the URLs of its pages, as Eleventy's `eleventy.contentMap` event
 *   hands them over (a paginated template has several)
 */
export function checkPageUrls(inputPathToUrl) {
  const problems = Object.entries(inputPathToUrl)
    .flatMap(([inputPath, urls]) => urls.map((url) => [inputPath, urlProblem(url)]))
    .filter(([, problem]) => problem !== null)
    .map(([inputPath, problem]) => `  ${inputPath}: ${problem}`)
    .sort();
  if (problems.length === 0) return;
  throw new Error(
    [
      "These files give their pages URLs that are not made of slugs:",
      ...problems,
      'Each part of a URL must be lowercase letters, digits and single hyphens, as in /blog/ai-journey/; only a URL that does not end in "/" may end in one extension, as in /feed.xml.',
      "A file's name becomes its URL, so rename the file, or fix its permalink if it sets one.",
    ].join("\n"),
  );
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
