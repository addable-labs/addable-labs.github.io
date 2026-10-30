---
title: Give each AI agent a job of its own
description: The third part of the series "From AI chat to agentic work" — why an AI agent with one job and only the tools it needs is easier to review and to trust, how to write its description and what to do first.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: agents-with-a-scope-each
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/),
the second part of this series, the AI agent got a short text file to read at
every start. So far one agent has done all the work: it writes the code, runs
the tests and checks its own result.

This part is about handing a job to a second AI agent. An agent that has a job
of its own and only the tools the job needs is easier to review and easier to
trust.

## A reviewer that may only read

Take the made-up web app from part 2 again. The developer asks the AI agent to
add a phone number to the sign-up form. The agent changes the form, adds a new
migration (a file that changes the database) for the column and runs the
tests, which pass.

The developer wants a second reader before the change goes in. The first idea
is to ask the same agent to review its own work, but it still has the whole
conversation in front of it, with every choice it made along the way. A
reviewer that starts from nothing reads the code without that history.

Such a second agent is called a subagent: an AI agent that another agent, the
main agent, hands a task to. It works in a context of its own, which is the
text it keeps in view: its instructions, the task it was given and what it has
read. When the task is done it hands back a summary.

The reviewer in the example has one job. It reads the changed files and writes
its comments. It may not change a file, run a command or reach any other
system, so whatever it writes, the code stays as it was.

The developer reads the comments and decides what happens next.

{% figure "agent-handover", "wide" %}

## Four parts in the agent's file

The reviewer is described in a file, much as the instructions were in part 2.
This is how the file looks in Claude Code, which serves as the example here.
The other two tools use much the same parts, as the section on the tools
shows.

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

The `name` is what you and the main agent call it. The `description` is what
the main agent reads to decide whether to hand a task over. The `tools` line
lists what the agent may use. The text under the second line of dashes is the
agent's instructions, which it reads when it has been given a task.

There are more settings, such as a model of its own for the agent, but these
four are enough to begin with.

{% figure "agent-file" %}

## Write the description for the main agent

