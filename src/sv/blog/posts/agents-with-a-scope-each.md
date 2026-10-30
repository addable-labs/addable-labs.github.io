---
title: Ge varje AI-agent ett eget jobb
description: Tredje delen i serien "Från AI-chatt till agentiskt arbete" – varför en AI-agent med ett enda jobb och bara de verktyg den behöver är lättare att granska och lita på, hur du skriver dess beskrivning och vad du gör först.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, håller en kort lapp med sitt jobb inuti en streckad grön ram runt en mapp i ett projekt. Bredvid ligger ett förstoringsglas, dess enda verktyg, och mappen den arbetar i. Projektets övriga mappar och filer ligger lugnt runt ramen.
date: 2026-10-31
category: ai-journey             # app-development | ai-journey
translationKey: agents-with-a-scope-each
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

I [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/),
seriens andra del, fick AI-agenten en kort textfil att läsa varje gång den
startar. Hittills har en enda agent gjort allt arbete: den skriver koden, kör
testerna och kontrollerar sitt eget resultat.

Den här delen handlar om att lämna över ett jobb till en andra AI-agent, en med
ett enda jobb och bara de verktyg jobbet kräver. Det kan kosta mer än en enda
agent: att lämna över medför mer modellanvändning och mer samordning, så
[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/run/subagents)
säger att en direkt begäran oftast räcker för en snabb sökning eller en liten
ändring. En andra agent lönar sig för ett jobb som du upprepar, till exempel att
få en färdig ändring granskad.

## En granskare som bara får läsa

Vi går tillbaka till den påhittade webbappen från del 2. Utvecklaren ber
AI-agenten lägga till ett telefonnummer i registreringsformuläret. Agenten
ändrar formuläret, lägger till en ny migrering (en fil som ändrar databasen)
för kolumnen och kör testerna, som går igenom.

Utvecklaren vill ha en andra åsikt innan ändringen går in. Det som ligger
närmast till hands är att be samma agent granska sitt eget arbete. Det är det
svagare alternativet: agenten har hela samtalet framför sig, med varje val den
gjorde på vägen, så den läser sin ändring genom sina egna resonemang och
antaganden.

Det andra alternativet är en egen granskare, en subagent: en AI-agent som en
annan agent, huvudagenten, lämnar en uppgift till. Den arbetar i ett eget
sammanhang (context), alltså den text den har framför sig: sina instruktioner,
uppgiften den har fått och det den har läst. När uppgiften är klar lämnar den
tillbaka en sammanfattning.

En granskare som börjar med rent bord ser inte samtalet och läser koden som en
kollega som inte har varit med och skrivit den skulle göra. Fördelen är att den
inte delar huvudagentens antaganden. Kostnaden är att den inte vet vad ändringen
är till för, så din begäran bör ange ändringen och dess syfte.

I Claude Code startar en subagent med samma instruktionsfiler som huvudagenten,
så reglerna från del 2 når den.

Granskaren i exemplet har ett enda jobb. Den läser de ändrade filer som
huvudagenten nämner och skriver sina synpunkter. Den får inte ändra någon fil,
köra något kommando eller nå något annat system, så vad den än skriver är
koden kvar som den var.

Utvecklaren läser synpunkterna och bestämmer vad som händer sedan.

{% figure "agent-handover", "wide" %}

Granskaren kan ha fel. VS Codes dokumentation säger det rakt ut: separata
sammanhang "kan lyfta fram olika problem men garanterar inga opartiska eller
korrekta slutsatser" (vår översättning).

I fabriken bakom den här sajten är planerare, byggare och granskare också
olika agenter, som vi beskrev i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
När sajten byggdes om i september hittade granskningen två fel som måste
rättas i arbete som en annan agent hade gjort.

## Fyra delar i subagentens fil

Granskaren beskrivs i en fil, ungefär som instruktionerna gjorde i
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/).
Så här ser filen ut i Claude Code, som här är exemplet. Codex och GitHub Copilot
bygger på samma idé med andra filnamn. De visas längre ner, i avsnittet om
verktygen.

```text
---
name: reviewer
description: Reviews a finished change in the web app for bugs and missing tests. Use it after the main agent has changed code and before the work is called done. It only reads and writes comments.
tools: Read, Grep, Glob
---

You review changes in this web app. Read the changed files and the tests
next to them.

Write your comments as a list, most serious first. For each one, give the
file, the line and what is wrong.
```

Delen överst, mellan de två raderna med streck, kallas frontmatter. Den
innehåller subagentens inställningar. Namnet (`name`) är det du och huvudagenten
kallar subagenten. Beskrivningen (`description`) är det huvudagenten läser för
att avgöra om den ska lämna över en uppgift.

