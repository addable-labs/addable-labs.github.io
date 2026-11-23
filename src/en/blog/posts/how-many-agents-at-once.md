---
title: How many agents the factory runs at once
description: What a second coding agent per project changed in the factory behind this site on 26 September 2026, what three at once did on 15 November and what a start of the mayor and a landed change cost from September to November.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Five lanes for workers, two of them busy in green and three empty, and to the right one lock that lets a single browser job through at a time: the first lane's job holds it while the second lane's waits in orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

Claude Code and Codex both let one person run several coding agents at once. For
someone who already works with one, that raises a plain question: if more agents
work at once, does more get done, and what stops it?

The factory behind this site, described in
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/),
has measured part of the answer. Its workers are agent sessions that each take
one task from the factory's tracker and deliver it. On 26 September 2026 the
factory went from one worker per project to two. On this site a change was then
finished every 26 minutes instead of every 44 while a worker ran, and the second
worker did not make a change dearer in tokens. More got done.

Practitioners name two limits above all: merging the agents' work and reviewing
it. Neither held these two workers back. They never collided in git, and the
founder does not review every change. The limit lay in what they shared: one
lock for every job that starts a browser, the full test runs that queued for it
and the memory of one computer.

On 15 November three workers ran side by side on this site, the most the
remaining records show. Again they queued for the lock: 18 of that day's 62
browser jobs waited for it, 245 minutes in all. Five at once, allowed since 6
October, is still to come.

## The ceiling rose from one worker to five in ten days

