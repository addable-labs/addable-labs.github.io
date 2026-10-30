---
title: Skills, när arbetet ska göras likadant varje gång
description: Fjärde delen i serien "Från AI-chatt till agentiskt arbete" – hur ett jobb ska göras likadant varje gång, vad en skill är, varför det som måste bli exakt hör hemma i ett skript, vad studierna visar och vad du gör först.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: skills-for-repeatable-work
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/),
seriens andra del, fick AI-agenten en kort textfil att läsa varje gång den
startar. Den filen säger vad agenten är ansvarig för och vilket jobb den ska
göra.

Del 3 handlade om vad jobbet är. Den här delen handlar om hur jobbet ska göras,
så att det görs på samma sätt varje gång, till exempel när en ny version av
appen släpps (en release). Det hör hemma i en skill: en mapp med en textfil som
säger när och hur jobbet görs – och ofta ett litet program, ett skript, för det
som måste bli exakt.

## En release som blir olika varje gång

Ett påhittat exempel: utvecklaren av webbappen från de tidigare delarna gör en
release. En release betyder att versionsnumret i `package.json` höjs, att
ändringsloggen får en post om den nya versionen, att testerna körs och att
versionen taggas. Ändringsloggen är en fil, CHANGELOG.md, som listar vad som
ändrades i varje version. En tagg är ett namn i git, som `v1.4.0`, som
markerar releasen.

Utvecklaren ber agenten: "Gör en release." Agenten gör jobbet men aldrig
likadant två gånger. En gång glömmer den posten i ändringsloggen. En annan gång
står det 1.4.0 i ändringsloggen medan `package.json` säger 1.3.1.

