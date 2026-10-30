---
title: The instruction file, the first thing an AI agent reads
description: The second part of the series "From AI chat to agentic work" — whether to make an instruction file, what to write first, how to keep it useful and how one file can serve several tools.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-12
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/), the
first part of this series, the instructions were one of the five parts of an
AI agent: a text file in the project that the agent reads every time it
starts. We showed a short one for a made-up web app.

If you are new to AI agents, you probably want to know three things. Should
you make one? What goes in it first? And what do you do when the agent still
gets something wrong? The short answer: yes, make one, write it yourself and
keep it short. It does not have to be right on the first day. It grows from
what the agent gets wrong, and it shrinks when a line is no longer needed.

We follow the web app from part 1 and its file through the article, first on
the day it was written and then a few weeks later.

## The file on the first day

A made-up example: a developer starts a web app with a database and tests, and
has an AI agent to help. The agent knows nothing about the project, so on the
first day the developer writes down what a new colleague would need to know,
and nothing more:

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

The lines under "Build and test" are commands the agent could not guess: how
to install the project and how to test it.
[Anthropic lists build and test commands among what belongs in the file](https://code.claude.com/docs/en/memory).
The rules are the few things that cannot be read out of the code. One keeps
the agent out of the `migrations/` folder, where the changes to the database
are kept.

## A rule needs its reason

Then a database table needs a new column. The file says to change nothing in
`migrations/`, but not why and not what to do instead. The agent leaves a
loose SQL script in the root of the project.

The developer rewrites the rule so that it has both a reason and a way out:
those files have already run in production, so add a new migration instead.
[VS Code's documentation](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
says that the agent makes better decisions in edge cases when the instructions
explain why a convention exists.

Two weeks in a row, the agent runs all the tests after a change of one line.
The developer adds a line on how to run a single test file.
[Anthropic's advice](https://code.claude.com/docs/en/memory) is to add a line
when Claude makes the same mistake a second time.

## What the agent finds on its own can go

The file has also grown a section on what each file in the project does. The
developer applies [Anthropic's test for what to write down](https://code.claude.com/docs/en/best-practices):
could the agent find it by reading the code, and would it actually go and
look? If both answers are yes, the line goes. The section fails the test and is
cut.

{% figure "file-before-after", "wide" %}

## A folder that works differently gets a file of its own

The web client's tests are not part of `npm test`. The `web/` folder gets an
AGENTS.md of its own, with one line that adds the web tests without
contradicting the root file:

```markdown
- Also run `npm run test:web` before you say you are done.
```

The `migrations/` rule stays in the root file, because the tools read files in
subfolders at different times and a rule that must always hold is safest
there. The root file then looks like this:

```markdown
# Instructions for AI agents

## Build and test
- Install dependencies with `npm install`.
- Run a single test file with `npm test -- <file>`.
- Run `npm test` before you say you are done.

## Rules
- Write a test for every bug you fix.
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
- Ask before you add a new package.
```

## A line in the file stops nothing

A line in the file asks the agent; it does not stop it. In
[nivå](https://erniva.se/), our AI-fluency self-assessment, database
migrations may only be added, never changed. The checks built before the
features make sure a decision written down is respected, as we wrote in
[Lessons from building nivå](/blog/lessons-from-building-niva/).

## The gains are small, the cost is clear

Does the file help at all? [A study from ETH Zurich](https://arxiv.org/html/2602.11988v3)
had AI agents solve real-world tasks with and without an instruction file.

Files the developers had written themselves raised the share of tasks solved
by 2.4% on average. Files written by a language model lowered it by 0.5% and
2% in the study's two sets of tasks.

None of these differences is statistically significant, so the study cannot
tell them from chance. The researchers suggest leaving out files written by a
language model for the time being.

The cost is clearer. The generated files made the runs 20% and 23% more
expensive, and that increase is significant.

## Models change, and the file changes with them

A file written for one model can be too loud for the next. In October 2026
[Anthropic's prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that some newer models are more responsive to the system prompt, the
tool's own instructions. Where you might have written "CRITICAL: You MUST use
this tool when...", you can now write "Use this tool when...".

Since 25 September 2026 Claude Code has
[a command that looks for instructions written for older models](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

The audit covers [AGENTS.md too](https://code.claude.com/docs/en/memory) and
changes nothing until you ask.

## One file for three tools

With more than one tool in the project, one AGENTS.md in the root is enough if
each tool finds it. We describe the tools as their documentation stood on 30
October 2026, and what we say may have changed since.

{% figure "which-tool-reads-what", "wide" %}

Claude Code reads AGENTS.md too, but by default
[only when there is no CLAUDE.md](https://code.claude.com/docs/en/memory). If
there is one, that file can
[import AGENTS.md](https://code.claude.com/docs/en/memory) with a single line:

```text
@AGENTS.md
```

There is a trap. A personal CLAUDE.local.md
[counts as a CLAUDE.md](https://code.claude.com/docs/en/memory), so by default
whoever adds one stops their own Claude Code from reading AGENTS.md.
[Setting Project instructions to `claude-md-and-agents-md` in `/config` keeps AGENTS.md read](https://code.claude.com/docs/en/memory).

[Codex reads AGENTS.md before doing any work](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

GitHub Copilot reads AGENTS.md too,
[on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
and [in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
It also reads `.github/copilot-instructions.md` and sends the model
[all relevant instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).

Files in subfolders, like `web/AGENTS.md` in the example, are read at
different times. Without a CLAUDE.md, Claude Code reads one
[when it opens a file there](https://code.claude.com/docs/en/memory). Codex
[searches from the project root down to the folder it started in](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
and in VS Code, Copilot
[finds one as it works with files in that subfolder](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
What must hold everywhere stays in the root file, in one place.

## Two rules from the factory

The factory behind this site keeps its rules in the files every session reads
first, as we wrote in
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/).
Two of them, shortened and without names:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Both lines give their reason, and neither can be worked out from the code.

## Start small and let the file grow

Make the file in the root of the project, as an AGENTS.md, and write it
yourself. If a tool drafts it for you, edit the draft: both
[Anthropic](https://code.claude.com/docs/en/memory) and
[OpenAI](https://learn.chatgpt.com/docs/learn/best-practices) say so. Begin
with the commands to install, build and test, then add the few rules the agent
cannot work out from the code, each with its reason. Leave out overviews and
descriptions of what each file does.

When the agent makes the same mistake a second time, add a line with its
reason. When a line only says what the agent could find by reading the code,
cut it. When you change model, read the file again.

The evidence that the file helps is thin — the study above shows small,
uncertain gains — and the tools' documentation keeps changing.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. The instruction file (this part)
3. Agents with a scope each
4. Skills that describe how something should be done
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
