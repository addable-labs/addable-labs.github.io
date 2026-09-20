# Visual identity — Direction A, Signal

*Status: the implemented system of the redesign (2026-09-21). Token values and
the contrast tables below were re-checked against `src/assets/css/tokens.css`
and the output of `pnpm check:contrast` when this document was written; the
stylesheet is authoritative and the gate re-measures it on every run.*

The identity of the Addable Labs website is product-led and crisp: one
typeface — JetBrains Mono — carrying the brand voice in headings, labels and
the console, a readable system sans for paragraphs, a dark-first palette with
one vivid green accent and orange reserved for status, a quiet grid, elevated
cards that stay balanced whatever their content, and restrained motion that
establishes hierarchy. This document records what was chosen and why, the
alternatives that were rejected, the components and their states, the theme
mechanics, and the two how-tos a maintainer needs (REQ-017, REQ-027).

## Direction

**Founder's pick: A — Signal**, 2026-09-20 20:23 CEST — "A, i love signal's
design and look and feel! good job!" — matching the design-author's
recommendation (plan D-01). Signal was the most "sells, not describes" of the
three directions: the first screen states what the company does, proves how
it works with an honest agent console, and offers two actions; it gives the
brand mono the leading role without asking readers to read paragraphs in a
monospace; and its light theme already works with the darkened brand
variants the contrast gate enforces. The founder's one note at the pick —
the console's columns must align across rows — became the four-column
subgrid of `.console-log`. His second round of feedback (20:38 CEST) shaped
the shipped cards and default theme: services and apps cards are *balanced*
(one-line titles, descriptions of equal length, "What you get" at the same
height, links bottom-aligned, a design that never changes with the content),
the apps grid lists exactly six curated projects, and dark is the default
for every visitor "regardless of host settings" (confirmed at the plan gate,
21:44 CEST).

The two alternatives — **B — Ledger** (editorial, centred, label | content
sections, ledger rows instead of cards, Stripe-like restraint) and **C —
Terminal** (mono for everything, bordered panels with title bars, a
boot-sequence reveal, Raycast-like density) — were built as real pages and
judged against the same content model. Their rationales are kept in
[design-directions/](design-directions/) and the gate itself is recorded in
[design-directions.md](design-directions.md); the preview pages were removed
from `src/` after the pick (REQ-002).

The reference bar (REQ-003) is Linear, Vercel, Stripe and Raycast — a crisp
grid, large confident type, one vivid accent, subtle purposeful motion, a
product-led hero — as a standard of craft; nothing is copied from them.

## Typeface

**JetBrains Mono**, self-hosted, in three weights: Light 300 (the display
`h1`), Regular 400 (the console, metadata, code) and Medium 500 (headings,
eyebrows, navigation, buttons, chips, the wordmark). The files come from the
founder's own brand source, ship **unmodified** and are pinned by SHA-256 in
`tests/fonts.test.mjs`:

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `src/assets/fonts/JetBrainsMono-Light.woff2` | 93,856 | `43eb798d…9c572` |
| `src/assets/fonts/JetBrainsMono-Regular.woff2` | 92,164 | `a9cb1cd8…f45f2` |
| `src/assets/fonts/JetBrainsMono-Medium.woff2` | 93,824 | `086c48df…5a353` |

279,844 bytes in total, under the 300 KB font budget (REQ-005). **Licence:**
the SIL Open Font License 1.1; `OFL.txt` ships beside the files at
`/assets/fonts/OFL.txt` and must stay there. Subsetting to Latin + Latin
Extended is the documented fallback (plan D-06) only if the Lighthouse gate
ever demands it; if that happens, the digests in the test, this table and
the derivation are updated together.

