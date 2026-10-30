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

1. Run `sh scripts/check-release.sh` from the project's top folder.
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
the changelog, then checks that git has no tag for the version yet. If a check
fails, it prints what is wrong and stops. If both pass, it prints OK.

The script checks the same two things in the same way every time. A sentence
in the SKILL.md such as "check that the changelog is up to date" leaves the
checking to the agent, which may look in the wrong place or decide that it
looks fine. A script has no such choice. It gives the same answer whatever the
day and whichever model runs it.

Anthropic's guide to writing skills gives the same advice. Where an operation
is [fragile and must be done the same way each time](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices),
use a ready-made script and run it as it stands. Such a script is more reliable
than code the agent writes on the spot.

The other half of the advice is not to overdo it. Codex's documentation says
to [prefer instructions over scripts unless you need deterministic behaviour or
outside tools](https://learn.chatgpt.com/docs/build-skills). Deterministic
means that the same input always gives the same result. Where the answer
depends on judgement, such as how to word a changelog entry, a few sentences
of instruction are the right tool.

The script's messages are written for the agent as well: "package.json says
1.5.0, but the changelog starts with 1.4.0" tells it what to fix before it
runs the script again, as the Agent Skills guide on scripts
[advises](https://agentskills.io/skill-creation/using-scripts).

The factory behind this site works on the same idea. When the site was built,
each work item got its own proof command, a command that passes or fails, as
[How this site was built by agents](/blog/how-this-site-was-built-by-agents/)
describes.

A script helps only when it runs. The agent has to choose the skill and follow
its first step. What must never be skipped therefore needs something outside
the skill, just as a rule in the instruction file did in part 2. Run the same
script among the project's automatic checks, and a release that skipped it is
caught there.

## A skill, an instruction or a request

Not everything belongs in a skill.

The instruction file holds what is true for every task in the project, such as
how to install and test it. It is read at every start, so it is kept short.

A skill holds a procedure for one kind of task that comes back, such as a
release, a review or a translation. Anthropic describes the sign as a section
of CLAUDE.md that has grown into a procedure rather than a fact. The skill's
instructions load only when it is used.

A script goes into the skill when part of the procedure has one right answer,
like the check in the example.

A job you do once needs none of this. Ask for it in the chat. A skill's name
and description are in view all the time, and in Claude Code each one adds to
the context on every turn, whether or not it is used, so a skill nobody needs
only takes up room.

## What a study shows

A study called [SkillsBench](https://arxiv.org/html/2602.12670v4) gave AI agents
87 tasks, each with tests that score the result. Every task was run with and
without a skill that experts had put together for that kind of task.

Averaged over many combinations of a model and a tool, the agents passed about
34 tasks in 100 without the skill and about 50 with it. Every combination
improved, but by very different amounts.

Three of the combinations also wrote skills for themselves before they solved
each task. With those skills they fell below the result with no skill at all,
in all three. The paper says the shortfall mixes the quality of the text with
other effects: the agent frequently never used the skill it had written, and in
some runs writing it used up the effort meant for the task.

The study's tasks are not your project. The paper itself concludes that
"Skill efficacy is therefore an empirical property of a specific agent stack
rather than a universal constant". So test your skill, as the next sections
describe, and read what an agent wrote for you before you rely on it.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since. All three follow the same Agent Skills format, so
the folder and its SKILL.md look the same in each. What differs is where the
folder is kept.

By default both you and the agent can start a skill. A release is different:
the developer wants to decide when it happens. Anthropic's example of such a
skill is a deploy, where you do not want Claude deciding to deploy because your
code looks ready. In each tool a skill can say that only a person may start
it.

In **Claude Code** a skill is a
[folder in `.claude/skills/`](https://code.claude.com/docs/en/skills) in the
project, which the whole team gets once it is committed, or in
`~/.claude/skills/` for all your projects. You start the release skill by
typing `/release`, and Claude can also load it by itself when your request
matches the description. With this line in the SKILL.md, under the description, it starts only when you
type the name:

```text
disable-model-invocation: true
```

In OpenAI's **Codex** a skill is a
[folder in `.agents/skills/`](https://learn.chatgpt.com/docs/build-skills).
Codex looks there in every directory from the one where you start up to the root of the
repository. You start a skill by typing `$` and its name, or by running
`/skills`, and Codex can also choose one from its description. To stop Codex
from choosing the skill by itself, add a file `agents/openai.yaml` to the
skill's folder with these lines:

```text
policy:
  allow_implicit_invocation: false
```

**GitHub Copilot** reads project skills from
[`.github/skills/`, `.claude/skills/` and `.agents/skills/`](https://docs.github.com/en/copilot/concepts/customizations/agent-skills).
They work in VS Code, in the Copilot CLI and in Copilot's cloud agent on
GitHub. In VS Code the skills you can start yourself show up when you
[type `/` in the chat](https://code.visualstudio.com/docs/agent-customization/agent-skills),
and the same `disable-model-invocation: true` line as in Claude Code makes a
skill start only when you do.

{% figure "skill-locations", "wide" %}

A skill kept in `.agents/skills/` is therefore found by Codex and Copilot,
while Claude Code looks in `.claude/skills/`. Both Claude Code and Codex follow
a link to a folder, so a link from `.claude/skills/release` to the same folder
saves you from keeping two copies.

## Check that it works

A skill that is never used does nothing. The first check is yours: start a
fresh chat and ask for the work in your own words, "Make a release". See
whether the agent picks the skill, then start it by name and see whether it
follows the steps. Making a skill available does not guarantee that the agent
chooses it for every relevant request, as VS Code's documentation puts it.

Claude Code has tools for the next check.
[`/skill-doctor`](https://code.claude.com/docs/en/skills) shows what each skill
costs in room and how often it is used, and points out the ones that were never
used.

Two more tools test how a skill behaves. A
[plugin](https://code.claude.com/docs/en/plugins/overview) is a package of
skills and other add-ons that you install in the tool. The skill-creator plugin
walks you through writing test cases for a skill, runs each in a fresh session
and compares the result with and without the skill.
[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) does the
same for skills that come in a plugin. It can fail an automatic check when the
score falls below a limit you set.

`claude plugin eval` runs each case three times by default, because "One run
of a non-deterministic agent tells you little". The script in the example needs
no repeats, since it gives the same answer every time. What varies is whether the agent picks the skill and runs it, and that is
what these tools measure.

Run the cases again when you move to a newer model. Anthropic lists catching
regressions when a new model is released as one use of the evals.

## When it goes wrong

If the agent does not use the skill, start it by name. When that works, the
fault is in the description: add the words you use when you ask for the work.
If the skill starts when it should not, make the description narrower or let
only a person start it.

If the agent skips steps late in a long conversation, put the most important
steps first in the SKILL.md, since Claude Code can keep only the start of a
skill when it shortens the conversation to make room.

If the script fails, read its message. Then test the script by hand, in a
state where it should fail: change the version in `package.json` without the
changelog and see that it stops. A check that has never failed is not yet
tested.

## Start small

Pick one job that you already ask the agent to do the same way, and that you
correct the same way each time. Do it once with the agent, and write down
what had to be right.

If you would rather not start from an empty file, ask the tool to draft the
skill. In Codex that is `$skill-creator`, and in the VS Code chat you can type
`/create-skill` followed by a description. Then read the draft: the study above
is a reason to cut it down to what the job needs.

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
