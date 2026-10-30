---
title: Instruktionsfilen, det första en AI-agent läser
description: Andra delen i serien "Från AI-chatt till agentiskt arbete" – om man ska skapa en instruktionsfil, vad som ska stå i den först, hur den hålls användbar och hur en fil räcker för flera verktyg.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-12
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/),
seriens första del, var instruktionerna en av de fem delarna i en AI-agent:
en textfil i projektet som agenten läser varje gång den startar. Vi visade en
kort sådan fil för en påhittad webbapp.

Är du ny med AI-agenter vill du förmodligen veta tre saker. Ska du skapa en
sådan fil? Vad ska stå i den först? Och vad gör du när agenten ändå gör fel?
Det korta svaret är ja: skapa en, skriv den själv och håll den kort. Den
behöver inte vara rätt första dagen. Den växer av det agenten gör fel och
krymper när en rad inte behövs längre.

Vi följer webbappen från del 1 och dess fil genom artikeln, först den dag den
skrevs och sedan några veckor senare.

## Filen första dagen

Ett påhittat exempel: en utvecklare startar en webbapp med en databas och
tester och har en AI-agent som hjälp. Agenten vet ingenting om
projektet, så första dagen skriver utvecklaren ner det en ny kollega skulle
behöva veta – och inget mer:

```markdown
# Instructions for AI agents

## Build and test
- Install dependencies with `npm install`.
- Run `npm test` before you say you are done.

## Rules
- Write a test for every bug you fix.
- Change nothing in the `migrations/` folder.
- Ask before you add a new package.
```

