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
to finish. This article describes how that went: the stages, what the founder
looked at, and the checks that stand between an agent's change and a published
page.

## The stages

The run moved through a fixed sequence, and every stage wrote a document that
the next one had to read: requirements, an implementation plan, a review of that
plan, a decomposition into work items, the implementation itself, a review of the
result, and finally publication. The requirements turned a short brief into
numbered statements with acceptance criteria. The plan chose the stack, fixed
the URL structure, the front-matter schema for articles and even the colour
palette with measured contrast ratios, and explained the alternatives it
rejected. The decomposition cut that plan into work items, each with its own
proof command, and an agent then implemented them one at a time on a local
branch.

## What the founder reviews

Nothing on this site goes public on an agent's say-so. The founder reviews the
requirements, the plan's decisions and every commit locally before anything is
pushed or merged, and owns the parts no agent can settle: the wording about the
company and its founder, the Swedish text, which private projects may be
mentioned, and the steps that touch the domain and hosting. Where the agents had
to assume something, the plan says so and marks the assumption for review.

## The gates

One command runs every check, and the same command runs on each pull request.
It builds the site, verifies that every internal link points at a real page,
validates the HTML, checks the structure of every page — landmarks, a single
main heading, a skip link, alt text on images — measures the contrast of every
colour pair in both the light and the dark scheme, confirms that every English
page has a Swedish counterpart and that the two sets of interface strings have
the same keys, validates the feeds, and greps the output for the facts the pages
are required to state. Each gate has a test proving that it fails when something
is deliberately broken.

## Two honest observations

Most of the effort went into writing things down before writing code. The agents
worked well wherever the plan was exact — a token name, a permalink pattern, a
threshold — and had to guess wherever it was vague. Precision in the documents
turned out to matter more than cleverness in the code.

The gates catch mechanical mistakes, not untruths. A missing Swedish page, a link
to nowhere or a colour that fails contrast is caught automatically; whether a
sentence about a product is true is not. So every factual claim on this site
traces to a source, usually a repository's README read again at build time, and
the founder still reads all of it. The agents also made mistakes along the way:
one implementation step started on the wrong item and had to be handed back,
which is exactly why every step ends with a written summary a reviewer can check.

The site itself is plain: static HTML and CSS, no JavaScript, no web fonts, no
third-party requests. That was a decision, not an accident, and it is one the
gates can verify.
