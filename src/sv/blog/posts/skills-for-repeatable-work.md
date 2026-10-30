---
title: Skills, när arbetet ska bli likadant varje gång
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
[Anthropics dokumentation](https://code.claude.com/docs/en/skills) pekar ut just
det ögonblicket som tecknet på att göra en färdighet: när du gång på gång
klistrar in samma instruktioner, checklista eller arbetssätt i chatten.

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

1. Run `sh scripts/check-release.sh` from the project's top folder.
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
kvar i samtalet och tar utrymme i varje varv, så Anthropic rekommenderar att
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
versionen ännu. Misslyckas en kontroll skriver det ut vad som är fel och
stannar. Går båda igenom skriver det ut OK.

Skriptet gör samma två kontroller på samma sätt varje gång. En mening i
SKILL.md som "kontrollera att ändringsloggen är uppdaterad" lämnar
kontrollen åt agenten, som kan titta på fel ställe eller bedöma att det ser bra
ut. Ett skript har inget sådant val. Det ger samma svar oavsett dag och oavsett
vilken modell som kör det.

Anthropics guide för att skriva färdigheter ger samma råd. När en åtgärd är
[ömtålig och måste göras likadant varje gång](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
ska du använda ett färdigt skript och köra det precis som det är. Ett sådant
skript är mer tillförlitligt än kod som agenten skriver på stående fot.

Den andra halvan av rådet är att inte överdriva. Codex dokumentation säger att
du ska [föredra instruktioner framför skript om du inte behöver deterministiskt
beteende eller externa verktyg](https://learn.chatgpt.com/docs/build-skills).
Deterministiskt betyder att samma indata alltid ger samma resultat. Där svaret
beror på omdöme, som hur en rad i ändringsloggen ska formuleras, är några
meningar instruktion rätt verktyg.

Skriptets meddelanden är skrivna för agenten också: "package.json says 1.5.0,
but the changelog starts with 1.4.0" talar om vad som ska rättas innan skriptet
körs igen, som guiden om skript i Agent Skills
[rekommenderar](https://agentskills.io/skill-creation/using-scripts).

Fabriken bakom den här sajten bygger på samma tanke. När sajten byggdes fick
varje arbetspaket ett eget beviskommando, ett kommando som går igenom eller
inte, som [Så byggdes den här sajten av agenter](/sv/blog/how-this-site-was-built-by-agents/)
beskriver.

Ett skript hjälper bara när det körs. Agenten måste välja färdigheten och följa
det första steget. Det som aldrig får hoppas över behöver därför något utanför
färdigheten, precis som en regel i instruktionsfilen behövde i del 2. Kör samma
skript bland projektets automatiska kontroller, så fångas en release som hoppade
över det där.

## En färdighet, en instruktion eller en förfrågan

Allt hör inte hemma i en färdighet.

Instruktionsfilen innehåller det som gäller för varje uppgift i projektet, som
hur det installeras och testas. Den läses vid varje start och hålls därför kort.

En färdighet innehåller ett arbetssätt för en sorts uppgift som kommer tillbaka,
som en release, en granskning eller en översättning. Anthropic beskriver tecknet
som ett stycke i CLAUDE.md som har vuxit till ett arbetssätt i stället för ett
faktum. Färdighetens instruktioner läses bara när den används.

Ett skript hör hemma i färdigheten när en del av arbetssättet har ett enda rätt
svar, som kontrollen i exemplet.

Ett jobb som du gör en enda gång behöver inget av detta. Be om det i chatten. En
färdighets namn och beskrivning ligger framför agenten hela tiden. I Claude Code
lägger varje färdighet dessutom till sammanhang i varje varv, vare sig den
används eller inte, så en färdighet som ingen behöver tar bara plats.

## Vad en studie visar

En studie som heter [SkillsBench](https://arxiv.org/html/2602.12670v4) gav
AI-agenter 87 uppgifter, var och en med tester som poängsätter resultatet.
Varje uppgift kördes med och utan en färdighet som experter hade tagit fram för
den sortens uppgift.

Som genomsnitt över många kombinationer av modell och verktyg klarade agenterna
ungefär 34 uppgifter av 100 utan färdigheten och ungefär 50 med den. Alla
kombinationer förbättrades, men i mycket olika grad.

Tre av kombinationerna fick också skriva färdigheter åt sig själva innan de
löste varje uppgift. Med de färdigheterna hamnade de under resultatet utan
någon färdighet alls, alla tre. Forskarna skriver att underskottet blandar
textens kvalitet med andra effekter: agenten använde ofta aldrig färdigheten
den hade skrivit och i en del körningar åt arbetet med att skriva den upp det
som skulle ha gått till uppgiften.

Studiens uppgifter är inte ditt projekt. Forskarna drar själva slutsatsen att
"en färdighets effekt är alltså en empirisk egenskap hos en viss agentstack och
inte en universell konstant" (vår översättning). Testa därför din färdighet,
som de följande avsnitten beskriver. Läs också det en agent har skrivit åt dig
innan du litar på det.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess. Alla tre följer samma format, Agent
Skills, så mappen och dess SKILL.md ser likadana ut i var och en. Det som skiljer
är var mappen ligger.

Som standard kan både du och agenten starta en färdighet. En release är
annorlunda: utvecklaren vill själv bestämma när den sker. Anthropics exempel på
en sådan färdighet är en driftsättning, där du inte vill att Claude
bestämmer sig för att driftsätta för att koden ser färdig ut. I varje verktyg
kan en färdighet säga att bara en person får starta den.

I **Claude Code** är en färdighet en
[mapp i `.claude/skills/`](https://code.claude.com/docs/en/skills) i projektet,
som hela teamet får när mappen läggs in i projektet, eller i
`~/.claude/skills/` för alla dina projekt. Du startar färdigheten release genom
att skriva `/release`. Claude kan också läsa in den själv när din förfrågan
passar beskrivningen. Med den här raden i SKILL.md, under beskrivningen, startar
den bara när du skriver namnet:

```text
disable-model-invocation: true
```

I OpenAI:s **Codex** är en färdighet en
[mapp i `.agents/skills/`](https://learn.chatgpt.com/docs/build-skills).
Codex letar där i varje mapp från den du startar i upp till projektets rot. Du startar en
färdighet genom att skriva `$` och dess namn eller köra `/skills`, men Codex
kan också välja en utifrån beskrivningen. För att hindra Codex från att välja
färdigheten själv lägger du en fil `agents/openai.yaml` i färdighetens mapp med
de här raderna:

```text
policy:
  allow_implicit_invocation: false
```

**GitHub Copilot** läser färdigheter för projektet från
[`.github/skills/`, `.claude/skills/` och `.agents/skills/`](https://docs.github.com/en/copilot/concepts/customizations/agent-skills).
De fungerar i VS Code, i Copilot CLI och i Copilots molnagent (cloud agent) på
GitHub. I VS Code dyker de färdigheter du kan starta själv upp när du
[skriver `/` i chatten](https://code.visualstudio.com/docs/agent-customization/agent-skills).
Samma rad `disable-model-invocation: true` som i Claude Code gör att en
färdighet bara startar när du startar den.

{% figure "skill-locations", "wide" %}

En färdighet som ligger i `.agents/skills/` hittas därför av Codex och Copilot
medan Claude Code letar i `.claude/skills/`. Både Claude Code och Codex följer en
länk till en mapp, så en länk från `.claude/skills/release` till samma mapp gör
att du slipper ha två kopior.

## Kontrollera att den fungerar

En färdighet som aldrig används gör ingenting. Den första kontrollen är din:
börja en ny chatt och be om arbetet med dina egna ord, "Gör en release". Se om
agenten väljer färdigheten, starta den sedan med namn och se om den följer
stegen. Att en färdighet finns tillgänglig garanterar inte att agenten väljer
den för varje förfrågan som passar, som VS Codes dokumentation uttrycker det.

Claude Code har verktyg för nästa kontroll.
[`/skill-doctor`](https://code.claude.com/docs/en/skills) visar vad varje
färdighet kostar i utrymme och hur ofta den används och pekar ut dem som aldrig
har använts.

Två verktyg till testar hur en färdighet beter sig. Ett
[tillägg](https://code.claude.com/docs/en/plugins/overview) (på engelska
plugin) är ett paket med färdigheter och annat som du installerar i verktyget.
Tillägget skill-creator hjälper dig skriva testfall för en färdighet, kör varje
fall i en ny session och jämför resultatet med och utan färdigheten.
[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) gör samma
sak för färdigheter som ligger i ett tillägg. Det kan få en automatisk kontroll
att misslyckas när poängen faller under en gräns du har satt.

`claude plugin eval` kör varje fall tre gånger som standard, eftersom "en
körning av en icke-deterministisk agent säger lite" (vår översättning).
Skriptet i exemplet behöver inga upprepningar, eftersom det ger samma svar
varje gång. Det som varierar är om agenten väljer färdigheten
och kör skriptet. Det är det de här verktygen mäter.

Kör testfallen igen när du byter till en nyare modell. Anthropic nämner att
fånga försämringar när en ny modell kommer som ett av användningsområdena för
testerna.

## När det går fel

Använder agenten inte färdigheten, starta den med namn. Fungerar det ligger
felet i beskrivningen: lägg till orden du använder när du ber om arbetet. Startar
färdigheten när den inte ska, gör beskrivningen smalare eller låt bara en person
starta den.

Hoppar agenten över steg sent i ett långt samtal, lägg de viktigaste stegen
först i SKILL.md, eftersom Claude Code kan behålla bara början av en färdighet
när det kortar ner samtalet för att få plats.

Misslyckas skriptet, läs dess meddelande. Testa sedan skriptet för hand i ett
läge där det ska misslyckas: ändra versionen i `package.json` utan att ändra
ändringsloggen och se att det stannar. En kontroll som aldrig har misslyckats är
inte testad.

## Börja litet

Välj ett jobb som du redan ber agenten göra på samma sätt och som du rättar på
samma sätt varje gång. Gör det en gång med agenten och skriv ner vad som måste
vara rätt.

Vill du inte börja med en tom fil kan du be verktyget skriva ett utkast. I Codex
är det `$skill-creator`. I chatten i VS Code kan du skriva `/create-skill`
följt av en beskrivning. Läs sedan utkastet: studien ovan är ett skäl att korta
ner det till det jobbet behöver.

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
4. Skills, när arbetet ska bli likadant varje gång (den här delen)
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – de senaste modellerna behöver mindre styrning än de förra, men fortfarande en del
