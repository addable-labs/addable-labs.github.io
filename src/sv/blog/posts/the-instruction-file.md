---
title: Instruktionsfilen, det första en AI-agent läser
description: Andra delen i serien "Från AI-chatt till agentiskt arbete" – om man ska göra en instruktionsfil, vad som ska stå i den först, hur den hålls användbar och hur en fil räcker för flera verktyg.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En utvecklare sedd bakifrån, delad i två halvor framför två skärmar. Den vänstra halvan är grå och lugnare framför en chatt. Den högra är grön och aktiv, med handen höjd mot en skärm med en graf av agenter.
date: 2026-10-12
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I [Vad som gör en chatt till en AI-agent](/sv/blog/what-makes-a-chat-an-ai-agent/),
seriens första del, visade vi en kort AGENTS.md för en påhittad webbapp.
Den här delen börjar med det en nybörjare undrar först: ska man göra en
sådan fil, vad ska stå i den och hur håller man den användbar?

## Ja, gör en – och håll den kort

Ja. Anthropic beskriver CLAUDE.md, sin variant av filen, som
[stället där man skriver ner det man annars skulle förklara på nytt](https://code.claude.com/docs/en/memory).
Studierna längre ned visar små vinster, så håll insatsen liten också:

1. Skriv den själv, som en AGENTS.md i repots rot. Forskare vid ETH
   Zürich
   [föreslår att man tills vidare avstår från filer som en språkmodell har skrivit](https://arxiv.org/html/2602.11988v3).
2. Börja med kommandona för att installera, bygga och testa. Anthropic
   listar
   [kommandon som Claude inte kan gissa](https://code.claude.com/docs/en/best-practices)
   först bland det som hör hemma i filen.
3. Lägg till de få regler som agenten inte kan läsa ut ur koden, var och
   en med sitt skäl, så att den
   [fattar bättre beslut i gränsfall](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
4. Lämna ut översikter och beskrivningar av vad varje fil gör.
   [Det agenten kan ta reda på själv hör inte hemma i filen](https://code.claude.com/docs/en/best-practices).
5. Lägg till en rad när agenten
   [gör samma misstag en andra gång](https://code.claude.com/docs/en/memory).
   Stryk en rad när
   [borttagningen inte skulle orsaka något misstag](https://code.claude.com/docs/en/best-practices).

Om man också använder Claude Code behåller man filen och lägger till en
CLAUDE.md som [importerar den](https://code.claude.com/docs/en/memory), som
avsnittet om flera verktyg visar.

## Samma fil några veckor senare

Historien är påhittad, liksom filen. Första dagen såg den ut som i del 1
och innehöll knappt mer än det en ny kollega behöver veta. Sedan behövde
en tabell en ny kolumn. Filen sa att ingenting i mappen `migrations/` fick
ändras. Agenten fick varken veta varför eller vad den skulle göra i
stället och lämnade ett löst SQL-skript i projektets rot.

Utvecklaren skrev om regeln så att den fick både skäl och utväg: filerna
har redan körts i produktion, så lägg till en ny migrering i stället. Två
veckor i rad körde agenten sedan hela testsviten efter en ändring på en
enda rad. Då fick filen en rad om hur man kör en enskild testfil.

Utvecklaren ställde också frågan om varje rad: skulle agenten göra misstag
om den togs bort? Ett stycke klarade inte det, en beskrivning av vad varje
fil i projektet gör. Agenten läser filerna själv. Anthropic räknar
[beskrivningar av kodbasen fil för fil](https://code.claude.com/docs/en/best-practices)
till det som inte hör hemma i filen. Stycket stryktes.

Webbklientens tester ingår inte i `npm test`, så mappen `web/` fick en egen
AGENTS.md med en enda rad som lägger till något utan att säga emot
rotfilen:

```markdown
- Also run `npm run test:web` before you say you are done.
```

Regeln om `migrations/` blev kvar i rotfilen. Den hade kunnat flytta in i
mappen, men verktygen läser filer i undermappar vid olika tillfällen, så en
regel som alltid måste gälla står säkrast i roten. Rotfilen såg sedan ut så
här:

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

<!-- figure A: file-before-after -->

Även i rotfilen stoppar regeln ingenting.
[Ett av Anthropics egna exempel på en krok (hook)](https://code.claude.com/docs/en/best-practices)
blockerar skrivningar till mappen med migreringar. Sådana spärrar är
ämnet för del 7.

Självskattningen nivå, som vi skrev om i
[Lärdomar från att bygga nivå](/sv/blog/lessons-from-building-niva/), visar
en regel med mer bakom sig än en rad i en fil. Där får databasmigreringar
bara läggas till och aldrig ändras. Regeln hör till testmiljön som byggdes
före funktionerna: "ett beslut som är nedskrivet är ett beslut som
testmiljön ser till att vi lever upp till".

## Kort slår långt, men vinsterna är små

Kort är också vad leverantörerna ber om. OpenAI
[föredrar en kort och korrekt AGENTS.md framför en lång fil full av vaga regler](https://learn.chatgpt.com/docs/learn/best-practices).
GitHubs förslag till prompt för att låta Copilot skriva sin egen
instruktionsfil
[ber om högst två sidor](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
Codex
[slutar som standard lägga till filer när de tillsammans når 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Beläggen för att filen hjälper är tunnare än råden.
[En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3), i sin
tredje version från den 29 september 2026, lät AI-agenter lösa verkliga
uppgifter med och utan instruktionsfil. Filer som utvecklarna själva hade
skrivit höjde andelen lösta uppgifter med 2,4 % i genomsnitt. Filer som en
språkmodell hade skrivit sänkte den med 0,5 och 2 % i studiens två
uppsättningar uppgifter. Ingen av skillnaderna är statistiskt säkerställd,
så studien kan inte skilja dem från slumpen. De genererade filerna gjorde
däremot körningarna 20 och 23 % dyrare. Den ökningen är säkerställd. Även
de handskrivna filerna höjde kostnaden, med högst 19 %. Översikter av repot
hjälpte inte, trots att forskarna noterar att modellleverantörer
rekommenderar dem.

Claude Code och Codex kan båda skriva ett första utkast, men
[Anthropic råder till att förfina det med sådant som Claude inte skulle hitta på egen hand](https://code.claude.com/docs/en/memory)
och
[OpenAI till att redigera resultatet så att det passar hur teamet arbetar](https://learn.chatgpt.com/docs/learn/best-practices).
I praktiken: skriv filen för hand, håll dig till det agenten inte kan ta
reda på själv och räkna med små vinster.

[En mindre studie av 124 pull requests](https://arxiv.org/abs/2601.20404)
fann att körningarna med en AGENTS.md hade 28,64 % kortare mediantid och
att agenterna löste uppgifterna ungefär lika ofta. Där köpte filen alltså
tid och inte bättre svar.

## Modellerna ändras – och filen med dem

En fil som skrevs för en äldre modell kan bli för högljudd för nästa.
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
skriver i oktober 2026 att vissa nyare modeller är mer lyhörda för
systemprompten, så där man tidigare skrev "CRITICAL: You MUST use this
tool when..." kan man nu skriva "Use this tool when...".

Claude Code har
[sedan den 25 september 2026](https://code.claude.com/docs/en/changelog)
ett kommando som letar efter instruktioner skrivna för äldre modeller:

```text
/doctor prompt-audit
```

Granskningen omfattar
[AGENTS.md också](https://code.claude.com/docs/en/memory) och ändrar
ingenting förrän man ber om det.

## En fil för tre verktyg

Med flera verktyg räcker en AGENTS.md i roten, så länge varje verktyg
hittar den. Verktygen beskriver vi här så som dokumentationen såg ut den
12 oktober 2026.

<!-- figure B: which-tool-reads-what -->

[Codex läser AGENTS.md innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
GitHub Copilot läser den också, både
[på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och [i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Claude Code utgår från CLAUDE.md och
[läser som standard AGENTS.md bara när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
För att dela en fil kan en CLAUDE.md
[importera AGENTS.md](https://code.claude.com/docs/en/memory)
med en enda rad:

```text
@AGENTS.md
```

En fälla finns: en personlig CLAUDE.local.md
[räknas som en CLAUDE.md](https://code.claude.com/docs/en/memory), så den
som lägger till en får som regel sin egen Claude Code att sluta läsa
AGENTS.md.

GitHub Copilot skickar med
[alla instruktioner som gäller](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
VS Code avråder från att
[räkna med en viss ordning](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
när filer säger emot varandra, så reglerna hör hemma på ett ställe.

Filer i undermappar, som `web/AGENTS.md` i exemplet, läses vid olika
tillfällen. Claude Code läser en
[när det öppnar en fil där](https://code.claude.com/docs/en/memory).
Codex
[slutar leta i den mapp det startade i](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
och läser alltså filen i `web/` bara när det startas i `web/` eller under.
I VS Code är filer i undermappar
[ett experiment, avstängt från början](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
för den lokala agenten. Regler som måste gälla överallt står kvar i
rotfilen.

## Fabrikens regler står i filerna som läses först

Fabriken bakom den här sajten arbetar på samma sätt. Det var i en sådan
fil, den som varje agent på maskinen läser först, som vi klistrade in
meddelandet till de andra agenterna den 12 september.
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)
säger att reglerna "står i de filer varje session läser först" och räknar
"reglerna för en delad maskin" till vårt eget bidrag. Två av dem,
förkortade och utan namn:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Båda raderna bär sitt skäl – och inget av skälen går att läsa ut ur koden.

Varje rad har också ett pris.
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
räknar regelfilerna till startinnehållet och "startinnehållet följer med
varje anrop, så det kostar sin storlek gånger anropen, inte gånger
sessionerna".

Det som bara behövs ibland hör hemma någon annanstans: en agent med ett
eget jobb i del 3, färdigheter (skills) i del 4. Instruktionsfilen är det
första agenten läser, så den bär bara det som gäller varje gång.
