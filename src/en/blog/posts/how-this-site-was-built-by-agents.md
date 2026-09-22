---
title: How this site was built by agents
description: The stages, gates and founder reviews behind the first site an agent-run software factory produced end to end.
date: 2026-09-20
category: app-development        # app-development | ai-journey
translationKey: how-this-site-was-built-by-agents
draft: true                      # published, but labelled "Draft" / "Utkast"
machineTranslated: false         # Swedish files: true until a person has reviewed the text
---

Addable Labs builds software largely with AI agents, and this website is the
first thing an agent-run software factory produced for the company from start
to finish, in two builds. This article describes the stages, what the founder
looked at and the checks that stand between an agent's change and a published
page.

## The stages

Each run moved through a fixed sequence, and every stage wrote a document the
next one had to read: requirements, a plan, a review of that plan, a
decomposition into work items, the implementation, a review of the result and
publication. The requirements turned a short brief into numbered statements
with acceptance criteria. In the first build the plan chose the stack and
fixed the URL structure, the article schema and the colour palette, with the
alternatives it rejected; in the second it chose the design system. The
decomposition cut the plan into work items, each with its own proof command,
and an agent implemented them one at a time on a local branch.

{% figure "stages", "wide" %}

## What the founder reviews

{% figure "loop" %}

Nothing on this site goes public on an agent's say-so. But the first build ran
without a gate: requirements, plan and ten work items went through in four
hours, and the founder's verdict on the finished site was "a page from the
90s". The second build put his gate at the plan: he picked one of three
rendered directions, answered the plan's open questions and judged the result
on the preview next morning. He owns the parts no agent can settle: the
wording about the company, the Swedish text, which private projects may be
mentioned and the steps that touch the domain and hosting.

## The gates

{% figure "gates" %}

One command runs every check, and the same command is set to run on each pull
request. It builds the site, checks that every internal link resolves,
validates the HTML, checks every page's structure — landmarks, one main
heading, a skip link, alt text — measures the contrast of every colour pair in
both schemes, confirms that every English page has a Swedish counterpart and
both sets of interface strings have the same keys, validates the feeds and
greps the output for the facts the pages must state. Each gate has a test
proving that it fails when something is deliberately broken.

## Two honest observations

Most of what the agents wrote was not code: in the first build, 6,900 lines of
requirements, plans, summaries and reviews against 3,700 of site, gates and
tests. Precision in the documents mattered more than cleverness in the code:
the one fix the review required was a gate that hard-coded a placeholder the
founder is meant to replace.

The gates catch mechanical mistakes, not untruths: a missing Swedish page or a
colour that fails contrast is caught automatically; whether a sentence about a
product is true is not. So the facts about the apps trace to a source — the
README each was taken from and the date it was read — and the founder still
reads all of it. Agents also made mistakes: one session claimed a bookkeeping
record instead of its task and needed fourteen minutes to work around it.

The site is plain: static HTML and CSS, two small scripts (an appearance
toggle and a scroll-reveal effect; the page works without both), one
self-hosted typeface and no third-party requests or analytics. That was a
decision, and the part that matters — nothing loaded from anyone else's
servers — is verified by a gate on every build.