Raden `tools` anger vilka verktyg subagenten får använda. Under frontmatter
kommer subagentens instruktioner, som den läser när den har fått en uppgift.

{% figure "agent-file" %}

I frontmatter kan det finnas andra konfigurationer, till exempel en egen modell
för subagenten, men de här fyra räcker för att börja.

När du väljer modell är en bra tumregel att anpassa den efter hur svårt jobbet
är. Ett jobb som kräver omdöme, till exempel att granska kod, en plan eller en
design, får en stark modell, medan ett tydligt jobb, till exempel att skriva kod
utifrån en exakt beskrivning, kan gå till en liten och snabb modell. Görs det
tvärtom kostar en stark modell mer än ett enkelt jobb kräver. En liten modell
kan ge ett ytligt svar på ett svårt jobb.

[Ansträngningsnivån (effort level)](https://code.claude.com/docs/en/model-config#adjust-effort-level)
är en andra inställning som styr hur mycket modellen resonerar. Lägre nivå är
snabbare och billigare för enkla uppgifter. Högre nivå ger djupare resonemang
för svåra. Claude Code, Codex och Copilot i VS Code kan alla ställa in både
modell och ansträngningsnivå i subagentens fil.

## Skriv beskrivningen för huvudagenten

När huvudagenten avgör om den ska lämna över en uppgift väger den tre saker: vad
du ber om, vad varje subagents beskrivning säger och hur läget ser ut just då,
som [Claude Codes dokumentation](https://code.claude.com/docs/en/sub-agents)
beskriver det.

[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
nämner två saker som beskrivningen ska innehålla: vad subagenten gör och när den
ska användas. En beskrivning som "Reviews code" säger bara det första.
Beskrivningen i exemplet säger vad som granskas, när subagenten ska användas och
att den bara läser. Det är "när" som huvudagenten behöver mest: efter att kod
har ändrats och innan arbetet kallas klart.

Håll beskrivningen kort. I Claude Code har huvudagenten alla beskrivningar med
sig, medan subagentens instruktioner läses först när subagenten körs. Lägg
detaljerna i instruktionerna.

## Ge den bara de verktyg jobbet kräver

I Claude Code är raden `tools` en lista över tillåtna verktyg (allowlist),
vilket betyder att subagenten kan använda verktygen på listan och inga andra.
Granskaren har `Read`, `Grep` och `Glob`, verktygen för att läsa och söka, så
den [inte kan ändra någon fil](https://code.claude.com/docs/en/best-practices).

Utelämnar du raden får subagenten alla verktyg som en subagent kan få, också dem
som ändrar filer. I
[GitHubs anpassade agenter](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
(custom agents) är det likadant: ingen `tools`-rad betyder alla verktyg.

Exemplet på en granskare i Claude Codes dokumentation ger subagenten också
`Bash`, verktyget för att köra kommandon, så att den kan köra `git diff`,
kommandot som visar vad som har ändrats. Ett kommando kan
[göra mer än att läsa](https://code.claude.com/docs/en/how-claude-code-works),
så en granskare som bara ska läsa bör inte ha verktyget `Bash`. Utan `Bash` bör
huvudagenten nämna de ändrade filerna när den lämnar över uppgiften, som den gör
i exemplet.

Tumregeln är att börja med så få verktyg som jobbet går att göra med och lägga
till ett när subagenten visar sig behöva det. VS Codes dokumentation
rekommenderar
[verktyg som bara läser för säkerhetskänsligt arbete](https://code.visualstudio.com/docs/agent-customization/custom-agents)
och säger att verktygslistan i en agent som delas i ett repository ska följa
principen om minsta behörighet (principle of least privilege), alltså att ge en
agent bara den behörighet jobbet kräver.

En rad i instruktionsfilen från del 2 ber en agent uppföra sig, medan ett
verktyg den saknar inte går att missbruka: raden `tools` är en gräns utanför
modellen, av det slag som del 1 beskrev. Behörigheter avgör vad en agent får
ändra och när den måste fråga först. De är en egen inställning, som
[del 7](#del-7) i serien tar upp.

## Claude Code, Codex och GitHub Copilot

Verktygen beskriver vi så som dokumentationen såg ut den 30 oktober 2026. Det
vi skriver kan ha ändrats sedan dess.

I **Claude Code** är en subagent en Markdown-fil i `.claude/agents/` i
projektet, eller i `~/.claude/agents/` för alla dina projekt.

I OpenAI:s **Codex** är en subagent en
[TOML-fil](https://learn.chatgpt.com/docs/agent-configuration/subagents) i
`.codex/agents/`. TOML är ett textformat för inställningar. Den här filen
innehåller ett namn, en beskrivning och subagentens instruktioner.

Filen kan begränsa subagenten med inställningar: dokumentationen listar några,
till exempel `features.shell_tool`, som du sätter till `false` för att minska
vad en anpassad agent kan göra. Raden "Do not edit files" i exemplet nedan är en
begäran och ingen gräns.

```text
name = "reviewer"
description = "Reviews a finished change in the web app for bugs and missing tests. Use it after the main agent has changed code and before the work is called done."
developer_instructions = """
You review changes in this web app. Do not edit files.
Read the changed files and the tests next to them.
Write your comments as a list, most serious first. For each one, give the
file, the line and what is wrong.
"""
```

**GitHub Copilot** läser agentfiler från `.github/agents/`, med namn som slutar
på `.agent.md` eller `.md`. I VS Code är bara de verktyg som står i filen
tillgängliga, om filen listar verktyg. Granskarens fil heter
`.github/agents/reviewer.agent.md` och har den här raden i sin frontmatter:

```text
tools: ['read', 'search']
```

## När huvudagenten lämnar över på egen hand

I oktober 2026 säger Anthropics
[promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att företagets senaste modeller lämnar arbete till subagenter på egen hand. De
kan känna igen när en uppgift tjänar på en specialist och göra det utan att bli
tillsagda.

De andra verktygen avgör på andra sätt. I VS Code kan huvudagenten välja att
lämna över utan att bli ombedd. Copilots molnagent på GitHub.com kan använda en
anpassad agent på egen hand, utifrån uppgiften, om inte den anpassade agentens
fil stänger av det.

På din egen dator lämnar Codex över när du ber om det eller när instruktioner
som AGENTS.md säger det. Codex dokumentation kallar beskrivningen vägledning för
människor om när Codex ska använda subagenten.

Att lämna över på egen hand för med sig en risk: huvudagenten kan lämna över för
ofta. Anthropics guide varnar också för att en modell kan starta subagenter för
att utforska kod när en vanlig sökning är snabbare och räcker. Det lägger till
den kostnad som beskrevs i början av den här delen.

En rad i instruktionsfilen från del 2 kan säga när det lönar sig att lämna
över:

```text
- Hand a finished change to the reviewer: it reads the change without your history.
- Do small edits and lookups yourself: a hand-over costs more than it saves.
```

## Felsökning

Fyra saker kan gå fel:

- Huvudagenten lämnar aldrig över på egen hand.
- Det händer ingenting när du nämner subagenten i din begäran.
- Huvudagenten lämnar över för ofta.
- Granskarens synpunkter är ytliga.

Om huvudagenten aldrig lämnar över på egen hand, ber du om subagenten vid namn:

```text
Use the reviewer subagent to review the change in the sign-up form.
```

I Claude Code fungerar det oftast. Skriver du @ och subagentens namn ser Claude
Code till att subagenten körs för just den uppgiften.

Om det fungerar att nämna subagenten men huvudagenten aldrig väljer den på egen
hand, börja med beskrivningen: skriv när subagenten ska användas, som exemplet
gör. I Claude Code uppmuntrar en fras som "use proactively" i beskrivningen
huvudagenten att lämna över utan att bli ombedd. Claude Codes råd är att skriva
beskrivningar som pekar ut en enda subagent.

I Copilot är en andra orsak raden `disable-model-invocation: true` i filen, som
hindrar huvudagenten från att välja subagenten på egen hand.

Om det inte hjälper att nämna subagenten vid namn heller, titta på filen. Claude
Code hoppar över en fil som saknar beskrivning. I VS Code måste namnet skrivas
exakt som i filen, med samma versaler. Verktyget Run Subagent måste också vara
valt under Configure Tools.

När huvudagenten lämnar över för ofta, gör du beskrivningen smalare och lägger
till raden från förra avsnittet i din instruktionsfil.

När synpunkterna är ytliga har granskaren troligen börjat utan att veta vad den
ska titta på. Skriv i din begäran vilken ändring som ska granskas och vad
ändringen ska göra, som det första avsnittet sa.

## Börja litet

Välj ett jobb som du redan gör på samma sätt varje gång och som inte behöver
hela samtalet. En granskning av en färdig ändring är ett bra första jobb,
eftersom den går att göra genom att läsa.

Be verktyget skriva subagentens fil åt dig och lägg den i mappen för ditt
verktyg, som avsnittet om verktygen anger. Läs den sedan och korta ner den: ge
subagenten bara verktyg som läser, skriv beskrivningen som vad den gör och när
den ska användas och håll instruktionerna till några rader.

Prova den på en färdig ändring. Nämn subagenten vid namn i begäran första gången
och läs synpunkterna den lämnar tillbaka som du skulle läsa en kollegas.

Lägg till ett verktyg, eller ytterligare en subagent, först när den första har
visat sig vara till nytta.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb (den här delen)
4. Skills, när arbetet ska göras likadant varje gång
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
