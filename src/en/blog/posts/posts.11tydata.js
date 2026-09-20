// English articles: /blog/<slug>/ (the /en prefix is stripped by en.11tydata.js
// for pages; articles set their own permalink so the slug is the file name).
export default {
  layout: "layouts/article.njk",
  permalink(data) {
    return `/blog/${data.page.fileSlug}/`;
  },
};