**Loading** (`src/assets/css/fonts.css`): three `@font-face` rules with
`font-display: swap` and same-origin `src`, plus two metric-matched local
fallback faces — "JetBrains Mono Fallback Menlo" (`local("Menlo")`,
`local("DejaVu Sans Mono")`, `size-adjust: 100%`) and "JetBrains Mono
Fallback Consolas" (`size-adjust: 109%`), both with `ascent-override: 102%`,
`descent-override: 30%`, `line-gap-override: 0%` from the files' metrics
(unitsPerEm 1000, ascender 1020, descender −300, advance 600) — so the swap
never moves the layout. The mono stack is `"JetBrains Mono", "JetBrains Mono
Fallback Menlo", "JetBrains Mono Fallback Consolas", ui-monospace,
monospace`. Only the two weights above the fold are preloaded — Light for
the `h1`, Medium for eyebrow, navigation and buttons — with
`<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous">`;
Regular loads on demand. The pages gate proves every `@font-face` and
preload is same-origin and the fonts test that at most two are preloaded.

**Body copy is the system sans (plan D-04).** Paragraphs, leads, card text
and article bodies use `ui-sans-serif, system-ui, -apple-system, "Segoe UI",
Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` at 1 rem / 1.6
(lead 1.125 rem; article body 1.0625 rem / 1.7 on a 68ch measure). Reasons:
monospace paragraphs cost 15–20 % more line length and read measurably
slower; the system stack costs zero bytes; and the mono still dominates
every screen through headings, labels, buttons, chips, metadata and the
console — the brand voice — so nothing is lost.

**Scale** (`tokens.css`): `--text-display` `clamp(2.25rem, 1.3rem + 3.2vw,
4.1rem)` for the `h1` (Light, line-height 1.05, tracking −0.035em),
`--text-2xl` `clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)` for `h2` (Medium,
1.15, −0.02em), `--text-xl` 1.375 rem for `h3` (card titles inside the
balanced grids are 1.25 rem so they stay on one line), `h4` labels at
0.875 rem uppercase with +0.08em tracking in the muted colour, and the steps
0.75 / 0.875 / 1 / 1.125 rem for chips and metadata, small copy, body and
lead. Eyebrows are Medium 0.75 rem uppercase with +0.12em tracking in the
accent text colour, preceded on the hero by a glowing dot.

## Palette and measured contrast

Fifteen colour tokens live on `:root` in `src/assets/css/tokens.css`, the
only stylesheet allowed to contain colour literals. Twelve carry a light and
a dark value through `light-dark()`, three are the same in both themes
(*Theme mechanics* explains the structure).

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--color-bg` | `#F7F8F6` | `#0B0E10` | page background |
| `--color-surface` | `#FFFFFF` | `#13181C` | cards, header, console |
| `--color-surface-2` | `#EEF1EC` | `#1A2126` | alternate section bands, pressed state |
| `--color-text` | `#14191D` | `#ECEFF1` | body text |
| `--color-text-muted` | `#4D5862` | `#A6B0BA` | secondary text, metadata |
| `--color-accent` | `#83F35D` | `#83F35D` | primary button surface, glow, active-nav underline (never text on light) |
| `--color-accent-text` | `#256B15` | `#83F35D` | links, eyebrows, "+" marks, accent text |
| `--color-accent-strong` | `#1B5210` | `#A9F78F` | link hover, primary-button edge on light |
| `--color-on-accent` | `#0B0E10` | `#0B0E10` | text on the accent and secondary surfaces |
| `--color-secondary` | `#FF6F00` | `#FF6F00` | status/attention surface (chip dot, caret) |
| `--color-secondary-text` | `#A84600` | `#FF8A2E` | status text (draft, in development, waiting) |
| `--color-border` | `#77828C` | `#626E79` | card and button borders, chip outlines (UI, 3:1) |
| `--color-hairline` | `#D6DBD1` | `#242C33` | decorative rules only (excluded from the gate by name) |
| `--color-focus` | `#A84600` | `#83F35D` | focus ring |
| `--color-glow` | `rgba(131,243,93,0.22)` | `rgba(131,243,93,0.16)` | hero glow, shadows (decorative, alpha; excluded) |

