# Direction A — Signal

Preview: removed from `src/` after the founder's pick (REQ-002); the page
lived at `/preview/signal/` under `pnpm preview` and can still be served by
any commit from `446527e` up to `4f78dd1`
(see [../design-directions.md](../design-directions.md)).
Source then: `src/preview/signal.njk`, `previews/assets/signal.css`. **This is
the implemented direction** — the shipped system is documented in
[../identity.md](../identity.md).

**In one line.** Product-led and crisp: the landing page reads like a product
company's page, with a two-column hero — a large statement next to a type-led
"agent console" that shows, honestly, how the factory builds — sections on a
quiet grid, elevated cards, one vivid green accent and restrained, staggered
motion. Closest reference in the bar: Linear and Vercel.

## Audience and tone

A prospective client or buyer who needs to decide in seconds whether this is a
serious company. The tone is confident and specific: numbers, statuses and
proof are visible on the first screen (the console shows requirements, plan,
review, gates, founder approval). Nothing is decorative for its own sake; the
console is the product visual REQ-009 asks for, drawn in HTML and CSS, no
imagery.

## Type scale

- Display (h1): JetBrains Mono Light 300, `clamp(2.25rem, 1.3rem + 3.2vw, 4.1rem)`,
  line-height 1.05, tracking −0.035em. The light weight at display size gives
  the mono a refined, drafting-table look instead of a code-listing look.
- Section headings (h2): Mono Medium 500, `clamp(1.75rem, 1.35rem + 1.6vw, 2.5rem)`,
  tracking −0.02em. Card titles (h3) 1.125–1.375rem Medium.
- Eyebrows and labels: Mono Medium 0.75rem, uppercase, +0.12em tracking, in the
  accent colour, preceded by a glowing dot on the hero.
- Body copy: the system sans stack at 1rem/1.6 (lead 1.125rem). Mono is kept
  for wordmark, headings, UI labels, buttons, chips, metadata and the console —
  the brand voice — while paragraphs stay effortless to read. Zero extra font
  bytes for the sans.

## Colour system

Dark-first. Background `#0B0E10`, surfaces `#13181C` / `#1A2126`, text
`#ECEFF1`, muted `#A6B0BA`. Green `#83F35D` is the single vivid accent: eyebrow
text, the primary button surface (dark text on green, 13.8:1), the hero glow,
focus rings, the active-nav underline, hover borders. Orange `#FF6F00` is
reserved for status and attention (the "in development" chip, the draft chip,
the waiting cursor) so it never competes with the CTA. Light theme: paper
`#F7F8F6`, ink `#14191D`, green text darkened to `#256B15` (6.2:1), orange text
to `#A84600` (≥ 4.5:1); the pure hues stay as button surfaces and glows only.
Every pair was measured, and the shipped palette keeps these values: the
ratios are in [../identity.md](../identity.md). Borders meet 3:1, the
hairlines used for section rules are decorative.

## Component language

Rounded (12–18px) elevated cards with a 3:1 border that turns green and lifts
2–3px on hover; pill buttons (primary filled green with a soft glow on hover,
secondary outlined); pill chips with a status dot; a sticky, blurred header
with an underline for the current page; a "console" figure with a title bar;
a definition-list trust block with green rule-lines; a contact band with a
faint green gradient; a three-column footer that carries contact, language,
RSS and the appearance toggle.

## Motion principles

Motion establishes hierarchy: the hero's eyebrow, statement, lead, CTAs and
proof line rise in with a 90ms stagger; the console's log lines "print" one
after another; sections below the fold rise in as they enter the viewport
(IntersectionObserver, opacity and 14px translate only). Hover lifts and glows
run at 380ms on an ease-out curve. Under `prefers-reduced-motion: reduce`
everything renders in place and the cursor stops blinking; without JavaScript
every element is visible.

## Why this direction

It is the most "sells, not describes" of the three: the first screen states
what the company does, proves how it works, and offers two actions. It gives
the founder's mono typeface the leading role without asking readers to read
paragraphs in a monospace. Risks: the console must stay honest (its lines are
drawn from real runs) and the light theme needs the darkened brand variants,
which the contrast gate enforces.
