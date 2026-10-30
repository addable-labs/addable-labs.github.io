---
title: MCP, how an AI agent reaches your other systems
description: The fifth part of the series "From AI chat to agentic work" — what MCP is, why every server you connect is a decision about trust, how to make a first connection that can only read and what to do when it does not work.
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: An AI agent, a green circle, stands at the entrance of a project and reads a short note card on a post before it steps in. Behind the doorway lie the project's folders and files.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: mcp-reaching-your-systems
draft: true                      # a draft — set false to publish it
aiGenerated: true                # AI produced this text
humanReviewed: false             # no one has read it yet
---

In part 4 of this series, the steps for a job went into a skill, a folder with a
text file in it. So far everything the AI agent reads at the start has been a
file on your own computer: the instruction file, the subagents' files and the
skills.

This part is about the systems outside those files, such as an issue tracker, a
documentation site or a database, and how an agent reaches them. The way in is
the Model Context Protocol, MCP for short, an
[open protocol](https://modelcontextprotocol.io/specification/2026-07-28) that
[From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/) named in
one sentence. On 9 December 2025 Anthropic
[donated MCP](https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/)
to the Agentic AI Foundation (AAIF), a foundation within the Linux Foundation
that also looks after AGENTS.md.

Each server you connect is something you choose to trust, so a good first
connection is one that can only read.

## An issue the agent cannot see

A made-up example: the developer of the web app from the earlier parts keeps the
app's issues in GitHub. One of them says "Add a phone number to the sign-up
form", with a long thread of comments below it. The agent cannot see any of
that, so the developer copies the text into the chat each time.

Copying works for one issue. It does not work when the agent needs the comments,
the linked issues or the other issues that mention the form. A connection lets
the agent read them itself.

Before you connect anything, look for a command-line tool. Claude Code's
[best practices](https://code.claude.com/docs/en/best-practices) say that if a
system has one, "that's usually the easiest way in": with `gh`, GitHub's
command-line tool, installed and signed in, Claude can read review comments
without any explanation from you. MCP is for the systems without one. We use
GitHub's server as the example anyway, because its documentation shows how a
connection can be limited, and that carries over to servers that have no
command-line tool.

## Host, client and server

The MCP documentation uses three words. The
[host](https://modelcontextprotocol.io/docs/learn/architecture) is the AI
application you talk to, such as Claude Code or VS Code. The server is a program
that offers something to the agent, such as the issues of a repository. The
client is the part of the host that keeps the connection to one server, and the
host creates one client for each server.

A server is local or remote. A local server is a program that runs on your
computer, started by the host. A remote server runs somewhere else and is
reached by a web address, so it needs a way to know who you are: a sign-in in
the browser or a token, which is a secret string that you create.

{% figure "mcp-host-client-server" %}

## What a server offers

A server can offer three kinds of thing, and they differ in who decides when one
is used:

| It offers | Which is | Who decides |
| --- | --- | --- |
| Tools | actions the agent can call, such as "list the issues" | the agent |
| Resources | data the application can read, such as a page of documentation | the application |
| Prompts | ready-made instructions | you |

Tools are the part that can change things. The
[MCP documentation](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts)
says that tools can "write to databases, call external APIs, modify files, or
trigger other logic", and the model decides when to use one. The rest of this
part is about tools.

## Every server is a decision about trust

Tools "represent arbitrary code execution and must be treated with appropriate
caution", as the specification puts it. A local server is a program on your
computer, and VS Code's
[documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
notes that local servers can run code on your machine. A listing in a directory
is not an audit either: Anthropic reviews connectors against its listing
criteria but, in the words of Claude Code's
[security page](https://code.claude.com/docs/en/security), "does not
security-audit or manage any MCP server".

The specification also says who should ask you. Its overview says that hosts
"must obtain explicit user consent before invoking any tool". Its
[page on tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
says that "there SHOULD always be a human in the loop with the ability to deny
tool invocations". The first is worded as a requirement and the second as a
recommendation, and the overview adds that MCP itself "cannot enforce these
security principles at the protocol level". The standard asks the application to
check with you first, and it has no way to force it.

The risk to know by name is prompt injection. Text that the agent reads, such as
an issue, a web page or a tool's description, contains instructions, and the
agent may follow them as if you had written them. VS Code's
[security page](https://code.visualstudio.com/docs/agents/run/security) gives an
example: a page with user-generated content that tells the agent to delete all
files in the src folder.

Two benchmarks, which are sets of test cases made to compare agents, measured
this for instructions hidden in a tool's description. In
[MCPTox](https://arxiv.org/html/2508.14925v2) the researchers added a tool with
a hidden instruction in its description next to the tools of real servers.
Averaged over 20 agents, the agents followed the hidden instruction in 36.5% of
the cases, and they rarely refused.

[MSB](https://arxiv.org/html/2510.15994v2) ran ten agents against attacks that
used real tools, and 40.35% of the attacks succeeded on average. Both papers
found that more capable models were often more vulnerable, because they follow
instructions better.

Both used a malicious tool or server that the researchers added, and MCPTox says
that its test cases came from a semi-automated process guided by patterns its
authors defined. The numbers describe what agents did in those tests, so read
them as a direction and not as a rate.

## A first connection that can only read

The developer connects GitHub's own server to a practice repository with a few
made-up issues. The aim is that the agent can read the issues and do nothing
else. Three limits, one on top of the other, make sure of that:

1. **The server offers only reading.** GitHub's server has a
   [read-only mode](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md),
   and it "takes precedence over any other configuration, by disabling write
   tools even when explicitly requested". For the
   [remote server](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)
   you add `/readonly` to the end of the address.
2. **The token can only read.** GitHub's
   [fine-grained tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
   can be limited to chosen repositories and permissions. Give the token the
   practice repository and set Issues to read. Tokens always include read-only
   access to all public repositories, so the token limits writing and private
   repositories, not public ones.
3. **The agent uses only the tools the task needs.** The server's tools for
   reading issues are `issue_read`, `list_issues` and `search_issues`. The next
   section shows where each tool takes that setting.

Keeping all three is our own advice and not a claim from GitHub. If one is set
wrongly, the other two still hold.

What none of them does is stop the agent from reading text that carries
instructions. An issue that anyone can write is text the agent reads, which is
why the practice repository should be one that only the developer can write to.
GitHub's server also has a lockdown mode that limits what it shows from public
repositories by whether an item's author has push access. Its
[README](https://github.com/github/github-mcp-server) is plain about the reach:
lockdown mode is "a best-effort content filter" and "not an authorization
boundary: it does not change what the underlying GitHub credential can read or
write".

## Claude Code, Codex and GitHub Copilot

We describe the tools as their documentation stood on 30 October 2026. What we
say may have changed since.

In **Claude Code** you add the server with one command, run in the project's top
folder. The single quotes matter: they stop the shell from replacing
`${GITHUB_PAT}` with the token itself.

```text
claude mcp add --transport http --scope project github https://api.githubcopilot.com/mcp/readonly --header 'Authorization: Bearer ${GITHUB_PAT}'
```

The command writes a file called `.mcp.json` in the project's top folder, which
the team can commit. The file holds the address and a header that names the
variable, so the token is not in it. Set `GITHUB_PAT` in the environment that
starts Claude Code. The first time you open the project, Claude Code asks you to
approve the server, and
[a cloned repository cannot approve its own servers](https://code.claude.com/docs/en/mcp).

Claude Code's [permission rules](https://code.claude.com/docs/en/permissions)
name a tool as `mcp__<server>__<tool>`, where the last part is the name the
server gives the tool. A rule in `.claude/settings.json` lets those tools run
without asking:

```text
{
  "permissions": {
    "allow": [
      "mcp__github__issue_read",
      "mcp__github__list_issues",
      "mcp__github__search_issues"
    ]
  }
}
```

In OpenAI's **Codex** the server goes into
[`config.toml`](https://learn.chatgpt.com/docs/extend/mcp). TOML is a plain text
format for settings. A project's own `.codex/config.toml` is read only when
Codex trusts the project, and `enabled_tools` is the tool allow list.

```text
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/readonly"
bearer_token_env_var = "GITHUB_PAT"
enabled_tools = ["issue_read", "list_issues", "search_issues"]
```

**GitHub Copilot** in VS Code reads a `.mcp.json` in the workspace root. VS
Code's documentation names it as the way to share a server with a team that uses
compatible Copilot tools. Create the file by hand. VS Code's
[configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
lets a header in that file refer to an environment variable with
`${GITHUB_PAT}`, which must be set in the environment that starts VS Code:

```text
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/readonly",
      "headers": { "Authorization": "Bearer ${GITHUB_PAT}" }
    }
  }
}
```

In VS Code the project's servers inherit
[Workspace Trust](https://code.visualstudio.com/docs/agents/run/manage-mcp-servers):
in a trusted workspace they start without a separate prompt, so trusting a
folder also trusts its servers. Each tool call needs your approval, which you
can give for the session, for the workspace or at user level. You choose the
tools under Chat: Open Customizations, then Tools.

## Check that it works

Start a fresh chat and ask a question whose answer is in one issue only, such as
what issue 3 of the practice repository says about the phone number. Then open
the tool call the agent made and read what the server returned. VS Code's
documentation lists three checks: a tool from the intended server was called, it
returned without an error and the answer reflects what it returned. It adds: "A
plausible answer alone isn't sufficient."

Then test the limit: ask the agent to create an issue. The read-only address
should leave it without a tool for that, so the agent can only say that it
cannot.

## Troubleshooting

Six things can go wrong:

- The sign-in fails or stops working.
- The project's server never starts.
- There are too many tools.
- The configuration is not read.
- The agent asks about every call, or about none.
- The agent does something you did not ask for.

If the sign-in fails with an error that says the server does not support
"dynamic client registration", the server needs credentials that you create
yourself, such as the token in the example. If a sign-in that worked stops
working, sign in again: in Claude Code with `/mcp` and in Codex with
`codex mcp login <server-name>`.

If the project's server never starts, the tool is waiting for you to trust the
project or to approve the server, as the section on the tools described.
`claude mcp list` shows which.

If there are too many tools, remember that connected servers add their tool
names and instructions to the agent's context "even when you're not using them",
as Claude Code's best practices put it. Turn off the servers you do not need.

If the configuration is not read, look for a warning: Claude Code shows them in
`claude mcp list` and in `/mcp`. A token pasted with a trailing newline gets a
warning about hidden whitespace, and a `${GITHUB_PAT}` that is not set stays as
written, so the server receives that text as the token. A server entry with a
`url` and no `type` is skipped.

If the agent asks about every call, allow the reading tools by name, as the
section on the tools showed for Claude Code, instead of switching the questions
off for the whole server. In Codex, `default_tools_approval_mode = "writes"`
asks for the tools that are not marked read-only. When an agent runs without
you, as with `claude -p`, Claude Code cannot show the approval prompt for a
project's servers and loads them without asking, so read the project's
`.mcp.json` first.

If the agent does something you did not ask for after it has read an issue or a
page, stop the session and read the tool calls it made. The cause may be
instructions in the text it read, as the section on trust described.

## Advanced

The basics above are enough to start. Five things for later:

- Writing your own server.
- Sign-in with OAuth, which has several ways for a client to register with a
  server.
- Protocol extensions, among them long-running tasks and Skills over MCP.
- How Claude Code loads a server's tool definitions only when they are needed,
  called tool search.
- The protocol's dated versions, of which 2026-07-28 is the current one.

## Start small

Pick one system the agent cannot see and that you now copy text from, such as
the issue tracker. Look for a command-line tool first. If there is none, take
the server from the system's own provider and read its documentation.

Connect it to a practice project with reading only, as in the example. Check it
as described above, then ask the question you used to copy text for. Move to the
real project when that works.

Add a tool that writes only when you need one, and keep the approval on for it.
That is our own advice. [Part 7](#part-7) goes through the limits you set in
advance.

## What comes next

The working titles may change along the way.

1. [From AI chat to agentic work](/blog/what-makes-a-chat-an-ai-agent/)
2. [The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/)
3. Give each AI agent a job of its own
4. Skills, for work that must be done the same every time
5. MCP, how an AI agent reaches your other systems (this part)
6. Where the AI agent runs and who starts it
7. <span id="part-7"></span>Set the limits in advance
8. Less steering for every model