Ratios are WCAG 2.2 contrast ratios computed by `scripts/lib/contrast.mjs`
and printed by `pnpm check:contrast` (22 pairs, 43 evaluations over the two
themes, measured 2026-09-21). Text pairs must reach 4.5:1 and UI pairs
(borders, focus ring, the button edge) 3:1; every pair is above its
threshold in both themes.

| Pair (foreground on background) | Kind | Light | Dark |
| --- | --- | --- | --- |
| text on bg / surface / surface-2 | text | 16.61 / 17.70 / 15.53 | 16.77 / 15.47 / 14.10 |
| text-muted on bg / surface / surface-2 | text | 6.83 / 7.27 / 6.38 | 8.80 / 8.12 / 7.40 |
| accent-text on bg / surface / surface-2 | text | 6.17 / 6.58 / 5.77 | 13.78 / 12.72 / 11.59 |
| accent-strong on bg / surface | text | 8.72 / 9.29 | 15.11 / 13.95 |
| secondary-text on bg / surface / surface-2 | text | 5.57 / 5.93 / 5.20 | 8.23 / 7.60 / 6.92 |
| on-accent on accent (primary button) | text | 13.78 | 13.78 |
| on-accent on secondary (orange surface) | text | 6.94 | 6.94 |
| border on bg / surface / surface-2 | ui | 3.68 / 3.92 / 3.44 | 3.71 / 3.43 / 3.12 |
| focus on bg / surface | ui | 5.57 / 5.93 | 13.78 / 12.72 |
| accent-strong on accent (button edge) | ui | 6.61 (light only) | — |

Why these colours: the dark theme is the default look, so its background is
a deep blue-black rather than pure black, with two lighter surfaces for
cards and alternate bands; the light theme is paper, not white, with white
surfaces for depth. Green `#83F35D` is the single vivid accent — the primary
button surface, the hero glow, the active-navigation underline, hover
borders and, on dark, links and eyebrows. Orange `#FF6F00` is reserved for
status and attention (the "in development" and draft chips, the console's
waiting caret) so it never competes with the call to action. **The
light-on-light rule:** the pure hues are never used as text on the light
theme (`#83F35D` on paper is 1.32:1, `#FF6F00` on white 2.79:1); the light
theme sets its accent text in `#256B15` (6.17:1), its link hover in
`#1B5210`, its status text in `#A84600` and its focus ring in the same
orange-brown, while the hues stay as surfaces and glow. **Two consequences
drive component rules:** on dark the focus ring colour equals the primary
button surface, so the ring is drawn 3 px *outside* every element
(`outline-offset: 3px`) against the page background (13.78:1) and never
inside the button; on light the green button has no 3:1 edge against the
page (1.32:1), so the primary button carries a 1 px `--color-accent-strong`
border (6.61:1 on the surface, 8.72:1 on the page) that gives it its
boundary on light and is invisible on dark. The border grey clears 3:1 on
every surface in both themes; the hairline is a decorative rule and is
excluded from the gate by name.

Non-colour tokens: spacing `--space-1` … `--space-7` (0.25, 0.5, 1, 1.5,
2.5, 4, 6 rem), radii 6 / 12 / 18 px, `--container: 76rem`, `--gutter:
clamp(1rem, 4vw, 2.5rem)`, `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`,
`--dur: 380ms`.

## Mark and favicon

The mark is the plus sign — "add", for addable — as an outlined rounded tile
(plan D-05): a 32 × 32 viewBox with a rounded square (`rx="7"`, 2 px stroke)
and a 3 px round-capped plus, drawn in `currentColor`
(`src/assets/img/mark.svg`). The header inlines it at 28 px next to the
wordmark, the footer at 24 px; it takes the accent text colour and turns
`--color-accent-strong` when the brand link is hovered. The **wordmark** is
live text — never an image — `addable` + a dimmed `labs` in Mono Medium
with −0.02em tracking (`.wordmark`, `.wordmark-dim`), so the name stays
selectable, translatable and readable by assistive technology; the mark is
`aria-hidden` and the visible wordmark is the accessible name of the brand
link.

