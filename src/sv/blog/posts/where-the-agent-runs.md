---
title: Var AI-agenten körs och vem som startar den
description: Sjätte delen i serien "Från AI-chatt till agentiskt arbete" – samma AI-agent på fem ställen, från editorn till ett schema och leverantörens moln, vad som följer med till en körning i molnet och ett första jobb som körs av sig självt varje morgon.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: where-the-agent-runs
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I del 5 av serien fick AI-agenten ett sätt att nå system utanför dina filer,
till exempel ett ärendesystem. Hittills har du startat agenten själv och följt
dess steg i chatten eller i editorn.

Den här delen handlar om samma agent när den körs utan att någon sitter bredvid:
startad av ett schema eller av något som händer i GitHub, eller körd på
leverantörens datorer i stället för dina. Del 1,
[Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/),
beskrev att en agent kan köras i en editor, i en terminal, i ett CI-jobb eller
på schema.

När ingen är med kan ingen heller svara på agentens frågor. Därför är ett bra
första jobb att låta köra på egen hand ett som bara får läsa.

## En sammanfattning som ingen behöver be om

Ett påhittat exempel: utvecklaren av webbappen från de tidigare delarna vill ha
en kort sammanfattning av gårdagens commits färdig varje morgon. I dag öppnar
utvecklaren agenten i editorn, ber om sammanfattningen och klistrar in den i
teamets chatt.

Jobbet ändrar ingenting i projektet. Det läser bara historiken och skriver några
rader, vilket gör det till ett tryggt första jobb att flytta ut ur editorn. Vi
kör det som ett CI-jobb som startar på schema. Sammanfattningen får vänta på en
sida i GitHub. Att skicka den vidare till teamets chatt är ett senare steg.

## Samma agent på fem ställen

Ett femte ställe hör ihop med de fyra från del 1: leverantörens eget moln, där
du startar agenten och den körs på leverantörens datorer.

| Var den körs | Vem som startar den | Vem som är med medan den körs | Passar för |
| --- | --- | --- | --- |
| I editorn | Du | Du, bredvid | Att fråga och kontrollera medan du jobbar |
| I terminalen | Du | Du | Samma sak plus skript |
| I CI, när något händer | En händelse, till exempel en kommentar på en pull request | Ingen – du läser resultatet efteråt | Kontroller som körs när något händer |
| På schema | Schemat | Ingen | Samma jobb varje morgon |
| I leverantörens moln | Du, från en webbläsare eller en telefon | Du, eller ingen: den fortsätter köra om du stänger datorn | En lång uppgift som pågår medan datorn är stängd |

Vår tumregel: börja där du kan följa vad agenten gör, i editorn eller
terminalen. Flytta ut ett jobb när du ber om samma sak gång på gång och kan
bedöma resultatet genom att läsa det. Ett jobb som ska köras av sig självt varje
morgon hör hemma på ett schema. Leverantörens moln kan vara det enklaste första
försöket, eftersom du startar det från en webbläsare och inte skriver någon fil.
Ge ett obevakat jobb inte mer än det behöver. Låt det inte agera på text från
personer du inte känner.

## Det som följer med till en körning i molnet

