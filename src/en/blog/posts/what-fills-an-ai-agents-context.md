---
title: What fills an AI agent's context
description: "Why an AI agent can get worse in a long session and what you can do about it: what an AI coding agent sends the model with every step, what a subagent keeps out of the context and what compaction loses, as the vendors described it in November 2026, with Gas City's planned hand-off as the worked example."
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "A tall bar, the context window, with a dashed line for its top, fills from the bottom in layers. At its foot lies a thin grey start-up layer of four bands. On it lie a green, an orange and a white layer, and a faint green layer is on its way in. Beside it stands a small empty bar, a subagent's own context."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: what-fills-an-ai-agents-context
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

The language model behind an AI coding agent does not remember your conversation
from one message to the next. Each time the tool asks the model what to do, it
sends along everything the model should see: the instructions, the files it has
read, the output of the commands it has run and the conversation so far. That
bundle is the context. The simplest habit all three vendors share is one task
per session.

[VS Code's documentation](https://code.visualstudio.com/docs/agents/concepts/context)
describes it as the information available to the agent and its language model
while they work on your request. The same page is plain about what it is not:
adding context is not the same as training a model.

The article follows one session from its first prompt to the point where the
tool has to compress it, as the documentation of Claude Code, Codex and GitHub
Copilot in VS Code described it in November 2026, with the factory behind this
site as the worked example. What an agent keeps from one session to the next is
a different subject, memory. We will take a deep dive into it in a later
article.

## The context holds more than your conversation

Everything the agent knows about your session counts against one limit:
according to [Claude Code's
documentation](https://code.claude.com/docs/en/context-window), the context
window holds your instructions, the files it reads, its own responses and
content that never appears in your terminal. VS Code's documentation lists the
user message, the conversation history, instructions, referenced files and tool
outputs, and defines the window as the maximum amount of information a language
model can process in one request.

## Part of the context is there before you type

Claude Code's documentation lists what loads before the first prompt: CLAUDE.md,
auto memory, MCP tool names and skill descriptions. The instruction file, skills
and MCP servers each have an article on this site:
[The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/),
[Skills, for work that must be done the same way every time](/blog/skills-for-repeatable-work/)
and
[MCP, how an AI agent reaches other systems](/blog/mcp-reaching-your-systems/).
The tool's own instructions come before all of them, as described in
[From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/).

{% figure "context-before-you-type" %}

What loads first is what every later request carries too, so that layer is never
empty, and the part of it that comes from your own setup is the part you
control. A longer instruction file or more connected servers make it thicker for
every request of the session.

## Every step adds to the context, and every request sends all of it

Files, the output of commands and the model's own answers pile up in layers as
Claude works, and the layers of an old task stay when a new one begins. The same
page says that each file read adds to context, and that the token counts in its
example session are illustrative and vary with the size of your CLAUDE.md, your
MCP servers and your file lengths, so the figures here show relative sizes only.

{% figure "context-as-it-fills", "wide" %}

What stays is sent again.
[Claude Code's best-practices page](https://code.claude.com/docs/en/best-practices)
puts it this way: "Every request sends the whole conversation, so a session
that's collected three unrelated tasks re-reads all three on every turn of the
fourth." An old task therefore costs tokens in every later step, whether or not
it matters to the new one.

The second cost is the model's attention. Anthropic's engineering team calls the
effect context rot: as the number of tokens in the context window increases, the
model's ability to accurately recall information from that context decreases.
[Chroma](https://www.trychroma.com/research/context-rot) tested 18 models in
July 2025 and reported that their performance grows increasingly unreliable as
input length grows. The models are from 2025, so the size of the effect today is
a question for newer tests, but the direction is the one the vendors describe.
Anthropic's guide to context engineering draws the conclusion that good context
engineering means finding the smallest possible set of high-signal tokens, the
ones that most raise the likelihood of the outcome you want.

You can see your own numbers. In Claude Code, `/context` gives a live breakdown
by category with optimisation suggestions, including which CLAUDE.md and auto
memory files loaded. Looking once at the start of a session and once after a
long task shows what the figures try to illustrate.

## A subagent works in a context of its own

A subagent is a second agent that the main agent hands a task to, and it starts
with a context of its own.
[Claude Code's documentation](https://code.claude.com/docs/en/sub-agents)
recommends one when a side task would flood the main conversation with search
results, logs or file contents you will not refer to again: the subagent does
that work in its own context and returns only the summary. The context-window
page adds that only the summary and a small metadata trailer come back. There
is one exception, a fork: in Claude Code it inherits the conversation so far
instead of starting fresh. In November 2026 Claude can start one on its own, since fork
mode is on by default.

{% figure "context-subagent", "wide" %}

[Codex's documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
describes the problem a subagent solves from the other side. If you flood the
main chat with exploration notes, test logs, stack traces and command output, it
says, the session can become less reliable over time. It names two effects: the
context rot described above and context pollution, where useful information gets
buried under noisy intermediate output.

A subagent saves room in the main context, not tokens. The reading still
happens, only in another context, and according to Claude Code's best-practices
page it counts against the same usage as the main conversation. The total is
often higher than doing the work in one session, because a fresh subagent first
has to gather context the main conversation already had. That can cost time too.
Anthropic measured the same trade in its own
multi-agent research system in June 2025: in its data, agents used about four
times as many tokens as chat interactions, and multi-agent systems about fifteen
times as many. Those are figures for that system, not a rule for coding agents.

A separate context is not a separate place to work. VS Code's documentation puts
it in one sentence: context isolation is not code isolation. It does not by
itself create a separate worktree or sandbox, so what the subagent may touch
depends on the permissions it runs under, the subject of
[Set the limits in advance](/blog/set-the-limits-in-advance/). Two practitioners
have their own words for the mechanism.
[Simon Willison](https://simonwillison.net/2025/Oct/11/sub-agents/) describes a
subagent as a separate agent loop with a fresh token context, and
[Drew Breunig](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)
calls the act of isolating contexts in their own threads context quarantine.
These are practitioners' terms, not the vendors'.

## When the context is full, the tool summarises it

A full context does not end the session. Claude Code compacts automatically as
you approach the limit, VS Code automatically compacts older parts of the
conversation into a summary and Codex also compacts chats automatically, as
[its best-practices guide](https://learn.chatgpt.com/guides/best-practices)
says. What is lost is the price. VS Code says that compaction frees up the context
window for new information, but that details from earlier messages might be summarised or
omitted, and Anthropic's guide warns that overly aggressive compaction can lose
subtle but critical context whose importance only becomes apparent later.

{% figure "context-compaction", "wide" %}

Claude Code's documentation shows what comes back afterwards. Most start-up
content reloads automatically, and the tool re-reads up to five of the files
that Claude has read or edited in the session, choosing the ones modified most
recently. Skills used in the session come back too, within a size limit. The
rest of the conversation is in the summary, or gone. Path-scoped rules and
nested CLAUDE.md files, which load only when Claude touches a matching file, are
summarised away like the rest. They load again only when Claude touches such a
file, so a rule that must persist belongs in the project-root CLAUDE.md. After a
break you may continue from a summary: in November 2026, on a subscription,
Claude Code also compacts a session past about 200,000 tokens that has sat idle
for about an hour, shortly before its prompt cache expires.

## In November 2026 the vendors advise clearing between tasks

The emphasis has moved. Claude Code's best-practices page says that most current
models have a 1M-token window and compaction happens on its own, so a full
context window is rare. The advice to manage the window aggressively is gone. What remains is
that clearing between tasks is still worth doing, because a focused context gets
you better answers and costs less. Four habits follow from these pages:

- A new session or a cleared conversation for each task. VS Code says to start a
  new session for an unrelated task or a different project, and Codex says to
  keep one chat per coherent unit of work.
- Compaction with a focus. Claude Code's page suggests running `/compact` with
  instructions before a long new task, so that the summary keeps what you choose
  instead of what the automatic pass guesses is important.
- Large reads in a subagent, as the section above describes, at the price of
  tokens.
- Short start-up files, since the instruction file is carried by every request.
  Claude Code's best-practices page and Codex's guide both say so. The article
  on the instruction file shows how.

## Gas City plans the hand-off instead of waiting for compaction

The factory behind this site has a worked case of the same problem. Its
coordinating agent, the mayor, runs in sessions that each end at a hand-off: the
session writes down the state of its work, and a new session continues from
there. [A study of the mayor's context](/blog/what-the-mayors-context-costs/)
measured what that costs. An agent cannot do the planning by itself, because a
session cannot see its own context usage.
[Gas City](https://github.com/gastownhall/gascity/blob/main/cmd/gc/context_inject.go),
the open-source tool that runs the factory's agents, therefore has a hook that
does it for the agent. In the code's own words the hook is threshold-gated by
design and not an always-on countdown. It reads the token count from the
session's transcript and stays silent below a first level. Above that it tells
the agent to plan toward a clean handoff point, and above a second level to
trigger the canonical handoff now.

{% figure "context-handoff", "wide" %}

The idea is about who decides what survives. In compaction the tool writes the
summary. In a planned hand-off the agent writes down what the next session needs
while it still can, and the code names what would be lost otherwise: the
deliberate wrap-up. The hook's two levels are shares of the window that Gas City
assumes for the model, so that number has to be right. On 22 and 23 September
2026 Gas City called a hand-off at 160,000 tokens, because it took the window to
be 200,000. After the factory set the window to 1,000,000 tokens and the
hand-off at 30%, there were 0.18 hand-offs per bead, a task in the factory's
tracker, instead of 1.46. The price was longer calls: after the first outward
action, such as a reply or a dispatch, they processed 187,000 tokens on average
instead of 142,000. A late hand-off makes every call longer and an early one makes more hand-offs. The
written state must also stay short: on 24 September the state card, rewritten at
every hand-off, and the reference read in one call were both trimmed and capped.

## Practitioners decide at the phase boundary too

Matt Pocock, who publishes a set of agent skills, reaches a similar idea as an
individual practitioner.
[Pocock's rules for phase boundaries](https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)
say that mid-phase there is no decision to make: continue, or split the work
that is left into subagents, because compacting mid-phase makes the agent lose
the thread.
[Pocock's notes on hand-offs](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md)
compare three of the five options at a phase boundary: `/compact` preserves your
intent, `/clear` preserves nothing and `/handoff` preserves the work's ability
to move. `/handoff` is one of Pocock's skills, not a command built into the
tool. These are one practitioner's rules, not vendor guidance, and they match
what Gas City's hook tells the agent: plan toward a clean handoff point.

The counterweight comes from another practitioner. In July 2025
[Armin Ronacher](https://lucumr.pocoo.org/2025/7/30/things-that-didnt-work/)
wrote that although subagents should preserve context better, starting new
sessions and writing thoughts to Markdown files often gave better results.
Anthropic's guide gives the technique a name, structured note-taking, where the
agent regularly writes notes persisted outside of the context window, and that
is the subject of a later article on memory.

## What still goes wrong, and what to do first

Users also report the limits above as friction. Two examples, both from Claude
Code users, are reports and not verdicts on the tool. On its public
tracker, [one issue](https://github.com/anthropics/claude-code/issues/27242),
opened in February 2026 and still open in November, complains that there is no
working way to review conversation history that has been cleared or compacted.
On Hacker News in September 2026,
[a commenter](https://news.ycombinator.com/item?id=49908276) objected that
subagents have to re-read everything, which matches Anthropic's own note that a
fresh subagent first has to gather context the main conversation already had.

The habit to start with is the one all three vendors share: one task, one
session. The other three habits above can follow once that one holds. If the
work spans many sessions, it is good to write down the state at the end of each
phase and start the next session from that note.
