# Visual identity

The identity of the Addable Labs website is deliberately restrained: one mark,
a live-text wordmark, the system font stack and a warm neutral palette with a
single deep-teal accent, defined once as CSS custom properties with light and
dark values. This document records what was chosen and why, the alternatives
that were rejected, and the measured contrast ratios (REQ-012, REQ-013,
REQ-014). It is the source the implementation plan summarises; the values in
`src/assets/css/tokens.css` are authoritative and `pnpm check:contrast`
re-measures them on every run.

## Wordmark

"Addable Labs" is set as live text in the site header — never as an image — in
the system sans-serif at weight 600 with −0.01em tracking (`--font-weight-heading`,
`--letter-spacing-wordmark`). "Addable" and "Labs" share one colour
(`--color-text`) so the name reads as a single word pair, and the whole brand
link turns `--color-accent-strong` on hover. Live text stays selectable,
translatable by the browser, and readable by assistive technology without any
`alt` bookkeeping.

## Mark

The mark is a plus sign — two rounded bars — knocked out of a rounded square
tile, in a 32 × 32 viewBox. It says "add" (addable) without a flask, a robot or
a brain, and it survives at 16 px because the tile is solid and the bars are
4 units thick.

- Geometry (`src/assets/img/mark.svg`): the tile is the rounded square from
  (1, 1) to (31, 31) with a 7-unit corner radius; the bars are two 4-unit-wide
  capsules from 7 to 25 on each axis with 2-unit round caps. Both shapes live in
  one `<path>` with `fill-rule="evenodd"`, so the plus is a hole and the page
  background shows through. The only colour is `currentColor`, which lets the
  header set `--color-accent` on it and any future context (a footer, a print
  stylesheet) recolour it with CSS alone.
- Header use: `partials/header.njk` inlines the file with `aria-hidden="true"`
  and `focusable="false"`; the visible wordmark next to it is the accessible
  name of the brand link. The SVG carries explicit `width`/`height` attributes
  (32 × 32) and is sized to 2 rem by `base.css`, so it never causes layout
  shift.
- Favicon (`src/favicon.svg`): the same path with a `<style>` block inside the
  SVG — `fill: #0E6B65` by default and `fill: #63C7BF` under
  `@media (prefers-color-scheme: dark)` — so the tab icon follows the OS scheme
  like the site does. Browsers that ignore SVG favicons fall back to nothing;
  no raster fallback is shipped (no raster imagery anywhere, REQ-013).
- The path data is duplicated in the two files on purpose (the favicon needs
  its own colours and cannot read the page tokens); change both together.

## Type

No web fonts. Zero font bytes keeps every page far under the 150 KB budget
(REQ-015) and removes a third-party request and a licence to maintain.

| Token | Value |
| --- | --- |
| `--font-sans` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` |
| `--font-size-base` | `clamp(1rem, 0.95rem + 0.3vw, 1.125rem)` — fluid between 16 and 18 px |
| `--line-height-body` / `--line-height-heading` | `1.6` / `1.2` |
| `--measure` | `68ch` — maximum width of prose blocks |
| heading scale | ratio 1.25: `--font-size-lg` 1.25rem (h3), `--font-size-xl` 1.5625rem (h2), `--font-size-2xl` 1.953rem (h1); headings weight 600 |

## Palette and measured contrast

Colours are declared on `:root` in `tokens.css` with the light values; the dark
set re-declares the same names inside `@media (prefers-color-scheme: dark)`, so
the OS scheme switches the site without a reload and without JavaScript. The
`<head>` adds `<meta name="color-scheme" content="light dark">` and two
`theme-color` metas with `media` attributes. There is no manual toggle.

Ratios are WCAG 2.x contrast ratios (relative luminance from linearised sRGB),
computed by `scripts/lib/contrast.mjs` and printed by `pnpm check:contrast` on
2026-09-20. Text pairs must reach 4.5:1 and UI pairs (borders, focus ring)
3:1; every pair below is comfortably above its threshold in both schemes.

| Token | Role | Light | on bg / on surface | Dark | on bg / on surface |
| --- | --- | --- | --- | --- | --- |
| `--color-bg` | page background | `#FAFAF7` | — | `#101416` | — |
| `--color-surface` | header, footer, cards, code blocks | `#FFFFFF` | — | `#181D21` | — |
| `--color-text` | body text, wordmark | `#1B1F23` | 15.85 / 16.58 | `#E8EAED` | 15.37 / 14.09 |
| `--color-text-muted` | secondary text, footer | `#4A5460` | 7.36 / 7.70 | `#A9B1B9` | 8.54 / 7.83 |
| `--color-accent` | links, mark | `#0E6B65` | 6.07 / 6.35 | `#63C7BF` | 9.22 / 8.45 |
| `--color-accent-strong` | link hover | `#0A4F4B` | 8.99 / 9.40 | `#8FDBD4` | 11.69 / 10.72 |
| `--color-border` | borders, rules (UI, ≥ 3:1) | `#7F8A94` | 3.37 / 3.52 | `#6A757E` | 3.93 / 3.61 |
| `--color-focus` | focus ring (UI, ≥ 3:1) | `#B4531B` | 4.79 / 5.01 | `#F2B26F` | 10.03 / 9.20 |

