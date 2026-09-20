// Site-wide facts. Canonical host is the custom domain (plan Decision 7);
// SITE_URL overrides it for a `.github.io`-first launch or local checks.
export default {
  url: process.env.SITE_URL || "https://addablelabs.se",
  email: "hello@addablelabs.se",
  // TODO(founder): company page or founder profile? Set linkedinUrl.
  linkedinUrl: null,
  languages: {
    default: "en",
    codes: ["en", "sv"],
  },
};
