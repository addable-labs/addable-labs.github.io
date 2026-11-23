---
title: Minne som överlever en AI-agents session
description: "Hur Claude Code, GitHub Copilot och Codex sparar det en agent lär sig i november 2026, vad som följer med till nästa session, nästa dator och nästa runner samt vad som kan gå fel när ett team delar det."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två höga staplar, kontextfönstren för två sessioner, står på samma golv med en låda med kort mellan sig: minnet. Den första sessionen är slut. Konturen är streckad och de grå, gröna och vita lagren är bleka. En prickad grön linje går från den till ett upplyst kort i lådan, anteckningen som den skrev. Linjen fortsätter in i den andra stapeln, som är nästan tom. Längst ner i den ligger det tunna grå startinnehållet, där samma anteckning är upplyst."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: memory-that-outlives-an-ai-agents-session
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

En session tar slut och kontexten försvinner med den.
[Claude Codes dokumentation](https://code.claude.com/docs/en/memory) säger det
rakt ut: varje session börjar med ett nytt kontextfönster.

[Vad som fyller en AI-agents kontext](/sv/blog/what-fills-an-ai-agents-context/) handlar om vad som finns i fönstret under en session. Den här handlar om vad som sparas utanför fönstret och om man kan lita på det när ett team delar det. Artikeln följer dokumentationen för Claude Code, Codex och GitHub Copilot så som den såg ut i november 2026 och använder termerna från artikeln om kontexten.

Det är teamet som gör ämnet svårt. En utvecklares dator, en kollegas dator och
ett jobb på en GitHub-runner (maskinen som kör ett jobb i GitHub Actions)
startar var och en sina egna sessioner. Det en av dem har skrivit ner når de
andra bara om det committas eller läggs på ett ställe som de delar.

## Minne är det en agent skriver ner och läser in igen

[Anthropics guide till context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents) kallar tekniken agentic memory eller structured note-taking. Det går ut på två saker. Agenten skriver anteckningar utanför kontextfönstret. Senare läses de in i kontextfönstret igen. Utvecklaren Matt Pococks ordlista,
[AI Hero dictionary](https://www.aihero.dev/ai-coding-dictionary/memory-system),
ger de två sakerna namn. I write path sparar agenten det den lärde sig under
en session som filer. I read path läser verktyget in filerna – eller ett index
över dem – i kontextfönstret i början av en senare session.

{% figure "memory-written-and-loaded", "wide" %}

När en session slutar försvinner stapeln. Minnet bredvid finns kvar. Det är där
anteckningarna ligger. Det som skrevs dit läses in i startinnehållet i nästa
session. Tre frågor avgör hur ett minne beter sig: vem
som skriver det, var det lagras och vem mer som kan läsa det. Resten av
artikeln svarar på dem för varje verktyg och för ett team. Det som läses in
igen i början hamnar i startinnehållet och tar därför upp en del av
kontextfönstret i varje anrop. Det är kontext och ingenting annat. Enligt Claude
Codes dokumentation behandlar Claude CLAUDE.md-filer och auto memory som kontext.
De är inte konfiguration som verktyget tvingar fram. För att blockera en åtgärd
oavsett vad Claude bestämmer pekar dokumentationen på en hook. Det som
tvingas fram utanför modellen beskrivs i
[Sätt gränserna i förväg](/sv/blog/set-the-limits-in-advance/).

## Vad leverantörerna kallar minne

Claude Code har två saker som för kunskap vidare från en session till nästa:
CLAUDE.md-filer – som du skriver – och auto memory, som Claude skriver själv
utifrån dina korrigeringar och preferenser. I auto memory sparar Claude
anteckningar av fyra slag: om dig, om de korrigeringar du ger, om pågående
arbete och beslut samt om var information finns utanför projektet. Claude hoppar
över sådant som går att läsa ut ur kodbasen eller som redan står i dina
CLAUDE.md-filer. Claude sparar inte något i varje session. Den sparar sådant som
troligen blir användbart i en framtida konversation. Dessutom sparar den det du ber den komma ihåg.

Anteckningarna är vanliga Markdown-filer i en mapp per repo, med ett index som
heter `MEMORY.md` och en fil per minne. De första 200 raderna eller 25 KB av
indexet läses in när en session startar. De övriga filerna läser Claude när den
behöver dem. I november 2026 är auto memory på som standard i lokala sessioner
och av som standard i sessioner i en self-hosted miljö.

GitHub Copilots minne fungerar annorlunda. Enligt [GitHubs dokumentation](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory) skapar Copilot minnen själv som en bieffekt av att arbeta med dig. Minnena finns i två sorter: fakta för repot – som delas med dina kollegor – och preferenser på användarnivå, som följer dig mellan repon. Att spara är ett verktygsanrop. Enligt
[GitHubs tekniska inlägg](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)
anropar agenten det när den upptäcker något som sannolikt spelar roll för
kommande uppgifter. Varje minne sparas med källhänvisningar (citations):
referenser till de ställen i koden som stöder det.

Innan Copilot använder ett faktum kontrollerar den källhänvisningarna mot den
aktuella branchen. Copilot röstar internt upp eller ned varje minne beroende på om det
fortfarande gäller. Minnen som har röstats upp skickas oftare till modellen.
Minnena ligger i GitHubs moln och delas av Copilot i VS Code, på kommandoraden,
i code review och i cloud agent. Ett faktum som en av dem har sparat kan alltså
användas av en annan.

I Codex skapas minnet utifrån tidigare chattar i stället för att skrivas medan de
pågår. Enligt
[OpenAIs dokumentation](https://learn.chatgpt.com/docs/customization/memories)
gör Codex om användbar kontext från lämpliga tidigare chattar till lokala
minnesfiler. Aktiva eller kortvariga sessioner hoppas över och secrets i de
genererade fälten maskeras. Minnena uppdateras i bakgrunden när en chatt har
varit inaktiv tillräckligt länge, inte när varje chatt tar slut. Filerna ligger
i Codex hemmapp, som standard `~/.codex`. Dokumentationen kallar dem
genererade filer (generated state). I november 2026 är lokala Codex-minnen av
som standard.

De tre verktygen avgör alltså på tre sätt vad som ska sparas. Claude Code låter
Claude avgöra under sessionen. Copilot låter agenten spara ett faktum med
källhänvisningar som kontrolleras när faktumet används. Codex skapar minnen utifrån
avslutade chattar i bakgrunden.

## Regler hör hemma i filen och minnet är till för att komma ihåg

Skälet till uppdelningen är vem som har kontrollerat texten. En människa skriver
instruktionsfilen – den beskrivs i
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
– och en kollega kan granska den i en pull request. En agent skriver minnet och
ingen behöver ha läst det. GitHubs dokumentation ger ett skäl till. Copilots kontroll av ett faktums källhänvisningar är Copilots eget omdöme och inte en garanti som systemet tvingar fram, så du bör inte lita på att ett lagrat faktum följs som en regel som alltid gäller.

Alla tre leverantörerna drar gränsen på samma ställe. OpenAIs dokumentation säger att du ska lägga obligatoriska riktlinjer för teamet i `AGENTS.md` eller i dokumentation i repot och behandla minnen som "ett användbart lager för att komma ihåg, inte som den enda källan till regler som alltid måste gälla" (vår översättning).
[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/run/memory)
påpekar att fakta om repot delas och inte är privata anteckningar. Den säger också att du ska lägga granskade krav för teamet i projektdokumentation under versionshantering eller i custom instructions. GitHub beskriver en arbetsfördelning: custom instructions för viktiga regler – som ett säkerhetskrav eller ett obligatoriskt granskningssteg – och Copilot Memory för detaljerna som samlas på hög och annars skulle göra en instruktionsfil lång och svår att underhålla. Claude Code delar upp det efter syfte: CLAUDE.md-filer styr Claudes beteende och auto memory låter Claude lära sig av dina korrigeringar.

{% figure "memory-file-or-memory" %}

Ett faktum flyttas från agentens anteckningar till filen när det har visat sig stabilt. VS Codes dokumentation beskriver stegen när ett minne för repot har blivit stabilt och användbart för teamet: kontrollera faktumet mot repots kod och konfiguration, flytta det till projektdokumentationen eller instruktionsfilen och granska ändringen på det vanliga sättet i repot. Uppdatera eller ta bort det lokala minnet efteråt för att undvika föråldrade eller motstridiga kopior.

En tredje sorts text hör inte hemma i någon av dem: pågående arbete. Pocock drar
gränsen så här i sin
[guide till överlämning](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md):
"Om du hela tiden förklarar ett faktum på nytt hör det hemma i `CLAUDE.md`. En
halvfärdig uppgift hör hemma i en överlämning." (vår översättning)
Överlämningen beskrivs i "Vad som fyller en AI-agents kontext".

## Det ett team delar är det som committas

En kollegas dator och en runner utgår båda från repot, inte från din hemmapp.
Regeln för en körning i molnet beskrivs i
[Var AI-agenten körs och vem som startar den](/sv/blog/where-the-agent-runs/):
det du committar finns med, men det du bara har konfigurerat på din egen
dator finns inte med. Minnet följer samma regel.

Claude Codes auto memory ligger lokalt på varje dator: alla worktrees för ett
repo delar en mapp och filerna delas inte mellan datorer eller molnmiljöer. Det
som följer med repot är det som committas: projektets CLAUDE.md – som delas med
teamet via versionshantering – och scope `project` för en subagents eget minne.
[Dokumentationen om subagenter](https://code.claude.com/docs/en/sub-agents)
rekommenderar det som standard eftersom kunskapen då går att dela via
versionshantering. Codex sparar sina minnen lokalt, så de stannar på den dator
där Codex kördes.

Copilot är ett medvetet undantag: GitHub lagrar fakta om repot åt Copilot. VS Code
har också ett experimentellt alternativ som lagrar dem i en fil i
arbetskatalogen, `.github/copilot-memories.jsonl`. Den filen kan ingå i commits
– även sådana som agenten gör. Molnminnets inställningar och policyer på GitHub
gäller inte för den.

{% figure "memory-where-it-lives" %}

Ett minne i en hemmapp når bara den dator det ligger på. En fil i repot når varje dator och runner. En leverantörs minne når de konton som leverantören släpper in. "Delat" kan alltså betyda två saker. Det kan vara delat som en fil, som följer med repot och kan läsas och granskas av alla som har checkat ut det, eller delat via ett konto, där det beror på vilka leverantören släpper in.

## En GitHub-hosted runner startar tom

En anteckning som agenten skriver under ett jobb är borta när jobbet slutar, om inte jobbet committar och pushar den, laddar upp den som en artifact eller cachar den. Ett jobb på en GitHub-hosted runner börjar från en ren miljö: [GitHubs dokumentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners) säger att varje GitHub-hosted runner – med undantag för single-CPU-runners – är en ny virtuell maskin. Sidan om [dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching) säger att jobb på GitHub-hosted runners startar från en ren runner image.

{% figure "memory-runner-starts-empty", "wide" %}

Det som finns på runnern är repot, som ett steg i jobbet checkar ut. För Claude Codes
GitHub Action är lösningen filen i repot. [Action-dokumentationen](https://code.claude.com/docs/en/github-actions) säger att du ska skapa en CLAUDE.md i repots rot för kodstil, granskningskriterier, projektspecifika regler och föredragna mönster – och hålla den kortfattad, eftersom Claude läser den vid varje körning.

Tre saker kan överleva ett jobb. De är inte likvärdiga. En commit kan granskas
som vilken ändring som helst och finns där för nästa körning. En artifact är
till för filer som ett jobb har skapat och som du vill använda eller titta på
efter körningen. En cache är till för filer som är dyra att återskapa. Enligt
GitHub ska ett jobb alltid kunna återskapa dem.

En cache är ett dåligt ställe att ha ett minne på. Enligt GitHubs dokumentation
återställer varje körning som kan läsa en cache innehållet precis som det är.
Återställda filer ska därför behandlas som opålitlig indata och secrets ska
inte lagras i en cache. En förgiftad cache kan leda till att kod körs i betrodda
workflows. En minnesfil är till för att agenten ska följa den, vilket är raka
motsatsen till opålitlig indata.

Copilots cloud agent sparar det den lär sig utanför jobbet, i Copilot Memory, så
att det finns kvar till nästa uppgift. I icke-interaktiva sessioner med
kommandoradsverktyget är minnet avstängt om inte körningen anger
`--enable-memory`.

## Ett minne som många agenter läser måste gå att lita på

En anteckning i din egen mapp påverkar bara dina egna sessioner. Ett faktum i
ett delat minne – eller i en fil som hela teamet committar – påverkar varje
session som läser det. Det som läses in i början, till exempel en
instruktionsfil eller ett index över minnen, finns där innan någon har frågat
något. Prompt injection förklaras i
[MCP, så når AI-agenten andra system](/sv/blog/mcp-reaching-your-systems/):
text som agenten läser kan innehålla instruktioner som den följer som om du hade
skrivit dem. Ett minne kan föra en sådan text vidare till varje senare session
som läser det.

### Vem som kan skriva i ett delat minne

Cloud agent och code review sparar ett minne utan att fråga dig. Copilot-appen och det interaktiva kommandoradsverktyget kan be dig godkänna ett minne innan det sparas. I Copilot skapas fakta om repot bara när Copilot arbetar i ett repo där du har skrivbehörighet. GitHubs dokumentation tillägger att fakta om repot kan hämtas ur pull requests som stängdes utan att mergas. Copilot ska kontrollera dem mot den aktuella kodbasen, men det garanterar inte att den känner igen varje föråldrat faktum.

### Ett förgiftat minne

En instruktion som har gömts i ett dokument kan hamna i agentens minne och göra skada flera sessioner senare. [En preprint](https://arxiv.org/html/2609.13889v1) från forskare vid University of Auckland och Fudan University, publicerad i september 2026, testar det på själva Claude Code. Metoden är att gömma instruktioner i vanliga externa källor – text, bilder och PDF-filer – så att agenten sparar dem i sitt beständiga minne. De utlöses sedan i en senare session. Upplägget var en simulerad arbetsyta med e-post, kalender, delade dokument och formulär, där Claude Code kördes på tre språkmodeller från andra modellleverantörer. I genomsnitt nådde instruktionerna minnet i 66,9 % av försöken. I 81,7 % av testerna som gick över flera sessioner ledde de till att privata data läckte i en senare session. Det är medelvärden för en uppsättning tester, inte en andel för din egen konfiguration.

Författarna testade också ett försvar på promptnivå. Det minskade i många
konfigurationer antalet instruktioner som nådde minnet, men gav begränsat skydd
när minnet väl hade förgiftats. Det som stoppar en förgiftad instruktion
oavsett vad modellen bestämmer är en gräns utanför modellen. Den förgiftade
anteckningen ligger kvar i minnet och når varje senare session som läser den. Därför spelar sådana gränser större roll när det finns minne, inte mindre. Gränsen ska sitta mellan agenten och åtgärden.

{% figure "memory-poisoned-entry", "wide" %}

Leverantörernas kontroller riktar sig mot samma svaga punkter. Enligt GitHubs
tekniska inlägg oroar GitHub sig mest för minnen som är föråldrade, felaktiga eller
till och med skrivna dit för att skada. I sitt test la GitHub in vilseledande minnen i repona: fakta som motsade kodbasen, med källhänvisningar som pekade på irrelevant eller obefintlig kod. I alla testfall kontrollerade agenterna konsekvent källhänvisningarna, upptäckte motsägelserna och uppdaterade de felaktiga minnena. Det är GitHubs utvärdering av sin egen produkt. Den gäller minnen vars källhänvisningar inte stöder dem.

GitHubs dokumentation tillägger att systemet kan avvisa minnen som innehåller
kända model-control tokens, som skydd mot prompt injection. OpenAIs
dokumentation beskriver en inställning i Codex,
<code>memories.disable_on_<wbr>external_context</code>, som gör att chattar som
har använt extern kontext – till exempel MCP-verktygsanrop, webbsökning eller
verktygssökning – inte används för att skapa minnen.

De enklaste kontrollerna är de två allmänna lärdomarna som en säkerhetsforskare
drar i
[en genomgång från 2025](https://embracethered.com/blog/posts/2025/windsurf-spaiware-exploit-persistent-prompt-injection/)
av minnet i en kodande AI-agent: system bör föreslå minnen för användaren i
stället för att lägga till dem automatiskt och användare bör granska minnen
regelbundet. Att granska minnen går att göra i alla tre verktygen. Claude Codes
auto memory är vanlig Markdown som du öppnar med `/memory`. Codex minnesfiler
går att granska i hemmappen. GitHub låter personer med rätt behörighet
granska och ta bort fakta om repot i repots inställningar.

### En secret följer med minnet

Ett minne är text som agenten skriver och som andra ofta kan läsa. En
secret som hamnar i ett minne följer därför med. GitHubs dokumentation säger att
minnen skannas efter secrets som tokens, nycklar eller inloggningsuppgifter
och att ett minne där en sådan hittas avvisas. OpenAIs dokumentation säger att
Codex maskerar secrets i genererade minnesfält, men att du ändå bör granska
filerna innan du delar din Codex-hemmapp. VS Codes dokumentation säger
tydligt att du inte ska lagra inloggningsuppgifter, secrets eller känslig personlig information i minnet. Samma försiktighet gäller för minnet som i de tidigare artiklarna: i "MCP, så når AI-agenten andra system" hålls en token utanför filer och chatt och i "Sätt gränserna i förväg" finns en regel mot att läsa en `.env`-fil.

### Föråldrade fakta

Den tystare risken är ett faktum som var sant när det skrevs. Fabriken bakom den
här sajten stötte på den i september 2026. I
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
hoppade nya sessioner över det mesta av en anteckningslogg som hade blivit för
lång att läsa i sin helhet och tog gamla fakta för aktuella. Lägeskortet som skrivs om vid varje överlämning och referensen som läses i ett anrop fanns redan. Ändringen var att korta båda och sätta tak för dem, som "Vad som fyller en AI-agents kontext" beskriver. Pococks ordlista
beskriver det allmänna fallet: ett faktum som antecknades i mars läses in lika
självklart i juni – efter att projektet har gått vidare – och ett
minnessystem behöver rensas på samma sätt som AGENTS.md.

Verktygen har en del av den rensningen inbyggd. När `MEMORY.md` närmar sig sin
gräns påminner Claude Code agenten om att ha en rad per minne och att slå ihop
eller ta bort föråldrade minnen. Claude Code antecknar också när varje minne
skrevs, så att ett faktums ålder syns. I GitHub kan ett minne löpa ut om det
inte har förstärkts under en period, alltså om Copilot inte har röstat upp det.
Copilot kan också rösta ned ett minne som den bedömer är felaktigt eller
föråldrat.

## Fem lösningar och vad var och en kostar att hålla igång

Vilken lösning som passar beror på vem som ska läsa minnet: du själv, teamet
eller flera agenter som delar state. De tre första lösningarna är
leverantörernas egna. De två sista är öppen källkod: exempel från utvecklare,
inte leverantörsråd. Det som sägs om dem här är det projekten själva skrev om sig
i november 2026.

### Filen i repot

Filen i repot behöver ingen tjänst och når varje dator och runner precis som den
är. Svagheten är densamma som i "Instruktionsfilen, det första en AI-agent
läser": en lång fil följs sämre. Claude Code har `/doctor prompt-audit`, som
letar efter instruktioner skrivna för äldre modeller, hänvisningar till filer
eller kommandon som inte finns och filer som motsäger varandra. Kostnaden är
tiden det tar för människor att hålla filen aktuell.

### En leverantörs molnminne

Med Copilot Memory slipper människor underhållet. Enligt GitHubs dokumentation
kräver det inget underhåll från dig, anpassar sig när kodbasen och dina vanor
ändras och kastar bort det som slutar vara relevant. Det finns i alla betalda
Copilot-abonnemang. Minnen som tas med i modellens kontext räknas med i
tokenanvändningen. GitHubs tekniska inlägg från januari 2026 redovisar en
förbättring i egna A/B-tester. För det som inlägget kallar coding agent ökade
andelen mergade pull requests med 7 procentenheter: 90 % med minnen mot 83 % utan. Det är
GitHubs siffror för sin egen produkt. Riskerna ovan följer med.

### Ett minne i varje hemmapp

Claude Codes auto memory kostar ingenting att köra. Claude Code lämnar
minnesmappen utanför rensningen av gamla sessionstranskript, så anteckningarna
ligger kvar tills du eller Claude ändrar eller tar bort dem. Ingenting löper
ut av sig självt – det rensas bara om du eller Claude tar bort det – och ingenting
når en kollega eller en runner. Codex filer är genererade: dokumentationen säger att du inte ska räkna med att kunna redigera dem för hand. Codex desktop-app kan nollställa hela minnet på en dator.

### En minnesserver över MCP

En minnesserver är en MCP-server: ett program som agenten anropar för att läsa
och skriva minnen som flera agenter eller verktyg kan dela.
Att ansluta en är samma avvägning om förtroende som i "MCP, så når AI-agenten andra
system", med ett tillägg: det den innehåller har skrivits av agenter och läses
av agenter. Ingenting läser in den automatiskt i början. Agenten måste anropa
den. [Referensserverns README](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
innehåller en exempelprompt för personanpassning. Den säger åt agenten att börja
varje chatt med att hämta all relevant information ur kunskapsgrafen.

Referensservern i repot för Model Context Protocol beskriver sig själv som "en
grundläggande implementation av beständigt minne med en lokal kunskapsgraf"
(vår översättning). Den lagrar grafen i en fil, så det finns inget att
drifta. Flera klienter på en dator kan dela filen, eftersom varje skrivning tar
ett lås. README lägger till två förbehåll. Ett nätverksfilsystem som inte
respekterar låset går inte att dela säkert på det här sättet. Dessutom finns det
som standard ingen gräns för hur stor grafen kan bli. Repot kallar sina servrar
referensimplementationer och inte produktionsfärdiga lösningar.

[basic-memory](https://github.com/basicmachines-co/basic-memory) (AGPL-3.0)
lagrar anteckningar som Markdown-filer som både människor och modeller läser och
skriver, med ett lokalt SQLite-index och utan krav på servrar. Self-hosted är det
gratis och synkroniseringen mellan enheter görs manuellt, till exempel med git
eller Syncthing. Projektets molntjänst kostar i november 2026 15 dollar i
månaden till ett betapris – ordinarie pris är 19 dollar. Team workspace har samma
prissättning med en användare från början och fler efter behov. Enligt
projektet blir allt en teammedlem skriver direkt tillgängligt för alla andra och
deras AI-assistenter. En felaktig anteckning når dem lika snabbt som en riktig.

[Mem0](https://github.com/mem0ai/mem0) kallar sig ett intelligent minneslager
för AI-assistenter och agenter. Det finns som bibliotek, som self-hosted server
(startas med `docker compose`) eller som molnplattform. README säger att Mem0
kräver en språkmodell (LLM) för att fungera. Ett bibliotek eller en self-hosted
server betyder alltså en språkmodell som du antingen betalar för eller driver
själv. Mem0 lägger bara till minnen: de samlas på hög och inget skrivs över, så
rensningen är ditt jobb.

### Ett gemensamt register

Fabriken bakom den här sajten har sin gemensamma state i
[Beads](https://github.com/gastownhall/beads), en ärendehanterare med öppen
källkod som i sin README kallar sig "ett beständigt, strukturerat minne för kodande agenter" (vår översättning): en graf av uppgifter med beroenden i en
versionshanterad databas, i stället för Markdown-planer. En agent tar en bead,
arbetar, skriver ner vad den gjorde och stänger den, som det beskrivs i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
Om sessionen dör halvvägs förblir beaden öppen för nästa. Enligt README körs
databasen som standard inuti en process med en enda writer, ett serverläge
stöder flera writers och maskiner synkroniseras via git-remoten. `bd remember`
sparar varaktiga projektfakta som `bd prime` läser in senare. Personliga
preferenser tar README inte med: de hör hemma i ditt eget verktygs minne.

Det är en annan sorts minne än de fyra andra: state som ändras hela tiden och
som flera agenter måste se på samma sätt, till exempel vem som har tagit vad och
vad som är klart. Det kräver ett enda ställe som varje agent läser från och
skriver till med samma kommandon. Kostnaden är att hålla en databas och en
remote för synkroniseringen igång.

## Vad du gör först

Ett första steg är att läsa det din agent redan har sparat: `/memory` i Claude Code, repots Copilot-minnesinställningar på GitHub och mappen `~/.codex` för Codex. Det du hittar går att sortera i tre sorter: regler, sådant du vill komma ihåg och pågående arbete. Regler som teamet förlitar sig på hör hemma i instruktionsfilen i repot, där de granskas som kod. En regel som måste gälla oavsett vad agenten bestämmer behöver dessutom en gräns utanför modellen. Pågående arbete hör hemma i en överlämning.

En ny runner är tom när jobbet börjar: allt ett jobb lär sig går förlorat om det inte committas och pushas, eller sparas i ett minne utanför runnern – och en cache är inget ställe att ha det på. Innan du ansluter ett delat minne, till exempel en minnesserver, är det bra att ha bestämt vem som får skriva i det, vem som läser det och hur en anteckning tas bort. Det är också värt att kontrollera de aktuella inställningarna innan du förlitar dig på standardvärdet, eftersom de i november 2026 skiljer sig mellan verktygen och mellan Copilots abonnemang.
