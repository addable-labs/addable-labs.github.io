---
title: The instruction file, the first thing an AI agent reads
description: The second part of the series "From AI chat to agentic work" — whether to make an instruction file, what to write first, how to keep it useful and how one file can serve several tools.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: A developer seen from behind, split into two halves in front of two screens. The left half is grey and calmer, in front of a chat. The right half is green and active, one hand raised towards a screen with a graph of agents.
date: 2026-10-12
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In [What makes a chat an AI agent](/blog/what-makes-a-chat-an-ai-agent/),
the first part of the series, we showed a short AGENTS.md for a made-up web
app. This part starts with what a newcomer wants to know first: whether to
make such a file, what goes in it and how to keep it useful.

## Yes, make one, and keep it short

Anthropic describes CLAUDE.md, its version of the file, as
[the place where you write down what you would otherwise re-explain](https://code.claude.com/docs/en/memory).
The studies below find small, uncertain gains, but a short file is quick to
write and saves explaining the same things again. So keep the effort small:

1. Write it yourself, as AGENTS.md in the root of the project. Researchers at
   ETH Zurich
   [suggest leaving out files written by a language model for the time being](https://arxiv.org/html/2602.11988v3).
2. Start with the commands for installing, building and testing. Anthropic
   lists
   [commands Claude cannot guess](https://code.claude.com/docs/en/best-practices)
   first among what belongs in the file.
3. Add the few rules the agent cannot work out from the code, each with its
   reason, so that it
   [makes better decisions in edge cases](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
4. Leave out overviews and descriptions of what each file does:
   [the agent can find that out for itself](https://code.claude.com/docs/en/best-practices).
5. Add a line when the agent
   [makes the same mistake a second time](https://code.claude.com/docs/en/memory).
   Cut a line when
   [removing it would cause no mistakes](https://code.claude.com/docs/en/best-practices).

Claude Code
[reads AGENTS.md too when there is no CLAUDE.md](https://code.claude.com/docs/en/memory).
If there is one, that file can
[import AGENTS.md](https://code.claude.com/docs/en/memory), as the section on
several tools shows. The file at the end of the story is a starting
point to copy.

## The same file a few weeks later

Here is how the steps play out, in a made-up story. On the first day the
developer's file looked like part 1's example and held little more than what
it takes to get started. Then a database table needed a new column. The file
said to change nothing in the `migrations/` folder, where the database
changes live. The rule gave no reason and no alternative, so the agent left a
loose SQL script in the project root.

The developer rewrote the rule with both a reason and a way out: those
files have already run in production, so add a new migration instead. Two
weeks running, the agent ran all the tests after a one-line change, so
the file got a line on how to run a single test file.

The file had also gained a section on what each file in the project does.
Then the developer asked of every line whether the agent would make mistakes
without it, and that section failed: the agent reads the files itself, and
Anthropic counts
[file-by-file descriptions of the codebase](https://code.claude.com/docs/en/best-practices)
among what does not belong in the file. It was cut.

<!-- figure A: file-before-after -->

The web client's tests are not part of `npm test`, so the `web/` folder got
an AGENTS.md of its own, with one line that adds the web tests without
contradicting the root file:

```markdown
- Also run `npm run test:web` before you say you are done.
```

The `migrations/` rule stayed in the root file. It could have moved into an
AGENTS.md in `migrations/`, but the tools read files in subfolders at
different times, so a rule that must always hold is safest in the root. The
root file then looked like this:

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

A line in the file stops nothing: it asks and does not block.
[One of Anthropic's own examples of a hook](https://code.claude.com/docs/en/best-practices),
[a command the tool runs by itself](https://code.claude.com/docs/en/hooks-guide),
blocks writes to the migrations folder. In nivå, our AI-fluency
self-assessment, database migrations may only be added to, never changed:
the checks built before the features make sure a decision written down is
respected, as we wrote in
[Lessons from building nivå](/blog/lessons-from-building-niva/). Part 7 is
about such blocks.

## Vendors ask for short files, but the evidence is thin

OpenAI
[prefers a short, accurate AGENTS.md to a long file full of vague rules](https://learn.chatgpt.com/docs/learn/best-practices).
GitHub's suggested prompt for having Copilot write its own instruction file
[asks for no more than two pages](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions),
and Codex
[by default stops adding files once together they reach 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
about 32,000 characters.

The evidence that the file helps is thinner than the advice.
[A study from ETH Zurich](https://arxiv.org/html/2602.11988v3) had AI
agents solve real-world tasks with and without an instruction file. Files the developers had written
themselves raised the share of tasks solved by 2.4% on average, while files
written by a language model lowered it by 0.5% and 2% in the study's two
sets of tasks. None of these differences is statistically significant, so
the study cannot tell them from chance.

The cost is clearer. The generated files made the runs 20% and 23% more
expensive, and that increase is significant. Even the hand-written files
raised the cost, by at most 19%. Overviews of the project did not help,
though the researchers note that model providers recommend them.

[Another, smaller study of 124 pull requests](https://arxiv.org/abs/2601.20404)
found that runs with an AGENTS.md had a 28.64% shorter median time and that
the agents solved the tasks about as often. There the file saved time but
gave no better answers.

Claude Code and Codex can both draft a first version, but
[Anthropic says to refine it with what Claude would not discover on its own](https://code.claude.com/docs/en/memory)
and [OpenAI to edit the result to fit how the team works](https://learn.chatgpt.com/docs/learn/best-practices).
That argues for writing it by hand, or editing a draft down to what the
agent cannot find out for itself, and for expecting small, uncertain gains.

## Models change, and the file changes with them

A file written for one model can be too loud for the next. In October 2026
[Anthropic's prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that some newer models are more responsive to the system prompt, the
instructions sent ahead of the conversation, so where one might have written
"CRITICAL: You MUST use this tool when...", one can now write "Use this
tool when...".

Since 25 September 2026 Claude Code has
[a command that looks for instructions written for older models](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

The audit covers [AGENTS.md too](https://code.claude.com/docs/en/memory)
and changes nothing until you ask.

## One file for three tools

With more than one tool, a single AGENTS.md in the root is enough, if each
tool finds it. We describe the tools as their documentation stood on 12
October 2026.

<!-- figure B: which-tool-reads-what -->

[Codex reads AGENTS.md before doing any work](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
GitHub Copilot reads it too,
[on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
and [in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Claude Code also reads AGENTS.md, but by default
[only when there is no CLAUDE.md](https://code.claude.com/docs/en/memory).
If there is one, that file can
[import AGENTS.md](https://code.claude.com/docs/en/memory) with a single
line:

```text
@AGENTS.md
```

There is a trap: a personal CLAUDE.local.md
[counts as a CLAUDE.md](https://code.claude.com/docs/en/memory), so by
default whoever adds one stops their own Claude Code from reading
AGENTS.md. The line `@AGENTS.md` in that file
[keeps AGENTS.md read](https://code.claude.com/docs/en/memory).

GitHub Copilot also reads `.github/copilot-instructions.md` and sends the
model
[all relevant instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
VS Code advises against
[relying on a file order](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
when files contradict each other. So the rules belong in one place.

Files in subfolders, like `web/AGENTS.md` in the example, are read at
different times. Without a CLAUDE.md, Claude Code reads one
[when it opens a file there](https://code.claude.com/docs/en/memory).
Codex
[searches from the project root down to the folder it started in](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
so it reads the file in `web/` only when it starts in `web/` or below. In
VS Code, files in subfolders are
[experimental, off by default](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
for [its built-in agent](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses).
Rules that must hold everywhere stay in the root file.

## The factory's rules sit in the files read first

The factory behind this site works the same way. In
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/)
we wrote that rules "are written in the files every session reads first" and
counted "the rules of a shared machine" as our own contribution. Two of
them, shortened and without names:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Both lines give their reason, and neither can be worked out from the code.

Every line also has a price. In
[A study of the mayor's context](/blog/what-the-mayors-context-costs/), the
rules files our coordinating agent reads count as what goes to the model
with every call, so a longer file costs more on every call.

What is needed only sometimes belongs elsewhere: an agent with a job of its
own in part 3, skills in part 4.
