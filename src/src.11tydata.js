// Data for every template under src/ (REQ-009, REQ-010, REQ-016).
//
// `alternate` pairs each page with its counterpart in the other language via
// `translationKey`: exactly one page in collections.all must share the key and
// carry the other `lang`; zero or several matches fail the build naming the
// page. Templates without a translationKey (404, sitemap, robots, the feeds)
// get `alternate: null`. Eleventy runs computed data that reads `collections`
// in a second pass after collections are populated, so this function reads
// `data.collections` through its argument and never touches it elsewhere
// (plan review PR-02); `translationKey` itself must be first-pass data (front
// matter or a templated eleventyComputed string).
import { absoluteUrl } from "@11ty/eleventy-plugin-rss";

const OTHER = { en: "sv", sv: "en" };

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
      if (matches.length !== 1) {
        const found = matches.map((item) => item.inputPath).join(", ") || "none";
        throw new Error(
          `${data.page.inputPath}: expected exactly one "${other}" page with translationKey "${data.translationKey}", found ${matches.length} (${found}). Every page needs one counterpart in the other language (REQ-009).`,
        );
      }
      return { url: matches[0].url, lang: other };
    },
    canonical(data) {
      return absoluteUrl(data.page.url, data.site.url);
    },
    feedUrl(data) {
      return data.lang === "sv" ? "/sv/feed.xml" : "/feed.xml";
    },
  },
};
