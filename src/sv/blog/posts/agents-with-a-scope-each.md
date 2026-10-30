---
title: Ge varje AI-agent ett eget jobb
description: Tredje delen i serien "Från AI-chatt till agentiskt arbete" – varför en AI-agent med ett enda jobb och bara de verktyg den behöver är lättare att granska och lita på, hur du skriver dess beskrivning och vad du gör först.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: agents-with-a-scope-each
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
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

Det andra alternativet är en egen granskare, en underagent (subagent): en
AI-agent som en annan agent, huvudagenten, lämnar en uppgift till. Den arbetar i
ett eget sammanhang (context), alltså den text den har framför sig: sina
instruktioner, uppgiften den har fått och det den har läst. När uppgiften är
klar lämnar den tillbaka en sammanfattning.

En granskare som börjar med rent bord ser inte samtalet och läser koden som en
kollega som inte var med skulle göra. Fördelen är att den inte delar
huvudagentens antaganden. Kostnaden är att den inte vet vad ändringen är till
för, så din begäran bör ange ändringen och dess syfte.

I Claude Code startar en underagent med samma instruktionsfiler som
huvudagenten, så reglerna från del 2 når den.

Granskaren i exemplet har ett enda jobb. Den läser de ändrade filer som
huvudagenten nämner och skriver sina synpunkter. Den får inte ändra någon fil,
köra något kommando eller nå något annat system, så vad den än skriver är
koden kvar som den var.

Utvecklaren läser synpunkterna och bestämmer vad som händer sedan.

{% figure "agent-handover", "wide" %}

## Fyra delar i agentens fil

Granskaren beskrivs i en fil, ungefär som instruktionerna gjorde i del 2. Så
här ser filen ut i Claude Code, som här är exemplet. De andra två verktygen
har ungefär samma delar, som avsnittet om verktygen visar.

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

Delen mellan de två raderna med streck är filens huvud (header). Namnet
(`name`) är det du och huvudagenten kallar agenten. Beskrivningen
(`description`) är det huvudagenten läser för att avgöra om den ska lämna
över en uppgift. Raden `tools` anger vad agenten får använda. Under huvudet
kommer agentens instruktioner, som den läser när den har fått en uppgift.

Det finns fler inställningar, till exempel en egen modell för agenten, men
de här fyra räcker för att börja.

{% figure "agent-file" %}

## Skriv beskrivningen för huvudagenten

