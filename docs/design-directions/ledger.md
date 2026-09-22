# Direction B — Ledger

Preview: removed from `src/` after the founder's pick (REQ-002); the page
lived at `/preview/ledger/` under `pnpm preview` and can still be served by
any commit from `446527e` up to `4f78dd1`
(see [../design-directions.md](../design-directions.md)).
Source then: `src/preview/ledger.njk`, `previews/assets/ledger.css`.

**In one line.** Editorial and calm: a centred, type-led hero, numbered
sections laid out as label | content columns with a sticky label, rules and
whitespace instead of cards, the apps as a ledger of rows, a warm near-black
with a warm off-white, and almost no motion. Closest reference in the bar:
Stripe's documentation-grade restraint.

## Audience and tone

A cautious buyer who trusts substance over surface — a CTO, a founder's peer, a
reader arriving from an article. The tone is unhurried and precise: everything
is numbered, dated and stated once. The page reads like a well-set company
prospectus.

## Type scale

- Display (h1): JetBrains Mono Regular 400, `clamp(2rem, 1.1rem + 3vw, 3.5rem)`,
  line-height 1.12, centred, max 26 characters per line.
- Section headings: Mono Regular `clamp(1.5rem, 1.2rem + 1.2vw, 2rem)` in the
  left label column with a small green number above; item headings Mono
  Medium 1.25rem.
- Body copy: the system sans at 1.0625rem/1.7 on a 62-character measure — the
  most readable long-form setting of the three, which carries over to articles
  and the about page unchanged.
- Metadata (dates, statuses, numbers, the table of contents): Mono 0.75rem
  with +0.12–0.14em tracking where uppercase.

## Colour system

Dark-first with a warm cast: background `#0F1113`, text `#E7E5DF` (warm
off-white), muted `#A3A099`. Green is used as a *rule*: the underline of
every link (thickens on hover), the current-nav underline, the numbers, the
status dots of shipped projects and the single filled primary button. Orange
only marks attention (draft chip, "in development"). Light theme: paper
`#F6F5F1`, ink `#17191B`, the same darkened brand variants for text. Borders
meet 3:1; the hairlines between rows are decorative.

## Component language

No cards. Sections are separated by hairlines and generous vertical space; the
label column sticks while the body scrolls. Buttons are rectangles with 4px
radius (one filled, one quiet). Chips are small rectangles. The apps grid is a
ledger: name and theme | one-liner | status with a dot and, for private
repositories, a "no public link yet" note. The trust block is a two-column
definition list with rule-lines. The footer is one row: factory line left,
contact, language, RSS and the toggle right. A table of contents under the
hero doubles as the page's in-page navigation.

## Motion principles

Minimal by design: the hero fades in (opacity only, 900ms, staggered), links
thicken their underline on hover, arrows nudge 3px. Cross-document view
transitions (`@view-transition { navigation: auto }`) smooth navigation and the
language switch in browsers that support them; nothing is scroll-linked and
nothing moves layout. Under reduced motion, nothing animates.

## Why this direction

It is the most trustworthy and the most readable, and the cheapest to
maintain: one layout pattern (label | content) serves the landing page, the
about page and the blog index. Risk: it is the least "product-led" of the
three — the hero sells with words alone — and its calm can read as
understated next to Linear or Raycast.
