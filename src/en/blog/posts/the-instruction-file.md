---
title: The instruction file, the first thing an AI agent reads
description: The second part of the series "From AI chat to agentic work" — whether to make an instruction file, what to write first, how to keep it useful and how one file can serve several tools.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: false                     # published — set true to keep it out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: true              # a person has read it
---

In [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/), the
first part of this series, the instructions were one of the five parts of an
AI agent: a text file in the project that the agent reads every time it
starts. We showed a short one for a made-up web app.

If you use an AI agent in a project, make one. The agent can read your code
but cannot guess how the project is installed and tested. A few lines in the
file tell it.

## A made-up web app and its file

A made-up example: a developer starts a web app with a database and tests,
and has an AI agent to help. The agent knows nothing about the project, so on
the first day the developer writes down what a new colleague would need to
know, and nothing more. The result is a plain text file called AGENTS.md in
the project's top folder (the root):

```text
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
to install the dependencies and how to test it. The rules are the few things that
cannot be read out of the code. One keeps the agent out of the `migrations/`
folder, where the changes to the database are kept as files called
migrations. Another keeps new outside code, called packages, from entering
the project unnoticed.

The file is short on purpose. A long file takes up more of the room the agent
has to work in and is followed less closely. That is why Anthropic suggests
[under 200 lines](https://code.claude.com/docs/en/memory) and OpenAI prefers
[a short, accurate file](https://learn.chatgpt.com/docs/learn/best-practices)
to a long one full of vague rules.

A week later the database needs a new column. The file says to change nothing
in `migrations/`, but not why and not what to do instead, so the agent leaves
a loose file of database commands in the root of the project. The developer
reads through the agent's changes, finds the file and tells the agent to put
the change in a new migration.

Then the developer rewrites the rule so that it
gives both the reason and the way out: those files have already run in
production, which means on the live database, so the change goes in a new
migration. A rule with its reason helps in cases nobody thought of: when the
instructions explain why a convention exists, the agent
[makes better decisions in unusual cases](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

Twice in the next two weeks, the agent runs all the tests after a change of a
single line, although one test file would do. The second time, the developer
adds a line on how to run one test file.

By then the file has also grown a section on what each file in the project
does. It looks helpful, but it fails
[the test Anthropic suggests](https://code.claude.com/docs/en/best-practices)
for what to write down: could the agent find it by reading the code, and
would it actually go and look? If both answers are yes, the line is left out.
The developer cuts the section.

{% figure "file-before-after", "wide" %}

Finally, the tests for the part of the app that runs in the browser are not
part of `npm test`. The `web/` folder gets an AGENTS.md of its own, with one
line that adds them:

```text
- Also run `npm run test:web` before you say you are done.
```

That makes two files, two of the levels part 1 described: one for the whole
project and one for a single folder. When the agent works in `web/`, it reads
the root file first and the `web/` file after it. The closest file has the
last word, as part 1 described: in Codex, for example, files closer to the
folder it works in
[override earlier guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

{% figure "file-hierarchy", "wide" %}

The rule about `migrations/` stays in the root file, because it applies to the
whole project. The root file now looks like this:

```text
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

