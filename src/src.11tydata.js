// Data for every template under src/ (REQ-009, REQ-010, REQ-016).
//
// `alternate` pairs each page with its counterpart in the other language via
// `translationKey`: exactly one page in collections.all must share the key and
// carry the other `lang`; zero or several matches fail the build naming the
// page. Templates without a translationKey (404, sitemap, robots, the feeds)
// get `alternate: null`. Eleventy runs computed data that reads `collections`
// in a second pass after collections are populated, so this function reads
// `data.collections` through its argument and never touches it elsewhere;
// `translationKey` itself must be first-pass data (front matter or a
// templated eleventyComputed string).
//
// One exception (D206, scripts/lib/fallback.mjs): an English article may have
// no Swedish file. Its `alternate` is null — it has no translation, so no
// hreflang alternates — and the Swedish side shows it in English at its
// Swedish address, a page of src/sv/blog/in-english.njk.
//
// `languageSwitch` is where the language switches in the header and the
// footer lead: the counterpart, or, from an English article without one, the
// Swedish page that shows it (that page's own data file leads it back).
//
// `langPrefix` is what a template puts before a path to a page in the page's
// own language (`{{ langPrefix }}/blog/`): "" for the default language
// (English, at the root) and "/" + lang otherwise ("/sv").
import { absoluteUrl } from "@11ty/eleventy-plugin-rss";
import { articlePath } from "../scripts/lib/fallback.mjs";
import { ARTICLE_PATH } from "../scripts/lib/urls.mjs";

const OTHER = { en: "sv", sv: "en" };

/** An article in the default language, the one language whose articles may have no counterpart. */
function isUntranslatedArticle(data) {
  return data.lang === data.site.languages.default && ARTICLE_PATH.test(data.page.inputPath);
}

export default {
  eleventyComputed: {
    alternate(data) {
      // Eleventy first calls this with proxy data — computed keys such as a
      // category page's translationKey are still "" and collections are empty
      // arrays — only to learn what it reads. Touch collections.all before any
      // early return so the dependency is always recorded and the real call
      // happens in the second pass, when collections.all holds at least this
      // page.
      const all = data.collections?.all;
      if (!all || all.length === 0 || !data.translationKey) return null;
      const other = OTHER[data.lang];
      if (!other) {
        throw new Error(`${data.page.inputPath}: translationKey "${data.translationKey}" needs lang "en" or "sv", got ${JSON.stringify(data.lang)}`);
      }
      const matches = data.collections.all.filter(
        (item) => item.data.translationKey === data.translationKey && item.data.lang === other,
      );
      if (matches.length === 0 && isUntranslatedArticle(data)) return null;
      if (matches.length !== 1) {
        const found = matches.map((item) => item.inputPath).join(", ") || "none";
        throw new Error(
          `${data.page.inputPath}: expected exactly one "${other}" page with translationKey "${data.translationKey}", found ${matches.length} (${found}). Every page needs one counterpart in the other language (REQ-009); only an English article may have none (D206).`,
        );
      }
      return { url: matches[0].url, lang: other };
    },
    languageSwitch(data) {
      if (data.alternate) return data.alternate;
      if (!data.translationKey || !isUntranslatedArticle(data)) return null;
      const other = OTHER[data.lang];
      return { url: articlePath(data.page.fileSlug, other, data.site), lang: other };
    },
    canonical(data) {
      return absoluteUrl(data.page.url, data.site.url);
    },
    feedUrl(data) {
      return data.lang === "sv" ? "/sv/feed.xml" : "/feed.xml";
    },
    langPrefix(data) {
      return data.lang === data.site.languages.default ? "" : `/${data.lang}`;
    },
  },
};
