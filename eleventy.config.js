import { readFileSync, statSync } from "node:fs";
import { IdAttributePlugin } from "@11ty/eleventy";
import rssPlugin from "@11ty/eleventy-plugin-rss";
import { isOmitted, isScheduled, parseFrontMatter, siteNow, validateArticle, validateArticleDate } from "./scripts/lib/frontmatter.mjs";
import { ARTICLE_PATH, byDateDescThenSlug, checkPageUrls } from "./scripts/lib/urls.mjs";
import site from "./src/_data/site.js";

// Paths copied verbatim into _site/: the stylesheets and mark, the SVG favicon
// and the CNAME file for the custom domain (REQ-020).
const PASSTHROUGH = ["src/assets", "src/favicon.svg", "src/CNAME"];

const LANGUAGES = ["en", "sv"];
const CATEGORIES = JSON.parse(readFileSync(new URL("./src/_data/categories.json", import.meta.url), "utf8"));
const CATEGORY_KEYS = CATEGORIES.map((category) => category.key);

// The article illustrations (founder feedback 2026-09-21, si-55iu) are drawn
// by src/_includes/figures/figures.mjs. The module is imported per build with
// its modification time in the URL, so `eleventy --serve` renders an edited
// figure on the next build; a static import would keep the first version
// until the process restarts (ESM caches by URL).
const FIGURES_MODULE = new URL("./src/_includes/figures/figures.mjs", import.meta.url);
function loadFigures() {
  const { mtimeMs } = statSync(FIGURES_MODULE);
  return import(`${FIGURES_MODULE.href}?mtime=${mtimeMs}`);
}

// A figure rendered into an article body, as the shortcode emits it:
// <figure class="figure …">…</figure>, never nested.
const FIGURE_HTML = /<figure class="figure[^"]*"[^>]*>[\s\S]*?<\/figure>\n?/g;

// Two rules keep an article off the blog, and they are deliberately not the
// same rule (frontmatter.mjs holds both):
//
//   scheduled — dated after today (founder ask 2026-09-22, si-gxyg). Still
//     built at its real URL, in every build — that is how it gets previewed —
//     but no listing shows it until the day it is dated, so articles can be
//     prepared in advance. Unlisted, not secret. `isListed` below.
//   draft — `draft: true` (founder ask 2026-09-22, si-mzf1). Present and
//     listed like any other article in a local build, because that is where
//     the founder reads it, and left out of the production build altogether
//     by the `omit-drafts` preprocessor: no page, no collection entry,
//     nothing. `isOmitted`.
//
// So `isListed` asks about the date and nothing else: a draft that reaches it
// is a draft in a local build, where it belongs in the listing, and a draft
// in production never reaches it because the template no longer exists.
// Anything that is not an article is always listed, which matters for
// collections.all, the collection the sitemap walks. Today is the day of the
// moment the build started (`buildNow`, set by the `eleventy.before` handler
// below).
let buildNow;
function isListed(item) {
  return !ARTICLE_PATH.test(item.inputPath) || !isScheduled(item.date, buildNow);
}

