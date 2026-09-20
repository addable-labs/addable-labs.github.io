import { IdAttributePlugin } from "@11ty/eleventy";

// Paths copied verbatim into _site/. The files arrive in later work items
// (assets and favicon in WI-02, CNAME in WI-08); Eleventy skips a missing
// passthrough source, so declaring them up front does not break the build.
const PASSTHROUGH = ["src/assets", "src/favicon.svg", "src/CNAME"];

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