Why these colours: the background is a warm off-white rather than pure white so
long reading is calmer, with a pure-white surface for cards and chrome that
still sits at only 1.05:1 against it (a hint of depth, not a box). The text is
a near-black with a cool cast instead of `#000`, which reads softer at the
same 15.9:1. The accent is a deep teal that is unmistakably a link colour at
6.07:1 on the light background yet not the default blue of every developer
site; its dark-scheme counterpart is a light teal, because a dark accent on a
dark background would fail. The focus ring is a burnt orange, deliberately not
the accent, so keyboard focus is visible on links as well as on neutral chrome.
The border grey is tuned to just clear 3:1 in both schemes rather than
shouting.

## Layout, focus and skeleton

- Single column. Prose elements (`p`, `li`, headings, quotes) are capped at
  `--measure` (68ch); the page container is 72rem wide so the landing's card
  grid (`.card-grid`, two or three columns from 48rem, stacked below) can use
  the width.
- Every focusable element gets a visible 2px `--color-focus` ring with a 2px
  offset via `:focus-visible`. Nothing removes outlines.
- The skip link is the first element in `body`, visually hidden with the
  clip pattern until it receives focus, then shown as a surface-coloured pill
  at the top left.
- Skeleton in `layouts/base.njk`: skip link → `header` (brand, `nav` with
  `aria-label` from the strings, language-switch slot) → `main` (one `h1`) →
  `footer` (contact, RSS slot, one-line factory note). Each landmark appears
  once.

## Alternatives considered and rejected

- **A default blue accent** — reads as generic tech; teal keeps the same
  link affordance with more character.
- **An amber accent** — fails 4.5:1 on the light background unless it turns
  brown; amber survives only as the focus ring, where 3:1 is the bar.
- **Monochrome only** — links need a colour to be links without underlines
  everywhere; a single accent is the minimum.
- **A self-hosted variable font** — roughly 100 KB per page and a licence to
  keep track of, for little gain over the system stack at these sizes.
- **A figurative mark** (flask, circuit, robot, brain) — cliché for an AI and
  apps company; the plus sign states the name and nothing else.
- **A manual theme toggle** — needs JavaScript and stored preference; the OS
  setting already expresses the visitor's choice (REQ-013 makes it optional).
- **Stock imagery** — none anywhere; the only image is the SVG mark
  (article-specific screenshots and diagrams may join later, with `alt`,
  `width` and `height`).

## Changing a colour

Edit the value in `src/assets/css/tokens.css` (both schemes), add any new token
to the `PAIRS` list in `scripts/check/contrast.mjs` so it is measured, run
`pnpm check:contrast`, and update the table above with the printed ratios.
Colour literals outside `tokens.css` fail the gate. Two places repeat token
values outside CSS and must be changed by hand: the `theme-color` metas in
`partials/head.njk` (the two `--color-bg` values) and the fills in
`src/favicon.svg` (the two `--color-accent` values).
