---
title: How many agents the factory runs at once
description: What a second coding agent per project changed in the factory behind this site on 26 September 2026 — changes came faster at no higher token cost each, and the limit lay in what the agents shared.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Five lanes for workers, two of them busy in green and three empty, and to the right one lock that lets a single browser job through at a time: the first lane's job holds it while the second lane's waits in orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

Claude Code and Codex both let one person run several coding agents at once.
For someone who already works with one, that raises a plain question: if more
agents work at once, does more get done, and what stops it?

The factory behind this site, described in [Why we run an agent-run software
factory](/blog/why-we-run-an-agent-run-factory/), has measured part of the
answer. Its workers are agent sessions that each take one task from the
factory's tracker and deliver it. On 26 September 2026 the factory went from
one worker per project to two. On this site a change was then finished every
26 minutes instead of every 44 while a worker ran, and the second worker did
not make a change dearer in tokens. More got done.

Practitioners who write about running several agents name two limits above
all: merging the agents' work and reviewing it themselves. Neither held these
two workers back. They never collided in git, and the founder does not
review every change. The limit lay in what they shared: one lock for every
job that starts a browser, the full test runs that queued for it and the
memory of one computer.

Since 6 October the factory allows five workers per project. Five have not
yet run side by side.

## The ceiling rose from one worker to five in ten days

