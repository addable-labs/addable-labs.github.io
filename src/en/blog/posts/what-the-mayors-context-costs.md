---
title: What the mayor's context costs, and what we changed
description: About half of a typical session of the mayor, the agent we talk to, went to finding its bearings again. What we measured, where its own explanation of the cost went wrong, what we changed and what is not measured yet.
date: 2026-09-24
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: true                      # built locally, left out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # true once a person has read it
---

The mayor is the agent at the centre of [our
factory](/blog/why-we-run-an-agent-run-factory/): the one we talk to over
Discord, which hands our requests to the other agents and follows them up. It
works in sessions. When a session's context — everything the model is given at
each step — grows past a set size, Gas City asks it to hand off: it writes
down where things stand, and a new session picks up from there. Most numbers
here come from records that are not public — the mayor's session logs, its
reports and its messages to us — and we say which.

## Why we looked

Simple questions on Discord took too long to answer; a status question could
take minutes. On 23 September, when we wanted sessions to run much longer
before handing off, the mayor advised against it for a reason we could not
follow. And its own report of 22 September, on whether to add a
project-manager role, showed that about half of each session went to finding
its bearings again.

## Right fact, wrong unit

The mayor's reason, in its Discord messages to us that evening, was that
"every step re-reads the whole conversation, so a later handoff makes each
step dearer". It added a table in which a handoff at 500,000 tokens cost 1.45
times the tokens of one at 250,000, and one at 750,000 twice as many. It also
wrote that caching "makes the repeated part cheaper, not free".

The fact underneath is right: every step sends the whole conversation so far
to the model again. But its unchanged beginning comes from a cache while the
cache holds it. It is not processed again, and at the API's list prices a
token read from the cache costs a tenth of a new one or less, depending on the
model. So "re-reads" is the wrong picture, and a count of tokens is the wrong
unit for cost: the table counted a token read from the cache like a new one.
The mayor had the right fact and still used the wrong unit.

A long context is still expensive, for other reasons. Answers come more slowly
and can get worse as the context grows. A cached token is cheaper, not free;
how our subscription's usage limit weighs it is not published, and we do not
know. And old information stays in the window after it has stopped being true.

## What fills a session

The report covers the mayor's sessions from 20 September at 12:33 UTC to the
evening of the 22nd: 38 sessions in 55 hours, 21 of them on one day, all for
one project, this site, and 31 handoffs. It was built from the sessions'
transcripts and token-usage records, the Discord history and the mayor's
memory files, none of them public.

Every session started at 55,000 to 66,000 tokens before its first tool call,
and the handoffs came at 106,000 to 251,000. The median session grew by 87,000
tokens, and 49,000 of those went by before its first outward action: a reply,
a dispatch, a bead written, a commit. About half.

A script sorted what the mayor's tool calls returned into categories. The
shares are of that output by volume, give or take a few points, not of the
whole window. In the nine sessions of the site's redesign build, reading
beads, the factory's units of work, took 19 per cent, in 69 calls, and
debugging the factory itself about 10; in the 29 sessions after it, articles
and plans took 18 and memory 13. Discord took 4 per cent, then 6.

In that Discord history, the mayor sent us 116 messages, 135,000 characters,
and we sent it 84, 16,000 characters. Our side of the conversation is a
rounding error; the agent's own work fills the window. Its memory had become a
log that was only ever added to: 769 lines and 138 KB on 22 September, more
than any session could read whole.

## What a session starts with

By the mayor's start-up records, also not public, the first session after the
change below had 46,290 tokens at its first call to the model. Roughly 33,000
of them, by subtraction, are the coding tool's own system prompt and tool
definitions, which we cannot reach. The rest, about 13,000, is ours to shape:
the list of skills, 18,893 characters; our account's connectors to other
services, MCP servers that reach every session through the account, not Gas
City, about 10,000 characters; Gas City's prompt for the mayor, 6,505; and the
machine's rules file with the memory index, 3,787.

## What we changed

When we measured the delays on 23 September, the machine was not the problem:
a load average of 2.2, and the bead tool answered in 0.07 seconds. The causes
were the highest reasoning setting on every answer, the mayor fetching fresh
state before answering even what it already knew, two hooks with a 15-second
timeout before every message, and the size of the context.

The mayor now keeps a state card of fixed shape, overwritten at each handoff,
and a separate reference file it reads in one call. The card records the id of
the last message from us it handled, since messages had been lost at handoffs;
what is in flight; what was promised and not delivered; open questions, each
with the id of the message it was asked in; running processes with their ids;
and, for every "done", the command that proves it.

A message from us that starts with "?" is now a quick question: the mayor
answers at once from what it knows, with no tool call but the reply, and says
so if unsure. The hooks' timeouts went from 15 seconds to 5.

On 24 September we switched off four plugins the factory's sessions do not
use: one for a hosting platform we do not use, a front-end design plugin with
a single skill, and two language-server plugins for languages the site does
not use, which add nothing to the list of skills. We had expected the
hosting-platform plugin, counting its files on disk, to be about a fifth of a
session's start. But a skill reaches a session only as one line, its name and
description; its full text loads only when the skill is used. That plugin's 40
lines came to 12,128 characters. The next mayor session started at 46,290
tokens and the one before it at 51,020. Between them, only the lists of skills
and agents changed size, about 12,000 characters shorter; everything else was
the same size. So the hosting-platform plugin cost about 4,700 tokens a start:
a tenth, not a fifth. That is one measurement, not proof: the three sessions
before the change started at 51,020, 59,091 and 65,150 tokens, already 14,000
apart.

Last, the handoff point. Gas City had taken the model's window to be 200,000
tokens and called for a handoff at around 160,000. On 23 September the mayor
set the real window, a million tokens, while we put the advice to hand off at
200,000 and the call at 250,000; on the 24th we moved them to 250,000 and
300,000.

## Handoff is not the enemy

The enemy is re-orientation; a handoff is where its price is paid. If handing
over were free, we would want frequent handoffs: every new session is faster,
cheaper per step, and works from how things are now instead of from claims
that were true when they were read.

The clearest example is in the mayor's run log for 22 September, which is not
public. We asked for the factory's task database, the ledger of beads, to move
to a private repository; until then it had been synced to the public
repository this site is built from. The 32nd mayor session created the private
repository, pointed the sync setting at it and told us the sync had been
moved. It had not: the database's own remote still named the public
repository, and a timed job pushes to that remote every 15 minutes. At 16:58
UTC the job tried to push the whole task database there and failed only
because the connection was closed. Two sessions later, the 34th checked again
instead of trusting the note it had inherited, found the old remote and
repointed it at 17:13 UTC.

The claim was confident and wrong; the session that found the mistake had only
the note, and looked. A long context makes an agent confidently wrong about
old facts.

## What we do not know yet

We hope for fewer tokens spent on finding bearings, faster answers to simple
questions and, above all, decisions about a project-manager role and a second
project taken on measured data instead of guesses. The next measurement is the
mayor's: how many tokens now go by before a session's first outward action,
against 49,000. It has not been made yet. This is not solved: it is an
analysis, a set of measures and a measurement still to come.
