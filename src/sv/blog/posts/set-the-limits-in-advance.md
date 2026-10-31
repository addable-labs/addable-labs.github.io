---
title: Sätt gränserna i förväg
description: Sjunde delen i serien "Från AI-chatt till agentiskt arbete" – skillnaden mellan att be en AI-agent uppföra sig och att stoppa den, de tre sorters gränser ett verktyg erbjuder, var varje verktyg börjar, vad du gör när en gräns släpper igenom något och vad du gör först.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: set-the-limits-in-advance
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---
I del 6 av serien arbetade AI-agenten där ingen tittar på. Ett jobb kunde bara
göra det som tillåtits innan det startade. Den här delen handlar om hur du
bestämmer vad som är tillåtet, var agenten än körs.

Hittills har det mesta du gett agenten varit en begäran. Instruktionsfilen från
del 2 är text som agenten läser och oftast följer. En gräns är något annat:
verktyget stoppar agenten oavsett vad den har bestämt.

Ingen enskild gräns täcker allt, så en bra första uppsättning använder fler än
en och börjar strikt.

## En begäran och en gräns

Ett påhittat exempel: utvecklaren av webbappen från de tidigare delarna har en
mapp som heter `migrations/`, vars filer redan har körts i produktion.
Instruktionsfilen från del 2 har en rad om den:

```text
- Change nothing in the `migrations/` folder: those files have already
  run in production. Add a new migration instead.
```