In November 2026 the factory still has three projects on one computer with 24 GB
of memory: this site, [Gaimer](https://github.com/addable-labs/gaimer) and its
own private repository. All of November's work went to this site, where five
more agents write, check and edit the articles. The mayor, the agent that
coordinates the factory, starts a worker only when it has a task for one, so the
number of workers per project is a ceiling, not a target.

The ceiling began at one worker per project. On 26 September the founder asked
for a second, and minutes later the mayor raised it to two in this site and
Gaimer. The factory's own repository became the third project on 29 September.
On 6 October the founder asked for five agents and the ceiling became five in
each project; that evening he also added a writer, a fact checker and a Swedish
editor, and an English editor and a researcher followed within a day.

A second limit applies to each session. The factory's settings give the model a
window of 1,000,000 tokens, and Gas City, the orchestrator the factory runs on,
advises a session to hand its work to a new one from 25% of it and urges it from
30%. [A study of the mayor's context](/blog/what-the-mayors-context-costs/)
shows the effect on cost. Since October, Claude Code has also
[compacted a long conversation that sits idle for about an hour](https://code.claude.com/docs/en/settings-reference#idlecompaction),
before its cache expires, so one of the mayor's sessions lasted from 31 October
to 15 November.

## A second worker raised the pace

On 26 September the founder wrote: "I think we should try adding another agent
per rig and see how that affects performance. The verification jobs should be
sequenced somehow so we don't run too many chrome instances". Gas City calls a
project a rig. The mayor raised the ceiling to two, and from then on every job
that starts Chrome or WebKit, such as a check or a test run of the site, went
through one lock: one job at a time across the factory, with every wait and run
logged. A sampler logged the computer's load, memory, swap and browser processes
every minute while the two workers ran.

That evening the founder set the rule for judging the step: measure finished
sessions — their tokens, time, waits and failures — and whether the workers got
in each other's way, with no made-up tests or replays.

| This site's workers | One worker, 25–26 Sep | Two workers, 26 Sep | Other sessions, 14–20 Nov | Three side by side, 15 Nov |
| --- | ---: | ---: | ---: | ---: |
| Finished sessions | 17 | 8 | 11 | 3 |
| Changes finished | 13 | 11 | 12 | 3 |
| Tokens per change, median (millions) | 26.3 | 19.2 | 7.9 | 16.1 |
| Session minutes per change | 44 | 39 | 29 | 166 |
| Minutes with a worker running, per change | 44 | 26 | 29 | 74 |

The gain of the second worker is in the last row. A session's tokens and minutes
are split evenly over the changes it worked on, and since the tasks differed,
tokens per change compare the tasks as much as the setups. On 15 November the
last row went the other way: with three workers side by side and only three
changes finished, a change took 74 minutes of a worker running, against 29 for
the other November sessions. One change is in both November columns. In
November the tasks were mainly illustrations, covers, renames and publishing
steps.

## The workers waited for what they shared

The two workers did not get in each other's way directly. Each worked in a git
worktree of its own, never in the project's main checkout.
[Codex's guide to worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)
says the same isolation lets several chats work in one project "without
interfering with each other". No command of one touched the other's worktree or
processes, no git command failed on a lock or a conflict and no push was
refused. They met once, in a note the workers share: one rewrote it while the
other was still working, and the other's own check stopped its edit because the
text had changed.

{% figure "lock", "wide" %}

The figure shows the day. Of the 97 jobs that took the lock, 17 waited, 43
minutes in all. The longest waits came while the two workers' full test and
check runs took turns.

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

The computer held: free memory never fell below a third, although swap rose to
8.1 GB and the load ran far higher while a job held the lock.

## Three at once, on 15 November

On 15 November three workers ran side by side on this site for 130 minutes: two
added the second illustrations to parts 6 and 7 of the series on AI agents and
the third did the fourth round of renaming the product on the site. Each waited
about an hour for the lock in all, and the longest single wait was 44 minutes.
The lock was no longer theirs alone: a check run of another article by the
writer held it for 48 minutes while all three queued. The writer, like the other
agents that work on the articles, takes the same lock as the workers.

| The lock | 26 Sep, two workers | 15 Nov, three workers |
| --- | ---: | ---: |
| Jobs that took the lock, whole day | 102 | 62 |
| Jobs that waited | 17 | 18 |
| Minutes waited, in all | 43 | 245 |
| Longest single wait (minutes) | 8.5 | 44 |
| Who waited | Workers only | Workers and the writer |

The computer's sampler had stopped at the end of October, so the machine's
memory and swap on 15 November are not known. The numbers show that the three
queued for the lock, not whether the computer ran short.

## A landed change cost the workers 12.9 to 22.3 million tokens

[Claude Code's guide to running agents in parallel](https://code.claude.com/docs/en/agents)
warns that running several sessions at once multiplies token usage. The table
shows what a landed change, a commit that reached a project's main branch, cost
over longer periods; the workers' tokens are those of all worker sessions in the
period.

| Tokens per landed change (millions) | Workers | Mayor | Changes |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 Sep | 12.9 | 4.1 | 83 |
| This site, 24–26 Sep | 22.3 | – | 42 |
| The factory's own repository, 29 Sep–6 Oct | 18.3 | – | 13 |
| This site, 1–20 Nov | 17.5 | 32.4 | 12 |

The coordination comes on top. In September the mayor's share was counted only
in Gaimer, 4.1 million tokens per change. By 20 November the site had landed 12
changes and the other two projects none, so all of the mayor's tokens count
against the site: 32.4 million per change, an upper bound, since they also cover
review pages, vendor checks and drafts that have not landed. The agents that
write, check and edit the articles used another 62.0 million tokens per landed
change.

## The mayor's start cost more while work was scarce

| The mayor's sessions that acted (a median of an even count is the upper middle value) | 24–28 Sep | 28 Sep–5 Oct | 31 Oct–20 Nov |
| --- | ---: | ---: | ---: |
| Sessions | 22 | 8 | 5 |
| Tokens added before the first outward action (a reply, a dispatch, a task written, a mail, a commit or an edit), median | 30,600 | 108,300 | 15,300 |
| Start-up content at the first call, median | 42,700 | 43,300 | 51,600 |
| First turn: notes, state check, watches, average | 26,300 | 27,400 | 15,000 |
| Reading for the task before acting, average | 5,100 | 44,100 | 2,900 |
| Acted only after their first turn | 4 | 7 | 2 |

A start, the tokens added before the first outward action, rose from 30,600 to
108,300 while the start-up content and the first turn hardly changed: with no
worker running in this site or Gaimer from 28 September to 5 October, the mayor
waited and read before it acted. From 31 October to 20 November it started only
five sessions that acted: they began with more start-up content, a median of
51,600 tokens, but added a median of 15,300 before their first action. Since 11
October the mayor also answers the founder on review pages, which the count
ignores.

## Five workers are allowed but have not run together

Since 6 October the ceiling is five workers in each of the three projects. The
mayor told the founder what had not changed: browser jobs still run one at a
time, and the computer already swaps. Five workers would share the lock and the
computer that two already shared, and on 15 November three already waited about
an hour each for the lock.

## What the numbers do not show

- One day of two workers and one afternoon of three, on one computer and on
  tasks that differed.
- Whether the three workers of 15 November got in each other's way in git or in
  files was not checked.
- The transcripts from before late October no longer exist, so the numbers for
  September and October come from the measurements made then.
- For most of November the mayor and the workers ran on a different model.
- The founder does not review every change, so the numbers say nothing about a
  setup in which a person reviews each one.
