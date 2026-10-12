---
title: What makes a chat an AI agent
description: The first part of the series From AI chat to agentic work — what sets an AI agent apart from a chat with AI, the five parts it is made of and how they look in the factory behind this site.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: A developer seen from behind, split in two halves in front of two screens. The left half is grey and calmer, in front of a chat. The right half is green and active, the hand raised toward a screen with a graph of agents.
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: what-makes-a-chat-an-ai-agent
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

Addable Labs builds software largely with AI agents, and this site is built
and maintained by an agent-run software factory, as we described in
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/).
Much of the work with AI still happens in a chat, though: someone pastes in
code, gets a suggestion and pastes it back.

This series describes the way on from there, one building block at a time,
and starts with what sets the two apart. The short answer is that the model
is often the same as in the chat. What is new is everything around it: an AI
agent may read the project, change files, run commands and check its own
work.

## One bug, two ways to fix it

A made-up but common example: a date field in a form accepts 31 February.

In the chat, someone pastes in the code and describes the bug. The
suggestion is carried over to the editor, the tests are run and another test
breaks. The error message is pasted into the chat, a new suggestion comes
back, and after a few rounds it works. The model has never seen the project,
only the pieces someone chose to show it.

An AI agent gets the task instead: "The date field accepts 31 February. Fix
it and add a test." It finds the file, reads the code around it, makes the
change and runs the tests. When another test breaks, it reads the error and
tries again. When all the tests pass, it shows what it has changed, and a
human decides whether the change goes in.

The difference is who does the rounds. In the chat, the human runs the
tests, reads the error and carries it back. With an AI agent, that happens
inside the tool, and the human's part becomes giving the task and reviewing
the result.

{% figure "chat-or-agent", "wide" %}

## Five parts

