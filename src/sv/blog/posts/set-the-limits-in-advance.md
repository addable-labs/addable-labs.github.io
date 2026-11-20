---
title: Sätt gränserna i förväg
description: "En rad i instruktionsfilen ber en AI-agent uppföra sig, medan en gräns kontrolleras utanför den. Den här delen går igenom de begränsningar som verktygen erbjuder, en första uppsättning att pröva i ett övningsprojekt och vad du gör när en gräns släpper igenom något. Sjunde delen i serien \"Från AI-chatt till agentiskt arbete\"."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, rör sig längs en prickad stig förbi en liten grå lapp på en stolpe. Lappen är en begäran och stoppar inte agenten. Till höger står en stängd grind i grön kontur, med ett hänglås, tvärs över stigen. Grinden är en gräns och stigen tar slut vid den.
date: 2026-11-15
category: ai-journey             # app-development | ai-journey
translationKey: set-the-limits-in-advance
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---
I del 6 arbetade agenten utan att någon var med. Därför fick det första jobbet
bara läsa: som standard kan ett jobb i
[Claude Code](https://code.claude.com/docs/en/permission-modes),
[Codex](https://learn.chatgpt.com/docs/non-interactive-mode) och
[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
bara göra det som tillåtits innan det startade.

Ett jobb som ska göra mer behöver sina gränser satta i förväg.
Behörighetsregler, en hook och en sandbox kan var och en svara ja eller nej åt
dig när agenten är på väg att köra ett kommando eller ändra en fil. Vi beskriver
verktygen så som deras dokumentation såg ut den 15 november 2026.

## En begäran och en gräns

Vi går tillbaka till den påhittade webbappen från de tidigare delarna.
Instruktionsfilen från del 2 säger åt agenten att lämna mappen `migrations/`
ifred:

```text
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
```

Agenten
[läser raden varje gång den startar](https://code.claude.com/docs/en/memory) och
brukar följa den. Om den missförstår raden eller har blivit vilseledd av text
den har läst (del 5 beskrev hur) kan raden inte stoppa den. Anthropics
[dokumentation](https://code.claude.com/docs/en/permissions) säger att
instruktioner "påverkar vad Claude försöker göra men ändrar inte vad Claude Code
tillåter", medan behörighetsregler "upprätthålls av Claude Code, inte av
modellen" (vår översättning).

En gräns är en regel som kontrolleras utanför instruktionsfilen. Del 2 nämnde
två sätt att få en: ett test i projektet och en inställning i verktyget.

## Börja strikt

OpenAIs [best practices](https://learn.chatgpt.com/docs/learn/best-practices)
säger åt den som är ny med kodande agenter att ha strikta inställningar för
godkännanden och sandbox och att lätta på behörigheterna bara för betrodda
projekt eller särskilda arbetsflöden när behovet är tydligt.

Vi skulle börja med fyra inställningar i ett övningsprojekt: verktyget frågar
innan något ändras, sandboxen är på och en nekande regel gäller det enda som
aldrig får ändras. En hook kommer sist, för ett kommando du kan namnge exakt. I
ett riktigt projekt lägger du till dem en i taget och prövar var och en innan du
går vidare till nästa.

## Tre sorters begränsningar

Tre sorters begränsningar avgör om agenten får köra ett kommando eller ändra en
fil.

Behörighetsreglerna (permission rules) är en lista i verktygets inställningar
som säger att en åtgärd är tillåten, kräver att du godkänner den först eller är
förbjuden. När ingen regel gäller avgör verktygets läge vem som svarar: du
eller, i vissa lägen, en andra modell. I Claude Code går en nekande regel före
en tillåtande.

En hook är ett kommando som verktyget kör automatiskt precis innan agenten
använder något av sina verktyg. Då kan ditt eget skript se vad agenten är på väg
att göra och säga nej.

Sandboxen är ett staket som operativsystemet sätter runt ett kommando och de
program det startar. Innanför staketet avgör inställningarna vilka filer
kommandot kan ändra och vilka nätverksadresser det kan nå. Anthropics
[sida](https://code.claude.com/docs/en/sandboxing) säger att sandboxen inte
isolerar fullständigt.

{% figure "limits-path" %}

Hooken prövas först eftersom den kan stoppa ett kommando innan någon regel
läses. Sandboxen prövas sist eftersom den omger själva kommandot. Agentens
filverktyg körs utanför sandboxen och följer i stället behörighetsreglerna.

## Sätt upp exemplet

Exemplet använder Claude Code i en terminal. Du behöver macOS, Linux eller
Windows med [WSL2](https://learn.microsoft.com/en-us/windows/wsl/about),
eftersom hooken i exemplet är ett shellskript och sandboxen körs på macOS, Linux
och WSL2. Du behöver också `jq`. Kontrollera att du har det:

```text
jq --version
```

Om kommandot skriver ut ett fel installerar du `jq` med `brew install jq` på
macOS eller `sudo apt-get install jq` på Debian och Ubuntu, som Anthropics
[guide till hooks](https://code.claude.com/docs/en/hooks-guide) beskriver.

Pröva i en mapp du inte behöver spara. De här kommandona skapar en med de två
mappar som exemplet skyddar:

```text
mkdir limits-practice
cd limits-practice
git init
mkdir -p .claude/hooks migrations build
echo "create table users (id int);" > migrations/001.sql
```

Spara det här som `.claude/settings.json`. Den sätter behörigheterna, slår på
sandboxen och registrerar en hook:

```text
{
  "permissions": {
    "defaultMode": "default",
    "allow": ["Bash(npm test)", "Bash(git status)", "Bash(git diff *)"],
    "deny": ["Edit(migrations/**)", "Read(./.env)"]
  },
  "sandbox": { "enabled": true, "autoAllowBashIfSandboxed": false },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-dangerous.sh"
          }
        ]
      }
    ]
  }
}
```

Varje regel anger ett verktyg och, inom parentes, vad den gäller. `*` står för
vilken text som helst och `**` för mappar på vilket djup som helst, så
`Edit(migrations/**)` gäller varje fil under `migrations/`.
`defaultMode: default` gör att Claude Code frågar innan något ändras.
`autoAllowBashIfSandboxed: false` gör att det frågar även innan ett kommando
körs i sandboxen.

En nekande regel stoppar Claude Codes filverktyg från att ändra en fil under
`migrations/` i alla lägen. Anthropics
[sida](https://code.claude.com/docs/en/permissions) säger att Claude Code
försöker tillämpa en regel mot att läsa `.env` på Grep och Glob efter bästa
förmåga.

Utan raden `defaultMode` startar Claude Code i auto mode i terminalen, där det
läget finns. Utan raden `sandbox` är sandboxen avstängd. I auto mode granskar en
andra modell åtgärderna i stället för dig.

Sedan kommer skriptet som hooken kör. `PreToolUse` i inställningarna betyder
precis innan ett verktyg används. `matcher: Bash` begränsar hooken till
kommandon i terminalen. Skriptet läser händelsen som JSON på stdin och letar
efter `rm -rf` och efter `git push` med `--force`. Vid träff skriver det ett
meddelande till agenten och avslutas med kod 2, vilket blockerar kommandot. I
alla andra fall avslutas det med kod 0, vilket släpper igenom kommandot. Spara
det som `.claude/hooks/block-dangerous.sh`:

```text
#!/bin/bash
command -v jq >/dev/null || { echo "jq is missing" >&2; exit 2; }
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q -E 'rm -rf|git push .*--force'; then
  echo "Blocked: '$COMMAND' is on this project's never-run list" >&2
  exit 2
fi

exit 0
```

Saknas `jq` blockerar första raden varje kommando och säger varför. Gör skriptet
körbart och testa det innan Claude Code kör det. Testet skickar ett påhittat
kommando, som guiden till hooks gör. `echo $?` skriver ut koden det avslutades
med:

```text
chmod +x .claude/hooks/block-dangerous.sh
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' | .claude/hooks/block-dangerous.sh; echo $?
```

Det ska skriva ut meddelandet "Blocked" och sedan 2. Vi körde skriptet med
`rm -rf build`, `git push origin main --force` och `npm test`. Det blockerade de
två första. Vi har inte prövat inställningsfilen i en riktig session.

Starta nu Claude Code från den här mappen med kommandot `claude`. Om det
[frågar om du litar på mappen](https://code.claude.com/docs/en/security) svarar
du ja: det är din egen övningsmapp.

## Kontrollera att det fungerar

Ge Claude Code de här uppgifterna en i taget och kontrollera varje resultat
själv i ett annat terminalfönster, eftersom agentens egna ord inte är något
bevis. Meddelandena kan låta annorlunda än här, men filerna ska se ut som
beskrivet.

1. Skriv `/permissions` och sedan `/sandbox`. Du ska se dina tillåtande och
   nekande regler och sandboxens inställningar.

2. Be den: "Lägg till en kommentar i migrations/001.sql." Den nekande regeln ska
   säga nej. Om Claude Code erbjuder sig att köra ett kommando i stället, svara
   nej. Kontrollera att filen är oförändrad:

   ```text
   cat migrations/001.sql
   ```

   Den ska fortfarande vara en rad.

3. Be den: "Radera mappen build med rm -rf build." Hooken ska blockera det.
   Agenten får hookens "Blocked"-meddelande. Kontrollera att mappen finns kvar:

   ```text
   ls -d build
   ```

4. Be den: "Kör touch ~/sandbox-probe", den kontroll som Anthropics sida
   föreslår. Claude Code frågar först. Svara ja: den här gången är det
   sandboxen, inte du, som ska stoppa det. Kommandot ska misslyckas med ett fel
   som "Operation not permitted" på macOS eller "Read-only file system" på
   Linux. Om Claude Code ber om att få köra det igen utanför sandboxen, svara
   nej. Kontrollera:

   ```text
   ls ~/sandbox-probe
   ```

   Det ska stå att filen inte finns. Finns den, radera den och kör `/sandbox`.

5. Be den: "Radera build med rm -fr build." Hooken känner inte igen den
   stavningen, så Claude Code frågar bara dig. Svara nej.

Om `/sandbox` bara visar en flik som heter Dependencies kan sandboxen inte
starta än. Fliken säger vad som ska åtgärdas. På Linux och WSL2 behöver
sandboxen `bubblewrap` och `socat`. Åtgärda det som nämns, starta om Claude Code
och kör `/sandbox` igen. Som standard kör Claude Code kommandon utan sandbox
tills dess.

När du är klar raderar du övningsmappen och `~/sandbox-probe` om den finns kvar.
Vill du använda gränserna i ett riktigt projekt kopierar du de två filerna dit
(om projektet redan har en `.claude/settings.json` lägger du in nycklarna i den
filen) och committar dem. Anthropics
[sida om inställningar](https://code.claude.com/docs/en/settings) säger att den
filen ska committas så att alla som klonar repot får samma behörigheter och
hooks.

## När en gräns släpper igenom något

Steg 5 visade det. `rm -fr build` betyder samma sak som `rm -rf build`, men
skriptet letar bara efter den andra stavningen. `rm -r -f build` och
`git push -f` går också igenom. En hook som matchar text stoppar bara det den
listar.

Den nekande regeln har också ett hål. Den gäller Claude Codes egna filverktyg
och de filkommandon det känner igen, som `cat` och `sed`, men inte ett skript
som öppnar filer själv, till exempel ett Python-program. Sandboxen gör det, så
använd båda.

{% figure "limits-attempts" %}

Om hooken inte verkar köras alls, upprepa testkommandot. Två orsaker att
utesluta är ett skript som inte är körbart och en `matcher` med fel versaler
eller gemener. En hook som misslyckas eller tar för lång tid blockerar inte som
standard: på de flesta händelser genomför Claude Code åtgärden ändå.

Om du svarar ja på samma fråga varje gång är den ingen gräns. Lägg i så fall
till en tillåtande regel för kommandot, till exempel `npm test`, eller sätt
`autoAllowBashIfSandboxed` till `true` så att kommandon i sandboxen körs utan
att fråga.

## Om du använder Codex

Codex har två reglage. Sandboxen begränsar vad det får röra och
godkännandepolicyn (approval policy) säger när det måste fråga dig. Vi har inte
prövat inställningarna för Codex och Copilot nedan. Skapa `.codex/config.toml` i
övningsmappen med de inställningar som OpenAI
[rekommenderar](https://learn.chatgpt.com/docs/agent-approvals-security) som
utgångspunkt för en mapp under versionshantering:

```text
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

Codex
[läser den här filen](https://learn.chatgpt.com/docs/config-file/config-basic)
bara för ett projekt det litar på. Frågar det om du litar på mappen, svara ja. I
terminalversionen visar `/status` godkännandepolicyn och arbetsytans mappar. Kör
steg 4 ovan och svara nej om Codex frågar om det får lämna sandboxen. Stegen 2,
3 och 5 kräver Claude Codes nekande regel och hook. Regler som förbjuder ett
kommando ligger i en separat
[regelfil](https://learn.chatgpt.com/docs/agent-configuration/rules), som OpenAI
markerar som experimentell.

## Om du använder GitHub Copilot i VS Code

Copilot-sessioner i VS Code startar i läget
[Manual permissions](https://code.visualstudio.com/docs/agents/run/approvals) om
inte en inställning eller din organisation har bestämt något annat. Öppna
kommandopaletten, välj
[Preferences: Open User Settings (JSON)](https://code.visualstudio.com/docs/configure/settings)
och lägg till de här raderna:

```text
"chat.agent.sandbox.enabled": "on",
"chat.agent.sandbox.network.allowNetwork": false,
"chat.tools.edits.autoApprove": { "**/*": true, "**/migrations/**": false, "**/.env": false }
```

De två första raderna slår på sandboxen och stänger av nätverket i den. Den
tredje är anpassad från
[VS Codes eget exempel](https://code.visualstudio.com/docs/agents/run/review-code-edits).
I Manual permissions gör den att Copilot frågar innan det ändrar en migrering
eller `.env`. Den förbjuder inte ändringen. Raderna gäller varje projekt du
öppnar, så ta bort dem när du är klar. I en ny session visar
[`/sandbox policy`](https://code.visualstudio.com/docs/agents/run/agent-sandboxing)
om sandboxen är på.

## Avancerat

- Ett team eller ett företag kan tvinga fram inställningar som användare inte
  kan åsidosätta: managed settings i Claude Code, Copilots
  [enterprise-managed settings](https://code.visualstudio.com/docs/enterprise/manage-ai-settings)
  för VS Code samt
  [`requirements.toml`](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
  i Codex.
- Projekt du inte har skrivit själv kan ha med sig sina egna inställningar,
  hooks och instruktioner. VS Code stänger av agenter i en arbetsyta som öppnats
  i
  [begränsat läge (restricted mode)](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust).
  Codex kan starta skrivskyddat tills du litar på mappen. Claude Code frågar om
  du litar på mappen i en interaktiv session. En körning där ingen sitter vid
  prompten, som `claude -p`, frågar aldrig.
- Du kan ställa in att en hook som misslyckas ska blockera. I Claude Code
  2.1.295 eller senare gör du det med `"onFailure": "block"` bredvid `"type"` i
  hookens definition: då blockerar hooken även när den inte kan startas eller
  tar för lång tid.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. [Ge varje AI-agent ett eget jobb](/sv/blog/agents-with-a-scope-each/)
4. [Skills, när arbetet ska göras likadant varje gång](/sv/blog/skills-for-repeatable-work/)
5. [MCP, så når AI-agenten andra system](/sv/blog/mcp-reaching-your-systems/)
6. [Var AI-agenten körs och vem som startar den](/sv/blog/where-the-agent-runs/)
7. Sätt gränserna i förväg (den här delen)
8. Mindre styrning för varje modell
