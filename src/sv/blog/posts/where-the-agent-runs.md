---
title: Var AI-agenten körs och vem som startar den
description: Sjätte delen i serien "Från AI-chatt till agentiskt arbete" – samma AI-agent på fem ställen, från editorn till ett schema och leverantörens moln, vad som följer med till en körning i molnet, vad som ändras när ingen tittar på och vad du gör först.
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
till exempel ett ärendesystem. I alla delar hittills har du startat agenten
själv – i en chatt eller i editorn – och sett vad den gjorde.

Den här delen handlar om samma agent när den arbetar där ingen tittar på: i
kontrollerna på en pull request, enligt ett schema eller på leverantörens
datorer i stället för dina. En pull request är en föreslagen ändring som andra
granskar innan den läggs till.

[Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/),
den första delen, kallade programmet som kör en agent för harness (ungefär sele)
och sa att det kan köras i en editor, i en terminal, i ett CI-jobb eller enligt
ett schema. CI, förkortning av continuous integration, är en tjänst som kör
kontroller och jobb när något händer i ett projekt, till exempel när en ny pull
request kommer in.

Harnessen är densamma på alla de ställena. Det som ändras är var den körs, vem
som startar den och vem som tittar på. Att ingen tittar på betyder också att
ingen kan svara på agentens frågor, så ett bra första jobb att låta köra på egen
hand är ett som bara får läsa.

## En sammanfattning som ingen behöver be om

Ett påhittat exempel: utvecklaren av webbappen från de tidigare delarna vill ha
en kort sammanfattning av gårdagens commits färdig varje morgon. En commit är en
sparad uppsättning ändringar i projektets historik. I dag öppnar utvecklaren
agenten i editorn, ber om sammanfattningen och klistrar in den i teamets chatt.

Jobbet ändrar ingenting i projektet. Det läser bara historiken och skriver några
rader, vilket gör det till ett tryggt första jobb att flytta ut ur editorn.

## Samma harness på fem ställen

Del 1 nämnde fyra ställen. Ett femte hör ihop med dem: leverantörens eget moln,
där du startar agenten och den körs på leverantörens datorer.

| Var den körs | Vem som startar den | Vem som tittar på |
| --- | --- | --- |
| I editorn | Du | Du, bredvid |
| I terminalen | Du | Du |
| I CI, när något händer | En händelse, till exempel en kommentar på en pull request | Ingen – du läser resultatet efteråt |
| Enligt ett schema | Klockan | Ingen |
| I leverantörens moln | Du, från en webbläsare eller en telefon | Du, eller ingen: den fortsätter köra om du stänger datorn |

