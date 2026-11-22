---
title: Memory that outlives an AI agent's session
description: "What an AI coding agent writes down so that the next session, the next computer and the next runner can use it: how Claude Code, GitHub Copilot and Codex handle memory in November 2026, what a team shares, what a runner keeps, what can go wrong in a shared memory and what five setups cost to keep up."
image: cover.png                 # a 1200 × 630 PNG in the article's media directory
imageAlt: "Two of the mayor's sessions side by side. The first one's context has filled call by call: the start-up content at the bottom, re-orientation in orange, then the work up to the dashed hand-off point. At the hand-off the mayor writes the state of its work on a card; a new session starts on the same start-up content and reads it first."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: memory-that-outlives-an-ai-agents-session
draft: true                      # a draft — set false to publish it (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # nobody has read it yet
---

A session ends and its context goes with it.
[Claude Code's documentation](https://code.claude.com/docs/en/memory) puts the
starting point plainly: each session begins with a fresh context window.

[What fills an AI agent's context](/blog/what-fills-an-ai-agents-context/)
covers what is in the window during a session. This article covers what is kept
outside it: what an agent writes down, where that is stored, who else can read
it and what can go wrong when a team shares it. It follows the documentation of
Claude Code, Codex and GitHub Copilot as it stood in November 2026 and uses that
article's terms without explaining them again.

A team is what makes the subject hard. A developer's computer, a colleague's
computer and a job on a GitHub runner each start sessions of their own, and what
one of them wrote down is not automatically there for the others.

## Memory is what an agent writes down and reads again

[Anthropic's guide to context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
defines the technique in two halves: the agent writes notes outside the context
window, and those notes get pulled back into the context window at later times.
A practitioner's glossary, Matt Pocock's
[AI Hero dictionary](https://www.aihero.dev/ai-coding-dictionary/memory-system),
names the halves. On the write path the agent records what it learned during a
session as files in the environment. On the read path the tool loads those
files, or an index of them, back into the context window at the start of a later
session.

{% figure "memory-written-and-loaded", "wide" %}

In the figure the session's bar is gone when the session ends, and the store
beside it is not: what was written to it is loaded into the start-up content of
the next session. Three questions decide how a memory behaves: who writes it,
where it is stored and who else can read it. The rest of the article answers
them for each tool and for a team. What is read back lands in the start-up
content and so takes room in every request. It is context and nothing more.
Claude Code's documentation says that it treats CLAUDE.md files and auto memory
as context and not as enforced configuration. To block an action whatever Claude
decides, it points to a hook. What is enforced outside the model is the subject
of [Set the limits in advance](/blog/set-the-limits-in-advance/).

## What the vendors call memory

Claude Code has two things that carry knowledge across sessions: CLAUDE.md
files, which you write, and auto memory, which Claude writes itself from your
corrections and preferences. In auto memory Claude saves notes of four kinds:
about you; about the corrections you give it; about ongoing work and decisions;
and about where to find information outside the project. It skips whatever it
can derive from the codebase or finds in your CLAUDE.md files. Claude does not
save something every session: it decides what is worth remembering by whether
the information would be useful in a future conversation, and it saves what you
ask it to remember.

The notes are plain markdown files in a folder for each repository, with an
index called `MEMORY.md` and one file for each memory. The first 200 lines or
25KB of the index load at the start of a session, and Claude reads the other
files when it needs them. In November 2026 auto memory is on by default in local
sessions and off by default in a session in a self-hosted environment.

GitHub Copilot's memory works differently. According to
[GitHub's documentation](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory),
Copilot creates memories itself as a byproduct of working with you and keeps two
kinds: repository-level facts, which are shared with your collaborators, and
user-level preferences, which follow you between repositories. Saving is a tool
call:
[GitHub's engineering post](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)
describes memory creation as a tool that agents invoke when they discover
something likely to have actionable implications for future tasks, and each
memory is stored with citations, references to the code locations that support
it.

Before using a fact, Copilot checks its citations against the current branch. An
internal voting system rates each memory by whether it is still valid, and
upvoted memories are more likely to be sent to the model. The memories live in
GitHub's cloud and are shared by Copilot in VS Code, in the command line, in
code review and in the cloud agent: a fact captured by one of them can be used
by another.

In Codex, memory is generated from earlier chats instead of being written during
them.
[OpenAI's documentation](https://learn.chatgpt.com/docs/customization/memories)
says that Codex turns useful context from eligible prior chats into local memory
files, skips active or short-lived sessions and redacts secrets from the
generated fields. It updates memories in the background, once a chat has been
idle long enough, instead of at the end of every chat. The files sit in the
Codex home directory, by default `~/.codex`, the documentation calls them
generated state, and in November 2026 local Codex memories are off by default.

So the three tools decide what to save in three ways. Claude Code lets Claude
judge during the session. Copilot has the agent store a fact together with
citations that are checked when the fact is used. Codex generates memory from
finished chats in the background. Two of them keep the result in a folder on one
computer, and Copilot keeps it with GitHub.

## Rules belong in the file and memory is for recall

All three vendors draw the line in the same place. OpenAI's documentation says
to keep required team guidance in `AGENTS.md` or checked-in documentation and to
treat memories as "a helpful recall layer, not as the only source for rules that
must always apply". VS Code's documentation notes that repository facts are
shared and not private notes, and says to keep reviewed team requirements in
source-controlled project documentation or custom instructions.

GitHub's documentation describes a division of labour: use custom instructions
for important rules, such as a security requirement or a mandatory review step,
and let Copilot Memory handle the accumulated detail that would otherwise make
an instructions file long and hard to maintain. Claude Code's page sorts them by
purpose: CLAUDE.md files to guide Claude's behaviour, auto memory to let Claude
learn from your corrections.

The reason is who has checked the text. A person writes the instruction file,
described in
[The instruction file, the first thing an AI agent reads](/blog/the-instruction-file/),
and a colleague can review it in a pull request. An agent writes the memory, and
nobody has to have read it. GitHub's documentation is plain about the
consequence: because Copilot's check of a fact's citations is a judgement it
makes, rather than a guarantee enforced by the system, a stored fact should not
be relied on as a rule that will always be followed.

{% figure "memory-file-or-memory" %}

In the figure a fact moves from the agent's notes to the file once it has proved
stable. VS Code's documentation gives the steps for repository memory that has
become stable and useful to the team: verify the information against the
repository's code and configuration, move it to the project document or
instructions file, review the change through the repository's normal process and
update or remove the local memory to avoid stale or conflicting copies.

A third kind of text belongs in neither: work in flight. Matt Pocock, a
practitioner, puts the line this way in his
[handoff guide](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md):
"If you keep re-explaining a fact, it belongs in `CLAUDE.md`. A half-finished
task belongs in a handoff." The hand-off is the subject of the article on
context.

## What a team shares is what it commits

A colleague's computer and a runner both start from the repository and not from
your home folder. Part 6 of the series,
[Where the AI agent runs and who starts it](/blog/where-the-agent-runs/),
describes the rule for a cloud run: what you commit is there, and what you have
configured only on your own machine is not. Memory follows the same rule.

Claude Code's auto memory is machine-local: all worktrees of a repository share
one folder, and the files are not shared across machines or cloud environments.
What travels with the repository is what is committed: the project CLAUDE.md,
shared with the team through version control, and the `project` scope of a
subagent's own memory, which the documentation recommends as the default because
it makes the knowledge shareable through version control. Codex keeps its
memories in a local memory store, so they stay on the computer where Codex ran.

Copilot is the exception, by design, because GitHub keeps its repository facts.
VS Code also has an experimental option that stores them in a file in the
working tree, `.github/copilot-memories.jsonl`. That file can be included in
commits, including commits made by the agent, and the cloud-memory settings and
policies on GitHub do not apply to it.

{% figure "memory-where-it-lives" %}

In the figure, a memory in a home folder reaches only the computer it sits on, a
committed file reaches every computer and runner, and a vendor's store reaches
the accounts the vendor lets in. So "shared" has two meanings: shared as a file,
which travels with the repository and which anyone with the checkout can read
and review, or shared through an account, which depends on who the vendor lets
in.

## A runner starts empty

A job on a GitHub-hosted runner begins in a clean state.
[GitHub's documentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
says that, with the exception of single-CPU runners, each GitHub-hosted runner
is a new virtual machine, and its page on
[dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
says that jobs on GitHub-hosted runners start in a clean runner image. A note
the agent writes during a job is therefore gone when the job ends, unless the
job commits it, uploads it or caches it.

{% figure "memory-runner-starts-empty", "wide" %}

What reaches the runner is the repository that a step of the job checks out. For
Claude Code's GitHub Action the vendor's answer is the committed file:
[its documentation](https://code.claude.com/docs/en/github-actions) says to
create a CLAUDE.md file in the repository root for code style guidelines, review
criteria, project-specific rules and preferred patterns, and to keep it concise,
since Claude reads it on every run.

In the figure, three things can outlive a job, and they are not equal. A commit
can be reviewed like any change and is there for the next run. An artifact is
for files produced by a job that you want to use or view after the run has
ended. A cache is for files that are expensive to regenerate, and GitHub says a
job should always be able to regenerate them.

A cache is a poor place to keep a memory. Any run that can read a cache restores
its contents as they are, GitHub's documentation says. Restored files should
therefore be treated as untrusted input and no secrets should be stored in a
cache. Poisoned caches can lead to code execution in trusted workflows. A memory
file is meant to be followed by the agent, which is the opposite of untrusted
input.

GitHub's own agent keeps its memory outside the job: Copilot's cloud agent is
one of the surfaces that share Copilot Memory, so what it learns is there for
the next task. In programmatic sessions of the command-line tool, memory is off
unless a run passes `--enable-memory`.

## A memory that many agents read has to be trustworthy

A note in one person's folder affects that person's sessions. A fact in a shared
memory, or in a file the whole team commits, affects every session that loads
it, and it is loaded at the start, before anyone has asked anything. Part 5,
[MCP, how an AI agent reaches other systems](/blog/mcp-reaching-your-systems/),
explains prompt injection: text the agent reads can contain instructions that it
follows as if you had written them. A memory turns one such text into start-up
content for all later sessions.

### Who can write

In Copilot, repository facts are created only when Copilot works in a repository
where the user has write access. The app and the interactive command-line tool
can ask you to approve a memory before it is stored, but the cloud agent and
code review do not ask. GitHub's documentation adds that repository facts can be
captured from pull requests that were closed without merging, and that Copilot
is told to check them against the current codebase, which does not guarantee
that it recognises every outdated fact.

### A poisoned entry

A preprint from Fudan University, posted in September 2026, tests poisoning on
Claude Code itself. It hides instructions in ordinary external sources such as
text, images and PDF files, so that the agent writes them to its persistent
memory. They are then triggered in a later session. The setup was a simulated
workspace of email, calendar, shared documents and forms, with Claude Code run
on three language models from other developers. On average the instructions
reached memory in 66.9% of the attempts and led to a leak of private data in a
later session in 81.7% of the cross-session tests. These are averages over one
set of tests, not a rate for your own setup. The authors also tested one
prompt-level defence, which reduced memory injection in many settings but gave
limited protection once the memory had been poisoned. A poisoned instruction is
stopped only if something outside the model stops it. That is why the limits of
part 7 matter more with memory, not less. In the figure the poisoned card sits
in the store and is read at the start of every later session. Only a limit
placed after the agent stops what the card asks for.

{% figure "memory-poisoned-entry", "wide" %}

The vendors' controls aim at the same weak points. GitHub's engineering post
names outdated, incorrect and even maliciously injected memories as its biggest
concern. In its test it seeded repositories with adversarial memories, facts
that contradicted the codebase with citations pointing to irrelevant or
nonexistent code, and across all test cases its agents consistently verified
citations, discovered contradictions and updated the incorrect memories. That is
GitHub's evaluation of its own product, and it covers memories whose citations
do not support them.

GitHub's documentation adds that its system can reject memories that contain
recognised model-control tokens, as a defence against prompt injection. OpenAI's
documentation describes a Codex setting, <code>memories.disable_on_<wbr>external_context</code>,
that keeps chats which used external context such as MCP tool calls, web search
or tool search out of memory generation.

A security researcher's two general lessons from a 2025 write-up on a coding
agent's memory are the simplest controls: systems should suggest memories to the
user rather than adding them automatically, and users should inspect memories
regularly. The second is possible in all the tools above: Claude Code's auto
memory is plain markdown that `/memory` opens, and GitHub lets people with the
right access review and delete repository facts in the repository's settings.

### Secrets

A memory is a plain file that the agent writes and other people can often read,
so a secret that lands in one travels with it. GitHub's documentation says that
memories are checked for secrets such as tokens, keys or credentials and that a
memory in which one is detected is rejected. OpenAI's documentation says that
Codex redacts secrets from generated memory fields but that you should still
review the files before sharing your Codex home directory. VS Code's
documentation says plainly not to store credentials, secrets or sensitive
personal information in memory. Part 5 keeps a token out of files and chat, and
part 7 shows a rule against reading a `.env` file; memory needs the same care.

### Stale facts

The quieter risk is a fact that was true when it was written. The factory behind
this site met it in September 2026. In
[A study of the mayor's context](https://addablelabs.se/blog/what-the-mayors-context-costs/),
a notes log that had become too long to read whole was mostly skipped by new
sessions, which took old facts as current. The change was two things: a state
card rewritten at every hand-off and a reference read in one call, both trimmed
and capped. A practitioner states the general case: a fact recorded in March is
loaded with equal confidence in June, after the project has moved on, and a
memory system needs pruning, the same way AGENTS.md does.

The tools build in some of that pruning. Claude Code reminds the agent, when
`MEMORY.md` nears its limit, to keep one line per entry and to merge or drop
stale entries, and it records when each memory was written so that the age of a
fact is visible. GitHub lets memories expire after a period without
reinforcement, and Copilot can downvote a memory it finds wrong or outdated.

## Five setups and what each costs to keep

The first three setups are the vendors' own. The last two are open-source
projects: practitioners' examples and not vendor guidance, and what is said
about them here is what the projects say about themselves.

### The committed file

The committed file needs no service, and it reaches every computer and runner as
it is. Its weakness is the one every shared document has: it grows until the
agent follows it less well. Claude Code's documentation targets under 200 lines
per file, since longer files consume more context and reduce adherence. It
offers `/doctor prompt-audit`, which looks for instructions written for older
models, references to files or commands that do not exist and files that
contradict each other. The cost is people's time to keep the file true.

### A vendor's cloud memory

Copilot Memory takes the upkeep off people. GitHub's documentation says that it
requires no maintenance from you, adapts as your codebase and your habits change
and discards what stops being relevant. It is available on all paid Copilot
plans, and memories included in a model's context count toward token usage.
GitHub's engineering post reports a gain from its own A/B tests in January 2026:
for the coding agent a 7% increase in pull request merge rates, 90% with
memories against 83% without. Those are GitHub's figures for its own product,
and the risks of the previous section come with it.

### A memory in each home folder

Claude Code's auto memory costs nothing to run. Claude Code excludes the memory
folder from the sweep that deletes old session transcripts, so the notes stay
until you or Claude edits or deletes them. Nothing in it expires on its own,
which makes the pruning yours, and nothing in it reaches a colleague or a
runner. Codex's files are generated state: its documentation says not to rely on
editing them by hand, and the desktop app can reset a machine's whole memory
store.

### A memory server over MCP

A memory server is an MCP server: a program the agent calls to read and write
memories in a store that several agents or tools can share. Connecting one is
the trust decision that part 5 describes, with one addition: what it holds was
written by agents and is read by agents. Nothing loads it at the start by
itself. The agent has to call it, which is why the reference server's README
gives an example prompt that begins every chat by retrieving all relevant
information from the knowledge graph.

The reference server in the Model Context Protocol project's repository
describes itself as "a basic implementation of persistent memory using a local
knowledge graph". It keeps the graph in one file, so there is nothing to host.
Several clients on one computer can share the file, because every write takes a
lock, but the README says that a network file system that does not honour the
lock cannot be shared safely this way and that by default nothing caps the
graph. The repository calls its servers reference implementations and not
production-ready solutions.

[basic-memory](https://github.com/basicmachines-co/basic-memory) (AGPL-3.0)
keeps notes as Markdown files that people and models both read and write, with a
local SQLite index and no servers required. Self-hosted it is free and syncing
between devices is manual, with Git or Syncthing for instance. Its hosted team
workspace costs $15.00 a month, and anything a teammate writes, it says, is
immediately available to everyone else and to their AI assistants. A wrong entry
reaches them as fast as a right one.

[Mem0](https://github.com/mem0ai/mem0) calls itself an intelligent memory layer
for AI assistants and agents, and it is offered as a library, as a self-hosted
server started with `docker compose` or as a cloud platform. Its README says
that Mem0 requires an LLM to function, so beside the server or the subscription
there is a language model to pay for or host. Its extraction only adds: memories
accumulate and nothing is overwritten, which leaves the pruning to you.

### A shared ledger

The factory behind this site keeps its shared state in
[Beads](https://github.com/gastownhall/beads), an open-source tracker whose
README calls it "a persistent, structured memory for coding agents": a graph of
tasks with dependencies in a version-controlled database, in place of markdown
plans. As
[Why we run an agent-run software factory](https://addablelabs.se/blog/why-we-run-an-agent-run-factory/)
describes, an agent claims a bead, works, writes down what it did and closes it.
If its session dies halfway the bead stays open for the next one. According to
the README the database runs inside one process with a single writer by default,
a server mode serves several writers and machines sync through the git remote.
`bd remember` stores durable project facts that `bd prime` injects later, and
the README keeps personal preferences out: they belong in your own tool's
memory.

What it keeps is a different kind of memory from the other four: live state that
several agents must see in the same way, such as who has claimed what and what
is done. That needs one place that every agent reads and writes through the same
commands. The cost is a database and a sync remote to keep healthy.

## What to do first

Read what your agent has already saved: `/memory` in Claude Code, the
repository's Copilot memory settings on GitHub and the `~/.codex` folder for
Codex. Then sort what you find into three kinds of text: rules, recall and work
in flight. What must always hold goes in the committed instruction file,
reviewed like code. A fact that has proved stable moves there from memory, and
the note is deleted. Work in flight goes in a hand-off.

Treat a runner as empty: whatever a job learns is lost unless it is committed,
and a cache is not a place to keep it. Share a store between agents only where
they must see the same live state, and before you connect one, decide who may
write to it, who reads it and how an entry is deleted. Keep secrets out of all
of it. And check the current settings before you rely on a default, since in
November 2026 they differ between the tools and between Copilot's plans.
