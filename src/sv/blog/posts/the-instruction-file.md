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

Använder du en AI-agent i ett projekt ska du skapa en sådan fil. Agenten kan
läsa din kod men inte gissa hur projektet installeras och testas. Det talar
några rader i filen om.

## En påhittad webbapp och dess fil

Ett påhittat exempel: en utvecklare startar en webbapp med en databas och
tester och har en AI-agent som hjälp. Agenten vet ingenting om projektet, så
första dagen skriver utvecklaren ner det en ny kollega skulle behöva veta – och
inget mer. Resultatet är en vanlig textfil som heter AGENTS.md, i projektets
översta mapp (roten):

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
beroendena installeras och hur testerna körs. Reglerna är de få saker som inte
går att läsa ut ur koden. En av dem håller agenten borta från mappen
`migrations/`, där databasens ändringar ligger som filer som kallas
migreringar. En annan ser till att ny kod utifrån, så kallade paket, inte tar
sig in i projektet obemärkt.

Filen är kort med flit. En lång fil tar mer av det utrymme agenten har att
arbeta i och följs sämre. Därför föreslår Anthropic
[under 200 rader](https://code.claude.com/docs/en/memory) och OpenAI hellre
[en kort och korrekt fil](https://learn.chatgpt.com/docs/learn/best-practices)
än en lång full av vaga regler.

En vecka senare behöver databasen en ny kolumn. Filen säger att ingenting i
`migrations/` får ändras, men inte varför och inte vad agenten ska göra i
stället, så agenten lämnar en lös fil med databaskommandon i projektets rot.
Utvecklaren läser igenom agentens ändringar, hittar filen och ber agenten lägga
ändringen i en ny migrering.

Sedan skriver utvecklaren om regeln så att den ger
både skäl och utväg: filerna har redan körts i produktion, alltså mot den
riktiga databasen, så ändringen görs i en ny migrering. En regel med sitt skäl
hjälper i fall som ingen har tänkt på: när instruktionerna förklarar varför en
konvention finns fattar agenten
[bättre beslut i ovanliga fall](https://code.visualstudio.com/docs/agent-customization/custom-instructions).

Två gånger under de följande två veckorna kör agenten alla tester efter en
ändring på en enda rad, fast en testfil hade räckt. Andra gången lägger
utvecklaren till en rad om hur en enskild testfil körs.

Vid det laget har filen också fått ett stycke om vad varje fil i projektet
gör. Det ser hjälpsamt ut men klarar inte
[testet Anthropic föreslår](https://code.claude.com/docs/en/best-practices)
för vad som ska skrivas ner: kan agenten hitta det genom att läsa koden – och
skulle den faktiskt gå och titta? Om båda svaren är ja lämnas raden bort.
Utvecklaren tar bort stycket.

{% figure "file-before-after", "wide" %}

Till sist ingår inte testerna för den del av appen som körs i webbläsaren i
`npm test`. Mappen `web/` får en egen AGENTS.md med en enda rad som lägger till
dem:

```markdown
- Also run `npm run test:web` before you say you are done.
```

Då finns det två filer, två av de nivåer som del 1 beskrev: en för hela
projektet och en för en enskild mapp. När agenten arbetar i `web/` läser den
rotfilen först och filen i `web/` efter den. Den närmaste filen har sista ordet,
som del 1 beskrev: i Codex till exempel
[går filer närmare den mapp det arbetar i före tidigare riktlinjer](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Regeln om `migrations/` blir kvar i rotfilen, eftersom den gäller hela
projektet. Rotfilen ser nu ut så här:

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

Det finns inte mycket som visar att en instruktionsfil hjälper.
[En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3) lät AI-agenter
lösa verkliga uppgifter med och utan instruktionsfil. Filer som utvecklarna
själva hade skrivit höjde andelen lösta uppgifter med 2,4 % i genomsnitt.

Det är en liten vinst som studien inte kan skilja från slumpen. Forskare
kallar en skillnad "statistiskt säkerställd" när slumpen är en osannolik
förklaring till den, så ordet betyder inte att skillnaden är stor. Ingen av
skillnaderna i studien var säkerställd.

Filer som en språkmodell hade skrivit sänkte andelen något. Forskarna föreslår
att man tills vidare undviker filer som en språkmodell har skrivit.

Alla filerna gjorde körningarna dyrare, med upp till ungefär en femtedel.

Studien tittade också på översikter av projektet, som det stycke utvecklaren
tog bort. Forskarna fann att sådana översikter, fast populära, inte hjälpte.

[En annan, mindre studie](https://arxiv.org/abs/2601.20404) tittade på 124 pull
requests, alltså föreslagna ändringar i ett projekts kod. En typisk körning med
en AGENTS.md gick mer än en fjärdedel snabbare. Agenterna slutförde uppgifterna
ungefär lika ofta. Där sparade filen tid men gav inte bättre svar.

Forskarna bakom den första studien rekommenderar att en fil bara innehåller det
agenten inte kan få fram ur koden. Det stämmer med filen i exemplet: kommandona
och de få reglerna är sådant agenten inte kan räkna ut själv. Studierna ger
ingen anledning att lägga till mer.

## När agenten gör fel

Om filen inte säger något om misstaget säger du till agenten och går vidare,
eftersom ett enstaka misstag kan vara en engångsgrej. Gör agenten samma misstag
en andra gång [lägger du till en rad i filen](https://code.claude.com/docs/en/memory),
som utvecklaren gjorde med den enskilda testfilen.

Ibland finns raden redan och agenten gör ändå fel. Kontrollera först att
verktyget läser filen över huvud taget: Claude Code läser till exempel
AGENTS.md som standard bara där det inte finns någon CLAUDE.md. Avsnittet om
verktygen längre ner säger vad varje verktyg läser.

Titta sedan på raden. En rad som ger
sitt skäl och en utväg fungerar bättre, som regeln om `migrations/` efter
omskrivningen. Där väntade utvecklaren inte på ett andra misstag, eftersom
felet låg i raden: den saknade sitt skäl.

Agenten försöker följa filen men även en bra rad
[fungerar för det mesta, inte varje gång](https://code.claude.com/docs/en/best-practices).
En regel som aldrig får brytas behöver därför något utanför filen. Ett sätt är
ett test i projektet som misslyckas när regeln bryts: för `migrations/` ett test
som misslyckas när en migrering som redan finns i projektet ändras. Agenten kan
skriva testet åt dig om du ber den.

Det andra sättet är en inställning i
verktyget som blockerar ändringen. I Claude Code är en sådan inställning en så
kallad [krok (hook)](https://code.claude.com/docs/en/hooks-guide), ett kommando
som verktyget kör av sig självt. Anthropics eget exempel är en krok som
blockerar ändringar i mappen med migreringar. Du kan be Claude skriva den åt
dig.

Det som aldrig får hända stoppas utanför modellen, som del 1 beskrev.
[Del 7](#del-7) i serien tar upp det igen.

## En fil för tre verktyg

Med flera verktyg i projektet räcker en AGENTS.md i översta mappen om varje
verktyg hittar den. Det stämmer med
[VS Codes dokumentation](https://code.visualstudio.com/docs/agent-customization/custom-instructions),
som rekommenderar ett gemensamt format som alla verktygen stöder, när det går.
Verktygen beskriver vi så som dokumentationen såg ut den 30 oktober 2026. Det
vi skriver kan ha ändrats sedan dess.

Filen i översta mappen läses vid varje start, som del 1 beskrev. En fil i en
undermapp, som den i `web/`, läses när verktyget börjar arbeta i den mappen.

{% figure "which-tool-reads-what", "wide" %}

**Claude Code** har CLAUDE.md som egen instruktionsfil och läser som standard
[AGENTS.md bara där det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
Där det läser AGENTS.md läser det en fil i en undermapp när det öppnar en fil
där. Finns det en CLAUDE.md kan den hämta in AGENTS.md med en enda rad, så att
AGENTS.md förblir den fil som alla verktyg delar:

```text
@AGENTS.md
```

För den här regeln räknas en CLAUDE.local.md, en fil för egna anteckningar, som
en CLAUDE.md. Lägger du till en i ett projekt som bara har en AGENTS.md slutar
Claude Code därför läsa AGENTS.md, om inte en inställning säger något annat.

I OpenAI:s **Codex** är AGENTS.md själva instruktionsfilen: Codex
[läser den innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
en fil per mapp från projektets rot ner till den mapp det arbetar i. Som
standard slutar det lägga till filer när de tillsammans når 32 KiB, ungefär
32 000 tecken.

**GitHub Copilot** läser AGENTS.md också, både
[på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och i VS Code. Det läser dessutom `.github/copilot-instructions.md` och skickar
alla instruktioner som gäller till modellen. I VS Code hittar det en fil i en
undermapp när det arbetar med filer där.

## Börja litet

Skapa en vanlig textfil som heter AGENTS.md i projektets översta mapp. Börja
med kommandona för att installera, bygga och testa och lägg sedan till de få
regler som agenten inte kan läsa ut ur koden, var och en med sitt skäl. Låt bli
översikter och beskrivningar av vad varje fil gör.

Du kan skriva filen själv eller be agenten skriva ett utkast. Skriver ett
verktyg ett utkast åt dig, redigera det: både
[Anthropic](https://code.claude.com/docs/en/memory) och
[OpenAI](https://learn.chatgpt.com/docs/learn/best-practices) säger att
utkastet ska redigeras. Studien ovan är ett skäl att korta ner utkastet till
kommandona och de få reglerna, eftersom genererade filer inte gav någon vinst
men ökade kostnaden.

När du byter till en nyare modell, läs filen igen: betoning som MUST med versaler,
tillagd för att få en äldre modell att använda ett verktyg oftare, kan få en
nyare modell att [ta i för mycket](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).

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
