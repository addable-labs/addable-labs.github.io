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

Den här delen handlar om att lämna över ett jobb till en andra AI-agent. En
agent som har ett eget jobb och bara de verktyg jobbet kräver är lättare att
granska och lättare att lita på.

## En granskare som bara får läsa

Vi går tillbaka till den påhittade webbappen från del 2. Utvecklaren ber
AI-agenten lägga till ett telefonnummer i registreringsformuläret. Agenten
ändrar formuläret, lägger till en ny migrering (en fil som ändrar databasen)
för kolumnen och kör testerna, som går igenom.

Utvecklaren vill ha en andra läsare innan ändringen går in. Först kan det
verka enklast att be samma agent granska sitt eget arbete, men den har
fortfarande hela samtalet framför sig, med varje val den gjorde på vägen. En
granskare som börjar från noll läser koden utan den bakgrunden.

En sådan andra agent kallas underagent (subagent): en AI-agent som en annan
agent, huvudagenten, lämnar en uppgift till. Den arbetar i ett eget
sammanhang (context), alltså den text den har framför sig: sina instruktioner,
uppgiften den har fått och det den har läst. När uppgiften är klar lämnar den
tillbaka en sammanfattning.

Granskaren i exemplet har ett enda jobb. Den läser de ändrade filerna och
skriver sina synpunkter. Den får inte ändra någon fil, köra något kommando
eller nå något annat system, så vad den än skriver är koden kvar som den var.

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

Namnet (`name`) är det du och huvudagenten kallar den. Beskrivningen
(`description`) är det huvudagenten läser för att avgöra om den ska lämna
över en uppgift. Raden `tools` anger vad agenten får använda. Texten under den
andra raden med streck är agentens instruktioner, som den läser när den har
fått en uppgift.

Det finns fler inställningar, till exempel en egen modell för agenten, men
de här fyra räcker för att börja.

{% figure "agent-file" %}

## Skriv beskrivningen för huvudagenten