Anthropic, OpenAI and GitHub describe an AI agent in much the same way in
the documentation for
[Claude Code](https://code.claude.com/docs/en/how-claude-code-works),
[Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and
[GitHub Copilot](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses):
a model, instructions, tools, a loop and a layer that holds it all together.

{% figure "five-parts" %}

**The model** is the same kind of language model as in the chat. It reasons
and chooses the next step, but does nothing on its own — in Anthropic's
words, ["Without tools, Claude can only respond with text"](https://code.claude.com/docs/en/how-claude-code-works).
The model often runs at the vendor: an agent can
[change files locally while sending what it reads to a model in the cloud](https://code.visualstudio.com/docs/agents/overview),
unless a local model has been chosen.

**The instructions** are a text file in the project that the agent reads
every time it starts: how the project is built and tested, which rules apply
and what to leave alone. [AGENTS.md](https://agents.md/) is an open format
for such a file. It grew out of a collaboration that included OpenAI's
Codex, among others, and is read today by a long list of tools. The file can
be short:

```markdown
# Instructions for AI agents

## Build and test
- Install dependencies with `npm install`.
- Run `npm test` before you say you are done.

## Rules
- Write a test for every bug you fix.
- Change nothing in the `migrations/` folder.
- Ask before you add a new package.
```

The file is also the simplest way to reach every agent at once. On 12
September, with four agents on one computer, a message had to reach all
four, and we pasted it into the rules file every agent on the machine reads
first. But the file guides and locks nothing: Anthropic writes that Claude
treats it [as context, not enforced configuration](https://code.claude.com/docs/en/memory).
What must never happen is stopped outside the model — part 7 of the series
is about that.

**The tools** let the agent do things: search the code, change files, run
tests. An agent with access to the terminal
[can run the same commands](https://code.claude.com/docs/en/how-claude-code-works)
as the person at the keyboard. Connections to systems outside the project,
such as an issue tracker, are often made with the
[Model Context Protocol](https://modelcontextprotocol.io/), an open standard
for exactly such connections.

**The loop** is the round from the date field example: take a step, look at
the result, choose the next.
[Anthropic describes it](https://code.claude.com/docs/en/how-claude-code-works)
as three phases: gather context, take action and verify results. The loop is
also where the agent finds its way around its own mistakes. In the factory's
first build, a session claimed a bookkeeping record in the ledger instead of
its task and needed fourteen minutes to work around it. It wrote the fix
into its notes, and when the second build's first session hit the same
thing, it was on its task within a minute.

**What holds it all together** is called the harness.
[The documentation for GitHub Copilot in VS Code defines it](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses)
as the software that runs an agent session and turns a language model into
an agent by connecting it to context and tools, coordinating the loop and
keeping track of the session. It can be an extension in the editor, a
program in the terminal, a job in CI or a scheduled run. In the factory,
Claude Code is the harness for the mayor's sessions — the mayor is the agent
that coordinates the factory — and in September about 33,000 tokens of every
start were Claude Code's own system prompt and tool definitions, according
to [A study of the mayor's context](/blog/what-the-mayors-context-costs/).
That a planner and a reviewer can be different agents comes from the layer
above, Gas City, where an agent is configuration: a name, a prompt, a scope.

## What carries the work in the factory

In the factory, four things outside the model carry the work.

**Gates.** When the site was built in September, a single command ran ten
quality gates on every pull request, and each gate has a test proving that
it fails when something has been deliberately broken. That is told in
[How this site was built by agents](/blog/how-this-site-was-built-by-agents/).

**Tasks with a clear end.** The requirements became numbered statements with
acceptance criteria, and each work item got its own proof command. An agent
knows it is done when a command says so.

**Short instructions.** Anthropic recommends
[under 200 lines per file](https://code.claude.com/docs/en/memory), because
longer files take up more context and are followed less closely. We saw the
same in September: the mayor's notes log had grown too long to read whole,
so new sessions skipped most of it and took old facts as current. Since 24
September the state card, rewritten at every hand-off, and the reference
have been trimmed and capped.

**A human who reads.** No article and no change to what the site says goes
public without the founder reading it first. The first build ran without a
gate at the plan, and the founder's verdict on the result was "a page from
the 90s". Since then the gate sits at the plan.

## Claude Code, Codex and GitHub Copilot

The mayor works in Claude Code. Codex and GitHub Copilot we describe from
their documentation as it stood on 6 October 2026; menu names change often.

In **Claude Code** the instruction file is CLAUDE.md, and Claude Code can
[write a first draft of it](https://code.claude.com/docs/en/memory) from the
code. If there is no CLAUDE.md, it reads AGENTS.md instead. What the agent
may do without asking is set by
[modes](https://code.claude.com/docs/en/permission-modes): from version
2.1.283 it starts in Auto mode unless something else is set, and an
automatic check then reviews most actions in the background and stops what
looks risky. In Manual mode Claude Code asks before it changes files or runs
commands. [File changes can be undone](https://code.claude.com/docs/en/how-claude-code-works#undo-changes-with-checkpoints),
but not what has already reached other systems.

In OpenAI's **Codex**, AGENTS.md is the instruction file itself: Codex
[reads it before doing any work](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
one file per folder from the project's root down to the folder it works in.
The nearest file weighs the most. On the local machine,
[Codex works in a sandbox](https://learn.chatgpt.com/docs/agent-approvals-security)
that usually reaches only the project's folder — with no network unless set
otherwise — and an approval policy decides when it must stop and ask.

In **GitHub Copilot** in VS Code the instruction file is
[`.github/copilot-instructions.md`](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions),
and Copilot reads AGENTS.md too. With
[Manual permissions](https://code.visualstudio.com/docs/agents/agents-tutorial)
Copilot asks before it runs commands or uses other tools, but changes files
in the project folder without asking. A
[checkpoint](https://code.visualstudio.com/docs/agents/run/review-code-edits#_restore-a-checkpoint)
restores the files and the chat to how they were before a given request,
but not commands that have run or changes in other services.

## What comes next

The coming parts take the building blocks one at a time: the instruction
file, agents with a scope each, skills for what should come out the same
every time, the Model Context Protocol for reaching the rest of the systems,
where the agent runs, who starts it and which limits are set in advance. The
last part is about how much has changed along the way: that each new model
needs less steering, but still some.
