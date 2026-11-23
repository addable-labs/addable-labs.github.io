---
title: Vad som fyller en AI-agents kontext
description: "Varför en AI-agent kan bli sämre i en lång session och vad du kan göra åt det: vad en kodande agent skickar till modellen i varje steg, vad en subagent håller utanför kontexten och vad komprimeringen förlorar, som leverantörerna beskrev det i november 2026, med Gas Citys planerade överlämning som exempel."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "En hög stapel, kontextfönstret, med en streckad linje som överkant fylls nerifrån i lager. Längst ner ligger ett tunt grått lager av fyra band, startinnehållet. Ovanpå det ligger ett grönt, ett orange och ett vitt lager. Ett blekt grönt lager är på väg in. Bredvid står en liten tom stapel, en subagents egen kontext."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: what-fills-an-ai-agents-context
draft: true                      # ett utkast — sätt false för att publicera det (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Språkmodellen bakom en kodande AI-agent minns inte konversationen från ett
meddelande till nästa. Varje gång verktyget frågar modellen vad den ska göra
skickar det med allt modellen behöver se: instruktionerna, filerna som har
lästs, utdata från körda kommandon och konversationen hittills. Allt det
tillsammans är kontexten. Den enklaste vanan som alla tre leverantörerna delar
är en uppgift per session.

