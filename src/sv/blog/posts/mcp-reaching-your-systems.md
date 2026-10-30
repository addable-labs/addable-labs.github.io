---
title: MCP, så når AI-agenten era andra system
description: Femte delen i serien "Från AI-chatt till agentiskt arbete" – vad MCP är, varför varje server du kopplar in är ett beslut om förtroende, hur du gör en första koppling som bara får läsa och vad du gör när den inte fungerar.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En AI-agent, en grön cirkel, står vid ingången till ett projekt och läser en kort lapp på en stolpe innan den går in. Bakom dörröppningen ligger projektets mappar och filer.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: mcp-reaching-your-systems
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I del 4 av serien hamnade stegen för ett jobb i en skill, en mapp med en textfil
i. Hittills har allt som AI-agenten läser vid starten varit en fil på din egen
dator: instruktionsfilen, subagenternas filer och skills.

Den här delen handlar om systemen utanför de filerna, till exempel ett
ärendesystem, en dokumentationssajt eller en databas. Den handlar också om hur
en agent når dem. Vägen dit är Model Context Protocol, förkortat MCP, ett
[öppet protokoll](https://modelcontextprotocol.io/specification/2026-07-28) som
[Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
nämnde i en mening. Den 9 december 2025
[donerade Anthropic MCP](https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/)
till Agentic AI Foundation (AAIF), en stiftelse inom Linux Foundation som också
förvaltar AGENTS.md.

Varje server du kopplar in är något du har valt att lita på, så en bra första
koppling är en som bara får läsa.

## Ett ärende som agenten inte ser

Ett påhittat exempel: utvecklaren av webbappen från de tidigare delarna har
appens ärenden i GitHub. Ett av dem lyder "Lägg till ett telefonnummer i
registreringsformuläret", med en lång tråd av kommentarer under. Agenten ser
inget av det, så utvecklaren kopierar texten till chatten varje gång.

Att kopiera fungerar för ett ärende. Det fungerar inte när agenten behöver
kommentarerna, de länkade ärendena eller de andra ärendena som nämner
formuläret. En koppling låter agenten läsa dem själv.

Innan du kopplar in något ska du leta efter ett kommandoradsverktyg. Claude
Codes sida om
[bästa praxis (best practices)](https://code.claude.com/docs/en/best-practices)
säger att om ett system har ett är det "oftast det enklaste sättet in" (vår
översättning): med `gh`, GitHubs kommandoradsverktyg, installerat och inloggat
kan Claude läsa granskningskommentarer utan att du förklarar något. MCP är till
för de system som saknar ett. Vi använder ändå GitHubs server som exempel,
eftersom dess dokumentation visar hur en koppling kan begränsas. Det gäller
också servrar som saknar kommandoradsverktyg.

## Värd, klient och server

MCP-dokumentationen använder tre ord.
[Värden (host)](https://modelcontextprotocol.io/docs/learn/architecture) är
AI-programmet du pratar med, till exempel Claude Code eller VS Code. Servern är
ett program som erbjuder agenten något, till exempel ärendena i ett repository.
Klienten (client) är den del av värden som håller anslutningen till en server.
Värden skapar en klient för varje server.

En server kan vara lokal eller en fjärrserver. En lokal server är ett program
som körs på din dator och startas av värden. En fjärrserver körs någon
annanstans och nås via en webbadress, så den behöver ett sätt att veta vem du
är: en inloggning i webbläsaren eller en token, en hemlig textsträng som du
skapar.

{% figure "mcp-host-client-server" %}

## Vad en server erbjuder

En server kan erbjuda tre sorters saker. De skiljer sig i vem som avgör när en
används:

| Den erbjuder | Det vill säga | Vem avgör |
| --- | --- | --- |
| Verktyg (tools) | åtgärder som agenten kan anropa, till exempel "lista ärendena" | agenten |
| Resurser (resources) | data som programmet kan läsa, till exempel en sida dokumentation | programmet |
| Promptar (prompts) | färdiga instruktioner | du |

Verktygen är den del som kan ändra saker.
[MCP-dokumentationen](https://modelcontextprotocol.io/docs/2026-07-28/learn/server-concepts)
säger att verktyg kan "skriva till databaser, anropa externa API:er, ändra filer
eller utlösa annan logik" (vår översättning). Modellen avgör när ett används.
Resten av den här delen handlar om verktyg.

## Varje server är ett beslut om förtroende

Verktyg "innebär körning av godtycklig kod och måste hanteras med lämplig
försiktighet" (vår översättning), som specifikationen uttrycker det. En lokal
server är ett program på din dator. VS Codes
[dokumentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
konstaterar att lokala servrar kan köra kod på din maskin. En plats i en katalog
är inte heller en granskning: Anthropic granskar anslutningar mot sina kriterier
innan de tas med i katalogen men, som det står på Claude Codes
[säkerhetssida](https://code.claude.com/docs/en/security), "säkerhetsgranskar
eller förvaltar ingen MCP-server" (vår översättning).

Specifikationen säger också vem som ska fråga dig. Dess översikt säger att
värdar "måste inhämta uttryckligt samtycke från användaren innan något verktyg
anropas" (vår översättning). Dess
[sida om verktyg](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
säger att "det BÖR alltid finnas en människa i loopen som kan neka anrop av
verktyg" (vår översättning). Det första är formulerat som ett krav och det andra
som en rekommendation. Översikten tillägger att MCP självt "inte kan
upprätthålla de här säkerhetsprinciperna på protokollnivå" (vår översättning).
Standarden ber programmet att fråga dig först men har inget sätt att tvinga det.

Risken att känna till vid namn är prompt injection. Text som agenten läser, till
exempel ett ärende, en webbsida eller ett verktygs beskrivning, innehåller
instruktioner. Agenten kan följa dem som om du hade skrivit dem. VS Codes
[säkerhetssida](https://code.visualstudio.com/docs/agents/run/security) ger ett
exempel: en sida med användargenererat innehåll som säger åt agenten att ta bort
alla filer i mappen src.

Två testsamlingar (benchmarks), alltså uppsättningar testfall som gjorts för att
jämföra agenter, mätte det här för instruktioner som är gömda i ett verktygs
beskrivning. I [MCPTox](https://arxiv.org/html/2508.14925v2) lade forskarna till
ett verktyg med en gömd instruktion i beskrivningen bredvid verktygen från
riktiga servrar. Som genomsnitt över 20 agenter följde agenterna den gömda
instruktionen i 36,5 % av fallen. De vägrade sällan.

[MSB](https://arxiv.org/html/2510.15994v2) körde tio agenter mot attacker som
använde riktiga verktyg. I genomsnitt lyckades 40,35 % av attackerna. Båda
studierna fann att mer kapabla modeller ofta var mer sårbara, eftersom de följer
instruktioner bättre.

Båda använde ett skadligt verktyg eller en skadlig server som forskarna lade
till. MCPTox säger att testfallen kom från en halvautomatisk process som styrdes
av mönster som författarna definierat. Siffrorna beskriver vad agenterna gjorde
i de testerna, så läs dem som en riktning och inte som en frekvens.

## En första koppling som bara får läsa

Utvecklaren kopplar in GitHubs egen server mot ett övningsrepository med några
påhittade ärenden. Målet är att agenten ska kunna läsa ärendena och inget annat.
Tre gränser, den ena ovanpå den andra, ser till att det blir så:

1. **Servern erbjuder bara läsning.** GitHubs server har ett
   [skrivskyddat läge (read-only mode)](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md).
   Det "har företräde framför all annan konfiguration genom att stänga av
   verktyg som skriver, även när de uttryckligen begärs" (vår översättning). För
   [fjärrservern](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)
   lägger du till `/readonly` sist i adressen.
2. **Token kan bara läsa.** GitHubs
   [finkorniga tokens (fine-grained tokens)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
   kan begränsas till valda repositories och behörigheter. Ge token
   övningsrepositoryt och sätt Issues till läsning. Tokens har alltid
   skrivskyddad åtkomst till alla publika repositories, så token begränsar
   skrivning och privata repositories, inte publika.
3. **Agenten använder bara de verktyg uppgiften behöver.** Serverns verktyg för
   att läsa ärenden är `issue_read`, `list_issues` och `search_issues`. Nästa
   avsnitt visar var varje verktyg tar emot den inställningen.

Att behålla alla tre är vår egen rekommendation och inget påstående från GitHub.
Är en av dem fel inställd håller de andra två.

Det ingen av dem gör är att hindra agenten från att läsa text som bär
instruktioner. Ett ärende som vem som helst kan skriva är text som agenten
läser. Därför bör övningsrepositoryt vara ett som bara utvecklaren kan skriva i.
GitHubs server har också ett låsläge (lockdown mode) som begränsar vad den visar
från publika repositories efter om ett inläggs författare har push-behörighet.
Dess [README](https://github.com/github/github-mcp-server) säger öppet hur långt
det når: lockdown mode är "ett innehållsfilter efter bästa förmåga" och "inte en
auktoriseringsgräns: det ändrar inte vad de underliggande GitHub-uppgifterna kan
läsa eller skriva" (vår översättning).

## Claude Code, Codex och GitHub Copilot

Vi beskriver verktygen så som deras dokumentation såg ut den 30 oktober 2026.
Det vi skriver kan ha ändrats sedan dess.

I **Claude Code** lägger du till servern med ett kommando som körs i projektets
toppmapp. Enkla citattecken är viktiga: de hindrar skalet från att byta ut
`${GITHUB_PAT}` mot själva token.

```text
claude mcp add --transport http --scope project github https://api.githubcopilot.com/mcp/readonly --header 'Authorization: Bearer ${GITHUB_PAT}'
```

Kommandot skriver en fil som heter `.mcp.json` i projektets toppmapp, som teamet
kan checka in. Filen innehåller adressen och en header som anger variabelns
namn, så token finns inte i den. Sätt `GITHUB_PAT` i den miljö som startar
Claude Code. Första gången du öppnar projektet ber Claude Code dig godkänna
servern. Ett klonat repository
[kan inte godkänna sina egna servrar](https://code.claude.com/docs/en/mcp).

Claude Codes
[behörighetsregler (permission rules)](https://code.claude.com/docs/en/permissions)
anger ett verktyg som `mcp__<server>__<tool>`, där den sista delen är det namn
servern ger verktyget. En regel i `.claude/settings.json` låter de verktygen
köra utan att fråga:

```text
{
  "permissions": {
    "allow": [
      "mcp__github__issue_read",
      "mcp__github__list_issues",
      "mcp__github__search_issues"
    ]
  }
}
```

I OpenAI:s **Codex** läggs servern i
[`config.toml`](https://learn.chatgpt.com/docs/extend/mcp). TOML är ett
textformat för inställningar. Ett projekts egen `.codex/config.toml` läses bara
när Codex litar på projektet. `enabled_tools` är listan över tillåtna verktyg.

```text
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/readonly"
bearer_token_env_var = "GITHUB_PAT"
enabled_tools = ["issue_read", "list_issues", "search_issues"]
```

**GitHub Copilot** i VS Code läser en `.mcp.json` i arbetsytans (workspace)
rotmapp. VS Codes dokumentation anger den som sättet att dela en server med ett
team som använder kompatibla Copilot-verktyg. Skapa filen för hand. VS Codes
[konfigurationsreferens](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
låter en header i den filen hänvisa till en miljövariabel med `${GITHUB_PAT}`,
som måste vara satt i den miljö som startar VS Code:

```text
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/readonly",
      "headers": { "Authorization": "Bearer ${GITHUB_PAT}" }
    }
  }
}
```

I VS Code ärver projektets servrar
[Workspace Trust](https://code.visualstudio.com/docs/agents/run/manage-mcp-servers):
i en betrodd arbetsyta startar de utan en separat fråga, så att lita på en mapp
är också att lita på dess servrar. Varje verktygsanrop kräver ditt godkännande,
som du kan ge för sessionen, för arbetsytan eller på användarnivå. Du väljer
verktygen under Chat: Open Customizations och sedan Tools.

## Kontrollera att den fungerar

Börja en ny chatt och ställ en fråga vars svar finns i bara ett ärende, till
exempel vad ärende 3 i övningsrepositoryt säger om telefonnumret. Öppna sedan
verktygsanropet som agenten gjorde och läs vad servern svarade. VS Codes
dokumentation listar tre kontroller: ett verktyg från den avsedda servern
anropades, det svarade utan fel och svaret speglar det som kom tillbaka. Den
tillägger: "Ett rimligt svar räcker inte ensamt." (vår översättning)

Testa sedan gränsen: be agenten skapa ett ärende. Den skrivskyddade adressen bör
lämna den utan verktyg för det, så agenten kan bara säga att den inte kan.

## Felsökning

Sex saker kan gå fel:

- Inloggningen misslyckas eller slutar fungera.
- Projektets server startar aldrig.
- Det finns för många verktyg.
- Konfigurationen läses inte.
- Agenten frågar om varje anrop, eller om inget.
- Agenten gör något du inte bad om.

Om inloggningen misslyckas med ett fel som säger att servern inte stöder
"dynamic client registration" behöver servern uppgifter som du skapar själv, som
token i exemplet. Om en inloggning som fungerade slutar fungera, logga in igen:
i Claude Code med `/mcp` och i Codex med `codex mcp login <server-name>`.

Om projektets server aldrig startar väntar verktyget på att du ska lita på
projektet eller godkänna servern, som avsnittet om verktygen beskrev.
`claude mcp list` visar vilket.

Om det finns för många verktyg, kom ihåg att anslutna servrar lägger sina
verktygsnamn och instruktioner i agentens kontext (context) "även när du inte
använder dem" (vår översättning), som Claude Codes bästa praxis uttrycker det.
Stäng av de servrar du inte behöver.

Om konfigurationen inte läses, leta efter en varning: Claude Code visar dem i
`claude mcp list` och i `/mcp`. En token som klistrats in med en radbrytning på
slutet ger en varning om dolda mellanslag. En `${GITHUB_PAT}` som inte är satt
står kvar som den står, så servern får den texten som token. En serverpost med
en `url` men utan `type` hoppas över.

Om agenten frågar om varje anrop, tillåt läsverktygen med namn, som avsnittet om
verktygen visade för Claude Code, i stället för att stänga av frågorna för hela
servern. I Codex frågar `default_tools_approval_mode = "writes"` för de verktyg
som inte är markerade som skrivskyddade. När en agent körs utan dig, som med
`claude -p`, kan Claude Code inte visa godkännandefrågan för ett projekts
servrar och läser in dem utan att fråga, så läs projektets `.mcp.json` först.

Om agenten gör något du inte bad om efter att ha läst ett ärende eller en sida,
stoppa sessionen och läs verktygsanropen den gjorde. Orsaken kan vara
instruktioner i texten den läste, som avsnittet om förtroende beskrev.

## Avancerat

Grunderna ovan räcker för att börja. Fem saker till senare:

- Att skriva en egen server.
- Inloggning med OAuth, som har flera sätt för en klient att registrera sig hos
  en server.
- Tillägg till protokollet, bland annat långvariga uppgifter (tasks) och Skills
  över MCP.
- Hur Claude Code läser in ett verktygs definitioner först när de behövs, kallat
  tool search.
- Protokollets daterade versioner, där 2026-07-28 är den gällande.

## Börja litet

Välj ett system som agenten inte ser och som du nu kopierar text från, till
exempel ärendesystemet. Leta först efter ett kommandoradsverktyg. Finns inget,
ta servern från systemets egen leverantör och läs dess dokumentation.

Koppla in den mot ett övningsprojekt med bara läsning, som i exemplet.
Kontrollera den som beskrivs ovan och ställ sedan frågan du brukade kopiera text
för. Gå vidare till det riktiga projektet när det fungerar.

Lägg till ett verktyg som skriver först när du behöver ett. Behåll godkännandet
på för det. Det är vår egen rekommendation. [Del 7](#del-7) går igenom de
gränser du sätter i förväg.

## Vad som kommer härnäst

Arbetstitlarna kan ändras på vägen.

1. [Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/)
2. [Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
3. Ge varje AI-agent ett eget jobb
4. Skills, när arbetet ska göras likadant varje gång
5. MCP, så når AI-agenten era andra system (den här delen)
6. Var AI-agenten körs och vem som startar den
7. <span id="del-7"></span>Sätt gränserna i förväg
8. Mindre styrning för varje modell
