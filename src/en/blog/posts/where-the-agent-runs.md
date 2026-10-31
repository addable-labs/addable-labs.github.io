---
title: Where the AI agent runs and who starts it
description: The sixth part of the series "From AI chat to agentic work" — the same AI agent in five places, from the editor to a schedule and the vendor's cloud, what goes along to a run in the cloud, and a first job that runs by itself every morning.
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
files, such as an issue tracker. So far you have started the agent yourself, in
a chat or in the editor, and watched what it did.

This part is about the same agent working where nobody watches: started by a
schedule or by something that happens in GitHub, or running on the vendor's
computers instead of yours. Part 1,
[From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/), said that
an agent can run in an editor, in a terminal, in a CI job or on a schedule. CI,
short for continuous integration, is a service that runs checks and jobs when
something happens in a project, such as a new pull request: a proposed change
that others review before it is added.

Nobody watching also means nobody to answer the agent's questions, so a good
first job to run on its own is one that can only read.

## A summary nobody has to ask for

A made-up example: the developer of the web app from the earlier parts wants a
short summary of yesterday's commits ready every morning. A commit is one saved
set of changes in the project's history. Today the developer opens the agent in
the editor, asks for the summary and pastes it into the team's chat.

The job changes nothing in the project. It only reads the history and writes a
few lines, which makes it a safe first job to move out of the editor. We will
run it as a CI job started by the clock. The summary will wait on a GitHub page.
Sending it on to the team's chat is a later step.

## The same agent in five places

A fifth place belongs with the four from part 1: the vendor's own cloud, where
you start the agent and it runs on the vendor's computers.

| Where it runs | Who starts it | Who is watching | Good for |
| --- | --- | --- | --- |
| In the editor | You | You, beside it | Asking and checking as you go |
| In the terminal | You | You | The same, plus scripts |
| In CI, when something happens | An event, such as a comment on a pull request | Nobody; you read the result later | Checks that run when something happens |
| On a schedule | The clock | Nobody | The same job every morning |
| In the vendor's cloud | You, from a browser or a phone | You, or nobody: it keeps running if you close your laptop | A long task that goes on while your laptop is closed |

Our rule of thumb: start where you can watch, in the editor or the terminal.
Move a job out when you ask for the same thing again and again and can judge the
result by reading it. A job that must run by itself every morning belongs on a
schedule. The vendor's cloud may be the easiest first try, since you start it
from a browser and write no file. Give an unattended job no more than it needs.
Do not let it act on text from people you do not know.

## What goes along to a run in the cloud

