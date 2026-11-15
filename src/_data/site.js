// Site-wide facts. Canonical host is the custom domain;
// SITE_URL overrides it for a `.github.io`-first launch or local checks.
export default {
  url: process.env.SITE_URL || "https://addablelabs.se",
  email: "hello@addablelabs.se",
  // Fluentor's public page, one per language (si-wpwe): the hero's secondary
  // CTA reads "Fluentor" and links it, and the AI adoption card's action
  // links it too.
  // Set it to null and the CTA falls back to a register-interest mailto
  // (redesign REQ-009).
  fluentorUrl: {
    en: "https://fluentor.se/en/",
    sv: "https://fluentor.se/sv/",
  },
  languages: {
    default: "en",
    codes: ["en", "sv"],
  },
};
