# Figure spec: "What fills an AI agent's context"

For the builder. The article `what-fills-an-ai-agents-context` (English and Swedish, a
draft) calls five figures with `{% figure "<id>" %}`; none is drawn yet, so the
build fails with `Unknown figure` until they are. Each figure below gives its
id, where it stands, what it shows, and every string it needs in both
languages in the keys the figure system reads (`title` = the accessible
description of the drawing, `head`, the labels, `caption`). Draw the five as
one family: the same bar for the context window in all of them.

Drawing rules from the brief: relative sizes only, no token numbers, no vendor
names in a label, no model names. A figure is not decoration: the text next to
it interprets it, so the caption states what to look at and does not repeat
the paragraph. Layers keep one colour each across the five figures: start-up
layer, files, command output, conversation, summary, written note.

The bar: a tall rounded rectangle standing for the context window, filled from
the bottom. An empty part is outlined only, never grey fill.

## 1. `context-before-you-type` (after the section "Part of the context is there before you type")

Shows: one bar for the window, almost empty. A thin start-up layer at the bottom made of four slim bands: the tool's own instructions, the instruction file, memory, the names of skills and tools. Above it the empty window, with a dashed line marking its top ("the limit").

| Key | English | Swedish |
| --- | --- | --- |
| title | The context window as a bar with a thin start-up layer at the bottom and the rest empty. The layer holds the tool's instructions, the instruction file, memory and the names of skills and tools. | Kontextfönstret som en stapel med ett tunt start-lager längst ned och resten tomt. Lagret rymmer verktygets instruktioner, instruktionsfilen, minnet och namnen på skills och verktyg. |
| head | Before the first prompt | Före den första prompten |
| limit | the limit of the window | fönstrets gräns |
| empty | room left | utrymme kvar |
| layer1 | the tool's own instructions | verktygets egna instruktioner |
| layer2 | the instruction file | instruktionsfilen |
| layer3 | memory | minne |
| layer4 | names of skills and tools | namn på skills och verktyg |
| caption | The context before you have typed anything. The start-up layer is small next to the whole window, but it is there, and every later request carries it. The sizes are drawn, not counted. | Kontexten innan du har skrivit något. Start-lagret är litet jämfört med hela fönstret, men det finns där, och varje senare begäran bär med sig det. Storlekarna är ritade, inte räknade. |

## 2. `context-as-it-fills` (after the first paragraph of the section "Every step adds to the context, and every request sends all of it"; placement "wide")

Shows: the same bar at four moments, side by side, left to right, each fuller than the last. Under each, a short moment label. The layers stack from the bottom in a fixed order: start-up layer, then files, then command output, then conversation. In the fourth bar, the layers of the first task are drawn with a thin outline and stay at the bottom while a second, unrelated task's layers (in the same colours, hatched to tell them apart) begin above them. A small arrow from each bar to the right labelled "sent with the next request" shows the whole bar going back to the model.

| Key | English | Swedish |
| --- | --- | --- |
| title | Four moments of one session, each bar fuller than the one before: after the first prompt, after a few files are read, after a test run's output, and after a second unrelated task has begun. The layers of the first task stay. | Fyra tillfällen i en session, där varje stapel är fylldare än den förra: efter den första prompten, efter några lästa filer, efter ett testkörnings utdata och sedan en andra, orelaterad uppgift har börjat. Den första uppgiftens lager finns kvar. |
| head | One session, four moments | En session, fyra tillfällen |
| m1 | after the first prompt | efter den första prompten |
| m2 | after a few files are read | efter några lästa filer |
| m3 | after a test run | efter en testkörning |
| m4 | after a second, unrelated task begins | sedan en andra, orelaterad uppgift har börjat |
| startup | start-up layer | start-lager |
| files | files read | lästa filer |
| output | command output | kommandots utdata |
| talk | conversation | samtal |
| task2 | second task | andra uppgiften |
| sent | sent again with the next request | skickas igen med nästa begäran |
| caption | The same bar at four moments. Nothing leaves the bar by itself: the first task's layers are still there, and still sent, when the second task begins. | Samma stapel vid fyra tillfällen. Inget lämnar staplen av sig självt: den första uppgiftens lager finns kvar, och skickas fortfarande, när den andra uppgiften börjar. |

## 3. `context-subagent` (after the first paragraph of the section "A subagent works in a context of its own"; placement "wide")