[VS Codes
dokumentation](https://code.visualstudio.com/docs/agents/concepts/context)
beskriver den som den information som agenten och språkmodellen har tillgång
till medan de arbetar med det du har bett om. Samma sida är tydlig med vad
kontext inte är: att lägga till kontext är inte detsamma som att träna en
modell.

Den här artikeln följer en session från den första prompten till det ögonblick
då verktyget måste komprimera (compact) kontexten. Den visar var utrymmet går åt
och vad som går förlorat. Fabriken bakom den här sajten är exemplet.
Beskrivningarna följer dokumentationen för Claude Code, Codex och GitHub Copilot
i VS Code som den såg ut i november 2026. Vad en agent behåller från en session
till nästa är ett annat ämne – minne. Vi kommer att djupdyka i det i en senare
artikel.

## Kontexten rymmer mer än konversationen

Det du ser i terminalen är bara en del av det modellen får. Enligt [Claude Codes
dokumentation](https://code.claude.com/docs/en/context-window) rymmer
kontextfönstret allt som Claude vet om din session: dina instruktioner, filerna
den läser, Claudes egna svar och innehåll som aldrig syns i terminalen. Allt
räknas mot samma gräns. VS Codes dokumentation säger samma sak med andra ord:
ditt meddelande, konversationshistoriken, instruktioner, refererade filer och
verktygens utdata räknas alla in i kontextfönstret. Där definieras fönstret som
den största mängd information som en språkmodell kan behandla i ett anrop.

## En del av kontexten finns där innan du skriver något

Enligt Claude Codes dokumentation läses det här in före den första prompten:
CLAUDE.md, auto memory, namnen på MCP-verktyg och beskrivningar av skills.
Instruktionsfilen, skills och MCP-servrar har var sin artikel på sajten:
[Instruktionsfilen, det första en AI-agent
läser](/sv/blog/the-instruction-file/), [Skills, när arbetet ska göras likadant
varje gång](/sv/blog/skills-for-repeatable-work/) och [MCP, så når AI-agenten
andra system](/sv/blog/mcp-reaching-your-systems/). Verktygets egna
instruktioner ligger före allt det – [Från AI-chatt till agentiskt
arbete](/sv/blog/what-makes-a-chat-an-ai-agent/) beskriver dem.

{% figure "context-before-you-type" %}

Det som läses in först följer med i varje senare anrop, så det finns alltid
något i fönstret. Det du styr är den del som kommer från din egen konfiguration.
En längre instruktionsfil eller fler anslutna servrar gör startinnehållet större
i varje anrop under sessionen.

## Varje steg fyller på kontexten och varje anrop skickar allt

Filer, utdata från kommandon och modellens egna svar staplas i lager. Lagren
från en gammal uppgift finns kvar när en ny börjar. Enligt samma sida läggs
varje läst fil till i kontexten medan Claude arbetar. Sidan säger också att
tokenantalen i exempelsessionen är illustrativa och varierar med storleken på
din CLAUDE.md, dina MCP-servrar och hur långa dina filer är, så figurerna här
bara visar relativa storlekar.

{% figure "context-as-it-fills", "wide" %}

Det som blir kvar skickas igen. [Claude Codes sida om bästa
praxis](https://code.claude.com/docs/en/best-practices) uttrycker det så här:
"Varje anrop skickar hela konversationen, så en session som har samlat på sig
tre uppgifter som inte hör ihop läser om alla tre vid varje varv i den fjärde"
(vår översättning). En gammal uppgift kostar därför tokens i varje senare steg,
oavsett om den spelar roll för den nya.

Den andra kostnaden är modellens uppmärksamhet. Anthropics ingenjörer kallar
effekten context rot: när antalet tokens i kontextfönstret ökar blir modellen
sämre på att korrekt hämta fram information ur kontexten.
[Chroma](https://www.trychroma.com/research/context-rot) testade 18 modeller i
juli 2025 och rapporterade att prestandan blir allt mindre pålitlig ju längre
indatan är. Modellerna är från 2025, så hur stor effekten är i dag får nyare
tester visa, men riktningen är densamma som leverantörerna beskriver. Anthropics
guide till context engineering drar slutsatsen att målet är den minsta möjliga
uppsättningen tokens med hög informationstäthet, de som gör det mest sannolikt
att du får det resultat du vill ha.

Du kan se dina egna siffror. I Claude Code ger `/context` en uppdelning per
kategori i realtid, med optimeringsförslag och en lista över vilka
CLAUDE.md-filer och auto memory-filer som lästes in. Att titta en gång i början
av en session och en gång efter en lång uppgift visar det som figurerna försöker
illustrera.

## En subagent arbetar i en egen kontext

En subagent är en andra agent som huvudagenten delegerar en uppgift till. Den
börjar med en egen kontext. [Claude Codes
dokumentation](https://code.claude.com/docs/en/sub-agents) rekommenderar att du
använder en subagent när en sidouppgift annars skulle fylla huvudkonversationen
med sökresultat, loggar eller filinnehåll som du inte kommer att titta på igen:
subagenten gör det arbetet i sin egen kontext och lämnar bara tillbaka
sammanfattningen. Sidan om kontextfönstret lägger till att bara sammanfattningen
och lite metadata kommer tillbaka. Det finns ett undantag, en fork: i Claude
Code ärver den konversationen hittills i stället för att börja om. I november
2026 kan Claude starta en sådan på egen hand, eftersom fork-läget är på som
standard.

{% figure "context-subagent", "wide" %}

[Codex
dokumentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
beskriver problemet som en subagent löser från andra hållet. Om du fyller
huvudchatten med anteckningar från utforskningen, testloggar, stack traces och
utdata från kommandon kan sessionen enligt dokumentationen bli mindre pålitlig
med tiden. Dokumentationen nämner två effekter. Den ena är context rot, som
beskrevs ovan. Den andra är context pollution: användbar information begravs
under brus från mellanresultat.

En subagent sparar utrymme i huvudkontexten, inte tokens. Läsningen görs
fortfarande – bara i en annan kontext – och enligt Claude Codes sida om bästa
praxis räknas den mot samma användning som huvudkonversationen. Totalen blir
ofta större än om arbetet gjordes i en session, eftersom en ny subagent först
måste samla ihop kontext som huvudkonversationen redan hade. Det kan också kosta
tid. Anthropic mätte samma avvägning i sitt eget forskningssystem med flera
agenter i juni 2025. Enligt mätningen använde agenter ungefär fyra gånger så
många tokens som chattkonversationer och system med flera agenter ungefär femton
gånger så många. Det är siffror för det systemet, inte en regel för kodande
agenter.

En separat kontext är inte en separat plats att arbeta på. VS Codes
dokumentation sammanfattar det i en mening: att isolera kontexten är inte
detsamma som att isolera koden. En egen kontext ger inte i sig en separat
worktree eller sandbox, så vad subagenten får röra beror på de behörigheter den
körs med. Det är ämnet för [Sätt gränserna i
förväg](/sv/blog/set-the-limits-in-advance/).

Två utvecklare har egna ord för att ge en subagent en egen kontext. [Simon
Willison](https://simonwillison.net/2025/Oct/11/sub-agents/) beskriver en
subagent som en separat agentloop med en ny kontext och [Drew
Breunig](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)
kallar det att isolera kontexter i egna trådar för context quarantine. Det är
termer från utvecklare, inte från leverantörerna.

## När kontexten är full komprimeras den

En full kontext avslutar inte sessionen. Claude Code komprimerar automatiskt när
du närmar dig gränsen. VS Code komprimerar automatiskt äldre delar av
konversationen till en sammanfattning. Enligt [Codex guide om bästa
praxis](https://learn.chatgpt.com/guides/best-practices) komprimerar Codex också
chattar automatiskt. Priset är att något går förlorat. VS Code säger att
komprimeringen frigör kontextfönstret för ny information, men att detaljer från
tidigare meddelanden kan sammanfattas eller utelämnas. Anthropics guide varnar
för att alltför aggressiv komprimering kan ta bort små detaljer som visar sig
vara avgörande.

{% figure "context-compaction", "wide" %}

Claude Codes dokumentation visar vad som kommer tillbaka efteråt. Det mesta av
startinnehållet läses in igen automatiskt. Verktyget läser dessutom om upp till
fem av de filer som Claude har läst eller redigerat i sessionen, de som ändrades
senast. Skills som har använts i sessionen kommer också tillbaka, inom en
storleksgräns.

Resten av konversationen finns i sammanfattningen eller är borta. Regler som
gäller en viss sökväg och CLAUDE.md-filer i undermappar, som bara läses in när
Claude rör en matchande fil, försvinner i sammanfattningen på samma sätt. De
läses in igen först när Claude rör en sådan fil. En regel som måste finnas kvar
hör därför hemma i CLAUDE.md i projektets rot. Efter en paus kan du få fortsätta
från en sammanfattning: med ett abonnemang komprimerar Claude Code i november
2026 också en session över ungefär 200 000 tokens som har stått inaktiv i
ungefär en timme, strax innan sessionens promptcache går ut.

## I november 2026 rekommenderar leverantörerna att du rensar mellan uppgifter

Tyngdpunkten har flyttats. Enligt Claude Codes sida om bästa praxis har de
flesta aktuella modeller ett fönster på 1 miljon tokens och komprimeringen sker
av sig själv, så det är ovanligt att kontextfönstret blir fullt. Rådet att
hantera fönstret aggressivt är borta. Det som återstår är att det fortfarande är
värt att rensa mellan uppgifter, eftersom en fokuserad kontext ger bättre svar
och kostar mindre. Fyra vanor följer av de här sidorna:

- En ny session eller en rensad konversation för varje uppgift. VS Code
  rekommenderar en ny session för en uppgift som inte hör ihop med den förra
  eller för ett annat projekt. Codex rekommenderar en chatt per sammanhängande
  arbetsenhet.
- Komprimering med fokus. Claude Codes sida föreslår `/compact` med
  instruktioner före en lång ny uppgift, så att sammanfattningen behåller det du
  väljer i stället för det som den automatiska komprimeringen gissar är viktigt.
- En subagent som läser det som är stort, som avsnittet ovan beskriver. Det
  kostar tokens.
- Korta filer som läses in först, eftersom instruktionsfilen följer med i varje
  anrop. Claude Codes sida om bästa praxis och Codex guide säger båda det.
  Artikeln om instruktionsfilen visar hur.

## Gas City planerar överlämningen i stället för att vänta på komprimering

Fabriken bakom den här sajten har ett konkret exempel på samma problem.
Borgmästaren, agenten som samordnar fabriken, arbetar i sessioner. Varje session
slutar med en överlämning: den skriver ner läget i sitt arbete och en ny session
fortsätter därifrån. [En studie av borgmästarens
kontext](/sv/blog/what-the-mayors-context-costs/) mätte vad det kostar. En agent
kan inte planera det själv, eftersom en session inte kan se hur mycket av sin
kontext den har använt. [Gas
City](https://github.com/gastownhall/gascity/blob/main/cmd/gc/context_inject.go),
verktyget med öppen källkod som kör fabrikens agenter, har därför en hook som
gör det åt agenten. Med kodens egna ord triggas hooken avsiktligt av
tröskelvärden och är ingen nedräkning som alltid är på. Den läser antalet tokens
i sessionens transkript och är tyst så länge antalet ligger under en första
nivå. Över den ber den agenten planera för en ren överlämningspunkt. Över en
andra nivå ber den agenten utlösa den ordinarie överlämningen nu.

{% figure "context-handoff", "wide" %}

Poängen är vem som avgör vad som överlever. Vid komprimering skriver verktyget
sammanfattningen. Vid en planerad överlämning skriver agenten ner det nästa
session behöver medan den fortfarande kan. Koden pekar ut vad som annars skulle
gå förlorat: att agenten medvetet avrundar sitt arbete.

Hookens två nivåer är andelar av det fönster som Gas City antar att modellen
har, så den siffran måste stämma. Den 22 och 23 september 2026 bad Gas City om
en överlämning vid 160 000 tokens, eftersom den antog att fönstret var 200 000.
När fabriken satte fönstret till 1 000 000 tokens och överlämningen till 30 %
blev det 0,18 överlämningar per bead, en uppgift i fabrikens ärendehanterare, i
stället för 1,46. Priset blev längre anrop: efter den första utåtriktade
handlingen, till exempel ett svar eller ett utskickat uppdrag, bearbetade de i
genomsnitt 187 000 tokens i stället för 142 000. En sen överlämning gör varje
anrop längre och en tidig ger fler överlämningar. Det nedskrivna läget måste
också vara kort. Den 24 september kortades både lägeskortet – som skrivs om vid
varje överlämning – och referensen som läses i ett anrop. Båda fick en övre
gräns.

## När du bör rensa, komprimera eller lämna över

Matt Pocock, som publicerar en samling skills för agenter, kommer på egen hand
fram till ett liknande mönster. [Pococks regler för
fasgränser](https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)
säger att det mitt i en fas inte finns något beslut att fatta: du fortsätter
eller delar upp det som återstår på subagenter, eftersom komprimering mitt i en
fas får agenten att tappa tråden. [Pococks anteckningar om
överlämningar](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md)
jämför tre alternativ vid en fasgräns: `/compact` bevarar din avsikt, `/clear`
bevarar ingenting och `/handoff` bevarar möjligheten att flytta arbetet vidare.
`/handoff` är en av Pococks skills och inget inbyggt kommando i verktyget. Det
är ett mönster från en enskild utvecklare, inte leverantörsråd. Det stämmer med
det som Gas Citys hook säger till agenten: planera för en ren överlämningspunkt.

Ett motsatt mönster kommer från en annan utvecklare. I juli 2025 skrev [Armin
Ronacher](https://lucumr.pocoo.org/2025/7/30/things-that-didnt-work/) att
subagenter visserligen borde bevara kontext bättre, men att det ofta gav bättre
resultat att starta nya sessioner och skriva ner tankar i Markdown-filer.
Anthropics guide ger tekniken ett namn, structured note-taking: agenten skriver
regelbundet anteckningar som sparas utanför kontextfönstret. Den tekniken är
ämnet för en senare artikel om minne.

## Vad som fortfarande går fel och vad du gör först

Användare beskriver också gränserna ovan som friktion. De två exemplen här, båda
från användare av Claude Code, är rapporter och inte domar över verktyget. Ett
[issue](https://github.com/anthropics/claude-code/issues/27242) i Claude Codes
publika issue tracker – öppnat i februari 2026 och fortfarande öppet i november
– påpekar att det inte finns något fungerande sätt att granska
konversationshistorik som har rensats eller komprimerats. På Hacker News invände
[en kommentator](https://news.ycombinator.com/item?id=49908276) i september 2026
att subagenter måste läsa om allt, vilket stämmer med det Anthropic själv
påpekar: att en ny subagent först måste samla ihop kontext som
huvudkonversationen redan hade.

Vanan att börja med är den som alla tre leverantörerna delar: en uppgift, en
session. De tre andra vanorna ovan kan följa när den första har blivit en rutin.
Om arbetet sträcker sig över många sessioner är det bra att skriva ner läget i
slutet av varje fas och låta nästa session börja med den anteckningen.