export default function (eleventyConfig) {
  // Markdown: raw HTML allowed, no typographic replacements. markdown-it is
  // Eleventy's own dependency; amendLibrary configures that instance without
  // adding a direct dependency.
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ html: true, typographer: false });
    // Tables (founder feedback 2026-09-24, si-t64i): each table comes
    // wrapped in div.table-scroll, which base.css makes a text block like a
    // paragraph, so the table starts on the text column's left edge and one
    // too wide for the column scrolls inside that box instead of the page.
    // A column's alignment in the Markdown (`---:` for numbers) becomes a
    // class: markdown-it writes it as style="text-align:right", and the
    // html gate forbids inline styles.
    md.renderer.rules.table_open = (tokens, idx, options, env, self) => `<div class="table-scroll">\n${self.renderToken(tokens, idx, options)}`;
    md.renderer.rules.table_close = (tokens, idx, options, env, self) => `${self.renderToken(tokens, idx, options)}</div>\n`;
    for (const cell of ["th_open", "td_open"]) {
      md.renderer.rules[cell] = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const align = /^text-align:(left|center|right)$/.exec(token.attrGet("style") ?? "");
        if (align) {
          token.attrs = token.attrs.filter(([name]) => name !== "style");
          token.attrJoin("class", `align-${align[1]}`);
        }
        return self.renderToken(tokens, idx, options);
      };
    }
  });

  // id="" on headings so articles can link to sections.
  eleventyConfig.addPlugin(IdAttributePlugin);

  // Feed filters (absoluteUrl, dateToRfc822, getNewestCollectionItemDate,
  // htmlToAbsoluteUrls) for the RSS templates and the head's absolute URLs.
  eleventyConfig.addPlugin(rssPlugin);

  for (const path of PASSTHROUGH) {
    eleventyConfig.addPassthroughCopy(path);
  }

  // Front matter is read with our YAML engine instead of Eleventy's own
  // (si-8zyg): the same js-yaml without YAML's timestamp type, so a date
  // stays the text that was typed and the date check below judges that text.
  // With the type, `date: 2026-09-31` typed without quotes became 1 October
  // before any code of ours ran, and the article went out on another day
  // without a word. Eleventy still makes the page's date of the text itself,
  // with Luxon in UTC, on the same day as before for every form the check
  // accepts. The engine reads every page, not only the articles: a page that
  // is not an article gets its date the same way, so there a day that does
  // not exist now stops the build in Eleventy's words, naming the file and
  // the value, instead of rolling over. No page but the articles has a date.
  // Eleventy's gray-matter still splits the block off each file, and the
  // gates split it by the same rules (`frontMatterBlock`, si-0eez), so an
  // option here that changes the split — `delimiters`, `language` — must
  // change there too.
  eleventyConfig.setFrontMatterParsingOptions({ engines: { yaml: parseFrontMatter } });

  // An article's date is checked as Eleventy maps it, ahead of the rest of
  // its front matter (si-xpn0). Eleventy maps a page's date while it gathers
  // the page's data, before any preprocessor runs, and throws on a date it
  // cannot parse with an error that names the file and the value but not the
  // rule — so `validate-posts` below never sees a bad date. `addDateParsing`
  // is Eleventy's hook into that mapping: it gets the very value Eleventy is
  // about to parse, and as this one hands nothing back, Eleventy then parses
  // a good date exactly as before. The rest of the front matter, and a
  // missing or empty date (Eleventy parses neither), stay with
  // `validate-posts`.
  eleventyConfig.addDateParsing(function (date) {
    const file = this.page.inputPath;
    if (ARTICLE_PATH.test(file)) validateArticleDate(date, { file });
  });

  // Front-matter validation for every article (REQ-018): an unknown category,
  // a missing key or a wrong type fails the build naming the file.
  eleventyConfig.addPreprocessor("validate-posts", "md", (data) => {
    const file = data.page.inputPath;
    const match = ARTICLE_PATH.exec(file);
    if (!match) return;
    validateArticle(data, { allowedCategories: CATEGORY_KEYS, dirLang: match[1], file });
  });

  // Drafts in the production build (si-mzf1): returning false from a
  // preprocessor drops the template before anything else sees it, so the
  // draft has no output file, no entry in collections.all and no computed
  // data — genuinely absent, not merely unlisted. `permalink: false` alone
  // would leave it in the collections; `eleventyExcludeFromCollections` alone
  // would leave the page on the public web. Both languages of an article
  // carry the same `draft`, so a draft and its counterpart leave together and
  // no surviving page is left hunting for a translation that is not there.
  eleventyConfig.addPreprocessor("omit-drafts", "md", (data) => {
    if (!ARTICLE_PATH.test(data.page.inputPath)) return;
    if (isOmitted(data)) return false;
  });

  // Every URL the build gives a page is made of slugs (si-2a7h). A file's
  // name becomes its URL, and nothing checked those names: a "#", "?" or "%"
  // broke the URL, and a letter outside ASCII made the order of same-date
  // articles depend on the build machine. Eleventy hands this event every
  // page's URL once, after it has formed them and before anything renders,
  // so the check reads the URLs as the build made them — the category pages'
  // (from categories.json) and any permalink included — and one error names
  // every file at fault. A draft the production build leaves out forms no
  // URL there, so a bad draft name fails the local build, where drafts are
  // written. The same check refuses a file name that Eleventy would change on
  // the way to the URL (si-ok07): a date in it, which Eleventy drops with
  // everything before it, and an article named index.md, which it names
  // after its directory. The gates read an article's URL off its file name,
  // so the build keeps the two the same. Unlike a URL, a name is there to
  // check in every build, so a left-out draft with such a name fails the
  // production build too.
  eleventyConfig.on("eleventy.contentMap", ({ inputPathToUrl }) => checkPageUrls(inputPathToUrl));

  // One moment for the whole build (si-vv7h). The collections below ask
  // `isListed` about each article as the build gathers them, and the sitemap
  // asks again as it renders; each question used to read the clock, so a
  // build that ran across 00:00 UTC on the eve of an article's date could
  // list it on one page and not on another. The build now reads the clock
  // once, as it starts, or takes the moment SITE_NOW names (`siteNow`), and
  // every listing takes that moment. `pnpm dev` starts every rebuild this
  // way too, so a rebuild after midnight takes the new day.
  eleventyConfig.on("eleventy.before", () => {
    buildNow = siteNow();
  });

  // posts_<lang>: every listed article of a language, newest first;
  // posts_<lang>_<category>: the same filtered to one category. Both drop the
  // scheduled articles, so the blog index, the category pages, the landing
  // page's newest three, the article pages' "more from the blog" band and both
  // feeds inherit the exclusion — including the feeds' lastBuildDate, which
  // reads the collection and so never runs ahead of the newest listed article.
  for (const lang of LANGUAGES) {
    eleventyConfig.addCollection(`posts_${lang}`, (api) =>
      api.getFilteredByGlob(`src/${lang}/blog/posts/*.md`).filter(isListed).sort(byDateDescThenSlug),
    );
    for (const key of CATEGORY_KEYS) {
      eleventyConfig.addCollection(`posts_${lang}_${key}`, (api) =>
        api
          .getFilteredByGlob(`src/${lang}/blog/posts/*.md`)
          .filter((post) => post.data.category === key)
          .filter(isListed)
          .sort(byDateDescThenSlug),
      );
    }
  }

  // The sitemap walks collections.all, not the collections above, so it needs
  // the same exclusion of its own: a scheduled article is not advertised to
  // search engines either (si-gxyg). A draft needs no exclusion here — in
  // production it is not in collections.all at all, and in a local build the
  // sitemap is never served to anyone (si-mzf1).
  eleventyConfig.addFilter("listed", (items) => (items ?? []).filter(isListed));

  // Dates: `localeDate` renders a Date for humans in the page's language
  // ("September 20, 2026" / "20 september 2026"); `isoDate` gives the
  // YYYY-MM-DD form for <time datetime>. Both read the date as UTC so a
  // front-matter date never shifts by a day.
  eleventyConfig.addFilter("localeDate", (date, lang = "en") =>
    new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "UTC" }).format(date),
  );
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString().slice(0, 10));

  // Contact CTA (redesign REQ-009): `"Reach out" | mailtoSubject`
  // gives mailto:hello@addablelabs.se?subject=Reach%20out — the subject is
  // the strings value, percent-encoded here and never by hand, so the contact
  // band, the header button and the hero's nivå early-access CTA share one
  // mechanism (the hero's primary CTA is an anchor to the apps since founder
  // feedback round 1, si-yp2x).
  eleventyConfig.addFilter("mailtoSubject", (subject, email = site.email) =>
    `mailto:${email}?subject=${encodeURIComponent(subject)}`,
  );

  // Article figures (founder feedback 2026-09-21, si-55iu; REQ-008): an
  // article calls `{% figure "stages", "wide" %}` — the same call in both
  // language files — and gets an inline-SVG <figure> whose panel titles,
  // labels and caption come from strings[lang].figures.<id>, so one drawing
  // serves both languages. "inline" (the default) sits on the reading
  // measure with the caption beside the panel from 48 rem, "wide" spans the
  // whole container with the caption centred underneath (base.css, founder
  // feedback 2026-09-22).
  eleventyConfig.addAsyncShortcode("figure", async function (id, placement = "inline") {
    const { renderFigure } = await loadFigures();
    const lang = this.ctx?.lang;
    const strings = this.ctx?.strings?.[lang];
    if (!strings) throw new Error(`${this.page?.inputPath ?? "figure"}: the figure shortcode needs the page's lang and strings`);
    return renderFigure(id, { placement, lang, strings });
  });

  // The feeds carry the prose only: `post.templateContent | withoutFigures`
  // drops the inline-SVG figures, which would render unstyled (classes and
  // custom properties do not travel) and bloat every item, so the feed
  // output stays what it was before the figures (REQ-016).
  eleventyConfig.addFilter("withoutFigures", (html) => String(html).replace(FIGURE_HTML, ""));

  // The article page's "More from the blog" band lists the other articles of
  // its language: the posts collection without the page itself, by URL
  // (founder feedback 2026-09-22).
  eleventyConfig.addFilter("withoutUrl", (posts, url) => (posts ?? []).filter((post) => post.url !== url));

  // An app card links the article about the app (founder request
  // 2026-09-23, si-3hpa): the entry's `article` in portfolio.json names the
  // post by its file name, and the card looks it up in the posts collection
  // of the page's language, so it links an article only while the listings
  // show it — a draft in the production build and an article dated after
  // today are in no listing, and no card links them either. undefined when
  // the collection holds no such post.
  eleventyConfig.addFilter("postBySlug", (posts, slug) => (posts ?? []).find((post) => post.page.fileSlug === slug));

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
