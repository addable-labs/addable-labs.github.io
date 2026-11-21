---
title: What an agent costs while it waits
description: "What the mayor, the agent that coordinates the factory behind this site, spent in tokens while it waited from September to November 2026: two to three times its context each time something woke it, whether a watch had run out, a check was due or an event had arrived."
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Two lanes over the same span of a quiet day. Beside a stopwatch, the upper lane holds sixteen evenly spaced orange marks: a watch started again every 30 minutes. Beside a bell, the lower lane holds five green marks at uneven intervals: an agent woken only when something happens. The marks are the same size in both lanes."
date: 2026-10-11
category: ai-journey             # app-development | ai-journey
translationKey: what-an-agent-costs-while-it-waits
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

What does an AI agent cost while it waits? For the mayor, the agent that
coordinates the factory behind this site, each wake-up cost two to three times
its context in tokens, and a day on which nothing woke it cost nothing.

Until 9 October 2026 the mayor waited in a watch that ran out every 30 minutes
and had to be started again. On busy days those restarts were lost among the
work. On ten quiet days they took 36% of the mayor's tokens, and on 8 October, a
day with no work, 68%. From 9 October the mayor was woken only when something
happened or a scheduled check was due. On 10 October, the first full day after
that change, there were no restarts, yet the mayor used only about 20% fewer
tokens per hour its computer was awake: most of the events that woke it needed
no action, and a wake-up cost about what a restart had cost. In November there
were no restarts on any day. A wake-up by an event that ended with no outward
action cost about three times the context, but when nothing happened, almost
nothing was spent: on 4 November the three scheduled checks, 0.69 million
tokens, were the only calls, and for about 95 hours after 7 November nothing
woke the mayor, so it made no calls.

The numbers come from the mayor's own session transcripts, measured on 9 and 11
October and again on 21 November.

## A watch ran out every 30 minutes