Varje gång rättar utvecklaren agenten i chatten och skriver samma påminnelser
som sist.
[Anthropics dokumentation](https://code.claude.com/docs/en/skills) säger att
det är dags att göra en skill när du gång på gång klistrar in samma
instruktioner, checklista eller arbetssätt i chatten.

## En skill är en mapp

En skill är en mapp med en textfil som heter SKILL.md. Filen börjar med ett namn
(`name`) och en beskrivning (`description`) – de två fält som varje skill
behöver – och fortsätter med instruktionerna. Andra fält är valfria; "Avancerade
skills" nära slutet beskriver dem.

Bredvid SKILL.md kan det ligga ett skript – ett kort program som gör en bestämd
sak – och andra filer som instruktionerna hänvisar till. En sort är en mall: en
text med de fasta delarna redan skrivna, som rubrikerna i en post i
ändringsloggen, så att varje post får samma form.

Agenten läser inte hela mappen vid starten. Den har bara namn och beskrivning
för varje skill framför sig. När uppgiften passar en beskrivning läser agenten
instruktionerna och kör skriptet när instruktionerna säger det.
[Standarden Agent Skills](https://agentskills.io/home) beskriver samma tre steg.

Den 22 oktober 2026 [donerade Anthropic standarden](https://www.anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation)
till Agentic AI Foundation (AAIF), en stiftelse inom Linux Foundation som också
förvaltar AGENTS.md.

{% figure "skill-folder", "wide" %}

Så här ser SKILL.md ut för skillen release i exemplet:

```text
---
name: release
description: Prepares a release of the web app. Checks that the version number and the changelog agree, then runs the tests. Use when the user asks for a release, a new version or a tag.
---

# Release

1. Run `sh scripts/check-release.sh` from this skill's folder.
2. If it prints a problem, fix that and run it again. Go on only when it
   prints OK.
3. Run `npm test`.
4. Tell the developer the version number and ask before you create the tag.
```

Beskrivningen är raden agenten läser för att avgöra om skillen ska användas, så
den säger vad skillen gör och när den ska användas. En beskrivning som bara
säger "hjälper till med releaser" ger det första men inte det andra.
[Specifikationen för Agent Skills](https://agentskills.io/specification) ger
"hjälper till med PDF:er" (vår översättning) som exempel på en dålig
beskrivning.

Instruktionerna är korta med flit. När en skill har lästs in blir texten kvar
och tar plats i samtalet för varje svar, så Anthropic rekommenderar att den
hålls kort.

## Lägg det som måste bli exakt i ett skript

Skillens första steg kör ett skript. Utan ett skript skriver agenten själv koden
för kontrollen varje gång. Den koden kan skilja sig lite från en körning till
nästa. Ett nytt fel kan också smyga sig in.

Ett skript skrivs en gång, testas och körs sedan som det är. Dyker det upp ett
fel senare rättas det på ett ställe. Anthropics
[guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
säger att färdiga skript är mer tillförlitliga än genererad kod och gör
resultaten enhetliga från gång till gång.

Så här ser skriptet ut:

```text
#!/bin/sh
# Checks that the version in package.json is the one the changelog
# describes, and that no tag exists for it yet.

top=$(git rev-parse --show-toplevel) || exit 1
cd "$top" || exit 1

version=$(node -p "require('./package.json').version" 2>/dev/null)
latest=$(grep -m1 '^## ' CHANGELOG.md 2>/dev/null | cut -d' ' -f2 | tr -d '\r[]')

if [ -z "$version" ] || [ -z "$latest" ]; then
  echo "Could not read the version from package.json or the changelog." >&2
  exit 1
fi

if [ "$version" != "$latest" ]; then
  echo "package.json says $version, but the changelog starts with $latest." >&2
  echo "Make them agree." >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "Version $version is already tagged. Raise the version first." >&2
  exit 1
fi

echo "OK: $version is ready to release."
```

Skriptet börjar med att gå till projektets toppmapp, som git kan hitta var som
helst inne i projektet. Det spelar ingen roll om agenten startar skriptet från
skillens mapp eller från toppmappen. Sedan läser det versionen i
`package.json` och den första rubriken i ändringsloggen. Kan det inte läsa någon
av dem stannar det, så att en saknad fil inte tas för ett godkänt resultat.

Därefter jämför skriptet de två och kontrollerar att git inte har någon tagg för
versionen ännu. Rubriken i ändringsloggen får skrivas `## 1.4.0` eller
`## [1.4.0] - 2026-10-30`. Misslyckas en kontroll skriver skriptet ut vad som är
fel och stannar. Går allt igenom skriver det ut OK.

Skriptets meddelanden är skrivna för agenten också: "package.json says 1.3.1,
but the changelog starts with 1.4.0. Make them agree." talar om vad som är fel
och vad som ska göras, som guiden om skript i Agent Skills
[rekommenderar](https://agentskills.io/skill-creation/using-scripts).

En del av arbetet lämpar sig bättre för instruktioner. Hur en post i
ändringsloggen för 1.4.0 ska formuleras beror på omdöme. Några meningar
instruktion är rätt verktyg för det. Guiderna från Anthropic och OpenAI drar
gränsen på samma ställe. Anthropic rekommenderar ett färdigt skript för en
åtgärd som är känslig och måste göras likadant varje gång. OpenAI rekommenderar
[instruktioner före skript, om du inte behöver deterministiskt beteende eller externa verktyg](https://learn.chatgpt.com/docs/build-skills).
Deterministiskt betyder att samma indata alltid ger samma resultat.

Ett skript hjälper bara när det körs: agenten måste välja skillen och följa det
första steget. Det som aldrig får hoppas över behöver ett skydd utanför skillen,
på samma sätt som en regel i instruktionsfilen i del 2: ett test i projektet
eller en inställning i verktyget som stoppar steget. Claude Codes dokumentation
rekommenderar att en regel som måste gälla varje gång flyttas till en krok
(hook), ett kommando som verktyget kör av sig självt.

## En skill, en instruktion eller en förfrågan

Allt hör inte hemma i en skill.

Instruktionsfilen är den AGENTS.md som
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
beskriver. Den säger vad agenten är ansvarig för och vilket jobb den ska göra.
Den läses vid varje start, så den hålls kort. Claude Code kallar sin fil
CLAUDE.md.

En skill säger hur en sorts jobb ska göras, som en release, en granskning eller
en översättning. Den är inte en andra agent som den i del 3: den är text som
agenten du redan pratar med läser när jobbet kommer upp.

Att ta reda på hur ett jobb ska göras hör hemma i chatten. När det blir som du
vill kan stegen bli en skill.

## Vad studierna visar

Här är två studier som körde samma uppgifter med och utan en skill.

[SkillsBench](https://arxiv.org/html/2602.12670v4) gav AI-agenter 87 uppgifter
som kördes i en terminal, var och en med tester som poängsätter resultatet.
Experter hade tagit fram skills för uppgifterna. Som genomsnitt över 18
kombinationer av en modell och ett verktyg klarade agenterna ungefär 34
uppgifter av 100 utan skillen och ungefär 51 med den.

Vinsten skilde sig mycket, från ungefär 4 fler uppgifter av 100 till ungefär 26
fler. På 13 av de 87 uppgifterna blev genomsnittsresultatet sämre med skillen.
Forskarna kallar sina skills av hög kvalitet för "ett optimistiskt scenario"
(vår översättning).

[SWE-Skills-Bench](https://arxiv.org/html/2603.15401v2) körde 98 offentliga
skills för programvaruarbete, var och en på ett riktigt kodförråd, en gång utan
skillen och en gång med den. Den genomsnittliga andelen godkända kontroller gick
från 76,6 % till 76,9 %. För 92 av de 98 skills fann forskarna ingen statistiskt
signifikant effekt, alltså ingen skillnad som går att skilja från slumpen.

Forskarna lägger till att det betyder att ingen effekt kunde påvisas, inte att
effekten är noll. Uppgifterna utformades utifrån det som varje skill säger sig kunna. De
få skills som hjälpte gav agenten steg som den annars skulle ha lämnat bort.

SkillsBench lät också tre av kombinationerna skriva skills åt sig själva innan
de löste varje uppgift. Med sina egna skills klarade de 8 till 12 färre uppgifter
av 100 än utan någon skill alls.

SkillsBench skilde inte ut vad i en skill som gör jobbet: forskarna nämner
"steg, exempel, kodresurser" (vår översättning) som de delar som framtida arbete
måste isolera. En skill gör också kontexten längre, så en del av vinsten kan
enligt forskarna komma från "mer kontext" (vår översättning) och inte från
stegen. Den tar upp "starkare baslinjer med matchad längd" (vår översättning),
till exempel slumpmässig eller irrelevant text, som framtida arbete.

SWE-Skills-Bench mätte också hela skills. Därför visar ingen av studierna att
ett skript hjälper mer än vanliga instruktioner.

För dig betyder det att en skill inte är en säker vinst. Hur mycket den hjälper
beror på modellen och verktyget, som båda studierna fann. Testa din skill med
dem du använder, som de följande avsnitten beskriver. Läs också det en agent har
skrivit åt dig innan du litar på det.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess. Alla tre följer samma format, Agent
Skills, så mappen och dess SKILL.md ser likadana ut i var och en. Det som
skiljer är var mappen ligger och hur du startar en skill.

I **Claude Code** är en skill en mapp i `.claude/skills/` i projektet eller
i `~/.claude/skills/` för alla dina projekt. Du startar skillen release
genom att skriva `/release`. Claude kan också läsa in den själv när din
förfrågan passar beskrivningen.

I OpenAI:s **Codex** är en skill en mapp i `.agents/skills/`.
[Codex CLI](https://learn.chatgpt.com/docs/cli) körs i en terminal och
[IDE-tillägget](https://learn.chatgpt.com/docs/ide) i en kodredigerare. I båda
startar du en skill genom att skriva `$` och dess namn eller köra `/skills`.
Codex kan också välja en utifrån beskrivningen.

**GitHub Copilot** läser skills för projektet från
[`.github/skills/`, `.claude/skills/` och `.agents/skills/`](https://docs.github.com/en/copilot/concepts/customizations/agent-skills).
De fungerar i VS Code, i Copilot CLI och i Copilots molnagent (cloud agent) på
GitHub. I VS Code dyker de skills du kan starta själv upp när du
[skriver `/` i chatten](https://code.visualstudio.com/docs/agent-customization/agent-skills).

{% figure "skill-locations", "wide" %}

För att alla tre verktygen ska använda en och samma kopia lägger du skillen i
`.agents/skills/` och länkar till den från `.claude/skills/`. Både Claude Code
och Codex följer en länk till en mapp. På macOS och Linux skapar de här två
raderna, körda i projektets toppmapp, länken:

```text
mkdir -p .claude/skills
ln -s ../../.agents/skills/release .claude/skills/release
```

## Kontrollera att den fungerar

Börja en ny chatt och se först att verktyget har hittat skillen. I Claude Code
frågar du vilka skills som finns. I Codex CLI eller i IDE-tillägget kör du
`/skills`. I VS Code skriver du `/` i chatten och letar efter skillen i listan.

Be sedan om jobbet med dina egna ord, som "Gör en release". Se om agenten väljer
skillen. Gör den inte det, starta skillen med namn. Läs i vilket fall vad
agenten gjorde: om den körde skriptet, följde de fyra stegen och frågade innan
den skapade taggen.

Claude Code har också `/skill-doctor`, som visar vad varje skill kostar i
utrymme och hur ofta den används. Ett tillägg som heter skill-creator kör
testfall för en skill med och utan den.

## Felsökning

Fem saker kan gå fel:

- Agenten använder inte skillen.
- Skillen startar när den inte ska.
- `/release` känns inte igen.
- Agenten hoppar över steg sent i ett långt samtal.
- Skriptet säger OK när det inte ska.

Använder agenten inte skillen, titta först på beskrivningen: lägg till orden du
använder när du ber om arbetet.

Startar skillen när den inte ska, gör beskrivningen smalare. Ett jobb som du
vill starta själv kan säga det. Anthropics exempel på en sådan skill är en
driftsättning, där du inte vill att Claude bestämmer sig för att driftsätta för
att koden ser färdig ut. I Claude Code och VS Code gör den här raden högst upp i
SKILL.md, under beskrivningen, att bara du kan starta skillen:

```text
disable-model-invocation: true
```

För att hindra Codex från att välja skillen själv lägger du en fil
`agents/openai.yaml` i skillens mapp med de här raderna:

```text
policy:
  allow_implicit_invocation: false
```

Om `/release` inte känns igen har verktyget inte hittat skillen. Kontrollera
att mappen ligger på ett ställe som verktyget läser och att filen heter
SKILL.md. I Claude Code behöver en skills-mapp som du skapade medan verktyget
kördes kommandot `/reload-skills`. I Codex behöver en skill som inte dyker
upp en omstart.

Hoppar agenten över steg sent i ett långt samtal, lägg de viktigaste stegen
först i SKILL.md. När Claude Code sammanfattar ett långt samtal för att få plats
behåller det som mest början av varje skill som används.

Säger skriptet OK när något är fel ligger felet i skriptet: ändra versionen i
`package.json` utan att ändra ändringsloggen, kör skriptet för hand och rätta
det tills det stannar.

## Avancerade skills

En skill fungerar med bara ett `name` och en `description`, så du kan hoppa över
det här avsnittet i början. [Specifikationen](https://agentskills.io/specification)
lägger till de valfria fälten `license`, `compatibility`, `metadata` och
`allowed-tools`, som den markerar som experimentellt.

Varje verktyg lägger till egna fält. Claude Code har bland annat `allowed-tools`
för verktyg som skillen får använda utan att fråga, `context: fork` för att köra
skillen i en subagent och `model` och `effort`. VS Code lägger till
`argument-hint`, `user-invocable` och `disable-model-invocation`. Codex har
sina extra inställningar i den valfria filen `agents/openai.yaml`.
`disable-model-invocation` och den filen används under Felsökning.

Kan en skill välja modell? I Claude Code kan den det: `model` anger modellen för
resten av svaret där skillen används. Din egen modell är tillbaka vid ditt nästa
meddelande. `effort` gör samma sak för ansträngningsnivån. Specifikationen,
sidorna för Codex och VS Code och GitHubs sida om
[att lägga till skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
listar inget sådant fält. Del 3 gav en tumregel för att välja modell och
ansträngningsnivå.

Claude Code ignorerar ett fältnamn det inte känner igen, så ett stavfel gör
ingenting. Kopiera namnen från verktygets sida.

## Börja litet

Välj ett jobb som du redan ber agenten göra och som du rättar på samma sätt
varje gång. Gör det en gång med agenten i en chatt. När det har blivit som du
vill ber du agenten skriva en skill av stegen i den sessionen:

```text
Write a skill from the steps we have just taken in this session.
```

Det här är ett arbetssätt och inget uppmätt resultat. De skills som agenterna skrev
åt sig själva i SkillsBench skrevs innan de började uppgiften, inte efter en
session som gått bra.

Verktygen har hjälpmedel för att skriva ett utkast till en skill. I Codex är det
`$skill-creator`. I chatten i VS Code kan du, med Local vald i chattvyn, skriva
`/create-skill` följt av en beskrivning.

Läs utkastet och korta ner det till det jobbet behöver. Lägg mappen där ditt
verktyg läser skills: `.claude/skills/release/` i Claude Code,
`.agents/skills/release/` i Codex eller någon av de tre mapparna ovan i Copilot.

Be agenten flytta det som måste bli exakt till ett skript och behåll det som
kräver omdöme i instruktionerna. Kör skriptet för hand en gång där det ska gå
igenom, en gång där det ska misslyckas och en gång utan en fil som det behöver.
Läs varje skript innan du låter en agent köra det, också ett som kommer från
någon annan. VS Codes dokumentation varnar för att skills kan innehålla skript
som kör verktyg eller når andra system.

Kontrollera sedan skillen som beskrivs ovan. Nästa gång du rättar agenten i det
jobbet ber du den ändra skillen också, så att rättelsen finns kvar. Lägg till
nästa skill först när den här har visat sig användbar.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång (den här delen)
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
