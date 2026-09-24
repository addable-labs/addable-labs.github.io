---
title: A study of the mayor's context
description: How the context of the mayor, the agent that coordinates the factory behind this site, was configured and used from 20 to 24 September 2026, which problems the session records show, what was changed and what is still open.
date: 2026-09-24
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: true                      # built locally, left out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # true once a person has read it
---

## Summary

This study examines the context of the mayor, the agent that coordinates [the
factory](/blog/why-we-run-an-agent-run-factory/) behind this site, using its
session records of 20 to 24 September 2026. From 20 to 22 September about half
of a session's growth came before its first outward action, while it
re-oriented itself after a hand-off. The notes kept between sessions, the
hand-off points, the prompt hooks and the start-up content have since been
changed. In the first eight hours with the later hand-off point, the share of
all tokens processed before a session's first outward action fell from 45% to
7%, while the context per call grew by half; counted per call after the first
outward action, all tokens processed fell by a tenth. The first new notes made
re-orientation dearer in exchange for a correct start; since they were trimmed,
it has been cheaper in the two sessions measured.

## Configuration

The mayor is a Gas City agent that runs as a series of Claude Code sessions.
Each step sends the model the whole conversation so far, the session's
context. Past a set size, Gas City asks the session to hand off: it writes
down the state of its work and a new session continues from there.

The conversation's unchanged beginning is read from a cache: at API list
prices a cached token costs a tenth of a new one or less, but still counts
toward consumption. A long context still costs latency, answer quality and
consumption, and keeps old information in the window.

{% figure "session", "wide" %}

Before a session does anything, its context holds (start-up records, 24
September):

| Start-up content | Characters | Tokens |
| --- | ---: | ---: |
| Claude Code's system prompt and tool definitions (by subtraction; not configurable) | – | ~33,000 |
| The list of skills | 18,893 | – |
| The account's connectors (MCP servers that reach a session through the Claude account) | ~10,000 | – |
| Gas City's prompt for the mayor with the factory's rules, plus 8 skill lines | 6,505 + 798 | ~2,000 |
| The machine's rules file with the memory index | 3,787 | – |
| In total | – | 46,290 |

A skill enters a session only as one line, its name and description; its
full text loads only when the skill is used.

The model's window is 1,000,000 tokens. Two prompt hooks run before every
message to the mayor, adding a clock line with the queued messages and an
unread-mail reminder. Every answer uses the highest reasoning-effort setting.

## Data and method

The sources, none of them public: the mayor's session transcripts with their
token-usage records, its start-up records, its direct messages with the
founder on Discord and its memory files. The mayor's report of 22 September
covers 20 September, 12:33 UTC, to the evening of 22 September; a second count
covers 22 September, 21:09 UTC, to 23 September, 18:54 UTC; a third, 24
September, 04:07 to 12:00 UTC, the first eight hours with hand-offs at 30%.
Tokens were counted per call to the model, each session's first call included.
The tokens per call after the first outward action divide all tokens processed
by the calls after each session's first outward action. A script sorted the
tool output into categories, accurate to a few percentage points.

Limits: one project; most effects rest on one measurement, the third count on
five sessions whose work differed from the second's.

## Findings

### Context use

| Measure | Report of 22 September |
| --- | ---: |
| Sessions in 55 hours | 38 |
| Of them on one day | 21 |
| Hand-offs | 31 |
| Start of every session, before its first tool call (tokens) | 55,000–66,000 |
| Context at a hand-off (tokens) | 106,000–251,000 |
| Growth of the median session (tokens) | 87,000 |
| Of it before its first outward action (a reply, a dispatch, a bead written, a commit) | 49,500 |

| Measure | Count of 22–23 September | Count of 24 September |
| --- | ---: | ---: |
| Hours | 22 | 8 |
| Sessions | 51 | 5 |
| Minutes per session | 26 | 95 |
| Calls to the model | 2,315 | 626 |
| Calls per session | 45 | 125 |
| Mean context per call (tokens) | 124,000 | 194,000 |
| Median start (tokens) | 64,000 | 46,000 |
| Median end (tokens) | 154,000 | 306,000 |
| Median growth per call (tokens) | 2,200 | 2,500 |
| Read from the cache (tokens) | 281 million | 120 million |
| Of all context tokens | ~98% | ~99% |
| Share of tokens processed before the first outward action | 45% | 7% |
| Tokens per call after the first outward action | 257,000 | 231,000 |

### Session activity

Shares of the mayor's tool output by volume (report of 22 September), not of
the whole context. Other categories make up the rest; a dash means not listed
for that period.

| Category | During the site's redesign build (9 sessions) | After the build (29 sessions) |
| --- | ---: | ---: |
| Reading beads (69 calls) | 19% | – |
| Debugging the factory itself | ~10% | – |
| Memory | 9% | 13% |
| Screenshots | 9% | 6% |
| Mail | 8% | 9% |
| The run's requirements, plan and plan review | 7% | – |
| Re-reading its own drafts and scripts | 7% | – |
| Discord | 4% | 6% |
| Articles and plans | – | 18% |
| The site's source | – | 9% |
| Git reads | – | 5% |
| Builds, previews and live checks | – | 4% |

