---
title: "Cleaning up Gaimer: Tetris and Pong, before and after"
description: On 24 and 25 September 2026 the factory merged 45 pull requests into Gaimer, the desktop app that makes a small game from a description. What they changed, and a Tetris and a Pong made with its system prompt from before and after, to play in the page.
date: 2026-09-25
category: app-development        # app-development | ai-journey
translationKey: cleaning-up-gaimer
draft: true                      # built locally, left out of the public build (see README)
aiGenerated: true                # AI produced this text
humanReviewed: false             # true once a person has read it
---

[Gaimer](https://github.com/addable-labs/gaimer) is a desktop app that
makes a small game from a description. You type what you want, "Pong" say,
and it asks the AI provider you connect, OpenAI with your own API key or
Claude through your own Claude Code, for a whole game in JavaScript, which
it saves and runs in a sandboxed page. It is open source under the MIT
licence and runs on macOS, Windows, Linux and iOS.

On 24 and 25 September 2026 the factory, the [agent-run software
factory](/blog/why-we-run-an-agent-run-factory/) behind this site, merged
45 pull requests into Gaimer, 72 commits in all, each saying why it was
made and what was checked. Tetris and Pong, made with the old and the new
system prompt, then show what the new prompt does. All four games can be
played here.

{% figure "merges", "wide" %}

## What changed

### Opening and saving games

A saved game could refuse to open ("Missing required field: title") once
its progress had been saved: the app sometimes read the progress as the
game. "Restore progress?" never appeared, because the dialog it needs was
not installed. A saved game now opens at once, not after a one-second wait,
and a new game that arrives while a saved one is open takes its place.
Deleting a game asks first, and a save that cannot work says why at once.

### Errors a game throws

A syntax error in a game's code used to stop the page's only script: the
player saw a dark canvas and no message. The game's code now runs in a
script of its own, and every error reaches the app. On WebKit, which runs
the app on macOS and iOS, errors showed only as "Script error.", and the
built app's policy refused the script that reports them; both scripts now
load from `data:` URLs, which fixes both. An error comes with its line and
column in the game's code, or a note that it was found after the end of it,
and code cut off mid-expression now fails as a syntax error.

### The Claude connection

Each game used to be a full Claude Code session and is now one plain
completion, with most of the user's own setup kept out. A call past the
app's limit is now stopped instead of running on the user's subscription,
and a failed call says why instead of "Exit code 1".

{% figure "connection" %}

### Security

The main window's Content Security Policy no longer allows requests to
Anthropic's API or images from any https address, neither of which the app
uses. The shell permission, which let any script in the window run any
command as the user, allows only the three command lines the app builds.
The OpenAI API key, kept in a vault whose password and salt were in the
repository, is now in the system keychain.

### Cleanup

What nothing used was removed: an HTTP plugin built into the app but never
called, which took 31 crates out of the Rust build; template leftovers; a
store nothing read, methods nothing called and two one-time data moves that
could no longer find anything. The dependencies were updated within their
ranges, which cleared all 22 findings of the package audit.

### Tests and CI

Tests that could not fail were replaced, tests were added where a
regression would reach the user, and coverage got a floor: 94 % of
statements, 89 % of branches, 90 % of functions and 96 % of lines, the
levels reached, rounded down. The unit tests went from 101 to 399. CI moved
from Node 20, out of support since 30 April, to Node 24 and current
actions, with a read-only token, and checks the Rust code's formatting and
lints. It builds the app for Linux, macOS, Windows and iOS on every pull
request; after the last merge, all four passed.

### The new system prompt

A game is made in one call, from Gaimer's system prompt and the user's
description. The old prompt said how to answer, where the game runs, that
it must take keyboard and touch, and how to save and restore, but nothing
about how a game should look or feel. The
[rewrite](https://github.com/addable-labs/gaimer/pull/40) keeps that
contract and adds sections on look, play and speed: one visual style,
particles and a small screen shake, a start screen, a best score, a smooth
rise in difficulty, sound made in code, movement by frame time, and pointer
events, so that a mouse works as well as a finger. It asks for "a few
hundred lines" of code and grew the prompt from 2,830 characters to 6,873.
Its pull request calls it a draft for reading, written without calling an
AI provider or running a game made with it.

### The automatic fix round

A new game that fails as it starts now goes back once to the provider that
wrote it, and the fixed game takes its place. That means an error before the
game is ready, in the five seconds after that or, since the new prompt asks
every game for a start screen, in the five seconds after the player's first
tap, click or key press.

### Changing the open game

With a game open, the description box now changes that game. The model
answers with change blocks, each a piece of the code and its replacement,
or with the whole game, changed, which the app takes as it is.

{% figure "lifecycle", "wide" %}

## How the games were made

Each game was made the way Gaimer's Claude provider made one at the time:
the same command line, run the same way, with the one-word request "Tetris"
or "Pong" and the model Gaimer uses for Claude when none is chosen. Only the
system prompt differs: the one from before the cleanup, unchanged since 1
April, or the one the cleanup wrote. Each answer was read with the app's own
code, and each game runs in a game page built like the app's of its version,
less what only the app holds, such as its save files.

{% figure "price", "wide" %}

The first call for Tetris with the new prompt ran past the app's limit at
the time, 300 seconds, and was stopped there, as the app would have done: in
Gaimer that meant the error "Command timed out" and no game. The Tetris
shown comes from a second call, made the same way without the limit. The
factory has since raised the limit to [15
minutes](https://github.com/addable-labs/gaimer/pull/51). All four started
with no error, so neither game from after the cleanup needed the fix round.

Play runs a game where its start screen is, and the keys then go to the
game, not the page. One game runs at a time.

{% games "tetris" %}

The Tetris from before the cleanup starts at once, with no start screen. It
always draws five touch buttons along the bottom and takes touch through
touch events only, so a mouse does nothing in it. It shows the score,
level, lines and next piece, outlines where the piece will land and pauses
on P. The one from after named itself Neon Block Drop and put TETRIS on its
start screen. It waits for a tap, a click or a key, draws rounded blocks in
a framed well, keeps a best score, shows touch buttons only once the screen
is touched, and clears lines with a sound, particles and a small shake.

{% games "pong" %}

The Pong from before the cleanup also starts at once, with the ball already
in play. Its paddles are flat bars, it takes the arrow keys, W and S or a
dragged finger, and it has no sound. The one from after opens on a start
screen, draws glowing paddles and a ball that throws off particles where it
hits, and shows the score, the best score and a level along the top. It
plays sounds, takes a drag from a finger or a mouse, draws two arrow
buttons after a touch and, on a screen taller than it is wide, puts the
paddles at the bottom and the top.

The pairs show that the prompt's new sections reach the games. Both games
from the new prompt are longer, and their calls produced about two to two
and a half times as many output tokens.

Those calls also took longer. When the factory later timed the app's own
call at Claude Code's default effort, a Pong took 194 seconds and a Tetris
488, and most of each answer was thinking: 63 % and 79 % of the output
tokens. At the lowest effort, a Pong took 53 seconds and two Tetris games 70
and 60, with next to no thinking, and all three still had the start screen,
best score, sound, touch play, saving and restoring and movement by frame
time, though one Tetris could not be played with a mouse. Each was a single
game, not a benchmark.
[PR #53](https://github.com/addable-labs/gaimer/pull/53) made Gaimer ask for
every game at low effort, and Settings now offers, for the default model,
"Low · about a minute", "Medium · 1–5 minutes" and "High · 3–8 minutes".
