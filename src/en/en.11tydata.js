// English is the default language and publishes at the site root:
// /en/index → /, /en/about → /about/, /en/blog/index → /blog/.
// Templates that need another URL (feeds, sitemap) set their own permalink.
export default {
  lang: "en",
  permalink(data) {
    const stem = data.page.filePathStem.replace(/^\/en(?=\/|$)/, "");
    return `${stem.replace(/\/index$/, "")}/`;
  },
};
