// The data of a page that shows an English article on the Swedish side of the
// site (in-english.njk, D206): the article's own facts, read from `original`,
// the English article, so layouts/article.njk and the head render them as
// they render any article's. The page is the English article and not a
// translation of it: its canonical URL is the English page's, it has no
// translationKey and so no hreflang alternates (src.11tydata.js), and its
// language switch leads back to the English page.
import { absoluteUrl } from "@11ty/eleventy-plugin-rss";

const fromOriginal = (key) => (data) => data.original?.data[key];

export default {
  eleventyComputed: {
    title: fromOriginal("title"),
    description: fromOriginal("description"),
    image: fromOriginal("image"),
    imageAlt: fromOriginal("imageAlt"),
    heroFigure: fromOriginal("heroFigure"),
    category: fromOriginal("category"),
    draft: fromOriginal("draft"),
    canonical(data) {
      return data.original ? absoluteUrl(data.original.url, data.site.url) : undefined;
    },
    languageSwitch(data) {
      return data.original ? { url: data.original.url, lang: data.original.data.lang } : null;
    },
  },
};