In October 2026 the factory works on three projects, all on one computer with
24 GB of memory: this site, [Gaimer](https://github.com/addable-labs/gaimer)
and its own private repository. The mayor, the agent that coordinates the
factory, starts a worker only when it has a task for one, so the number of
workers per project is a ceiling, not a target: on a quiet day none runs.

| When (UTC) | Ceiling | What happened |
| --- | ---: | --- |
| Until 26 Sep | 1 | One worker per project, in this site and Gaimer; the one-worker period compared below ran from 25 Sep, 12:09, to 26 Sep, 09:50 |
| 26 Sep, 09:59 | 1 | The founder asks for a second worker per project, with browser jobs taking turns |
| 26 Sep, 10:06 | 2 | The mayor raises the ceiling in both projects; every job that starts a browser goes through one lock |
| 26 Sep, 10:07–15:31 | 2 | Two workers on this site in four pairs, side by side for 44, 18, 63 and 13 minutes; a sampler logs the computer every minute from 10:05 to 16:59 |
| 26 Sep, evening | 2 | The founder sets the rule for judging the step and gets a report on 13:09–16:55 |
| 29 Sep | 2 | The factory's own repository becomes the third project |
| 6 Oct, 14:53 | 2 | The founder asks where the limits on tokens and agents are; the mayor answers that both sit in the factory's settings |
| 6 Oct, 15:01–15:02 | 5 | The founder asks for five agents; from 15:02 the ceiling is five in each of the three projects |

A second limit applies to each session. The factory's settings give the model
a window of 1,000,000 tokens, and since the founder's call of 23 September,
Gas City, the orchestrator the factory runs on, advises a session to hand its
work to a new one from 25% of it and urges it from 30%. [A study of the
mayor's context](/blog/what-the-mayors-context-costs/) shows what the hand-off
point does to cost.

## A second worker raised the pace

On 26 September the founder wrote: "I think we should try adding another
agent per rig and see how that affects performance. The verification jobs
should be sequenced somehow so we don't run too many chrome instances". Gas
City calls a project a rig. The mayor raised the ceiling to two, and from
then on every job that starts Chrome or WebKit, such as a check or a test run
of the site, went through one lock: one job at a time across the factory,
with every wait and run logged. A sampler logged the computer's load,
memory, swap and browser processes every minute.

That evening the founder set the rule for judging the step: measure finished
sessions — their tokens, time, waits and failures — and whether the workers
got in each other's way, with no made-up tests or replays.

| This site's workers | One worker | Two workers |
| --- | ---: | ---: |
| Finished sessions | 17 | 8 |
| Changes finished | 13 | 11 |
| Tokens per change, median (millions) | 26.3 | 19.2 |
| Session minutes per change | 44 | 39 |
| Minutes with a worker running, per change | 44 | 26 |

The gain is in the last row. A session's tokens and minutes are split evenly
over the changes it worked on, and since the tasks differed, the tokens show
only that a second worker did not make a change dearer.

## The two workers waited for what they shared

The two workers did not get in each other's way directly. Each worked in a
git worktree of its own, never in the project's main checkout. [Codex's guide
to worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees) says
the same isolation lets several chats work in one project "without
interfering with each other". No command of one touched the other's worktree
or processes, no git command failed on a lock or a conflict and no push was
refused. They met once, in a note the workers share: one rewrote it while the
other, which had read it, was still working, and the other's own check later
stopped its edit because the text had changed.

{% figure "lock", "wide" %}

The figure shows the day. Of the 97 jobs that took the lock, 17 waited, 43
minutes in all. The longest waits came while the two workers' full test and
check runs took turns, and around then a full test run took three to five
times as long as it did later in the afternoon. One worker also ran
screenshot scripts, which start Chrome, nine times outside the lock in its
first half hour; the rule now names screenshots and probes.

| The lock and the computer on 26 September | Measured |
| --- | ---: |
| Jobs that took the lock, 10:09–15:34 UTC | 97 |
| Jobs that waited, all of them workers' jobs | 17 |
| Minutes waited, in all | 43 |
| The three longest waits, 13:55–14:18 UTC (minutes together) | 21 |
| Passing full test runs, 14:10–14:40 UTC (seconds) | 441 and 467 |
| Passing full test runs after 15:00 UTC (seconds) | 87–137 |
| A failing full test run just before them (minutes) | 8.9 |
| Of those, in a known flaky browser test (minutes) | 7.5 |
| Swap in use as it rose (GB) | 2.7 → 8.1 |
| Free memory (%) | 33–68 |
| Headless Chrome processes at once, at most | 9 |
| One-minute load, median, with a job holding the lock | 34 |
| One-minute load, median, with the lock free | 6.5 |
| One-minute load, peak at 12:37 UTC | 219 |

The computer held: free memory never fell below a third, although swap rose
to 8.1 GB and the load ran far higher while a job held the lock. The report
the founder got that evening concluded that two workers fit, with the lock.

## A landed change cost the workers 12.9 to 22.3 million tokens

[Claude Code's guide to running agents in
parallel](https://code.claude.com/docs/en/agents) warns that running several
sessions at once multiplies token usage. Per change, usage did not rise with
the factory's second worker; the table shows what a change cost over longer
periods. A landed change is a commit that reached a project's main branch,
and the workers' tokens are those of all worker sessions in the period.

| Tokens per landed change (millions) | Workers | Mayor | Changes |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 Sep | 12.9 | 4.1 | 83 |
| This site, 24–26 Sep | 22.3 | – | 42 |
| The factory's own repository, 29 Sep–6 Oct | 18.3 | – | 13 |

The coordination comes on top: in Gaimer, the one project where the mayor's
share is counted, the mayor added 4.1 million tokens per change.

## The mayor's start cost more while work was scarce

On 28 September the founder asked for two of the mayor's measurements in this
article; counted again on 6 October with the same scripts, a landed change in
Gaimer came to 16.9 million tokens, against the 17 to 18 million the mayor
first put it at.

| The mayor's sessions that acted (a median of an even count is the upper middle value) | 24–28 Sep | 28 Sep–5 Oct |
| --- | ---: | ---: |
| Sessions | 22 | 8 |
| Tokens added before the first outward action (a reply, a dispatch, a task written, a mail, a commit or an edit), median | 30,600 | 108,300 |
| Start-up content at the first call, median | 42,700 | 43,300 |
| First turn: notes, state check, watches, average | 26,300 | 27,400 |
| Reading for the task before acting, average | 5,100 | 44,100 |
| Acted only after their first turn | 4 | 7 |

A start, the tokens added before the first outward action, rose from 30,600
to 108,300 while the start-up content and the first turn hardly changed: with
no worker running in this site or Gaimer from 28 September to 5 October, the
mayor waited and read before it acted.

## Five workers are allowed but not yet measured

Since 6 October the ceiling is five workers in each of the three projects, at
the founder's request. The mayor told him what had not changed: browser jobs
still run one at a time, and the computer already swaps. Five workers would
share the lock and the computer that two already shared.

The first time more than two workers run side by side, the mayor measures the
time per task and the computer's load, with the sampler running again, and
judges the step by the founder's rule of 26 September.

On 6 October the founder also asked whether the factory's roles fit its work,
which he saw as mostly articles, and added three of the five roles the mayor
found missing: a writer, a fact checker and a Swedish editor. Whether the
other two, an illustrator and an analyst, are needed to take load off the
mayor is being watched.

## What the numbers do not show

- One day of two workers, on one computer and on tasks that differed: tokens
  per change compare the tasks as much as the setups.
- The mayor's tokens for this site and the factory's own repository are not
  separated from the rest of its work.
- The founder does not review every change, so the numbers say nothing about
  a setup in which a person reviews each one.
