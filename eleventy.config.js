import { readFileSync } from "node:fs";
import { IdAttributePlugin } from "@11ty/eleventy";
import { validateArticle } from "./scripts/lib/frontmatter.mjs";

// Paths copied verbatim into _site/. CNAME arrives in WI-08; Eleventy skips a
// missing passthrough source, so declaring it up front does not break the build.
const PASSTHROUGH = ["src/assets", "src/favicon.svg", "src/CNAME"];

const LANGUAGES = ["en", "sv"];
const CATEGORIES = JSON.parse(readFileSync(new URL("./src/_data/categories.json", import.meta.url), "utf8"));
const CATEGORY_KEYS = CATEGORIES.map((category) => category.key);

// Articles live in src/<lang>/blog/posts/<slug>.md; the same slug in both languages.
const ARTICLE_PATH = /^\.?\/?src\/([^/]+)\/blog\/posts\/[^/]+\.md$/;

// Newest first; equal dates fall back to the slug so the order is stable.
function byDateDescThenSlug(a, b) {
  return b.date - a.date || a.fileSlug.localeCompare(b.fileSlug);
}

export default function (eleventyConfig) {
  // Markdown: raw HTML allowed, no typographic replacements. markdown-it is
  // Eleventy's own dependency; amendLibrary configures that instance without
  // adding a direct dependency.
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ html: true, typographer: false });
  });

  // id="" on headings so articles can link to sections.
  eleventyConfig.addPlugin(IdAttributePlugin);

  for (const path of PASSTHROUGH) {
    eleventyConfig.addPassthroughCopy(path);
  }

  // Front-matter validation for every article (REQ-018): an unknown category,
  // a missing key or a wrong type fails the build naming the file.
  eleventyConfig.addPreprocessor("validate-posts", "md", (data) => {
    const file = data.page.inputPath;
    const match = ARTICLE_PATH.exec(file);
    if (!match) return;
    validateArticle(data, { allowedCategories: CATEGORY_KEYS, dirLang: match[1], file });
  });

  // posts_<lang>: every article of a language, newest first;
  // posts_<lang>_<category>: the same filtered to one category.
  for (const lang of LANGUAGES) {
    eleventyConfig.addCollection(`posts_${lang}`, (api) =>
      api.getFilteredByGlob(`src/${lang}/blog/posts/*.md`).sort(byDateDescThenSlug),
    );
    for (const key of CATEGORY_KEYS) {
      eleventyConfig.addCollection(`posts_${lang}_${key}`, (api) =>
        api
          .getFilteredByGlob(`src/${lang}/blog/posts/*.md`)
          .filter((post) => post.data.category === key)
          .sort(byDateDescThenSlug),
      );
    }
  }

  // Dates: `localeDate` renders a Date for humans in the page's language
  // ("September 20, 2026" / "20 september 2026"); `isoDate` gives the
  // YYYY-MM-DD form for <time datetime>. Both read the date as UTC so a
  // front-matter date never shifts by a day.
  eleventyConfig.addFilter("localeDate", (date, lang = "en") =>
    new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(date),
  );
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString().slice(0, 10));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
