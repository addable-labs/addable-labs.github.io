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
changed; two changes have been measured, once each, and whether re-orientation
now costs less is open.

## Configuration

The mayor is a Gas City agent that runs as a series of Claude Code sessions.
Each step sends the model the whole conversation so far, the session's
context. Past a set size, Gas City asks the session to hand off: it writes
down the state of its work and a new session continues from there.

The conversation's unchanged beginning is read from a cache, not processed
again: at API list prices a cached token costs a tenth of a new one or less,
depending on the model, though it still counts toward consumption. A long
context still costs in latency, answer quality and consumption, and it keeps
old information in the window.

Before a session does anything, its context holds (start-up records, 24
September):

- Claude Code's system prompt and tool definitions: roughly 33,000 tokens, by
  subtraction; not configurable
- The list of skills: 18,893 characters
- The account's connectors (MCP servers that reach a session through the
  Claude account, not Gas City): about 10,000 characters
- Gas City's prompt for the mayor with the factory's rules: 6,505 characters
  plus 8 skill lines (798 characters), about 2,000 tokens
- The machine's rules file with the memory index: 3,787 characters

In total 46,290 tokens. A skill enters a session only as one line, its name
and description; its full text loads only when the skill is used.

The model's window is 1,000,000 tokens. Two prompt hooks run before every
message to the mayor, adding a clock line with the queued messages and an
unread-mail reminder. Every answer uses the highest reasoning-effort setting.

## Data and method

The sources, none of them public: the mayor's session transcripts with their
token-usage records, its start-up records, its direct messages with the
founder on Discord and its memory files. The mayor's report of 22 September
covers its 38 sessions from 20 September, 12:33 UTC, to the evening of 22
September; a second count covers 22 September, 21:09 UTC, to 23 September,
18:54 UTC. Tokens were counted per call to the model, each session's first
call included. A script sorted the tool output into categories, accurate to a
few percentage points.

Limits: one project; the plugin and connector effects are one measurement
each; no other change is measured yet.

## Findings

### Context use

The report of 22 September:

- 38 sessions in 55 hours, 21 of them on one day, one project, 31 hand-offs
- Every session started at 55,000 to 66,000 tokens before its first tool call
- Hand-offs came at 106,000 to 251,000 tokens
- The median session grew by 87,000 tokens, 49,000 of them before its first
  outward action (a reply, a dispatch, a bead written, a commit): about half

The count for 22–23 September:

- 51 sessions and 2,315 calls to the model, 45 per session
- A mean context of 124,000 tokens per call
- A median start of 64,000 tokens, a median end of 154,000 and a median growth
  of 2,200 tokens per call
- 281 million tokens read from the cache, about 98% of all context tokens

### Session activity

Shares of the mayor's tool output by volume (report of 22 September), not of
the whole context; other categories make up the rest.

During the site's redesign build (9 sessions):

- Reading beads: 19% (69 calls)
- Debugging the factory itself: about 10%
- Memory: 9%
- Screenshots: 9%
- Mail: 8%
- The run's requirements, plan and plan review: 7%
- Re-reading its own drafts and scripts: 7%
- Discord: 4%

After the build (29 sessions):

- Articles and plans: 18%
- Memory: 13%
- Mail: 9%
- The site's source: 9%
- Discord: 6%
- Screenshots: 6%
- Git reads: 5%
- Builds, previews and live checks: 4%

Direct messages on Discord: 116 from the mayor to the founder (135,000
characters), 84 from the founder (16,000). On 22 September the mayor's memory
was an append-only log of 769 lines and 138 KB.

## Problems

1. **Re-orientation after every hand-off.** In the median session 49,000
   tokens went by before the first outward action, and this recurred at every
   hand-off: 31 times in 55 hours.
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

## Changes

- **22–23 September: state card and reference.** A state card of fixed shape,
  overwritten at every hand-off, and a reference of standing facts and rules,
  read in one call, replaced the log. The card holds the id of the last
  handled inbound message, since messages had been lost at hand-offs; what is
  in flight; what was promised and not delivered; open questions, each with
  the id of the message it was asked in; running processes with their ids; and
  for every "done", the command that proves it. Not measured yet.
- **23 September: quick questions and hooks.** A message from the founder that
  starts with "?" is answered at once from what the mayor already knows, with
  no tool call but the reply. The hooks' timeouts went from 15 seconds to 5.
  Not measured yet.
- **23–24 September: window and hand-off points.** The window was set to
  1,000,000 tokens on 23 September, with a hand-off advised at 20% and called
  at 25%; since 24 September at 25% and 30% (250,000 and 300,000 tokens). Not
  measured yet.
- **24 September: four plugins switched off** for the factory's sessions: the
  hosting platform's, a front-end design plugin with one skill and two
  language-server plugins without skill lines. Measured once: the next mayor
  session started at 46,290 tokens, against 51,020, 59,091 and 65,150 for the
  three before. Between 51,020 and 46,290 only the lists of skills and agents
  changed, about 12,000 characters shorter, so the hosting-platform plugin
  cost about 4,700 tokens a start: a tenth, not the fifth estimated from its
  files on disk. The three earlier starts already differed by 14,000 tokens:
  one measurement, not proof.
- **24 September: the account's connectors switched off** for the factory's
  sessions: ten, none of them used. After the plugin was off, the hosting
  platform's tools had still reached every session, through the account's own
  connector for that platform. Measured once, on two sessions of the
  implementation worker that took the same first step: the connectors cost
  about 9,700 tokens a session, most of it just after the first call, about 8%
  of the mean context per call. One measurement, not proof.

## Open questions and ideas

- The tokens spent before the first outward action, measured again against
  49,000.
- Tokens per session and hand-offs per day after a day of normal work, against
  22 and 23 September.
- Whether the lower start holds over more sessions.
- A lower reasoning-effort setting for quick answers; not decided.
- The hand-off point: later hand-offs mean fewer re-orientations but a longer
  context on every step and older facts in the window. Which is cheaper
  depends on the cost of re-orientation, which the changes aim to cut; to be
  decided on the measurements.
- A project-manager role and a second project, to be decided on measured data.
