# Design directions for the redesign

Three genuinely distinct directions were built as real pages with the site's
own stack (Eleventy, Nunjucks, CSS, the self-hosted JetBrains Mono) for the
founder's direction gate (requirements REQ-002, plan `plans/website-redesign/build/implementation-plan.md`).
They share the same landing-page content model — hero, services, apps and
products, how we work, latest writing, contact, footer — so the comparison is
about design, not copy.

| Direction | Preview | Rationale | In one line |
| --- | --- | --- | --- |
| A — Signal | `/preview/signal/` | [signal.md](design-directions/signal.md) | Product-led, crisp grid, mono headings + sans body, agent-console hero, staggered motion. Linear/Vercel. |
| B — Ledger | `/preview/ledger/` | [ledger.md](design-directions/ledger.md) | Editorial, centred, label \| content sections, ledger rows instead of cards, minimal motion. Stripe. |
| C — Terminal | `/preview/terminal/` | [terminal.md](design-directions/terminal.md) | Bold, dense, mono everywhere, bordered panels with title bars, boot-sequence reveal. Raycast. |

## How to view

```bash
pnpm install --frozen-lockfile
pnpm preview          # PREVIEW=1 eleventy --serve --output=_preview
# http://localhost:8080/preview/signal/  /preview/ledger/  /preview/terminal/
```

The previews are English only, excluded from collections, the sitemap, the
feeds and every gate, and never part of a production build (`pnpm build`
ignores `src/preview/` and copies nothing from `previews/`). Each page has the
appearance toggle in the header and footer, so both themes can be judged.

## The pick

The design-author's recommendation was **A — Signal** (reasons in the plan,
*Decisions*, D-01).

**Founder's pick:** **A — Signal**, 2026-09-20 20:23 CEST — "A, i love
signal's design and look and feel! good job! also, as i said above: columns
must align". The one note, that the hero console's columns must align across
rows, was fixed the same evening (shared four-column subgrid on
`.console-log`, both themes). Only Signal is implemented; the Ledger and
Terminal pages are removed from `src/` once the implementation starts and
their rationales stay in this directory. `docs/identity.md` records the pick
and the reasons with the implemented system.