När huvudagenten avgör om den ska lämna över en uppgift väger den tre saker:
vad du ber om, vad varje agents beskrivning säger och hur läget ser ut just
då, som
[Claude Codes dokumentation](https://code.claude.com/docs/en/sub-agents)
beskriver det.

[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
nämner två saker som beskrivningen ska innehålla: vad agenten gör och när den
ska användas. En beskrivning som "Reviews code" säger bara det första.
Beskrivningen i exemplet säger vad som granskas, när agenten ska användas och
att den bara läser. Det är "när" som huvudagenten behöver mest: efter att kod
har ändrats och innan arbetet kallas klart.

Håll beskrivningen kort. I Claude Code har huvudagenten alla beskrivningar med
sig, medan agentens instruktioner läses först när agenten körs. Lägg
detaljerna i instruktionerna.

## Ge den bara de verktyg jobbet kräver

Raden `tools` avgör vad granskaren kan göra. I Claude Code är den en lista över
tillåtna verktyg (allowlist), vilket betyder att agenten kan använda verktygen
på listan och inga andra. Granskaren har `Read`, `Grep` och `Glob`, verktygen
för att läsa och söka, så den
[inte kan ändra någon fil](https://code.claude.com/docs/en/best-practices).

Utelämnar du raden får agenten alla verktyg som en underagent kan få, också
dem som ändrar filer. I
[GitHubs anpassade agenter](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
(custom agents) är det likadant: ingen `tools`-rad betyder alla verktyg. En
fil utan raden är raka motsatsen till en gräns.

Exemplet på en granskare i Claude Codes dokumentation ger agenten också `Bash`,
verktyget för att köra kommandon, så att den kan köra `git diff`, kommandot som
visar vad som har ändrats. Ett kommando kan
[göra mer än att läsa](https://code.claude.com/docs/en/how-claude-code-works),
så en granskare som bara ska läsa kan klara sig utan det. Utan `Bash` bör
huvudagenten nämna de ändrade filerna när den lämnar över uppgiften, som den gör
i exemplet.

Börja med så få verktyg som jobbet går att göra med och lägg till ett när
agenten visar sig behöva det. VS Codes dokumentation rekommenderar
[verktyg som bara läser för säkerhetskänsligt arbete](https://code.visualstudio.com/docs/agent-customization/custom-agents)
och säger att verktygslistan i en agent som delas i ett repository ska följa
principen om minsta behörighet (principle of least privilege), alltså att ge en
agent bara den behörighet jobbet kräver.

## Claude Code, Codex och GitHub Copilot

Verktygen beskriver vi så som dokumentationen såg ut den 30 oktober 2026. Det
vi skriver kan ha ändrats sedan dess.

I **Claude Code** är en agent en Markdown-fil i `.claude/agents/` i projektet,
eller i `~/.claude/agents/` för alla dina projekt. Du kan be Claude skriva
filen åt dig.

I OpenAI:s **Codex** är en agent en TOML-fil i `.codex/agents/`. TOML är ett
textformat för inställningar. Den här filen innehåller ett namn, en beskrivning
och agentens instruktioner. På din egen dator
[lämnar Codex över](https://learn.chatgpt.com/docs/agent-configuration/subagents)
när du ber om det eller när instruktioner som AGENTS.md säger det, vilket gör
filen från del 2 till platsen där du anger när.

Filen kan inte sätta agentens sandlåda, som begränsar vad agenten kan röra,
eller dess godkännanden, som avgör när den måste fråga. Båda kommer från din
Codex-session, alltså samtalet du för med Codex, så välj dess
behörighetsinställningar innan du ber Codex lämna över. Filen kan däremot
begränsa agenten på andra sätt: dokumentationen listar inställningar, till
exempel `features.shell_tool`, som du sätter till `false` för att minska vad en
anpassad agent kan göra. Raden "Do not edit files" i exemplet nedan är en
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
tillgängliga, om filen listar verktyg. Ett av dokumentationens exempel på
när du ska göra en anpassad agent är att begränsa en granskningsagent till
verktyg som bara läser. Granskarens fil heter `.github/agents/reviewer.agent.md`
och har den här raden i sitt huvud:

```text
tools: ['read', 'search']
```

## Vad gränsen ger dig och vad den inte ger

Allt granskaren får göra står på några rader som går att läsa på en minut:
den får läsa och söka och lämnar tillbaka text. När du läser synpunkterna
behöver du inte också kontrollera vad den har ändrat, eftersom den inte kunde
ändra något. I Codex är gränsen sessionens sandlåda och inte agentens fil:
raden "Do not edit files" där är bara en begäran.

En rad i instruktionsfilen från del 2 ber agenten uppföra sig. Ett verktyg som
agenten saknar går inte att missbruka: det är en gräns utanför modellen, av det
slag som del 1 beskrev. [Del 7](#del-7) i serien tar upp den igen.

Granskaren kan ha fel. VS Codes dokumentation säger det rakt ut: separata
sammanhang "kan lyfta fram olika problem men garanterar inga opartiska eller
korrekta slutsatser" (vår översättning). Läs synpunkterna och bestäm själv.

I fabriken bakom den här sajten är planerare, byggare och granskare också
olika agenter, som vi beskrev i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
När sajten byggdes om i september hittade granskningen två fel som måste
rättas i arbete som en annan agent hade gjort.

## När agenten lämnar över på egen hand

I oktober 2026 säger Anthropics
[promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att företagets senaste modeller lämnar arbete till underagenter på egen hand. De
kan känna igen när en uppgift tjänar på en specialist och göra det utan att bli
tillsagda.

I Claude Code har huvudagenten beskrivningarna framför sig när den väljer själv
och inte instruktionerna, som läses först när agenten körs. Beskrivningen är
det som gör att agenten används alls. Instruktionerna spelar roll först när
den används.

De andra verktygen avgör på andra sätt. I VS Code kan huvudagenten välja
att lämna över utan att bli ombedd. Copilots molnagent på GitHub.com kan använda
en anpassad agent på egen hand, utifrån uppgiften, om inte agentens fil stänger
av det. Codex dokumentation kallar beskrivningen vägledning för människor om när
Codex ska använda agenten.

Att lämna över på egen hand för med sig en risk: huvudagenten kan lämna över för
ofta. Anthropics guide varnar också för att en modell kan starta underagenter
för att utforska kod när en vanlig sökning är snabbare och räcker. Varje onödig
överlämning lägger till den kostnad som beskrevs i början av den här delen.

En rad i instruktionsfilen från del 2 kan säga när det lönar sig att lämna
över:

```text
- Hand a finished change to the reviewer: it reads the change without your history.
- Do small edits and lookups yourself: a hand-over costs more than it saves.
```

## När det går fel

Om huvudagenten inte lämnar över, ber du om agenten vid namn:

```text
Use the reviewer subagent to review the change in the sign-up form.
```

I Claude Code fungerar det oftast. Skriver du @ och agentens namn ser Claude
Code till att agenten körs för just den uppgiften.

Om det fungerar att nämna agenten men huvudagenten aldrig väljer den på egen
hand, börja med beskrivningen: skriv när agenten ska användas, som exemplet gör.
I Claude Code uppmuntrar en fras som "use proactively" i beskrivningen
huvudagenten att lämna över utan att bli ombedd. Claude Codes råd är att skriva
beskrivningar som pekar ut en enda agent.

I Copilot är en andra orsak raden `disable-model-invocation: true` i filen, som
hindrar huvudagenten från att välja agenten på egen hand.

Om det inte hjälper att nämna den vid namn heller, titta på filen. Claude Code
hoppar över en fil som saknar beskrivning. I VS Code måste namnet skrivas
exakt som i filen, med samma versaler. Verktyget Run Subagent måste också vara
valt under Configure Tools.

Två fel går åt andra hållet. När huvudagenten lämnar över för ofta, gör du
beskrivningen smalare och lägger till raden från förra avsnittet i din
instruktionsfil. När synpunkterna är ytliga, har granskaren troligen börjat utan
att veta vad den ska titta på: den ser inte samtalet, så skriv i din begäran
vilken ändring som ska granskas och vad ändringen ska göra.

## Börja litet

Välj ett jobb som du redan gör på samma sätt varje gång och som inte behöver
hela samtalet. En granskning av en färdig ändring är ett bra första jobb,
eftersom den går att göra genom att läsa.

Be verktyget skriva agentfilen åt dig och lägg den i mappen för ditt verktyg,
som avsnittet om verktygen anger. Läs den sedan och korta ner den: ge agenten
bara verktyg som läser, skriv beskrivningen som vad den gör och när den ska
användas och håll instruktionerna till några rader.

Prova den på en färdig ändring. Nämn agenten vid namn i begäran första gången
och läs synpunkterna den lämnar tillbaka som du skulle läsa en kollegas.

Lägg till ett verktyg, eller en andra agent, först när den första har visat sig
vara till nytta. Byter du till en nyare modell, läs beskrivningarna igen,
eftersom modellen i Claude Code väljer efter dem.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb (den här delen)
4. Skills – färdigheter som beskriver hur något ska göras
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