| Direct messages on Discord | Messages | Characters |
| --- | ---: | ---: |
| From the mayor to the founder | 116 | 135,000 |
| From the founder | 84 | 16,000 |

On 22 September the mayor's memory was an append-only log of 769 lines and
138 KB.

## Problems

1. **Re-orientation after every hand-off.** In the median session 49,500
   tokens went by before the first outward action.
2. **Start-up content that no session used.** Until 24 September the list of
   skills held 91 skills in 32,572 characters; 12,128 of those were the 40
   lines of a plugin for a hosting platform the factory does not use. Nor did
   any session use the account's connectors.
3. **Slow answers to simple questions.** A separate Claude Code session run by
   the founder found on 23 September that the machine was not the bottleneck
   (a load average of 2.2; the bead tool answered in 0.07 seconds). The
   causes: the highest reasoning-effort setting on every answer; fetching
   fresh state before answering even what the mayor already knew; two prompt
   hooks with 15-second timeouts before every message; and the size of the
   context.
4. **Old facts taken as current.** A session trusts its context and notes,
   however old, unless it checks them. On 22 September the founder asked for
   the factory's task database to sync to a private repository; until then it
   had been synced to the public repository this site is built from. The 32nd
   mayor session created the private repository, set the sync setting to it
   and reported the sync as moved. The database's own remote still named the
   public repository, and a timed job pushes to it every 15 minutes; at 16:58
   UTC its push of the whole database failed only because the connection was
   closed. The 34th session re-checked the state instead of relying on its
   notes and repointed the remote at 17:13 UTC.
5. **A hand-off point set by a wrong window size.** Gas City did not know the
   model and, until 23 September, took its window to be 200,000 tokens and
   called hand-offs at about 160,000, 16% of the real window.
6. **A memory log grown past one read.** No session could read the log whole.

{% figure "sync" %}

## Changes

- **22–24 September: state card and reference.** A state card of fixed shape,
  overwritten at every hand-off, and a reference of standing facts and rules,
  read in one call, replaced the log. The card holds the id of the last
  handled inbound message, since messages had been lost at hand-offs; what is
  in flight; what was promised and not delivered; open questions; and for
  every "done", the command that proves it. Measured once, as medians before
  the first outward action: 54,700 tokens and 32,100 characters of notes read
  in 56 sessions with the card, against 49,500 and 2,200 in 33 before it. The
  earlier sessions had skipped most of the log, which is how old facts survived
  (problem 4): a correct start bought at a higher price, not the saving
  intended. On 24 September both were cut by two fifths and capped in size.
  The first two sessions after that read 26,000 and 28,000 characters of notes before
  their first outward action and reached it after 34,000 and 38,000 tokens; the
  three sessions before them that day read 42,000 to 47,000 characters and
  needed 63,000 to 105,000.
- **23 September: quick questions and hooks.** A message from the founder that
  starts with "?" is answered at once from what the mayor already knows, with
  no tool call but the reply. The hooks' timeouts went from 15 seconds to 5.
  The three quick questions since were answered in 24 to 58 seconds; the hooks
  were not measured on their own.
- **23–24 September: window and hand-off points.** The window was set to
  1,000,000 tokens on 23 September, with a hand-off advised at 20% and called
  at 25%; since 24 September at 25% and 30% (250,000 and 300,000 tokens). The third
  count covers the first eight hours at 30%: sessions made almost three times
  as many calls, and the share of tokens processed before the first outward
  action fell from 45% to 7%, but the mean context per call rose by half, which
  took most of the gain: per call after the first outward action, a tenth fewer
  tokens. The three sessions before the notes were trimmed saved nothing
  (257,000); the two after saved a fifth (209,000).
- **24 September: four plugins switched off** for the factory's sessions: the
  hosting platform's, a front-end design plugin with one skill and two
  language-server plugins without skill lines. Measured once: the next mayor
  session started at 46,290 tokens, against 51,020 for the one before; only
  the lists of skills and agents had changed, about 12,000 characters shorter,
  so the hosting-platform plugin cost about 4,700 tokens a start: a tenth, not
  the fifth estimated from its files on disk. All five sessions of the third
  count started between 42,000 and 55,000 tokens; the three starts before the
  change had differed by 14,000.
- **24 September: the account's connectors switched off** for the factory's
  sessions: ten, none of them used. After the plugin was off, the hosting
  platform's tools had still reached every session, through the account's own
  connector for that platform. Measured once, on two sessions of the
  implementation worker that took the same first step: the connectors cost
  about 9,700 tokens a session, most of it just after the first call, about 8%
  of the mean context per call.

{% figure "handoffs" %}

## Open questions and ideas

- The third count over a full day of normal work, with more sessions.
- A lower reasoning-effort setting for quick answers; not decided.
- The hand-off point: later hand-offs mean fewer re-orientations but a longer
  context on every step and older facts in the window. In the first eight
  hours the later point saved a tenth, all of it after the notes were trimmed;
  a full day decides.
- A project-manager role, to be decided on measured data; a second project,
  not for now.
