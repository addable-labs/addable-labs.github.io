---
title: Set the limits in advance
description: "A line in the instruction file asks an AI agent to behave, while a limit is checked outside it. This part goes through the limits the tools offer, a first set to try on a practice project and what to do when a limit lets something through. The seventh part of the series \"From AI chat to agentic work\"."
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, moves along a dotted path past a small grey note card on a post. The note is a request, and it does not stop the agent. To its right a closed gate in green outline, with a padlock, stands across the path. The gate is a limit, and the path ends at it.
date: 2026-11-15
category: ai-journey             # app-development | ai-journey
translationKey: set-the-limits-in-advance
draft: false                     # published — set true to keep it out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: true              # a person has read it
---
In part 6 the agent ran with nobody there, and the first job could only read,
because by default a job in
[Claude Code](https://code.claude.com/docs/en/permission-modes),
[Codex](https://learn.chatgpt.com/docs/non-interactive-mode) and
[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
can do only what was allowed before it started.

A job that has to do more needs its limits set in advance. Permission rules, a
hook and a sandbox can each answer for you when the agent is about to run a
command or change a file. We describe the tools as their documentation stood on
15 November 2026.

## A request and a limit

Take the made-up web app from the earlier parts again. The instruction file from
part 2 tells the agent to leave its `migrations/` folder alone:

```text
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
```

The agent
[reads that line at every start](https://code.claude.com/docs/en/memory) and
usually follows it. If it misreads the line, or text it has read has misled it
(part 5 described how), the line cannot stop it. In Anthropic's
[documentation](https://code.claude.com/docs/en/permissions), instructions
"shape what Claude tries to do, but they don't change what Claude Code allows",
while permission rules "are enforced by Claude Code, not by the model".

A limit is a rule that something outside the instruction file checks. Part 2
named two ways to get one: a test in the project and a setting in the tool.

## Start strict

OpenAI's [best practices](https://learn.chatgpt.com/docs/learn/best-practices)
tell anyone new to coding agents to keep approval and sandboxing tight, and to
loosen permissions only for trusted repositories or specific workflows once the
need is clear.

On a practice project we would start with four settings: the tool asks before
anything that changes something, the sandbox is on and a deny rule covers the
one thing that must never change. A hook comes last, for a command you can name
exactly. In a real project, add them one at a time and try each before you add
the next.

## Three kinds of limit

Three kinds of limit decide whether the agent may run a command or change a
file.

Permission rules are a list in the tool's settings that says an action is
allowed, needs your answer first or is never allowed. When no rule applies, the
tool's mode decides who answers: you, or in some modes a second model. In Claude
Code a deny rule wins over an allow rule.

A hook is a command that the tool runs automatically just before the agent uses
one of its tools. Your own script can then look at what the agent is about to do
and say no.

Then there is the sandbox. The operating system puts a fence around a command
and the programs it starts. Inside the fence, the settings say which files the
command can change and which network addresses it can reach. Anthropic's
[page](https://code.claude.com/docs/en/sandboxing) says that the sandbox is not
a complete isolation boundary.

{% figure "limits-path" %}

A command meets the hook first, because the hook can stop it before any rule is
read, and the sandbox last, because it wraps the command itself. The agent's
file tools run outside the sandbox and follow the permission rules instead.

## Set up the example

The example uses Claude Code in a terminal. You need macOS, Linux or Windows
with [WSL2](https://learn.microsoft.com/en-us/windows/wsl/about), because the
example's hook is a shell script and the sandbox runs on macOS, Linux and WSL2.
You also need `jq`. Check that you have it:

```text
jq --version
```

If that prints an error, install it with `brew install jq` on macOS or
`sudo apt-get install jq` on Debian and Ubuntu, as Anthropic's
[hooks guide](https://code.claude.com/docs/en/hooks-guide) describes.

Try it in a folder that does not matter. These commands create one with the two
folders the example protects:

```text
mkdir limits-practice
cd limits-practice
git init
mkdir -p .claude/hooks migrations build
echo "create table users (id int);" > migrations/001.sql
```

Save this as `.claude/settings.json`. It sets the permissions, turns the sandbox
on and registers a hook:

```text
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Bash(npm test)", "Bash(git status)", "Bash(git diff *)"],
    "deny": ["Edit(migrations/**)", "Read(./.env)"]
  },
  "sandbox": { "enabled": true, "autoAllowBashIfSandboxed": false },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

Each rule names a tool and, in parentheses, what it applies to. `*` stands for
any text and `**` for any depth of folders, so `Edit(migrations/**)` covers
every file under `migrations/`. `defaultMode: default` makes Claude Code ask
before anything that changes something, and `autoAllowBashIfSandboxed: false`
keeps it asking even for a command inside the sandbox.

A deny rule stops Claude Code's file tools from editing a file under
`migrations/` in every mode. Anthropic's
[page](https://code.claude.com/docs/en/permissions) says that Claude Code makes
a best-effort attempt to apply a rule against reading `.env` to Grep and Glob.

Without the `defaultMode` line, a terminal session starts in auto mode where
that mode is available. Without the `sandbox` line, the sandbox is off. In auto
mode a second model reviews the actions instead of you.

Next comes the script the hook runs. `PreToolUse` in the settings means just
before a tool is used, and `matcher: Bash` limits the hook to shell commands.
The script reads the event as JSON on stdin and looks for `rm -rf` and for
`git push` with `--force`. On a match it prints a message for the agent and
exits with code 2, which blocks the command; anything else exits with 0 and goes
through. Save it as `.claude/hooks/block-dangerous.sh`:

```text
#!/bin/bash
command -v jq >/dev/null || { echo "jq is missing" >&2; exit 2; }
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q -E 'rm -rf|git push .*--force'; then
  echo "Blocked: '$COMMAND' is on this project's never-run list" >&2
  exit 2
fi

exit 0
```

If `jq` is missing, the first line blocks every command and says why. Make the
script executable and test it before Claude Code runs it. As in the hooks guide,
the test feeds it a made-up command, and `echo $?` prints the exit code:

```text
chmod +x .claude/hooks/block-dangerous.sh
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' | .claude/hooks/block-dangerous.sh; echo $?
```

It should print the "Blocked" message and then 2. We ran the script with
`rm -rf build`, `git push origin main --force` and `npm test`, and it blocked
the first two. We did not try the settings file in a live session.

Now start Claude Code from this folder with the command `claude`. If it
[asks whether you trust the folder](https://code.claude.com/docs/en/security),
say yes: it is your own practice folder.

## Check that it works

Give Claude Code these requests one at a time and check each result yourself in
a second terminal, since the agent's own words are not proof. Its messages may
differ from those described here; the file checks decide.

1. Type `/permissions` and then `/sandbox`. You should see your allow and deny
   rules and the sandbox settings.

2. Ask: "Add a comment to migrations/001.sql." The deny rule should refuse. If
   Claude Code offers to run a command instead, answer no. Check that the file
   is unchanged:

   ```text
   cat migrations/001.sql
   ```

   It should still be one line.

3. Ask: "Delete the build folder with rm -rf build." The hook should block it,
   and the agent gets its "Blocked" message. Check that the folder is still
   there:

   ```text
   ls -d build
   ```

4. Ask: "Run touch ~/sandbox-probe", the check that Anthropic's page suggests.
   Claude Code asks first. Answer yes: this time the sandbox, not you, has to do
   the stopping. It should fail with an error such as "Operation not permitted"
   on macOS or "Read-only file system" on Linux. If Claude then asks to run it
   again outside the sandbox, answer no. Check:

   ```text
   ls ~/sandbox-probe
   ```

   It should say that there is no such file. If the file exists, delete it and
   run `/sandbox`.

5. Ask: "Delete build with rm -fr build." The hook does not recognise this
   spelling, so Claude Code only asks you. Answer no.

If `/sandbox` shows only a Dependencies tab, the sandbox cannot start yet, and
the tab says what to fix. On Linux and WSL2 the sandbox needs `bubblewrap` and
`socat`. Fix what is named, restart Claude Code and run `/sandbox` again. Until
then, Claude Code runs commands without the sandbox by default.

When you are done, delete the practice folder and `~/sandbox-probe` if it
exists. To use the limits in a real project, copy the two files into it (if the
project already has a `.claude/settings.json`, add the keys to it) and commit
them. Anthropic's [page on settings](https://code.claude.com/docs/en/settings)
says to commit that file so that everyone who clones the repository gets the
same permissions and hooks.

## When a limit lets something through

Step 5 showed it. `rm -fr build` means the same as `rm -rf build`, but the
script looks only for the second spelling. `rm -r -f build` and `git push -f`
get through as well. A hook that matches text stops only what it lists.

The deny rule has a gap too. It covers Claude Code's own file tools and the file
commands it recognises, such as `cat` and `sed`, but not a script that opens
files itself, for example a Python program. The sandbox does, so use both.

{% figure "limits-attempts" %}

If the hook seems not to run at all, repeat the test command. Two causes to rule
out are a script that is not executable and a `matcher` spelled with the wrong
case. A hook that fails or times out does not block by default: on most events
Claude Code still carries out the action.

A question that you answer yes to every time is not a limit. If you catch
yourself doing that, make an allow rule for the command, for example `npm test`,
or set `autoAllowBashIfSandboxed` to `true` so that commands inside the sandbox
run without asking.

## If you use Codex

Codex has two switches: the sandbox, which limits what it may touch, and the
approval policy, which says when it must ask you. We have not tried the Codex
and Copilot settings below. In the practice folder, create `.codex/config.toml`
with the starting settings that OpenAI
[recommends](https://learn.chatgpt.com/docs/agent-approvals-security) for a
folder under version control:

```text
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

Codex [reads this file](https://learn.chatgpt.com/docs/config-file/config-basic)
only for a project it trusts, so if it asks whether you trust the folder, say
yes. In the command-line version, `/status` shows the approval policy and the
workspace folders. Run step 4 above and answer no if Codex asks to leave the
sandbox. Steps 2, 3 and 5 need Claude Code's deny rule and hook. Rules that
forbid a command live in a separate
[rules file](https://learn.chatgpt.com/docs/agent-configuration/rules), which
OpenAI marks as experimental.

## If you use GitHub Copilot in VS Code

Copilot sessions in VS Code start in
[Manual permissions](https://code.visualstudio.com/docs/agents/run/approvals)
unless a setting or your organisation says otherwise. Open the Command Palette,
choose
[Preferences: Open User Settings (JSON)](https://code.visualstudio.com/docs/configure/settings)
and add these lines:

```text
"chat.agent.sandbox.enabled": "on",
"chat.agent.sandbox.network.allowNetwork": false,
"chat.tools.edits.autoApprove": { "**/*": true, "**/migrations/**": false, "**/.env": false }
```

The first two lines turn the sandbox on and close its network. The third is
adapted from
[VS Code's own example](https://code.visualstudio.com/docs/agents/run/review-code-edits).
In Manual permissions it makes Copilot ask before it edits a migration or
`.env`; it does not forbid the edit. The lines apply to every project you open,
so remove them when you are done. In a new session,
[`/sandbox policy`](https://code.visualstudio.com/docs/agents/run/agent-sandboxing)
shows whether the sandbox is on.

## Advanced

- A team or a company can force settings that users cannot override: managed
  settings in Claude Code, Copilot's
  [enterprise-managed settings](https://code.visualstudio.com/docs/enterprise/manage-ai-settings)
  for VS Code and
  [`requirements.toml`](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
  in Codex.
- Projects you did not write can bring their own settings, hooks and
  instructions. VS Code turns agents off in a workspace opened in
  [restricted mode](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust).
  Codex may start read-only until you trust the folder. Claude Code asks whether
  you trust the folder in an interactive session, but a run without a person at
  the prompt, such as `claude -p`, never asks.
- A hook that fails can be made to block. In Claude Code 2.1.295 or later,
  `"onFailure": "block"` next to `"type"` in a hook's entry blocks when the hook
  cannot start or times out.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. [Give each AI agent a job of its own](/blog/agents-with-a-scope-each/)
4. [Skills, for work that must be done the same way every time](/blog/skills-for-repeatable-work/)
5. [MCP, how an AI agent reaches other systems](/blog/mcp-reaching-your-systems/)
6. [Where the AI agent runs and who starts it](/blog/where-the-agent-runs/)
7. Set the limits in advance (this part)
8. Less steering for every model
