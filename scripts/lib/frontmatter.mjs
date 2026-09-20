// Article front-matter validation (REQ-018), shared by the Eleventy
// preprocessor in eleventy.config.js and the unit tests.
//
// Every article is one Markdown file per language under src/<lang>/blog/posts/
// with this front matter (documented in the README):
//
//   title: …                     non-empty string
//   description: …               non-empty string; listings, meta description, feed
//   date: 2026-09-20             a valid date (YAML date or ISO string)
//   category: app-development    a key from src/_data/categories.json
//   translationKey: some-slug    the same slug in both languages
//   draft: true                  boolean; published but labelled "Draft" / "Utkast"
//   machineTranslated: false     boolean; Swedish files: true until reviewed
//
// `lang` comes from the directory data file; an explicit per-file `lang` must
// equal the directory's.

export const REQUIRED_KEYS = [
  "title",
  "description",
  "date",
  "category",
  "translationKey",
  "draft",
  "machineTranslated",
];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSlug(value) {
  return typeof value === "string" && SLUG.test(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:[T ].*)?$/.test(value)) return false;
  return !Number.isNaN(new Date(value).getTime());
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
    problems.push(`date must be a valid date (YYYY-MM-DD), got ${JSON.stringify(data.date)}`);
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
  if (data.machineTranslated !== undefined && typeof data.machineTranslated !== "boolean") {
    problems.push(`machineTranslated must be true or false, got ${JSON.stringify(data.machineTranslated)}`);
  }
  if (dirLang && data.lang !== undefined && data.lang !== dirLang) {
    problems.push(`lang ${JSON.stringify(data.lang)} does not match the directory language ${JSON.stringify(dirLang)}`);
  }
  if (problems.length > 0) {
    throw new Error(`Invalid article front matter in ${file}: ${problems.join("; ")}`);
  }
  return problems;
}