Anthropics
[dokumentation](https://code.claude.com/docs/en/how-claude-code-works) säger att
gränssnittet avgör hur du ser och använder agenten, "men den underliggande
agentloopen är identisk" (vår översättning).

VS Codes [dokumentation](https://code.visualstudio.com/docs/agents/overview)
säger att var verktygen körs och var modellen finns är skilda val: en agent kan
ändra filer på din maskin medan den skickar sina förfrågningar till en modell
som körs hos en leverantör. Det som flyttar mellan ställena är harnessen, med de
filer och verktyg den arbetar med.

## Det som följer med till en körning i molnet

En körning i CI eller i leverantörens moln utgår från en kopia av ditt
repository, inte från din dator. Anthropics
[dokumentation](https://code.claude.com/docs/en/cloud-environments) är tydlig:
"Allt du checkar in i repositoryt finns tillgängligt. Allt du har installerat
eller konfigurerat bara på din egen maskin finns inte tillgängligt i sessionen."
(vår översättning)

Det sorterar filerna från de tidigare delarna. I Claude Codes molnsessioner
följer repositoryts instruktionsfil från del 2, dess skills från del 4 och dess
MCP-fil från del 5 med, eftersom de är en del av kopian. Versionerna i din
hemmapp, servrarna som bara du har lagt till och inloggningar som kräver en
webbläsare blir kvar. Dokumentationens råd är att checka in din egen
konfiguration i repositoryt.

{% figure "what-goes-along" %}

OpenAIs
[dokumentation](https://learn.chatgpt.com/docs/environments/cloud-environments)
säger detsamma om skills: de som ligger i repositoryt finns tillgängliga i
molnuppgifter. Personliga skills från din dator synkas inte. GitHubs
molnsessioner har en väg in för personliga filer: du kan ta med dina personliga
instruktioner, skills och egna agenter från ett
[dotfiles-repository](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes),
som är ett repository för sig.

## När ingen tittar på

I editorn frågar agenten innan den gör något riskabelt och du svarar. Ett jobb
som startas av klockan eller av en kommentar har ingen att fråga. Vad som händer
med frågan beror på verktyget. I alla tre kan ett jobb bara göra det som
tillåtits innan det startade.

Claude Codes [`claude -p`](https://code.claude.com/docs/en/headless), dess
icke-interaktiva läge, startar i läget Manual, som frågar innan de flesta
åtgärder. När ingen finns där att svara
[nekar](https://code.claude.com/docs/en/permission-modes) det varje anrop som
kräver godkännande om inte en regel tillåter det. En körning som Codex startar
med `codex exec` kan bara läsa om du inte
[tillåter mer](https://learn.chatgpt.com/docs/non-interactive-mode).

GitHubs
[sida om skriptade Copilot-körningar](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
säger att förfrågningar som fortfarande behöver godkännande nekas i obevakade
körningar. Den rekommenderar att Copilot bara får de verktyg och den åtkomst
uppgiften behöver, med `--allow-tool`. Flaggan `--no-ask-user` hindrar det från
att ställa frågor.

Så vad agenten får göra avgörs i jobbets fil, före körningen. Filerna i nästa
avsnitt visar var. [Del 7](#del-7) går igenom gränserna.

Claude Code har ett andra sätt att svara på frågan. I auto mode granskar en
andra modell, klassificeraren (classifier), agentens åtgärder i stället för dig.
Sedan version 2.1.283 startar interaktiva sessioner i terminalen och i VS Code i
auto mode. Det gör också en schemalagd uppgift i Anthropics moln, om inte auto
mode är otillgängligt. En körning med `claude -p` startar i stället i läget
Manual, sedan version 2.1.302.

Anthropic gav en anledning till auto mode i ett eget
[inlägg](https://claude.com/resources/articles/auto-mode-default-in-claude-code)
från den 7 augusti 2026. Inlägget säger att användare godkänner 97 % av
behörighetsfrågorna i Claude Code. Det tolkar siffran som att många klickar sig
igenom utan att granska varje kommando.

I samma inlägg fick 1 053 betalda professionella testare var sin
behörighetsfråga utbytt mot ett tydligt farligt kommando en bit in i en session.
Testarna fångade 13,6 % av de farliga kommandona. Auto mode fångade 89 %.
Testarna arbetade i en testmiljö – inte i sina egna kodbaser – och visste att de
utvärderades.

Det här är Anthropics studie av Anthropics funktion, så läs den som
leverantörens underlag. Vår egen slutsats av den är mindre: en fråga som
människor svarar på utan att läsa är ett svagt skydd, så gränser som sätts i
förväg väger tyngre än svar som ges på stående fot.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess. Varje verktyg har en fil för samma
jobb: en sammanfattning av gårdagens commits, varje morgon, som bara får läsa.

I **Claude Code** använder du
[tillägget för VS Code](https://code.claude.com/docs/en/vs-code) i editorn och
kommandot `claude` i terminalen.
[GitHub Action](https://code.claude.com/docs/en/github-actions) kör det i CI,
antingen när någon nämner `@claude` i en kommentar eller, med en prompt, vid
vilken GitHub-händelse som helst.
[`claude --cloud`](https://code.claude.com/docs/en/claude-code-on-the-web)
startar en session på Anthropics datorer. För ett schema finns också
[schemalagda uppgifter i molnet (cloud scheduled tasks)](https://code.claude.com/docs/en/routines),
som Anthropic beskriver som en research preview. Den här filen är Anthropics
eget exempel med ärendena utelämnade:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
jobs:
  summary:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          claude_args: |
            --allowedTools "mcp__github__list_commits"
```

I OpenAIs **Codex** använder du
[IDE-tillägget](https://learn.chatgpt.com/docs/codex/ide) i editorn och
[`codex`](https://learn.chatgpt.com/docs/codex/cli) i terminalen.
[Codex action](https://learn.chatgpt.com/docs/github-action) kör det i CI.
[Schemalagda uppgifter (scheduled tasks)](https://learn.chatgpt.com/docs/automations)
finns i ChatGPT-appen för skrivbordet och på webben.
[Codex Cloud](https://learn.chatgpt.com/docs/cloud) ger varje uppgift en egen
arbetsyta. Uppgiften kan fortsätta arbeta medan din dator sover. Actionens sida
visar bara ett exempel som startar vid en pull request, så den här filen är satt
ihop av actionens lista över inställningar och GitHubs egen syntax för ett
schema:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
jobs:
  summary:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: openai/codex-action@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          prompt: "Summarise yesterday's commits in ten lines"
          sandbox: read-only
          output-file: summary.md
      - run: cat summary.md >> "$GITHUB_STEP_SUMMARY"
```

**GitHub Copilot** fungerar i Chat-vyn eller Agents-fönstret i VS Code. I
terminalen körs
[`copilot`](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-cli).
I CI kan du köra `copilot -p` i ett arbetsflöde (workflow), som filen nedan gör,
men GitHub
[rekommenderar](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/automate-with-actions)
GitHub Agentic Workflows för det mesta av automationen. Copilots automationer
(automations) kör molnagenten enligt ett schema eller när något händer i ett
repository, bara i privata och interna repositories.

GitHub ändrade sin molnupplevelse den 28 oktober 2026. För användare med en
betald plan, med förbehåll för organisationens policyer, kan Copilot köra en
molnsession i en
[cloud sandbox](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github),
en isolerad Linux-miljö som GitHub sätter upp för sessionen, eller som ett jobb
i GitHub Actions. Där du kan välja mellan de två är cloud sandbox standard.
GitHub säger att standardvalen varierar mellan arbetsflöden, så kontrollera
miljön innan du startar en session. Filen nedan är förkortad från GitHubs eget
exempel på en daglig sammanfattning:

```text
name: Daily summary
on:
  schedule:
    - cron: "0 9 * * *"
permissions:
  contents: read
jobs:
  summary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
      - run: npm install -g @github/copilot
      - env:
          COPILOT_GITHUB_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
        run: |
          copilot -p "Summarise yesterday's commits in ten lines. Write them to summary.md" --allow-tool='shell(git:*)' --allow-tool=write --no-ask-user
          cat summary.md >> "$GITHUB_STEP_SUMMARY"
```

De tre filerna har samma form. Raden `schedule` är utlösaren: klockan startar
jobbet, så ingen finns där att svara på en fråga. Raden `cron`, ett vanligt sätt
att skriva ett schema, anger när: här klockan nio varje morgon, i UTC.

Raderna under `permissions` anger vad jobbets GitHub-token får göra: läsa
repositoryt. Det extra `id-token: write` i Claudes fil är till för actionens
inloggning. Inställningarna under agentens namn anger vad agenten får göra: ett
verktyg för Claude Code, `read-only` för Codex och två tillåtna verktyg för
Copilot.

Vi har kontrollerat att varje fil är giltig YAML men vi har inte kört dem. Att
köra dem kräver en nyckel eller en token för verktyget och ett eget repository –
läs därför varje fil mot verktygets sida innan du använder den.

## Resultatet kommer tillbaka för dig att läsa

Ett jobb som bara läser lämnar sin sammanfattning på körningens sida. Där läser
du den. En molnkörning som ändrar kod lämnar i stället en gren (branch). Claude
Codes schemalagda uppgifter pushar till en gren med prefixet `claude/` om inte
din prompt säger något annat. Copilots molnagent pushar bara till en ny gren med
prefixet `copilot/`. Ett utkast till pull request från den
["måste granskas och slås ihop av en människa"](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/risks-and-mitigations)
(vår översättning). I Codex Cloud granskar du ändringarna och testresultaten och
checkar sedan in eller öppnar en pull request när du är redo.

När ingen tittar på körningen sker tittandet efteråt: du läser det som kom
tillbaka innan det räknas.

Fabriken fungerar så också. Dess agenter körs på en dator. Var och en
[startas som en session](/sv/blog/why-we-run-an-agent-run-factory/) när ett steg
i bygget behöver den. Agenterna pushar själva till GitHub: en ändring publiceras
först när den klarat kvalitetsgrindarna och en text först när vi har läst den.
Om en session dör halvvägs förblir beaden den arbetade med, fabrikens
arbetsenhet, öppen för nästa.

## Se vad en körning använde

Varje verktyg visar sin användning någonstans, i olika enheter. I Claude Code
visar [`/usage`](https://code.claude.com/docs/en/costs) användningen för den
pågående sessionen. En schemalagd uppgift tar av samma prenumerationsanvändning
som dina egna sessioner. Codex har `/status` för sessionen och `/usage` för
kontot, båda i [tokens](https://learn.chatgpt.com/docs/developer-commands).
GitHub räknar
[AI-krediter (AI credits)](https://docs.github.com/en/copilot/how-tos/manage-and-track-spending/monitor-ai-usage),
som bygger på antalet tokens. GitHub säger att du i allmänhet inte kan spåra
krediterna till en enskild prompt eller session.

En körning i CI använder två saker: verktygets användning och GitHub
Actions-minuter. Anthropics sida om actionen listar båda.

## Kontrollera att den fungerar

Testa först prompten i en vanlig chatt, som OpenAIs sida om
[schemalagda uppgifter](https://learn.chatgpt.com/docs/automations)
rekommenderar. Lägg sedan till
[`workflow_dispatch:`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
under `on:` så att du kan starta jobbet för hand med knappen Run workflow på
GitHub. Läs svaret mot `git log`: det ska lista gårdagens commits och inget som
inte finns där.

Testa sedan gränsen, som i del 5. Ändra prompten så att agenten ombeds lägga
till en rad i README, kör jobbet för hand och kontrollera att ingen ändring når
repositoryt.

## Felsökning

Fem saker kan gå fel:

- Schemat körs inte.
- Jobbet lyckas men har inte gjort något.
- Jobbet körs för länge.
- Molnkörningen når inte det den behöver.
- CI körs inte på agentens egna commits.

Om schemat inte körs, titta på var det bor. Ett schema på din dator kräver att
datorn är på: Anthropics
[tabell över schemaläggningsalternativ](https://code.claude.com/docs/en/scheduled-tasks)
säger det för skrivbordsuppgifter och `/loop`. OpenAIs sida säger att datorn ska
vara på och ChatGPT-appen för skrivbordet köra när en uppgift behöver lokala
filer. En schemalagd uppgift i molnet hoppar över körningar medan kopplingen
till GitHub saknas eller har gått ut. Efter 72 timmar utan koppling stänger den
av sig själv.

GitHub kör schemalagda arbetsflöden bara från standardgrenen (default branch)
och stänger av dem i ett publikt repository efter 60 dagar utan aktivitet. Titta
på listan över körningar efter de första dagarna.

Om jobbet lyckas men inte har gjort något kan en fråga ha nekats utan att någon
fanns där att svara. I ett arbetsflöde har en prompt med vanlig text till Claude
"ingen shell- eller GitHub-API-åtkomst förrän du ger de verktyg som prompten
behöver" (vår översättning). Öppna körningens logg, hitta de anrop som nekades
och tillåt exakt de.

Om jobbet körs för länge, sätt ett tak. Anthropic rekommenderar `--max-turns`
för att begränsa antalet varv, tidsgränser för hela arbetsflödet och GitHubs
kontroller för samtidighet (concurrency) för att begränsa parallella körningar.

Om molnkörningen inte når det den behöver, kontrollera listan över de
nätverksadresser den får använda. I Claude Codes molnmiljöer tillåter
standardnivån paketregister och andra domäner på en tillåtelselista (allowlist).
GitHubs molnsessioner har en egen. Lägg till värden körningen behöver på listan,
så snävt du kan. För Copilot, starta en ny session efteråt, eftersom en ändring
av listan inte når sessioner som redan körs.

Om CI inte körs på agentens egna commits startar GitHub inte arbetsflöden för
commits som gjorts med den inbyggda token. Anthropics sida säger att du låter
actionen logga in som Claudes GitHub-app i stället. Copilots molnagent väntar
tills någon med skrivbehörighet klickar på Approve and run workflows.

## Avancerat

Grunderna ovan räcker för att börja. Fem saker till senare:

- Inloggning från ett arbetsflöde utan lagrad nyckel, med workload identity
  federation, som Claudes action stöder.
- Din egen GitHub-app, så att jobbet bara har de behörigheter det använder.
- Att köra på egna runners i stället för GitHubs.
- [GitHub Agentic Workflows](https://github.blog/changelog/2026-10-28-github-agentic-workflows-generally-available/):
  automation skriven i Markdown, som körs med skrivskyddade behörigheter som
  standard.
- [OpenTelemetry](https://code.claude.com/docs/en/monitoring-usage), ett
  standardsätt att exportera användningsdata, som Claude Code stöder.

## Börja litet

Välj ett jobb som du redan ber agenten om för hand gång på gång och som du kan
bedöma genom att läsa resultatet. Anthropic beskriver det arbete som schemalagda
uppgifter passar för som "obevakat, återkommande och knutet till ett tydligt
resultat" (vår översättning). En sammanfattning passar in på det. Det gör också
en kontroll att changeloggen uppdaterats.

Kör det först som ett jobb som bara får läsa. Lägg till ett verktyg som skriver
först när du behöver ett. Håll sedan behörigheterna lika snäva som förut. Det är
vår egen rekommendation.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång
5. MCP, så når AI-agenten era andra system
6. Var AI-agenten körs och vem som startar den (den här delen)
7. <span id="del-7"></span>Sätt gränserna i förväg
8. Mindre styrning för varje modell
