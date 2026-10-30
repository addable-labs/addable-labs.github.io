---
title: Skills, for work that must come out the same every time
description: The fourth part of the series "From AI chat to agentic work" — what a skill is, when work belongs in a skill and when an instruction is enough, why what must be exact belongs in a script and what to do first.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: skills-for-repeatable-work
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/),
the second part of this series, the AI agent got a short text file to read at
every start. That file holds what is true for every task in the project.

This part is about work that comes back now and then and has to be done the
same way each time, such as making a release. Put that work in a skill: a
folder with a text file that says when and how to do it, and often a small
program, called a script, for the part that must be exact.

## A release that comes out differently each time

A made-up example: the web app from the earlier parts is released regularly.
A release means that the version number in `package.json` goes up, that the
changelog gets an entry for it, that the tests run and that the version is
tagged. The changelog is a file, CHANGELOG.md, that lists what changed in each
version. A tag is a name in git, such as `v1.4.0`, that marks the release.

The developer asks the agent: "Make a release." The agent does the work, but
not the same way twice. One time it leaves out the changelog entry. Another
time the changelog says 1.4.0 while `package.json` says 1.3.1.

Each time the developer corrects the agent in the chat and writes down the
same reminders as the time before.
[Anthropic's documentation](https://code.claude.com/docs/en/skills) names that
as the moment to make a skill: when you keep pasting the same instructions,
checklist or procedure into the chat.

The steps could go in the AGENTS.md from part 2, but the agent reads that file
at every start, on the days when nothing is released too. The text of a skill
is read only when the skill is used.

## A skill is a folder

A skill is a folder with a text file in it called SKILL.md. The file begins
with a `name` and a `description` and goes on with the instructions. Next to
it there can be a script, a short program that does one fixed thing, and other
files that the instructions refer to.

The agent does not read the whole folder at the start. It keeps only the name
and the description of each skill in view. When the task matches a
description, the agent reads the instructions, and it runs the script when the
instructions say so. The [Agent Skills standard](https://agentskills.io/home)
describes the same three steps.

{% figure "skill-folder", "wide" %}

This is the SKILL.md of the release skill in the example:

```text
---
name: release
description: Prepares a release of the web app. Checks that the version number and the changelog agree, then runs the tests. Use when the user asks for a release, a new version or a tag.
---

# Release

1. Run the script `scripts/check-release.sh` in this skill's folder with `sh`.
   The working directory must be the project's top folder.
2. If it prints a problem, fix that and run it again. Go on only when it
   prints OK.
3. Run `npm test`.
4. Tell the developer the version number and ask before you create the tag.
```

The `description` is the line the agent reads to decide whether to use the
skill, so it says what the skill does and when to use it. "Helps with
releases" gives the first but not the second, and the
[Agent Skills specification](https://agentskills.io/specification) gives
"Helps with PDFs." as its example of a poor description.

The instructions are short on purpose. Once a skill is loaded, its text stays
in the conversation and costs room on every turn, so Anthropic advises keeping
it concise.

## Put what must be exact in a script

The first step of the skill runs a script. This is the script:

```text
#!/bin/sh
# Checks that the version in package.json is the one the changelog
# describes, and that no tag exists for it yet.

version=$(node -p "require('./package.json').version")
latest=$(grep -m1 '^## ' CHANGELOG.md | cut -d' ' -f2)

if [ "$version" != "$latest" ]; then
  echo "package.json says $version, but the changelog starts with $latest." >&2
  exit 1
fi

if git rev-parse "v$version" >/dev/null 2>&1; then
  echo "Version $version is already tagged. Raise the version first." >&2
  exit 1
fi

echo "OK: $version is ready to release."
```

The script compares the version in `package.json` with the first heading of
the changelog, then checks that git has no tag for the version yet. It expects
the changelog's headings to look like `## 1.4.0`. If a check fails, it prints
what is wrong and stops. If both pass, it prints OK.

The script checks the same two things in the same way every time. A sentence
in the SKILL.md such as "check that the changelog is up to date" leaves the
checking to the agent, which may look in the wrong place or decide that it
looks fine. A script has no such choice: it gives the same answer whatever the
day and whichever model runs it.

The script's messages are written for the agent as well: "package.json says
1.5.0, but the changelog starts with 1.4.0" tells it what to fix before it
runs the script again, as the Agent Skills guide on scripts
[advises](https://agentskills.io/skill-creation/using-scripts).

Some of the work is better left to instructions. How to word the changelog
entry for 1.4.0 depends on judgement. A few sentences of instruction are the
right tool for that. The guides from Anthropic and OpenAI draw the same line: a
ready-made script for an operation that is
[fragile and must be done the same way each time](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
and otherwise
[instructions rather than scripts, unless you need deterministic behaviour or outside tools](https://learn.chatgpt.com/docs/build-skills).
Deterministic means that the same input always gives the same result.

A script helps only when it runs: the agent has to choose the skill and follow
its first step. What must never be skipped therefore needs a guard outside the
skill, as a rule in the instruction file did in part 2: a test in the project,
or a setting in the tool that blocks the step.

## A skill, an instruction or a request

Not everything belongs in a skill.

The instruction file holds what is true for every task in the project. It is
read at every start, so it is kept short.

A skill holds a procedure for one kind of task that comes back, such as a
release, a review or a translation.

A skill is not a second agent like the one in part 3. It is text that the agent
you are already talking to reads when the task needs it.

A job you do once needs none of this: ask for it in the chat. When you paste
the same checklist a second time, the job has come back and is worth writing
down as a skill.

## What a study shows

A study called [SkillsBench](https://arxiv.org/html/2602.12670v4) gave AI agents
87 tasks, each with tests that score the result. Every task was run with and
without a skill that experts had put together for that kind of task.

The agents were 18 combinations of a model and a tool. Averaged over all of
them, they passed about 34 tasks in 100 without the skill and about 50 with it.

Every combination passed more tasks with the skill, but the gain differed a
lot: from about 4 more tasks in 100 to about 26 more. The paper marks a range
of uncertainty, a 95% confidence interval, around each combination's pass
rates. It reports no test of whether a gain could be chance alone.

Skills did not help everywhere. On 13 of the 87 tasks the average result was
worse with the skill. In software engineering, the field of the release
example, the gain was about 12 tasks in 100 against about 17 for all tasks.

Three of the combinations also wrote skills for themselves before they solved
each task. With those skills they passed 8 to 12 fewer tasks in 100 than with
no skill at all. The paper says the shortfall mixes the quality of the text
with other effects: the agent frequently never used the skill it had written,
and in some runs writing it used up the effort meant for the task.

The study has limits. Its skills were picked for quality, which the paper calls
"an optimistic scenario". Its tasks ran in a terminal. It did not separate what
in a skill does the work: the paper names "steps, examples, code resources" as
the parts that future work has to isolate. It does not show that a script helps
more than instructions do.

The paper concludes that how much a skill helps depends on the particular
combination of model and tool. So test your skill, as the next sections
describe, and read what an agent wrote for you before you rely on it.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since. All three follow the same Agent Skills format, so
the folder and its SKILL.md look the same in each. What differs is where the
folder is kept.

In **Claude Code** a skill is a folder in `.claude/skills/` in the project, or
in `~/.claude/skills/` for all your projects. You start the release skill by
typing `/release`, and Claude can also load it by itself when your request
matches the description.

In OpenAI's **Codex** a skill is a folder in `.agents/skills/`. You start a
skill by typing `$` and its name, or by running `/skills`. Codex can also choose
one from its description.

**GitHub Copilot** reads project skills from
[`.github/skills/`, `.claude/skills/` and `.agents/skills/`](https://docs.github.com/en/copilot/concepts/customizations/agent-skills).
They work in VS Code, in the Copilot CLI and in Copilot's cloud agent on
GitHub. In VS Code the skills you can start yourself show up when you
[type `/` in the chat](https://code.visualstudio.com/docs/agent-customization/agent-skills).

{% figure "skill-locations", "wide" %}

A skill kept in `.agents/skills/` is therefore found by Codex and Copilot,
while Claude Code looks in `.claude/skills/`. To serve all three from one copy,
keep the skill in one folder and link to it from the other. Both Claude Code and
Codex follow a link to a folder. On macOS and Linux, these two lines, run in the
project's top folder, make the link:

```text
mkdir -p .claude/skills
ln -s ../../.agents/skills/release .claude/skills/release
```

## Check that it works

Start a fresh chat and first see that the tool found the skill. In Claude
Code, ask which skills are available. In Codex, run `/skills`. In VS Code, type
`/` in the chat and look for the skill in the list.

Then ask for the job in your own words, such as "Make a release". See whether
the agent picks the skill. If it does not, start the skill by name. Either way,
read what the agent did: whether it ran the script, followed the four steps and
asked before it created the tag. Making a skill available does not guarantee
that the agent chooses it for every relevant request, as VS Code's
documentation puts it.

Claude Code also has `/skill-doctor`, which shows what each skill costs in room
and how often it is used. An add-on called skill-creator runs test cases for a
skill with and without it.

## When it goes wrong

If the agent does not use the skill, start it by name. When that works, the
fault is in the description: add the words you use when you ask for the work.
If the skill starts when it should not, make the description narrower.

A job that you want to start yourself can say so. Anthropic's example of such a
skill is a deploy, where you do not want Claude deciding to deploy because your
code looks ready. In Claude Code and VS Code, this line at the top of the
SKILL.md, under the description, lets only you start the skill:

```text
disable-model-invocation: true
```

To stop Codex from choosing the skill by itself, add a file
`agents/openai.yaml` to the skill's folder with these lines:

```text
policy:
  allow_implicit_invocation: false
```

If `/release` is not recognised, the tool has not found the skill. Check that
the folder is in a place the tool reads and that the file is called SKILL.md.
In Claude Code, a skills folder you created while it was running needs
`/reload-skills`. In Codex, a skill that does not appear needs a restart.

If the agent skips steps late in a long conversation, put the most important
steps first in the SKILL.md. When Claude Code summarises a long conversation to
free room, it keeps only the start of each skill in use.

If the script reports a problem, read its message and fix what it names. If it
says OK when something is wrong, the fault is in the script: change the version
in `package.json` without the changelog, run it by hand and fix it until it
stops.

## Start small

Pick one job that you already ask the agent to do the same way, and that you
correct the same way each time. Do it once with the agent, and write down
what had to be right.

Name a folder for the skill after the job and put it in the place your tool
reads: `.claude/skills/release/` in Claude Code, `.agents/skills/release/` in
Codex or any of the three folders above in Copilot. Put a SKILL.md in it with
the steps you wrote down, a `name` and a `description` that says what the job is
and when to use it.

If you would rather not start from an empty file, ask the tool to draft the
skill. In Codex that is `$skill-creator`, and in the VS Code chat you can type
`/create-skill` followed by a description. Then read the draft and cut it down
to what the job needs. The study above is a reason to test it before you rely
on it.

Move the part that must be exact into a script, and run it by hand once where it
should pass and once where it should fail. Read any script before you let an
agent run it, also one that came from somebody else. VS Code's documentation
warns that skills can include scripts that run tools or reach other systems.

Try the skill on a real job in a fresh chat. Add the next skill only when this
one has proved useful.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own
4. Skills, for work that must come out the same every time (this part)
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. <span id="part-7"></span>Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