En körning i leverantörens moln utgår från en kopia av ditt repo, inte från din
dator. Ett CI-jobb har bara en kopia om ett av dess steg checkar ut repot.
Anthropics [dokumentation](https://code.claude.com/docs/en/cloud-environments)
beskriver att det du committar till repot finns tillgängligt i sessionen och att
det du bara har installerat eller konfigurerat på din egen maskin inte gör det.

I Claude Codes molnsessioner följer repots instruktionsfil från del 2 och dess
skills från del 4 med, eftersom de är en del av kopian. Det gör också dess
`.mcp.json` från del 5, i en session med ett repo. Versionerna i din hemmapp,
MCP-servrarna som bara du har lagt till och inloggningar som kräver en
webbläsare blir kvar. Dokumentationens råd är att committa din egen
konfiguration till repot.

{% figure "what-goes-along" %}

OpenAIs
[dokumentation](https://learn.chatgpt.com/docs/environments/cloud-environments)
beskriver samma sak för skills: de som ligger i repot finns tillgängliga i
molnuppgifter. Personliga skills från din dator synkas inte.

## När ingen är med

I editorn finns du där och kan svara när agenten stannar och frågar. Ett jobb
som startar på schema har ingen som kan svara. Som standard kan ett jobb i
[Claude Code](https://code.claude.com/docs/en/permission-modes),
[Codex](https://learn.chatgpt.com/docs/non-interactive-mode) och
[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
bara göra det som tillåtits innan det startade, så det första jobbet ska bara
läsa. [Del 7](#del-7) går igenom hur du sätter de gränserna och vad mer som kan
svara åt dig.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess.

Alla tre kan köras i
[GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions).
Ett jobb där beskrivs av en workflow-fil, en YAML-fil som ligger i repots mapp
`.github/workflows`. De tre jobben nedan delar en fil och skiljer sig åt i ett
steg, så filen kommer först, med en plats kvar för verktygets steg:

```text
name: Daily summary
on:
  schedule:
    - cron: "30 9 * * *"
  workflow_dispatch:
jobs:
  summary:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      # the step for your tool goes here
```

Läst uppifrån:

- `name` är det som fliken Actions i repot visar för jobbet.
- `on` säger vad som startar det. `schedule` startar det vid fasta tider.
  [`cron`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
  anger dem: `30 9 * * *` är 09:30 varje dag, i UTC (10:30 eller 11:30 i
  Sverige). `workflow_dispatch` lägger till knappen Run workflow på GitHub, för
  att starta jobbet för hand.
- `runs-on` väljer runnern.
- `timeout-minutes` får GitHub att avbryta jobbet efter tio minuter.
- `permissions` anger vad jobbets `GITHUB_TOKEN` får göra: här bara läsa repot.
- Det första steget checkar ut repot till runnern. `fetch-depth: 0` hämtar hela
  historiken så att `git log` kan se gårdagens commits.

I **Claude Code** kör
[GitHub Action](https://code.claude.com/docs/en/github-actions) agenten i CI,
antingen när någon nämner `@claude` i en kommentar eller, med en prompt, vid
vilken GitHub-händelse som helst, till exempel ett schema. Den kräver att
Claudes GitHub-app är installerad i repot. Jobbet behöver också en andra rad
under `permissions`, `id-token: write`, som actionen använder för att logga in
på GitHub som appen. Steget tillåter ett MCP-verktyg från GitHub,
`mcp__github__list_commits`, som låter Claude läsa commits via GitHubs API. Det
är anpassat från Anthropics eget exempel: vi har tagit bort ärendena och
modellinställningen och skrivit prompten själva.

```text
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          claude_args: |
            --allowedTools "mcp__github__list_commits"
```

I OpenAIs **Codex** kör
[Codex action](https://learn.chatgpt.com/docs/github-action) agenten i CI.
Actionens sida visar bara ett exempel som startar vid en pull request, så det
här steget är satt ihop av actionens lista över inställningar. Inställningen
`read-only` låter Codex läsa filerna men inte ändra dem. `output-file` sparar
svaret i en fil som den sista raden skriver ut.

```text
      - uses: openai/codex-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          sandbox: read-only
          output-file: summary.md
      - run: cat summary.md
```

**GitHub Copilot** körs i CI med `copilot -p`, som kör en prompt och avslutas.
Det här steget är anpassat från exemplet på GitHubs
[sida om att automatisera det med Actions](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions):
vi har kortat prompten och låter svaret gå till loggen i stället för till en
fil. Flaggan `--allow-tool` tillåter git-kommandon. `--no-ask-user` hindrar
Copilot från att ställa frågor. Tokenen är en fine-grained personal access token
med behörigheten "Copilot Requests". Ge den bara den behörigheten. Då kan ingen
av de två tokens skriva till ditt repo. Git kan alltså inte ändra det.

```text
      - uses: actions/setup-node@v7
      - run: npm install -g @github/copilot
      - env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
        run: copilot -p "Summarise yesterday's commits in ten lines" --allow-tool='shell(git:*)' --no-ask-user
```

Vi har kontrollerat att varje fil är giltig YAML och att dess inställningar
finns på verktygets sida, men vi har inte kört jobben. Att köra dem kräver en
nyckel eller en token för verktyget och ett eget repo, så pröva dem först där
inget beror på dem.

I leverantörens moln startar
[`claude --cloud`](https://code.claude.com/docs/en/claude-code-on-the-web) en
session på Anthropics datorer och
[Codex Cloud](https://learn.chatgpt.com/docs/cloud) ger varje uppgift en egen
arbetsyta. GitHub Copilot kan köra en session i en
[cloud sandbox](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes),
en isolerad Linux-miljö som GitHub skapar för sessionen, om din plan och din
organisation tillåter det.

## Kontrollera att den fungerar

Prova prompten i en vanlig chatt först. Tryck sedan på Run workflow, som i
stegen nedan. När körningen är klar öppnar du den, öppnar jobbet `summary` och
läser loggen för verktygets steg. För Codex är det det sista steget, som skriver
ut filen. Svaret står i loggen. Det ska lista gårdagens commits och inga andra.
Jämför med det här kommandot, som du kör i repots mapp:

```text
git log --since=yesterday --oneline
```


## Vad det kostar

Ett dagligt jobb kostar något varje dag. En körning i CI använder två saker:
verktygets användning och minuter i GitHub Actions. GitHub räknar Copilots
användning i
[AI credits](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-ai-usage)
som du i allmänhet inte kan spåra till en enskild prompt eller session. Efter
den första veckan kan du titta på användningen för kontot som nyckeln tillhör.

## Felsökning

Fem saker kan gå fel:

- Inget syns under Actions.
- Körningen misslyckas i första steget.
- Körningen lyckas men svaret är tomt eller fel.
- Körningen startar vid en annan tid än du väntade dig.
- Körningen pågår för länge.

Om inget syns under Actions, kontrollera var filen ligger. GitHub läser
workflow-filer från mappen `.github/workflows`. Ett schema eller knappen Run
workflow fungerar bara när filen ligger på default branch, oftast `main`.

Om körningen misslyckas i första steget, öppna det stegets logg. Kontrollera att
secreten finns och att dess namn stavas exakt som i filen. För Claude Code,
kontrollera också att Claudes GitHub-app är installerad i repot.

Om körningen lyckas men svaret är tomt eller fel kan ett verktyg ha nekats. En
prompt som bara är text ger Claude ingen shell- eller GitHub-åtkomst förrän
filen ger de verktyg som prompten behöver, så kontrollera vilka verktyg den
behöver och tillåt exakt dem.

Om körningen startar vid en annan tid än du väntade dig, kom ihåg att tiderna i
ett schema är UTC. GitHub beskriver också att ett schema kan försenas när många
workflows startar samtidigt, till exempel vid början av varje timme. GitHub
rekommenderar en annan tid på timmen. Därför använder filen 09:30.

Om körningen pågår för länge avbryter raden `timeout-minutes` den efter tio
minuter.

## Avancerat

Grunderna ovan räcker för att börja. Tre saker till senare:

- Jobb som ändrar kod. De lämnar en branch eller en pull request. Du läser den
  innan ändringen går vidare. I fabriken publiceras en ändring först när den
  klarat kvalitetsgrindarna ([Därför driver vi en agentdriven
  mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)). Del 7 går igenom
  de behörigheter ett sådant jobb behöver.
- Inloggning från en workflow utan lagrad nyckel, med workload identity
  federation, som Claudes action stöder.
- [GitHub Agentic Workflows](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/):
  automation skriven i markdown, som körs med skrivskyddade behörigheter som
  standard.

## Börja litet

Det här är vår egen rekommendation för ett första jobb. Välj ett jobb som körs
utan att någon är med, som upprepas och som har ett resultat du kan kontrollera,
till exempel sammanfattningen. Ge det ingen möjlighet att skriva. Om ett senare
jobb måste skriva, lägg till just det verktyget och inget mer.

1. Skapa en fil på den här sökvägen i ett privat repo med några commits från i
   går, på default branch, oftast `main`:

   ```text
   .github/workflows/daily-summary.yml
   ```

   Fyll den med filen ovan och lägg verktygets steg på platsen för den sista
   raden.

2. Lägg till nyckeln som en secret. Öppna repots Settings, sedan Secrets and
   variables, sedan Actions och slutligen New repository secret. Ge den det namn
   som filen använder. Klistra aldrig in nyckeln i filen. För Copilot använder
   du tokenen som beskrevs ovan. För Claude Code, installera också Claudes
   GitHub-app i repot: actionens sida visar hur.

3. Öppna fliken Actions, välj Daily summary i listan och tryck på Run workflow.

4. När körningen är klar, läs svaret i loggen som beskrivits ovan och jämför det
   med historiken.

5. Låt schemat stå kvar när svaret stämmer och titta på fliken Actions efter
   några morgnar.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång
5. MCP, så når AI-agenten dina andra system
6. Var AI-agenten körs och vem som startar den (den här delen)
7. <span id="del-7"></span>Sätt gränserna i förväg
8. Mindre styrning för varje modell
