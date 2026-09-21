---
title: Why we run an agent-run software factory
description: The first article in a series about the factory behind this site — what Gas City and Beads are, what we took from Steve Yegge's work and what we changed, with one build in real numbers.
date: 2026-09-21
category: ai-journey             # app-development | ai-journey
translationKey: why-we-run-an-agent-run-factory
draft: true                      # published, but labelled "Draft" / "Utkast"
machineTranslated: false         # Swedish files: true until a person has reviewed the text
---

Addable Labs builds software largely with AI agents, and since September 2026
this website has been built and maintained by what we call the factory: a
small team of coding agents organised like a company, coordinating through a
shared issue tracker, with one person in charge. The [How we work](/#how) section on the
landing page says this in four lines, and [an earlier article](/blog/how-this-site-was-built-by-agents/)
told the story of one build. This series describes the setup itself, one layer
at a time, starting with the obvious question: why run something like this at
all, and what is it built on?

## The problem with one very good agent

A single coding agent in a terminal is remarkably productive and remarkably
forgetful. Every session starts from nothing. A task that outgrows one session
is lost in the handover unless a person carries it across, and that person ends
up being the memory, the scheduler and the reviewer of the whole operation. That
does not scale to a company that wants agents to plan, build, review and
publish while the founder does something else.

Three things had to be true first. The work had to be written down somewhere
every agent could read it, so that any session could pick up where another
left off. Review had to be done by a different agent than the one that wrote
the code. And the person in charge had to be involved at a few known points —
a plan to approve, a branch to read before it is pushed — instead of all the
time. We did not want to build that machinery ourselves, and it turned out we
did not have to.

## Steve Yegge's iterations

The setup we run is built on open-source work that Steve Yegge started in
October 2025 with Beads, an issue tracker designed to be the memory of coding
agents rather than a to-do list for people. In January 2026 came Gas Town, his
orchestrator: twenty to thirty agent sessions coordinating through Beads, with
a fixed cast of roles and a thesis we have adopted wholesale — an agent is not
a session; sessions are disposable, the work is persistent.
In April 2026 Gas City arrived: in his words, "Gas Town, but torn apart and
rewritten from the ground up as an SDK for building your own dark factories".
He is careful to say that he did not write it — Julian Knutsen and Chris Sells
did. Then in August 2026, "Fences, not Sandboxes" described the organisation
of fifty to sixty agents he actually runs, governed by written rules rather
than by containment.

We went through all of that in September 2026 and found that nearly
everything we wanted — a factory per project, a coordinator you can talk to,
delegation with follow-up, one shared ledger — already existed and was
actively maintained; Gas City and Beads are both MIT-licensed. We decided to
build on them rather than build another orchestrator.

## Gas City and Beads, briefly

Beads is a command-line issue tracker backed by a version-controlled database.
Every unit of work is a bead — a task, a message between agents, the record of
a session — with dependencies between them. A bead with an open blocker is
invisible to the agents, which is how order is kept without a central
scheduler. An agent claims a bead, works, writes down what it did and closes
it; if its session dies halfway, the bead stays open and the next session picks
it up.

Gas City is the orchestrator around that ledger, and it hard-codes no roles. An
agent is configuration: a name, a prompt, a scope. A formula is a workflow
written as steps and dependencies; applying one turns it into a graph of beads
that the orchestrator drives to completion — fanning out, gating, retrying and
restarting sessions that crash. Packs bundle agents and formulas so that a
whole methodology can be imported and pinned like a dependency. The
maintainers' rule is that judgement lives in the prompts, not in the
framework: it moves work; it does not reason about it.

## What we took, and what we changed

We took the principles as they are. Work persists, sessions do not. Roles are
configuration, not code. Planner, builder and reviewer are different agents,
and review runs in several lanes. Rules are written where the agents read them
when they wake up. And, from the "Fences" essay, governance by refusal rather
than by cage — a fence, in Yegge's definition, is "any mechanism that turns
you away if you aren't supposed to be there".

What we changed is mostly scale and shape. Yegge runs fifty to sixty agents;
we run a handful of sessions at a time on one laptop, one implementation
session per project, and one factory per project so that each can be started,
stopped and upgraded on its own. The org chart is deliberately small: a mayor
the founder talks to, and a factory floor — requirements, plan, decomposition,
implementation, three review lanes, a publisher — that exists only as steps in
a formula, never as standing sessions. A project lead per repository is next.
The floor roles come unchanged from the upstream starter pack; our own
contribution is the shape around them, the written rules and the habits of a
shared machine. The human gate sits at the plan for every
build, and no agent pushes anything: publishing means a branch the founder
reads locally, then pushes and opens as a pull request himself. He talks to
the mayor over Discord.

## One build, in numbers

The redesign of this site is the second build the factory has run, and the
documents it wrote are in the repository. It began on 20 September 2026 at
17:37 UTC with a short brief, and the review report was finalised at 00:14
the next morning: about six and a half hours of wall-clock time. In between, the requirements step produced 31 numbered requirements with
acceptance criteria; the plan step rendered three design directions as real
pages, the founder picked one two minutes after seeing them and approved the
plan at 19:44; the decomposition produced ten work items; one implementation
session worked through them in 31 commits; and three review lanes found two
required fixes, made by a fix lane before the report was written. The branch
ended at 39 commits touching 90 source files, passing ten automated gates and
101 tests, with Lighthouse scores of 97 for performance and 100 for
accessibility, best practices and SEO on all seven pages it checks. The
founder was involved at three points — the pick, the plan gate and reading
the branch afterwards — and nothing went public on the agents' own say-so.

The first build, the day before, took about four hours for 27 requirements and
ten work items and needed one required fix. Neither run was flawless: one step
in the first run started on the wrong item and was handed back, and both runs
left a list of open items for the founder. We consider those lists part of the
product.

## Thanks

None of this would exist without Steve Yegge's willingness to build in public,
to write about what broke as plainly as about what worked, and to release Beads
and Gas Town under a licence that let us build on them. Gas City itself is the
work of Julian Knutsen and Chris Sells and the community around the Gas Town
Hall organisation. Thank you. The code is on GitHub — [Gas City](https://github.com/gastownhall/gascity),
[Beads](https://github.com/gastownhall/beads) and the
[packs registry](https://github.com/gastownhall/gascity-packs) — and the essays
are on Yegge's site: [Welcome to Gas Town](https://yegge.ai/essays/welcome-to-gas-town/),
[Welcome to Gas City](https://yegge.ai/essays/welcome-to-gas-city/),
[Fences, not Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/) and
[Beads Best Practices](https://yegge.ai/essays/beads-best-practices/), indexed
on [his Gas Town page](https://yegge.ai/gastown).

## What comes next

The next articles take the setup one layer at a time: the roles and who talks
to whom; beads as the medium the agents communicate through; the life of a
request, from the founder's message to a commit he can merge; the rules a
change has to pass; what the founder actually sees and decides; what went wrong
and what it costs; and where this goes next. Everything in them will be traceable
to a repository or an essay, and each article carries a draft label until the
founder has read it.
