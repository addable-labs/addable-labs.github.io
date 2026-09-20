// Data shared by the design-direction previews (redesign REQ-002).
//
// The three previews render the same landing-page content model — hero,
// services, apps and products, how we work, latest writing, contact — in three
// genuinely different designs, so the founder compares design, not copy. The
// copy below is the English draft proposed by the implementation plan; the
// implementation moves it into src/_data/strings/{en,sv}.json and the apps
// into src/_data/apps.json. Previews are English only, excluded from
// collections, never built in production (see eleventy.config.js).
export default {
  lang: "en",
  eleventyExcludeFromCollections: true,
  preview: true,
  copy: {
    hero: {
      eyebrow: "AI-native software company · Sweden",
      title: "We build AI-\u2060powered apps and help teams put AI to work.", // U+2060 word joiner: keep "AI-powered" on one line,
      lead:
        "Addable Labs ships AI-powered products — largely built by AI agents with a person in charge — and helps companies and teams become fluent with AI, from assessment to adoption.",
      primaryCta: "Start a project",
      primaryHref: "mailto:hello@addablelabs.se?subject=Start%20a%20project",
      secondaryCta: "Get early access to nivå",
      secondaryHref: "mailto:hello@addablelabs.se?subject=Early%20access%20to%20niv%C3%A5",
      proof: ["Agent-built, human-directed", "Open source where it can be", "Gate-checked on every change"],
    },
    services: {
      eyebrow: "Services",
      heading: "Three ways to work with us",
      items: [
        {
          key: "ai-apps",
          title: "AI-powered app development",
          text: "Desktop and web applications where AI is part of the product, not a bolt-on. We design, build and ship them with an agent-run factory and a senior person in the loop.",
          getsHeading: "What you get",
          gets: [
            "A working product, not a slide deck",
            "Source you own, with quality gates and CI from day one",
            "A small senior team that decides fast",
            "An honest account of what AI can and cannot do for the product",
          ],
          cta: "Start a project",
          href: "mailto:hello@addablelabs.se?subject=Start%20a%20project",
        },
        {
          key: "ai-adoption",
          title: "AI adoption and fluency",
          text: "Find out where your people stand with AI, then move them: nivå self-assessments, hands-on workshops and a private automation setup that keeps untrusted content in the airlock.",
          getsHeading: "What you get",
          gets: [
            "A fluency baseline per person and per team",
            "Workshops built around your real work, not demos",
            "A self-hosted, private AI automation stack",
          ],
          cta: "See nivå",
          href: "#apps",
        },
        {
          key: "investing",
          title: "Investing and market-data tools",
          text: "Tools that make Swedish market data usable: watchlists, alerts, correlation heatmaps and portfolio views for investment companies, real-estate companies and funds.",
          getsHeading: "What you get",
          gets: [
            "Desktop and web tools for following the Swedish market",
            "Data pipelines and dashboards for your own analysis",
            "Prototypes evaluated in the open",
          ],
          cta: "See the tools",
          href: "#apps",
        },
      ],
    },
    apps: {
      eyebrow: "Apps and products",
      heading: "What we have built",
      lead: "Nine projects, from shipped open-source apps to private prototypes. Status is stated as each repository states it.",
      items: [
        { key: "niva", name: "nivå", theme: "AI adoption", status: "in development", statusKind: "progress", text: "AI fluency and adoption maturity self-assessment for individuals and teams — levels, radar chart, fluency index, team heatmaps.", url: null },
        { key: "notesage", name: "Notesage", theme: "AI-powered apps", status: "open source · MIT", statusKind: "shipped", text: "A rich-text Markdown editor that collaborates with AI. Native desktop app: Tauri v2, React and Tiptap; connects to local models too.", url: "https://github.com/PeterBlenessy/notesage" },
        { key: "traceloupe", name: "TraceLoupe", theme: "AI-powered apps", status: "open source · Apache-2.0", statusKind: "shipped", text: "Privacy-first macOS app that opens your own iPhone backup, checks it for spyware and stalkerware and reviews it with a local AI. Nothing leaves your Mac.", url: "https://github.com/PeterBlenessy/traceloupe" },
        { key: "ashlands", name: "Ashlands", theme: "AI-powered apps", status: "experiment · case study", statusKind: "experiment", text: "An action-RPG built entirely by AI agents from one prompt, with an honest evaluation of what that produced.", url: "https://github.com/PeterBlenessy/ashlands" },
        { key: "airlocked-agents", name: "airlocked-agents", theme: "AI adoption", status: "open source · MIT", statusKind: "shipped", text: "Infrastructure-as-code for a private, self-hosted AI automation stack where no single component reads untrusted content, holds credentials and can send.", url: "https://github.com/PeterBlenessy/airlocked-agents" },
        { key: "stoqster", name: "Stoqster", theme: "Investing", status: "desktop app · source on GitHub", statusKind: "shipped", text: "Follow Swedish investment companies, real-estate companies and funds with watchlists, alerts and portfolio performance. Tauri and Vue 3.", url: "https://github.com/PeterBlenessy/stoqster" },
        { key: "investable", name: "investable", theme: "Investing", status: "prototype · private", statusKind: "prototype", text: "A stock correlation heatmap web app with several market-data providers.", url: null },
        { key: "stocksight-ai", name: "StockSight-AI", theme: "Investing", status: "prototype · private", statusKind: "prototype", text: "An AI-powered stock analysis web application. A private prototype, not public.", url: null },
        { key: "grc-skills", name: "Claude skills for GRC", theme: "AI adoption", status: "fork · explored", statusKind: "fork", text: "Governance, risk and compliance skills for Claude. A fork of the original work by Sushegaad (MIT) that Peter explores — not an Addable Labs product.", url: "https://github.com/Sushegaad/Claude-Skills-Governance-Risk-and-Compliance" },
      ],
    },
    trust: {
      eyebrow: "How we work",
      heading: "AI-native, agents as staff, a person in charge",
      points: [
        { title: "AI-native", text: "AI is part of what we build and part of how we build. The products on this page were made largely with AI agents." },
        { title: "Agents as staff", text: "A small senior team sets direction and reviews every change; agents plan, implement and review the work in between." },
        { title: "Proof, not claims", text: "This very site was designed, built and is maintained by an agent-run software factory. Read how it was built." },
        { title: "A Swedish company", text: "Founded by Peter Blenessy. Public repositories, honest evaluations — including the experiments that fell short." },
      ],
      articleLabel: "How this site was built by agents",
      articleHref: "/blog/how-this-site-was-built-by-agents/",
      proofLabel: "See the open-source portfolio",
      proofHref: "#apps",
    },
    writing: { eyebrow: "Latest writing", heading: "Notes from the work", all: "All articles" },
    contact: {
      eyebrow: "Contact",
      heading: "Have a project in mind?",
      text: "Tell us what you want to build or where your team stands with AI. We reply within a couple of days.",
      cta: "Start a project",
      href: "mailto:hello@addablelabs.se?subject=Start%20a%20project",
    },
    footer: {
      email: "hello@addablelabs.se",
      linkedin: "LinkedIn — coming soon",
      rss: "RSS",
      language: "Svenska",
      factoryLine: "Built and maintained by an agent-run software factory.",
      themeLabel: "Dark mode",
    },
  },
};
