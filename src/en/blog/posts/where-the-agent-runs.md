---
title: Where the AI agent runs and who starts it
description: The sixth part of the series "From AI chat to agentic work" — the same AI agent in five places, from the editor to a schedule and the vendor's cloud, what goes along to a run in the cloud, what changes when nobody is watching and what to do first.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: where-the-agent-runs
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In part 5 of this series, the AI agent got a way to reach systems outside your
files, such as an issue tracker. In every part so far, you have started the
agent yourself, in a chat or in the editor, and watched what it did.

This part is about the same agent working where nobody watches: in the checks on
a pull request, on a schedule, or on the vendor's computers instead of yours. A
pull request is a proposed change that others review before it is added.

[From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/), the first
part, called the program that runs an agent the harness, and said that it can
run in an editor, in a terminal, in a CI job or on a schedule. CI, short for
continuous integration, is a service that runs checks and jobs when something
happens in a project, such as a new pull request.

The harness is the same in each of those places. What changes is where it runs,
who starts it and who is watching. Nobody watching also means nobody to answer
the agent's questions, so a good first job to run on its own is one that can
only read.

## A summary nobody has to ask for

A made-up example: the developer of the web app from the earlier parts wants a
short summary of yesterday's commits ready every morning. A commit is one saved
set of changes in the project's history. Today the developer opens the agent in
the editor, asks for the summary and pastes it into the team's chat.

The job changes nothing in the project. It only reads the history and writes a
few lines, which makes it a safe first job to move out of the editor.

## The same harness in five places

Part 1 named four places. A fifth belongs with them: the vendor's own cloud,
where you start the agent and it runs on the vendor's computers.

| Where it runs | Who starts it | Who is watching |
| --- | --- | --- |
| In the editor | You | You, beside it |
| In the terminal | You | You |
| In CI, when something happens | An event, such as a comment on a pull request | Nobody; you read the result later |
| On a schedule | The clock | Nobody |
| In the vendor's cloud | You, from a browser or a phone | You, or nobody: it keeps running if you close your laptop |

