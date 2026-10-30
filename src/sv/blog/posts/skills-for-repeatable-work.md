---
title: Färdigheter, när arbetet ska bli likadant varje gång
description: Fjärde delen i serien "Från AI-chatt till agentiskt arbete" – vad en färdighet är, när arbetet hör hemma i en färdighet och när en instruktion räcker, varför det som måste bli exakt hör hemma i ett skript och vad du gör först.
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
startar. Den filen innehåller det som gäller för varje uppgift i projektet.

Den här delen handlar om arbete som kommer tillbaka då och då och som ska
göras på samma sätt varje gång, som en release, alltså att släppa en ny
version av appen. Lägg det arbetet i en färdighet (på engelska skill): en
mapp med en textfil som säger när och hur arbetet görs – och ofta ett litet
program, ett skript, för det som måste bli exakt.

## En release som blir olika varje gång

Ett påhittat exempel: webbappen från de tidigare delarna får nya versioner med
jämna mellanrum. En release betyder att versionsnumret i `package.json` höjs,
att ändringsloggen får en rad om den nya versionen, att testerna körs och att
versionen taggas. Ändringsloggen är en fil, CHANGELOG.md, som listar vad som
ändrades i varje version. En tagg är ett namn i git, som `v1.4.0`, som
markerar releasen.

Utvecklaren ber agenten: "Gör en release." Agenten gör jobbet men aldrig
likadant två gånger. En gång glömmer den raden i ändringsloggen. En annan gång
står det 1.4.0 i ändringsloggen medan `package.json` säger 1.3.1.

