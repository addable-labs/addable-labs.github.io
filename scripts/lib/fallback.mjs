// Articles in English only (the founder's decision D206, 24 November 2026:
// "I want future articles to only be written in English. Where Swedish
// translation does not exist, the site should show the English article when
// Swedish is selected as language."). Shared by eleventy.config.js,
// src/src.11tydata.js and the gates, so the build and the gates agree on
// which articles those are and where the Swedish side shows them.
//
// An article has an English file, src/en/blog/posts/<slug>.md, and may have a
// Swedish one, src/sv/blog/posts/<slug>.md, paired with it by translationKey.
// An English article that no Swedish file pairs with is untranslated, and the
// Swedish side of the site shows it in English:
//
//   - at /sv/blog/<slug>/, its Swedish address (`articlePath`), a page
//     src/sv/blog/in-english.njk makes: the English title, text, figures and
//     cover in the Swedish site's header, footer and dates, under one line
//     that says the article is only in English and links the English page.
//     Its canonical URL is the English page's, it claims no hreflang
//     alternates and the sitemap leaves it out: it is the English article,
//     not a translation of it;
//   - in every Swedish listing, by the same rules and in the same order as
//     the Swedish articles, labelled "På engelska" and linking that page;
//   - in the Swedish feed, as its English title and text, linking that page.
//
// The language switch on the English page leads to that page, and back.
// The English page itself claims no hreflang alternates either: it has no
// translation. Nothing changes for an article that has a Swedish file.

import { langPrefix, readArticleSources } from "./site.mjs";

/**
 * The articles of `articles` that none of `translations` translates: no
 * article there carries the same translationKey. `key` reads an article's
 * translationKey: the build hands it Eleventy's collection items (the key in
 * `data`), the gates the articles `readArticleSources` reads.
 */
export function untranslated(articles, translations, key = (article) => article.translationKey) {
  const keys = new Set(translations.map(key));
  return articles.filter((article) => !keys.has(key(article)));
}

/** The path of the article `slug` on the `lang` side of the site: /blog/<slug>/, /sv/blog/<slug>/. */
export function articlePath(slug, lang, site) {
  return `${langPrefix(lang, site)}/blog/${slug}/`;
}

/**
 * The articles the `lang` side of the site shows, read from the source tree
 * as `readArticleSources` reads them: the language's own articles and, for a
 * language other than the default, the default language's untranslated ones,
 * each at its address on this side (`path`, `url`), in this language (`lang`)
 * and marked `fallback: true`, with `original`, the path of the page it
 * shows. Its title, image and every other fact are the English article's, as
 * is what this build owes it (`listed`, `scheduled`, `omitted`): the page that
 * shows it is built when the English page is.
 */
export async function articlesShownIn(srcDir, site, lang) {
  const own = await readArticleSources(srcDir, site, lang);
  const source = site.languages.default;
  if (lang === source) return own;
  const shown = untranslated(await readArticleSources(srcDir, site, source), own).map((article) => {
    const path = articlePath(article.slug, lang, site);
    return { ...article, lang, fallback: true, original: article.path, path, url: `${site.url}${path}` };
  });
  return [...own, ...shown];
}

/**
 * The pages that show an untranslated article on the other side of the site,
 * one per article and language, from `articlesShownIn`: { lang, path, url,
 * original, slug, … }, the built ones and the ones this build leaves out alike
 * (`omitted`).
 */
export async function fallbackPages(srcDir, site) {
  const pages = [];
  for (const lang of site.languages.codes) {
    pages.push(...(await articlesShownIn(srcDir, site, lang)).filter((article) => article.fallback));
  }
  return pages;
}
