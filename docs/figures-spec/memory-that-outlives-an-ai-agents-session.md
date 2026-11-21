# Figure spec: "Memory that outlives an AI agent's session"

For the builder. The article `memory-that-outlives-an-ai-agents-session` (English and Swedish, a
draft) calls five figures with `{% figure "<id>" %}`; none is drawn yet, so the
build fails with `Unknown figure` until they are. Each figure below gives its
id, where it stands, what it shows, and every string it needs in both
languages in the keys the figure system reads (`title` = the accessible
description of the drawing, `head`, the labels, `caption`). Draw the five as
one family, and the same family as the five figures of
`what-fills-an-ai-agents-context` (its spec is `docs/figures-spec/what-fills-an-ai-agents-context.md`):
the same bar for the context window, the same colour for each kind of layer
(start-up layer, files, command output, conversation, summary, written note).
Do not call that article's figure ids from this article; draw the bar again.

Drawing rules from the brief: relative sizes only, no token numbers, no vendor
names, tool names or model names in a label. A figure is not decoration: the
text next to it interprets it, so the caption states what to look at and does
not repeat the paragraph. New in this family: a store (a drawer or a box of
cards) for text that lives outside the window, drawn once the same way in all
five, and a card for one written note. A card or entry that is wrong or
hostile (figure 5) must be marked by a shape or a symbol as well as by colour.

The bar: a tall rounded rectangle standing for the context window, filled from
the bottom. An empty part is outlined only, never grey fill.

## 1. `memory-written-and-loaded` (after the first paragraph of the section "Memory is what an agent writes down and reads again"; placement "wide")

Shows: two bars side by side with a store between and below them. Left, a session's bar filled to about half (start-up layer, files, conversation), its outline dashed at the top to show that it ends. Under the bar a short label that the session ends. An arrow from the bar down into the store, labelled "written down": one card leaves the bar. The store holds a few cards and stands on a line labelled "outside the context window". Right, a new bar that is almost empty: the start-up layer at the bottom, and inside that layer a thin band in the written-note colour. An arrow from the store up into the new bar, labelled "loaded back at the start".

| Key | English | Swedish |
| --- | --- | --- |
| title | Two sessions as bars with a store of notes between them. The first session's bar ends. A note leaves it and is written into the store. The next session's bar starts almost empty, with the start-up layer and the note read back from the store. | Två sessioner som staplar med ett förråd av anteckningar mellan sig. Den första sessionens stapel tar slut. En anteckning lämnar den och skrivs in i förrådet. Nästa sessions stapel börjar nästan tom, med start-lagret och anteckningen som läses tillbaka från förrådet. |
| head | A memory is written down and read again | Ett minne skrivs ner och läses in igen |
| session1 | session | session |
| session2 | next session | nästa session |
| ends | the session ends, its context goes | sessionen slutar och dess kontext försvinner |
| store | memory: notes outside the context window | minne: anteckningar utanför kontextfönstret |
| write | written down | skrivs ner |
| read | loaded back at the start | läses in igen i början |
| startup | start-up layer | start-lager |
| note | a written note | en skriven anteckning |
| caption | The bar goes with the session; the store does not. What the agent wrote to it comes back as part of the next session's start-up layer, so a memory takes room in every request, like the rest of that layer. | Stapeln försvinner med sessionen, förrådet gör det inte. Det agenten skrev dit kommer tillbaka som en del av nästa sessions start-lager, så ett minne tar plats i varje begäran, som resten av det lagret. |

## 2. `memory-file-or-memory` (after the paragraph "The reason is who has checked the text"; placement "wide")

Shows: two columns side by side, each a tall card with a heading and three short lines, and a small third card under them. Left column "The instruction file": written by people, reviewed in a pull request, the same on every computer. Right column "Memory": written by the agent, nobody has to have read it, may be old or wrong. A curved arrow runs from a card in the right column to the left column, with a small person symbol at the arrow's start, labelled "moves once a person has checked it". Under both columns a smaller card, drawn lighter, "Work in flight: a hand-off", with no arrow to either column.

