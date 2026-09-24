# Addable Labs — company website

## What this is

The source of the Addable Labs company website: a bilingual (English at the
root, Swedish under `/sv/`) static site with a landing page, an about page and
a blog with two categories, RSS feeds, a sitemap and a bilingual 404 page. It
is built with [Eleventy](https://www.11ty.dev/) 3.1.6 from Markdown and
Nunjucks templates and published with GitHub Pages from this repository
(`addable-labs/addable-labs.github.io`) at `https://addablelabs.se`;
`https://addable-labs.github.io/` redirects there (see *Deployment*).

The site looks the way it does because the founder picked **Direction A —
Signal** at the redesign's direction gate (2026-09-20): a product-led,
dark-first design with one typeface, JetBrains Mono, carrying the brand voice
in headings, labels and the hero's honest "agent console", a readable system
sans for paragraphs, one vivid green accent with orange reserved for status,
a quiet grid, cards that stay balanced whatever their content, and
restrained motion that establishes hierarchy. The reasons, the two
alternatives that lost and every token, component and state are documented
in [`docs/identity.md`](docs/identity.md) (see *Design directions*).

This site was designed, built and is maintained by an agent-run software
factory, with the founder reading every text before it is published.

No consent banner is needed: the site sets no cookies, loads nothing from
third parties and collects nothing. The only JavaScript is ~2 KB of the
site's own (the theme script and the entrance-motion script), the fonts are
self-hosted, every request a page makes goes to the site's own origin, and
the quality gates fail the build if any of that changes.

## Requirements

- **Node 24** (`.nvmrc`; `nvm use` picks it up). Node 26 also works — the
  `engines` field is `>=24.8` — and is what the site was built with.
- **pnpm 10.30.3**, pinned through the `packageManager` field. With Corepack:
  `corepack enable` and pnpm resolves itself; otherwise install pnpm 10.30.3.
- **Google Chrome (optional locally, required in CI)** for the two
  Chrome-backed gates, `check:lighthouse` and `check:layout`. Without it
  they print an explicit `SKIP` line and `pnpm check` still passes; nothing
  ever downloads a browser (see *Quality gates*).
- No database, no accounts.

## Run locally

```bash
pnpm install --frozen-lockfile   # the ten pinned dev dependencies, nothing else
pnpm dev                         # http://localhost:8080/, rebuilds on save
pnpm build                       # writes the whole site to _site/
pnpm check                       # builds, then runs all ten quality gates
pnpm test                        # proves every gate fails on deliberate breakage
```

### Which build is the public one

Every command above makes a **development** build: drafts are present and
listed, so `pnpm dev` shows a draft on `http://localhost:8080/blog/` like any
other article. Only `SITE_ENV=production` makes the **published** build, the
one that leaves drafts out altogether, and only the deployment workflow sets
it (`.github/workflows/pages.yml`). Nothing infers the mode any other way —
`pnpm build` is the command in both places — and anything without that exact
value is a development build, so forgetting it can never publish a draft.

To see exactly what the public site will contain:

```bash
rm -rf _site                     # Eleventy never deletes, and a draft page
                                 # left by an earlier development build would
                                 # still be sitting in _site/
SITE_ENV=production pnpm build   # then open _site/ — the drafts are not there
SITE_ENV=production pnpm check   # the gates assert the published build instead
```

`pnpm check` asserts whichever build it just made, so both modes pass: locally
it expects a draft to be listed, in CI it expects it to be absent. Clear
`_site/` when you switch modes — a build only writes files, so a page from the
previous mode survives, and the content gate will (rightly) fail with
`… is not built (a draft, and this is the production build)`. CI checks out
afresh, so this only ever bites locally.

`_site/` and `node_modules/` are git-ignored. The build takes well under a
second; `pnpm check` takes about 10 s without Chrome and about 45 s with it
(Lighthouse measures seven pages; it also fetches the external links unless
`CHECK_OFFLINE=1` is set); `pnpm test` needs no network and takes about 20 s
without Chrome, and about 35 s with it, when it also runs the two Chrome
gates and kills their Chrome mid-measure (see *Quality gates*).

## Appearance toggle

The site is **dark by default for every visitor, whatever the operating
system prefers** — the founder's decision. The toggle in the header and in
the footer (a real button, keyboard operable, with a visually hidden label)
switches to light; the choice is stored in `localStorage` under the key
`addable-theme` and applied by a ~1 KB inline script before the first paint
on every page, including after the language switch, so nothing flashes.
Storing a display preference needs no consent. Clearing the site's storage
returns the site to dark; with JavaScript disabled the site is dark and the
toggle is hidden. The mechanics — `light-dark()` tokens with dark fallbacks,
`color-scheme` as the only switch, no `prefers-color-scheme` media query —
are in [`docs/identity.md`](docs/identity.md), *Theme mechanics*. The
favicon is the one thing that follows the OS: a browser's tab bar cannot see
the page's theme.

## Fonts and licence

JetBrains Mono ships self-hosted in three weights from `src/assets/fonts/`,
unmodified from the founder's source and pinned by SHA-256 in
`tests/fonts.test.mjs`:

| File | Bytes | SHA-256 (abbreviated) |
| --- | --- | --- |
| `JetBrainsMono-Light.woff2` (the `h1`) | 93,856 | `43eb798d…9c572` |
| `JetBrainsMono-Regular.woff2` (console, metadata, code) | 92,164 | `a9cb1cd8…f45f2` |
| `JetBrainsMono-Medium.woff2` (headings, labels, buttons, chips) | 93,824 | `086c48df…5a353` |

279,844 bytes in total against the 300 KB font budget; only Light and
Medium are preloaded. The licence is the **SIL Open Font License 1.1**:
`src/assets/fonts/OFL.txt` ships beside the files at `/assets/fonts/OFL.txt`
and must stay there. Body copy uses the system sans stack and costs no
bytes. `src/assets/css/fonts.css` declares the faces with metric-matched
local fallbacks so the swap never moves the layout.

## Add an article

An article is one Markdown file per language with the same file name:

- English: `src/en/blog/posts/<slug>.md` → `/blog/<slug>/`
- Swedish: `src/sv/blog/posts/<slug>.md` → `/sv/blog/<slug>/`

The file name becomes the URL, so it must be a slug (lowercase letters,
digits and single hyphens); otherwise `pnpm build` fails and names each file
at fault, for example `./src/en/blog/posts/About.md: URL /blog/About/ has
"About"`. Every other page is checked the same way: a page's URL comes from
its path under `src/`. Eleventy drops a date from a file name, and anything
before it, so `2026-09-24-name.md` and `notes-2026-09-24-name.md` both become
`/blog/name/`; a date at the end stays (`name-2026-09-24.md` becomes
`/blog/name-2026-09-24/`). An article cannot be named after a category key:
`ai-journey.md` would take the category page's URL, `/blog/ai-journey/`, and
`pnpm build` fails whenever two files have one URL (`twin.md` beside
`2026-09-24-twin.md` too), for example with `` Output conflict: multiple
input files are writing to `./_site/blog/ai-journey/index.html` `` followed
by the two files.

Both files are required — a missing counterpart fails the build (see below).
The English file:

```markdown
---
title: How this site was built by agents
description: One sentence used in listings, the meta description and the feed.
date: 2026-09-20
category: app-development        # app-development | ai-journey
translationKey: how-this-site-was-built-by-agents
draft: true                      # built locally, left out of the public build
aiGenerated: true                # AI produced this text, written or translated
humanReviewed: false             # true once a person has read it
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
draft: true                      # the same in both languages
aiGenerated: true
humanReviewed: false
---

Brödtext i Markdown.
```

- **Category keys** are exactly `app-development` ("App development" /
  "Apputveckling") and `ai-journey` ("AI journey" / "AI-resan"), declared in
  `src/_data/categories.json`. An article belongs to one category and appears
  on `/blog/`, on `/blog/<category>/`, among the newest three on the landing
  page and in the language's feed automatically, newest first.
- **`draft: true` keeps the article off the public web.** A draft is a normal
  article in a local build — listed on `/blog/`, in the feeds and in the
  sitemap, readable at its URL, wearing a "Draft" / "Utkast" chip in the
  listings and on the page, and its feed item titled "Draft:" / "Utkast:" —
  because a local build is where a draft is read and reviewed.
  The published build does not contain it **at all**: no listing, no feed
  item, no sitemap entry and **no page at its URL**. Set the same value in
  both languages, and set it to `false` to publish. Which build is which is
  decided by one variable, `SITE_ENV` (see *Which build is the public one*).

  A draft is still committed to `main` in plain sight: "not on the website"
  is not "not readable". It is a public repository, so treat a draft as
  public writing that has not been announced, and keep anything confidential
  out of it.
- **Scheduling is a different rule, and a weaker one.** An article dated after
  today is built but not listed, so articles can be prepared in advance: it is
  absent from `/blog/`, from its category page, from the landing page's newest
  three, from the "more from the blog" band on the other articles, from both
  feeds and from the sitemap until the day it is dated. Its own page is still
  built at its real URL, in every build including the published one — that is
  how a scheduled article is previewed — so **it is unlisted, not secret**:
  anyone with the URL can read it. Never put anything confidential in one.
  Where a draft is *absent* from the public site, a scheduled article is
  merely *unannounced* on it; the two can be combined, and then the draft rule
  wins. The date is compared at UTC midnight, so an article dated today is
  listed all day whatever the build machine's timezone. A date may also carry
  a time — that is how two articles dated the same day are ordered — but it
  has to use the ISO `T`, as in `2026-09-22T23:00`; a space instead of the `T`
  is refused by the front-matter check, because Eleventy cannot parse it
  either. A time with no zone is read as UTC, like the date itself. Articles
  with the same date and time, or the same date and no time, are listed by
  the last part of their URL in alphabetical order, the same on every machine
  (code-unit order, not the build machine's locale). A static
  site has no clock, so a scheduled article appears only on the next build:
  the deployment workflow rebuilds and redeploys `main` once a day for exactly
  that reason (see *Deployment*). `SITE_NOW` makes a build take the moment
  it names for now instead of its clock — typed like a `date`, or the build
  fails — so `SITE_NOW=2026-09-24 pnpm build` lists what the 24th will list;
  `pnpm check` sets it once for its build and every gate.
- **`aiGenerated` and `humanReviewed`** are two separate facts about a text,
  and every combination of them is valid:

  | | `humanReviewed: false` | `humanReviewed: true` |
  | --- | --- | --- |
  | **`aiGenerated: true`** | AI-produced, not yet read — the default for a new article | AI-produced and read |
  | **`aiGenerated: false`** | person-written draft | person-written and read |

  `aiGenerated` records how the text came to exist — AI produced it, whether
  written from scratch or translated. It is a fact about the text's origin,
  so reading the text does not change it. `humanReviewed` records that a
  person has read the text; set it when someone has, and not before. Which
  language is the source and which the translation is carried by the
  directory (`src/en` is the source, `src/sv` the translation), so neither
  field has to say it. Both are source metadata only: neither renders
  anywhere on the site. They are set the same way on the page templates as on
  the articles, so the whole of `src/` answers both questions.
- **`translationKey`** pairs the two files: the language switches in the
  header and the footer, the `hreflang` links and the sitemap are all derived
  from it. It must be a slug (lowercase letters, digits and single hyphens)
  and identical in both files; the file name is the URL slug in both
  languages. If exactly one page with the same key and the other language
  does not exist, `pnpm build` fails with the path of the page that lacks its
  counterpart, for example `./src/en/blog/posts/new-article.md: expected
  exactly one "sv" page with translationKey "new-article", found 0 (none)`.
- **Validation.** Every article's front matter is checked at build time
  (`scripts/lib/frontmatter.mjs`): all eight keys are required, `date` must be
  a real day (`YYYY-MM-DD`, or `YYYY-MM-DDTHH:MM(:SS)` with the ISO `T`),
  `category` must be one of the keys above (an unknown key fails the build
  naming the file and listing the allowed keys), and `draft`, `aiGenerated`
  and `humanReviewed` must be booleans. `lang` comes from the directory; do
  not set it in the file. A bad `date` is reported first and on its own,
  because Eleventy reads the date before anything else — for example
  `Invalid article front matter in ./src/en/blog/posts/new-article.md: date
  must be YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS)(Z), got "2026-09-22 23:00"` —
  and any other problem in the file on the next build, once the date is
  right. The date is checked as it was typed, with quotes or without: front
  matter is read without YAML's own date type, which used to turn a day that
  does not exist, such as `2026-09-31`, into a real one (1 October) before
  the check could see it.
- **Length.** The content gate (`pnpm check:content`) counts the words of the
  built English article body: 300–600 for the two seed articles (REQ-006) and
  300–1,500 for every later article. The Swedish twin is not counted, and
  neither are the figures (captions and diagram labels) or the tables' cells:
  they are not prose.
- **Figures.** An article can carry custom SVG illustrations (REQ-008): put
  `{% figure "<id>" %}` on its own line between two paragraphs — the same
  line in both language files — for an inline figure (one panel on the
  reading measure with its caption beside it from 48 rem, under it below),
  or `{% figure "<id>", "wide" %}` for one that spans the whole container
  with its caption centred underneath. A figure is drawn by `src/_includes/figures/figures.mjs`
  (`FIGURES` names the nineteen: `stages`, `gates`, `loop`, `assessment`,
  `team`, `harness`, `ledger`, `timeline`, `setup`, `build`, `words`,
  `bilingual`, `gauntlet`, `agents`, `critic`, `fleet`, `session`, `sync`,
  `handoffs`) and every word it shows — panel titles, labels, notes,
  the caption — comes from `figures.<id>` in the two strings files, so one
  drawing serves both languages; a label too long for its slot fails the
  build naming the key. Adding a figure means one drawing function, its
  strings under `figures.<id>` in `en.json` and `sv.json`, and the two
  shortcode lines. Figures never reach the feeds (`withoutFigures` in the
  feed templates), and the layout gate measures every article page: the
  centred 44 rem measure, no horizontal scroll, wide figures across the
  body and inline figures on the measure with the caption beside the
  panel, labels at least 12 px.
- **Tables.** Write a table in Markdown, the same table in both language
  files, and mark a column of numbers `---:` in its separator row: the
  column is right-aligned in tabular figures, and a number in it never
  breaks over two lines. Every table comes wrapped in a `div.table-scroll`
  (`eleventy.config.js`), a block of the text column like a paragraph, so
  the table starts on the column's left edge at every width, and a table too
  wide for the column scrolls inside that box instead of the page; the
  layout gate measures both. A short cell keeps a table narrow on a phone:
  the unit can go in the row label, as in `Median start (tokens)`.

Pages other than articles (landing, about, blog index, category pages) are
Nunjucks templates under `src/en/` and `src/sv/` whose copy lives in
`src/_data/strings/en.json` and `sv.json`; the two files must keep identical
key sets, which the parity gate enforces. Each page's body, and the feed's,
is written once, in `src/_includes/pages/`, and both languages render it: a
file under `src/en/` or `src/sv/` holds only the page's front matter and the
line that includes the body, so a change to a page's structure is made in
one file. The landing page is assembled from the partials under
`src/_includes/partials/home/`.

## Add an app

The "What we have built" grid is data. An app is one entry in
`src/_data/portfolio.json` — in the order the grid shows — plus its name and
one-liner in both strings files and its key in the curated list `APP_KEYS`
(below); templates contain no app copy.

```json
{
  "key": "gaimer",
  "theme": "ai-apps",
  "repo": "addable-labs/gaimer",
  "url": "https://github.com/addable-labs/gaimer",
  "status": "open-source-mit",
  "source": { "readme": "https://github.com/addable-labs/gaimer/blob/main/README.md", "retrieved": "2026-09-22" }
}
```

- `theme` is `ai-apps`, `ai-adoption` or `experiments` (the three services;
  `experiments` replaced `investing` in founder feedback round 1);
  `repo` is `owner/name`; `url` is the public repository, the one `repo`
  names. A private
  repository is never linked: its `url` is the product's public page when
  there is one — nivå's is `https://erniva.se/` — and the card labels it
  "Website ↗" where a repository gets "Repository ↗", so no card calls a
  private repository open; without a page it is `null` and the card gets the
  "Private repository — no public link yet" line instead of a link. A public
  entry's repository must be one of `PUBLIC_REPOS` in `scripts/lib/apps.mjs`,
  the allow-list of public repositories the site may link; the content gate
  refuses any other GitHub repository anywhere in the built site.
- An optional `article` names the article about the app by its file name,
  without `.md` (Ashlands: `ashlands-what-one-prompt-built`). The card links
  it beside its own link as "Article →" ("Artikel →" in Swedish), to the
  article in the page's language, `/blog/<slug>/` or `/sv/blog/<slug>/`, so
  the data never holds a URL for it. The article must exist in both
  languages, and a card links it only while the blog lists it: a draft is
  linked in a local build and not in the published one, and an article
  dated after today gets its link on the day the blog lists it.
- `status` is one of `in-development`, `open-source-mit`, `experiment`,
  `private`; every status in use has a label in `portfolioStatus` in both
  strings files, and a label no entry uses is refused. Statuses are stated
  as the repository states them, nothing is invented.
- `source.readme` is the app's README, and an optional `source.report`
  names a second file, for a fact the README does not state (Ashlands: its
  `EVALUATION.md`). Each is a `https://github.com/<owner>/<name>/blob/…`
  URL in the entry's own repository, the one `repo` names, even when that
  repository is private: the site links neither. `source.retrieved` dates
  both.
- `portfolio.<key>.name` and `portfolio.<key>.summary` go into
  `src/_data/strings/en.json` and `sv.json`.
- **The copy bands keep the cards balanced** (the design never changes with
  the content): a name is at most 16 characters, a service title at most 20,
  a status label at most 22 (except the founder-confirmed `private` label,
  which is fixed), and the app summaries — like the three service texts —
  stay within a 25 % length band per language (the longest at most 1.25 ×
  the shortest). Write the new one-liner to fit that band: at least 0.8 ×
  the longest summary of its language and at most 1.25 × the shortest.
- **The guard** is `tests/apps.test.mjs` (`validateApps()` in
  `scripts/lib/apps.mjs`): it fails naming the key, the language or the band
  when an entry lacks strings in a language, uses an unknown or unused
  status, links a private repository or one not on `PUBLIC_REPOS`, names an
  article that is not a post in both languages, or breaks a band. A new
  status also needs an entry in `STATUS_KEYS` there and a
  `chip-<status>` colour rule in `src/assets/css/base.css`.
- **The list is curated.** The entries are the founder's list (amendment
  A-01, without the two investing tools founder feedback round 1 took out),
  pinned as `APP_KEYS` in `scripts/lib/apps.mjs`: append the new key
  there in grid order — and to `PRIVATE_APP_KEYS` if the repository is
  private — so the data file and the list agree; `pnpm test` fails naming
  the entry when they differ. A public repository also goes on
  `PUBLIC_REPOS` there, once it is public: without a token,
  `curl -s -o /dev/null -w '%{http_code}' https://api.github.com/repos/<owner>/<name>`
  prints `200`.
- **The proof** is `pnpm check:layout`: it renders both landing pages at
  five widths in headless Chrome and measures that every title is one line
  and every row of cards is aligned, and `pnpm check:content` proves the
  rendered grid (the entries in order, each linked once with the label its
  link calls for, its article linked beside it where it names one the build
  lists, and an entry with neither not linked at all).

The mechanism behind the balance (subgrid rows, the chip-row rule, the
breakpoints) is explained in [`docs/identity.md`](docs/identity.md), *Adding
an app without breaking the balance*.

## Site configuration

`src/_data/site.js` holds the site-wide facts:

- `url` — the canonical origin, `https://addablelabs.se`. Every absolute URL
  (canonical links, `hreflang` alternates, feeds, sitemap, robots) derives from
  it. The `SITE_URL` environment variable overrides it for a build, e.g.
  `SITE_URL=https://addable-labs.github.io pnpm build` for a `.github.io`-first
  launch before the custom domain exists (a one-line change if you prefer to
  edit the default instead).
- `email` — `hello@addablelabs.se`, rendered as visible text inside a `mailto:`
  link in the landing page's contact band, on the about page and in every
  footer; the contact band's and the header's call to action is a `mailto:`
  link with a pre-filled subject — the button label, "Reach out" / "Hör av
  dig" — encoded by the `mailtoSubject` filter in `eleventy.config.js`, never
  by hand. The hero's primary call to action links the apps section
  (`#apps`) instead: since founder feedback round 1 the site promotes what
  exists rather than "Start a project".
- `nivaUrl` — nivå's public page, `https://erniva.se/` (its root sends a
  visitor to `/en` or `/sv` by the browser's language). The hero's secondary
  call to action reads "nivå" in both languages and links there, and so
  does the AI adoption card's "Visit nivå" / "Besök nivå" — the founder's
  call (2026-09-23): nothing that misleads while nivå is not yet open to
  everyone, and nothing to change when it opens. Set to `null`, the
  button becomes an honest early-access `mailto:` ("Get early access to
  nivå" / "Få tidig tillgång till nivå") and the card links the apps
  section, with no template change. The content gate checks the button in
  whichever state applies.
- `languages` — `en` (default, at the root) and `sv`.

The company line in every footer is copy, not a `site.js` fact: `footer.company`
in `src/_data/strings/{en,sv}.json`, "Addable Labs AB · Org.nr 559602-2615 ·
Registered office: Eslöv" and its Swedish counterpart with "Säte: Eslöv".
Aktiebolagslagen 28 kap. 5 § makes a limited company state its name, its
organisation number and its registered seat on its website; the seat is the
town, and the street address — the founder's home — is never published, nor is
any private email address or phone number. The content gate pins both lines.

## Quality gates

`pnpm check` builds the site and runs nine gate scripts against `_site/`,
printing one `PASS <gate>`, `FAIL <gate>` or `SKIP <gate> (run pnpm
check:<gate>)` line per gate (ten lines with the build) and exiting non-zero
if any gate fails. If the build itself fails, the other nine are not run —
they could only read a stale `_site/` — and each prints `FAIL <gate> (not
run: build failed)`. Each gate also runs on its own with `pnpm check:<gate>`
after a `pnpm build`:

| Gate | Command | What it checks |
| --- | --- | --- |
| build | `pnpm build` | Eleventy builds the site; article front matter validated; every page has its counterpart; every page's URL is made of slugs, like `/blog/ai-journey/` or `/feed.xml`; every `{% figure %}` names a known figure, `inline` or `wide`, with `figures.<id>` in the page's strings file; every figure label fits its character budget and every count label, such as `242 agents`, has its number in digits. |
| links | `pnpm check:links` | Every internal `href`/`src` in pages, feeds and the sitemap resolves to a built file (`/x/` → `x/index.html`), fragments point at an id. External links are fetched with a 10 s timeout and reported as warnings only; `CHECK_OFFLINE=1` skips them. |
| html | `pnpm check:html` | `html-validate` with the `recommended` and `a11y` presets (`.htmlvalidate.json`, inline styles forbidden), zero errors. |
| pages | `pnpm check:pages` | Per page: `header`/`nav`/`main`/`footer` once, one `h1`, no skipped heading levels, the skip link is the first focusable element, `html[lang]` matches the path, every `img` has `alt`/`width`/`height`, unique title, description, canonical, Open Graph tags, three `hreflang` alternates, the feed link, the language switch, scripts only from the site's origin, no cross-origin resource (font preloads and `@font-face` sources included), HTML + CSS ≤ 150 KB, and on both landing pages CSS + JavaScript ≤ 60 KB compressed. |
| contrast | `pnpm check:contrast` | `src/assets/css/tokens.css` keeps its structure (dark by default, light only under the toggle's `[data-theme="light"]`, every fallback equal to its dark value, no OS media query, no token outside `:root`); every colour pair meets WCAG AA in both themes (4.5:1 text, 3:1 UI); no colour literal outside `tokens.css`. |
| parity | `pnpm check:parity` | Every English page has its Swedish twin and vice versa, the feeds pair up, the strings files have identical keys with no empty values, pages pair one-to-one. |
| feeds | `pnpm check:feeds` | Both feeds are well-formed RSS 2.0 with absolute links, exactly the language's listed articles — never one dated after today, and never a draft unless this is a development build — draft labels, items that carry the prose only (no `<figure>`), and every page links its feed. |
| content | `pnpm check:content` | The facts the site must state: one `h1` in the hero, the primary call to action linking the apps section (`#apps`), the nivå button honouring `site.nivaUrl`, the three service headings, the apps in data order, each with exactly the links it calls for in its action row — "Repository" to a public repository or "Website" to the public page of a product whose repository is private, then "Article" to the article about the app where it names one the build lists — and an entry with neither unlinked, the trust section's phrase, founder, article link and proof link, the latest-writing cards — the newest three, in the blog index's order — the founding month on the about page and the founder's name in its lead's first sentence and nowhere else in its main content, not even without its accents or in capitals; on every page the footer's address, the company line with the organisation number and the registered seat, the language switches, the toggle and the feed link; every GitHub repository named in a page, a feed, the sitemap or a text file one of the public repositories the site may link (`PUBLIC_REPOS` in `scripts/lib/apps.mjs`, an allow-list); article lengths and draft labels; that each blog index lists exactly the listed articles of its language and each category page those of its category, newest first, and none of another category; that an article dated after today is built but listed in neither its language's blog index nor its feed; and that a draft is listed and built in a development build but has no page at all in the published one. The pinned facts are the constants at the top of `scripts/check/content.mjs`. |
| lighthouse | `pnpm check:lighthouse` | Serves `_site/` locally, runs Lighthouse 13 (mobile configuration) in headless Chrome on `/`, `/sv/`, `/about/`, `/blog/`, a category page, an article and `/404.html`: Performance, Accessibility, Best Practices and SEO each ≥ 95 and cumulative layout shift ≤ 0.1, one line per page. A page whose only problem is Performance < 95 is measured twice more and the median of its three Performance scores decides (its line shows the median, then the three: `performance 96 (85, 97, 96)`); in CI the lines also go to the run's summary page. A page whose Chrome is lost is measured again, once, in a new Chrome, and a second failure is one `FAIL` line naming the page and the cause; these lines go to the summary page too. |
| layout | `pnpm check:layout` | Renders `/` and `/sv/` at 360, 768, 1024, 1280 and 1920 px in headless Chrome and measures the balanced cards: every service and app title one line, cards in a row equal in height with their "What you get" heading / summary tops and action rows aligned (± 1 px), every chip row one line. Renders every article page at the same widths and measures the article layout: no horizontal scroll, every text block at most 44 rem wide, centred in the body and on one shared left edge, every wide figure across the body, every inline figure on the measure and centred with its panel 20–24.5 rem wide and its caption beside the panel from 768 px (top-aligned, after the gap) and under it below, every panel rendered so a 13-unit label is at least 12 px, every table starting on the text column's left edge and nothing of it past the column's right edge but what scrolls inside its own box. A page whose Chrome is lost at one width is measured again, once, at that width in a new Chrome, and a second failure is one `FAIL` line naming the page, the width and the cause. `LAYOUT_DUMP=<file>` writes the raw measurements (the source of `tests/fixtures/layout/article.json` and `tables.json`). |

**Chrome.** The last two gates need Google Chrome (or Chromium). They find
it through `chrome-launcher`, or through `CHROME_PATH` if set (the
variable is then the only candidate). When no Chrome is found each gate
prints `SKIP <gate>: no Chrome found (run pnpm check:<gate> after installing
Chrome or set CHROME_PATH)` and exits with code 3; the runner reports `SKIP
lighthouse (run pnpm check:lighthouse)` — never `PASS` — and still exits 0.
`CHECK_REQUIRE_CHROME=1` turns a skip into a failure; the CI workflow sets
it, so the gates always run there (Chrome is preinstalled on GitHub's
runners). Nothing downloads a browser: `chrome-launcher`, `lighthouse` and
`puppeteer-core` are the only dev dependencies the two gates add;
`chrome-launcher` finds and launches the installed Chrome, and the other two
attach to it. A Chrome that dies or never starts under a gate (killed,
crashed, or never opening its DevTools port, as once on CI) does not crash
the gate: it measures that page again, once, in a new Chrome, and if that
fails too it prints one `FAIL` line naming the page and the cause and
measures nothing more, so a page it did not measure never passes or skips.
A gate that passes after measuring a page again says so on its `pnpm check`
line, where its own lines are hidden: `PASS layout (measured again in a new
Chrome: /sv/ 768)`.
A single slow Lighthouse run does not fail CI (see the lighthouse row); a
page still below 95 on the median of three fails, and thresholds are never
lowered. Only if CI ever loses Chrome would a manually produced Lighthouse
report be committed as evidence — nothing of the kind exists today.

`pnpm test` runs `node --test` over `tests/`: every gate has a positive case
against a fresh build and negative cases on fixtures or modified copies (a
broken link, two `h1`s, a weak colour pair, a missing Swedish page, a missing
strings key, a relative feed link, an unknown category, an off-origin font, a
70 KB script, a linked private app, a 17-character app name, a Lighthouse
report at 94, a wrapped card title, …), so a gate cannot pass by failing
early. The Lighthouse and layout rules are tested on fixture reports and
measurements, and the two gates' `SKIP` path with `CHROME_PATH=/nonexistent`.
The suite needs no network, and a browser only in `tests/chrome.test.mjs`,
whose gate cases run both gates on the installed Chrome and kill the Chrome a
gate launched, by its pid, mid-measure (once: the page is measured again;
twice: one `FAIL` line); they skip when no Chrome is found unless
`CHECK_REQUIRE_CHROME=1`, as in CI.

### Browser walkthrough

`pnpm walkthrough` checks, in headless Chrome on every page of a built site,
the six acceptance criteria that only a browser shows and no gate measures:

- **Dark first frame under a light OS** (AC-31): with empty storage, dark
  from the first frame, measured before the first paint.
- **The theme choice survives the language switch** (AC-07, AC-31): the
  toggle on `/` turns the page light, the language switch leads to `/sv/`
  and back to `/`, both light from their first frame, and clearing storage
  brings dark back.
- **Navigation with JavaScript off** (AC-23, AC-31): every page dark, its
  content shown and the toggle hidden, and every header link and the language
  switch load.
- **No horizontal scroll at 360 and 3840 px** (AC-20).
- **Focus rings in both themes** (AC-18, AC-23): Tab reaches the skip link
  first, then every link and button, each with a visible ring.
- **Reduced motion** (AC-19): nothing moves or scales, on load or at the
  bottom of the page.

It is not a gate: `pnpm check` does not run it, and CI does not either. It
reads a built site and never builds one, so build first, and clear `_site/`
when you switch modes (see *Which build is the public one*):

```bash
pnpm build && pnpm walkthrough                        # the development build
rm -rf _site && SITE_ENV=production pnpm build && pnpm walkthrough
pnpm walkthrough <dir>                                # any other built site
```

It takes about 35 s. It prints one line per check and page (and width,
theme or step), `ok (…)` or `FAIL — <what, where>`. It ends with `PASS
walkthrough (151 checks on 21 pages, 36.7 s)` or `FAIL walkthrough (1 of 151
checks failed, …)` and exits 1 on any failure, for example:

```text
first-frame /sv/: FAIL — data-theme is "light" at the first frame, not "dark"; the page background is rgb(247, 248, 246) at the first frame, not the dark rgb(11, 14, 16)
```

Without a built site or without Chrome it says why and exits 2, not the
gates' `SKIP` code 3. The rules are in `scripts/lib/walkthrough-report.mjs`,
and `tests/walkthrough.test.mjs` proves each one can fail, without Chrome.

## Deployment

`.github/workflows/pages.yml` is the only workflow. On a pull request targeting
`main` it installs the dependencies and runs `pnpm check` — build plus all
gates, with `CHECK_REQUIRE_CHROME=1` so the Chrome-backed gates may never
skip — and `pnpm test`, and never deploys. On a push to `main` (a merged pull
request; `main` is protected), on the daily schedule and on a manual *Run
workflow*, it runs the same check and tests, uploads `_site/` with
`actions/upload-pages-artifact` and deploys it with `actions/deploy-pages`.
Every action is pinned to a commit SHA, the workflow needs no secrets (the
deploy job uses the run's OIDC token with `pages: write` and `id-token:
write`), and the repository's Pages source is set to *GitHub Actions*.

**The published build.** The workflow job sets `SITE_ENV: production`, which
is what makes the deployed site leave the drafts out (see *Which build is the
public one*). It sits on the job rather than on the `pnpm check` step because
`pnpm test` builds `_site/` again afterwards, before the artifact is uploaded.

**The daily rebuild.** `schedule: cron: "17 4 * * *"` builds and deploys `main`
every day at 04:17 UTC. It is what makes a scheduled article (see *Add an
article*) appear on the day it is dated: the site is static, so the date is
read at build time and nothing changes until the next build. A scheduled run
takes the same path as a push — everything but a pull request deploys — and
uses the default branch. GitHub disables a cron in a repository with no
activity for 60 days; if that happens the Actions tab says so, and *Run
workflow* both deploys and re-enables it.

**About the `CNAME` file.** `src/CNAME` (`addablelabs.se`) is copied into the
output as REQ-020 asks, but GitHub's documentation is explicit: "If you are
publishing from a custom GitHub Actions workflow, no `CNAME` file is created,
and any existing `CNAME` file is ignored and is not required." The custom
domain is set in the repository's Pages settings instead (step 3 below), so
the file on its own changes nothing: nothing redirects until the domain is
saved there.

**Custom domain and HTTPS.** The site is served at `https://addablelabs.se`
and `addable-labs.github.io` redirects there. The domain is set up in four
steps, in this order (plan Decision 1; GitHub warns that "configuring your
custom domain with your DNS provider without adding your custom domain to
GitHub could result in someone else being able to host a site on one of your
subdomains"):

1. **Verify the domain for the organisation** first: it stops other GitHub
   users from taking the domain over for a Pages site of their own.
   GitHub → organisation `addable-labs` → *Settings* → *Pages* (under *Code,
   planning, and automation*) → *Add a domain* → `addablelabs.se`. Create the
   TXT record GitHub shows — name `_github-pages-challenge-addable-labs`
   (i.e. `_github-pages-challenge-addable-labs.addablelabs.se`), value as
   displayed — wait for DNS (immediate to 24 hours) and click *Verify*.
   Keep the TXT record: verification lapses without it. Verifying the apex
   also covers its immediate subdomains, so `www` is included.
2. **The DNS records** at the registrar for `addablelabs.se`:
   - `A` records for the apex: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `AAAA` records for the apex, for IPv6 (optional in GitHub's
     documentation, and never instead of the `A` records):
     `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
     `2606:50c0:8003::153`
   - `CNAME` for `www` → `addable-labs.github.io`

   Check with `dig addablelabs.se +noall +answer` and
   `dig www.addablelabs.se +noall +answer`.
3. **The custom domain** — repository `addable-labs/addable-labs.github.io` →
   *Settings* → *Pages* → *Custom domain* → `addablelabs.se` → *Save*, once
   DNS resolves. GitHub checks the DNS and, from then on, redirects
   `addable-labs.github.io` to `addablelabs.se`. Before this step the site is
   reachable at `https://addable-labs.github.io/` with absolute URLs pointing
   at `addablelabs.se`; build with `SITE_URL=https://addable-labs.github.io`
   if the `.github.io` address should be canonical for a while (see *Site
   configuration*).
4. **Enforce HTTPS** — same settings page, tick *Enforce HTTPS* when the
   option becomes available (GitHub issues the certificate after the domain
   check; this can take up to 24 hours).

Actions are pinned by SHA and updated by hand; Dependabot for GitHub Actions
(`.github/dependabot.yml`) is not enabled.

## Design directions

Three genuinely different directions — A Signal, B Ledger, C Terminal —
were built as real pages for the founder's direction gate; the pick, the
founder's words and where the removed preview pages live in git history are
recorded in [`docs/design-directions.md`](docs/design-directions.md), with the
three one-page rationales under [`docs/design-directions/`](docs/design-directions/).
The implemented system — direction, typeface, palette with measured contrast
in both themes, mark and favicon, every component with its states, motion,
theme mechanics, the alternatives considered and the two how-tos (changing a
colour, adding an app) — is [`docs/identity.md`](docs/identity.md). The tokens
live in `src/assets/css/tokens.css`; `pnpm check:contrast` re-measures every
pair.