Beskrivningen (`description`) är raden huvudagenten läser när den avgör om
den ska lämna över en uppgift. Den går efter beskrivningen av din begäran,
beskrivningarna av sina agenter och läget just då.
[Claude Codes dokumentation](https://code.claude.com/docs/en/sub-agents)
säger det och
[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference)
lägger till vad raden ska innehålla: vad agenten gör och när den ska användas.

En beskrivning som "Reviews code" säger vad agenten gör men inte när den ska
få uppgiften. Beskrivningen i exemplet säger vad som granskas, när agenten ska
användas och att den bara läser. Det är "när" som huvudagenten behöver mest:
efter att kod har ändrats och innan arbetet kallas klart.

Claude Code säger också att en fras som "use proactively" i beskrivningen
uppmuntrar huvudagenten att lämna över utan att bli ombedd. Rådet är att skriva
beskrivningar som pekar ut en enda agent.

Håll beskrivningen kort. Huvudagenten har alla beskrivningar med sig hela
tiden, medan agentens instruktioner läses först när agenten körs. Därför säger
dokumentationen att detaljerna ska flyttas från beskrivningen till
instruktionerna.

## Ge den bara de verktyg jobbet kräver

Raden `tools` är det andra som gör granskaren lätt att lita på. I Claude Code
är den en tillåtelselista (allowlist): agenten kan använda verktygen på
listan och inga andra. Granskaren har `Read`, `Grep` och `Glob`, verktygen för
att läsa och söka, så den kan inte ändra någon fil.

Utelämnar du raden ärver agenten alla verktyg en underagent kan ha, också
dem som ändrar filer. I
[GitHubs anpassade agenter](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
(custom agents) är det likadant: ingen `tools`-rad betyder alla verktyg. En fil utan raden är
alltså raka motsatsen till en gräns.

Anthropics eget exempel på en granskare ger agenten också `Bash`, verktyget
för att köra kommandon, så att den kan köra `git diff` och se vad som har
ändrats. Ett kommando kan
[göra mer än att läsa](https://code.claude.com/docs/en/how-claude-code-works),
så en granskare som bara ska läsa kan klara sig utan det. Priset är att
huvudagenten måste nämna de ändrade filerna när den lämnar över uppgiften.

Börja med så få verktyg som jobbet går att göra med och lägg till ett när
agenten visar sig behöva det. VS Codes dokumentation rekommenderar
[verktyg som bara läser för säkerhetskänsligt arbete](https://code.visualstudio.com/docs/agent-customization/custom-agents)
och kallar målet principen om minsta behörighet (principle of least
privilege).

## Claude Code, Codex och GitHub Copilot

Verktygen beskriver vi så som dokumentationen såg ut den 30 oktober 2026. Det
vi skriver kan ha ändrats sedan dess.

I **Claude Code** är en agent en Markdown-fil i `.claude/agents/` i projektet,
eller i `~/.claude/agents/` för alla dina projekt. Du kan be Claude skriva
filen åt dig. Skriver du @ och agentens namn ser Claude Code till att agenten
körs för just den uppgiften. Verktyget har också en egen agent som
bara läser, Explore, som det använder för att söka i koden.

I OpenAI:s **Codex** är en agent en TOML-fil i `.codex/agents/`, med ett namn,
en beskrivning och agentens instruktioner. Codex
[lämnar över](https://learn.chatgpt.com/docs/agent-configuration/subagents)
när du ber om det eller när AGENTS.md säger det, vilket gör filen från del 2
till platsen där du anger när. Filen kan inte sätta sandlådan, som begränsar
vad agenten kan röra, eller godkännandena, som avgör när den måste fråga,
eftersom båda kommer från sessionen. Instruktioner i filen kan be en agent
låta bli att ändra men skapar ingen egen sandlåda som bara läser, så välj
behörighetsläge innan du ber Codex lämna över.

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

**GitHub Copilot** läser agentfiler från `.github/agents/`, med namn som
slutar på `.agent.md`. I VS Code är bara de verktyg som står i filen
tillgängliga, om filen listar verktyg. Dokumentationens eget första exempel på
när du ska göra en anpassad agent är att begränsa en granskningsagent till
verktyg som bara läser. För granskaren lyder raden:

```text
tools: ['read', 'search']
```

## Därför är en smal agent lättare att lita på

Allt granskaren får göra står på några rader som går att läsa på en minut:
den får läsa och söka och lämnar tillbaka text. När du läser synpunkterna
behöver du inte också kontrollera vad den har ändrat, eftersom den inte kunde
ändra något.

Det är skillnaden mot instruktionsfilen i del 2. En rad i den filen ber
agenten uppföra sig, medan ett verktyg som agenten saknar inte går att
missbruka. Det som aldrig får hända stoppas fortfarande utanför modellen, som
del 1 beskrev. [Del 7](#del-7) i serien tar upp det igen.

Granskaren kan ändå ha fel. VS Codes dokumentation säger det rakt ut: separata
sammanhang
["kan lyfta fram olika problem men garanterar inga opartiska eller riktiga slutsatser"](https://code.visualstudio.com/docs/agents/run/subagents)
(vår översättning). Läs synpunkterna och bestäm själv.

Fabriken bakom den här sajten delar upp arbetet på samma sätt. Som vi beskrev
i [Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)
är planerare, byggare och granskare olika agenter där. Granskningen går i
flera spår. När sajten byggdes om i september hittade granskningen två fel som
måste rättas i arbete som en annan agent hade gjort.

## När agenten lämnar över på egen hand

I oktober 2026 säger Anthropics
[promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att företagets senaste modeller lämnar arbete till underagenter på egen hand.
De kan känna igen när en uppgift tjänar på en specialist och göra det utan att
bli tillsagda. I VS Code kan huvudagenten
[också välja att lämna över](https://code.visualstudio.com/docs/agents/run/subagents)
utan att bli ombedd.

När agenten bestämmer själv är det beskrivningen den bestämmer efter. Det gör
beskrivningen viktigare än instruktionerna under den: beskrivningen avgör om
agenten används alls medan instruktionerna spelar roll först när den används.

Den nya risken är den motsatta, att huvudagenten lämnar över för ofta. Samma
guide varnar för att en modell kan starta underagenter för att utforska kod
när en vanlig sökning är snabbare och räcker. Varje underagent gör dessutom
egna anrop, så arbetet kostar mer än samma jobb i en enda agent, som
dokumentationen för Claude Code, Codex och VS Code var och en säger.

En rad i instruktionsfilen från del 2 kan säga när det lönar sig att lämna
över:

```text
- Hand a finished change to the reviewer. Do small edits and lookups yourself.
```

## När det går fel

Lämnar huvudagenten inte över ber du om agenten vid namn:

```text
Use the reviewer subagent to review the change in the sign-up form.
```

Fungerar det men agenten aldrig väljs på egen hand ligger felet i
beskrivningen. Skriv när agenten ska användas, som exemplet gör.

Fungerar det inte heller att nämna den vid namn, titta på filen. Claude Code
hoppar över en fil som saknar beskrivning. I en chatt med VS Codes egen agent
måste namnet skrivas exakt som i filen, med samma versaler. Verktyget Run
Subagent måste också vara valt under Configure Tools.

Lämnar huvudagenten över för ofta gör du beskrivningen smalare och lägger till
raden från förra avsnittet i din instruktionsfil.

Är synpunkterna ytliga har granskaren troligen börjat utan att veta vad den
ska titta på. Den ser bara uppgiften den har fått, så skriv i din begäran
vilken ändring som ska granskas och vad ändringen ska göra.

## Börja litet

Välj ett jobb som du redan gör på samma sätt varje gång och som inte behöver
hela samtalet. En granskning av en färdig ändring är ett bra första jobb,
eftersom den går att göra genom att läsa.

Be verktyget skriva agentfilen åt dig och läs den sedan. Ge agenten bara
verktyg som läser, skriv beskrivningen som vad den gör och när den ska
användas och håll instruktionerna till några rader.

Prova den på en färdig ändring. Nämn agenten vid namn i begäran första gången
och läs synpunkterna den lämnar tillbaka som du skulle läsa en kollegas.

Lägg till ett verktyg, eller en andra agent, först när den första har visat
sig vara till nytta. Byter du till en nyare modell, läs beskrivningarna igen,
eftersom modellen väljer efter dem.

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