There is little evidence that an instruction file makes the results better.
[A study from ETH Zurich](https://arxiv.org/html/2602.11988v3) had AI agents
solve real-world tasks with and without an instruction file. Files the
developers had written themselves raised the share of tasks solved by 2.4
percentage points on average, for example from 60 tasks in 100 to about 62.

That is a small gain that the study cannot tell from chance. Researchers call
a difference "statistically significant" when it would be unlikely to arise by
chance alone, so the word does not mean that the difference is large. Compared
with no file, none of the differences in the share of tasks solved was
significant. Files the developers wrote did significantly better than files a
language model wrote.

Files written by a language model lowered the share slightly on average, and
the researchers suggest leaving out such files for the time being. Files of
both kinds made the runs more expensive, by about a fifth on average. Those
rises were significant.

The study also looked at overviews of the project, like the section the
developer cut. The researchers found that such overviews, although popular,
did not help in projects that already had documentation.

With all other documentation removed, the researchers found that files written
by a language model "can act as effective overviews when no documentation is
present". Such files raised the share of tasks solved by 2.7 percentage points
on average. The study reports no test of whether that rise is significant, and
Claude Code was left out for cost reasons.

[Another, smaller study](https://arxiv.org/abs/2601.20404) looked at 124 pull
requests, which are proposed changes to a project's code. The typical run with
an AGENTS.md took more than a quarter less time.

The study did not measure whether the answers were better. The researchers
checked 50 of the tasks and found real code changes, not aborted runs. So the
study shows that the agent finished faster, not that the answers were better or
worse. It measured no cost in money, so it cannot be set against the first
study.

The researchers behind the first study find a file useful for a project's
non-standard practices and advise putting in only what the agent cannot get
from the code. That fits the file in the example: the
commands and the few rules are what the agent cannot work out itself. The
studies give no reason to add more.

## When the agent gets something wrong

If the file says nothing about the mistake, tell the agent and carry on, since
one slip may be a one-off. When it makes the same mistake a second time,
add a line to the file, as the developer did with the single test file.

Sometimes the line is already there and the agent still goes wrong. First
check that the tool reads the file at all: Claude Code, whose own file is
CLAUDE.md, reads AGENTS.md by default only where there is no CLAUDE.md. To see
whether it read yours, run `/memory` in Claude Code and look for AGENTS.md in
the list. The section on the tools below says what each tool reads.

Then look at the line. One that gives its reason and a way out works better, like the `migrations/` rule after its rewrite. The
developer did not wait for a second mistake there, because the fault was in
the line: it lacked its reason.

The agent tries to follow the file, but even a good line works most of the
time, not every time.
A rule that must never be broken therefore needs something outside the file.
One way is a test in the project that fails when the rule is broken: for
`migrations/`, a test that fails when a migration already in the project is
changed. The agent can write the test if you ask it to.

The other way is a setting in the tool that blocks the change. In Claude Code such a setting is a
so-called [hook](https://code.claude.com/docs/en/hooks-guide), a command the
tool runs by itself. Anthropic's own example is a hook that blocks edits to the
migrations folder. You can ask Claude to write it for you.

What must never happen is stopped outside the model, as part 1 described.
[Part 7](#part-7) of the series comes back to it.

## One file for three tools

With more than one tool in the project, one AGENTS.md in the top folder is
enough if each tool finds it. That fits VS Code's documentation, which advises
a shared format that all the tools support when possible. We
describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since.

The file in the top folder is read at every start, as part 1 said.

{% figure "which-tool-reads-what", "wide" %}

**Claude Code** has CLAUDE.md as its own instruction file and by default reads
AGENTS.md only where there is no CLAUDE.md.
Where it does read AGENTS.md, it reads one in a subfolder when it opens a file
there. If the project has a CLAUDE.md, that file can pull in the AGENTS.md
with a single line, so that the AGENTS.md stays the one file every tool
shares:

```text
@AGENTS.md
```

For this rule a CLAUDE.local.md, a file for notes of your own, counts as a
CLAUDE.md. Adding one to a project that has only an AGENTS.md therefore makes
Claude Code stop reading the AGENTS.md, unless a setting says otherwise.

In OpenAI's **Codex**, AGENTS.md is the instruction file itself: Codex reads it before doing any
work, one file per folder from the project's root down to the folder it works in. By
default it stops adding files once together they reach 32 KiB, about 32,000
characters.

**GitHub Copilot** reads AGENTS.md too,
[on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
and in VS Code. It also reads `.github/copilot-instructions.md` and sends the
model all relevant instructions. In VS Code it finds a file in a subfolder as
it works with files there.

## Start small

To start, create a plain text file called AGENTS.md in the project's top
folder. Begin with the commands to install, build and test, then add the few
rules the agent cannot work out from the code, each with its reason. Leave out
overviews and descriptions of what each file does.

You can write the file yourself or ask the agent to draft it. If a tool drafts
it, edit the draft: Anthropic and OpenAI both say so. The
study above is a reason to cut the draft down to the commands and the few
rules, since generated files added cost and brought no clear gain where
documentation existed.

When you move to a newer model, read the file again. In October 2026
Anthropic's [prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that two of the models it names may use a tool too often if emphasis such
as MUST in capitals was added to make an older model use it more. The guide's
fix is to soften aggressive wording.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. The instruction file (this part)
3. [Give each AI agent a job of its own](/blog/agents-with-a-scope-each/)
4. [Skills, for work that must be done the same way every time](/blog/skills-for-repeatable-work/)
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. <span id="part-7"></span>Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
