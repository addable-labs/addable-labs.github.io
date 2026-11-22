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
utgångsläget rakt: varje session börjar med ett nytt kontextfönster.

[Vad som fyller en AI-agents kontext](/sv/blog/what-fills-an-ai-agents-context/)
handlar om vad som finns i fönstret under en session. Den här artikeln handlar
om vad som sparas utanför det: vad en agent skriver ner, var det lagras, vem mer
som kan läsa det och vad som kan gå fel när ett team delar det. Den följer
dokumentationen för Claude Code, Codex och GitHub Copilot så som den såg ut i
november 2026 och använder den artikelns termer utan att förklara dem igen.

Det är teamet som gör ämnet svårt. En utvecklares dator, en kollegas dator och
ett jobb på en GitHub-runner startar var och en sina egna sessioner och det en
av dem har skrivit ner finns inte automatiskt tillgängligt för de andra.

## Minne är det en agent skriver ner och läser in igen

[Anthropics guide till kontextteknik](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
definierar tekniken i två halvor: agenten skriver anteckningar utanför
kontextfönstret och anteckningarna läses in i kontextfönstret igen vid senare
tillfällen. En praktikers ordlista, Matt Pococks
[AI Hero dictionary](https://www.aihero.dev/ai-coding-dictionary/memory-system),
ger halvorna namn. På skrivvägen sparar agenten det den lärde sig under en
session som filer i miljön. På läsvägen läser verktyget in de filerna, eller ett
register över dem, i kontextfönstret i början av en senare session.

{% figure "memory-written-and-loaded", "wide" %}

I figuren är sessionens stapel borta när sessionen slutar men förrådet bredvid
den är det inte: det som skrevs dit läses in i nästa sessions startinnehåll.
Tre frågor avgör hur ett minne beter sig: vem som skriver det, var det lagras
och vem mer som kan läsa det. Resten av artikeln svarar på dem för varje verktyg
och för ett team. Det som läses in igen hamnar i startinnehållet och tar därför
plats i varje anrop. Det är kontext och inget mer. Claude Codes dokumentation
säger att den behandlar CLAUDE.md-filer och automatiskt minne som kontext och
inte som påtvingad konfiguration. För att blockera en åtgärd oavsett vad Claude
bestämmer pekar den på en hook. Vad som påtvingas utanför modellen är ämnet för
[Sätt gränserna i förväg](/sv/blog/set-the-limits-in-advance/).

## Vad leverantörerna kallar minne

Claude Code har två saker som för kunskap vidare mellan sessioner:
CLAUDE.md-filer – som du skriver – och automatiskt minne, som Claude skriver
själv utifrån dina korrigeringar och preferenser. I automatiskt minne sparar
Claude anteckningar av fyra slag: om dig, om de korrigeringar du ger, om
pågående arbete och beslut och om var man hittar information utanför projektet.
Den hoppar över allt den kan härleda ur kodbasen eller hitta i dina
CLAUDE.md-filer. Claude sparar inte något i varje session: den avgör vad som är
värt att komma ihåg efter om informationen skulle vara användbar i ett framtida
samtal och den sparar det du ber den komma ihåg.

Anteckningarna är vanliga markdown-filer i en mapp för varje repo, med ett
register som heter `MEMORY.md` och en fil för varje minne. De första 200 raderna
eller 25 KB av registret läses in i början av en session och Claude läser de
andra filerna när den behöver dem. I november 2026 är automatiskt minne på som
standard i lokala sessioner och av som standard i en session i en egen driftsatt
miljö (self-hosted).

GitHub Copilots minne fungerar annorlunda. Enligt
[GitHubs dokumentation](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory)
skapar Copilot minnen själv som en biprodukt av att arbeta med dig och har två
sorter: fakta på repo-nivå – som delas med dina medarbetare i projektet – och
preferenser på användarnivå, som följer dig mellan repon. Att spara är ett
verktygsanrop:
[GitHubs tekniska inlägg](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)
beskriver minnesskapande som ett verktyg som agenter anropar när de upptäcker
något som sannolikt får handfasta följder för kommande uppgifter och varje minne
lagras med källhänvisningar, alltså referenser till de platser i koden som
stöder det.

Innan Copilot använder ett faktum kontrollerar den dess källhänvisningar mot den
aktuella grenen. Ett internt röstsystem betygsätter varje minne efter om det
fortfarande gäller och uppröstade minnen skickas oftare till modellen. Minnena
finns i GitHubs moln och delas av Copilot i VS Code, på kommandoraden, i
kodgranskningen och i molnagenten: ett faktum som en av dem har fångat kan
användas av en annan.

I Codex skapas minnet av tidigare chattar i stället för att skrivas under dem.
[OpenAIs dokumentation](https://learn.chatgpt.com/docs/customization/memories)
säger att Codex gör om användbar kontext från lämpliga tidigare chattar till
lokala minnesfiler, hoppar över aktiva eller kortvariga sessioner och maskerar
hemligheter i de genererade fälten. Den uppdaterar minnen i bakgrunden, när en
chatt har varit overksam tillräckligt länge, i stället för vid slutet av varje
chatt. Filerna ligger i Codex hemkatalog, som standard `~/.codex`,
dokumentationen kallar dem genererat tillstånd och i november 2026 är lokala
Codex-minnen av som standard.

De tre verktygen avgör alltså på tre sätt vad som ska sparas. Claude Code låter
Claude bedöma under sessionen. Copilot låter agenten spara ett faktum
tillsammans med källhänvisningar som kontrolleras när faktumet används. Codex
skapar minne av avslutade chattar i bakgrunden. Två av dem lagrar resultatet i
en mapp på en dator och Copilot lagrar det hos GitHub.

## Regler hör hemma i filen och minnet är till för att komma ihåg

Alla tre leverantörer drar gränsen på samma ställe. OpenAIs dokumentation säger
att man ska ha obligatorisk teamvägledning i `AGENTS.md` eller incheckad
dokumentation och behandla minnen som "ett användbart lager för att komma ihåg,
inte som den enda källan till regler som alltid måste gälla" (vår översättning).
VS Codes dokumentation påpekar att repo-fakta delas och inte är privata
anteckningar och säger att man ska ha granskade teamkrav i projektdokumentation
under versionshantering eller i anpassade instruktioner.

GitHubs dokumentation beskriver en arbetsfördelning: använd anpassade
instruktioner för viktiga regler – som ett säkerhetskrav eller ett obligatoriskt
granskningssteg – och låt Copilot Memory ta hand om den ackumulerade
detaljrikedomen som annars skulle göra en instruktionsfil lång och svår att
underhålla. Claude Codes sida sorterar dem efter syfte: CLAUDE.md-filer för att
styra Claudes beteende, automatiskt minne för att låta Claude lära sig av dina
korrigeringar.

Orsaken är vem som har kontrollerat texten. En människa skriver
instruktionsfilen – den beskrivs i
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/)
– och en kollega kan granska den i en pull request. En agent skriver minnet och
ingen behöver ha läst det. GitHubs dokumentation är tydlig med följden: eftersom
Copilots kontroll av ett faktums källhänvisningar är ett omdöme som Copilot gör
och inte en garanti som systemet upprätthåller bör man inte lita på att ett
lagrat faktum följs som en regel som alltid gäller.

{% figure "memory-file-or-memory" %}

I figuren flyttar ett faktum från agentens anteckningar till filen när det har
visat sig stabilt. VS Codes dokumentation ger stegen för repo-minne som har
blivit stabilt och användbart för teamet: kontrollera uppgiften mot repots kod
och konfiguration, flytta den till projektdokumentet eller instruktionsfilen,
granska ändringen i repots vanliga process och uppdatera eller ta bort det
lokala minnet för att undvika föråldrade eller motstridiga kopior.

En tredje sorts text hör hemma i ingen av dem: pågående arbete. Matt Pocock, en
praktiker, drar gränsen så här i sin
[guide till överlämning](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md):
"Om du ständigt förklarar ett faktum på nytt hör det hemma i `CLAUDE.md`. En
halvfärdig uppgift hör hemma i en överlämning." (vår översättning) Överlämningen
är ämnet för artikeln om kontext.

## Det ett team delar är det som checkas in

En kollegas dator och en runner börjar båda från repot och inte från din
hemmapp. Del 6 av serien,
[Var AI-agenten körs och vem som startar den](/sv/blog/where-the-agent-runs/),
beskriver regeln för en körning i molnet: det du checkar in finns där och det du
har konfigurerat bara på din egen dator gör det inte. Minnet följer samma regel.

Claude Codes automatiska minne är maskinlokalt: alla worktrees för ett repo
delar en mapp och filerna delas inte mellan datorer eller molnmiljöer. Det som
följer med repot är det som checkas in: projektets CLAUDE.md – som delas med
teamet via versionshantering – och omfånget `project` i en subagents eget minne,
som dokumentationen rekommenderar som standard eftersom det gör kunskapen delbar
via versionshantering. Codex lagrar sina minnen i ett lokalt minnesförråd, så de
stannar på den dator där Codex kördes.

Copilot är undantaget, med avsikt, eftersom GitHub lagrar dess repo-fakta. VS
Code har också ett experimentellt alternativ som lagrar dem i en fil i
arbetskatalogen, `.github/copilot-memories.jsonl`. Den filen kan ingå i
incheckningar – även sådana som agenten gör – och molnminnets inställningar och
policyer på GitHub gäller inte för den.

{% figure "memory-where-it-lives" %}

I figuren når ett minne i en hemmapp bara den dator det ligger på, en incheckad
fil når varje dator och runner och en leverantörs förråd når de konton som
leverantören släpper in. "Delat" har alltså två betydelser: delat som en fil –
som följer med repot och som alla med en utcheckning kan läsa och granska – och
delat via ett konto, vilket beror på vilka leverantören släpper in.

## En runner startar tom

Ett jobb på en GitHub-värdad runner börjar i ett rent tillstånd.
[GitHubs dokumentation](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)
säger att varje GitHub-värdad runner – med undantag för enkärniga runners – är
en ny virtuell maskin och dess sida om
[beroendecachning](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
säger att jobb på GitHub-värdade runners startar i en ren runner-avbild. En
anteckning som agenten skriver under ett jobb är därför borta när jobbet slutar,
om inte jobbet checkar in den, laddar upp den eller cachar den.

{% figure "memory-runner-starts-empty", "wide" %}

Det som når runnern är det repo som ett steg i jobbet checkar ut. För Claude
Codes GitHub Action är leverantörens svar den incheckade filen:
[dess dokumentation](https://code.claude.com/docs/en/github-actions) säger att
man ska skapa en CLAUDE.md i repots rot för kodstil, granskningskriterier,
projektspecifika regler och föredragna mönster och hålla den kortfattad,
eftersom Claude läser den vid varje körning.

I figuren kan tre saker överleva ett jobb och de är inte likvärdiga. En
incheckning kan granskas som vilken ändring som helst och finns där för nästa
körning. En artefakt är till för filer som ett jobb har skapat och som du vill
använda eller titta på sedan körningen har tagit slut. En cache är till för
filer som är dyra att återskapa och GitHub säger att ett jobb alltid ska kunna
återskapa dem.

En cache är ett dåligt ställe att ha ett minne på. Varje körning som kan läsa en
cache återställer innehållet som det är, säger GitHubs dokumentation.
Återställda filer bör därför behandlas som opålitlig indata och inga hemligheter
bör lagras i en cache. Förgiftade cachar kan leda till kodkörning i betrodda
arbetsflöden. En minnesfil är avsedd att följas av agenten, vilket är raka
motsatsen till opålitlig indata.

GitHubs egen agent har sitt minne utanför jobbet: Copilots molnagent är en av de
ytor som delar Copilot Memory, så det den lär sig finns kvar till nästa uppgift.
I programmatiska sessioner med kommandoradsverktyget är minnet av om inte en
körning anger `--enable-memory`.

## Ett minne som många agenter läser måste gå att lita på

En anteckning i en persons mapp påverkar den personens sessioner. Ett faktum i
ett delat minne, eller i en fil som hela teamet checkar in, påverkar varje
session som läser in det och det läses in i början, innan någon har frågat
något. Del 5,
[MCP, så når AI-agenten andra system](/sv/blog/mcp-reaching-your-systems/),
förklarar prompt injection: text som agenten läser kan innehålla instruktioner
som den följer som om du hade skrivit dem. Ett minne gör en sådan text till
startinnehåll för alla senare sessioner.

### Vem som kan skriva

I Copilot skapas repo-fakta bara när Copilot arbetar i ett repo där användaren
har skrivrättigheter. Appen och det interaktiva kommandoradsverktyget kan be dig
godkänna ett minne innan det lagras men molnagenten och kodgranskningen frågar
inte. GitHubs dokumentation tillägger att repo-fakta kan fångas ur pull requests
som stängdes utan att slås ihop och att Copilot ska kontrollera dem mot den
aktuella kodbasen, vilket inte garanterar att den känner igen varje föråldrat
faktum.

### En förgiftad post

En preprint från Fudan University, publicerad i september 2026, prövar
förgiftning på Claude Code självt. Den gömmer instruktioner i vanliga externa
källor som text, bilder och PDF-filer, så att agenten skriver dem till sitt
beständiga minne. De utlöses sedan i en senare session. Upplägget var en
simulerad arbetsyta med e-post, kalender, delade dokument och formulär, där
Claude Code kördes på tre språkmodeller från andra utvecklare. I genomsnitt
nådde instruktionerna minnet i 66,9 % av försöken och ledde till ett läckage av
privata data i en senare session i 81,7 % av testerna över sessioner. Det är
medelvärden över en uppsättning tester, inte en andel för din egen
konfiguration. Författarna prövade också ett försvar på promptnivå, som minskade
minnesinjektionen i många konfigurationer men gav begränsat skydd när minnet väl
hade förgiftats. En förgiftad instruktion stoppas bara om något utanför modellen
stoppar den. Därför spelar gränserna i del 7 större roll med minne, inte mindre.
I figuren ligger det förgiftade kortet i förrådet och läses i början av varje
senare session. Det kortet ber om stoppas bara av en gräns som sitter efter
agenten.

{% figure "memory-poisoned-entry", "wide" %}

Leverantörernas kontroller riktar sig mot samma svaga punkter. GitHubs tekniska
inlägg nämner föråldrade, felaktiga och till och med illasinnat inmatade minnen
som sin största oro. I testet sådde man repon med motstridiga minnen – fakta som
stred mot kodbasen, med källhänvisningar som pekade på irrelevant eller
obefintlig kod – och i alla testfall kontrollerade agenterna konsekvent
källhänvisningarna, upptäckte motsägelserna och uppdaterade de felaktiga
minnena. Det är GitHubs utvärdering av dess egen produkt och den gäller minnen
vars källhänvisningar inte stöder dem.

GitHubs dokumentation tillägger att systemet kan avvisa minnen som innehåller
kända modellstyrande tecken (model-control tokens), som ett skydd mot prompt
injection. OpenAIs dokumentation beskriver en Codex-inställning,
<code>memories.disable_on_<wbr>external_context</code>, som håller chattar som har använt extern
kontext, som MCP-verktygsanrop, webbsökning eller verktygssökning, utanför
skapandet av minnen.

En säkerhetsforskares två allmänna lärdomar från en genomgång 2025 av en
kodagents minne är de enklaste kontrollerna: system bör föreslå minnen för
användaren i stället för att lägga till dem automatiskt och användare bör
granska minnen regelbundet. Det andra går att göra i alla verktygen ovan: Claude
Codes automatiska minne är vanlig markdown som `/memory` öppnar och GitHub låter
personer med rätt behörighet granska och ta bort repo-fakta i repots
inställningar.

### Hemligheter

Ett minne är en vanlig fil som agenten skriver och som andra ofta kan läsa, så
en hemlighet som hamnar i ett följer med. GitHubs dokumentation säger att minnen
kontrolleras för hemligheter som tokens, nycklar eller inloggningsuppgifter och
att ett minne där en sådan upptäcks avvisas. OpenAIs dokumentation säger att
Codex maskerar hemligheter i genererade minnesfält men att du ändå bör granska
filerna innan du delar din Codex-hemkatalog. VS Codes dokumentation säger
tydligt att man inte ska lagra inloggningsuppgifter, hemligheter eller känslig
personlig information i minnet. Del 5 håller en token utanför filer och chatt
och del 7 visar en regel mot att läsa en `.env`-fil; minnet kräver samma
försiktighet.

### Föråldrade fakta

Den tystare risken är ett faktum som var sant när det skrevs. Fabriken bakom den
här sajten stötte på den i september 2026. I
[En studie av borgmästarens kontext](https://addablelabs.se/sv/blog/what-the-mayors-context-costs/)
hoppade nya sessioner mest över en anteckningslogg som hade blivit för lång för
att läsas i sin helhet och tog gamla fakta för aktuella. Ändringen blev två
saker: ett lägeskort som skrivs om vid varje överlämning och en referens som
läses i ett anrop, båda kortade och med tak. En praktiker beskriver det allmänna
fallet: ett faktum som antecknades i mars läses in med samma tillförsikt i juni
– sedan projektet har gått vidare – och ett minnessystem behöver gallras på
samma sätt som AGENTS.md.

Verktygen har en del av den gallringen inbyggd. Claude Code påminner agenten –
när `MEMORY.md` närmar sig sin gräns – att ha en rad per post och slå ihop eller
ta bort föråldrade poster. Den noterar också när varje minne skrevs, så att ett
faktums ålder syns. GitHub låter minnen löpa ut efter en period utan
förstärkning och Copilot kan rösta ned ett minne som den bedömer som felaktigt
eller föråldrat.

## Fem lösningar och vad var och en kostar att hålla igång

De tre första lösningarna är leverantörernas egna. De två sista är öppen
källkod: praktikers exempel och inte leverantörsråd. Det som sägs om dem här är
det projekten säger om sig själva.

### Den incheckade filen

Den incheckade filen behöver ingen tjänst och den når varje dator och runner som
den är. Dess svaghet är den som varje delat dokument har: den växer tills
agenten följer den sämre. Claude Codes dokumentation siktar på under 200 rader
per fil eftersom längre filer tar mer kontext och minskar följsamheten. Den
erbjuder `/doctor prompt-audit`, som letar efter instruktioner skrivna för äldre
modeller, hänvisningar till filer eller kommandon som inte finns och filer som
motsäger varandra. Kostnaden är människors tid för att hålla filen sann.

### En leverantörs molnminne

Copilot Memory tar underhållet från människorna. GitHubs dokumentation säger att
det inte kräver något underhåll från dig, anpassar sig när kodbasen och dina
vanor ändras och kastar bort det som slutar vara relevant. Det finns i alla
betalda Copilot-planer och minnen som tas med i en modells kontext räknas in i
tokenanvändningen. GitHubs tekniska inlägg redovisar en vinst i egna A/B-tester
i januari 2026: för kodagenten 7 % högre andel sammanslagna pull requests, 90 %
med minnen mot 83 % utan. Det är GitHubs siffror för den egna produkten och
riskerna i föregående avsnitt följer med.

### Ett minne i varje hemmapp

Claude Codes automatiska minne kostar ingenting att köra. Claude Code undantar
minnesmappen från rensningen som tar bort gamla sessionsutskrifter, så
anteckningarna ligger kvar tills du eller Claude ändrar eller tar bort dem.
Inget i det löper ut av sig självt – gallringen är din – och inget i det når en
kollega eller en runner. Codex filer är genererat tillstånd: dokumentationen
säger att man inte ska förlita sig på att redigera dem för hand och
skrivbordsappen kan återställa en dators hela minnesförråd.

### En minnesserver över MCP

En minnesserver är en MCP-server: ett program som agenten anropar för att läsa
och skriva minnen i ett förråd som flera agenter eller verktyg kan dela. Att
ansluta en är det förtroendebeslut som del 5 beskriver, med ett tillägg: det den
innehåller har skrivits av agenter och läses av agenter. Ingenting läser in den
i början av sig självt. Agenten måste anropa den och därför ger referensserverns
README en exempelprompt som börjar varje chatt med att hämta all relevant
information ur kunskapsgrafen.

Referensservern i Model Context Protocol-projektets repo beskriver sig själv som
"en grundläggande implementation av beständigt minne med en lokal kunskapsgraf"
(vår översättning). Den lagrar grafen i en fil, så det finns inget att drifta.
Flera klienter på en dator kan dela filen, eftersom varje skrivning tar ett lås,
men README säger att ett nätverksfilsystem som inte respekterar låset inte kan
delas säkert på det här sättet och att ingenting som standard sätter tak för
grafen. Repot kallar sina servrar referensimplementationer och inte
produktionsfärdiga lösningar.

[basic-memory](https://github.com/basicmachines-co/basic-memory) (AGPL-3.0)
lagrar anteckningar som Markdown-filer som både människor och modeller läser och
skriver, med ett lokalt SQLite-index och utan krav på servrar. Egen drift är
gratis och synkroniseringen mellan enheter är manuell, till exempel med Git
eller Syncthing. Den värdbaserade teamarbetsytan kostar 15,00 dollar i månaden
och allt en teammedlem skriver är, enligt projektet, omedelbart tillgängligt för
alla andra och deras AI-assistenter. En felaktig post når dem lika snabbt som en
riktig.

[Mem0](https://github.com/mem0ai/mem0) kallar sig ett intelligent minneslager
för AI-assistenter och agenter och erbjuds som ett bibliotek, som en server med
egen drift som startas med `docker compose` eller som en molnplattform. Dess
README säger att Mem0 kräver en LLM för att fungera, så vid sidan av servern
eller prenumerationen finns en språkmodell att betala för eller drifta. Dess
extraktion lägger bara till: minnen ackumuleras och ingenting skrivs över,
vilket lämnar gallringen åt dig.

### Ett gemensamt register

Fabriken bakom den här sajten har sitt gemensamma tillstånd i
[Beads](https://github.com/gastownhall/beads), en ärendehanterare med öppen
källkod som i sin README kallar sig "ett beständigt, strukturerat minne för
kodande agenter" (vår översättning): en graf av uppgifter med beroenden i en
versionshanterad databas, i stället för markdown-planer. Som
[Därför driver vi en agentdriven mjukvarufabrik](https://addablelabs.se/sv/blog/why-we-run-an-agent-run-factory/)
beskriver tar en agent en bead, arbetar, skriver ner vad den gjorde och stänger
den. Om sessionen dör halvvägs förblir beaden öppen för nästa. Enligt README
körs databasen som standard inuti en process med en enda skrivare, ett
serverläge betjänar flera skrivare och maskiner synkroniseras via git-remoten.
`bd remember` lagrar varaktiga projektfakta som `bd prime` läser in senare och
README håller personliga preferenser utanför: de hör hemma i ditt eget verktygs
minne.

Det den håller är en annan sorts minne än de fyra andra: levande tillstånd som
flera agenter måste se på samma sätt, till exempel vem som har tagit vad och vad
som är klart. Det kräver ett enda ställe som varje agent läser och skriver via
samma kommandon. Kostnaden är en databas och en synkroniseringsremote som måste
hållas friska.

## Vad du gör först

Läs det din agent redan har sparat: `/memory` i Claude Code, repots
Copilot-minnesinställningar på GitHub och mappen `~/.codex` för Codex. Sortera
sedan det du hittar i tre sorter: regler, sådant man vill komma ihåg och
pågående arbete. Det som alltid måste gälla hör hemma i den incheckade
instruktionsfilen, granskad som kod. Ett faktum som har visat sig stabilt
flyttas dit från minnet och anteckningen tas bort. Pågående arbete hör hemma i
en överlämning.

Behandla en runner som tom: allt ett jobb lär sig går förlorat om det inte
checkas in och en cache är inget ställe att ha det på. Dela ett förråd mellan
agenter bara där de måste se samma levande tillstånd och bestäm, innan du
ansluter ett, vem som får skriva i det, vem som läser det och hur en post tas
bort. Håll hemligheter utanför allt detta. Och kontrollera de aktuella
inställningarna innan du förlitar dig på en standard, eftersom de i november
2026 skiljer sig mellan verktygen och mellan Copilots planer.
