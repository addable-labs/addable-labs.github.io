---
title: Sätt gränserna i förväg
description: Sjunde delen i serien "Från AI-chatt till agentiskt arbete" – skillnaden mellan att be en AI-agent uppföra sig och att stoppa den, de tre sorters gränser ett verktyg erbjuder, en första uppsättning gränser att pröva i ett övningsprojekt och vad du gör när en gräns släpper igenom något.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: set-the-limits-in-advance
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---
I del 6 arbetade agenten där ingen tittar på. Som standard kan ett jobb i
[Claude Code](https://code.claude.com/docs/en/permission-modes),
[Codex](https://learn.chatgpt.com/docs/non-interactive-mode) och
[GitHub Copilot](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically)
bara göra det som tillåtits innan det startade, så det första jobbet ska bara
läsa.

Den här delen går igenom hur du sätter de gränserna och vad mer som kan svara åt
dig. Texten följer verktygens dokumentation så som den såg ut den 31 oktober 2026.

## En begäran och en gräns

Ett påhittat exempel: webbappen från de tidigare delarna har en mapp som heter
`migrations/`. Databasmigreringarna i den har redan körts i produktion, så ingen
bör ändra dem. Instruktionsfilen från del 2 har en rad om det:

```text
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
```

Agenten
[läser raden varje gång den startar](https://code.claude.com/docs/en/memory) och
följer den oftast. När den missförstår raden eller har blivit vilseledd av text
den har läst, som del 5 beskrev, finns det inget som stoppar den. Anthropics
[dokumentation](https://code.claude.com/docs/en/permissions) säger skillnaden i
två meningar. Instruktioner "påverkar vad Claude försöker göra men ändrar inte
vad Claude Code tillåter", medan behörighetsregler "upprätthålls av Claude Code,
inte av modellen" (vår översättning).

En gräns är en regel som något utanför instruktionsfilen kontrollerar. Del 2
nämnde två sätt att få en: ett test i projektet och en inställning i verktyget.
Den här delen handlar om inställningen.

## Börja strikt

OpenAIs [best practices](https://learn.chatgpt.com/docs/learn/best-practices)
säger åt den som är ny med kodagenter att hålla godkännanden och sandbox stramt
och att lätta på behörigheterna bara för betrodda projekt eller särskilda
arbetsflöden när behovet är tydligt.

Vår rekommendation: gör så här i ett övningsprojekt. Låt verktyget fråga innan
något ändras, slå på sandboxen, lägg till en nekande regel för det enda som
aldrig får ändras och lägg till en hook sist, för ett kommando du kan namnge
exakt. Exemplet nedan sätter alla fyra på en gång. I ditt eget projekt lägger du
till dem en i taget och prövar var och en först.

## Tre sorters gränser

Tre sorters gränser avgör om agenten får köra ett kommando eller ändra en fil.

Den första är behörighetsreglerna (permission rules), en lista i verktygets
inställningar som säger att en åtgärd är tillåten, kräver ditt svar först eller
aldrig är tillåten. När ingen regel gäller avgör verktygets läge vem som svarar:
du eller, i vissa lägen, en andra modell. I Claude Code går en nekande regel
före en tillåtande.

Den andra är en hook: ett kommando som verktyget kör av sig självt precis innan
agenten använder ett verktyg, så att ditt eget skript kan titta på vad agenten
är på väg att göra och säga nej.

Den tredje är sandboxen. Den fungerar på ett annat sätt. Operativsystemet sätter
ett staket runt ett kommando och de program det startar. Innanför staketet avgör
inställningarna vilka filer kommandot kan ändra och vilka nätverksadresser det
kan nå. Anthropics [sida](https://code.claude.com/docs/en/sandboxing) säger att
sandboxen minskar risken men inte är en fullständig isoleringsgräns.

{% figure "limits-path" %}

Hooken kommer först eftersom den kan stoppa ett kommando innan någon regel
läses. Sandboxen kommer sist eftersom den omger själva kommandot. Agentens
filverktyg körs utanför sandboxen och följer i stället behörighetsreglerna, så
ingen enskild kontroll täcker allt.

## Sätt upp exemplet

Exemplet använder Claude Code i en terminal. Du behöver macOS, Linux eller
Windows med [WSL2](https://learn.microsoft.com/en-us/windows/wsl/about),
eftersom skriptet är ett shellskript och sandboxen körs på macOS, Linux och
WSL2. Du behöver också `jq`. Kontrollera att du har det:

```text
jq --version
```

Skriver kommandot ut ett fel installerar du `jq` med `brew install jq` på macOS
eller `sudo apt-get install jq` på Debian och Ubuntu, som Anthropics
[guide till hooks](https://code.claude.com/docs/en/hooks-guide) beskriver.

Pröva i en mapp som inte spelar någon roll. De här kommandona skapar en med de
två mappar som exemplet skyddar:

```text
mkdir limits-practice
cd limits-practice
git init
mkdir -p .claude/hooks migrations build
echo "create table users (id int);" > migrations/001.sql
```

Spara de två filerna nedan i den här mappen. Den första är
`.claude/settings.json`: den sätter behörigheterna, slår på sandboxen och
registrerar en hook.

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
vilken text som helst och `**` för vilket djup av mappar som helst, så
`Edit(migrations/**)` gäller varje fil under `migrations/`.
`defaultMode: default` gör att Claude Code frågar innan något ändras.
`autoAllowBashIfSandboxed: false` gör att det frågar även för ett kommando i
sandboxen.

En nekande regel stoppar Claude Codes filverktyg från att ändra en fil under
`migrations/` eller läsa `.env` i alla lägen. Den stoppar inte ett program som
öppnar filer själv. Avsnittet efter kontrollerna säger vad som gör det.

Utan raden `defaultMode` startar Claude Code i auto mode i terminalen, där auto
mode finns tillgängligt. Sandboxen är av. I auto mode granskar en andra modell,
klassificeraren (classifier), åtgärderna i stället för dig.

Den andra filen är skriptet som hooken kör. I inställningarna betyder
`PreToolUse` precis innan ett verktyg används. `matcher: Bash` begränsar hooken
till kommandon i terminalen. Skriptet läser händelsedata som JSON på stdin och
jämför kommandot med två mönster. Vid träff skriver det ett meddelande till
agenten och avslutas med kod 2, vilket blockerar kommandot. I alla andra fall
avslutas det med kod 0, vilket släpper igenom kommandot. Spara det som
`.claude/hooks/block-dangerous.sh`:

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

Skriptets första rad blockerar varje kommando med ett meddelande om `jq` saknas.
Gör skriptet körbart och testa det innan Claude Code kör det. Testet skickar ett
påhittat kommando, som guiden till hooks gör. `echo $?` skriver ut koden som
skriptet avslutades med:

```text
chmod +x .claude/hooks/block-dangerous.sh
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' | .claude/hooks/block-dangerous.sh; echo $?
```

Det ska skriva ut meddelandet "Blocked" och sedan 2. Vi körde skriptet med
`rm -rf build`, `git push origin main --force` och `npm test`. Det blockerade de
två första. Vi körde inte inställningsfilen i en riktig session.

Starta nu Claude Code från den här mappen med kommandot `claude`. Om det
[frågar om du litar på mappen](https://code.claude.com/docs/en/security) svarar
du ja: det är din egen övningsmapp.

## Kontrollera att det fungerar

En gräns som ingen har prövat är en förhoppning. Ge Claude Code de här
uppgifterna en i taget och kontrollera varje resultat själv i ett andra
terminalfönster, eftersom agentens egna ord inte är något bevis. Meddelandena
kan vara formulerade annorlunda än här. Det är filkontrollerna som räknas.

1. Skriv `/permissions` och sedan `/sandbox`. Du ska se dina tillåtande och
   nekande regler och sandboxens inställningar.

2. Be den: "Lägg till en kommentar i migrations/001.sql." Den nekande regeln ska
   säga nej. Erbjuder Claude Code att köra ett kommando i stället, svara nej.
   Kontrollera att filen är oförändrad:

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
   Linux. Ber Claude då om att få köra det igen utanför sandboxen, svara nej.
   Kontrollera:

   ```text
   ls ~/sandbox-probe
   ```

   Det ska stå att filen inte finns. Finns den, radera den och kör `/sandbox`.

5. Be den: "Radera build med rm -fr build." Hooken känner inte igen den
   stavningen, så Claude Code frågar bara dig. Svara nej. Nästa avsnitt
   förklarar varför.

Visar `/sandbox` bara en flik som heter Dependencies, saknas ett paket. Fliken
säger vilket. På Linux och WSL2 behöver sandboxen `bubblewrap` och `socat`.
Installera det som nämns, starta om Claude Code och kör `/sandbox` igen. Tills
dess kör Claude Code som standard kommandon utan sandbox.

När du är klar raderar du övningsmappen. Finns `~/sandbox-probe` raderar du den
också. Vill du använda gränserna i ett riktigt projekt kopierar du de två
filerna dit och committar dem. Finns `.claude/settings.json` redan lägger du in
nycklarna i den filen. Anthropics
[sida om inställningar](https://code.claude.com/docs/en/settings) säger att den
filen ska committas så att alla som klonar repot får samma behörigheter och
hooks.

## När en gräns släpper igenom något

Steg 5 visade det. `rm -fr build` betyder samma sak som `rm -rf build`, men
skriptet letar bara efter den andra stavningen, så det släpper också igenom
`rm -r -f build` och `git push -f`. En hook som matchar text stoppar det den
listar och inget annat. Använd en hook för det du kan namnge exakt och lägg den
verkliga gränsen i en nekande regel eller i sandboxen.

Den nekande regeln har också ett hål. Den gäller Claude Codes egna filverktyg
och de filkommandon det känner igen, som `cat` och `sed`, men inte ett skript
som öppnar filer själv, till exempel ett Python-program. Sandboxen gör det, så
slå på båda.

Verkar hooken inte köras alls, upprepa testkommandot. De vanligaste orsakerna är
ett skript som inte är körbart och en `matcher` med fel stor eller liten
bokstav. En hook som misslyckas eller tar för lång tid blockerar inte som
standard: på de flesta händelser genomför Claude Code åtgärden ändå.

Slutligen: en fråga som du svarar ja på varje gång är ingen gräns. Gör då en
tillåtande regel för kommandot, till exempel `npm test`, eller ta bort
`autoAllowBashIfSandboxed` så att kommandon i sandboxen körs utan att fråga.

## Om du använder Codex

Codex har två reglage. Sandboxen begränsar vad det får röra. Godkännandepolicyn
(approval policy) säger när det måste fråga dig. Vi har inte kört
inställningarna för Codex och Copilot. Skapa `.codex/config.toml` i
övningsmappen med de startinställningar som OpenAI
[rekommenderar](https://learn.chatgpt.com/docs/agent-approvals-security) för en
mapp under versionshantering:

```text
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

Codex
[läser den här filen](https://learn.chatgpt.com/docs/config-file/config-basic)
bara för ett projekt det litar på. Frågar det om du litar på mappen, svara ja. I
kommandoradsversionen visar `/status` godkännandepolicyn och arbetsytans mappar.
Kör steg 4 ovan och svara nej om Codex frågar om det får lämna sandboxen. Stegen
2, 3 och 5 kräver Claude Codes nekande regel och hook. Regler som förbjuder ett
kommando ligger i en separat
[regelfil](https://learn.chatgpt.com/docs/agent-configuration/rules), som OpenAI
markerar som experimentell.

## Om du använder GitHub Copilot i VS Code

Copilot-sessioner i VS Code startar i läget
[Manual permissions](https://code.visualstudio.com/docs/agents/run/approvals) om
inte en inställning eller din organisation säger något annat. Öppna
kommandopaletten, välj
[Preferences: Open User Settings (JSON)](https://code.visualstudio.com/docs/configure/settings)
och lägg till de här raderna:

```text
"chat.agent.sandbox.enabled": "on",
"chat.agent.sandbox.network.allowNetwork": false,
"chat.tools.edits.autoApprove": { "**/*": true, "**/migrations/**": false, "**/.env": false }
```

De två första raderna slår på sandboxen och stänger dess nätverk. Den tredje är
anpassad från
[VS Codes eget exempel](https://code.visualstudio.com/docs/agents/run/review-code-edits).
I Manual permissions gör den att Copilot frågar innan det ändrar en migrering
eller `.env`. Den förbjuder inte ändringen. Raderna gäller varje projekt du
öppnar, så ta bort dem när du är klar. I en ny session visar
[`/sandbox policy`](https://code.visualstudio.com/docs/agents/run/agent-sandboxing)
om sandboxen är på.

## Avancerat

Det här räcker för att börja. Tre saker till senare:

- Inställningar som ett team eller ett företag kan tvinga fram och som användare
  inte kan åsidosätta: managed settings i Claude Code, Copilots
  [enterprise-managed settings](https://code.visualstudio.com/docs/enterprise/manage-ai-settings)
  för VS Code samt
  [`requirements.toml`](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
  i Codex.
- Projekt du inte har skrivit själv. Ett projekt kan ha med sina egna
  inställningar, hooks och instruktioner. VS Code stänger av agenter i en
  arbetsyta som öppnats i
  [begränsat läge (restricted mode)](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust).
  Codex kan starta med enbart läsning tills du litar på mappen. Claude Code
  frågar först i en interaktiv session. En körning där ingen sitter vid
  prompten, som `claude -p`, frågar aldrig.
- Hooks som misslyckas. I Claude Code 2.1.295 eller senare blockerar
  `"onFailure": "block"` bredvid `"type"` i hookens definition när hooken inte
  kan startas eller tar för lång tid.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång
5. MCP, så når AI-agenten dina andra system
6. Var AI-agenten körs och vem som startar den
7. Sätt gränserna i förväg (den här delen)
8. Mindre styrning för varje modell
