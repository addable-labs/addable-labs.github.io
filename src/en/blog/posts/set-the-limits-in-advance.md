---
title: Set the limits in advance
description: The seventh part of the series "From AI chat to agentic work" — the difference between asking an AI agent to behave and stopping it, the three kinds of limit a tool offers, where each tool starts, what to do when a limit lets something through and what to do first.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, moves along a dotted path past a small grey note card on a post. The note is a request, and it does not stop the agent. To its right a closed gate in green outline, with a padlock, stands across the path. The gate is a limit, and the path ends at it.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: set-the-limits-in-advance
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---
In part 6 of this series, the AI agent worked where nobody watches, and a job
could do only what was allowed before it started. This part is about how you
decide what is allowed, wherever the agent runs.

Until now, most of what you gave the agent was a request. The instruction file
from part 2 is text that the agent reads and usually follows. A limit is
different: the tool enforces it, whatever the agent decides.

No single limit covers everything, so a good first set uses more than one and
starts strict.

## A request and a limit

A made-up example: the developer of the web app from the earlier parts has a
`migrations/` folder whose files have already run in production. The instruction
file from part 2 has a line about it:

```text
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
```

The agent reads that line at every start and usually follows it. Anthropic's
[documentation](https://code.claude.com/docs/en/permissions) separates the two
kinds of rule in two sentences. Instructions "shape what Claude tries to do, but
they don't change what Claude Code allows", while permission rules "are enforced
by Claude Code, not by the model".

[VS Code's documentation](https://code.visualstudio.com/docs/agents/run/security)
says that instructions guide the model and are not an enforcement boundary.
[OpenAI's](https://learn.chatgpt.com/docs/customization/overview) advises
pairing AGENTS.md with infrastructure that enforces its rules.

The line fails when the agent misreads it or has been misled by text it read, as
part 5 described. Anthropic's
[post](https://www.anthropic.com/research/claude-code-auto-mode) of 25 March
2026 lists past cases from its own incident log: deleting remote git branches
from a misinterpreted instruction, uploading an engineer's GitHub token to an
internal compute cluster and attempting migrations against a production
database. It says each was the model being overeager.

A limit is a rule that the tool checks before the agent's action happens. Part 2
named two ways to get one: a test in the project and a setting in the tool. This
part is about the setting.

In the factory behind this site we have one of each. Every agent commits under
an identity that is set in the environment of its session, so the agent does not
choose it. A rule not to stop other programs' processes with a command that goes
by their names is a line in the instruction file that nothing enforces.

## Three kinds of limit

Each time the agent wants to do something, such as run a command or change a
file, the tool decides whether it happens. The tools offer three kinds of limit
for that decision, and they stop different things.

**Permissions** are rules and modes in the tool's settings. A rule says that an
action is allowed, needs your answer first or is never allowed, and a mode sets
what runs without asking when no rule applies. In Claude Code a deny rule wins
over an allow rule.

A **hook** is a command that the tool runs by itself at a set point, such as
just before the agent uses a tool. Your own script looks at what the agent is
about to do and can say no.

The **sandbox** is a limit of another kind. The operating system, the software
that runs your computer, restricts which files and which network addresses a
command and the programs it starts can reach. It applies the limits while the
command runs, so the agent does not need to ask about each one.

{% figure "limits-path" %}

In Claude Code a command meets the hook first, then the permission rules, and
runs inside the sandbox if it is on. Each check covers only part of what the
agent can do: the sandbox covers commands in the terminal, and the figure lists
what runs outside it. The instruction file is not on the path at all. It reaches
the model and nothing else.

## A first set of limits

The developer sets up the limits for the web app in Claude Code, which serves as
the example here. Codex and GitHub Copilot follow in the section on the tools.
Two files hold the limits. The first is `.claude/settings.json`. It sets the
permissions, turns the sandbox on and registers a hook:

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

The agent may run the tests and look at the repository without asking. It can
never edit a file under `migrations/` or read `.env`, because deny rules block
in every mode. Everything that changes something and is not on the allow list
asks you first, since `default` is the mode Claude Code calls Manual. The
sandbox is on, and `autoAllowBashIfSandboxed` is false, which keeps the
questions for commands even when they run inside the sandbox.

Part 2 mentioned a hook that blocks edits to the migrations folder. A deny rule
does the same with less to write, so the hook here is kept for commands. The
second file is the script that the hook runs. The tool starts it before every
shell command and passes it the command as text. Exit code 2 blocks the command,
and what the script writes as an error message goes back to the agent. Save it
as `.claude/hooks/block-dangerous.sh` and make it executable with `chmod +x`. It
also needs `jq`, a small program for reading JSON.

```text
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q -E 'rm -rf|git push .*--force'; then
  echo "Blocked: '$COMMAND' is on this project's never-run list" >&2
  exit 2
fi

exit 0
```

We ran the script in a scratch folder with the sample input from Anthropic's
[hooks guide](https://code.claude.com/docs/en/hooks-guide). It blocked
`rm -rf build` and `git push origin main --force` and let `npm test` through. We
did not run the settings file in a live session. We checked its keys against
Anthropic's documentation as it stood on 30 October 2026.

## What the sandbox covers

The sandbox is the only one of the three that the operating system enforces, and
each vendor's page says what it does not cover. The table shows Claude Code's
[page](https://code.claude.com/docs/en/sandboxing), the one for
[Codex](https://learn.chatgpt.com/docs/sandboxing) and the one for
[VS Code](https://code.visualstudio.com/docs/agents/run/agent-sandboxing) as
they stood on 30 October 2026.

| | Claude Code | Codex | GitHub Copilot in VS Code |
| --- | --- | --- | --- |
| Files | Writes in the project folder; reads most of the computer | Writes in the workspace and temporary folders | Reads and writes in the working folder; reads developer-tool folders |
| Network | Closed; allowed addresses start empty | Off | Open, even when the sandbox is on |
| Not covered | File tools, MCP servers and hooks | Web search, MCP connections and browser use are not filtered | Built-in tools that start no process |

Anthropic's page says that the sandbox "reduces risk but is not a complete
isolation boundary". VS Code's says that it is not a virtual machine or a
user-account boundary.

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since. The three do not start in the same place.

**Claude Code** starts in auto mode in the terminal and in VS Code, since
version 2.1.283, and the sandbox is off. In auto mode a second model, the
classifier, reviews the actions instead of you. The post of 25 March 2026
measured it: of 52 real cases where the agent did more than it was asked, the
classifier let 17% through, which Anthropic calls "the honest number". Part 6
gave another figure, from the post of 7 August 2026.

Anthropic's
[page on permission modes](https://code.claude.com/docs/en/permission-modes)
lists the steps from strict to hands-off. They are Manual mode, then Manual mode
with the sandbox in auto-allow mode, which runs commands inside the sandbox
without asking, and then auto mode. The bypass mode is for containers and
virtual machines only. In the example file, deleting `autoAllowBashIfSandboxed`
takes the second step. `claude --permission-mode default` starts strict,
`/sandbox` shows the sandbox settings and `/permissions` lists the rules.

**Codex** splits the limits in two, as OpenAI's
[documentation](https://learn.chatgpt.com/docs/agent-approvals-security) puts
it: a sandbox that limits what Codex can touch, and an approval policy that
decides when it must stop and ask you. In a folder under version control the
recommended start is `workspace-write` with approval on request. In other
folders it is `read-only`. The same start, written as a file:

```text
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

The file is `.codex/config.toml`, which Codex
[reads for a project](https://learn.chatgpt.com/docs/config-file/config-basic)
only when it trusts the project. A separate
[rules file](https://learn.chatgpt.com/docs/agent-configuration/rules) controls
which commands Codex may run outside the sandbox, and a rule can forbid a
command such as `git push`. OpenAI marks rules as experimental.

**GitHub Copilot** in VS Code starts in Manual permissions with the sandbox off.
A [permission level](https://code.visualstudio.com/docs/agents/run/approvals)
applies to a session. Manual permissions asks about everything that is not
auto-approved, Assisted permissions lets a language model judge each call, and
Allow all skips the questions. Terminal commands, tools, URLs and edits to
sensitive files have settings of their own. The settings below turn the sandbox
on and close its network. The last line is adapted from
[VS Code's own example](https://code.visualstudio.com/docs/agents/run/review-code-edits)
and asks before an edit to a migration or to `.env`. It does not forbid it.

```text
"chat.agent.sandbox.enabled": "on",
"chat.agent.sandbox.network.allowNetwork": false,
"chat.tools.edits.autoApprove": { "**/*": true, "**/migrations/**": false, "**/.env": false }
```

All three have hooks, but a hook written for one tool does not carry over
unchanged. VS Code's
[page on hooks](https://code.visualstudio.com/docs/agent-customization/hooks)
says that event names, tool names, arguments and error behaviour can differ
between tools. We have not run the Codex and Copilot settings above.

## Check that it works

A limit that nobody has tried is a hope. In the factory behind this site, each
gate has a test that proves it fails when something is deliberately broken, as
[How this site was built by agents](/blog/how-this-site-was-built-by-agents/)
describes. Try your limits the same way, in a practice copy of the project:

1. Run `/permissions` and `/sandbox` to see which rules and settings apply.
2. Ask the agent to add a comment to a file in `migrations/`. The deny rule
   should stop it.
3. Ask it to delete the `build` folder with `rm -rf build`. The hook should
   block it, and the agent gets the hook's message.
4. Ask it to run `touch ~/sandbox-probe`, the check that Anthropic's page
   suggests. You get a question first, so answer yes. The sandbox should then
   stop it with an error such as "Operation not permitted". If the file appears,
   delete it and look at `/sandbox`.
5. Ask it to delete `build` with `rm -fr build`. The hook lets this one through,
   so you get a question instead. Answer no.

The fifth is the one that does not hold, and the next section says why.

## Troubleshooting

Six things can go wrong:

- A deny rule does not stop a program that reads files itself.
- The hook lets a command through.
- The hook does not run, or fails without blocking.
- You answer yes to every question.
- A setting does not apply.
- The sandbox is not doing what you expect.

If a deny rule does not stop a program that reads files itself, the rule is not
the layer for that. Read and Edit deny rules apply to Claude Code's file tools,
to the file commands it recognises, such as `cat` and `sed`, and to
redirections. They do not apply, in Anthropic's words, to "arbitrary
subprocesses that read or write files indirectly, like a Python or Node script
that opens files itself". The sandbox covers those programs, and Claude Code
adds the paths from your deny rules to the sandbox's own lists, so turn both on.

If the hook lets a command through, look at how the command is spelled.
`rm -fr build` means the same as `rm -rf build`, and the script above lets it
pass, as it does `rm -r -f build` and `git push -f`. A hook that matches text
stops what it lists and nothing else. OpenAI's
[hooks page](https://learn.chatgpt.com/docs/hooks) says to treat hooks "as a
useful guardrail, not a complete enforcement boundary". Use a hook for what you
can name exactly, and put the real boundary in a deny rule or in the sandbox.

If the hook does not run, test it the way the hooks guide does, by sending it
sample input:

```text
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' | .claude/hooks/block-dangerous.sh; echo $?
```

It should print the message and then 2. The usual causes are a script that is
not executable, `jq` missing and a matcher in the wrong case, since matchers are
case-sensitive. On most events Claude Code still carries out the action when a
hook fails or times out. Add `"onFailure": "block"` next to `"type"` in the
hook's entry, in version 2.1.295 or later, to make a failure block. Codex skips
a hook until you have reviewed and trusted it with `/hooks`.

If you answer yes to every question, the questions are not a limit. Part 6 told
why a question that people answer without reading is a weak guard. The fix is to
ask less and ask better: an allow rule for the commands you approve every time,
such as `npm test`, or the sandbox in auto-allow mode, the second step above, so
that the questions that remain are about what crosses the boundary.

If a setting does not apply, find out which one wins. Claude Code ignores
`"auto"` and `"bypassPermissions"` as `defaultMode` in a project's
`.claude/settings.json`, so put them in your own `~/.claude/settings.json`. A
project's allow rules wait until you accept the trust dialog for the folder. In
VS Code, a session started in a worktree, a separate working copy of the
project, always uses Allow all, whatever the default says. In Codex, the retired
approval policy `untrusted` can stop the app from starting. `/permissions` in
Claude Code lists the rules and where each comes from, and `/status` in Codex
lists the folders that count as the workspace.

If the sandbox is not doing what you expect, start with whether it runs at all.
Claude Code runs commands without the sandbox if a package it needs is missing
or the platform is unsupported, as on native Windows, unless
`sandbox.failIfUnavailable` is `true`. A command that will not run inside the
sandbox is often a tool that ignores its proxy settings: Claude Code's page says
that plain `ssh` and most database drivers cannot connect, even to an allowed
host. Running that one command outside the sandbox removes the protection for
it. Allow the narrowest address, or set `allowUnsandboxedCommands` to `false` so
that the only way out is the settings file.

## Advanced

The basics above are enough to start. Five things for later:

- Settings that a team or a company can force and that users cannot override:
  managed settings in Claude Code, Copilot's
  [enterprise-managed settings](https://code.visualstudio.com/docs/enterprise/manage-ai-settings)
  for VS Code and
  [`requirements.toml`](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
  in Codex.
- Untrusted repositories. A repository can bring its own settings, hooks and
  instructions. VS Code turns agents off in a workspace opened in
  [restricted mode](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust),
  Codex starts read-only until you trust the folder and Claude Code
  [asks first](https://code.claude.com/docs/en/security).
- Running the whole session in a container or a virtual machine, which is where
  Anthropic says the bypass mode belongs.
- Codex's [permission profiles](https://learn.chatgpt.com/docs/permissions) and
  the [settings](https://code.claude.com/docs/en/auto-mode-config) for Claude
  Code's classifier.
- What hooks can do beyond blocking, such as
  [rewriting a call](https://code.claude.com/docs/en/hooks).

## Start small

Pick a practice project and start where the tool is strictest. OpenAI's
[best practices](https://learn.chatgpt.com/docs/learn/best-practices) advise it
for anyone new to coding agents: keep approval and sandboxing tight, then loosen
permissions "only for trusted repos or specific workflows once the need is
clear".

Then add the limits in this order. First an allow rule for the read-only
commands you approve every time. Then the sandbox. Then a deny rule for what
must never change. Last, a hook, and only for a command you can name exactly.
Try each one as in the section above before you add the next. That order is our
own advice.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own
4. Skills, for work that must be done the same every time
5. MCP, how an AI agent reaches your other systems
6. Where the AI agent runs and who starts it
7. Set the limits in advance (this part)
8. Less steering for every model
