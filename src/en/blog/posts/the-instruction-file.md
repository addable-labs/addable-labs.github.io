---
title: The instruction file, the first thing an AI agent reads
description: The second part of the series "From AI chat to agentic work" — the same instruction file a few weeks later, what is added and what is cut, why short beats long and how one file serves three tools.
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
app. This part follows the same file a few weeks later: what is added, what
is cut and where a rule has to sit for every tool to read it in time.

The point is that a short, true instruction file does more than a long
prompt. OpenAI says nearly the same of the file itself:
["A short, accurate AGENTS.md is more useful than a long file full of vague rules"](https://learn.chatgpt.com/docs/learn/best-practices).

## The same file a few weeks later

The story is made up, like the file. On the first day the file held only
what a new colleague needs to know. Anthropic writes that a line belongs
there when
["A new teammate would need the same context to be productive"](https://code.claude.com/docs/en/memory).
A few weeks later the file looks like this:

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

**The migrations rule has its reason** and a way out.
[Anthropic's prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
and
[the documentation for GitHub Copilot in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
both advise giving the reason with the rule. The latter writes:
["When instructions explain why a convention exists, the AI makes better decisions in edge cases."](https://code.visualstudio.com/docs/agent-customization/custom-instructions)

**A line was added when a mistake came back.** Twice the agent ran the
whole test suite after a one-line change, so the file now says how to run a
single test file. That is the first reason on Anthropic's list of when to
add a line:
["Claude makes the same mistake a second time"](https://code.claude.com/docs/en/memory).

**A section was cut.** The file had gained a description of what each file
in the project does. The agent reads the files itself, and Anthropic counts
["File-by-file descriptions of the codebase"](https://code.claude.com/docs/en/best-practices)
among what does not belong in the file. Anthropic's question for each line
is
["Would removing this cause Claude to make mistakes?"](https://code.claude.com/docs/en/best-practices)
For the description of the files, the answer was no.

**The web client has a file of its own.** The tests in the `web/` folder
are not part of `npm test`, so the folder holds its own AGENTS.md, with one
line that adds something and does not contradict the root file:

```markdown
- Also run `npm run test:web` before you say you are done.
```

**The `migrations/` rule stays in the root file.** It could have gone in a
file of its own in that folder, but the tools read files in subfolders at
different times (see the table below). Claude Code reads a subfolder's
AGENTS.md [when it opens a file there](https://code.claude.com/docs/en/memory);
Codex
[stops looking once it reaches the folder it started in](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
In VS Code, files in subfolders are [experimental](https://code.visualstudio.com/docs/agent-customization/custom-instructions),
[off by default](https://code.visualstudio.com/docs/agent-customization/custom-instructions) for its local agent.
A rule in `migrations/` can therefore reach the agent too late or not at
all. Even in the root file the rule stops nothing:
[one of Anthropic's own examples of a hook](https://code.claude.com/docs/en/best-practices)
blocks writes to the migrations folder, and such locks are the subject of
part 7.

In the self-assessment nivå, which we wrote about in
[Lessons from building nivå](/blog/lessons-from-building-niva/), database
migrations are append-only. There the rule is more than a line in a file.
It is among the checks built before the features, so a decision written
down is one they make sure is respected.

## Short beats long, but the gains are small

The vendors also set limits in numbers. GitHub's suggested prompt for
having Copilot write its own instruction file says
["Instructions must be no longer than 2 pages"](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions),
and Codex
[by default stops adding files once together they reach 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

The evidence that the file helps is thinner than the advice.
[A study from ETH Zurich](https://arxiv.org/html/2602.11988v3), in its
third version of 29 September 2026, had AI agents solve real-world tasks
with and without an instruction file. Files the developers had written
themselves raised the share of tasks solved by 2.4% on average. Files
written by a language model lowered it by 0.5% and 2% in the study's two
sets of tasks. Neither result is statistically significant, but the
generated files made the runs 20% and 23% more expensive. The researchers
suggest leaving out generated files for the time being. Overviews of the
repository did not help.
[A smaller study of 124 pull requests](https://arxiv.org/abs/2601.20404)
found that runs with an AGENTS.md had a 28.64% shorter median time and that
the agents solved the tasks about as often.

The gains, then, are small and the evidence is mixed. The ETH study does
back one part of the vendors' advice: what the agent can find out for itself
does not belong in the file.

**How it has changed.** Instructions written for an older model may need to
become shorter and calmer when the model changes.
[Anthropic's prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
writes in October 2026 that some newer models are more responsive to the
system prompt, and that where one might have written "CRITICAL: You MUST use
this tool when...", one can now write "Use this tool when...". Emphasis such
as
"IMPORTANT" belongs, according to
[Anthropic](https://code.claude.com/docs/en/best-practices), on a single
line that Claude keeps skipping:
["If you emphasize many lines, none of them stands out."](https://code.claude.com/docs/en/best-practices)
[Since 25 September 2026](https://code.claude.com/docs/en/changelog),
Claude Code has had the command `/doctor prompt-audit`, which
[looks for instructions written for older models](https://code.claude.com/docs/en/memory).

## One file for three tools

We describe the tools here from their documentation as it stood on
12 October 2026.

**Claude Code**
[reads AGENTS.md when there is no CLAUDE.md](https://code.claude.com/docs/en/memory).
There is a trap: a personal CLAUDE.local.md
[counts as a CLAUDE.md](https://code.claude.com/docs/en/memory). Someone
who adds one for their own notes
[stops Claude Code from reading AGENTS.md for them](https://code.claude.com/docs/en/memory)
unless the Project instructions setting is set to read both. A project that
needs a CLAUDE.md can
[import the shared file with the line `@AGENTS.md`](https://code.claude.com/docs/en/memory).
A sentence asking the agent to read AGENTS.md is not enough:
["Claude sees `AGENTS.md` only if it decides to open the file"](https://code.claude.com/docs/en/memory).
A symbolic link works too, but Anthropic
[recommends the import if anyone works on Windows](https://code.claude.com/docs/en/memory),
where Git may otherwise check the link out as a plain text file.

**Codex**
[reads AGENTS.md before doing any work](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
but
[stops looking once it reaches the folder it started in](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
so a file further down the tree is not read if Codex starts at the root. An
[AGENTS.override.md replaces the AGENTS.md in the same folder](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

**GitHub Copilot** on GitHub
[reads both `.github/copilot-instructions.md` and AGENTS.md, where the nearest AGENTS.md in the directory tree takes precedence](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
[A single CLAUDE.md in the root works too](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
[All relevant instructions are provided to Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions),
so two files that contradict each other are a problem there as well. In
VS Code, the documentation calls AGENTS.md
[a cross-agent format](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
and advises against
[relying on a file order when files contradict each other](https://code.visualstudio.com/docs/agent-customization/custom-instructions),
because the tools find and merge files in different ways.

The table shows what the pages said on the same day about files in
subfolders.

| Tool | Which files in subfolders are read | When the files contradict each other |
|---|---|---|
| [AGENTS.md, the format](https://agents.md/) | The nearest file to the file being edited | The nearest file wins |
| [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | From the root down to the folder Codex started in | The closer file takes precedence |
| [Claude Code](https://code.claude.com/docs/en/memory) | Above: at start. Below: when Claude Code opens a file there | All are read together and Claude may pick one arbitrarily |
| [GitHub Copilot on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) | AGENTS.md files anywhere in the repository | The nearest AGENTS.md takes precedence |
| [GitHub Copilot in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions) | An experiment, off by default for the local agent | No order to rely on |

What the pages have in common is the safe course: rules that must hold
everywhere stay in the root file, and no file contradicts another.

## The factory's rules sit in the files read first

The factory behind this site works the same way — it was into such a file,
the one every agent on the machine reads first, that we pasted the message
to the other agents on 12 September.
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/)
says that rules "are written in the files every session reads first" and
counts "the rules of a shared machine" as our own contribution. Two of
them, shortened and without names:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Both lines carry their reason, as the vendors advise. Neither reason can be
read from the code.

Every line has a price as well.
[A study of the mayor's context](/blog/what-the-mayors-context-costs/)
counts the rules files as start-up content, and "the start-up content goes
with every call, so it costs its size times the calls, not times the
sessions". A line no one needs costs something on every call.

What is needed only sometimes belongs elsewhere: the description of an
agent with a job of its own in part 3 and skills in part 4. The instruction
file is the first thing the agent reads, so it carries only what holds
every time.