Agenten läser raden varje gång den startar och följer den oftast. Anthropics
[dokumentation](https://code.claude.com/docs/en/permissions) skiljer de två
slagen av regler åt i två meningar. Instruktioner "påverkar vad Claude försöker
göra men ändrar inte vad Claude Code tillåter", medan behörighetsregler
"upprätthålls av Claude Code, inte av modellen" (vår översättning).

[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/run/security)
säger att instruktioner vägleder modellen och inte är en tvingande gräns.
[OpenAIs](https://learn.chatgpt.com/docs/customization/overview) rekommenderar
att AGENTS.md kombineras med infrastruktur som ser till att reglerna följs.

Raden brister när agenten missförstår den eller har blivit vilseledd av text den
har läst, som del 5 beskrev. Anthropics
[inlägg](https://www.anthropic.com/research/claude-code-auto-mode) från den 25
mars 2026 listar tidigare fall ur företagets egen incidentlogg: att radera
grenar på fjärrsidan utifrån en missförstådd instruktion, att ladda upp en
ingenjörs GitHub-token till ett internt beräkningskluster och att försöka köra
migreringar mot en produktionsdatabas. Anthropic skriver att alla berodde på att
modellen var överivrig.

En gräns är en regel som verktyget kontrollerar innan agentens åtgärd sker. Del
2 nämnde två sätt att få en: ett test i projektet och en inställning i
verktyget. Den här delen handlar om inställningen.

I fabriken bakom den här sajten har vi en av varje. Varje agent gör sina commits
under en identitet som sätts i miljön för dess session, så agenten väljer den
inte. En regel om att inte stoppa andra programs processer med ett kommando som
utgår från deras namn är en rad i instruktionsfilen som ingenting kontrollerar
att den följs.

## Tre sorters gränser

Varje gång agenten vill göra något, till exempel köra ett kommando eller ändra
en fil, avgör verktyget om det får ske. Verktygen erbjuder tre sorters gränser
för det beslutet. De stoppar olika saker.

**Behörigheter (permissions)** är regler och lägen i verktygets inställningar.
En regel säger att en åtgärd är tillåten, kräver ditt svar först eller aldrig är
tillåten. Ett läge avgör vad som körs utan att fråga när ingen regel gäller. I
Claude Code går en nekande regel före en tillåtande.

En **hook** är ett kommando som verktyget kör av sig självt vid en bestämd
punkt, till exempel precis innan agenten använder ett verktyg. Ditt eget skript
tittar på vad agenten är på väg att göra och kan säga nej.

**Sandboxen** är en gräns av ett annat slag. Operativsystemet, programvaran som
kör din dator, begränsar vilka filer och vilka nätverksadresser ett kommando och
programmen det startar kan nå. Det håller gränserna medan kommandot körs, så
agenten behöver inte fråga om varje kommando.

{% figure "limits-path" %}

I Claude Code möter ett kommando först hooken och sedan behörighetsreglerna. Det
körs i sandboxen om den är på. Varje kontroll täcker bara en del av det agenten
kan göra: sandboxen täcker kommandon i terminalen. Figuren listar det som körs
utanför den. Instruktionsfilen finns inte alls på vägen. Den når modellen och
inget annat.

## En första uppsättning gränser

Utvecklaren sätter upp gränserna för webbappen i Claude Code, som är exemplet
här. Codex och GitHub Copilot kommer i avsnittet om verktygen. Två filer
innehåller gränserna. Den första är `.claude/settings.json`. Den sätter
behörigheterna, slår på sandboxen och registrerar en hook:

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

Agenten får köra testerna och titta på repositoryt utan att fråga. Den kan
aldrig ändra en fil under `migrations/` eller läsa `.env`, eftersom nekande
regler gäller i alla lägen. Allt som ändrar något och inte står på listan över
tillåtna frågar först, eftersom `default` är det läge Claude Code kallar Manual.
Sandboxen är på. Inställningen `autoAllowBashIfSandboxed` är false, vilket
behåller frågorna för kommandon även när de körs i sandboxen.

Del 2 nämnde en hook som blockerar ändringar i mappen med migreringar. En
nekande regel gör samma sak med mindre att skriva, så hooken här sparas för
kommandon. Den andra filen är skriptet som hooken kör. Verktyget startar det
före varje kommando i terminalen och ger det kommandot som text. Slutkod 2
blockerar kommandot. Det skriptet skriver som felmeddelande går tillbaka till
agenten. Spara det som `.claude/hooks/block-dangerous.sh` och gör det körbart
med `chmod +x`. Det behöver också `jq`, ett litet program för att läsa JSON.

```text
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$COMMAND" | grep -q -E 'rm -rf|git push .*--force'; then
  echo "Blocked: '$COMMAND' is on this project's never-run list" >&2
  exit 2
fi

exit 0
```

Vi körde skriptet i en tillfällig mapp med exempelindata från Anthropics
[guide till hooks](https://code.claude.com/docs/en/hooks-guide). Det blockerade
`rm -rf build` och `git push origin main --force` och släppte igenom `npm test`.
Vi körde inte inställningsfilen i en riktig session. Vi kontrollerade dess
nycklar mot Anthropics dokumentation så som den såg ut den 30 oktober 2026.

## Vad sandboxen täcker

Sandboxen är den enda av de tre som operativsystemet själv tvingar fram. Varje
leverantörs sida säger vad den inte täcker. Tabellen visar Claude Codes
[sida](https://code.claude.com/docs/en/sandboxing), den för
[Codex](https://learn.chatgpt.com/docs/sandboxing) och den för
[VS Code](https://code.visualstudio.com/docs/agents/run/agent-sandboxing) så som
de såg ut den 30 oktober 2026.

| | Claude Code | Codex | GitHub Copilot i VS Code |
| --- | --- | --- | --- |
| Filer | Skriver i projektmappen; läser det mesta på datorn | Skriver i arbetsytan och i tillfälliga mappar | Läser och skriver i arbetsmappen; läser utvecklingsverktygens mappar |
| Nätverk | Stängt; tillåtna adresser börjar tomma | Av | Öppet, även när sandboxen är på |
| Täcks inte | Filverktyg, MCP-servrar och hooks | Webbsökning, MCP-anslutningar och webbläsaranvändning filtreras inte | Inbyggda verktyg som inte startar någon process |

Anthropics sida säger att sandboxen "minskar risken men är inte en fullständig
isoleringsgräns" (vår översättning). VS Codes säger att den inte är en virtuell
maskin och inte en gräns mellan användarkonton.

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess. De tre börjar inte på samma ställe.

**Claude Code** startar i auto mode i terminalen och i VS Code, sedan version
2.1.283. Sandboxen är av. I auto mode granskar en andra modell, klassificeraren
(classifier), åtgärderna i stället för dig. Inlägget från den 25 mars 2026 mätte
den: av 52 verkliga fall där agenten gjorde mer än den hade blivit ombedd
släppte klassificeraren igenom 17 %, vilket Anthropic kallar "det ärliga talet"
(vår översättning). Del 6 gav en annan siffra, från inlägget den 7 augusti 2026.

Anthropics
[sida om behörighetslägen (permission modes)](https://code.claude.com/docs/en/permission-modes)
listar stegen från strikt till självgående. De är läget Manual, sedan Manual med
sandboxen i läget auto-allow – som kör kommandon i sandboxen utan att fråga –
och sedan auto mode. Bypass-läget är bara till för containrar och virtuella
maskiner. I exempelfilen tar du det andra steget genom att ta bort
`autoAllowBashIfSandboxed`. `claude --permission-mode default` startar strikt,
`/sandbox` visar sandboxens inställningar och `/permissions` listar reglerna.

**Codex** delar upp gränserna i två, som OpenAIs
[dokumentation](https://learn.chatgpt.com/docs/agent-approvals-security)
beskriver det: en sandbox som begränsar vad Codex kan röra och en regel för
godkännanden (approval policy) som avgör när det måste stanna och fråga dig. I
en mapp under versionshantering är den rekommenderade starten `workspace-write`
med godkännande på begäran. I andra mappar är den `read-only`. Samma start,
skriven som en fil:

```text
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = false
```

Filen är `.codex/config.toml`, som Codex
[läser för ett projekt](https://learn.chatgpt.com/docs/config-file/config-basic)
bara när det litar på projektet. En separat
[regelfil](https://learn.chatgpt.com/docs/agent-configuration/rules) styr vilka
kommandon Codex får köra utanför sandboxen. En regel kan förbjuda ett kommando
som `git push`. OpenAI markerar reglerna som experimentella.

**GitHub Copilot** i VS Code startar i Manual permissions med sandboxen av. En
[behörighetsnivå (permission level)](https://code.visualstudio.com/docs/agents/run/approvals)
gäller för en session. Manual permissions frågar om allt som inte är automatiskt
godkänt, Assisted permissions låter en språkmodell bedöma varje anrop och Allow
all hoppar över frågorna. Terminalkommandon, verktyg, webbadresser och ändringar
i känsliga filer har egna inställningar. Inställningarna nedan slår på sandboxen
och stänger dess nätverk. Den sista raden är anpassad från
[VS Codes eget exempel](https://code.visualstudio.com/docs/agents/run/review-code-edits)
och frågar innan en ändring i en migrering eller i `.env`. Den förbjuder den
inte.

```text
"chat.agent.sandbox.enabled": "on",
"chat.agent.sandbox.network.allowNetwork": false,
"chat.tools.edits.autoApprove": { "**/*": true, "**/migrations/**": false, "**/.env": false }
```

Alla tre har hooks, men en hook som är skriven för ett verktyg går inte att
flytta över oförändrad. VS Codes
[sida om hooks](https://code.visualstudio.com/docs/agent-customization/hooks)
säger att namn på händelser och verktyg, argument och felbeteende kan skilja sig
åt mellan verktyg. Vi har inte kört inställningarna för Codex och Copilot ovan.

## Kontrollera att det fungerar

En gräns som ingen har prövat är en förhoppning. I fabriken bakom den här sajten
har varje grind ett test som visar att den fallerar när något avsiktligt görs
fel, som
[Så byggdes den här sajten av agenter](/sv/blog/how-this-site-was-built-by-agents/)
beskriver. Pröva dina gränser på samma sätt, i en övningskopia av projektet:

1. Kör `/permissions` och `/sandbox` för att se vilka regler och inställningar
   som gäller.
2. Be agenten lägga till en kommentar i en fil i `migrations/`. Den nekande
   regeln ska stoppa det.
3. Be den radera mappen `build` med `rm -rf build`. Hooken ska blockera det.
   Agenten får hookens meddelande.
4. Be den köra `touch ~/sandbox-probe`, den kontroll som Anthropics sida
   föreslår. Du får en fråga först, så svara ja. Sandboxen ska sedan stoppa det
   med ett fel som "Operation not permitted". Om filen dyker upp, radera den och
   titta på `/sandbox`.
5. Be den radera `build` med `rm -fr build`. Hooken släpper igenom just det här
   kommandot, så du får en fråga i stället. Svara nej.

Den femte är den som inte håller. Nästa avsnitt förklarar varför.

## Felsökning

Sex saker kan gå fel:

- En nekande regel stoppar inte ett program som läser filer själv.
- Hooken släpper igenom ett kommando.
- Hooken körs inte eller misslyckas utan att blockera.
- Du svarar ja på varje fråga.
- En inställning gäller inte.
- Sandboxen gör inte det du väntar dig.

Om en nekande regel inte stoppar ett program som läser filer själv är regeln
inte rätt lager för det. Nekande regler för Read och Edit gäller för Claude
Codes filverktyg, för omdirigeringar och för de filkommandon det känner igen,
som `cat` och `sed`. De gäller inte, med Anthropics ord, för "godtyckliga
underprocesser som läser eller skriver filer indirekt, som ett Python- eller
Node-skript som öppnar filer själv" (vår översättning). Sandboxen täcker de
programmen. Claude Code lägger till sökvägarna från dina nekande regler i
sandboxens egna listor, så slå på båda.

Om hooken släpper igenom ett kommando, titta på hur kommandot är skrivet.
`rm -fr build` betyder samma sak som `rm -rf build`. Skriptet ovan släpper
igenom det, liksom `rm -r -f build` och `git push -f`. En hook som matchar text
stoppar det den listar och inget annat. OpenAIs
[sida om hooks](https://learn.chatgpt.com/docs/hooks) säger att du ska se hooks
"som ett användbart skyddsräcke, inte en fullständig tvingande gräns" (vår
översättning). Använd en hook för det du kan namnge exakt. Lägg den verkliga
gränsen i en nekande regel eller i sandboxen.

Om hooken inte körs, testa den på det sätt guiden till hooks gör, genom att
skicka exempelindata till den:

```text
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf build"}}' | .claude/hooks/block-dangerous.sh; echo $?
```

Den ska skriva ut meddelandet och sedan 2. De vanligaste orsakerna är ett skript
som inte är körbart, `jq` som saknas och ett värde i `matcher` med fel stor
eller liten bokstav, eftersom det skiljer på dem. På de flesta händelser
genomför Claude Code åtgärden ändå när en hook misslyckas eller tar för lång
tid. Lägg till `"onFailure": "block"` bredvid `"type"` i hookens post, i version
2.1.295 eller senare, så att ett misslyckande blockerar. Codex hoppar över en
hook tills du har granskat den och litar på den med `/hooks`.

Om du svarar ja på varje fråga är frågorna ingen gräns. Del 6 förklarade varför
en fråga som människor svarar på utan att läsa är ett svagt skydd. Lösningen är
att fråga mindre och bättre: en tillåtande regel för kommandon du godkänner
varje gång, som `npm test`, eller sandboxen i läget auto-allow, det andra steget
ovan, så att de frågor som blir kvar gäller det som korsar gränsen.

Om en inställning inte gäller, ta reda på vilken som vinner. Claude Code
ignorerar `"auto"` och `"bypassPermissions"` som `defaultMode` i ett projekts
`.claude/settings.json`, så lägg dem i din egen `~/.claude/settings.json`. Ett
projekts tillåtande regler väntar tills du har sagt ja i dialogen om att lita på
mappen. I VS Code använder en session som startats i en worktree, en separat
arbetskopia av projektet, alltid Allow all, vad standardvalet än säger. I Codex
kan den avvecklade policyn `untrusted` för godkännanden hindra appen från att
starta. `/permissions` i Claude Code listar reglerna och vilken fil var och en
kommer från. `/status` i Codex listar mapparna som räknas som arbetsyta.

Om sandboxen inte gör det du väntar dig, börja med om den körs alls. Claude Code
kör kommandon utan sandbox om ett paket den behöver saknas eller plattformen
inte stöds, som i Windows utan WSL2, om inte `sandbox.failIfUnavailable` är
`true`. Ett kommando som inte går att köra i sandboxen är ofta ett verktyg som
ignorerar dess proxyinställningar: Claude Codes sida säger att vanlig `ssh` och
de flesta databasdrivrutiner inte kan ansluta, inte ens till en tillåten värd.
Att köra just det kommandot utanför sandboxen tar bort skyddet för det. Tillåt
den snävaste adressen, eller sätt `allowUnsandboxedCommands` till `false` så att
den enda vägen ut är inställningsfilen.

## Avancerat

Grunderna ovan räcker för att börja. Fem saker till senare:

- Inställningar som ett team eller ett företag kan tvinga fram och som användare
  inte kan åsidosätta: managed settings i Claude Code, Copilots
  [enterprise-managed settings](https://code.visualstudio.com/docs/enterprise/manage-ai-settings)
  för VS Code samt
  [`requirements.toml`](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
  i Codex.
- Opålitliga repositories. Ett repository kan ha med sina egna inställningar,
  hooks och instruktioner. VS Code stänger av agenter i en arbetsyta som öppnats
  i
  [begränsat läge (restricted mode)](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust),
  Codex startar med enbart läsning tills du litar på mappen och Claude Code
  [frågar först](https://code.claude.com/docs/en/security).
- Att köra hela sessionen i en container eller en virtuell maskin, vilket är dit
  Anthropic säger att bypass-läget hör hemma.
- Codex
  [behörighetsprofiler (permission profiles)](https://learn.chatgpt.com/docs/permissions)
  och [inställningarna](https://code.claude.com/docs/en/auto-mode-config) för
  Claude Codes klassificerare.
- Vad hooks kan göra utöver att blockera, till exempel
  [skriva om ett anrop](https://code.claude.com/docs/en/hooks).

## Börja litet

Välj ett övningsprojekt och börja där verktyget är som striktast. OpenAIs
[best practices](https://learn.chatgpt.com/docs/learn/best-practices)
rekommenderar det för den som är ny med kodagenter: håll godkännanden och
sandbox stramt och lätta sedan på behörigheterna "bara för betrodda repositories
eller särskilda arbetsflöden när behovet är tydligt" (vår översättning).

Lägg sedan till gränserna i den här ordningen. Först en tillåtande regel för de
kommandon som bara läser och som du godkänner varje gång. Sedan sandboxen. Sedan
en nekande regel för det som aldrig får ändras. Sist en hook, men bara för ett
kommando du kan namnge exakt. Pröva var och en som i avsnittet ovan innan du
lägger till nästa. Den ordningen är vår egen rekommendation.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång
5. MCP, så når AI-agenten era andra system
6. Var AI-agenten körs och vem som startar den
7. Sätt gränserna i förväg (den här delen)
8. Mindre styrning för varje modell
