---
title: Lessons from building nivå
description: What an AI fluency and adoption self-assessment for individuals and teams taught us about approach and decisions while it is still in development.
date: 2026-09-23
category: ai-journey             # app-development | ai-journey
translationKey: lessons-from-building-niva
draft: false                     # published — set true to keep it out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: true              # a person has read it
---

[nivå](https://erniva.se/) — Swedish for "level" — is an AI fluency and AI adoption maturity
self-assessment for individuals and teams. It is in development, so this is not
a story about results. It is a note on the approach and the decisions taken so
far, written while they are still fresh.

## The problem

It is hard to know how fluent you actually are with AI tools, and harder still to
know where a team stands. People rate themselves on their self-image rather than
on what they do, and a team's picture is the sum of those guesses. nivå exists to
replace that guess with something more honest and more useful.

## The shape of the product

{% figure "assessment" %}

Individuals pick, for each area, the behaviourally anchored statement — level one
to five — that matches how they actually work. They get a radar chart, a maturity
index and, per area, a guide to the next level. Teams add invites, an aggregate
radar, a heatmap of members against areas, a gap-to-target analysis, trends over
time and target levels per area that the team sets itself; the wording of the
levels stays nivå's own. The product is bilingual, English and Swedish, and is
built on Next.js and Supabase, with the data hosted in Sweden.

{% figure "team", "wide" %}

## Where it stands

The nivå application is still in development, but its landing page is live and
you can sign up there. The application shell, the locale routing, the test and
CI harness, the assessment itself, its data model and sign-in are all in place.
What remains is a meticulous review of the guide texts and the Swedish
translations, and finishing the back-office application. The application has no
launch date yet.

## Lessons so far

**Anchor levels in behaviour, not self-image.** Every level is a statement about
how someone works, not a label they pick. Choosing between concrete descriptions
is harder to inflate than choosing a number, and it makes the guide to the next
level a natural next step rather than an afterthought.

**Write the plan before the code.** One document is the authoritative plan,
another carries the constraints and working agreements, and progress and
decisions are logged as they happen. Humans and agents read the same files, and
a decision that is written down is a decision the harness makes sure is
respected.

{% figure "bilingual" %}

**Be bilingual from the first commit.** The English and Swedish routes existed
before any feature did, and the interface strings for both languages live in two
files whose key sets are compared by a unit test, so a missing translation fails
the build instead of shipping. This website adopted the same rule.

{% figure "harness" %}

**Build the harness before the features.** Type-checking, linting and unit tests
run before every commit, end-to-end tests exercise the built app, and database
migrations are append-only. Starting with the harness is slower at first and
faster for every commit after that.

**Defer what can wait.** Some integrations, with HR systems for instance, and
some assessment modules are deferred until the need for them is validated. Each
of those is a decision to spend attention on the core of the assessment first.

## What we do not know yet

Whether the guides are useful enough to every user, whether teams get value from
the heatmap, and how the assessment behaves at scale are open questions that
only real use can answer. The answers will come from feedback — which is why we
plan to offer preview releases of modules, to polish them a bit more before they
are final. When there is something to tell, we will write about it here.
