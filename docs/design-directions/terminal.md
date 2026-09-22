# Direction C — Terminal

Preview: removed from `src/` after the founder's pick (REQ-002); the page
lived at `/preview/terminal/` under `pnpm preview` and can still be served by
any commit from `446527e` up to `4f78dd1`
(see [../design-directions.md](../design-directions.md)).
Source then: `src/preview/terminal.njk`, `previews/assets/terminal.css`.

**In one line.** Bold and dense: JetBrains Mono for everything, including body
copy; a grid of bordered panels with title bars (`[ services ]`); a
prompt-and-caret hero next to a status panel of key–value facts; `//` section
markers; green as the primary accent on text and borders; a boot-sequence
reveal. Closest reference in the bar: Raycast's developer-tool density.

## Audience and tone

Developers, technical founders and buyers who want to see the engine. The tone
is direct, almost a readout: facts as key–value pairs, statuses as dots, the
factory's stages as a log. It is the most brand-authentic of the three — the
site looks like the founder's other products, which run dark in this typeface.

## Type scale

- Display (h1): Mono Medium 500, `clamp(1.75rem, 1.1rem + 2.4vw, 3rem)`,
  line-height 1.15, prefixed with a green `>` and followed by a blinking
  block caret.
- Section headings: Mono Medium `clamp(1.35rem, 1.1rem + 1vw, 1.75rem)` with a
  green `//` marker. Panel titles 1.0625rem Medium.
- Body copy: Mono Light 300 at 0.9375rem/1.7. The light weight keeps
  paragraphs airy; long articles are the known cost of this choice and the
  article layout would cap the measure at ~64 characters.
- Labels: Mono 0.75rem in `[ brackets ]`, statuses with a `●` dot.

## Colour system

Deepest dark of the three: background `#0A0C0E` with a faint dot grid,
panels `#0F1215`, panel bars `#151A1E`, text `#D9E0E5`, muted `#8E9AA4`. Green
`#83F35D` is the primary accent *as text* (prompts, tags, headings' markers,
links) and as the hover outline and glow of panels and buttons; the primary
button is filled green with dark text. Orange marks status and attention.
Light theme: `#F3F5F2` background, `#151A1E` ink, darkened brand text
variants; the dot grid stays. Borders meet 3:1 and form the visible grid.

## Component language

Everything is a panel: a 1px 3:1 border, a title bar with a bracketed tag on
the left and metadata on the right, a body. Panels sit in a 2px-gap grid so
the borders read as one drawn grid (Raycast/Linear "bento" density). Buttons
are square, the primary prefixed with `> `. Chips are square. The hero is two
panels: statement + status (founded, founder, team, stack, open source, this
site). The trust section pairs a "how we work" panel with a "proof" log
panel. The footer is a single row on a surface strip.

## Motion principles

A boot sequence on load: the hero panels rise in 160ms apart; the caret
blinks; panels below the fold reveal their contents (not their frames) as they
enter the viewport; hover on linked panels adds a green inset outline and a
soft glow. Under reduced motion the page renders complete and the caret is
static; without JavaScript everything is visible.

## Why this direction

Unmistakable and consistent with the founder's product family; the densest
information per screen. Risks: mono body copy and the "readout" tone can read
as a hacker page rather than a company that sells services to non-technical
buyers, and the visual density needs discipline on content-light pages
(category pages, 404) so they do not feel empty inside the grid.