A run in the vendor's cloud starts from a copy of your repository, not from your
computer. A CI job has a copy only if one of its steps checks the repository
out. Anthropic's
[documentation](https://code.claude.com/docs/en/cloud-environments) says that
what you commit to the repository is available in the session, and that what you
have installed or configured only on your own machine is not.

In Claude Code's cloud sessions, the repository's instruction file from part 2
and its skills from part 4 go along, because they are part of the copy. So does
its MCP file from part 5, in a session with one repository. The versions in your
home folder, the servers you added only for yourself and sign-ins that need a
browser stay behind. The documentation's advice is to commit your own
configuration to the repository.

{% figure "what-goes-along" %}

OpenAI's
[documentation](https://learn.chatgpt.com/docs/environments/cloud-environments)
says the same of skills: the ones stored in the repository are available in
cloud tasks, and personal skills from your computer are not synced.

## When nobody is watching

In the editor, you are there to answer when the agent stops and asks. A job
started by the clock has nobody to answer. By default, a job in
[Claude Code](https://code.claude.com/docs/en/permission-modes),
[Codex](https://learn.chatgpt.com/docs/non-interactive-mode) and
[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
can do only what was allowed before it started, so the first job only reads.
[Part 7](#part-7) goes through how to set those limits, and what else can answer
in your place.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since.

All three can run in
[GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions),
GitHub's service for CI. A job there is described by a workflow file: a text
file in YAML, a plain format for settings, kept in the repository's
`.github/workflows` folder. The three jobs below share one file and differ in
one step, so the file comes first, with a place left for the tool's step:

```text
name: Daily summary
on:
  schedule:
    - cron: "30 9 * * *"
  workflow_dispatch:
jobs:
  summary:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      # the step for your tool goes here
```

Read from the top:

- `name` is what the repository's Actions tab shows for the job.
- `on` says what starts it. `schedule` starts it from the clock.
  [`cron`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
  writes the time as minute and hour: `30 9 * * *` is 09:30 every day, in UTC,
  which is 10:30 or 11:30 in Sweden. `workflow_dispatch` adds the Run workflow
  button to GitHub, for starting the job by hand.
- `runs-on` picks the runner, the computer that GitHub lends the job for one
  run.
- `timeout-minutes` makes GitHub cancel the job after ten minutes.
- `permissions` says what the job's GitHub token may do: here, only read the
  repository.
- A `uses` line runs a ready-made step. `with` gives it settings. The first step
  copies the repository onto the runner. `fetch-depth: 0` brings the whole
  history, so that `git log` can see yesterday's commits.

In **Claude Code**, the
[GitHub Action](https://code.claude.com/docs/en/github-actions) runs the agent
in CI, either when someone mentions `@claude` in a comment or, with a prompt, on
any GitHub event, such as the clock. It needs the Claude GitHub app installed on
the repository, and a second line under `permissions`, `id-token: write`, which
it uses to sign in to GitHub as that app. The step allows one GitHub tool,
`mcp__github__list_commits`, which lets Claude read the commits through GitHub's
API. It is adapted from Anthropic's own example: we left out the issues and the
model setting and wrote the prompt ourselves.

```text
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          claude_args: |
            --allowedTools "mcp__github__list_commits"
```

In OpenAI's **Codex**, the
[Codex action](https://learn.chatgpt.com/docs/github-action) runs the agent in
CI. The action's page shows only an example that starts on a pull request, so
this step is assembled from the action's list of settings. The `read-only`
setting lets Codex look at the files and change none, and `output-file` saves
its answer in a file that the last line prints.

```text
      - uses: openai/codex-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          sandbox: read-only
          output-file: summary.md
      - run: cat summary.md
```

**GitHub Copilot** runs in CI with `copilot -p`, which runs one prompt and
exits. This step is adapted from the example on GitHub's
[page about automating it with Actions](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions):
we shortened the prompt and let the answer go to the log instead of a file. The
`--allow-tool` flag allows git commands, and `--no-ask-user` stops Copilot from
asking questions. The token is a fine-grained personal access token with the
"Copilot Requests" permission. Give it that one permission. Then neither token
can write to your repository, so git cannot change it.

```text
      - uses: actions/setup-node@v7
      - run: npm install -g @github/copilot
      - env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
        run: copilot -p "Summarise yesterday's commits in ten lines" --allow-tool='shell(git:*)' --no-ask-user
```

We have checked that each file is valid YAML and that its settings are on the
tool's page, but we have not run the jobs. Running them takes a key or a token
for the tool and a repository of our own, so try them first where nothing
depends on them.

In the vendor's cloud,
[`claude --cloud`](https://code.claude.com/docs/en/claude-code-on-the-web)
starts a session on Anthropic's computers, and
[Codex Cloud](https://learn.chatgpt.com/docs/cloud) gives each task a workspace
of its own. GitHub Copilot can run a session in a
[cloud sandbox](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes),
an isolated Linux environment that GitHub creates for the session, if your plan
and your organisation allow it.

## Check that it works

Try the prompt in an ordinary chat first. Then press Run workflow, as in the
steps below. When the run is done, open it, open the job `summary` and read the
log of the tool's step. For Codex, that is the last step, which prints the file.
The answer is there: it should list yesterday's commits and nothing that is not
there. Compare it with this command, run in the repository's folder:

```text
git log --since=yesterday --oneline
```












## What it costs

A daily job costs something every day. A run in CI uses two things: the tool's
usage and GitHub Actions minutes. GitHub counts Copilot's usage as
[AI credits](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-ai-usage),
which you generally cannot trace to a single prompt or session. After the first
week, look at the usage of the account that the key belongs to.

## Troubleshooting

Five things can go wrong:

- Nothing appears under Actions.
- The run fails at the first step.
- The run succeeds, but the answer is empty or wrong.
- The run starts at another time than you expected.
- The run goes on for too long.

If nothing appears under Actions, check where the file is. GitHub reads workflow
files from the `.github/workflows` folder, and a schedule or a Run workflow
button works only when the file is on the default branch, the main line of
changes in the repository, usually called `main`.

If the run fails at the first step, open that step's log. Check that the secret
exists and that its name is spelled exactly as in the file. For Claude Code,
also check that the Claude GitHub app is installed on the repository.

If the run succeeds but the answer is empty or wrong, a tool may have been
refused. A plain-text prompt to Claude has no shell or GitHub access until the
file grants the tools the prompt needs, so check which tools it needs and allow
exactly those.

If the run starts at another time than you expected, remember that the clock is
UTC. GitHub also says that a schedule can be delayed when many workflows start
at once, such as at the start of every hour, and advises another time of the
hour. That is why the file uses 09:30.

If the run goes on for too long, the `timeout-minutes` line cancels it after ten
minutes.

## Advanced

The basics above are enough to start. Three things for later:

- Jobs that change code. They leave a branch (a separate line of changes) or a
  pull request. You read it before it counts. In the factory, a change goes live
  only once the gates pass ([Why we run an agent-run software
  factory](/blog/why-we-run-an-agent-run-factory/)). Part 7 covers the
  permissions such a job needs.
- Signing in from a workflow without a stored key, through workload identity
  federation, which Claude's action supports.
- [GitHub Agentic Workflows](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/):
  automation written in Markdown, which runs with read-only permissions by
  default.

## Start small

This is our own advice for a first job. Choose a job that runs without a person,
repeats and has a result you can check, such as the summary. Give it no way to
write. If a later job must write, add that one tool and nothing else.

1. In a private repository with some commits from yesterday, create a file at
   this path, on the default branch, usually `main`:

   ```text
   .github/workflows/daily-summary.yml
   ```

   Fill it with the file from above, and put your tool's step in place of the
   last line.

2. Add the key as a secret. In the repository's Settings, open Secrets and
   variables, then Actions, then New repository secret, and give it the name the
   file uses. A secret is a value that GitHub keeps outside the file and hands
   to the job. Never paste the key into the file. The key is a secret string
   from your account with the tool's vendor. For Copilot, use the token
   described above. For Claude Code, also install the Claude GitHub app on the
   repository: the action's page shows how.

3. Open the Actions tab, pick Daily summary in the list and press Run workflow.

4. When the run is done, read the answer in the log, as described above, and
   compare it with the history.

5. Leave the schedule on when the answer is right, and look at the Actions tab
   after a few mornings.

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
