---
title: What an agent costs while it waits
description: "What the mayor, the agent that coordinates the factory behind this site, spent in tokens while it waited, from 27 September to 10 October 2026: a restart of a watch that had reported nothing cost about twice its context, until it was woken only when something happened."
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Two lanes over the same span of a quiet day. Beside a stopwatch, the upper lane holds a row of evenly spaced orange marks: a watch started again every 30 minutes. Beside a bell, the lower lane holds a few green marks at uneven intervals: an agent woken only when something happens."
date: 2026-10-11
category: ai-journey             # app-development | ai-journey
translationKey: what-an-agent-costs-while-it-waits
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

## How the mayor waited

What does an AI agent cost while it waits? Between tasks, the mayor, the
agent that coordinates [the factory](/blog/why-we-run-an-agent-run-factory/)
behind this site, waited for a message from the founder, a mail, a merged
pull request or a new commit on a main branch. Until 9 October 2026 it waited
in Claude Code watches, which ended after at most 30 minutes. When a watch
ended with nothing to report, the mayor started it again.

Such a restart was a turn of the mayor's conversation. Of the 626 restarts
from 20 September to 8 October, 565 took two calls to the model. Each call
sent the model the whole context again, so each of those restarts cost twice
the context in tokens. [A study of the mayor's
context](/blog/what-the-mayors-context-costs/) explains what sending the whole
context with every call costs.

## The restarts, day by day

{% figure "waiting-per-day" %}

On the ten complete days from 27 September to 7 October, leaving out 6
October, the mayor used 12 to 74 million tokens a day, and restarts took 36%
of them: more than half on five of those days and 98% on 30 September. On the
busy days of 22–26 September, at 200 to 355 million tokens a day, the same
restarts took between 0.3% and 4%.

## A restart cost twice the context

The larger the context, the more a restart cost. The table groups the
restarts by the size of the context at their first call.

| Context at the first call (tokens) | Restarts | Tokens per restart, median | Times the context, median |
| --- | ---: | ---: | ---: |
| 50,000–100,000 | 221 | 168,000 | 2.0 |
| 100,000–150,000 | 142 | 256,000 | 2.0 |
| 150,000–200,000 | 135 | 359,000 | 2.0 |
| Over 200,000 | 128 | 487,000 | 2.0 |

At every size a restart cost about twice its context, so the same wait cost
three times as much at 256,000 tokens of context as at 84,000.

## Woken only when something happens

On 9 October the mayor changed how it waited, so that it was woken only when
something happened: on 10 October, the first full day after the change, there
were no restarts at all, yet the day used 10.78 million tokens. Two thirds of
them went on wake-ups that needed no action, most of them alarm mails about a
slow database, sent while other work loaded the machine.
