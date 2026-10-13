---
title: Instruktionsfilen, det första en AI-agent läser
description: Andra delen i serien "Från AI-chatt till agentiskt arbete" – om man ska göra en instruktionsfil, vad som ska stå i den först, hur den hålls användbar och hur en fil räcker för flera verktyg.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
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

Anthropic beskriver CLAUDE.md, sin variant av filen, som
[stället där man skriver ner det man annars skulle förklara på nytt](https://code.claude.com/docs/en/memory).
Studierna längre ned visar små och osäkra vinster, men en kort fil är snabb
att skriva och sparar att man förklarar samma sak igen. Håll därför
insatsen liten:

1. Skriv den själv, som en AGENTS.md i projektets rot. Forskare vid ETH
   Zürich
   [föreslår att man tills vidare undviker filer som en språkmodell har skrivit](https://arxiv.org/html/2602.11988v3).
2. Börja med kommandona för att installera, bygga och testa. Anthropic
   listar
   [kommandon som Claude inte kan gissa](https://code.claude.com/docs/en/best-practices)
   först bland det som hör hemma i filen.
3. Lägg till de få regler som agenten inte kan läsa ut ur koden, var och
   en med sitt skäl, så att den
   [fattar bättre beslut i gränsfall](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
4. Utelämna översikter och beskrivningar av vad varje fil gör:
   [agenten kan ta reda på det själv](https://code.claude.com/docs/en/best-practices).
5. Lägg till en rad när agenten
   [gör samma misstag en andra gång](https://code.claude.com/docs/en/memory).
   Stryk en rad när
   [agenten inte skulle göra något misstag utan den](https://code.claude.com/docs/en/best-practices).

Claude Code
[läser AGENTS.md också när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
Finns det en kan den filen
[importera AGENTS.md](https://code.claude.com/docs/en/memory), som avsnittet
om flera verktyg visar. Filen i slutet av historien är en startpunkt att
kopiera.

## Samma fil några veckor senare

Så här går stegen till, i en påhittad historia. Första dagen såg
utvecklarens fil ut som i del 1 och innehöll knappt mer än det som behövs
för att komma igång. Sedan behövde en databastabell en ny kolumn. I filen
stod det att ingenting i mappen `migrations/`, där databasens ändringar
ligger, fick ändras. Regeln gav varken skäl eller utväg, så agenten lämnade
ett löst SQL-skript i projektets rot.

Utvecklaren skrev om regeln så att den fick både skäl och utväg: filerna
har redan körts i produktion, så lägg till en ny migrering i stället. Två
veckor i rad körde agenten alla tester efter en ändring på en enda
rad, så filen fick en rad om hur man kör en enskild testfil.

Filen hade också fått ett stycke om vad varje fil i projektet gör. Sedan
frågade utvecklaren om varje rad: skulle agenten göra misstag om den togs
bort? Det stycket klarade inte det. Agenten läser filerna själv och
Anthropic räknar
[beskrivningar av kodbasen fil för fil](https://code.claude.com/docs/en/best-practices)
till det som inte hör hemma i filen. Stycket stryktes.

{% figure "file-before-after", "wide" %}

Webbgränssnittets tester ingår inte i `npm test`, så mappen `web/` fick en
egen AGENTS.md med en enda rad som lägger till webbtesterna utan att säga
emot rotfilen:

```markdown
- Also run `npm run test:web` before you say you are done.
```

Regeln om `migrations/` blev kvar i rotfilen. Den hade kunnat flytta in i en
AGENTS.md i `migrations/`, men verktygen läser filer i undermappar vid olika
tillfällen, så en regel som alltid måste gälla står säkrast i roten.
Rotfilen såg sedan ut så här:

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

En rad i filen hindrar ändå ingenting: den är en instruktion, inte en spärr.
[Ett av Anthropics egna exempel på en krok (hook)](https://code.claude.com/docs/en/best-practices),
[ett kommando som verktyget kör av sig självt](https://code.claude.com/docs/en/hooks-guide),
blockerar skrivningar till mappen med migreringar. I nivå, vår
självskattning av AI-kompetens, får databasmigreringar bara läggas till,
aldrig ändras – testmiljön, som byggdes före funktionerna, ser till att ett
nedskrivet beslut följs, som vi skrev i
[Lärdomar från att bygga nivå](/sv/blog/lessons-from-building-niva/). Sådana
spärrar är ämnet för del 7.

## Leverantörerna vill ha korta filer, men beläggen är tunna

OpenAI
[föredrar en kort och korrekt AGENTS.md framför en lång fil full av vaga regler](https://learn.chatgpt.com/docs/learn/best-practices).
GitHubs föreslagna prompt för att låta Copilot skriva sin egen
instruktionsfil
[ber om högst två sidor](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och Codex
[slutar som standard lägga till filer när de tillsammans når 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
ungefär 32 000 tecken.

Beläggen för att filen hjälper är tunnare än råden.
[En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3) lät
AI-agenter lösa verkliga uppgifter med och utan instruktionsfil. Filer som
utvecklarna själva hade skrivit höjde andelen lösta uppgifter med 2,4 % i
genomsnitt, medan filer som en språkmodell hade skrivit sänkte den med 0,5
och 2 % i studiens två uppsättningar uppgifter. Ingen av skillnaderna är
statistiskt säkerställd, så studien kan inte skilja dem från slumpen.

Kostnaden är tydligare. De genererade filerna gjorde körningarna 20 och 23 %
dyrare. Den ökningen är säkerställd. Även de handskrivna filerna höjde
kostnaden, med högst 19 %. Översikter av projektet hjälpte inte, trots att
forskarna noterar att leverantörerna rekommenderar dem.

[En annan, mindre studie av 124 pull requests](https://arxiv.org/abs/2601.20404)
fann att körningarna med en AGENTS.md hade 28,64 % kortare mediantid och att
agenterna löste uppgifterna ungefär lika ofta. Där sparade filen alltså tid
men gav inte bättre svar.

Claude Code och Codex kan båda skriva ett första utkast, men Anthropic
rekommenderar att man
[förfinar det med sådant som Claude inte skulle hitta på egen hand](https://code.claude.com/docs/en/memory)
och OpenAI att man
[redigerar resultatet så att det passar hur teamet arbetar](https://learn.chatgpt.com/docs/learn/best-practices).
Det talar för att skriva filen för hand – eller redigera ett utkast ned till
det agenten inte kan ta reda på själv – och för att räkna med små och
osäkra vinster.

## Modellerna ändras – och filen med dem

En fil som skrevs för en äldre modell kan bli för högljudd för nästa. I
oktober 2026 står det i
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att vissa nyare modeller är mer lyhörda för systemprompten,
verktygets egna instruktioner, så där man tidigare skrev "CRITICAL: You MUST use
this tool when..." kan man nu skriva "Use this tool when...".

Sedan den 25 september 2026 har Claude Code
[ett kommando som letar efter instruktioner skrivna för äldre modeller](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

Granskningen omfattar
[AGENTS.md också](https://code.claude.com/docs/en/memory) och ändrar
ingenting förrän man ber om det.

## En fil för tre verktyg

Med flera verktyg räcker en AGENTS.md i roten, så länge varje verktyg
hittar den. Verktygen beskriver vi så som dokumentationen såg ut den
13 oktober 2026.

{% figure "which-tool-reads-what", "wide" %}

[Codex läser AGENTS.md innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
GitHub Copilot läser den också, både
[på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och [i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Claude Code läser också AGENTS.md, men som standard
[bara när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
Finns det en kan den filen
[importera AGENTS.md](https://code.claude.com/docs/en/memory) med en enda
rad:

```text
@AGENTS.md
```

Det finns en fälla: en personlig CLAUDE.local.md
[räknas som en CLAUDE.md](https://code.claude.com/docs/en/memory), så den
som lägger till en får som standard sin egen Claude Code att sluta läsa
AGENTS.md.
[Med inställningen Project instructions i `/config` satt till `claude-md-and-agents-md` läses AGENTS.md ändå](https://code.claude.com/docs/en/memory).

GitHub Copilot läser också `.github/copilot-instructions.md` och tar med
[alla instruktioner som gäller](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
VS Code avråder från att
[räkna med en viss ordning](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
när filer säger emot varandra. Därför hör reglerna hemma på ett ställe.

Filer i undermappar, som `web/AGENTS.md` i exemplet, läses vid olika
tillfällen. Utan CLAUDE.md läser Claude Code en sådan fil
[när det öppnar en fil där](https://code.claude.com/docs/en/memory).
Codex
[letar från projektets rot ner till den mapp det startade i](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
så filen i `web/` läses bara när det startas i `web/` eller i en mapp under
den. I VS Code är filer i undermappar
[ett experiment, avstängt som standard](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
för [VS Codes inbyggda agent](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses).
Regler som måste gälla överallt står kvar i rotfilen.

## Fabrikens regler står i filerna som läses först

Fabriken bakom den här sajten arbetar på samma sätt. I
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)
skrev vi att reglerna "står i de filer varje session läser först" och att
"reglerna för en delad maskin" är vårt eget bidrag. Två av dem, förkortade
och utan namn:

```markdown
- Never stop processes by a pattern: it also hits other agents'
  processes. Keep the id of what you start and stop that id.
- Never delete the shared container runtime's data: it holds every
  project's images and databases.
```

Båda raderna anger sitt skäl – och inget av skälen går att läsa ut ur koden.

Varje rad har också ett pris. I
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
räknas de regelfiler som vår samordnande agent läser till det som skickas
till modellen i varje anrop, så en längre fil kostar mer vid varje anrop.

Det som bara behövs ibland hör hemma någon annanstans: en agent med ett
eget jobb i del 3, färdigheter (skills) i del 4.
