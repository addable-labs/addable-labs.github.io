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

We follow the web app and its file from the first day to a few weeks later,
and then look at what the studies say and at how the tools differ.

## A made-up web app and its file

A made-up example: a developer starts a web app with a database and tests,
and has an AI agent to help. The agent knows nothing about the project, so on
the first day the developer writes down what a new colleague would need to
know, and nothing more. The result is a file called AGENTS.md, in the
project's top folder (the root):

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
are kept as files called migrations. Another keeps new outside code, called
packages, from entering the project unnoticed.

The file is short on purpose.
[Anthropic recommends under 200 lines per file, because longer files take up more context and are followed less closely](https://code.claude.com/docs/en/memory).
[OpenAI prefers a short, accurate AGENTS.md to a long file full of vague rules](https://learn.chatgpt.com/docs/learn/best-practices).

A week later the database needs a new column. The file says to change nothing
in `migrations/`, but not why and not what to do instead, so the agent leaves
a loose file of database commands in the root of the project. The developer
sees it when reading the agent's changes, and rewrites the rule to give both:
those files have already run in production, which means on the live database,
so the change goes in a new migration.
[VS Code's documentation](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
says that the agent makes better decisions in unusual cases when the
instructions explain why a convention exists.

Twice in the next two weeks, the agent runs all the tests after a change of a
single line, although one test file would do. The second time, the developer
adds a line on how to run one test file.

By then the file has also grown a section on what each file in the project
does. It looks helpful, but
[Anthropic suggests a test for what to write down](https://code.claude.com/docs/en/best-practices):
could the agent find it by reading the code, and would it actually go and
look? If both answers are yes, the line is left out, so the developer cuts
the section.

{% figure "file-before-after", "wide" %}

Finally, the tests for the part of the app that runs in the browser are not
part of `npm test`. The `web/` folder gets an AGENTS.md of its own, with one
line that adds them:

```markdown
- Also run `npm run test:web` before you say you are done.
```

That makes two files, two of the levels part 1 described: one for the whole
project and one for a single folder. The rule about `migrations/` stays in the
root file, because it applies to the whole project. The root file now looks
like this:

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

## What the studies show

Does the file help at all? [A study from ETH Zurich](https://arxiv.org/html/2602.11988v3)
had AI agents solve real-world tasks with and without an instruction file.
Files the developers had written themselves raised the share of tasks solved
by 2.4% on average.

That is a small gain that the study cannot tell from chance. Researchers call
a difference "statistically significant" when chance is an unlikely
explanation for it, so the word does not mean that the difference is large.
None of the differences in the study was significant.

Files written by a language model lowered the share slightly in both of the
study's sets of tasks. The researchers suggest leaving out files written by a
language model for the time being.

All the files made the runs more expensive, by up to about a fifth.

The study also looked at overviews of the project, like the section the
developer cut. The researchers found that such overviews did not help,
although model providers recommend them.

[Another, smaller study](https://arxiv.org/abs/2601.20404) looked at 124 pull
requests, which are proposed changes to a project's code. Runs with an
AGENTS.md took more than a quarter less time at the median. The agents
completed the tasks about as often. There the file saved time but gave no
better answers.

So there is little evidence that an instruction file helps. One study finds
that every file adds cost and that none clearly helps, the other that the runs
get faster and the results stay the same. The researchers behind the first
advise putting in a file only what the agent cannot get from the code. That is
the idea behind the advice here: write the file yourself and keep it short.

## When the agent ignores a line

The first time the agent gets something wrong, tell it and carry on: one
mistake is not yet a rule.
[Anthropic advises adding a line when Claude makes the same mistake a second time](https://code.claude.com/docs/en/memory),
as the developer did with the test command.

Sometimes the line is there and the agent ignores it. A line in the file asks
the agent; it does not stop it. [Anthropic writes that such a line works most of the time, not every time](https://code.claude.com/docs/en/best-practices).
Check first that the line says why, and what to do instead, as the
`migrations/` rule does after its rewrite.

A rule that must never be broken needs a check outside the file.
[Anthropic's best-practices page](https://code.claude.com/docs/en/best-practices)
takes the same rule as its example: a rule like leaving the migrations
folder alone is followed almost every time. For the few rules where
"almost" is not good enough, the page moves the rule out of the file and into
configuration that Claude Code applies itself. There it becomes a hook, a
command that [the tool runs by itself](https://code.claude.com/docs/en/hooks-guide).
The hook [blocks edits to the migrations folder](https://code.claude.com/docs/en/best-practices).

A test in the project does the same job in any tool: in the example, a test
that fails when a migration already in the project is changed. In
[nivå](https://erniva.se/), our AI-fluency self-assessment, tests and checks
run on every change. Database migrations may only be added, never changed. We
wrote about it in
[Lessons from building nivå](/blog/lessons-from-building-niva/).

What must never happen is stopped outside the model, as part 1 described.
[Part 7](#part-7) of the series comes back to it.

## One file for three tools

With more than one tool in the project, one AGENTS.md in the top folder is
enough if each tool finds it.
[VS Code's documentation advises a shared format that all the tools support when possible](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
We describe the tools as their documentation
stood on 30 October 2026. What we say may have changed since.

{% figure "which-tool-reads-what", "wide" %}

**Claude Code** has CLAUDE.md as its own instruction file and reads AGENTS.md
too, but by default
[only when there is no CLAUDE.md](https://code.claude.com/docs/en/memory). In
that case it reads a file in a subfolder
[when it opens a file there](https://code.claude.com/docs/en/memory). If there
is a CLAUDE.md, it can
[pull in AGENTS.md](https://code.claude.com/docs/en/memory) with a single line:

```text
@AGENTS.md
```

[A CLAUDE.local.md, for notes of your own, counts as a CLAUDE.md](https://code.claude.com/docs/en/memory),
so adding one makes Claude Code stop reading AGENTS.md, unless
[a setting says otherwise](https://code.claude.com/docs/en/memory).

In OpenAI's **Codex**, AGENTS.md is the instruction file itself: Codex
[reads it before doing any work](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
one file per folder from the project's root down to the folder it works in. By
default it
[stops adding files once together they reach 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
about 32,000 characters.

**GitHub Copilot** reads AGENTS.md too,
[on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
and [in VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
It also reads `.github/copilot-instructions.md` and sends the model
[all relevant instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
In VS Code it
[finds a file in a subfolder as it works with files there](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

## Start small

Make the file as an AGENTS.md in the project's top folder and write it
yourself. Begin with the commands to install, build and test, then add the few
rules the agent cannot work out from the code, each with its reason. Leave out
overviews and descriptions of what each file does.

If a tool drafts the file for you, edit the draft:
[Anthropic](https://code.claude.com/docs/en/memory) and
[OpenAI](https://learn.chatgpt.com/docs/learn/best-practices) both say so. The
study above is a reason to cut it down to the commands and the few rules,
since generated files brought no gain and added cost.

When you change model, read the file again. In October 2026
[Anthropic's prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that some newer models are more responsive to the system prompt, the
instructions a tool sends ahead of your conversation. If you once added
emphasis to make an older model use a tool more often, a newer model may now
overdo it. The guide's fix is to soften aggressive wording. Where you
might have written "CRITICAL: You MUST use this tool when...", you can now
write "Use this tool when...".

Since 25 September 2026 Claude Code has
[a command that looks for instructions written for older models](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

The audit covers [AGENTS.md too](https://code.claude.com/docs/en/memory) and
changes nothing until you ask.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. The instruction file (this part)
3. Agents with a scope each
4. Skills that describe how something should be done
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. <span id="part-7"></span>Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
