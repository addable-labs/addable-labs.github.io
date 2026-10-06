---
title: How many agents the factory runs at once
description: The two limits on how much the factory behind this site does at once, what two workers per project measured on 26 September 2026, what a start of the mayor and a landed change cost then and now, and the step to five.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Five lanes for workers, two of them busy in green and three empty, and to the right one lock that lets a single browser job through at a time: the first lane's job holds it while the second lane's waits in orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

## Summary

Two limits decide how much [the
factory](/blog/why-we-run-an-agent-run-factory/) behind this site does at
once: how many tokens one agent session holds before it hands its work to a
new one, and how many workers run in one project at a time. A worker is an
agent session that takes one bead, a task in the factory's tracker, and
delivers it. Gas City calls a project a rig; this article says project.

The second limit was one worker per project until 26 September 2026, two from
then and five since 6 October. With two came a rule: a job that starts a
browser waits its turn for a single lock. On 26 September four pairs of
workers ran side by side on this site without colliding; 17 of 97 browser jobs
waited for the lock, 43 minutes in all, and while a worker ran, a change was
finished every 26 minutes instead of every 44.

On 28 September the mayor, the agent that coordinates the factory, measured
what a start of one of its sessions and a landed change cost. Measured again
on 6 October, a start took 108,300 tokens instead of 30,600: the factory had
little work and the mayor waited before acting, while the start itself hardly
grew. Five workers have not yet run side by side.

## Two limits

