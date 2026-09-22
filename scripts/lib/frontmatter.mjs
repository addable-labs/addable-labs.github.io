// Article front-matter validation (REQ-018), shared by eleventy.config.js —
// the date as Eleventy maps it, everything else in a preprocessor — and the
// unit tests.
//
// Every article is one Markdown file per language under src/<lang>/blog/posts/
// with this front matter (documented in the README):
//
//   title: …                     non-empty string
//   description: …               non-empty string; listings, meta description, feed
//   date: 2026-09-20             a real date: YYYY-MM-DD, or a string with an
//                                ISO time, YYYY-MM-DDTHH:MM(:SS)(Z), read as UTC
//   category: app-development    a key from src/_data/categories.json
//   translationKey: some-slug    the same slug in both languages
//   draft: true                  boolean; built locally, left out of the public build
//   aiGenerated: true            boolean; AI produced this text, whatever the language
//   humanReviewed: false         boolean; a person has read this text
//
// `lang` comes from the directory data file; an explicit per-file `lang` must
// equal the directory's.

import process from "node:process";

export const REQUIRED_KEYS = [
  "title",
  "description",
  "date",
  "category",
  "translationKey",
  "draft",
  "aiGenerated",
  "humanReviewed",
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A scheduled article is one dated after today (founder ask 2026-09-22,
 * si-gxyg): it is built at its real URL but no listing shows it until the day
 * it is dated. The comparison is on the calendar date at UTC midnight, like
 * the site's `localeDate` and `isoDate` filters, so an article dated today is
 * listed all day whatever the build machine's timezone. The build reads this
 * from eleventy.config.js and the gates from scripts/lib/site.mjs, so the two
 * can never drift apart.
 */
export function isScheduled(date, now = new Date()) {
  const when = date instanceof Date ? date : new Date(date);
  return utcDay(when) > utcDay(now);
}

/**
 * Is this the production build — the one published to the public web?
 *
 * One explicit signal, `SITE_ENV=production`, set by the deployment workflow
 * (.github/workflows/pages.yml) and by nothing else. The default is
 * development: an unset or misspelt variable means local, so forgetting to
 * set something can never publish a draft. `ELEVENTY_RUN_MODE` cannot answer
 * this — `pnpm build` is the command both locally and in CI — so nothing
 * anywhere infers the mode any other way.
 */
export function isProductionBuild(env = process.env) {
  return env.SITE_ENV === "production";
}

/**
 * An omitted article is one the build leaves out altogether: no page at its
 * URL, no entry in any collection, and so nothing in the listings, the feeds
 * or the sitemap. A draft is omitted from the production build and only from
 * it (founder ask 2026-09-22, si-mzf1): he reviews drafts on localhost, so a
 * local build carries a draft like any other article — listed, reachable,
 * wearing its "Draft" / "Utkast" label — and the public build does not carry
 * it at all.
 *
 * That is a stronger rule than `isScheduled` above, and the two must not be
 * confused: a scheduled article IS built and IS reachable at its URL, just
 * unlisted, so it is unlisted, not secret. A draft is absent from production,
 * which is why the founder can keep an unfinished post in `main`.
 *
 * `draft` is validated as a boolean by `validateArticle`, so the build fails
 * on anything else rather than quietly publishing it. eleventy.config.js
 * reads this to drop the page and scripts/lib/site.mjs to tell the gates what
 * to expect, so the build and the gates can never drift apart.
 */
export function isOmitted({ draft }, production = isProductionBuild()) {
  return draft === true && production;
}

function utcDay(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isSlug(value) {
  return typeof value === "string" && SLUG.test(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The string date forms this gate accepts, named in the error message.
 */
const DATE_FORMS = "YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS)(Z)";

const DATE_STRING =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?)?$/;

function isRealCalendarDay(year, month, day) {
  const when = new Date(Date.UTC(year, month - 1, day));
  return (
    when.getUTCFullYear() === year && when.getUTCMonth() === month - 1 && when.getUTCDate() === day
  );
}

/**
 * Is this a date the build will accept?
 *
 * A YAML date (`date: 2026-09-22`, which the front-matter parser turns into a
 * Date at UTC midnight) arrives here as a Date and only has to be a real one.
 * A *string* date has a higher bar to clear: Eleventy parses it with Luxon —
 * `DateTime.fromISO(value, { zone: "utc" })` in @11ty/eleventy/src/Template.js
 * — and throws the whole build when Luxon says invalid. This gate runs just
 * before that parse (`validateArticleDate` below), so it must never accept a
 * string Luxon would reject: one it let through would still stop the build,
 * but in Eleventy's words, which name neither the rule nor the fix.
 *
 * `new Date()` cannot be the judge of that, because V8 is more forgiving than
 * Luxon in exactly the two ways a person writes a date by hand:
 *
 *   2026-09-22 23:00     a space for the T — V8 takes it, Luxon does not, and
 *                        a time without seconds is not a YAML timestamp either,
 *                        so it really does reach the build as a string
 *   "2026-02-30"         a day that does not exist — V8 rolls it over to
 *                        2 March, Luxon rejects it
 *
 * so the pattern spells the grammar out and the day is checked against the
 * calendar. Writing a time is worth supporting: two articles dated the same
 * day are ordered by the full timestamp (`byDateDescThenSlug` in
 * eleventy.config.js), so a time is the honest way to order them. Without a
 * zone it is read as UTC, like every other date on the site.
 *
 * The pattern is a little stricter than Luxon in corners nobody writes by hand
 * — ordinal dates (2026-266), week dates (2026-W39-2), the basic format
 * (20260922), hour 24 — and that is the safe direction: the gate may refuse
 * what the build would have taken, never the other way round.
 */
function isValidDate(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string") return false;
  const parts = DATE_STRING.exec(value);
  return parts !== null && isRealCalendarDay(Number(parts[1]), Number(parts[2]), Number(parts[3]));
}

function dateProblem(date) {
  return `date must be ${DATE_FORMS}, got ${JSON.stringify(date)}`;
}

function invalidFrontMatter(file, problems) {
  return new Error(`Invalid article front matter in ${file}: ${problems.join("; ")}`);
}

/**
 * Check an article's date on its own: throws the Error `validateArticle`
 * throws for that date, word for word, and returns nothing.
 *
 * eleventy.config.js calls this as Eleventy maps the date (si-xpn0), which
 * is before any preprocessor runs, so a bad date fails the build in our words
 * rather than in Eleventy's; `validateArticle` would come too late.
 *
 * A date Eleventy does not parse — none at all, or an empty one; it falls
 * back to the file's own dates instead — is left to `validateArticle`, which
 * reports it with the file's other problems.
 *
 * @param {*} date                   the date as the data cascade holds it
 * @param {object} [options]
 * @param {string} [options.file]    path used in the error message
 */
export function validateArticleDate(date, { file = "article" } = {}) {
  if (date && !isValidDate(date)) throw invalidFrontMatter(file, [dateProblem(date)]);
}

/**
 * Validate one article's data. Throws an Error whose message names the file
 * and every problem found; returns the list of problems (empty) otherwise.
 *
 * @param {object} data                 the template's data (front matter merged with the cascade)
 * @param {object} options
 * @param {string[]} options.allowedCategories  keys from categories.json
 * @param {string} [options.dirLang]    language of the directory the file lives in
 * @param {string} [options.file]       path used in the error message
 */
export function validateArticle(data, { allowedCategories, dirLang, file = "article" }) {
  const problems = [];
  const missing = REQUIRED_KEYS.filter((key) => data[key] === undefined || data[key] === null);
  if (missing.length > 0) {
    problems.push(`missing required key${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`);
  }
  if (data.title !== undefined && !isNonEmptyString(data.title)) {
    problems.push("title must be a non-empty string");
  }
  if (data.description !== undefined && !isNonEmptyString(data.description)) {
    problems.push("description must be a non-empty string");
  }
  if (data.date !== undefined && !isValidDate(data.date)) {
    problems.push(dateProblem(data.date));
  }
  if (data.category !== undefined && !allowedCategories.includes(data.category)) {
    problems.push(
      `unknown category ${JSON.stringify(data.category)}; allowed keys: ${allowedCategories.join(", ")}`,
    );
  }
  if (data.translationKey !== undefined && !isSlug(data.translationKey)) {
    problems.push(
      `translationKey must be a slug (lowercase letters, digits and single hyphens), got ${JSON.stringify(data.translationKey)}`,
    );
  }
  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    problems.push(`draft must be true or false, got ${JSON.stringify(data.draft)}`);
  }
  for (const key of ["aiGenerated", "humanReviewed"]) {
    if (data[key] !== undefined && typeof data[key] !== "boolean") {
      problems.push(`${key} must be true or false, got ${JSON.stringify(data[key])}`);
    }
  }
  if (dirLang && data.lang !== undefined && data.lang !== dirLang) {
    problems.push(`lang ${JSON.stringify(data.lang)} does not match the directory language ${JSON.stringify(dirLang)}`);
  }
  if (problems.length > 0) {
    throw invalidFrontMatter(file, problems);
  }
  return problems;
}
