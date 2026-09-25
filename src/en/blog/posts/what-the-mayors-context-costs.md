---
title: A study of the mayor's context
description: What a bead cost the mayor, the agent that coordinates the factory behind this site, on 22–23 and 24–25 September 2026, what drove that cost and what each change to its context did.
date: 2026-09-24
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: true                      # built locally, left out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # true once a person has read it
---

## Summary

The mayor, the agent that coordinates [the
factory](/blog/why-we-run-an-agent-run-factory/) behind this site, processed
8.28 million tokens per bead a worker delivered on 22–23 September and 5.14
million on 24–25 September: 38% fewer, for 57 beads instead of 35. A bead is
one task in the factory's tracker, and a worker is an agent session that does
one.

The whole saving came from re-orientation, the calls a new session makes
before its first outward action (a reply, a dispatch, a bead written, a
commit). Re-orientation cost 3.71 million tokens per bead in the first period
and 0.15 million in the second: hand-offs fell from 1.46 to 0.18 per bead, and
each new session needed about a third of the tokens to re-orient. The price of
handing off later was a longer context on every call. After the first outward
action a call processed 187,000 tokens on average instead of 142,000, so the
work itself cost 4.99 million tokens per bead instead of 4.57 million, 9%
more, although it took fewer calls per bead.

These numbers show where the tokens went, not how much of the fall each change
caused. The work differed between the periods, and the changes came at once:
the hand-off point, the content every session starts with, the notes the mayor
keeps between sessions and how it answers quick questions. Counted per bead
the mayor handled, including 33 it closed itself, the first period comes out
cheaper.

## What a session is

The mayor is one long-lived Gas City agent that works in sessions. A session
is one Claude Code conversation with one context. It starts with the start-up
content (Claude Code's system prompt and tool definitions, the lists of skills
and tools, the rules files and Gas City's prompt for the mayor), reads its
notes, works and ends at a hand-off: it writes down the state of its work, and
a new session continues from there. All 61 sessions of the two periods ended
with a hand-off of their own; none ended in a crash or a restart.

A session is therefore a unit of context, not of work: how many there are
depends on how fast the context grows and where the hand-off point lies. On
22–23 September Gas City called a hand-off at 160,000 tokens, and the median
session made 44 calls to the model in 19 minutes. From 24 September it called
one at 300,000 tokens, and the median session made 160 calls in 122 minutes.

Every call sends the model the whole context. The study counts every token
sent and every token the model produced as processed, whether it was read
from the cache or not, so what a session costs is what sits in its context
times the calls that send it again. A token added in the middle of a session
was sent again 28 times on average on 22–23 September and 90 times on 24–25
September. The start-up content goes with every call, so it costs its size
times the calls, not times the sessions: fewer sessions do not make it
cheaper; only a smaller start-up or fewer calls do.

## The work and the messages

Each period is a run of whole sessions, from 22 September, 21:09 UTC, to 23
September, 18:54 UTC, and from 24 September, 08:34 UTC, to 25 September, 07:21
UTC. The sources, none of them public, are the mayor's session transcripts
with their token counts, the task tracker, the mail between agents, the
founder's messages and the git history.

| In each period | 22–23 Sep | 24–25 Sep |
| --- | ---: | ---: |
| Beads delivered by workers | 35 | 57 |
| Beads the mayor closed itself | 33 | 0 |
| Commits that reached main | 32 | 85 |
| Beads dispatched to a worker | 38 | 58 |
| Reports mailed by workers | 37 | 58 |
| Discord messages from the founder | 18 | 10 |
| Sessions, each ended by a hand-off | 51 | 10 |
| Tokens processed by the mayor (millions) | 290 | 293 |
| Per bead delivered by workers (millions) | 8.28 | 5.14 |

In the first period all of the workers' beads were for the site: its texts,
its checks and tests and its README, much of it in close contact with the
founder. The mayor also closed 33 beads itself, most of them review findings
it dismissed. In the second period 32 of the 57 beads were for a second
project, [Gaimer](https://github.com/addable-labs/gaimer), most of them small
pull requests from one review of its code. A worker found its instructions in
the bead the mayor dispatched and mailed one report when it was done; the
mayor followed the work through its own watches. Beyond the dispatches, it
sent workers two mails and two nudges, all in the second period.

## What filled the context

{% figure "sources" %}

The growth of the context from one call to the next was split over what
caused it: the mayor's own output exactly, from the token counts, and tool
results and messages by their size, an estimate. In the first period half of
all tokens processed were the start-up content, sent with every call of 51
short sessions. In the second it was a quarter: the start-up was smaller, and
what the work added was sent again 90 times on average instead of 28. The
mayor's own output, most of it its reasoning, the diffs it read and the
workers' reports weighed more.

## Findings, changes and outcomes

| Finding | Change | Outcome |
| --- | --- | --- |
| A hand-off every 19 minutes (median): Gas City took the model's window to be 200,000 tokens | Window set to 1,000,000 tokens, hand-off called at 30% of it | 0.18 hand-offs per bead instead of 1.46, but 187,000 tokens per call after the first outward action instead of 142,000 |
| Start-up content no session used, on every call: four plugins and ten connectors of the account | Switched off | 42,500 tokens of start-up content per call instead of 64,000 (medians); at the old size the second period would have processed 12% more |
| A notes log too long to read whole: sessions skipped most of it and took old facts as current | A state card rewritten at every hand-off and a reference read in one call, both trimmed and capped on 24 September | A new session acted after 12 calls instead of 21, its context grown by 31,000 tokens instead of 58,000 (medians); not separable from the two changes above |
| Slow answers to simple questions | A question from the founder that starts with "?" answered at once; shorter timeouts for two prompt hooks | Untested: no answer times from before |

The state card and the reference were already in place in the first period,
so the comparison shows only their trimming, together with the other changes.
The finding behind them had one plain example: a session reported the task
database's sync as moved to a private repository while the database's own
remote still named the public one, until a later session checked the state
instead of trusting its notes.

## What the numbers do not show

- The work differed. Counted per bead the mayor handled, including the 33 it
  closed itself, the first period used 4.26 million tokens per bead and the
  second 5.14 million: the order reverses. The numbers show the mechanism,
  fewer re-orientations traded for a longer context per call, not that the
  changes caused the whole fall per bead.
- The notes and the hand-off point changed together, and the start-up content
  shrank between the periods too; two periods cannot separate them.
- The mayor's subagents, three in each period, used 62.9 million tokens of
  their own in the first period and 15.2 million in the second. They are not
  in the totals, and neither are the workers' tokens.
- A token read from the cache counts like any other: 97% of the first
  period's tokens and 99% of the second's were cache reads.

Two tests would settle more. In a replay, fresh sessions that cannot act
start from one saved state with one waiting message, once each with the old
log, the first card and the trimmed card; the measures are the tokens until
the first outward action and whether that action is the right one. Hand-off
points alternating by day, 15% and 30% of the window, with similar work, would
measure the hand-off point per bead delivered.

## What the next changes would target

The second period's shares point at three targets:

- The mayor's own reasoning, 17% of all tokens, at the highest
  reasoning-effort setting for every answer: a lower setting for routine
  steps.
- The diffs and the workers' reports it reads in its own context, 13%:
  reading them in a subagent that returns only its verdict.
- The start-up content, 25%: about 33,000 tokens of every start are Claude
  Code's own system prompt and tool definitions, which the factory cannot
  configure, so only the rest can shrink.
