---
title: Why we run an agent-run software factory
description: The first article in a series about the factory behind this site — what Gas City and Beads are, what we took from Steve Yegge's work and what we changed, with one build in real numbers.
date: 2026-09-21
category: ai-journey             # app-development | ai-journey
translationKey: why-we-run-an-agent-run-factory
draft: false                     # published — set true to keep it out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: true              # a person has read it
---

Addable Labs builds software largely with AI agents, and since September 2026
this website has been built and maintained by what we call the factory: a
small team of coding agents organised like a company, coordinating through a
shared issue tracker, with one person in charge. The article [How this site
was built by agents](/blog/how-this-site-was-built-by-agents/) told the story
of one build; this series describes the setup itself, one layer at a time,
starting with the obvious question: why run something like this at all, and
what is it built on?

## What one agent and one person could not do

nivå was built the other way round: one
coding agent and one person, 480 commits in 26 days, every one co-authored
by the agent. That setup does not start from nothing. A file of working
agreements, four written routines — review, gates, deploys and content
changes — eighteen notes the agent keeps for itself, ten of them things we
have corrected, a progress log with an entry per session and 105 recorded
decisions carry the work from one session to the next.

What that setup cannot do is talk to anyone but us. On 12 September, with
four agents on one computer, each on its own project, we had the nivå agent
write a message we could carry to the other three by hand, and pasted it
into the rules file every agent on the machine reads first. Every task
starts with us, and when two sessions need to know about each other, we
carry the message. That does not scale to agents that plan, build, review
and publish while we do something else, and it keeps us in details we do not
want to be in.

{% figure "ledger" %}

Three things had to change: the work had to sit in a shared ledger that any
session could claim from, not in one project's notes; sessions had to hand
work to each other and follow it up without a person in between; and the
person in charge had to be involved at a few known points — a plan to approve,
a branch to read before it is pushed — instead of all the time.

## Steve Yegge's iterations

The setup we run is built on open-source work that Steve Yegge started in
October 2025 with [Beads](https://github.com/gastownhall/beads), an issue
tracker he describes as memory for coding agents rather than a to-do list for
people. In January 2026 came [Gas
Town](https://yegge.ai/essays/welcome-to-gas-town/), his orchestrator: up to
thirty agent sessions coordinating through Beads, a dozen or so active at a
time, with a fixed cast of roles and a thesis we have adopted wholesale, in
his words: "an agent is not a session" — sessions are disposable, the work is
persistent. In April 2026 [Gas
City](https://yegge.ai/essays/welcome-to-gas-city/) arrived: in his words,
"Gas Town, but torn apart and rewritten from the ground up as an SDK for
building your own dark factories". He is careful to say that he did not write
it — Julian Knutsen and Chris Sells did. Then in August 2026, "[Fences, not
Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/)" described the
organisation of fifty to sixty agents he runs, governed by written rules
rather than by containment.

{% figure "timeline" %}

We went through all of that on 20 September 2026 and found that nearly
everything we wanted — a factory per project, a coordinator you can talk to,
delegation with follow-up, one shared ledger — already existed, was actively
maintained and MIT-licensed. We built on it rather than build another
orchestrator, and ran the first build the same afternoon.

## Gas City and Beads, briefly

{% figure "setup" %}

Beads is a command-line issue tracker backed by a version-controlled
database. Every unit of work is a bead — a task, a message between agents,
the record of a session — with dependencies between them. A bead blocked by
another is not offered to any agent, which is how order is kept without a
central scheduler. An agent claims a bead, works, writes down what it did
and closes it; if its session dies halfway, the bead stays open for the next
one.

Gas City is the orchestrator around that ledger and hard-codes no roles. An
agent is configuration: a name, a prompt, a scope. A formula is a workflow
written as steps and dependencies; applied, it becomes a graph of beads that
the orchestrator drives to completion, restarting sessions that crash. Packs
bundle agents and formulas so that a methodology can be pinned like a
dependency. The maintainers' own rule for the framework is that it "moves
work; it doesn't reason about it" — the judgement lives in the prompts.

## What we took, and what we changed

We took the principles as they are. Work persists, sessions do not. Roles are
configuration, not code. Planner, builder and reviewer are different agents,
and review runs in several lanes. Rules are written in the files every session
reads first. And, from the "Fences" essay, governance by refusal rather than
by cage — a fence, in the definition he quotes, is "any mechanism that turns
you away if you aren't supposed to be there".

Yegge runs fifty to sixty agents; we run a handful of sessions at a time on
one computer and mean to run one factory per project — so far there is one,
for this site. The org chart is small: one mayor, and a floor of roles taken
as they are from the upstream starter pack — requirements, plan, plan
review, decomposition, implementation, three review lanes, a publisher —
each started as a session when a build step needs it and retired afterwards.
Our own contribution so far is the mayor's prompt, limits on how many
sessions one computer runs at once and the rules of a shared machine. The
founder's gate sits at the plan, since the second build. No agent pushes on
its own: publishing means a branch we read locally, and nothing reaches
GitHub until we say so. We talk to the mayor over Discord.

## One build, in numbers

The redesign of this site was the factory's second build, and the documents
it wrote are in the repository. It began on 20 September 2026 at 17:34 UTC
with a short brief, and the review report was finalised at 00:14 the next
morning: six hours and forty minutes of wall-clock time. In between, the
requirements step produced 31 requirements with acceptance criteria; the
plan step rendered three design directions as real pages — we were already
looking at them on the preview server and picked one within two minutes of
being asked — and approved the reviewed plan at 19:45; the decomposition
produced ten work items; one implementation worker, in four sessions, worked
through them in 22 commits; and three review lanes found two required fixes,
made by a fix lane before the report was written. The branch ended at 39
commits touching 90 source files, passing ten automated gates, 101 tests and
Lighthouse scores of 97 to 100 on all seven pages it checks. Our part was
six short messages while the run was on — the pick, our corrections, the
plan-gate answers — and, next morning, our verdict on the finished page. The
run itself was 112 beads, 17 agent sessions in ten roles and ten mails
between the mayor and the floor that we never had to carry; nothing went
public on the agents' own say-so.

{% figure "build", "wide" %}

The first build, earlier the same day, took about four hours for 27
requirements and ten work items, needed one required fix and had no gate
before the end: we saw the result when it was done and did not like the look
of it. Neither run was flawless. In the first, a session claimed a
bookkeeping record instead of its task and needed fourteen minutes to work
around it; it wrote the fix into its notes, and when the second build's
first session hit the same race, it was on its task within a minute. Both
runs left us a list of open items; we consider those lists part of the
product.

## Thanks

None of this would exist without Steve Yegge's willingness to build in public
and to release Beads and Gas Town under a licence that let us build on them,
nor without Julian Knutsen, Chris Sells and the community around the Gas Town
Hall organisation, who made Gas City. Thank you. The code is on GitHub — [Gas
City](https://github.com/gastownhall/gascity),
[Beads](https://github.com/gastownhall/beads) and the [packs
registry](https://github.com/gastownhall/gascity-packs) — and the essays are
on Yegge's site: [Welcome to Gas
Town](https://yegge.ai/essays/welcome-to-gas-town/), [Welcome to Gas
City](https://yegge.ai/essays/welcome-to-gas-city/), [Fences, not
Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/) and [Beads Best
Practices](https://yegge.ai/essays/beads-best-practices/).

## What comes next

The next articles take the setup one layer at a time — the roles, the beads
the agents communicate through, the life of a request, the rules a change has
to pass, what the founder sees and decides, what went wrong and what it costs.