Between tasks, the mayor waited for a message from the founder, a mail from
another agent, a merged pull request or a new commit on a main branch. Until 9
October it waited in Claude Code watches; from 22 September one watch covered
all four. According to Claude Code's [tools
reference](https://code.claude.com/docs/en/tools-reference), every watch has a
deadline of at most 30 minutes. When it passes, the watch ends and the agent
is told once, so that it can start the watch again.

The mayor's watch ran to its deadline whenever nothing happened, and the mayor
started it again; from 27 September that was about every 30 minutes, day and
night. Of the 626 such restarts from 20 September to 8 October, 565 took two
calls to the model: one to start the watch again and one to end its turn with
a line of text. Each call sent the model the whole context again, as [A study
of the mayor's context](/blog/what-the-mayors-context-costs/) explains, so
each of those restarts cost twice the context in tokens. Nearly all of those
tokens were read from the cache.

The mayor's scheduled checks cost the same way: Claude Code's page on
[managing costs](https://code.claude.com/docs/en/costs) notes that a
session-scoped scheduled task still runs while the session is idle, and that
each run sends the whole context. On 8 October they took 18% of the mayor's
tokens. Such a task also
[expires seven days after it is created](https://code.claude.com/docs/en/scheduled-tasks#seven-day-expiry).
The mayor's checks of 31 October last ran on 7 November, and no event arrived
until 11 November: for about 95 hours nothing woke the mayor, so it made no
calls.

## Busy days hid what waiting cost

{% figure "waiting-per-day" %}

On the ten complete days from 27 September to 7 October, leaving out 6
October, the watch was restarted 36 to 46 times a day after it had reported
nothing. Those restarts used 8.4 to 22.6 million tokens a day. That was 36% of
the mayor's tokens on those days, more than half on five of them and 98% on 30
September, when 89 of the day's 91 calls went on restarts.

On the busy days of 22–26 September, when the mayor used 200 to 355 million
tokens a day, the same kind of restart took between 0.3% and 4% of them. The
quieter the day, the larger the share spent on waiting.

## A restart cost twice the context, a wake-up in November three times

The larger the context, the more a restart cost. The table groups the restarts,
and the November wake-ups with no outward action, by the size of the context at
their first call.

| Context at the first call (tokens) | Restarts, Sep–Oct | Tokens per restart, median | Times the context, median | Wake-ups, Nov | Tokens per wake-up, median | Times the context, median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50,000–100,000 | 221 | 168,000 | 2.0 | 19 | 277,000 | 3.0 |
| 100,000–150,000 | 142 | 256,000 | 2.0 | 35 | 364,000 | 3.0 |
| 150,000–200,000 | 135 | 359,000 | 2.0 | 42 | 544,000 | 3.0 |
| Over 200,000 | 128 | 487,000 | 2.0 | 70 | 1,002,000 | 3.0 |

At every size a restart cost about twice its context. The same wait therefore
cost three times as much on 27 September, at a median context of 256,000
tokens, as on 2 October, at 84,000. The context decided what each wait cost.

In November a wake-up by an event that ended with no outward action took a
median of three calls and cost three times the context at every size. A
scheduled check that found nothing still cost about twice.

## An event that needed nothing cost as much as a restart

On 9 October the way the mayor waited changed. From then on it started a
background command that ended only when something happened, and the end of
that command woke it. Between events, the mayor made no calls unless one of
its scheduled checks was due.

On 10 October, the first full day after the change, there were no restarts. The
mayor used 10.78 million tokens in 90 calls, against 11.73 million in 112 calls
on 8 October. The computer was awake all of 10 October but only 21 hours of 8
October, so per hour awake that is about 20% less. It is one day, under an
unusual load.

The mayor was woken 22 times by events and 5 times by its scheduled checks; one
of those checks started a research task. Of the 22 events, 19 needed no action:
the founder's commit and every alarm or all-clear but one. The 19 took 66% of
the day's tokens, against 68% for the restarts on 8 October: the cause had
changed, the share had not.

| What woke the mayor on 10 October | Wake-ups | Calls | Tokens (millions) | Share of the day |
| --- | ---: | ---: | ---: | ---: |
| An alarm mail about a slow database, or its all-clear | 17 | 51 | 6.43 | 60% |
| An alarm about a cleanup job that timed out under load | 2 | 10 | 1.43 | 13% |
| A scheduled check that found nothing | 4 | 9 | 1.11 | 10% |
| Work: a scheduled check that started a research task, and the task's result | 2 | 13 | 1.07 | 10% |
| Another event: a task it had just created or a commit by the founder in another repository | 2 | 7 | 0.74 | 7% |
| Total | 27 | 90 | 10.78 | 100% |

Once the mayor had written itself a small helper for the alarm mails, it
answered most later ones in two calls, and such a wake-up cost 2.01 times the
context: about what a restart had cost.

Being woken by events instead of by a watch that ran out removed the cost of
the restarts. It did not change what a wake-up cost: every event still meant
reading the whole context again, so an event that needed no action cost as
much as a restart had.

## Two hosted agents are started by events

As OpenAI and GitHub documented them in October 2026, their hosted agents wait
in another way.
[A message in Slack](https://learn.chatgpt.com/docs/third-party/slack) that
mentions ChatGPT can start a
[Codex cloud task](https://learn.chatgpt.com/docs/cloud), which keeps running
while the user's computer sleeps. The
[GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
starts when an issue is assigned to it or a comment mentions it. Codex can also
run a [scheduled task](https://learn.chatgpt.com/docs/automations) in an
existing chat, and then, like the mayor, it uses the chat's context instead of a
new prompt each time. A coordinator that keeps one long conversation, as the
mayor does, waits inside that conversation: whatever wakes it, the next call
sends the whole context.

## After an hour of quiet the cache lapsed or the conversation was compacted

Claude Code's page on [prompt
caching](https://code.claude.com/docs/en/prompt-caching) says that Claude Code
asks for a one-hour cache on a Claude subscription, within the plan's included
usage, and a five-minute one with an API key. Each call that reads the cache
starts the hour again, so the restarts every 30 minutes had kept the cache
warm.

On 10 October six calls came after more than an hour of quiet. Each read only
25,387 tokens from the cache and wrote the rest of the context again: 475,045
tokens in all, 4% of the day's tokens. In November 47 calls did the same, 1% of
the month's tokens.

Since October Claude Code has
[compacted a long idle conversation](https://code.claude.com/docs/en/settings-reference#idlecompaction)
before the hour runs out: once the context reaches the default threshold of
200,000 tokens and about an hour has passed since the last request, it replaces
the conversation with a summary. That happened to the mayor six times in
November, each time after 55 to 58 minutes without a call, shrinking a context
of 217,000 to 300,000 tokens to 15,000 to 20,000. The request that writes the
summary is not counted.

## What the numbers do not show

- 10 October was one unusual day, with one piece of work, no messages from the
  founder and an unusually heavy load from other projects; November adds 13
  complete days, with work and without, on one computer.
- "No outward action" is not "needed nothing": the mayor's answers to the
  founder's comments on review pages are not counted as outward actions.
- A token read from the cache counts here like one written to it. The
  documentation does not say how much either counts against a subscription's
  usage limits.
- Only the mayor is counted. The other agents' tokens are not in these
  numbers.
- The transcripts from before late October no longer exist, so the numbers for
  September and early October come from the measurements made then. For most of
  November the mayor ran on a different model.