Anthropic's
[documentation](https://code.claude.com/docs/en/how-claude-code-works) says that
the interface determines how you see and interact with the agent, "but the
underlying agentic loop is identical".

VS Code's [documentation](https://code.visualstudio.com/docs/agents/overview)
says that where tools run and where the model is hosted are separate choices: an
agent can edit files on your machine while it sends its requests to a hosted
model. What moves from place to place is the harness, with the files and tools
it works on.

## What goes along to a run in the cloud

A run in CI or in the vendor's cloud starts from a copy of your repository, not
from your computer. Anthropic's
[documentation](https://code.claude.com/docs/en/cloud-environments) is plain
about it: "Anything you commit to the repo is available. Anything you've
installed or configured only on your own machine isn't available in the
session."

That sorts the files from the earlier parts. In Claude Code's cloud sessions,
the repository's instruction file from part 2, its skills from part 4 and its
MCP file from part 5 go along, because they are part of the copy. The versions
in your home folder, the servers you added only for yourself and sign-ins that
need a browser stay behind. The documentation's advice is to commit your own
configuration to the repository.

{% figure "what-goes-along" %}

OpenAI's
[documentation](https://learn.chatgpt.com/docs/environments/cloud-environments)
says the same of skills: the ones stored in the repository are available in
cloud tasks, and personal skills from your computer are not synced. GitHub's
cloud sessions have one way in for personal files: you can bring your personal
instructions, skills and custom agents from a
[dotfiles repository](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes),
which is a repository of its own.

## When nobody is watching

In the editor, the agent asks before it does something risky and you answer. A
job that starts from the clock or from a comment has nobody to ask. What happens
to the question depends on the tool, and in all three a job can do only what was
allowed before it started.

Claude Code's [`claude -p`](https://code.claude.com/docs/en/headless), its
non-interactive mode, starts in Manual mode, the mode that asks before most
actions. With nobody there to answer, it
[denies](https://code.claude.com/docs/en/permission-modes) any call that needs
approval unless a rule allows it. A run that Codex starts with `codex exec` can
only read, unless you
[allow more](https://learn.chatgpt.com/docs/non-interactive-mode).

GitHub's
[page for scripted Copilot runs](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
says that requests which still need approval are denied in unattended runs. It
advises giving Copilot only the tools and access the task needs, with
`--allow-tool`, and `--no-ask-user` stops it from asking questions.

So what the agent may do is decided in the job's file, before the run. The files
in the next section show where, and [part 7](#part-7) goes through the limits.

Claude Code has a second way to answer the question. In auto mode, a second
model, called the classifier, reviews the agent's actions instead of you. Since
version 2.1.283, interactive terminal and VS Code sessions start in auto mode,
and so does a scheduled task in Anthropic's cloud, unless auto mode is
unavailable. A `claude -p` run starts in Manual mode, since version 2.1.302.

Anthropic gave a reason for auto mode in a
[post](https://claude.com/resources/articles/auto-mode-default-in-claude-code)
of its own, dated 7 August 2026. It says that users approve 97% of permission
prompts in Claude Code, and reads that as many clicking through without
reviewing each command.

In the same post, 1,053 paid professional testers each had one permission prompt
swapped for a clearly dangerous command partway through a session. The testers
caught 13.6% of the dangerous commands, and auto mode caught 89%. The testers
worked in a test environment, not in their own codebases, and knew they were
being evaluated.

This is Anthropic's study of Anthropic's feature, so read it as the vendor's
evidence. Our own conclusion from it is smaller: a question that people answer
without reading is a weak guard, so limits set in advance count for more than
answers given on the spot.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since. Each tool has a file for the same job: a summary of
yesterday's commits, every morning, that can only read.

In **Claude Code**, you use the
[VS Code extension](https://code.claude.com/docs/en/vs-code) in the editor and
the `claude` command in the terminal. The
[GitHub Action](https://code.claude.com/docs/en/github-actions) runs it in CI,
either when someone mentions `@claude` in a comment or, with a prompt, on any
GitHub event.
[`claude --cloud`](https://code.claude.com/docs/en/claude-code-on-the-web)
starts a session on Anthropic's computers. For a schedule there are also
[cloud scheduled tasks](https://code.claude.com/docs/en/routines), which
Anthropic describes as a research preview. This file is Anthropic's own example
with the issues left out:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
jobs:
  summary:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          claude_args: |
            --allowedTools "mcp__github__list_commits"
```

In OpenAI's **Codex**, you use the
[IDE extension](https://learn.chatgpt.com/docs/codex/ide) in the editor and
[`codex`](https://learn.chatgpt.com/docs/codex/cli) in the terminal. The
[Codex action](https://learn.chatgpt.com/docs/github-action) runs it in CI.
[Scheduled tasks](https://learn.chatgpt.com/docs/automations) live in the
ChatGPT desktop app and on the web.
[Codex Cloud](https://learn.chatgpt.com/docs/cloud) gives each task a workspace
of its own, and the task can keep working while your computer sleeps. The
action's page shows only an example that starts on a pull request, so this file
is assembled from the action's list of settings and GitHub's own syntax for a
schedule:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
jobs:
  summary:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: openai/codex-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          sandbox: read-only
          output-file: summary.md
      - run: cat summary.md >> "$GITHUB_STEP_SUMMARY"
```

**GitHub Copilot** works in the Chat view or the Agents window in VS Code, and
[`copilot`](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-cli)
runs in the terminal. In CI you can run `copilot -p` in a workflow, as the file
below does, but GitHub
[recommends](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions)
GitHub Agentic Workflows for most automation. Copilot's automations run the
cloud agent on a schedule or when something happens in a repository, in private
and internal repositories only.

GitHub changed its cloud experience on 28 October 2026. For users with a paid
plan, subject to the organisation's policies, Copilot can run a cloud session in
a
[cloud sandbox](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github),
an isolated Linux environment that GitHub sets up for the session, or as a job
in GitHub Actions. Where you can choose between the two, the cloud sandbox is
the default, and GitHub says that defaults vary by workflow, so check the
environment before you start a session. The file below is shortened from
GitHub's own daily summary:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
permissions:
  contents: read
jobs:
  summary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
      - run: npm install -g @github/copilot
      - env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
        run: |
          copilot -p "Summarise yesterday's commits in ten lines. Write them to summary.md" --allow-tool='shell(git:*)' --allow-tool=write --no-ask-user
          cat summary.md >> "$GITHUB_STEP_SUMMARY"
```

The three files have the same shape. The `schedule` line is the trigger: the
clock starts the job, so nobody is there to answer a question. The `cron` line,
a standard way to write a schedule, says when: here nine o'clock every morning,
in UTC.

The `permissions` lines say what the job's GitHub token may do: read the
repository. The extra `id-token: write` in Claude's file is for the action's
sign-in. The settings under the agent's name say what the agent may do: one tool
for Claude Code, `read-only` for Codex and two allowed tools for Copilot.

We have checked that each file is valid YAML, but we have not run them. Running
them takes a key or a token for the tool and a repository of our own, so read
each file against the tool's page before you use it.

## The result comes back for you to read

A read-only job leaves its summary on the run's page, and you read it there. A
cloud run that changes code leaves a branch instead. Claude Code's scheduled
tasks push to a branch with the prefix `claude/`, unless your prompt says
otherwise. Copilot's cloud agent pushes only to a new branch with the prefix
`copilot/`, and a draft pull request from it
["must be reviewed and merged by a human"](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/risks-and-mitigations).
In Codex Cloud, you review the changes and the test results, and then commit or
open a pull request when you are ready.

When nobody watches the run, the watching happens afterwards: you read what came
back before it counts.

The factory works that way too. Its agents run on one computer, and each is
[started as a session](/blog/why-we-run-an-agent-run-factory/) when a step of
the build needs it. The agents push to GitHub themselves: a change goes live
only once the gates pass, and a text only once we have read it. If a session
dies halfway, the bead it was working on, the factory's unit of work, stays open
for the next one.

## See what a run used

Each tool shows its usage somewhere, in different units. In Claude Code,
[`/usage`](https://code.claude.com/docs/en/costs) shows the usage of the current
session, and a scheduled task draws on the same subscription usage as your own
sessions. Codex has `/status` for the session and `/usage` for the account, both
in [tokens](https://learn.chatgpt.com/docs/developer-commands). GitHub counts
[AI credits](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-ai-usage),
which it bases on the number of tokens, and says that you generally cannot trace
the credits to a single prompt or session.

A run in CI uses two things: the tool's usage and GitHub Actions minutes.
Anthropic's page for the action lists both.

## Check that it works

Test the prompt in a regular chat first, as OpenAI's page on
[scheduled tasks](https://learn.chatgpt.com/docs/automations) advises, and add
[`workflow_dispatch:`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
under `on:` so that you can start the job by hand with the Run workflow button
on GitHub. Read the answer against `git log`: it should list yesterday's commits
and nothing that is not there.

Then test the limit, as in part 5. Change the prompt to ask the agent to add a
line to the README, run the job by hand and check that no change reaches the
repository.

## Troubleshooting

Five things can go wrong:

- The schedule does not run.
- The job succeeds and has done nothing.
- The job runs for too long.
- The cloud run cannot reach what it needs.
- CI does not run on the agent's own commits.

If the schedule does not run, look at where it lives. A schedule on your
computer needs the computer on: Anthropic's
[table of scheduling options](https://code.claude.com/docs/en/scheduled-tasks)
says so for desktop tasks and `/loop`, and OpenAI's page says to keep the
computer on and the ChatGPT desktop app running when a task needs local files. A
cloud scheduled task skips runs while its GitHub connection is missing or
expired, and turns itself off after 72 hours without one.

GitHub runs scheduled workflows only from the default branch, and in a public
repository it turns them off after 60 days without activity. Look at the list of
runs after the first few days.

If the job succeeds and has done nothing, a question may have been denied with
nobody to answer it. In a workflow, a plain-text prompt to Claude has "no shell
or GitHub API access until you grant the tools the prompt needs". Open the run's
log, find the calls that were denied and allow exactly those.

If the job runs for too long, cap it. Anthropic advises `--max-turns` to limit
the iterations, timeouts on the whole workflow and GitHub's concurrency controls
to limit parallel runs.

If the cloud run cannot reach what it needs, check the list of network addresses
it may use. In Claude Code's cloud environments the default level allows package
registries and other domains on an allowlist, and GitHub's cloud sessions have
an allowlist of their own. Add the host the run needs to the list, as narrowly
as you can. For Copilot, start a new session afterwards, because a change to the
list does not reach sessions that are already running.

If CI does not run on the agent's own commits, GitHub does not start workflows
for commits made with the built-in token. Anthropic's page says to let the
action sign in as the Claude GitHub App instead. Copilot's cloud agent waits
until someone with write access clicks Approve and run workflows.

## Advanced

The basics above are enough to start. Five things for later:

- Signing in from a workflow without a stored key, through workload identity
  federation, which Claude's action supports.
- Your own GitHub App, so that the job has only the permissions it uses.
- Running on your own runners instead of GitHub's.
- [GitHub Agentic Workflows](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/):
  automation written in Markdown, which runs with read-only permissions by
  default.
- [OpenTelemetry](https://code.claude.com/docs/en/monitoring-usage), a standard
  way to export usage data, which Claude Code supports.

## Start small

Pick one job that you already ask the agent for by hand, again and again, and
that you can judge by reading its result. Anthropic describes the work its
scheduled tasks suit as "unattended, repeatable, and tied to a clear outcome". A
summary fits that description, and so does a check that the changelog was
updated.

Run it first as a job that can only read. Add a tool that writes only when you
need one, and then keep the permissions as narrow as they were. That is our own
advice.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own
4. Skills, for work that must be done the same every time
5. MCP, how an AI agent reaches your other systems
6. Where the AI agent runs and who starts it (this part)
7. <span id="part-7"></span>Set the limits in advance
8. Less steering for every model
