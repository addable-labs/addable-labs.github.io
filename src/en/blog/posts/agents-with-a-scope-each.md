---
title: Give each AI agent a job of its own
description: The third part of the series "From AI chat to agentic work" — why an AI agent with one job and only the tools it needs is easier to review and to trust, how to write its description and what to do first.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, holds a short card with its job inside a dashed green frame around one folder of a project. Beside it lie a magnifying glass, its only tool, and the folder it works in. The project's other folders and files lie quiet around the frame.
date: 2026-10-31
category: ai-journey             # app-development | ai-journey
translationKey: agents-with-a-scope-each
draft: false                     # published — set true to keep it out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: true              # a person has read it
---

In [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/),
the second part of this series, the AI agent got a short text file to read at
every start. So far one agent has done all the work: it writes the code, runs
the tests and checks its own result.

This part is about handing a job to a second AI agent, one with a single job and
only the tools it needs. That can cost more than one agent: handing over adds
model usage and coordination, so
[VS Code's documentation](https://code.visualstudio.com/docs/agents/run/subagents)
says a direct request is usually enough for a quick lookup or a small edit. A
second agent is worth it for a job you repeat, such as having a finished change
reviewed.

## A reviewer that may only read

Take the made-up web app from part 2 again. The developer asks the AI agent to
add a phone number to the sign-up form. The agent changes the form, adds a new
migration (a file that changes the database) for the column and runs the
tests, which pass.

The developer wants a second opinion before the change goes in. Asking the same
agent to review its own work is the obvious route. It is the weaker one: the
agent has the whole conversation in front of it, with every choice it made along
the way, so it reads its change through its own reasoning and assumptions.

The other route is a separate reviewer, a subagent: an AI agent that another
agent, the main agent, hands a task to. It works in a context of its own, which
is the text it keeps in view: its instructions, the task it was given and what
it has read. When the task is done it hands back a summary.

A reviewer that starts fresh does not see the conversation, so it reads the code
as a colleague who did not take part in writing it would. The benefit is that it
does not share the main agent's assumptions. The cost is that it does not know
what the change is for, so your request should name the change and its purpose.

In Claude Code a subagent starts with the same instruction files as the main
agent, so the rules from part 2 reach it.

The reviewer in the example has one job. It reads the changed files the main
agent names and writes its comments. It may not change a file, run a command
or reach any other system, so whatever it writes, the code stays as it was.

The developer reads the comments and decides what happens next.

{% figure "agent-handover", "wide" %}

The reviewer can be wrong. VS Code's documentation puts it plainly: separate
contexts "can surface different issues, but don't guarantee unbiased or correct
conclusions".

In the factory behind this site, the planner, the builder and the reviewer are
different agents too, as we described in
[Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/).
When the site was rebuilt in September, the review found two required fixes in
work that another agent had done.

## Four parts in the subagent's file

The reviewer is described in a file, much as the instructions were in
[The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/).
This is how the file looks in Claude Code, which serves as the example here.
Codex and GitHub Copilot use the same idea with other file names. They are shown
further down, in the section on the tools.

```text
---
name: reviewer
description: Reviews a finished change in the web app for bugs and missing tests. Use it after the main agent has changed code and before the work is called done. It only reads and writes comments.
tools: Read, Grep, Glob
---

You review changes in this web app. Read the changed files and the tests
next to them.

Write your comments as a list, most serious first. For each one, give the
file, the line and what is wrong.
```

The part at the top, between the two lines of dashes, is called frontmatter. It
holds the subagent's settings. The `name` is what you and the main agent call
the subagent. The `description` is what the main agent reads to decide whether
to hand a task over.

The `tools` line lists what tools the subagent may use. Below the frontmatter
come the subagent's instructions, which it reads when it has been given a task.

{% figure "agent-file" %}

The frontmatter may contain other configurations, such as a model of its own for
the subagent, but these four are enough to begin with.

When you set a model, a good rule of thumb is to match it to how hard the job
is. A job that needs judgement, such as reviewing code, a plan or a design, gets
a strong model, while a clear job, such as writing code from a precise
description, can go to a small, fast one. Used the other way round, a strong
model costs more than an easy job needs. A small one may give a shallow answer
to a hard job.

The
[effort level](https://code.claude.com/docs/en/model-config#adjust-effort-level)
is a second setting, which controls how much the model reasons. Lower effort is
faster and cheaper for straightforward tasks. Higher effort gives deeper
reasoning for complex ones. Claude Code, Codex and Copilot in VS Code can all
set the model and the effort level in the subagent's file.

## Write the description for the main agent

When the main agent decides whether to hand a task over, it weighs three things:
what you ask for, what each subagent's description says and the situation at the
moment, as
[Claude Code's documentation](https://code.claude.com/docs/en/sub-agents)
describes it.

[VS Code's documentation](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
names two things the description should hold: what the subagent does and when to
use it. A description such as "Reviews code" says only the first. The one in the
example says what it reviews, when to use it and that it only reads. The "when"
is the part the main agent needs most: after code has changed and before the
work is called done.

Keep the description short. In Claude Code the main agent carries every
description with it, while the subagent's instructions load only when the
subagent runs. Put the details in the instructions.

## Give it only the tools the job needs

In Claude Code the `tools` line is an allowlist, which means the subagent can
use the tools on it and no others. The reviewer has `Read`, `Grep` and `Glob`,
the tools for reading and searching, so it
[cannot edit a file](https://code.claude.com/docs/en/best-practices).

Leave the line out and the subagent gets all the tools a subagent can have,
including the ones that change files. In
[GitHub's custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
it is the same: no `tools` line means all tools.

The code reviewer example in Claude Code's documentation also gives the subagent
`Bash`, the tool for running commands, so that it can run `git diff`, the
command that shows what has changed. A command can
[do more than read](https://code.claude.com/docs/en/how-claude-code-works), so a
reviewer that must be read-only should not have the Bash tool. Without `Bash`
the main agent should name the changed files when it hands the task over, as it
does in the example.

The rule of thumb is to start with the fewest tools the job can be done with and
add one when the subagent turns out to need it. VS Code's documentation advises
[read-only tools for security-sensitive work](https://code.visualstudio.com/docs/agent-customization/custom-agents)
and says that the tool list of an agent shared in a repository should follow the
principle of least privilege, which means giving an agent only the access its
job needs.

A line in the instruction file from part 2 asks an agent to behave, while a tool
it does not have cannot be misused: the `tools` line is a limit outside the
model, of the kind part 1 described. Permissions decide what an agent may change
and when it must ask first. They are a separate setting, which [part 7](#part-7)
of the series comes back to.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since.

In **Claude Code** a subagent is a Markdown file in `.claude/agents/` in the
project, or in `~/.claude/agents/` for all your projects.

In OpenAI's **Codex** a subagent is a
[TOML file](https://learn.chatgpt.com/docs/agent-configuration/subagents) in
`.codex/agents/`. TOML is a plain text format for settings. This file holds a
name, a description and the subagent's instructions.

The file can narrow the subagent with settings: the documentation lists some,
such as `features.shell_tool`, that you set to `false` to reduce what a custom
agent can do. The line "Do not edit files" in the example below is a request,
not a limit.

```text
name = "reviewer"
description = "Reviews a finished change in the web app for bugs and missing tests. Use it after the main agent has changed code and before the work is called done."
developer_instructions = """
You review changes in this web app. Do not edit files.
Read the changed files and the tests next to them.
Write your comments as a list, most serious first. For each one, give the
file, the line and what is wrong.
"""
```

**GitHub Copilot** reads agent files from `.github/agents/`, with names that end
in `.agent.md` or `.md`. In VS Code, if the file lists tools, only those tools
are available. The reviewer's file is `.github/agents/reviewer.agent.md` and has
this line in its frontmatter:

```text
tools: ['read', 'search']
```

## When the main agent hands over by itself

In October 2026 Anthropic's
[prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that its latest models hand work to subagents on their own. They can
recognise when a task would benefit from a specialist and do so without being
told to.

The other tools decide in other ways. In VS Code the main agent can decide to
hand over without being asked. Copilot's cloud agent on GitHub.com can use a
custom agent on its own, based on the task, unless the custom agent's file
switches that off.

On your own computer, Codex hands over when you ask or when instructions such as
the AGENTS.md say so. Codex's documentation calls the description guidance for people on when Codex
should use the subagent.

Handing over on its own brings a risk: the main agent may hand over too often.
Anthropic's guide also warns that a model may start subagents to explore code
when a plain search would be faster and enough. That adds to the cost described
at the start of this part.

A line in the instruction file from part 2 can say when a hand-over is worth
it:

```text
- Hand a finished change to the reviewer: it reads the change without your history.
- Do small edits and lookups yourself: a hand-over costs more than it saves.
```

## Troubleshooting

Four things can go wrong:

- The main agent never hands over on its own.
- Nothing happens when you name the subagent in your request.
- The main agent hands over too often.
- The reviewer's comments are shallow.

If the main agent never hands over on its own, ask for the subagent by name:

```text
Use the reviewer subagent to review the change in the sign-up form.
```

In Claude Code this usually works. Typing @ and the subagent's name makes sure
the subagent runs for that task.

If naming the subagent works but the main agent never picks it on its own, start
with the description: say when the subagent should be used, as the example does.
In Claude Code a phrase like "use proactively" in the description encourages the
main agent to hand over without being asked. Claude Code's advice is to write
descriptions that single out one subagent.

In Copilot, a second cause is the line `disable-model-invocation: true` in the
file, which stops the main agent from picking the subagent on its own.

If naming the subagent does not work either, look at the file. Claude Code skips
a file that has no description. In VS Code the name must be written exactly as
in the file, capitals included. The Run Subagent tool must also be selected
under Configure Tools.

When the main agent hands over too often, make the description narrower and add
the line from the last section to your instruction file.

When the comments are shallow, the reviewer has probably started without knowing
what to look at. Say in your request which change to review and what the change
is meant to do, as the first section said.

## Start small

Pick one job that you already do the same way each time and that does not
need the whole conversation. A review of a finished change is a good first
one, since it can be done by reading.

Ask the tool to write the subagent's file for you and put it in the folder for
your tool, which the section on the tools names. Then read it and cut it down:
give the subagent read tools only, write its description as what it does and
when to use it, and keep its instructions to a few lines.

Try it on one finished change. Name the subagent in your request the first time
and read the comments it hands back as you would read a colleague's.

Add a tool, or another subagent, only when the first one has proved useful.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own (this part)
4. [Skills, for work that must be done the same way every time](/blog/skills-for-repeatable-work/)
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. <span id="part-7"></span>Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
