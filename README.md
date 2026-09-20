# Addable Labs — company website

## What this is

The source of the Addable Labs company website: a bilingual (English at the
root, Swedish under `/sv/`) static site with a landing page, an about page and
a blog with two categories, RSS feeds, a sitemap and a bilingual 404 page. It
is built with [Eleventy](https://www.11ty.dev/) 3.1.6 from Markdown and
Nunjucks templates, ships no JavaScript and no web fonts, and is published with
GitHub Pages from this repository (`addable-labs/addable-labs.github.io`) at
`https://addablelabs.se` — `https://addable-labs.github.io/` until the custom
domain is configured (see *Deployment*).

This site was designed, built and is maintained by an agent-run software
factory, with the founder reviewing every change before it is published.

No consent banner is needed: the site sets no cookies, loads nothing from
third parties and collects nothing. Every request a page makes goes to the
site's own origin, and the quality gates fail the build if that changes.

## Requirements

- **Node 24** (`.nvmrc`; `nvm use` picks it up). Node 26 also works — the
  `engines` field is `>=24.8` — and is what the site was built with.
- **pnpm 10.30.3**, pinned through the `packageManager` field. With Corepack:
  `corepack enable` and pnpm resolves itself; otherwise install pnpm 10.30.3.
- No browser, no database, no accounts: the build, the gates and the tests run
  on Node alone.

## Run locally

```bash
pnpm install --frozen-lockfile   # the five pinned dev dependencies, nothing else
pnpm dev                         # http://localhost:8080/, rebuilds on save
pnpm build                       # writes the whole site to _site/
pnpm check                       # builds, then runs all eight quality gates
pnpm test                        # proves every gate fails on deliberate breakage
```

`_site/` and `node_modules/` are git-ignored. The build takes well under a
second; `pnpm check` takes a few seconds (it fetches the external links unless
`CHECK_OFFLINE=1` is set).

## Add an article

An article is one Markdown file per language with the same file name:

- English: `src/en/blog/posts/<slug>.md` → `/blog/<slug>/`
- Swedish: `src/sv/blog/posts/<slug>.md` → `/sv/blog/<slug>/`

Both files are required — a missing counterpart fails the build (see below).
The English file:

```markdown
---
title: How this site was built by agents
description: One sentence used in listings, the meta description and the feed.
date: 2026-09-20
category: app-development        # app-development | ai-journey
translationKey: how-this-site-was-built-by-agents
draft: true                      # published, but labelled "Draft" / "Utkast"
machineTranslated: false         # Swedish files: true until a person has reviewed the text
---

Body in Markdown. Raw HTML is allowed; headings get ids for deep links.
```

The Swedish counterpart, same file name, same `translationKey` and `date`:

```markdown
---
title: Så byggdes den här webbplatsen av agenter
description: En mening som används i listor, i meta description och i flödet.
date: 2026-09-20
category: app-development
translationKey: how-this-site-was-built-by-agents
draft: true
machineTranslated: true
---

Brödtext i Markdown.
```

- **Category keys** are exactly `app-development` ("App development" /
  "Apputveckling") and `ai-journey` ("AI journey" / "AI-resan"), declared in
  `src/_data/categories.json`. An article belongs to one category and appears
  on `/blog/`, on `/blog/<category>/` and in the language's feed automatically,
  newest first.
- **`draft: true`** publishes the article but prefixes its title with "Draft:"
  / "Utkast:" in listings and feed items and shows a notice on the page.
  Setting it to `false` removes the label everywhere; nothing is ever excluded
  from the build.
- **`machineTranslated: true`** shows a short notice at the top of the page
  saying the text has not yet been reviewed by a person. Clear it once the
  translation has been read. English files keep `false`.
- **`translationKey`** pairs the two files: the language switch in the header,
  the `hreflang` links and the sitemap are all derived from it. It must be a
  slug (lowercase letters, digits and single hyphens) and identical in both
  files; the file name is the URL slug in both languages. If exactly one page
  with the same key and the other language does not exist, `pnpm build` fails
  with the path of the page that lacks its counterpart, for example
  `./src/en/blog/posts/new-article.md: expected exactly one "sv" page with
  translationKey "new-article", found 0 (none)`.
- **Validation.** Every article's front matter is checked at build time
  (`scripts/lib/frontmatter.mjs`): all seven keys are required, `date` must be
  a real date, `category` must be one of the keys above (an unknown key fails
  the build naming the file and listing the allowed keys), `draft` and
  `machineTranslated` must be booleans. `lang` comes from the directory; do not
  set it in the file.

Pages other than articles (landing, about, blog index, category pages) are
Nunjucks templates under `src/en/` and `src/sv/` whose copy lives in
`src/_data/strings/en.json` and `sv.json`; the two files must keep identical
key sets, which the parity gate enforces.

## Site configuration

`src/_data/site.js` holds the site-wide facts:

- `url` — the canonical origin, `https://addablelabs.se`. Every absolute URL
  (canonical links, `hreflang` alternates, feeds, sitemap, robots) derives from
  it. The `SITE_URL` environment variable overrides it for a build, e.g.
  `SITE_URL=https://addable-labs.github.io pnpm build` for a `.github.io`-first
  launch before the custom domain exists (a one-line change if you prefer to
  edit the default instead).
- `email` — `hello@addablelabs.se`, rendered as visible text inside a `mailto:`
  link on the landing page, the about page and every footer.
- `linkedinUrl` — `null` until the founder decides between a company page and a
  founder profile (`// TODO(founder)` in the file). While it is `null` the
  contact block shows the placeholder text "LinkedIn — coming soon"; once set,
  the same partial renders a real link.
- `languages` — `en` (default, at the root) and `sv`.

## Quality gates

`pnpm check` builds the site and runs seven gate scripts against `_site/`,
printing one `PASS <gate>` or `FAIL <gate>` line per gate (eight lines with the
build) and exiting non-zero if any fails. Each gate also runs on its own with
`pnpm check:<gate>` after a `pnpm build`:

| Gate | Command | What it checks |
| --- | --- | --- |
| build | `pnpm build` | Eleventy builds the site; article front matter validated; every page has its counterpart. |
| links | `pnpm check:links` | Every internal `href`/`src` in pages, feeds and the sitemap resolves to a built file (`/x/` → `x/index.html`), fragments point at an id. External links are fetched with a 10 s timeout and reported as warnings only; `CHECK_OFFLINE=1` skips them. |
| html | `pnpm check:html` | `html-validate` with the `recommended` and `a11y` presets (`.htmlvalidate.json`), zero errors. |
| pages | `pnpm check:pages` | Per page: `header`/`nav`/`main`/`footer` once, one `h1`, no skipped heading levels, the skip link is the first focusable element, `html[lang]` matches the path, every `img` has `alt`/`width`/`height`, unique title, description, canonical, Open Graph tags, three `hreflang` alternates, the feed link, the language switch, no `<script>`, no cross-origin resources, HTML + CSS ≤ 150 KB. |
| contrast | `pnpm check:contrast` | Every colour-token pair in `src/assets/css/tokens.css` meets WCAG AA in both colour schemes (4.5:1 text, 3:1 UI); no colour literal outside `tokens.css`. |
| parity | `pnpm check:parity` | Every English page has its Swedish twin and vice versa, the feeds pair up, the strings files have identical keys with no empty values, pages pair one-to-one, the machine-translated notice appears only where flagged. |
| feeds | `pnpm check:feeds` | Both feeds are well-formed RSS 2.0 with absolute links, exactly the language's articles, draft labels, and every page links its feed. |
| content | `pnpm check:content` | The facts the site must state: founder and founding month, the three themes, the factory note, contact details, portfolio link policy, article lengths and draft labels. |

`pnpm test` runs `node --test` over `tests/`: every gate has a positive case
against a fresh build and negative cases on fixtures (a broken link, two
`h1`s, a weak colour pair, a missing Swedish page, a missing strings key, a
relative feed link, an unknown category, …), so a gate cannot pass by failing
early. It needs no network and no browser.

## Deployment

`.github/workflows/pages.yml` is the only workflow. On a pull request targeting
`main` it installs the dependencies and runs `pnpm check` — build plus all
gates — and never deploys. On a push to `main` (a merged pull request; `main`
is protected) and on a manual *Run workflow*, it runs the same check, uploads
`_site/` with `actions/upload-pages-artifact` and deploys it with
`actions/deploy-pages`. Every action is pinned to a commit SHA, the workflow
needs no secrets (the deploy job uses the run's OIDC token with `pages: write`
and `id-token: write`), and the repository's Pages source is set to *GitHub
Actions*.

**About the `CNAME` file.** `src/CNAME` (`addablelabs.se`) is copied into the
output as REQ-020 asks, but GitHub's documentation is explicit: "If you are
publishing from a custom GitHub Actions workflow, no `CNAME` file is created,
and any existing `CNAME` file is ignored and is not required." The custom
domain is set in the repository's Pages settings instead, so merging this
branch before DNS exists is safe: nothing redirects until the founder saves
the domain there.

**Custom domain and HTTPS, in this order** (plan Decision 1; GitHub warns that
"configuring your custom domain with your DNS provider without adding your
custom domain to GitHub could result in someone else being able to host a site
on one of your subdomains"):

1. Verify `addablelabs.se` for the `addable-labs` organisation.
2. Create the DNS records at the registrar.
3. Once DNS resolves, enter `addablelabs.se` as the custom domain in the
   repository's Pages settings — `addable-labs.github.io` starts redirecting
   to it at that moment.
4. Enable *Enforce HTTPS* once GitHub has issued the certificate.

The exact steps are under *Open items for the founder*. Actions are pinned by
SHA and updated by hand; enabling Dependabot for GitHub Actions
(`.github/dependabot.yml`) is a founder option that was not enabled in this run.

## Open items for the founder

1. **Verify the domain for the organisation** (takeover-safe first step).
   GitHub → organisation `addable-labs` → *Settings* → *Pages* (under *Code,
   planning, and automation*) → *Add a domain* → `addablelabs.se`. Create the
   TXT record GitHub shows — name `_github-pages-challenge-addable-labs`
   (i.e. `_github-pages-challenge-addable-labs.addablelabs.se`), value as
   displayed — wait for DNS (immediate to 24 hours) and click *Verify*.
   Keep the TXT record: verification lapses without it. Verifying the apex
   also covers its immediate subdomains, so `www` is included.
2. **DNS records** at the registrar for `addablelabs.se`:
   - `A` records for the apex: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `AAAA` records for the apex: `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www` → `addable-labs.github.io`
   Check with `dig addablelabs.se +noall +answer` and
   `dig www.addablelabs.se +noall +answer`.
3. **Custom domain** — repository `addable-labs/addable-labs.github.io` →
   *Settings* → *Pages* → *Custom domain* → `addablelabs.se` → *Save*, once
   DNS resolves. GitHub checks the DNS and, from then on, redirects
   `addable-labs.github.io` to `addablelabs.se`. (Until this step, the site is
   reachable at `https://addable-labs.github.io/` with absolute URLs pointing
   at `addablelabs.se`; build with `SITE_URL=https://addable-labs.github.io`
   if the `.github.io` address should be canonical for a while.)
4. **Enforce HTTPS** — same settings page, tick *Enforce HTTPS* when the
   option becomes available (GitHub issues the certificate after the domain
   check; this can take up to 24 hours).
5. **LinkedIn URL** — decide between a company page and a founder profile and
   set `linkedinUrl` in `src/_data/site.js` (the `TODO(founder)` comment). The
   placeholder "LinkedIn — coming soon" turns into a link on the landing page,
   the about page and the footer; no template change needed.
6. **Copy review** — read the English copy (the founder paragraph on the about
   page is marked `TODO(founder)` in `src/en/about.njk` and `src/sv/about.njk`;
   Stoqster's portfolio status says "source on GitHub" because the repository
   has no licence file) and the Swedish translations. Clear
   `machineTranslated: true` in the front matter of each reviewed Swedish page
   (`src/sv/index.njk`, `src/sv/about.njk`, the two articles under
   `src/sv/blog/posts/`) to remove the notice, and clear `draft: true` on the
   two seed articles in both languages when they are ready to stand without
   the label.

## Identity

The wordmark, the plus-sign mark, the type choices, the light and dark palette
with measured contrast ratios, and the alternatives that were rejected are
documented in [`docs/identity.md`](docs/identity.md). The tokens live in
`src/assets/css/tokens.css`; `pnpm check:contrast` re-measures every pair.