The **favicon** (`src/favicon.svg`) is the filled tile: a `#0B0E10` rounded
square with a `#83F35D` plus, and under `@media (prefers-color-scheme:
light)` a 1 px `#256B15` edge so it stays visible on a light browser tab
bar. **The favicon's limit:** that media query is about the browser's own
chrome, which follows the OS, not the page — a tab icon cannot observe the
site's `data-theme`, so the favicon is the one place where the OS preference
still applies. The favicon repeats three token values as literals (its
colours cannot read the page tokens); change them by hand with the tokens.

No raster imagery anywhere (REQ-008): the hero's product visual is the HTML
and CSS console, there is no social image this run, and no product
screenshots.

## Components and states

Hover, focus, pressed and current states are the same mechanism in both
themes; only the token values differ. Every focusable element shows the
focus ring — `:focus-visible { outline: 2px solid var(--color-focus);
outline-offset: 3px; border-radius: 4px }` — and no rule in the stylesheet
removes an outline. Transitions run at `var(--dur)` on `var(--ease)` and
change colour, border, transform and box-shadow only.

- **Header and navigation.** Sticky, `backdrop-filter: blur(12px)` over a
  `::before` layer of the page colour at 82 % opacity, a hairline bottom
  edge. Brand (mark + wordmark, a 44 px target); navigation links in mono
  0.875 rem, 44 px tall, muted, with an accent underline (`inset 0 -2px 0
  var(--color-accent)`) and the full text colour on hover and on
  `aria-current="page"`; the controls — the language switch (`a.lang-switch`,
  named in the target language), the appearance toggle and, from 64 rem, the
  small primary call to action with the same subject-encoded `mailto:` as
  the hero. Below 40 rem the row wraps: brand and controls on the first
  line, the navigation on a full second line, so Home / About / Blog stay
  reachable by keyboard at every width (the navigation is never hidden).
- **Buttons.** Pills, mono Medium 0.875 rem, `min-height: 44px`. `.button-primary`:
  accent surface, on-accent text, the 1 px accent-strong edge; hover: the
  accent-strong surface, a 6 px glow ring and a 2 px lift; active: back to
  place with `filter: saturate(0.85) brightness(0.94)`; the focus ring sits
  outside by the 3 px offset. `.button-secondary`: outlined in the border
  colour on a transparent surface; hover: border turns accent text, surface
  fills, 1 px lift; active: `surface-2`. `.button-sm` (the header CTA)
  narrows the padding and keeps the 44 px height. The arrow glyph inside a
  button or text link slides 3 px on hover.
- **Text links.** In paragraphs, `--color-accent-text` turning
  `--color-accent-strong` on hover with no underline; `.text-link` (card and
  section actions) is the mono Medium form at 44 px with the sliding arrow.
  Inline text links are the WCAG 2.2 target-size exemption; every
  standalone link is 44 px tall.
- **Cards.** `.card`: surface, 1 px border colour (3:1), 12 px radius,
  24 px padding. Linked cards — apps with a repository (`.app-linked`) and
  article cards (`.post`) — lift 2–3 px and turn their border
  `--color-accent-text` on hover, with a soft glow shadow on app cards;
  unlinked app cards keep a solid border on a transparent surface and show
  the mono line "Private repository — no public link yet", so they are
  visibly not links.