The first limit is per session. The factory's settings give the model's
window as 1,000,000 tokens. Gas City advises a session to hand off from 25% of
it, 250,000 tokens, and urges it from 30%, 300,000: the founder's call on 23
September. What the hand-off point does to a session's cost is the subject of
[A study of the mayor's context](/blog/what-the-mayors-context-costs/).

The second limit is per project: how many implementation workers may run at
once. It is a ceiling, not a target. A worker starts only when the mayor
dispatches a bead to it, so on a quiet day none runs. The factory now works on
three projects, this site, [Gaimer](https://github.com/addable-labs/gaimer)
and its own private repository, all on one computer with 24 GB of memory.

## One worker, then two

On 26 September at 09:59 UTC the founder wrote: "I think we should try adding
another agent per rig and see how that affects performance. The verification
jobs should be sequenced somehow so we don't run too many chrome instances".
At 10:06 the mayor raised the ceiling to two in both projects of the time.
Every verification job that starts Chrome or WebKit, such as a check or test
run of the site, went through one lock: one job at a time across the factory,
every wait and run logged. A sampler logged the machine's load, memory, swap
and browser processes every minute from 10:05 to 16:59.

That evening the founder set the rule for judging the change: measure finished
sessions, their tokens, time, waits and failures, and whether the workers got
in each other's way, with no made-up tests or replays.

| This site's workers | One worker | Two workers |
| --- | ---: | ---: |
| Finished sessions | 17 | 8 |
| Changes finished | 13 | 11 |
| Tokens per change, median (millions) | 26.3 | 19.2 |
| Session minutes per change | 44 | 39 |
| Minutes with a worker running, per change | 44 | 26 |

One worker ran from 25 September, 12:09 UTC, to 26 September, 09:50; the two
ran in four pairs from 10:07 to 15:31, side by side for 44, 18, 63 and 13
minutes. A session's tokens and minutes are split evenly over the changes it
worked on. The tasks differed, so the tokens show only that a second worker
did not make a change dearer; the gain is the pace.

{% figure "lock", "wide" %}

The workers did not get in each other's way directly. No command of one
touched the other's worktree or processes, no git command failed on a lock or
a conflict, and no push was refused. They met in one file, a note in the notes
the workers share: one rewrote it while the other, which had read it, was
still working, and the other's own check later stopped its edit because the
text had changed.

They did share the machine and the lock. Of the 97 jobs that took the lock
from 10:09 to 15:34, 17 waited, all of them workers' jobs, 43 minutes in all.
The three longest waits, 21 minutes together, fell between 13:55 and 14:18,
while the two workers' full test and check runs took turns. A passing full
test run took 441 and 467 seconds between 14:10 and 14:40, against 87 to 137
seconds after 15:00; a failing one just before had spent 7.5 of its 8.9
minutes in a known flaky browser test. One worker ran screenshot scripts,
which start Chrome, nine times outside the lock in its first half hour; the
rule now names screenshots and probes.

The machine held. Swap in use rose from 2.7 to 8.1 GB, free memory stayed
between 33% and 68%, and at most nine headless Chrome processes ran at once.
The one-minute load had a median of 34 while a job held the lock and 6.5 while
it was free, with a peak of 219 at 12:37. The report the founder got that
evening covered 13:09 to 16:55 UTC: 45 jobs, 8 waits of 25.5 minutes in all, a
median load of 43 against 5 and a peak of 158. Its verdict: two workers fit,
with the lock.

## What a start and a change cost, then and now

On 28 September the founder asked for two of the mayor's measurements in the
next article: the cost of a start and of a landed change. Both were run again
on 6 October with the same scripts, on finished sessions only. A start is the
tokens the mayor's context grows by before its first outward action: a reply,
a dispatch, a bead written, a mail, a commit or an edit. With an even count,
the median is the upper of the two middle values.

| Mayor's sessions that acted | 24–28 Sep | 28 Sep–5 Oct |
| --- | ---: | ---: |
| Sessions | 22 | 8 |
| Tokens added before the first action, median | 30,600 | 108,300 |
| Start-up content at the first call, median | 42,700 | 43,300 |
| First turn: notes, state check, watches, average | 26,300 | 27,400 |
| Reading for the task before acting, average | 5,100 | 44,100 |
| Acted only after their first turn | 4 | 7 |

The start itself barely changed: about 43,000 tokens of start-up content, then
a first turn of about 27,000 in which the mayor reads its notes, checks the
state of the factory and re-arms its watches. What changed came after. From 24
to 28 September beads were queued, and 18 of 22 sessions acted within their
first turn, 11 by dispatching one. From 28 September to 5 October no worker
ran in the site or Gaimer, and one of eight first actions was a dispatch. Five
of those sessions first waited through 3, 23, 26, 67 and 85 wake-ups from
their watches, reading notes, checking the state and re-arming in between; the
other three acted within 23 minutes, after reading for their task.

The quiet shows in the mayor's day too. With the hand-off at 160,000 tokens on
22–23 September it started 57 sessions a day and spent 43% of its tokens
before each session's first outward action; on 24–28 September, at 300,000, 8
a day and 4–5%. Since 28 September it has started one a day and spent 32%, of
12 to 118 million tokens a day, against 204 to 470 million on 24–26 September.

| Tokens per landed change (millions) | Workers | Mayor | Changes |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 Sep | 12.9 | 4.1 | 83 |
| This site, 24–26 Sep | 22.3 | – | 42 |
| The factory's own repository, 29 Sep–6 Oct | 18.3 | – | 13 |

A landed change is a commit that reached a project's main branch; the workers'
tokens are those of all worker sessions in the period. On 28 September the
mayor put a change in Gaimer at 17 to 18 million tokens; counted again, it is
16.9 million, 4.1 million of them the mayor's, by its calls about Gaimer.
Neither project has landed a change since 26 September; the factory's own
repository is new.

## From two to five

On 6 October at 14:53 UTC the founder asked where the token and agent limits
were; the mayor answered that both sit in the factory's settings. At 15:01 he
wrote "Let's increase to 5 agents", and at 15:02 the ceiling was five in each
of the three projects. The mayor told him what had not changed: browser jobs
still run one at a time, and the machine already swaps. Each worker still
works in a worktree of its own, never in a project's main checkout, and every
job that starts Chrome or WebKit, screenshots and probes included, goes
through the lock.

The first time more than two workers run side by side, the mayor measures the
time per task and the machine's load, with the sampler running again, and
judges the step by the founder's rule of 26 September.

## What the numbers do not show

- One day of two workers, on one machine and on tasks that differed: tokens
  per change compare the tasks as much as the setups.
- The mayor's tokens for this site and the factory's own repository are not
  separated from the rest of its work.
- The script that finds the first outward action missed those of one session
  after 28 September, which ran its commands under a time limit. Counted, they
  bring the share before the first action from the script's 40% to 32% and
  leave the median at 108,300.
