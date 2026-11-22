---
title: Minne som överlever en AI-agents session
description: "Vad en AI-agent för kodning skriver ner så att nästa session, nästa dator och nästa runner kan använda det: hur Claude Code, GitHub Copilot och Codex hanterar minne i november 2026, vad ett team delar, vad en runner behåller, vad som kan gå fel i ett delat minne och vad fem lösningar kostar att hålla igång."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två höga staplar, två sessioners kontextfönster, står på samma golv med en låda med kort mellan sig: förrådet. Den första sessionen är slut, dess kontur streckad och dess grå, gröna och vita lager bleka. En prickad grön linje går från den till ett upplyst kort i lådan, anteckningen den skrev. Linjen fortsätter in i den andra stapeln, som är nästan tom: längst ner rymmer dess tunna grå startlager samma anteckning, upplyst."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: memory-that-outlives-an-ai-agents-session
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

En session tar slut och dess kontext försvinner med den.
[Claude Codes dokumentation](https://code.claude.com/docs/en/memory) beskriver
utgångsläget rakt ut: varje session börjar med ett nytt kontextfönster.

[Vad som fyller en AI-agents kontext](/sv/blog/what-fills-an-ai-agents-context/)
handlar om vad som finns i fönstret under en session. Den här artikeln handlar
om vad som sparas utanför det: vad en agent skriver ner, var det lagras, vem mer
som kan läsa det och vad som kan gå fel när ett team delar det. Den följer
dokumentationen för Claude Code, Codex och GitHub Copilot så som den såg ut i
november 2026 och använder termerna från artikeln om kontexten utan att förklara
dem igen.

Det är teamet som gör ämnet svårt. En utvecklares dator, en kollegas dator och
ett jobb på en GitHub-runner (maskinen som kör ett jobb i GitHub Actions)
startar var och en sina egna sessioner. Det en av dem har skrivit ner når de
andra bara om det committas eller sparas på ett ställe som de delar.

## Minne är det en agent skriver ner och läser in igen

[Anthropics guide till kontextteknik](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
kallar tekniken agentiskt minne (agentic memory) – eller strukturerat
antecknande (structured note-taking) – och definierar den i två halvor: agenten
skriver anteckningar utanför kontextfönstret och anteckningarna läses in i
kontextfönstret igen vid senare tillfällen. En praktikers ordlista, Matt Pococks
[AI Hero dictionary](https://www.aihero.dev/ai-coding-dictionary/memory-system),
ger halvorna namn. På skrivvägen (write path) sparar agenten det den lärde sig
under en session som filer i miljön. På läsvägen (read path) läser verktyget in
de filerna, eller ett index över dem, i kontextfönstret i början av en senare
session.

{% figure "memory-written-and-loaded", "wide" %}

I figuren är sessionens stapel borta när sessionen slutar, men minnesförrådet
bredvid den är det inte. Minnesförrådet är platsen där anteckningarna ligger.
Det som skrevs dit läses in i nästa sessions startinnehåll. Tre frågor avgör hur
ett minne beter sig: vem som skriver det, var det lagras och vem mer som kan
läsa det. Resten av artikeln svarar på dem för varje verktyg och för ett team.
Det som läses in igen i början hamnar i startinnehållet och tar därför plats i
varje anrop. Det är kontext och inget mer. Claude Codes dokumentation säger att
Claude behandlar CLAUDE.md-filer och automatiskt minne (auto memory) som kontext
och inte som konfiguration som upprätthålls. För att blockera en åtgärd oavsett
vad Claude bestämmer pekar dokumentationen på en hook. Vad som upprätthålls
utanför modellen är ämnet för
[Sätt gränserna i förväg](/sv/blog/set-the-limits-in-advance/).

## Vad leverantörerna kallar minne

Claude Code har två saker som för kunskap vidare mellan sessioner:
CLAUDE.md-filer – som du skriver – och automatiskt minne, som Claude skriver
själv utifrån dina korrigeringar och preferenser. I automatiskt minne sparar
Claude anteckningar av fyra slag: om dig, om de korrigeringar du ger, om
pågående arbete och beslut samt om var man hittar information utanför projektet.
Den hoppar över allt den kan härleda ur kodbasen eller hitta i dina
CLAUDE.md-filer. Claude sparar inte något i varje session: den avgör vad som är
värt att komma ihåg utifrån om informationen skulle vara användbar i ett
framtida samtal. Den sparar också det du ber den komma ihåg.

Anteckningarna är vanliga markdown-filer i en mapp för varje repo, med ett index
som heter `MEMORY.md` och en fil för varje minne. De första 200 raderna eller 25
KB av indexet läses in i början av en session och Claude läser de andra filerna
när den behöver dem. I november 2026 är automatiskt minne på som standard i
lokala sessioner och av som standard i en session i en miljö med egen drift
(self-hosted).

GitHub Copilots minne fungerar annorlunda. Enligt
[GitHubs dokumentation](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory)
skapar Copilot minnen själv som en biprodukt av att arbeta med dig och har två
sorter: fakta på repo-nivå – som delas med dina medarbetare i projektet – och
preferenser på användarnivå, som följer dig mellan repon. Att spara är ett
verktygsanrop:
[GitHubs tekniska inlägg](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)
beskriver skapandet av minnen som ett verktyg som agenter anropar när de
upptäcker något som sannolikt får konkret betydelse för kommande uppgifter.
Varje minne lagras med källhänvisningar (citations), alltså referenser till de
platser i koden som stöder det.

Innan Copilot använder ett faktum kontrollerar den dess källhänvisningar mot den
aktuella grenen. Ett internt röstsystem betygsätter varje minne utifrån om det
fortfarande gäller. Uppröstade minnen skickas oftare till modellen. Minnena
finns i GitHubs moln och delas av Copilot i VS Code, på kommandoraden, i
kodgranskningen (code review) och i molnagenten (cloud agent): ett faktum som en
av dem har fångat kan användas av en annan.

I Codex skapas minnet utifrån tidigare chattar i stället för att skrivas medan
de pågår.
[OpenAIs dokumentation](https://learn.chatgpt.com/docs/customization/memories)
säger att Codex gör om användbar kontext från lämpliga tidigare chattar till
lokala minnesfiler, hoppar över aktiva eller kortvariga sessioner och maskerar
hemligheter i de genererade fälten. Den uppdaterar minnen i bakgrunden, när en
chatt har varit overksam tillräckligt länge, i stället för vid slutet av varje
chatt. Filerna ligger i Codex hemkatalog, som standard `~/.codex`.
Dokumentationen kallar dem genererat tillstånd (generated state) och i november
2026 är lokala Codex-minnen av som standard.

De tre verktygen avgör alltså på tre sätt vad som ska sparas. Claude Code låter
Claude avgöra under sessionen. Copilot låter agenten spara ett faktum
tillsammans med källhänvisningar som kontrolleras när faktumet används. Codex
skapar minne av avslutade chattar i bakgrunden.

## Regler hör hemma i filen och minnet är till för att komma ihåg

Alla tre leverantörerna drar gränsen på samma ställe. OpenAIs dokumentation
säger att man ska skriva in obligatorisk vägledning för teamet i `AGENTS.md`
eller i dokumentation som ligger i repot och behandla minnen som "ett användbart
lager för att komma ihåg, inte som den enda källan till regler som alltid måste
gälla" (vår översättning).
[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/run/memory)
påpekar att repo-fakta delas och inte är privata anteckningar. Den säger också
att man ska skriva in granskade krav för teamet i projektdokumentation under
versionshantering eller i anpassade instruktioner.

GitHubs dokumentation beskriver en arbetsfördelning: använd anpassade
instruktioner för viktiga regler – som ett säkerhetskrav eller ett obligatoriskt
granskningssteg – och låt Copilot Memory hantera de detaljer som samlas på hög
och som annars skulle göra en instruktionsfil lång och svår att underhålla.
Claude Codes sida sorterar de två efter syfte: CLAUDE.md-filer för att styra
Claudes beteende, automatiskt minne för att låta Claude lära sig av dina
korrigeringar.

Orsaken är vem som har kontrollerat texten. En människa skriver
instruktionsfilen – den beskrivs i
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
– och en kollega kan granska den i en pull request. En agent skriver minnet och
ingen behöver ha läst det. GitHubs dokumentation ger ett andra skäl: eftersom
Copilots kontroll av ett faktums källhänvisningar är Copilots eget omdöme och
inte en garanti som systemet upprätthåller bör man inte lita på att ett lagrat
faktum följs som en regel som alltid gäller.

{% figure "memory-file-or-memory" %}

I figuren flyttar ett faktum från agentens anteckningar till filen när det har
visat sig stabilt. VS Codes dokumentation ger stegen för repo-minne som har
blivit stabilt och användbart för teamet: kontrollera uppgiften mot repots kod
och konfiguration, flytta den till projektdokumentet eller instruktionsfilen,
granska ändringen i repots vanliga process och uppdatera eller ta bort det
lokala minnet för att undvika föråldrade eller motstridiga kopior.

En tredje sorts text hör hemma i ingen av dem: pågående arbete. Pocock drar
gränsen så här i sin
[guide till överlämning](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md):
"Om du ständigt förklarar ett faktum på nytt hör det hemma i `CLAUDE.md`. En
halvfärdig uppgift hör hemma i en överlämning." (vår översättning) Överlämningen
är ämnet för "Vad som fyller en AI-agents kontext".

## Det ett team delar är det som committas

En kollegas dator och en runner börjar båda från repot och inte från din
hemmapp.
[Var AI-agenten körs och vem som startar den](/sv/blog/where-the-agent-runs/)
beskriver regeln för en körning i molnet: det du committar finns där och det du
har konfigurerat bara på din egen dator gör det inte. Minnet följer samma regel.

Claude Codes automatiska minne är maskinlokalt: alla worktrees för ett repo
delar en mapp och filerna delas inte mellan datorer eller molnmiljöer. Det som
följer med repot är det som committas: projektets CLAUDE.md – som delas med
teamet via versionshantering – och omfånget (scope) `project` i en subagents
eget minne, som
[dokumentationen om subagenter](https://code.claude.com/docs/en/sub-agents)
rekommenderar som standard eftersom det gör kunskapen delbar via
versionshantering. Codex lagrar sina minnen i ett lokalt minnesförråd, så de
stannar på den dator där Codex kördes.

Copilot är undantaget med flit: GitHub lagrar dess repo-fakta. VS Code har också
ett experimentellt alternativ som lagrar dem i en fil i arbetskatalogen,
`.github/copilot-memories.jsonl`. Den filen kan ingå i commits – även sådana som
agenten gör. Molnminnets inställningar och policyer på GitHub gäller inte för
den.

{% figure "memory-where-it-lives" %}

I figuren når ett minne i en hemmapp bara den dator det ligger på, en fil som
ligger i repot når varje dator och runner och en leverantörs minnesförråd når de
konton som leverantören släpper in. "Delat" har alltså två betydelser: delat som
en fil – som följer med repot och som alla med en utcheckning kan läsa och
granska – och delat via ett konto, vilket beror på vilka leverantören släpper
in.

## En runner som GitHub driver startar tom

Ett jobb på en runner som GitHub driver (en GitHub-hosted runner) börjar i ett
rent tillstånd.
[GitHubs dokumentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
säger att varje runner som GitHub driver – med undantag för enkärniga runners –
är en ny virtuell maskin och dess sida om
[beroendecachning](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
säger att jobb på GitHubs runners startar i en ren runner-avbild. En anteckning
som agenten skriver under ett jobb är därför borta när jobbet slutar, om inte
jobbet pushar den i en commit, laddar upp den som en artefakt (artifact) eller
cachar den.

{% figure "memory-runner-starts-empty", "wide" %}

Det som når runnern är det repo som ett steg i jobbet checkar ut. För Claude
Codes GitHub Action är leverantörens svar filen i repot:
[dess dokumentation](https://code.claude.com/docs/en/github-actions) säger att
man ska skapa en CLAUDE.md i repots rot för kodstil, granskningskriterier,
projektspecifika regler och föredragna mönster – och hålla den kortfattad,
eftersom Claude läser den vid varje körning.

I figuren kan tre saker överleva ett jobb. De är inte likvärdiga. En commit kan
granskas som vilken ändring som helst och finns där för nästa körning. En
artefakt är till för filer som ett jobb har skapat och som du vill använda eller
titta på sedan körningen har tagit slut. En cache är till för filer som är dyra
att återskapa. GitHub säger att ett jobb alltid ska kunna återskapa dem.

En cache är ett dåligt ställe att ha ett minne på. Varje körning som kan läsa en
cache återställer innehållet som det är, säger GitHubs dokumentation.
Återställda filer bör därför behandlas som opålitlig indata och inga hemligheter
bör lagras i en cache. Förgiftade cachar kan leda till kodkörning i betrodda
arbetsflöden. En minnesfil är avsedd att följas av agenten, vilket är raka
motsatsen till opålitlig indata.

Copilots molnagent lagrar det den lär sig utanför jobbet, i Copilot Memory, så
det finns kvar till nästa uppgift. I programmatiska sessioner med
kommandoradsverktyget är minnet av om inte en körning anger `--enable-memory`.

## Ett minne som många agenter läser måste gå att lita på

En anteckning i en persons mapp påverkar personens egna sessioner. Ett faktum i
ett delat minne, eller i en fil som hela teamet committar, påverkar varje
session som läser det. Det som läses in i början – till exempel en
instruktionsfil eller ett index över minnen – finns där innan någon har frågat
något.
[MCP, så når AI-agenten andra system](/sv/blog/mcp-reaching-your-systems/)
förklarar prompt injection: text som agenten läser kan innehålla instruktioner
som den följer som om du hade skrivit dem. Ett minne kan föra en sådan text
vidare till varje senare session som läser det.

### Vem som kan skriva

I Copilot skapas repo-fakta bara när Copilot arbetar i ett repo där användaren
har skrivrättigheter. Copilot-appen och det interaktiva kommandoradsverktyget
kan be dig godkänna ett minne innan det lagras, men molnagenten och
kodgranskningen frågar inte. GitHubs dokumentation tillägger att repo-fakta kan
fångas ur pull requests som stängdes utan att slås ihop och att Copilot ska
kontrollera dem mot den aktuella kodbasen, vilket inte garanterar att den känner
igen varje föråldrat faktum.

### En förgiftad post

[En preprint](https://arxiv.org/html/2609.13889v1) av forskare vid University of
Auckland och Fudan University, publicerad i september 2026, prövar förgiftning
på Claude Code självt. Metoden är att gömma instruktioner i vanliga externa
källor – text, bilder och PDF-filer – så att agenten skriver dem till sitt
beständiga minne. De utlöses sedan i en senare session. Upplägget var en
simulerad arbetsyta med e-post, kalender, delade dokument och formulär, där
Claude Code kördes på tre språkmodeller från andra utvecklare. I genomsnitt
nådde instruktionerna minnet i 66,9 % av försöken. I 81,7 % av testerna som gick
över flera sessioner ledde de till att privata data läckte i en senare session.
Det är medelvärden över en uppsättning tester, inte en andel för din egen
konfiguration.

Författarna prövade också ett försvar på promptnivå. Det gjorde att färre
instruktioner nådde minnet i många konfigurationer, men det gav begränsat skydd
när minnet väl hade förgiftats. Det som stoppar en förgiftad instruktion oavsett
vad modellen bestämmer är en gräns utanför den. Därför spelar sådana gränser
större roll med minne, inte mindre. I figuren ligger den förgiftade posten i
minnesförrådet och når varje senare session som läser den. Gränsen står efter
agenten.

{% figure "memory-poisoned-entry", "wide" %}

Leverantörernas kontroller riktar sig mot samma svaga punkter. Den största oron
enligt GitHubs tekniska inlägg är minnen som är föråldrade, felaktiga eller till
och med inmatade med ont uppsåt. I testet la GitHub in motstridiga minnen i
repona – fakta som stred mot kodbasen, med källhänvisningar som pekade på
irrelevant eller obefintlig kod – och i alla testfall kontrollerade agenterna
konsekvent källhänvisningarna, upptäckte motsägelserna och uppdaterade de
felaktiga minnena. Det är GitHubs utvärdering av sin egen produkt. Den gäller
minnen vars källhänvisningar inte stöder dem.

GitHubs dokumentation tillägger att systemet kan avvisa minnen som innehåller
kända modellstyrande tokens (model-control tokens), som ett skydd mot prompt
injection. OpenAIs dokumentation beskriver en Codex-inställning,
<code>memories.disable_on_<wbr>external_context</code>, som gör att chattar som
har använt extern kontext – till exempel MCP-verktygsanrop, webbsökning eller
verktygssökning – inte används för att skapa minnen.

En säkerhetsforskares två allmänna lärdomar från
[en genomgång 2025](https://embracethered.com/blog/posts/2025/windsurf-spaiware-exploit-persistent-prompt-injection/)
av en kodagents minne är de enklaste kontrollerna: system bör föreslå minnen för
användaren i stället för att lägga till dem automatiskt; användare bör granska
minnen regelbundet. Det andra går att göra i alla tre verktygen: Claude Codes
automatiska minne är vanlig markdown som `/memory` öppnar, Codex minnesfiler går
att granska i dess hemkatalog och GitHub låter personer med rätt behörighet
granska och ta bort repo-fakta i repots inställningar.

### Hemligheter

Ett minne är text som agenten skriver och som andra ofta kan läsa, så en
hemlighet som hamnar i ett minne följer med. GitHubs dokumentation säger att
minnen genomsöks efter hemligheter som tokens, nycklar eller
inloggningsuppgifter och att ett minne där en sådan upptäcks avvisas. OpenAIs
dokumentation säger att Codex maskerar hemligheter i genererade minnesfält, men
att du ändå bör granska filerna innan du delar din Codex-hemkatalog. VS Codes
dokumentation säger tydligt att man inte ska lagra inloggningsuppgifter,
hemligheter eller känslig personlig information i minnet. "MCP, så når
AI-agenten andra system" håller en token utanför filer och chatt. "Sätt
gränserna i förväg" visar en regel mot att läsa en `.env`-fil. Minnet kräver
samma försiktighet.

### Föråldrade fakta

Den tystare risken är ett faktum som var sant när det skrevs. Fabriken bakom den
här sajten stötte på den i september 2026. I
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
hoppade nya sessioner över det mesta av en anteckningslogg som hade blivit för
lång för att läsas i sin helhet och tog gamla fakta för aktuella. Lägeskortet
som skrivs om vid varje överlämning och referensen som läses i ett anrop fanns
redan; ändringen – som beskrivs i "Vad som fyller en AI-agents kontext" – var
att korta båda och sätta tak för dem. En praktiker beskriver det allmänna
fallet: ett faktum som antecknades i mars läses in med samma tillförsikt i juni
– sedan projektet har gått vidare – och ett minnessystem behöver gallras på
samma sätt som AGENTS.md.

Verktygen har en del av den gallringen inbyggd. Claude Code påminner agenten –
när `MEMORY.md` närmar sig sin gräns – att ha en rad per post och slå ihop eller
ta bort föråldrade poster. Den noterar också när varje minne skrevs, så att ett
faktums ålder syns. GitHub låter minnen löpa ut efter en period utan
förstärkning, alltså utan att Copilot har röstat upp dem. Copilot kan också
rösta ned ett minne som den anser vara felaktigt eller föråldrat.

## Fem lösningar och vad var och en kostar att hålla igång

De tre första lösningarna är leverantörernas egna. De två sista är öppen
källkod: praktikers exempel och inte leverantörsråd. Det som sägs om dem här är
det projekten sade om sig själva i november 2026.

### Filen i repot

Filen i repot behöver ingen tjänst och den når varje dator och runner som den
är. Dess svaghet är den som "Instruktionsfilen, det första en AI-agent läser"
beskriver: en lång fil följs sämre. Claude Code erbjuder `/doctor prompt-audit`,
som letar efter instruktioner skrivna för äldre modeller, hänvisningar till
filer eller kommandon som inte finns och filer som motsäger varandra. Kostnaden
är människors tid för att hålla filen sann.

### En leverantörs molnminne

Copilot Memory tar över underhållet från människorna. GitHubs dokumentation
säger att det inte kräver något underhåll från dig, anpassar sig när kodbasen
och dina vanor ändras och kastar bort det som slutar vara relevant. Det finns i
alla betalda Copilot-abonnemang. Minnen som tas med i en modells kontext räknas
in i tokenanvändningen. GitHubs tekniska inlägg från januari 2026 redovisar en
förbättring i egna A/B-tester: för kodagenten, som inlägget kallar den, en
ökning med 7 % av andelen sammanslagna pull requests, 90 % med minnen mot 83 %
utan. Det är GitHubs siffror för den egna produkten och riskerna ovan följer
med.

### Ett minne i varje hemmapp

Claude Codes automatiska minne kostar ingenting att köra. Claude Code undantar
minnesmappen från rensningen som tar bort gamla sessionstranskript, så
anteckningarna ligger kvar tills du eller Claude ändrar eller tar bort dem.
Inget av det löper ut av sig självt – det som gallras är det du eller Claude tar
bort – och inget av det når en kollega eller en runner. Codex filer är genererat
tillstånd (generated state): dokumentationen säger att man inte ska förlita sig
på att redigera dem för hand. Skrivbordsappen kan nollställa en dators hela
minnesförråd.

### En minnesserver över MCP

En minnesserver är en MCP-server: ett program som agenten anropar för att läsa
och skriva minnen i ett minnesförråd som flera agenter eller verktyg kan dela.
Att ansluta en är det förtroendebeslut som "MCP, så når AI-agenten andra system"
beskriver, med ett tillägg: det den innehåller har skrivits av agenter och läses
av agenter. Ingenting läser in den av sig självt i början. Agenten måste anropa
den.
[Referensserverns README](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
ger en exempelprompt för personliga chattar som börjar varje chatt med att hämta
all relevant information ur kunskapsgrafen.

Referensservern i Model Context Protocol-projektets repo beskriver sig själv som
"en grundläggande implementation av beständigt minne med en lokal kunskapsgraf"
(vår översättning). Den lagrar grafen i en fil, så det finns inget att drifta.
Flera klienter på en dator kan dela filen, eftersom varje skrivning tar ett lås,
men README säger att ett nätverksfilsystem som inte respekterar låset inte kan
delas säkert på det här sättet och att ingenting som standard sätter tak för
grafen. Repot kallar sina servrar referensimplementationer och inte
produktionsfärdiga lösningar.

[basic-memory](https://github.com/basicmachines-co/basic-memory) (AGPL-3.0)
lagrar anteckningar som markdown-filer som både människor och modeller läser och
skriver, med ett lokalt SQLite-index och utan krav på servrar. Egen drift är
gratis och synkroniseringen mellan enheter är manuell, till exempel med Git
eller Syncthing. I november 2026 kostar tjänsten som projektet driver åt dig
15,00 dollar i månaden till ett betapris – ordinarie pris 19 dollar.
Teamarbetsytan har samma prissättning, med en användare till att börja med och
fler efter behov. Allt en teammedlem skriver är, enligt projektet, omedelbart
tillgängligt för alla andra och deras AI-assistenter. En felaktig post når dem
lika snabbt som en riktig.

[Mem0](https://github.com/mem0ai/mem0) kallar sig ett intelligent minneslager
för AI-assistenter och agenter. Det erbjuds som ett bibliotek, som en server med
egen drift som startas med `docker compose` eller som en molnplattform. Dess
README säger att Mem0 kräver en språkmodell (LLM) för att fungera, så
biblioteket eller en server med egen drift kommer med en språkmodell att betala
för eller drifta. Dess extraktion lägger bara till: minnen ackumuleras och
ingenting skrivs över, vilket lämnar gallringen åt dig.

### Ett gemensamt register

Fabriken bakom den här sajten har sitt gemensamma tillstånd i
[Beads](https://github.com/gastownhall/beads), en ärendehanterare med öppen
källkod som i sin README kallar sig "ett beständigt, strukturerat minne för
kodande agenter" (vår översättning): en graf av uppgifter med beroenden i en
versionshanterad databas, i stället för markdown-planer. Som
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)
beskriver tar en agent en bead, arbetar, skriver ner vad den gjorde och stänger
den. Om sessionen dör halvvägs förblir beaden öppen för nästa. Enligt README
körs databasen som standard inuti en process med en enda skrivare, ett
serverläge betjänar flera skrivare och maskiner synkroniseras via git-remoten.
`bd remember` lagrar varaktiga projektfakta som `bd prime` läser in senare.
README håller personliga preferenser utanför: de hör hemma i ditt eget verktygs
minne.

Det den håller är en annan sorts minne än de fyra andra: tillstånd som ändras
löpande och som flera agenter måste se på samma sätt, till exempel vem som har
tagit vad och vad som är klart. Det kräver ett enda ställe som varje agent läser
och skriver via samma kommandon. Kostnaden är en databas och en remote för
synkroniseringen som måste hållas igång.

## Vad du gör först

Läs det din agent redan har sparat: `/memory` i Claude Code, repots
Copilot-minnesinställningar på GitHub och mappen `~/.codex` för Codex. Sortera
sedan det du hittar i tre sorter: regler, sådant man vill komma ihåg och
pågående arbete. Regler som teamet förlitar sig på hör hemma i instruktionsfilen
i repot, granskad som kod. En regel som måste gälla oavsett vad agenten
bestämmer behöver också en gräns utanför modellen. Pågående arbete hör hemma i
en överlämning.

Behandla en runner som tom: allt ett jobb lär sig går förlorat om det inte
pushas i en commit eller sparas i ett minnesförråd utanför runnern – och en
cache är inget ställe att ha det på. Innan du ansluter ett delat minnesförråd,
till exempel en minnesserver, bör du bestämma vem som får skriva i det, vem som
läser det och hur en post tas bort. Och kontrollera de aktuella inställningarna
innan du förlitar dig på en standard, eftersom de i november 2026 skiljer sig
mellan verktygen och mellan Copilots abonnemang.
