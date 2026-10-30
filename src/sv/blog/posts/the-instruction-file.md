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

Vi följer webbappen och dess fil från första dagen till några veckor senare
och tittar sedan på vad studierna säger och hur verktygen skiljer sig åt.

## En påhittad webbapp och dess fil

Ett påhittat exempel: en utvecklare startar en webbapp med en databas och
tester och har en AI-agent som hjälp. Agenten vet ingenting om projektet, så
första dagen skriver utvecklaren ner det en ny kollega skulle behöva veta – och
inget mer. Resultatet är en fil som heter AGENTS.md, i projektets översta mapp
(roten):

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
agenten borta från mappen `migrations/`, där databasens ändringar ligger som
filer som kallas migreringar. En annan ser till att ny kod utifrån, så kallade
paket, inte tar sig in i projektet obemärkt.

Filen är kort med flit.
[Anthropic rekommenderar under 200 rader per fil, eftersom längre filer tar mer plats och följs sämre](https://code.claude.com/docs/en/memory).
[OpenAI föredrar en kort och korrekt AGENTS.md framför en lång fil full av vaga regler](https://learn.chatgpt.com/docs/learn/best-practices).

En vecka senare behöver databasen en ny kolumn. Filen säger att ingenting i
`migrations/` får ändras, men inte varför och inte vad agenten ska göra i
stället, så agenten lämnar en lös fil med databaskommandon i projektets rot.
Utvecklaren ser det när agentens ändringar läses igenom och skriver om regeln
så att den ger både skäl och utväg: filerna har redan körts i produktion,
alltså mot den riktiga databasen, så ändringen görs i en ny migrering.
[VS Codes dokumentation](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
säger att agenten fattar bättre beslut i ovanliga fall när instruktionerna
förklarar varför en konvention finns.

Två gånger under de följande två veckorna kör agenten alla tester efter en
ändring på en enda rad, fast en testfil hade räckt. Andra gången lägger
utvecklaren till en rad om hur man kör en enskild testfil.

Vid det laget har filen också fått ett stycke om vad varje fil i projektet
gör. Det ser hjälpsamt ut, men
[Anthropic föreslår ett test för vad man ska skriva ner](https://code.claude.com/docs/en/best-practices):
kan agenten hitta det genom att läsa koden – och skulle den faktiskt gå och
titta? Om båda svaren är ja ska raden bort, så utvecklaren tar bort stycket.

{% figure "file-before-after", "wide" %}

Till sist ingår inte testerna för den del av appen som körs i webbläsaren i
`npm test`. Mappen `web/` får en egen AGENTS.md med en enda rad som lägger till
dem:

```markdown
- Also run `npm run test:web` before you say you are done.
```

Då finns det två filer, två av de nivåer som del 1 beskrev: en för hela
projektet och en för en enskild mapp. Regeln om `migrations/` blir kvar i
rotfilen, eftersom den gäller hela projektet. Rotfilen ser nu ut så här:

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

## Vad studierna visar

Hjälper filen alls? [En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3)
lät AI-agenter lösa verkliga uppgifter med och utan instruktionsfil. Filer som
utvecklarna själva hade skrivit höjde andelen lösta uppgifter med 2,4 % i
genomsnitt.

Det är en liten vinst som studien inte kan skilja från slumpen. Forskare
kallar en skillnad "statistiskt säkerställd" när slumpen är en osannolik
förklaring till den, så ordet betyder inte att skillnaden är stor. Ingen av
skillnaderna i studien var säkerställd.

Filer som en språkmodell hade skrivit sänkte andelen något i båda studiens
uppsättningar uppgifter. Forskarna föreslår att man tills vidare undviker filer
som en språkmodell har skrivit.

Alla filerna gjorde körningarna dyrare, med upp till ungefär en femtedel.

Studien tittade också på översikter av projektet, som det stycke utvecklaren
tog bort. Forskarna fann att sådana översikter inte hjälpte, trots att
leverantörerna av modeller rekommenderar dem.

[En annan, mindre studie](https://arxiv.org/abs/2601.20404) tittade på 124 pull
requests, alltså föreslagna ändringar i ett projekts kod. Körningar med en
AGENTS.md hade en mediantid som var mer än en fjärdedel kortare. Agenterna
slutförde uppgifterna ungefär lika ofta. Där sparade filen tid men gav inte
bättre svar.

Det finns alltså inte mycket som visar att en instruktionsfil hjälper. Den ena
studien visar att varje fil ökar kostnaden och att ingen tydligt hjälper, den
andra att körningarna går fortare och att resultaten blir desamma. Forskarna
bakom den första rekommenderar att man bara tar med det agenten inte kan få
fram ur koden. Det är tanken bakom rådet här: skriv filen själv och håll den
kort.

## När agenten inte följer en rad

Första gången agenten gör fel säger du till och går vidare: ett misstag är
ännu ingen regel.
[Anthropic rekommenderar att man lägger till en rad när Claude gör samma misstag en andra gång](https://code.claude.com/docs/en/memory),
som utvecklaren gjorde med testkommandot.

Ibland finns raden där och agenten bryr sig ändå inte om den. En rad i filen
ber agenten om något men stoppar den inte. [Anthropic skriver att en sådan rad fungerar för det mesta, inte varje gång](https://code.claude.com/docs/en/best-practices).
Kontrollera först att raden säger varför och vad agenten ska göra i stället,
som regeln om `migrations/` gör efter omskrivningen.

En regel som aldrig får brytas behöver en kontroll utanför filen.
[Anthropics sida om bästa praxis](https://code.claude.com/docs/en/best-practices)
tar samma regel som exempel: en regel som att låta mappen med migreringar vara
följs nästan varje gång. För de få regler där "nästan" inte räcker flyttar
sidan regeln ut ur filen och in i inställningar som Claude Code själv
genomför. Där blir den en krok (hook), ett kommando som
[verktyget kör av sig självt](https://code.claude.com/docs/en/hooks-guide).
Kroken [blockerar ändringar i mappen med migreringar](https://code.claude.com/docs/en/best-practices).

Ett test i projektet gör samma nytta i vilket verktyg som helst: i exemplet ett
test som misslyckas när en migrering som redan finns i projektet ändras. I
[nivå](https://erniva.se/), vår självskattning av AI-kompetens, körs tester och
kontroller vid varje ändring. Databasmigreringar får bara läggas till, aldrig
ändras. Vi skrev om det i
[Lärdomar från att bygga nivå](/sv/blog/lessons-from-building-niva/).

Det som aldrig får hända stoppas utanför modellen, som del 1 beskrev.
[Del 7](#del-7) i serien tar upp det igen.

## En fil för tre verktyg

Med flera verktyg i projektet räcker en AGENTS.md i översta mappen, så länge
varje verktyg hittar den.
[VS Codes dokumentation rekommenderar ett gemensamt format som alla verktygen stöder, när det går](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Verktygen beskriver vi så som dokumentationen såg ut den 30 oktober 2026. Det vi skriver kan ha ändrats sedan dess.

{% figure "which-tool-reads-what", "wide" %}

**Claude Code** har CLAUDE.md som egen instruktionsfil och läser också
AGENTS.md, men som standard
[bara när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
I så fall läser det en fil i en undermapp
[när det öppnar en fil där](https://code.claude.com/docs/en/memory). Finns det
en CLAUDE.md kan den
[hämta in AGENTS.md](https://code.claude.com/docs/en/memory) med en enda rad:

```text
@AGENTS.md
```

[En CLAUDE.local.md, för egna anteckningar, räknas som en CLAUDE.md](https://code.claude.com/docs/en/memory),
så om man lägger till en slutar Claude Code läsa AGENTS.md, om inte
[en inställning säger något annat](https://code.claude.com/docs/en/memory).

I OpenAI:s **Codex** är AGENTS.md själva instruktionsfilen: Codex
[läser den innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
en fil per mapp från projektets rot ner till den mapp det arbetar i. Som
standard [slutar det lägga till filer när de tillsammans når 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
ungefär 32 000 tecken.

**GitHub Copilot** läser AGENTS.md också, både
[på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och [i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
Det läser dessutom `.github/copilot-instructions.md` och skickar
[alla instruktioner som gäller](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
till modellen. I VS Code
[hittar det en fil i en undermapp när det arbetar med filer där](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

## Börja litet

Skapa filen som en AGENTS.md i projektets översta mapp och skriv den själv.
Börja med kommandona för att installera, bygga och testa och lägg sedan till de
få regler som agenten inte kan läsa ut ur koden, var och en med sitt skäl. Låt
bli översikter och beskrivningar av vad varje fil gör.

Låter du ett verktyg skriva ett utkast, redigera det:
både [Anthropic](https://code.claude.com/docs/en/memory) och
[OpenAI](https://learn.chatgpt.com/docs/learn/best-practices) säger att man ska
göra det. Studien ovan är ett skäl att korta ner det till kommandona och de få
reglerna, eftersom genererade filer inte gav någon vinst men ökade
kostnaden.

När du byter modell läser du filen igen. I oktober 2026 står det i
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
att vissa nyare modeller är mer lyhörda för systemprompten, de instruktioner
som ett verktyg skickar före din konversation. Har du tidigare lagt till
betoning för att få en äldre modell att använda ett verktyg oftare kan en
nyare modell nu ta i för mycket. Guidens råd är att mjuka upp hårda
formuleringar. Där man tidigare skrev "CRITICAL: You MUST use this tool
when..." kan man nu skriva "Use this tool when...".

Sedan den 25 september 2026 har Claude Code
[ett kommando som letar efter instruktioner skrivna för äldre modeller](https://code.claude.com/docs/en/changelog):

```text
/doctor prompt-audit
```

Granskningen omfattar
[AGENTS.md också](https://code.claude.com/docs/en/memory) och ändrar
ingenting förrän man ber om det.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. Instruktionsfilen (den här delen)
3. Agenter med var sitt ansvarsområde
4. Skills – färdigheter som beskriver hur något ska göras
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