Varje gång rättar utvecklaren agenten i chatten och skriver samma påminnelser
som sist.
[Anthropics dokumentation](https://code.claude.com/docs/en/skills) säger att
det är dags att göra en färdighet när du gång på gång klistrar in samma
instruktioner, checklista eller arbetssätt i chatten.

Stegen skulle kunna stå i AGENTS.md från del 2, men agenten läser den filen vid
varje start, också de dagar då ingenting släpps. Texten i en färdighet läses
bara när färdigheten används.

## En färdighet är en mapp

En färdighet är en mapp med en textfil som heter SKILL.md. Filen börjar med ett
namn (`name`) och en beskrivning (`description`) och fortsätter med
instruktionerna. Bredvid den kan det ligga andra filer som instruktionerna
hänvisar till, bland annat ett skript, ett kort program som gör en bestämd
sak.

Agenten läser inte hela mappen vid starten. Den har bara namn och beskrivning
för varje färdighet framför sig. När uppgiften passar en beskrivning läser
agenten instruktionerna och kör skriptet när instruktionerna säger det.
[Standarden Agent Skills](https://agentskills.io/home) beskriver samma tre steg.

{% figure "skill-folder", "wide" %}

Så här ser SKILL.md ut för färdigheten release i exemplet:

```text
---
name: release
description: Prepares a release of the web app. Checks that the version number and the changelog agree, then runs the tests. Use when the user asks for a release, a new version or a tag.
---

# Release

1. Run the script `scripts/check-release.sh` in this skill's folder with `sh`.
   The working directory must be the project's top folder.
2. If it prints a problem, fix that and run it again. Go on only when it
   prints OK.
3. Run `npm test`.
4. Tell the developer the version number and ask before you create the tag.
```

Beskrivningen är raden agenten läser för att avgöra om färdigheten ska
användas, så den säger vad färdigheten gör och när den ska användas. En
beskrivning som bara säger "hjälper till med releaser" ger det första men inte
det andra. [Specifikationen för Agent Skills](https://agentskills.io/specification)
ger "hjälper till med PDF:er" (vår översättning) som exempel på en dålig
beskrivning.

Instruktionerna är korta med flit. När en färdighet har lästs in blir texten
kvar och tar plats i samtalet för varje svar, så Anthropic rekommenderar att
den hålls kort.

## Lägg det som måste bli exakt i ett skript

Färdighetens första steg kör ett skript. Så här ser skriptet ut:

```text
#!/bin/sh
# Checks that the version in package.json is the one the changelog
# describes, and that no tag exists for it yet.

version=$(node -p "require('./package.json').version")
latest=$(grep -m1 '^## ' CHANGELOG.md | cut -d' ' -f2)

if [ "$version" != "$latest" ]; then
  echo "package.json says $version, but the changelog starts with $latest." >&2
  exit 1
fi

if git rev-parse "v$version" >/dev/null 2>&1; then
  echo "Version $version is already tagged. Raise the version first." >&2
  exit 1
fi

echo "OK: $version is ready to release."
```

Skriptet jämför versionen i `package.json` med den första rubriken i
ändringsloggen och kontrollerar sedan att git inte har någon tagg för
versionen ännu. Det förväntar sig att rubrikerna i ändringsloggen ser ut som
`## 1.4.0`. Misslyckas en kontroll skriver det ut vad som är fel och stannar.
Går båda igenom skriver det ut OK.

Skriptet gör samma två kontroller på samma sätt varje gång. En mening i
SKILL.md som "kontrollera att ändringsloggen är uppdaterad" lämnar
kontrollen åt agenten, som kan titta på fel ställe eller bedöma att det ser bra
ut. Ett skript har inget sådant val: det ger samma svar oavsett dag och oavsett
vilken modell som kör det.

Skriptets meddelanden är skrivna för agenten också: "package.json says 1.5.0,
but the changelog starts with 1.4.0" talar om vad som ska rättas innan skriptet
körs igen, som guiden om skript i Agent Skills
[rekommenderar](https://agentskills.io/skill-creation/using-scripts).

En del av arbetet lämpar sig bättre för instruktioner. Hur en rad i
ändringsloggen för 1.4.0 ska formuleras beror på omdöme. Några meningar
instruktion är rätt verktyg för det. Guiderna från Anthropic och OpenAI drar
gränsen på samma ställe: ett färdigt skript för en åtgärd som är
[känslig och måste göras likadant varje gång](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
och i övrigt
[instruktioner före skript, om du inte behöver deterministiskt beteende eller externa verktyg](https://learn.chatgpt.com/docs/build-skills).
Deterministiskt betyder att samma indata alltid ger samma resultat.

Ett skript hjälper bara när det körs: agenten måste välja färdigheten och följa
det första steget. Det som aldrig får hoppas över behöver därför ett skydd
utanför färdigheten, på samma sätt som en regel i instruktionsfilen i del 2:
ett test i projektet eller en inställning i verktyget som stoppar steget.

## En färdighet, en instruktion eller en förfrågan

Allt hör inte hemma i en färdighet.

Instruktionsfilen innehåller det som gäller för varje uppgift i projektet. Den
läses vid varje start och hålls därför kort.

En färdighet innehåller ett arbetssätt för en sorts uppgift som kommer tillbaka,
som en release, en granskning eller en översättning.

En färdighet är inte en andra agent som den i del 3. Den är text som agenten du
redan pratar med läser när uppgiften kräver det.

Ett jobb som du gör en enda gång behöver inget av detta: be om det i chatten.
När du klistrar in samma checklista en andra gång har jobbet kommit tillbaka
och är värt att skriva ner som en färdighet.

## Vad en studie visar

En studie som heter [SkillsBench](https://arxiv.org/html/2602.12670v4) gav
AI-agenter 87 uppgifter, var och en med tester som poängsätter resultatet.
Varje uppgift kördes med och utan en färdighet som experter hade tagit fram för
den sortens uppgift.

Agenterna var 18 kombinationer av en modell och ett verktyg. Som genomsnitt över
alla klarade de ungefär 34 uppgifter av 100 utan färdigheten och ungefär 50 med
den.

Varje kombination klarade fler uppgifter med färdigheten, men vinsten skilde
sig mycket: från ungefär 4 fler uppgifter av 100 till ungefär 26 fler. Forskarna
markerar ett osäkerhetsintervall, ett 95-procentigt konfidensintervall, kring
varje kombinations resultat. De redovisar inget test av om en vinst kan bero på
enbart slumpen.

Färdigheter hjälpte inte överallt. På 13 av de 87 uppgifterna blev
genomsnittsresultatet sämre med färdigheten. I programvaruutveckling, området
för exemplet med releasen, var vinsten ungefär 12 uppgifter av 100 mot ungefär
17 för alla uppgifter.

Tre av kombinationerna fick också skriva färdigheter åt sig själva innan de
löste varje uppgift. Med de färdigheterna klarade de 8 till 12 färre uppgifter
av 100 än utan någon färdighet alls. Forskarna skriver att underskottet blandar
textens kvalitet med andra effekter: agenten använde ofta aldrig färdigheten den
hade skrivit och i en del körningar gick kraften åt till att skriva
färdigheten i stället för att lösa uppgiften.

Studien har gränser. Dess färdigheter var utvalda för sin kvalitet, vilket
forskarna kallar "ett optimistiskt scenario" (vår översättning). Uppgifterna
kördes i en terminal. Studien skilde inte ut vad i en färdighet som gör jobbet:
forskarna nämner "steg, exempel, kodresurser" (vår översättning) som de delar
som framtida arbete måste isolera. Den visar inte att ett skript hjälper mer än
instruktioner.

Forskarna drar slutsatsen att hur mycket en färdighet hjälper beror på den
enskilda kombinationen av modell och verktyg. Testa därför din färdighet, som
de följande avsnitten beskriver. Läs också det en agent har skrivit åt dig
innan du litar på det.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess. Alla tre följer samma format, Agent
Skills, så mappen och dess SKILL.md ser likadana ut i var och en. Det som skiljer
är var mappen ligger.

I **Claude Code** är en färdighet en mapp i `.claude/skills/` i projektet eller
i `~/.claude/skills/` för alla dina projekt. Du startar färdigheten release
genom att skriva `/release`. Claude kan också läsa in den själv när din
förfrågan passar beskrivningen.

I OpenAI:s **Codex** är en färdighet en mapp i `.agents/skills/`. Du startar en
färdighet genom att skriva `$` och dess namn eller köra `/skills`. Codex kan
också välja en utifrån beskrivningen.

**GitHub Copilot** läser färdigheter för projektet från
[`.github/skills/`, `.claude/skills/` och `.agents/skills/`](https://docs.github.com/en/copilot/concepts/customizations/agent-skills).
De fungerar i VS Code, i Copilot CLI och i Copilots molnagent (cloud agent) på
GitHub. I VS Code dyker de färdigheter du kan starta själv upp när du
[skriver `/` i chatten](https://code.visualstudio.com/docs/agent-customization/agent-skills).

{% figure "skill-locations", "wide" %}

En färdighet som ligger i `.agents/skills/` hittas därför av Codex och Copilot
medan Claude Code letar i `.claude/skills/`. För att alla tre ska använda en och
samma kopia lägger du färdigheten i en mapp och länkar till den från den andra.
Både Claude Code och Codex följer en länk till en mapp. På macOS och Linux skapar
de här två raderna, körda i projektets toppmapp, länken:

```text
mkdir -p .claude/skills
ln -s ../../.agents/skills/release .claude/skills/release
```

## Kontrollera att den fungerar

Börja en ny chatt och se först att verktyget har hittat färdigheten. I Claude
Code frågar du vilka färdigheter som finns. I Codex kör du `/skills`. I VS Code
skriver du `/` i chatten och letar efter färdigheten i listan.

Be sedan om jobbet med dina egna ord, som "Gör en release". Se om agenten väljer
färdigheten. Gör den inte det, starta färdigheten med namn. Läs i vilket fall
vad agenten gjorde: om den körde skriptet, följde de fyra stegen och frågade
innan den skapade taggen. Att en färdighet finns tillgänglig garanterar inte att
agenten väljer den för varje förfrågan som passar, som VS Codes dokumentation
uttrycker det.

Claude Code har också `/skill-doctor`, som visar vad varje färdighet kostar i
utrymme och hur ofta den används. Ett tillägg som heter skill-creator kör
testfall för en färdighet med och utan den.

## När det går fel

Använder agenten inte färdigheten, starta den med namn. Fungerar det ligger
felet i beskrivningen: lägg till orden du använder när du ber om arbetet.
Startar färdigheten när den inte ska, gör beskrivningen smalare.

Ett jobb som du vill starta själv kan säga det. Anthropics exempel på en sådan
färdighet är en driftsättning, där du inte vill att Claude bestämmer sig för att
driftsätta för att koden ser färdig ut. I Claude Code och VS Code gör den här
raden högst upp i SKILL.md, under beskrivningen, att bara du kan starta
färdigheten:

```text
disable-model-invocation: true
```

För att hindra Codex från att välja färdigheten själv lägger du en fil
`agents/openai.yaml` i färdighetens mapp med de här raderna:

```text
policy:
  allow_implicit_invocation: false
```

Om `/release` inte känns igen har verktyget inte hittat färdigheten. Kontrollera
att mappen ligger på ett ställe som verktyget läser och att filen heter
SKILL.md. I Claude Code behöver en färdighetsmapp som du skapade medan verktyget
kördes kommandot `/reload-skills`. I Codex behöver en färdighet som inte dyker
upp en omstart.

Hoppar agenten över steg sent i ett långt samtal, lägg de viktigaste stegen
först i SKILL.md. När Claude Code sammanfattar ett långt samtal för att få plats
behåller det bara början av varje färdighet som används.

Rapporterar skriptet ett problem, läs dess meddelande och åtgärda det som det
nämner. Säger det OK när något är fel ligger felet i skriptet: ändra versionen i
`package.json` utan att ändra ändringsloggen, kör det för hand och rätta det
tills det stannar.

## Börja litet

Välj ett jobb som du redan ber agenten göra på samma sätt och som du rättar på
samma sätt varje gång. Gör det en gång med agenten och skriv ner vad som måste
vara rätt.

Döp en mapp för färdigheten efter jobbet och lägg den på ett ställe som ditt
verktyg läser: `.claude/skills/release/` i Claude Code, `.agents/skills/release/`
i Codex eller någon av de tre mapparna ovan i Copilot. Lägg en SKILL.md i den
med de steg du skrev ner, ett `name` och en `description` som säger vad jobbet
är och när färdigheten ska användas.

Vill du inte börja med en tom fil kan du be verktyget skriva ett utkast. I Codex
är det `$skill-creator`. I chatten i VS Code kan du skriva `/create-skill`
följt av en beskrivning. Läs sedan utkastet och korta ner det till det jobbet
behöver. Studien ovan är ett skäl att testa det innan du litar på det.

Flytta det som måste bli exakt till ett skript och kör det för hand en gång där
det ska gå igenom och en gång där det ska misslyckas. Läs varje skript innan du
låter en agent köra det, också ett som kommer från någon annan. VS Codes
dokumentation varnar för att färdigheter kan innehålla skript som kör verktyg
eller når andra system.

Prova färdigheten på ett riktigt jobb i en ny chatt. Lägg till nästa färdighet
först när den här har visat sig användbar.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Färdigheter, när arbetet ska bli likadant varje gång (den här delen)
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
