// Site-wide facts. Canonical host is the custom domain (plan Decision 7);
// SITE_URL overrides it for a `.github.io`-first launch or local checks.
export default {
  url: process.env.SITE_URL || "https://addablelabs.se",
  email: "hello@addablelabs.se",
  // No public URL for nivå yet; until there is one the secondary CTA is an
  // early-access mailto (redesign REQ-009, plan D-11).
  nivaUrl: null,
  languages: {
    default: "en",
    codes: ["en", "sv"],
  },
};