| Key | English | Swedish |
| --- | --- | --- |
| title | Two columns: the instruction file, written and reviewed by people and the same on every computer, and memory, written by the agent and possibly old or wrong. An arrow moves one fact from memory to the file once a person has checked it. A small card below stands apart: work in flight belongs in a hand-off. | Två kolumner: instruktionsfilen, skriven och granskad av människor och likadan på varje dator, och minnet, skrivet av agenten och möjligen gammalt eller fel. En pil flyttar ett faktum från minnet till filen när en människa har kontrollerat det. Ett litet kort nedanför står för sig: pågående arbete hör hemma i en överlämning. |
| head | Rules in the file, recall in memory | Regler i filen, återkallande i minnet |
| fileHead | The instruction file | Instruktionsfilen |
| file1 | written by people | skriven av människor |
| file2 | reviewed in a pull request | granskad i en pull request |
| file3 | the same on every computer | likadan på varje dator |
| memHead | Memory | Minnet |
| mem1 | written by the agent | skrivet av agenten |
| mem2 | nobody has to have read it | ingen behöver ha läst det |
| mem3 | may be old or wrong | kan vara gammalt eller fel |
| move | moves once a person has checked it | flyttas när en människa har kontrollerat det |
| flight | work in flight: a hand-off | pågående arbete: en överlämning |
| caption | A fact crosses from the right to the left only through a person. Work in flight is neither: it goes in a hand-off. | Ett faktum går från höger till vänster bara genom en människa. Pågående arbete är ingetdera: det hör hemma i en överlämning. |

## 3. `memory-where-it-lives` (after the paragraph on Copilot's experimental repository file, before "In the figure, a memory in a home folder reaches only …"; placement "wide")

Shows: a small matrix. Three columns, the places that start a session, each drawn as a small box with a start-up bar: "your computer", "a colleague's computer", "a runner". Three rows, the places a memory can live: "a folder on your computer", "a file in the repository", "a vendor's store". Lines from each row to the columns it reaches. Row 1 reaches only the first column. Row 2 is drawn through a repository box in the middle and reaches all three columns with solid lines. Row 3 reaches the columns with dashed lines and a small gate symbol on the line, labelled as limited to the accounts and tools the vendor lets in.

