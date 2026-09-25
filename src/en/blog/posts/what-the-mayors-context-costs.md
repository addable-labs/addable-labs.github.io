---
title: A study of the mayor's context
description: How the context of the mayor, the agent that coordinates the factory behind this site, was configured and used from 20 to 25 September 2026, which problems the session records show, what was changed and what is still open.
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
session records of 20 to 25 September 2026. The mayor's sessions processed the
same tokens overall in two counts of 22 hours each, 290 million on 22–23
September and 293 million on 24–25 September, with a third more calls after a
session's first outward action in the later count. Several things changed at
once between the counts: the hand-off point, from about 16% to 30% of the
window; the notes kept between sessions, trimmed and capped; the start-up
content, with plugins and the account's connectors switched off; and the work,
partly for a second project, [Gaimer](https://github.com/addable-labs/gaimer).
The share of tokens processed before a session's first outward action fell
from 45% to 3%, mostly because there were 10 sessions instead of 51. The first
new notes made re-orientation dearer in exchange for a correct start; trimmed,
they made it cheaper. Of the changes, only the start-up content was measured
like for like.

{% figure "counts", "wide" %}

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
September, 07:56 UTC, to 25 September, 06:00 UTC, the first full day at 30%
with the trimmed notes.
Tokens were counted per call to the model, each session's first call included.
The tokens per call after the first outward action divide all tokens processed
by the calls after each session's first outward action. A script sorted the
tool output into categories, accurate to a few percentage points.

Limits: one factory; most effects rest on one measurement, the third count on
ten sessions whose work, partly for Gaimer, differed from the second's.

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

| Measure | Count of 22–23 September | Count of 24–25 September |
| --- | ---: | ---: |
| Hours | 22 | 22 |
| Sessions | 51 | 10 |
| Minutes per session | 26 | 132 |
| Calls to the model | 2,315 | 1,645 |
| Calls per session | 45 | 164 |
| Mean context per call (tokens) | 124,000 | 178,000 |
| Median start (tokens) | 64,000 | 42,000 |
| Median end (tokens) | 154,000 | 289,000 |
| Median growth per call (tokens) | 2,200 | 1,500 |
| Read from the cache (tokens) | 281 million | 289 million |
| Of all context tokens | ~98% | ~99% |
| All tokens processed (context and output) | 290 million | 293 million |
| Share of tokens processed before the first outward action | 45% | 3% |
| Tokens per call after the first outward action | 257,000 | 192,000 |

### Session activity

Reading its memory made up 9% of the mayor's tool output by volume during the
site's redesign build and 13% after it (report of 22 September). On 22
September the memory was an append-only log of 769 lines and 138 KB (problem
6).

## Problems

1. **Re-orientation after every hand-off.** In the median session 49,500
   tokens went by before the first outward action.
2. **Start-up content that no session used.** Until 24 September the list of
   skills held 91 skills in 32,572 characters, 12,128 of them the 40 lines of
   a plugin for a hosting platform the factory does not use; no session used
   the account's connectors either.
3. **Slow answers to simple questions.** On 23 September a separate Claude
   Code session run by the founder found that the machine was not the
   bottleneck (a load average of 2.2; the bead tool answered in 0.07
   seconds). The causes: the highest reasoning-effort setting on every answer;
   fetching fresh state before answering even what the mayor already knew;
   two prompt hooks with 15-second timeouts before every message; and the
   size of the context.
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
  handled inbound message (messages had been lost at hand-offs), what is in
  flight, what was promised and not delivered, open questions and, for every
  "done", the command that proves it. The earlier sessions had skipped most
  of the log, which is how old facts survived (problem 4). On 24 September
  both were cut by two fifths and capped in size.
- **23 September: quick questions and hooks.** A message from the founder that
  starts with "?" is answered at once from what the mayor already knows, with
  no tool call but the reply. The hooks' timeouts went from 15 seconds to 5.
- **23–24 September: window and hand-off points.** The window was set to
  1,000,000 tokens on 23 September, with a hand-off advised at 20% and called
  at 25%; since 24 September at 25% and 30% (250,000 and 300,000 tokens). The
  third count covers the first full day at 30% with the trimmed notes.
- **24 September: four plugins switched off** for the factory's sessions: the
  hosting platform's, a front-end design plugin with one skill and two
  language-server plugins without skill lines. Between the two mayor starts
  compared, only the lists of skills and agents had changed, about 12,000
  characters shorter; the hosting platform's plugin cost a tenth of a start,
  not the fifth estimated from its files on disk. Within the third count,
  starts differed by 9,000 tokens as a longer description of one Claude Code
  tool alternated between sessions with no change in the factory; the three
  sessions with it cost 213,000 tokens per call after the first outward
  action, the other seven 185,000.
- **24 September: the account's connectors switched off** for the factory's
  sessions: ten, none of them used. After the plugin was off, the hosting
  platform's tools had still reached every session, through the account's own
  connector for that platform. The connectors' cost, about 8% of the mean
  context per call, came mostly just after a session's first call.

{% figure "handoffs" %}

## Evidence per change

| Change | Test | Result | Verdict |
| --- | --- | --- | --- |
| Unused start-up content switched off: plugins and the account's connectors, 24 September | The same first step before and after | From 51,020 to 46,290 tokens at the start (the plugin, about 4,700); about 9,700 tokens a session (the connectors, two worker sessions) | Shown, one measurement each |
| State card and reference, 22–24 September | Medians before the first outward action, 33 sessions before, 56 with | From 49,500 to 54,700 tokens and from 2,200 to 32,100 characters of notes read; a correct start (problem 4) | Partly: the correct start, not the saving |
| Notes trimmed and capped, 24 September | The 22 hours after against the three sessions before, that day | 31,000 against 63,000–105,000 tokens before the first outward action; 28,000 against 42,000–47,000 characters of notes read | Indicated, on three sessions before |
| Later hand-off point, called at 30% since 24 September | The third count against the second | The same tokens overall with a third more calls after the first outward action and a mean context per call 43% larger, but changed together with the notes, the start-up content and the work; the three sessions at 30% before the notes were trimmed saved nothing (257,000) | Not isolated |
| Quick questions and 5-second hooks, 23 September | No times from before; the hooks not measured on their own | Three quick answers in 24–58 seconds | Untested |

Only the start-up content was measured on a like-for-like step.

## Open questions and ideas

- Whether the third count's result holds over more days and other work.
- A replay to test the notes, not yet run: fresh sessions that cannot act
  start from one saved state with one waiting message, once each with the old
  log, the first card and the trimmed card; the measures are the tokens until
  the first outward action and whether that action is the right one.
- The hand-off point: later hand-offs mean fewer re-orientations but a longer
  context on every step and older facts in the window; a point later than 30%
  is untested. Two ideas, not yet run: hand-off points alternating by day,
  15% and 30%, with all else unchanged, measured per landed change and per
  answered message; and a simple model, consistent with both counts, in which
  every call re-sends the whole context and every hand-off costs one
  re-orientation. With the re-orientation of 24–25 September (about 880,000
  tokens processed a session: 3% of 293 million over 10 sessions), a growth of
  1,500 tokens a call and 73,000 tokens at the first outward action (42,000 at
  the start plus 31,000), the model puts the fewest tokens near 12–16% of the
  window, about a third fewer than at 30%. It leaves out answer quality and
  the work a hand-off interrupts, and is untested.
- A lower reasoning-effort setting for quick answers; not decided.
- A project-manager role, to be decided on measured data, now that the mayor
  also coordinates Gaimer: cleaning up its code to make it robust and up to
  date, and adding new features for its users.
