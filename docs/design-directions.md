# Design directions for the redesign

Three genuinely distinct directions were built as real pages with the site's
own stack (Eleventy, Nunjucks, CSS, the self-hosted JetBrains Mono) for the
founder's direction gate (requirements REQ-002).
They shared the same landing-page content model — hero, services, apps and
products, how we work, latest writing, contact, footer — so the comparison was
about design, not copy.

| Direction | Rationale | In one line |
| --- | --- | --- |
| A — Signal | [signal.md](design-directions/signal.md) | Product-led, crisp grid, mono headings + sans body, agent-console hero, staggered motion. Linear/Vercel. |
| B — Ledger | [ledger.md](design-directions/ledger.md) | Editorial, centred, label \| content sections, ledger rows instead of cards, minimal motion. Stripe. |
| C — Terminal | [terminal.md](design-directions/terminal.md) | Bold, dense, mono everywhere, bordered panels with title bars, boot-sequence reveal. Raycast. |

## Where the previews went

The preview pages (`src/preview/{signal,ledger,terminal}.njk`, their
stylesheets under `previews/assets/`, the preview-only theme script and
toggle, the `PREVIEW=1` build branch and the `pnpm preview` script) were
removed from the source tree after the pick, as REQ-002 asks; only the picked
direction is implemented, and the three rationales in this directory stay.
Git history keeps the pages: they were added in `19d1378`, the console
alignment fix landed in `ce5f6cc`, and every commit up to `ab4e93b` (the last
one before the removal) can still serve them:

```bash
git worktree add ../previews ab4e93b
cd ../previews && pnpm install --frozen-lockfile && pnpm preview
# http://localhost:8080/preview/signal/  /preview/ledger/  /preview/terminal/
```

The previews were English only, excluded from collections, the sitemap, the
feeds and every gate, and never part of a production build; the production
output has no `preview/` directory and the sitemap no preview URL (AC-01).

## The pick

The design-author's recommendation was **A — Signal** (reasons in the plan,
*Decisions*, D-01).

**Founder's pick:** **A — Signal**, 2026-09-20 20:23 CEST — "A, i love
signal's design and look and feel! good job! also, as i said above: columns
must align". The one note, that the hero console's columns must align across
rows, was fixed the same evening (shared four-column subgrid on
`.console-log`, both themes; `ce5f6cc`).

**Founder feedback #2** on the Signal preview (2026-09-20 20:38 CEST, folded
into the plan at plan review as amendments A-01 … A-03): the services and
apps cards must be *balanced* — one-line titles, descriptions of equal
length, "What you get" at the same height, links bottom-aligned, cards that
do not change design with their content; the apps grid lists exactly six
projects — nivå, Notesage, marketdata-api, Compound, Ashlands, Gaimer — and
not the other public repositories; and dark is the default. At the plan
gate (21:44 CEST, A-04) he confirmed dark "regardless of host settings",
the status labels of marketdata-api and Compound, and that the about page's
GRC-fork note is kept and redesigned.

Only Signal is implemented. `docs/identity.md` records the pick, the reasons
and the implemented system — tokens, type, components and their states,
motion and theme mechanics — and is the document to read for the shipped
design.