The `description` is the line the main agent reads when it decides whether to
hand a task over. It goes by the description of your request, the
descriptions of its agents and the situation at hand.
[Claude Code's documentation](https://code.claude.com/docs/en/sub-agents)
says so, and
[VS Code's documentation](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
adds what the line should hold: what the agent does and when to use it.

A description such as "Reviews code" says what the agent does but not when to
hand over. The description in the example says what it reviews, when to use it
and that it only reads. The "when" is the part the main agent needs most:
after code has changed and before the work is called done.

Claude Code also says that a phrase like "use proactively" in the description
encourages the main agent to hand over without being asked. Its advice is to
write descriptions that single out one agent.

Keep the description short. The main agent carries every description with it,
while the agent's instructions load only when the agent runs. For that reason
the documentation says to move detail out of the description and into the
instructions.

## Give it only the tools the job needs

The `tools` line is the second thing that makes the reviewer easy to trust. In
Claude Code it is an allowlist: the agent can use the tools on it and no
others. The reviewer has `Read`, `Grep` and `Glob`, the tools for reading and
searching, so it cannot edit a file.

Leave the line out and the agent inherits all the tools a subagent can have,
including the ones that change files. In
[GitHub's custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
it is the same: no `tools` line means all tools. A file without the line is
therefore the opposite of a limit.

Anthropic's own code reviewer example also gives the agent `Bash`, the tool
for running commands, so that it can run `git diff` and see what has changed.
A command can
[do more than read](https://code.claude.com/docs/en/how-claude-code-works),
so a reviewer that must be read-only can do without it. The price is that the
main agent has to name the changed files when it hands the task over.

Start with the fewest tools the job can be done with and add one when the
agent turns out to need it. VS Code's documentation advises
[read-only tools for security-sensitive work](https://code.visualstudio.com/docs/agent-customization/custom-agents)
and calls the aim the principle of least privilege.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since.

In **Claude Code** an agent is a Markdown file in `.claude/agents/` in the
project, or in `~/.claude/agents/` for all your projects. You can ask Claude
to write the file for you, and typing @ and the agent's name makes sure it runs
for that task. The tool also has a read-only agent of its own, Explore, which
it uses to search the code.

In OpenAI's **Codex** an agent is a TOML file in `.codex/agents/`, with a name,
a description and the agent's instructions. Codex
[hands over](https://learn.chatgpt.com/docs/agent-configuration/subagents)
when you ask or when the AGENTS.md says so, which makes the file from part 2
the place to say when. The file cannot set the sandbox, which limits what
the agent can touch, or the approvals, which decide when it must ask, because
both come from the session. Instructions in the file can ask an agent to avoid edits but do not create a
separate read-only sandbox, so choose the permission mode before you ask Codex
to hand over.

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

**GitHub Copilot** reads agent files from `.github/agents/`, with names that
end in `.agent.md`. In VS Code, if the file lists tools, only those tools are
available. The documentation's own first example of when to make a custom agent is to
restrict a code review agent to read-only tools. For the reviewer the line
reads:

```text
tools: ['read', 'search']
```

## Why a narrow agent is easier to trust

Everything the reviewer may do stands in a few lines that take a minute to
read: it may read and search, and it hands back text. When you read its comments you
do not also have to check what it changed, because it could not change
anything.

That is the difference from the instruction file in part 2. A line in that
file asks the agent to behave, while a tool the agent does not have cannot be
misused. What must never happen is still stopped outside the
model, as part 1 described. [Part 7](#part-7) of the series comes back to it.

The reviewer can still be wrong. VS Code's documentation puts it plainly:
separate contexts
["can surface different issues, but don't guarantee unbiased or correct conclusions"](https://code.visualstudio.com/docs/agents/run/subagents).
Read the comments and decide for yourself.

The factory behind this site splits its work in the same way. As we described
in [Why we run an agent-run software factory](/blog/why-we-run-an-agent-run-factory/),
a planner, a builder and a reviewer are different agents there. The review runs
in several lanes. When the site was rebuilt in September, the review found
two required fixes in work that another agent had done.

## When the agent hands over by itself

In October 2026 Anthropic's
[prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
says that its latest models hand work to subagents on their own. They can
recognise when a task would benefit from a specialist and do so without being
told to. In VS Code the main agent
[can also decide to hand over](https://code.visualstudio.com/docs/agents/run/subagents)
without being asked.

When the agent decides, the description is what it decides by. That makes the
description matter more than the instructions below it: the description
settles whether the agent is used at all, and the instructions matter only
once it is.

The new risk is the opposite one, that the main agent hands over too often.
The same guide warns that a model may start subagents to explore code when a
plain search would be faster and enough. Each subagent also makes requests of
its own, so the work costs more than the same job in one agent, as the
documentation for Claude Code, Codex and VS Code each says.

A line in the instruction file from part 2 can say when a hand-over is worth
it:

```text
- Hand a finished change to the reviewer. Do small edits and lookups yourself.
```

## When it goes wrong

If the main agent does not hand over, ask for the agent by name:

```text
Use the reviewer subagent to review the change in the sign-up form.
```

If that works but the agent is never picked on its own, the fault is in the
description. Say when to use the agent, as the example does.

If naming it does not work either, look at the file. Claude Code skips a file
that has no description. In a chat with VS Code's own agent, the name must be
written exactly as in the file, capitals included, and the Run Subagent tool
must be selected under Configure Tools.

If the main agent hands over too often, make the description narrower and add
the line from the last section to your instruction file.

If the comments are shallow, the reviewer has probably started without knowing
what to look at. It sees only the task it was given, so say in your request
which change to review and what the change is meant to do.

## Start small

Pick one job that you already do the same way each time and that does not
need the whole conversation. A review of a finished change is a good first
one, since it can be done by reading.

Ask the tool to write the agent file for you, then read it. Give it read tools
only, write its description as what it does and when to use it, and keep its
instructions to a few lines.

Try it on one finished change. Name the agent in your request the first time
and read the comments it hands back as you would read a colleague's.

Add a tool, or a second agent, only when the first one has proved useful. If
you move to a newer model, read the descriptions again, since the model
decides by them.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own (this part)
4. Skills that describe how something should be done
5. The Model Context Protocol — a common way for agents to reach other systems
6. Where the agent runs and who starts it
7. <span id="part-7"></span>Limits set in advance
8. What has changed along the way — the latest models need less steering than earlier ones, but still some