Raderna under "Build and test" är kommandon som agenten inte kan gissa: hur
beroendena installeras och hur testerna körs.
[Anthropic listar bygg- och testkommandon bland det som hör hemma i filen](https://code.claude.com/docs/en/memory).
Reglerna är de få saker som inte går att läsa ut ur koden. En av dem håller
agenten borta från mappen `migrations/`, där databasens ändringar finns.

## En regel behöver sitt skäl

Sedan behöver en databastabell en ny kolumn. Filen säger att ingenting i
`migrations/` får ändras, men inte varför och inte vad agenten ska göra i
stället. Agenten lämnar ett löst SQL-skript i projektets rot.

Utvecklaren skriver om regeln så att den har både skäl och utväg: filerna har
redan körts i produktion, så lägg till en ny migrering i stället.
[VS Codes dokumentation](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
säger att agenten fattar bättre beslut i gränsfall när instruktionerna
förklarar varför en konvention finns.

Två veckor i rad kör agenten alla tester efter en ändring på en enda rad.
Utvecklaren lägger till en rad om hur man kör en enskild testfil.
[Anthropic råder](https://code.claude.com/docs/en/memory) till att lägga till
en rad när Claude gör samma misstag en andra gång.

## Det agenten hittar själv kan strykas

Filen har också fått ett stycke om vad varje fil i projektet gör.
Utvecklaren tillämpar [Anthropics test för vad man ska skriva ner](https://code.claude.com/docs/en/best-practices):
kan agenten hitta det genom att läsa koden, och skulle den faktiskt gå och
titta? Om båda svaren är ja får raden gå. Stycket klarar inte testet och
stryks.

{% figure "file-before-after", "wide" %}

## En mapp som fungerar annorlunda får en egen fil

Webbgränssnittets tester ingår inte i `npm test`. Mappen `web/` får därför en
egen AGENTS.md med en enda rad som lägger till webbtesterna utan att säga emot
rotfilen:

```markdown
- Also run `npm run test:web` before you say you are done.
```

Regeln om `migrations/` blir kvar i rotfilen, eftersom verktygen läser filer i
undermappar vid olika tillfällen och en regel som alltid måste gälla står
säkrast där. Rotfilen ser sedan ut så här:

```markdown
# Instructions for AI agents

## Build and test
- Install dependencies with `npm install`.
- Run a single test file with `npm test -- <file>`.
- Run `npm test` before you say you are done.

## Rules
- Write a test for every bug you fix.
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
- Ask before you add a new package.
```

## En rad i filen hindrar ingenting

En rad i filen ber agenten om något men stoppar den inte. I
[nivå](https://erniva.se/), vår självskattning av AI-kompetens, får
databasmigreringar bara läggas till, aldrig ändras. Testmiljön, som byggdes
före funktionerna, ser till att ett nedskrivet beslut följs, som vi skrev i
[Lärdomar från att bygga nivå](/sv/blog/lessons-from-building-niva/).

## Vinsterna är små, kostnaden är tydlig

Hjälper filen alls? [En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3)
lät AI-agenter lösa verkliga uppgifter med och utan instruktionsfil.

Filer som utvecklarna själva hade skrivit höjde andelen lösta uppgifter med
2,4 % i genomsnitt. Filer som en språkmodell hade skrivit sänkte den med 0,5
och 2 % i studiens två uppsättningar uppgifter.

Ingen av skillnaderna är statistiskt säkerställd, så studien kan inte skilja
dem från slumpen. Forskarna föreslår att man tills vidare undviker filer som
en språkmodell har skrivit.

Kostnaden är tydligare. De genererade filerna gjorde körningarna 20 och 23 %
dyrare. Den ökningen är säkerställd.

## Modellerna ändras – och filen med dem

En fil som skrevs för en äldre modell kan bli för högljudd för nästa. I
oktober 2026 står det i
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att vissa nyare modeller är mer lyhörda för systemprompten, verktygets egna
instruktioner. Där man tidigare skrev "CRITICAL: You MUST use this tool
when..." kan man nu skriva "Use this tool when...".

Sedan den 25 september 2026 har Claude Code
[ett kommando som letar efter instruktioner skrivna för äldre modeller](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

Granskningen omfattar
[AGENTS.md också](https://code.claude.com/docs/en/memory) och ändrar
ingenting förrän man ber om det.

## En fil för tre verktyg

Med flera verktyg i projektet räcker en AGENTS.md i roten, så länge varje
verktyg hittar den. Verktygen beskriver vi så som dokumentationen såg ut den
30 oktober 2026, och det vi skriver kan ha ändrats sedan dess.

{% figure "which-tool-reads-what", "wide" %}

Claude Code läser också AGENTS.md, men som standard
[bara när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
Finns det en kan den filen
[importera AGENTS.md](https://code.claude.com/docs/en/memory) med en enda
rad:

```text
@AGENTS.md
```

Det finns en fälla. En personlig CLAUDE.local.md
[räknas som en CLAUDE.md](https://code.claude.com/docs/en/memory), så den som
lägger till en får som standard sin egen Claude Code att sluta läsa AGENTS.md.
[Med inställningen Project instructions i `/config` satt till `claude-md-and-agents-md` läses AGENTS.md ändå](https://code.claude.com/docs/en/memory).

[Codex läser AGENTS.md innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

GitHub Copilot läser AGENTS.md också, både
[på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och [i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Det läser dessutom `.github/copilot-instructions.md` och skickar
[alla instruktioner som gäller](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
till modellen.

Filer i undermappar, som `web/AGENTS.md` i exemplet, läses vid olika
tillfällen. Utan CLAUDE.md läser Claude Code en sådan fil
[när det öppnar en fil där](https://code.claude.com/docs/en/memory). Codex
[letar från projektets rot ner till den mapp det startade i](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
och i VS Code hittar Copilot en
[när det arbetar med filer i den undermappen](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Det som måste gälla överallt står kvar i rotfilen, på ett ställe.

## Två regler från fabriken

Fabriken bakom den här sajten har sina regler i de filer varje session läser
först, som vi skrev i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
Två av dem, förkortade och utan namn:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Båda raderna anger sitt skäl – och inget av skälen går att läsa ut ur koden.

## Börja litet och låt filen växa

Skapa filen i projektets rot, som en AGENTS.md, och skriv den själv. Låter du
ett verktyg skriva ett utkast, redigera det: både
[Anthropic](https://code.claude.com/docs/en/memory) och
[OpenAI](https://learn.chatgpt.com/docs/learn/best-practices) råder till det.
Börja med kommandona för att installera, bygga och testa och lägg sedan till
de få regler som agenten inte kan läsa ut ur koden, var och en med sitt skäl.
Låt bli översikter och beskrivningar av vad varje fil gör.

När agenten gör samma misstag en andra gång lägger du till en rad, med sitt
skäl. När en rad bara säger det agenten kan hitta genom att läsa koden stryker du den.
När du byter modell läser du filen igen.

Beläggen för att filen hjälper är tunna – studien ovan visar små och osäkra
vinster – och verktygens dokumentation ändras.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. Instruktionsfilen (den här delen)
3. Agenter med var sitt ansvarsområde
4. Skills – färdigheter som beskriver hur något ska göras
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
