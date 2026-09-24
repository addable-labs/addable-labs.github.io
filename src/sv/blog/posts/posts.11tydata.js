// Swedish articles: /sv/blog/<slug>/ with the same slug as the English file.
export default {
  layout: "layouts/article.njk",
  permalink(data) {
    return `/sv/blog/${data.page.fileSlug}/`;
  },
};
