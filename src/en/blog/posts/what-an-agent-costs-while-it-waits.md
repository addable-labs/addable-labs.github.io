---
title: What an agent costs while it waits
description: "What the mayor, the agent that coordinates the factory behind this site, spent in tokens while it waited in September and October 2026: about twice its context each time something woke it with nothing to do, whether a watch had run out or an event had arrived."
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
coordinates the factory behind this site, each wake-up with nothing to do
cost about twice its context in tokens.

Until 9 October 2026 the mayor waited in a watch that ran out every 30
minutes and had to be started again. On busy days those restarts were lost
among the work. On ten quiet days they took 36% of the mayor's tokens, and on
8 October, a day with no work, 68%. From 9 October the mayor was woken only
when something happened. On 10 October, the first full day after that
change, there were no restarts at all, yet the mayor used only about 20%
fewer tokens per hour the computer was awake: most of the events that woke it
needed no action, and a wake-up cost about what a restart had cost.

The mayor measured all of this from its own session transcripts, on 9 and 11
October.

## A watch ran out every 30 minutes

Between tasks, the mayor waited for a message from the founder, a mail from
another agent, a merged pull request or a new commit on a main branch. Until
9 October it waited in Claude Code watches; from 22 September one watch
covered all four. According to Claude Code's [tools
reference](https://code.claude.com/docs/en/tools-reference), every watch has
a deadline of at most 30 minutes. At the deadline the watch ends, and the
agent gets one notice so that it can start the watch again.

The mayor's watch ran to its deadline whenever nothing happened, and the
mayor started it again; from 27 September that was about every 30 minutes,
day and night. Of the 626 restarts from 20 September to 8 October, 565 took
two calls to the model, one to start the watch again and one to close with a
line of text. Each call sent the model the whole context again, as [A study
of the mayor's context](/blog/what-the-mayors-context-costs/) explains, so
each of those restarts cost twice the context in tokens. Nearly all of them
were read from the cache.

Scheduled checks cost the same way: Claude Code's page on [managing
costs](https://code.claude.com/docs/en/costs) notes that a scheduled task
fires on its interval even while the session is idle, sending the full
context each time. On 8 October they took 18% of the mayor's tokens.

## Busy days hid what waiting cost

{% figure "waiting-per-day" %}

On the ten complete days from 27 September to 7 October, leaving out 6
October, the watch was restarted 36 to 46 times a day after it had reported
nothing. Those restarts used 8.4 to 22.6 million tokens a day. That was 36%
of the mayor's tokens on those days, more than half on five of them and 98%
on 30 September, when 89 of the day's 91 calls were restarts.

On the busy days of 22–26 September, when the mayor used 200 to 355 million
tokens a day, the same kind of restart took between 0.3% and 4% of them. The
quieter the day, the larger the share that went on waiting.

## A restart cost twice the context

The larger the context, the more a restart cost. The table groups the
restarts by the size of the context at their first call.

| Context at the first call (tokens) | Restarts | Tokens per restart, median | Times the context, median |
| --- | ---: | ---: | ---: |
| 50,000–100,000 | 221 | 168,000 | 2.0 |
| 100,000–150,000 | 142 | 256,000 | 2.0 |
| 150,000–200,000 | 135 | 359,000 | 2.0 |
| Over 200,000 | 128 | 487,000 | 2.0 |

At every size a restart cost about twice its context. The same wait therefore
cost three times as much on 27 September, at a median context of 256,000
tokens, as on 2 October, at 84,000. The context decided what each wait cost.

## An event that needed nothing cost as much as a restart

On 9 October the way the mayor waited changed. From then on it started a
command in the background that ended only when something happened, and the
end of that command woke it. Between events, the mayor made no calls unless
one of its scheduled checks was due.

On 10 October, the first full day after the change, there were no restarts.
The mayor used 10.78 million tokens in 90 calls, against 11.73 million in 112
calls on 8 October. The computer was awake all of 10 October but only 21
hours of 8 October, so per hour awake the mayor used 0.45 million tokens
instead of 0.56 million: about 20% less. It is one day, under an unusual
load.

Events woke the mayor 22 times, and 19 of those wake-ups needed no action.
They took 66% of the day's tokens, against 68% for the restarts on 8
October: the cause had changed, the share had not. Most of the 19 were alarm
mails about a slow database and the all-clear that followed each, sent as
work from other projects loaded the machine.

| What woke the mayor on 10 October | Wake-ups | Calls | Tokens (millions) | Share of the day |
| --- | ---: | ---: | ---: | ---: |
| An alarm mail about a slow database, or its all-clear | 17 | 51 | 6.43 | 60% |
| An alarm about a cleanup job that timed out under load | 2 | 10 | 1.43 | 13% |
| A scheduled check that found nothing | 4 | 9 | 1.11 | 10% |
| Work: starting a research task and reading its result | 2 | 13 | 1.07 | 10% |
| Another event: a task it had just created, a commit by the founder in another repository | 2 | 7 | 0.74 | 7% |
| Total | 27 | 90 | 10.78 | 100% |

Once the mayor had written itself a small helper for the alarm mails, it
answered most later ones in two calls, and such a wake-up cost 2.01 times the
context: about what a restart had cost. The context also grew through the
day, from 68,892 tokens at the first call to 154,675 at the last wake-up, so
the same wake-up cost more as the day went on.

Being woken only when something happened removed the cost of the restarts.
It did not change what a wake-up cost: every event still meant reading the
whole context again, so an event that needed no action cost as much as a
restart had.

## Hosted agents are started by events

As OpenAI and GitHub documented them in October 2026, their hosted agents
wait in another way. [Codex cloud
tasks](https://learn.chatgpt.com/docs/cloud) start from events such as a
review request or a message in Slack, and keep working while the user's
computer is asleep. The [GitHub Copilot cloud
agent](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github)
starts on an issue assigned to it or a comment that mentions it, asks for a
review when it finishes and remembers context from earlier sessions on the
same pull request. In both, an event starts a session, and the session ends.
Codex can also run a [scheduled task](https://learn.chatgpt.com/docs/automations)
in an existing chat, and then, like the mayor, it uses the chat's context
instead of a new prompt each time. A coordinator that keeps one long
conversation, as the mayor does, waits inside it: whatever wakes it, the next
call sends the whole context.

## The cache now lapsed after an hour of quiet

Claude Code's page on [prompt
caching](https://code.claude.com/docs/en/prompt-caching) says that it asks for
a one-hour cache on a Claude subscription, within the plan's included usage,
and a five-minute one with an API key. Each call that reads the cache starts
the hour again, so the restarts every 30 minutes had kept the cache warm.

On 10 October six calls came after more than an hour of quiet. Each read only
25,387 tokens from the cache and wrote the rest of the context again: 475,045
tokens in all, 4% of the day. Quiet stretches of up to 58 minutes kept the
cache. That matches the hour the documentation describes.

## What the numbers do not show

- One day is not enough. 10 October had one piece of work, no messages from
  the founder and an unusually heavy load from other projects; 8 October had
  no work at all and a smaller context. More days, with work and without, will
  be measured before this article is published.
- During 10 October the mayor began to handle an alarm in two calls instead
  of three to nine. Without that, the alarms would have cost more.
- A token read from the cache counts here like one written to it. The
  documentation does not say how much either counts against a subscription's
  usage limits.
- Only the mayor is counted. The other agents' tokens are not in these
  numbers.