- **Cards — the balance rule (plan D-14, amendment A-02, AC-30).** The
  services grid and the apps grid never change design with their content.
  Mechanism: each grid declares only its column tracks and leaves the rows
  implicit; every card is itself a grid that spans N rows and takes its row
  tracks from the parent — `display: grid; grid-row: span N;
  grid-template-rows: subgrid` — so the cards in one row share each track
  and every track takes the tallest content in the row. A service card
  spans six tracks (number | title | text | "What you get" heading | list |
  action); an app card spans **five** (theme caption | chip row | name |
  summary | action). The last track holds the action row, `align-self: end`,
  so links and private notes sit on the same bottom line. Titles are set on
  one line: `.service h3` and `.app-name` at 1.25 rem with `text-wrap:
  nowrap`, and the copy bands under *Adding an app* keep the longest title
  of either language inside the narrowest track. Columns: the services grid
  is one column, two from 40 rem and three from 64 rem; the apps grid is one
  column, two from **46 rem** and three from **70 rem** — the widths at which
  an app card is at least 20.5 rem wide, which is what the widest status
  chip needs (see below). For browsers without subgrid (`@supports not
  (grid-template-rows: subgrid)`) the cards fall back to flex columns with
  `align-items: stretch` on the grid (equal heights) and `margin-top: auto`
  on the action row (bottom-aligned links); only the cross-card alignment
  of the inner rows is lost. The `check:layout` gate (plan T8, the
  redesign's gates step) measures the rendered geometry on both landing
  pages at 360, 768, 1024, 1280 and 1920 px.
- **App card anatomy.** `p.app-theme` — the theme caption, a muted uppercase
  mono line like the services' number; `div.app-top` — the chip row, holding
  exactly the status chip on one line; `h3.app-name` — plain text, never a
  link; `p.app-text` — the one-liner; then the action row, the same element
  in every card: `a.app-action` "Repository ↗" (44 px, mono, accent text,
  underline on hover) or `p.app-private` (the mono private note, muted),
  both above a dashed rule. **The chip-row mechanism:** the founder-confirmed
  `private` label ("privat · API-nycklar på förfrågan", 33 characters,
  275 px at the chip's size) is wider than a three-column card's content at
  1024–1100 px and a two-column card's at 640 px, so the theme caption has
  its own track instead of sharing the chip's line, the chip row holds
  nothing else, and the apps grid gains its columns only where a card is
  20.5 rem wide (46 and 70 rem); every chip row is therefore one line with
  its text intact at every width in both languages.
- **Chips.** Pills, mono Medium 0.75 rem, 28 px tall, a 1 px outline and a
  6 px dot in `currentColor`. Kinds follow the data's status keys:
  `chip-open-source-mit` (and `-shipped`, `-open-source-apache`) in the
  accent text colour; `chip-in-development`, `chip-prototype` and
  `chip-draft` in the status orange; `chip-experiment`, `chip-private` and
  `chip-mt` (machine-translated) muted. Category chips (`chip-cat`) and the
  RSS chip (`chip-rss`) are links: 44 px tall targets with the pill drawn
  inside as an inset ring, accent text, hover turns the ring accent and the
  text accent-strong, pressed fills `surface-2`; on a category page the
  current category's chip carries `aria-current="page"` (full text colour,
  accent ring, `surface-2`).
- **Console** (`figure.console`). A surface panel with an 18 px radius, a
  glow shadow, a title bar with three dots and a mono title, and
  `ol.console-log`: the list owns four columns — time | stage | text |
  state — and every `.log-line` is a subgrid row, so the columns align down
  the whole console (the founder's note); below 30 rem the time column is
  dropped. Stages are the full text colour, times and texts muted, "done"
  states in the accent text colour, the waiting state in the status orange
  with a blinking caret. The content is honest: every line is a string in
  `strings.console.lines` drawn from this factory's real build-basic stages
  and the numbers and start times of the run that built the page; changing
  the console means changing strings, never the template. The copy beside
  the console appears from 70 rem; below that the console spans the full
  width so its lines stay one line.
- **Trust block** (`.trust-grid`, `.trust-points`). A 5fr / 7fr split from
  64 rem: eyebrow, heading and actions on the left; a definition list of
  points on the right, two columns from 40 rem, each point with a 2 px
  accent rule on top, a mono Medium term and muted small copy. The landing
  page's "Proof, not claims" text is `p.factory-note`, the content gate's
  hook. The about page reuses the same components for its founder and
  approach sections.
- **Article list items** (`.post`). Surface cards in a two-column grid from
  48 rem: mono metadata (date, category chip, draft chip), the title as a
  44 px link that turns accent on hover, the description; the whole card
  lifts 2 px and turns its border green on hover. The landing page shows the
  newest three; the blog index and category pages show all.
- **Notices.** `.notice-draft` (a box with an orange edge) on draft
  articles; `.notice-mt` (a muted edge) on machine-translated Swedish pages;
  both also appear as chips in article metadata.
- **Appearance toggle.** A real `button[data-theme-toggle]`, 44 × 44 px,
  transparent with a transparent border, a moon icon on dark and a sun on
  light, a visually hidden label ("Dark mode" / "Mörkt läge"),
  `aria-pressed="true"` while dark; hover shows the border and the full text
  colour, active fills `surface-2`. Hidden without JavaScript
  (`html:not(.js)`), so no inert control is ever shown.
- **Language switch.** `a.lang-switch` in the header and
  `a.lang-switch-footer` in the footer, mono 0.875 rem, 44 px, muted turning
  full text on hover, named in the target language with `hreflang`, `lang`
  and `rel="alternate"`, pointing at the same page in the other language;
  absent on the 404 page, which has no counterpart.
- **Footer.** A hairline on top, three columns from 48 rem (2fr / 1fr /
  1fr): brand at 24 px with the factory line; *Contact* — the address as
  visible text inside `mailto:` and the LinkedIn entry (placeholder text
  with no `href` while `site.linkedinUrl` is null, a link once set); *Site*
  — the language switch, the RSS link to the page language's feed and the
  toggle. Column headings are `h2` in the eyebrow style so the heading order
  holds on every page; links are 44 px, text colour turning accent on
  hover.
- **Page hero, article, blog, 404.** Inner pages open with the landing
  hero's glow and grid mask behind an eyebrow, the page's only `h1` and a
  lead (`partials/page-hero.njk`; centred on the 404 page). Articles set the
  body on a 68ch measure with mono `h2`/`h3` under an accent bar, code on
  the surface colour, blockquotes with a green rule and mono metadata; the
  other-language link is a secondary button. The about page's GRC-fork note
  is a labelled `aside.card.note` with the attribution link as its action
  row.
- **Responsiveness and targets.** `.container` caps at 76 rem with fluid
  gutters; every grid uses `minmax(0, 1fr)` tracks and card and console
  text wraps anywhere, so nothing scrolls horizontally at 360 px and 4K
  stops at 76 rem. Breakpoints: 30, 40, 46, 48, 64 and 70 rem. Buttons,
  navigation and footer links, category chips, card title links, the
  toggle and the language switches are all at least 44 px tall.

## Motion

Motion establishes hierarchy and never moves layout — only `opacity` and
`translate` animate, so the cumulative layout shift stays at zero.

- **Entrance.** `.reveal` elements start at `opacity: 0; translate: 0 14px`
  only when JavaScript runs (`html.js`) and the visitor has not asked for
  reduced motion, and transition into place over 600 ms with a 90 ms stagger
  from their position among their siblings (`--i` from `:nth-child` rules;
  inline styles are forbidden by the HTML gate). `src/assets/js/reveal.js`
  (~0.9 KB, a same-origin module script loaded after parsing) adds
  `is-visible` on intersection (`rootMargin: 0 0 -8%`), or immediately when
  `prefers-reduced-motion: reduce` matches or `IntersectionObserver` is
  missing. The hero's own stagger — eyebrow, statement, lead, actions, proof
  line and the console — is a pure-CSS `rise` animation (700 ms), and the
  console's log lines "print" one after another at 120 ms, so the first
  screen never waits for the script. Without JavaScript nothing is ever
  hidden.
- **Hover, focus and pressed** transitions run at 380 ms on the ease-out
  curve: lifts of 1–3 px, border and colour changes, the primary button's
  glow ring, the arrow slide.
- **Caret.** The console's waiting caret blinks with `steps(2)` at 1.1 s.
- **Reduced motion.** Under `@media (prefers-reduced-motion: reduce)` every
  animation is removed and every transition shortened to 0.01 ms, `.reveal`
  renders in place, the caret is static and `scroll-behavior` is `auto`.
- **View transitions.** `@view-transition { navigation: auto }` under
  `prefers-reduced-motion: no-preference` fades navigation and the language
  switch in supporting browsers; the inline theme script has set the theme
  before the new document paints, so the transition never shows the wrong
  theme.

## Theme mechanics

The site is **dark by default for every visitor** (plan D-13, the founder's
decision: "dark mode regardless of host settings"); light is reached only
through the appearance toggle, and the choice persists.

- **Tokens** (`tokens.css`, plan D-03): every theme-dependent colour token is
  declared twice on `:root` — a plain value equal to its dark value, then the
  `light-dark(<light>, <dark>)` pair — and `color-scheme` is the only
  switch: `color-scheme: dark` on `:root`, and the light set only under
  `:root[data-theme="light"] { color-scheme: light }` (with an explicit
  `:root[data-theme="dark"]` rule beside it). There is deliberately no
  `prefers-color-scheme` media query in any stylesheet and no `--color-*`
  declared outside `:root`; the contrast gate fails on either, and also
  verifies that every plain fallback equals the pair's dark value. A browser
  without `light-dark()` (Chrome < 123, Safari < 17.5, Firefox < 120) reads
  the fallbacks and renders the dark theme — the site's default look — never
  an unstyled page.
- **The script** (`src/assets/js/theme.js`, ~1 KB, inlined into `<head>` on
  every page before the stylesheets, so the theme is set before first paint
  and the language switch never flashes): it reads
  `localStorage["addable-theme"]` inside a `try`, resolves `"light"` only
  when the stored value is `"light"` and `"dark"` otherwise — the OS
  preference is not consulted — sets `data-theme` on `<html>`, adds the
  class `js`, and on `DOMContentLoaded` binds every `[data-theme-toggle]`:
  a click flips the attribute, stores the choice, repaints `aria-pressed` on
  every toggle and rewrites the `theme-color` meta to the active background.
  The pure `resolve()` lives in `scripts/lib/theme-logic.mjs`; the theme test
  asserts the inlined script contains its exact text and no `matchMedia`, so
  the tested logic and the shipped script cannot drift.
- **Storage key:** `addable-theme`, values `light` and `dark`, no consent
  needed (a preference, not tracking); clearing site data returns the site
  to dark.
- **Head:** `<meta name="color-scheme" content="dark light">` so form
  controls and scrollbars follow the active theme, and exactly one
  `theme-color` meta, `#0B0E10`, rewritten by the script after a toggle.
- **Without JavaScript** the page is dark and the toggle is hidden
  (`html:not(.js) .theme-toggle { display: none }`).
- **The favicon** is the one exception (see *Mark and favicon*): the tab bar
  follows the OS, so the icon's light edge follows `prefers-color-scheme`.

## Alternatives considered

- **B — Ledger** and **C — Terminal** — built, previewed and judged against
  the same bar (see *Direction* and [design-directions.md](design-directions.md)):
  Ledger sells with words alone; Terminal reads as a hacker page to
  non-technical buyers and needs discipline on content-light pages.
- **The first build's identity** — the system font stack only, a warm
  neutral palette with a deep-teal accent, the OS-driven scheme with no
  toggle, a knocked-out plus mark: honest and cheap, but the founder judged
  the result "a page from the 90s, a wiki". The plus sign survives in its
  outlined Signal treatment; everything else was replaced.
- **Mono for body copy** — rejected (plan D-04): monospace paragraphs are
  longer and slower to read, and the brand voice is carried by every heading
  and label already.
- **A `system` state for the toggle** — rejected: two states read instantly,
  dark is the founder's default for everyone, and clearing storage returns
  the site to dark.
- **`prefers-color-scheme` as the first-visit default** — the plan's
  original reading; the founder decided dark for everyone. The revert would
  be one line in `resolve()`, one media-query rule in `tokens.css` and the
  corresponding gate and test assertions.
- **Pure hues as text on light** — fail 4.5:1 (1.32:1 for the green, 2.79:1
  for the orange); the darkened brand variants exist for that reason.
- **Product screenshots and a social image** — not this run (plan D-08);
  the console is the product visual and no page carries raster imagery.
- **Subset fonts** — kept as a fallback only; the unmodified files fit the
  budget and keep the OFL notice simple.
- **`color-mix()` for the header, section band and contact band** — used in
  the preview; replaced by tokens and opacity so no stylesheet outside
  `tokens.css` carries a colour value.
- **Hiding the navigation on small screens** — the preview did; the
  production header wraps instead, so the site stays keyboard-complete.

## Changing a colour

Edit the token's `light-dark()` pair *and* its plain fallback (which must
equal the dark value) in `src/assets/css/tokens.css`, keep the two switch
rules, and never add a `prefers-color-scheme` media query. If the token is
new, add its pairs to `PAIRS` in `scripts/check/contrast.mjs` (kind `text`
for anything read, `ui` for borders, rings and edges; `schemes: ["light"]`
for a light-only pair) — a colour token in no pair fails the gate — or list
it in `DECORATIVE` if it is never text and never the boundary of a control.
Run `pnpm check:contrast` and copy the printed ratios into the tables above.
Colour literals outside `tokens.css` fail the gate. Three places repeat token
values as literals and are changed by hand: the `theme-color` meta in
`partials/head.njk` and the two backgrounds in `src/assets/js/theme.js`
(`#0B0E10` / `#F7F8F6`), and the fills and edge in `src/favicon.svg`
(`#0B0E10`, `#83F35D`, `#256B15`).

## Adding an app without breaking the balance

An app is one entry in `src/_data/portfolio.json` — `key`, `theme`
(`ai-apps`, `ai-adoption` or `investing`), `repo` (`owner/name`), `url`
(the public repository, or `null` for a private one), `status`, and
`source.readme` + `source.retrieved` — plus `portfolio.<key>.name` and
`portfolio.<key>.summary` in both `src/_data/strings/en.json` and
`sv.json`. Templates contain no app copy. The copy bands keep the cards
balanced, and `tests/apps.test.mjs` (`validateApps()` in
`scripts/lib/apps.mjs`) fails naming the key, the language or the band
when they are broken:

- **Name ≤ 16 characters** and **service title ≤ 20 characters** in both
  languages, so titles stay on one line in the narrowest multi-column
  track.
- **Status label ≤ 22 characters**, except `private`, which is the
  founder-confirmed wording and is asserted verbatim in both languages
  ("private · API keys on request" / "privat · API-nycklar på förfrågan").
  A longer chip is what forced the theme caption onto its own track; do not
  lengthen it further.
- **Summaries within a 25 % length band** per language (the longest at most
  1.25 × the shortest), as are the three service texts, so descriptions in
  a row take the same number of lines. Write the new one-liner to card
  length (today's summaries are 132–153 characters) and check the band.
- **2–4 "What you get" items** per service.
- **Private entries carry `url: null`** and get the private note; public
  ones link `https://github.com/…` once, through the action row. Nothing may
  name `addable-labs/factory`.
- **A new status** needs an entry in `STATUS_KEYS` (`scripts/lib/apps.mjs`),
  a label in both `portfolioStatus` maps, and a `chip-<status>` colour rule
  in `base.css` (accent for shipped/open source, orange for in progress,
  muted for the rest); unused labels are rejected, so remove a label when
  its last entry goes.
- Keep the order of the six entries the founder chose (`APP_KEYS`); a new
  entry extends the list in `apps.mjs` and the data file together.

Then run `pnpm check` and `pnpm test`: the content gate proves the rendered
grid and the layout gate (plan T8) measures the balance at five widths in
both languages.