Shows: two bars side by side. Left, the main agent's bar, filled only a little (start-up layer, conversation). Right, the subagent's bar, starting with its own start-up layer and a short brief, then filling up with a large search (a tall "files and search results" layer). An arrow from the main bar to the subagent bar labelled "a brief" and an arrow back to the main bar labelled "a summary", the back arrow drawn clearly thinner than the search layer. Under both bars, a small two-part counter: "main context" (a short bar, grows only by the thin summary) and "total use" (a longer bar that includes the subagent's whole bar) so the reader sees cleaner main context and more total use at once.

| Key | English | Swedish |
| --- | --- | --- |
| title | A main agent's bar and a subagent's bar. The main agent hands over a brief. The subagent fills its own bar with a large search and hands back only a thin summary. Below, a counter shows the main context staying small while the total use grows. | En huvudagents stapel och en subagents stapel. Huvudagenten lämnar över ett uppdrag. Subagenten fyller sin egen stapel med en stor sökning och lämnar bara tillbaka en tunn sammanfattning. Nedanför visar en mätare att huvudkontexten förblir liten medan den totala användningen växer. |
| head | A subagent has a context of its own | En subagent har en egen kontext |
| main | main agent | huvudagent |
| sub | subagent | subagent |
| brief | a brief | ett uppdrag |
| search | files and search results | filer och sökresultat |
| summary | a summary | en sammanfattning |
| counterMain | main context | huvudkontext |
| counterTotal | total use | total användning |
| caption | The subagent's reading never enters the main bar, only its summary does. The counter shows the price: the main context stays small, and the total use is larger than doing the same work in one bar. | Subagentens läsning kommer aldrig in i huvudstapeln, bara dess sammanfattning gör det. Mätaren visar priset: huvudkontexten förblir liten, och den totala användningen är större än om samma arbete gjordes i en stapel. |

## 4. `context-compaction` (after the first paragraph of the section "When the context is full, the tool summarises it"; placement "wide")

Shows: left, a full bar (filled to the dashed limit) with the layers of figure 2 plus one extra layer marked as a rule that loaded only with one folder's files. An arrow labelled "compaction" to the right. Right, the bar afterwards, mostly empty, with from the bottom: the start-up layer ("comes back from disk"), a short block "summary of the conversation", and two or three slim bands "files re-read". The rule that loaded with one folder's files is drawn above the arrow as a strip crossed out with a line, labelled "summarised away".

| Key | English | Swedish |
| --- | --- | --- |
| title | A full bar before compaction and the same bar after it. Afterwards the start-up layer is back from disk, a short summary has replaced the conversation, a few files are read again, and a rule that loaded only with one folder's files is gone. | En full stapel före komprimeringen och samma stapel efter den. Efteråt är start-lagret tillbaka från disk, en kort sammanfattning har ersatt samtalet, några filer är lästa igen och en regel som bara lästes in med en mapps filer är borta. |
| head | What compaction keeps | Vad komprimeringen behåller |
| before | before | före |
| after | after | efter |
| arrow | compaction | komprimering |
| startup | start-up layer, back from disk | start-lager, tillbaka från disk |
| summary | summary of the conversation | sammanfattning av samtalet |
| files | a few files read again | några filer lästa igen |
| rule | a rule that loaded with one folder's files | en regel som lästes in med en mapps filer |
| lost | summarised away | sammanfattad bort |
| caption | What is written on disk comes back; what was only said in the conversation is summarised, and a detail can go with it. | Det som står på disk kommer tillbaka; det som bara sades i samtalet sammanfattas, och en detalj kan försvinna med det. |

## 5. `context-handoff` (after the paragraph that introduces the hook in the section "Gas City plans the hand-off instead of waiting for compaction"; placement "wide")

Shows: left, one session's bar rising from the bottom past a dotted horizontal line labelled "advisory". At the line, a small card is drawn leaving the bar: "a written note" (the state of the work). A second dotted line higher up labelled "urgent: hand off now". Right, a new, almost empty bar that starts with the start-up layer plus the note (drawn in the "written note" colour, thinner than the old bar's conversation). An arrow from the card to the new bar. Beside the left bar, in small type, "the agent chooses what is written down".

| Key | English | Swedish |
| --- | --- | --- |
| title | One session's bar rising past a dotted advisory line. At the line the agent writes a note, and a new session starts with a new bar holding the start-up layer and that note. | En sessions stapel som stiger förbi en prickad rådgivningslinje. Vid linjen skriver agenten en anteckning, och en ny session börjar med en ny stapel som rymmer start-lagret och den anteckningen. |
| head | A planned hand-off | En planerad överlämning |
| session | session | session |
| advisory | advisory level: plan the hand-off | rådgivningsnivå: planera överlämningen |
| urgent | urgent level: hand off now | brådskande nivå: lämna över nu |
| note | a written note | en skriven anteckning |
| chosen | the agent chooses what is written down | agenten väljer vad som skrivs ner |
| next | next session | nästa session |
| startup | start-up layer | start-lager |
| caption | The hook speaks only above the first line. The note is written by the agent before the context is full, so the next session starts from what the agent chose to keep, not from a summary the tool wrote for it. | Hooken säger något först över den första linjen. Anteckningen skrivs av agenten innan kontexten är full, så nästa session börjar från det agenten valde att behålla, inte från en sammanfattning som verktyget skrev åt den. |

## For the builder

- The article's cover is a placeholder (a copy of the cover of "A study of the mayor's context", with that picture's description as its image text): the gate needs `cover.png`, `cover-600.webp` and `cover-1200.webp` under `src/media/what-fills-an-ai-agents-context/` and an `imageAlt` that describes the picture. When a cover for this article is drawn, replace all three files and the `imageAlt` in both language files.
- Figure 5 matches the cover of the study of the mayor's context in spirit (a bar rising past a line); keep the two recognisably related, as the research note asks.
- Names to keep out of the drawings: no vendor, no tool name, no model name, no token or percentage figures.
