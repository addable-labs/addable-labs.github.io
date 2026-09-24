// Site-wide facts. Canonical host is the custom domain;
// SITE_URL overrides it for a `.github.io`-first launch or local checks.
export default {
  url: process.env.SITE_URL || "https://addablelabs.se",
  email: "hello@addablelabs.se",
  // nivå's public page (si-gyc4): the hero's secondary CTA reads "nivå"
  // and links it, and the AI adoption card's action links it too. Set it to
  // null and the CTA falls back to an early-access mailto (redesign
  // REQ-009). The page's root picks /en or /sv from the browser's language.
  nivaUrl: "https://erniva.se/",
  languages: {
    default: "en",
    codes: ["en", "sv"],
  },
};
