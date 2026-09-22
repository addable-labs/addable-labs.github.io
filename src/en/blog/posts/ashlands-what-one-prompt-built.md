---
title: "Ashlands: what one prompt built"
description: One prompt and a fleet of sub-agents produced 94,000 lines of a running game — and could not close the last stretch. What the Gauntlet Loop got right, what it cost, and what the founder brought to the run.
date: 2026-09-22
category: ai-journey             # app-development | ai-journey
translationKey: ashlands-what-one-prompt-built
draft: true                      # published, but labelled "Draft" / "Utkast"
machineTranslated: false         # Swedish files: true until a person has reviewed the text
---

On 31 July 2026 the founder gave Claude Code [one
prompt](https://github.com/addable-labs/ashlands#this-is-an-experiment):
build an action role-playing game at the level of Morrowind, in Three.js,
fan out sub-agents, have a separate harsh critic compare each piece against
the real game side by side, and don't stop until every critic is wowed. No
architecture, no task list, no definition of done. The build ran for three
days; on 10 August, at his request, the agent wrote an evaluation of its own
run. Both are public: [Ashlands](https://github.com/addable-labs/ashlands)
is MIT-licensed, and its [evaluation
report](https://github.com/addable-labs/ashlands/blob/main/EVALUATION.md) is
deliberately weighted toward what went wrong — and is the agent's own
account of its own run, worth remembering for every number below.

The prompt follows the **Gauntlet Loop**, the method Matt Shumer described
in [How to Run a Gauntlet Loop](https://somethingbig.ai/gauntlet-loop): run
it inside an agentic system rather than a chat, state the goal without
prescribing the implementation, give the critic a concrete reference to
compare against, let the lead agent split the work into pieces that can be
judged separately, and never let a builder grade its own work. Others have
run it since; the games they built are collected on [his
site](https://somethingbig.ai/games), several of them very good.

{% figure "gauntlet", "wide" %}

## What came out

About 94,000 lines of TypeScript across 160 files; sixteen subsystems, each
behind a named contract; eighteen quests with dialogue, factions, crime and
a journal; zero binary assets — terrain, materials, sky, flora,
architecture, creatures, music and sound all generated from code. The agent
also built the machinery that judges it: 32 gate checks and 17 end-to-end
checks driving a real browser. At the close the gate was failing 1 of 32,
end-to-end passed 16 of 16, and the game ran at 20 to 35 frames per second
at capture resolution on a MacBook Air.

And it plays: you can walk the world, use skills and finish all eighteen
quests — a script drives every one to its final stage without sticking. What
is open is art direction and frame rate: a palette check failing on one
vantage, stair-stepping where water meets terrain, mottling at distance. Not
a game that falls over — an unfinished one.

## What the method got right

Contracts first: one named interface per subsystem, communicating only
through an event bus, which let sub-agents write terrain, sky, combat and
audio at once with almost no integration conflicts — the report calls it the
decision most responsible for the codebase existing. Builders kept away from
critics: agents grading their own work declared success, independent critics
did not. And negatives as the most valuable output — four of the six rounds
in the closing phase ended with an agent making a change, measuring it,
finding it worse and reverting, keeping the measurement, and each closed a
line of investigation for good.

## What went wrong

The brief's terminal condition, a blind side-by-side against the real game,
never happened: no reference screenshots were ever obtained, so every "beats
Morrowind" score was an agent comparing a frame against its own recollection
— a deviation from the method, whose third principle is to give the critic
something concrete to inspect.

The most expensive failure was not bad code but confident wrong diagnosis.
One vantage rendered as a flat terracotta wash, and three rounds of
sub-agents were sent to the terrain material, the lighting and the
atmosphere; all three measured correctly, found nothing and reverted. The
cause was one missing distance term in the camera-placement search, which
had climbed to the nearest high shoulder and aimed point-blank at the peak:
no shader change can fix a frame with no depth in it. A second multi-round
hunt was the same bug class.

## The human in the loop

The report is the agent's voice, and it is thin exactly where the human was
decisive: the founder played the game as it was built and steered it. The
first-person arms took about eleven rounds. On 1 August: "Those are really
bad arms! Fingers go the wrong way and arms look like pipes rather that real
arms." Later that day: "The hand looks like a left hand, but the player is
holding the sword in its right hand." That evening he compared it to early
image generation, where horses had five legs, and asked for the arm to be
started over from a picture rather than patched. On 2 August, with a
screenshot: "the knockles should be on the right side of the hand, not the
left", then "if you dont get the hand right this time, i want you to
research how others do it". The agent's own summary of 3 August is blunter
than the report: "User feedback each time was correct and mine was not."

The frame rate went the same way: every sub-agent wanted 60 frames per
second on a fanless laptop, none got near it, and it was the founder who
proposed why — several agents were testing at once, each driving its own
browser and GPU, so what each measured was not what a player would see. "We
are doing all development on a MacBook Air. FPS will not become perfect.
Also some other agents are working too. Keep going," he wrote on 1 August.
The report records that collision as a finding of its own — a load average
of 37 on eight cores — and credits "the user" in one clause.

Then he asked for the two things the run was missing: "Build the regression
gate, and think about how we can transition from random walk workflow to a
highly structured and intentional map of steps you need sub-agents to take."
Both are in the repository now: the gate nothing merges without, and a
pipeline that serialises verification to one browser and allows one change
to the global look per round — a factory, arriving from inside a
single-prompt run, two days in.

## What it cost

Over three days the run spawned 242 sub-agents across 34 workflow
launches — at most seven alive at once, and never ten. They are
short-lived, a median of forty minutes, so the total climbed while the
number running together stayed small: five or more for seventeen of the
seventy-two hours, the crowd behind that load average of 37.

{% figure "fleet", "wide" %}

The last six of those 242 ran in the closing phase and five completed:
about 1.32 million tokens and 654 tool calls over roughly 3.8 hours, for
one shipped visual fix and four closed investigations. The sixth died
before reading a file when the account hit its weekly token limit — the
ceiling on this method is quota, and quota arrives without warning. About a
million of those tokens went into the one vantage whose cause was that
missing distance term.

{% figure "agents" %}

## Where the loop fits

The report's closing argument, which it marks as opinion rather than
measurement, is that the cost of the loop is set by the critic and not the
builder. The builder side worked; judging the work is what consumed the
tokens, and this run had close to a worst-case critic on every axis. Two
questions predict the outcome better than anything else: is there an
executable oracle that answers yes or no without a model's opinion, and does
a failing check name the thing to fix? Porting a library, implementing a
spec, optimising for speed, balancing a card game over a hundred thousand
simulated matches — all yes. A renderer with no reference imagery: no on
both counts.

{% figure "critic" %}

## What we take into the factory

We run agents the other way round — stages, gates, a ledger and a founder
review before anything is published, which is how [this site was
built](/blog/how-this-site-was-built-by-agents/) and what the [factory
article](/blog/why-we-run-an-agent-run-factory/) describes. This run was
steered, and the steers are in the repository: the arms, the frame-rate
diagnosis, the gate and the map of steps. The instruments were built
during the loop by the agent whose work they judged, and were wrong seven
times. So, for our own runs: build the instrument first and calibrate it
against a known defect, put the reference in the critic's hands before the
first round, and keep a person where an agent cannot tell you it is wrong.
Contract-first decomposition, builders kept away from critics and a clean
negative treated as a complete answer — those we take as they are.

The method is what got 94,000 lines running at all, and the report closes
by adding to it: a revised starting prompt for anyone rerunning this,
whose addition is how the work is to be verified — name the reference,
name the instrument, say what a pass looks like before the first agent
starts. Run it that way and this run would have ended further along.

*Morrowind is named here only as the design target the experiment measured
itself against; Ashlands contains no assets from those games. The Elder
Scrolls and Morrowind are trademarks of ZeniMax Media.*
