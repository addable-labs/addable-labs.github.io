// Swedish keeps the /sv/ prefix: /sv/index → /sv/, /sv/about → /sv/about/.
export default {
  lang: "sv",
  permalink(data) {
    return `${data.page.filePathStem.replace(/\/index$/, "")}/`;
  },
};