| Key | English | Swedish |
| --- | --- | --- |
| title | A matrix of three places that start a session (your computer, a colleague's computer, a runner) and three places a memory can live. A memory in a folder on your computer reaches only your computer. A file in the repository reaches all three. A vendor's store reaches them only through the accounts and tools the vendor lets in. | En matris med tre platser som startar en session (din dator, en kollegas dator, en runner) och tre platser där ett minne kan ligga. Ett minne i en mapp på din dator når bara din dator. En fil i repot når alla tre. En leverantörs förråd når dem bara genom de konton och verktyg som leverantören släpper in. |
| head | Who can read which memory | Vem som kan läsa vilket minne |
| c1 | your computer | din dator |
| c2 | a colleague's computer | en kollegas dator |
| c3 | a runner | en runner |
| r1 | a folder on your computer | en mapp på din dator |
| r2 | a file in the repository | en fil i repot |
| r3 | a vendor's store | en leverantörs förråd |
| repo | the repository | repot |
| gate | only the accounts and tools the vendor lets in | bara de konton och verktyg som leverantören släpper in |
| caption | A solid line is a memory that anyone with the checkout can read; a dashed line depends on who the vendor lets in; a memory in a home folder has one line. | En heldragen linje är ett minne som alla med en utcheckning kan läsa, en streckad linje beror på vem leverantören släpper in och ett minne i en hemmapp har en enda linje. |

## 4. `memory-runner-starts-empty` (after the first paragraph of the section "A runner starts empty"; placement "wide")

Shows: a timeline from left to right with three states of one runner, each a box. Left, "the job starts": the box is outlined and empty; a solid arrow brings in "the repository, checked out"; two dashed arrows bring in "a cache, restored as it is" (marked with a small warning symbol) and "a store outside the runner". Middle, "the job runs": the box holds the start-up layer and a card, "a note the agent writes". Right, "the job ends": the box is crossed out ("the runner is deleted"). From the middle box three arrows leave towards the right and end outside the crossed box: "a commit", "an artifact", "a cache" (the cache arrow with the same warning symbol). A fourth card, the note, has no arrow and fades out inside the crossed box, labelled "a note with no way out is gone".

| Key | English | Swedish |
| --- | --- | --- |
| title | One runner in three states. At the start it is empty and receives the repository, and possibly a cache and a store outside it. While the job runs it holds a note the agent writes. At the end the runner is deleted: the note survives only if it left as a commit, an artifact or a cache. | En runner i tre tillstånd. I början är den tom och får repot, och kanske en cache och ett förråd utanför den. Medan jobbet körs rymmer den en anteckning som agenten skriver. I slutet raderas runnern: anteckningen överlever bara om den lämnade den som en incheckning, en artefakt eller en cache. |
| head | A runner starts empty | En runner startar tom |
| start | the job starts | jobbet startar |
| run | the job runs | jobbet körs |
| end | the job ends | jobbet slutar |
| repo | the repository, checked out | repot, utcheckat |
| cache | a cache, restored as it is | en cache, återställd som den är |
| store | a store outside the runner | ett förråd utanför runnern |
| note | a note the agent writes | en anteckning som agenten skriver |
| commit | a commit | en incheckning |
| artifact | an artifact | en artefakt |
| cacheOut | a cache | en cache |
| gone | a note with no way out is gone | en anteckning utan väg ut är borta |
| deleted | the runner is deleted | runnern raderas |
| warn | untrusted input | opålitlig indata |
| caption | Only what leaves the runner survives it, and a cache is the one exit that is also an entrance for whatever the next run restores. | Bara det som lämnar runnern överlever den, och en cache är den enda utgången som också är en ingång för det som nästa körning återställer. |

## 5. `memory-poisoned-entry` (after the paragraph that ends "… more with memory, not less" in the section "A poisoned entry"; placement "wide")

Shows: from left to right. Far left, a card "a text from outside" (a web page, an issue) with a small hidden line inside it marked with a warning symbol, "a hidden instruction". An arrow to an agent box (one session's bar), and from the bar an arrow, labelled "written to memory", into the store, which holds four ordinary cards and one card marked by a warning symbol and a jagged outline, "a poisoned entry". Right, three small bars side by side, "every later session", each starting with a start-up layer that contains a copy of the marked card, with arrows from the store to each. Under the right-hand bars an arrow from the bars towards "an action the entry asks for" is stopped by a vertical gate between them, labelled "a limit outside the model".

| Key | English | Swedish |
| --- | --- | --- |
| title | A text from outside with a hidden instruction is read by an agent, which writes it to the memory store as one card among others. Every later session reads the store at the start, and the marked card is in each session's start-up layer. A limit outside the model stands between the session and the action the card asks for. | En text utifrån med en dold instruktion läses av en agent, som skriver den till minnesförrådet som ett kort bland andra. Varje senare session läser förrådet i början och det markerade kortet finns i varje sessions start-lager. En gräns utanför modellen står mellan sessionen och den åtgärd som kortet ber om. |
| head | A poisoned entry | En förgiftad post |
| source | a text from outside | en text utifrån |
| hidden | a hidden instruction | en dold instruktion |
| agent | agent | agent |
| write | written to memory | skrivs till minnet |
| store | memory | minne |
| bad | a poisoned entry | en förgiftad post |
| later | every later session | varje senare session |
| read | read at the start | läses i början |
| action | an action the entry asks for | en åtgärd som posten ber om |
| gate | a limit outside the model | en gräns utanför modellen |
| caption | The entry is written once and read by every session after it. Only the limit after the agent, not a better prompt before it, stops what it asks for. | Posten skrivs en gång och läses av varje session efter den. Bara gränsen efter agenten, inte en bättre prompt före den, stoppar det den ber om. |

## For the builder

- The article's cover is a placeholder (a copy of the cover of "A study of the mayor's context", with that picture's description as its image text, as for `what-fills-an-ai-agents-context`): the gate needs `cover.png`, `cover-600.webp` and `cover-1200.webp` under `src/media/memory-that-outlives-an-ai-agents-session/` and an `imageAlt` that describes the picture. When a cover for this article is drawn, replace all three files and the `imageAlt` in both language files.
- Names to keep out of the drawings: no vendor, no tool name, no model name, no token or percentage figures.
- The article links public repositories the content gate's `PUBLIC_REPOS` list (`scripts/lib/apps.mjs`) does not have yet: `modelcontextprotocol/servers`, `basicmachines-co/basic-memory`, `mem0ai/mem0` and `mattpocock/skills`. `gastownhall/beads` is on the list. (`what-fills-an-ai-agents-context` needs `mattpocock/skills` and `anthropics/claude-code` too, as its own spec says.)
