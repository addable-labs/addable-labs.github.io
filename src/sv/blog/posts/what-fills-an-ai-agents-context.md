---
title: Vad som fyller en AI-agents kontext
description: "Vad en AI-agent för kodning skickar till modellen i varje steg, hur en session fyller det utrymmet, vad en subagent håller utanför det och vad komprimeringen förlorar, så som leverantörerna beskrev det i november 2026, med Gas Citys planerade överlämning som exempel."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "En hög stapel, kontextfönstret, med en streckad linje som överkant fylls nerifrån i lager. Längst ner ligger ett tunt grått startlager av fyra band. Ovanpå det ligger ett grönt, ett orange och ett vitt lager. Ett blekt grönt lager är på väg in. Bredvid står en liten tom stapel, en subagents egen kontext."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: what-fills-an-ai-agents-context
draft: true                      # ett utkast — sätt false för att publicera det (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Språkmodellen bakom en AI-agent för kodning minns inte ditt samtal från ett steg
till nästa. Varje gång verktyget frågar modellen vad den ska göra skickar det
med allt som modellen ska se: instruktionerna, filerna som har lästs, utdata
från kommandona som har körts och samtalet hittills. Allt det tillsammans är
kontexten.

[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/concepts/context)
definierar den som den information som agenten och dess språkmodell har tillgång
till medan de arbetar med det du har bett om. Samma sida är tydlig med vad
kontext inte är: att lägga till kontext är inte detsamma som att träna en
modell.

Den här artikeln följer en session från första prompten till det ögonblick då
verktyget måste komprimera (compact) kontexten: vad som finns i kontexten innan
du skriver något, vad varje steg lägger till, vad en subagent håller utanför
kontexten och vad som går förlorat när kontexten komprimeras. Beskrivningarna
följer dokumentationen för Claude Code, Codex och GitHub Copilot i VS Code så
som den såg ut i november 2026. Fabriken bakom den här sajten är exemplet. Vad
en agent behåller från en session till nästa är ett annat ämne – minne. En
senare artikel tar upp det.

## Kontexten rymmer mer än ditt samtal

Enligt
[Claude Codes dokumentation](https://code.claude.com/docs/en/context-window)
rymmer kontextfönstret allt som Claude vet om din session: dina instruktioner,
filerna den läser, dess egna svar och innehåll som aldrig syns i din terminal.
Allt räknas mot samma gräns. VS Codes dokumentation säger att användarens
meddelande, samtalshistoriken, instruktioner, refererade filer och verktygens
utdata alla tar plats i kontextfönstret. Den definierar fönstret som den största
mängd information som en språkmodell kan behandla i ett anrop.

## En del av kontexten finns där innan du skriver något

Claude Codes dokumentation listar vad som läses in före den första prompten:
CLAUDE.md, automatiskt minne (auto memory), namnen på MCP-verktyg och
beskrivningar av skills. Instruktionsfilen, skills och MCP-servrar har var sin
artikel på sajten:
[Instruktionsfilen, det första en AI-agent läser](/sv/blog/the-instruction-file/),
[Skills, när arbetet ska göras likadant varje gång](/sv/blog/skills-for-repeatable-work/)
och [MCP, så når AI-agenten andra system](/sv/blog/mcp-reaching-your-systems/).
Verktygets egna instruktioner kommer före allt det, som det beskrivs i
[Från AI-chatt till agentiskt arbete](/sv/blog/what-makes-a-chat-an-ai-agent/).

{% figure "context-before-you-type" %}

Det som läses in först följer med i varje senare anrop. I figuren är det ett
tunt lager under det tomma fönstret. Lagret är aldrig tomt. Den del av det som
kommer från din egen konfiguration är den del du styr. En längre instruktionsfil
eller fler anslutna servrar gör det tjockare i varje anrop under sessionen.

## Varje steg fyller på kontexten och varje anrop skickar allt

Enligt samma sida läggs varje läst fil till i kontexten medan Claude arbetar.
Sidan säger också att tokenantalen i dess exempelsession är illustrativa och
varierar med storleken på din CLAUDE.md, dina MCP-servrar och dina filers längd,
så figurerna här visar bara relativa storlekar. Filer, utdata från kommandon och
modellens egna svar staplas i lager. Lagren från en gammal uppgift finns kvar
när en ny börjar.

{% figure "context-as-it-fills", "wide" %}

Det som blir kvar skickas igen.
[Claude Codes sida om bästa praxis](https://code.claude.com/docs/en/best-practices)
uttrycker det så här: "Varje anrop skickar hela samtalet, så en session som har
samlat på sig tre uppgifter som inte hör ihop läser om alla tre vid varje varv i
den fjärde" (vår översättning). En gammal uppgift kostar därför tokens i varje
senare steg, oavsett om den spelar roll för den nya.

Den andra kostnaden är modellens uppmärksamhet. Anthropics ingenjörer kallar
effekten kontextröta (context rot): när antalet tokens i kontextfönstret ökar
minskar modellens förmåga att återge information ur kontexten korrekt.
[Chroma](https://www.trychroma.com/research/context-rot) testade 18 modeller i
juli 2025 och rapporterade att deras prestanda blir allt mindre tillförlitlig
när indatan blir längre. Modellerna är från 2025, så effektens storlek i dag är
en fråga för nyare tester, men riktningen är densamma som leverantörerna
beskriver. Anthropics guide till kontextteknik (context engineering) drar
slutsatsen att god kontextteknik handlar om att hitta den minsta möjliga
uppsättningen informationstäta tokens som maximerar sannolikheten för ett önskat
resultat.

Du kan se dina egna siffror. I Claude Code ger `/context` en uppdelning per
kategori i realtid, med förslag på optimeringar och en lista över vilka
CLAUDE.md-filer och automatiska minnesfiler som lästes in. Att titta en gång i
början av en session och en gång efter en lång uppgift visar det som figurerna
bara skissar.

## En subagent arbetar i en egen kontext

En subagent är en andra agent som huvudagenten lämnar över en uppgift till. Den
börjar med en egen kontext.
[Claude Codes dokumentation](https://code.claude.com/docs/en/sub-agents)
rekommenderar att du använder en subagent när en sidouppgift skulle fylla
huvudsamtalet med sökresultat, loggar eller filinnehåll som du inte kommer att
titta på igen: subagenten gör det arbetet i sin egen kontext och lämnar bara
tillbaka sammanfattningen. Sidan om kontextfönstret lägger till att bara
sammanfattningen och en liten del metadata kommer tillbaka. En fork är
undantaget: i Claude Code ärver den samtalet hittills i stället för att börja
om. I november 2026 kan Claude starta en sådan på egen hand, eftersom fork-läget
är på som standard.

{% figure "context-subagent", "wide" %}

[Codex dokumentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
beskriver problemet som en subagent löser från andra hållet. Om du fyller
huvudchatten med anteckningar från utforskandet, testloggar, stackspår och
utdata från kommandon kan sessionen enligt dokumentationen bli mindre
tillförlitlig med tiden. Dokumentationen namnger två effekter. Den ena är
kontextröta, som beskrevs ovan. Den andra är att användbar information begravs
under brusiga mellanresultat (context pollution).

En subagent är inte gratis. Enligt Claude Codes sida om bästa praxis är
kostnaden mest tokens, eftersom varje subagent skickar egna anrop och de räknas
mot samma användning som huvudsamtalet. Ibland kostar den också tid, eftersom en
ny subagent först måste samla ihop kontext som huvudsamtalet redan hade.
Anthropic mätte samma avvägning i sitt eget forskningssystem med flera agenter i
juni 2025. I dess data använde agenter ungefär fyra gånger så många tokens som
chattsamtal. System med flera agenter använde ungefär femton gånger så många.
Det är siffror för det systemet, inte en regel för agenter som arbetar med kod.

En separat kontext är inte en separat plats att arbeta på. VS Codes
dokumentation sammanfattar det i en mening: kontextisolering är inte
kodisolering. Den skapar inte i sig en separat worktree eller en sandbox, så vad
subagenten får röra beror på de behörigheter den körs med, som är ämnet för
[Sätt gränserna i förväg](/sv/blog/set-the-limits-in-advance/). Två praktiker
har egna ord för mekanismen.
[Simon Willison](https://simonwillison.net/2025/Oct/11/sub-agents/) beskriver en
subagent som en separat agentloop med en ny kontext.
[Drew Breunig](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)
kallar det på engelska context quarantine: att isolera kontexter i egna trådar.
Det är praktikers termer, inte leverantörernas.

## När kontexten är full sammanfattar verktyget den

En full kontext avslutar inte sessionen. Claude Code komprimerar automatiskt när
du närmar dig gränsen, VS Code komprimerar automatiskt äldre delar av samtalet
till en sammanfattning och Codex komprimerar också chattar automatiskt, som
[dess guide om bästa praxis](https://learn.chatgpt.com/guides/best-practices)
säger. Det som går förlorat är priset. VS Code säger att komprimeringen skapar
utrymme för ny information men att detaljer från tidigare meddelanden kan
sammanfattas eller utelämnas. Anthropics guide varnar för att alltför aggressiv
komprimering kan förlora subtil men avgörande kontext vars betydelse först
senare blir uppenbar.

{% figure "context-compaction", "wide" %}

Claude Codes dokumentation visar vad som kommer tillbaka efteråt. Det mesta av
startinnehållet läses in igen automatiskt. Verktyget läser dessutom om upp till
fem av de filer som Claude har läst eller redigerat i sessionen, de som ändrades
senast. Skills som har använts i sessionen kommer också tillbaka, inom en
storleksgräns. Resten av samtalet finns i sammanfattningen eller är borta.
Regler som gäller en viss sökväg och nästlade CLAUDE.md-filer, som bara läses in
när Claude rör en matchande fil, försvinner i sammanfattningen på samma sätt. De
läses in igen först när Claude rör en sådan fil. En regel som måste finnas kvar
hör därför hemma i CLAUDE.md i projektets rot. I november 2026 komprimerar
Claude Code med ett abonnemang också en session över ungefär 200 000 tokens som
har stått overksam i ungefär en timme, strax innan dess promptcache går ut, så
efter en paus fortsätter du från en sammanfattning.

## I november 2026 råder leverantörerna dig att rensa mellan uppgifter

Tyngdpunkten har flyttats. Claude Codes sida om bästa praxis säger att de flesta
aktuella modeller har ett fönster på 1 miljon tokens och att komprimeringen sker
av sig själv, så att få slut på utrymme är ovanligt. Rådet att hantera fönstret
aggressivt är borta. Det som återstår är att det fortfarande är värt att rensa
mellan uppgifter, eftersom en fokuserad kontext ger bättre svar och kostar
mindre. Fyra vanor följer av de här sidorna:

- Börja en ny session eller rensa samtalet för varje uppgift. VS Code säger att
  du ska börja en ny session för en uppgift som inte hör ihop med den förra
  eller för ett annat projekt. Codex säger att du ska ha en chatt per
  sammanhängande arbetsenhet.
- Komprimera med fokus. Claude Codes sida föreslår att du kör `/compact` med
  instruktioner före en lång ny uppgift, så att sammanfattningen behåller det du
  väljer i stället för det som den automatiska komprimeringen gissar är viktigt.
- Låt en subagent läsa det som är stort – som avsnittet ovan beskriver – och
  räkna med att det kostar tokens.
- Håll de filer som läses in först korta, eftersom instruktionsfilen följer med
  i varje anrop. Claude Codes sida om bästa praxis och Codex guide säger båda
  det. Artikeln om instruktionsfilen visar hur.

## Gas City planerar överlämningen i stället för att vänta på komprimering

Fabriken bakom den här sajten har ett konkret exempel på samma problem. Agenten
som samordnar fabriken, borgmästaren, körs i sessioner som var och en slutar med
en överlämning. Sessionen skriver ner läget i sitt arbete. Sedan fortsätter en
ny session därifrån.
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
mätte vad det kostar. En agent kan inte göra planeringen själv, eftersom en
session inte kan se sin egen kontextanvändning.
[Gas City](https://github.com/gastownhall/gascity/blob/main/cmd/gc/context_inject.go),
verktyget med öppen källkod som kör fabrikens agenter, har därför en hook som
gör det åt agenten. Hooken är, med kodens egna ord, avsiktligt styrd av trösklar
och inte en nedräkning som alltid är på. Den läser tokenantalet ur sessionens
transkript och är tyst under en första nivå. Över den första nivån ber den
agenten planera mot en ren överlämningspunkt. Över den andra nivån ber den
agenten utlösa den ordinarie överlämningen nu.

{% figure "context-handoff", "wide" %}

Tanken handlar om vem som avgör vad som överlever. Vid komprimering skriver
verktyget sammanfattningen. Vid en planerad överlämning skriver agenten ner det
nästa session behöver medan den ännu kan. Koden nämner vad som annars skulle gå
förlorat: den medvetna avslutningen. Hookens två nivåer är andelar av det
fönster som Gas City utgår från för modellen, så den siffran måste stämma. Den
22 och 23 september 2026 bad Gas City om en överlämning vid 160 000 tokens,
eftersom den utgick från att fönstret var 200 000. Efter att fabriken satt
fönstret till 1 000 000 tokens och överlämningen till 30 % blev det 0,18
överlämningar per bead, en uppgift i fabrikens ärendehanterare, i stället för
1,46. Anropen efter den första utåtriktade handlingen (till exempel ett svar
eller ett utskickat uppdrag) bearbetade däremot i genomsnitt 187 000 tokens i
stället för 142 000. En sen överlämning gör varje anrop längre. En tidig ger
fler överlämningar. Det nedskrivna läget måste också vara kort: den 24 september
trimmades och fick en övre gräns både lägeskortet – som skrivs om vid varje
överlämning – och referensen som läses i ett anrop.

## Matt Pocock förlägger beslutet till fasgränsen

Matt Pocock, som publicerar en uppsättning skills för agenter, kommer fram till
en liknande tanke som enskild praktiker.
[Pococks regler för fasgränser](https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)
säger att det mitt i en fas inte finns något beslut att fatta: man fortsätter
eller delar upp det som återstår på subagenter, eftersom komprimering mitt i en
fas får agenten att tappa tråden.
[Pococks anteckningar om överlämningar](https://github.com/mattpocock/skills/blob/main/docs/productivity/handoff.md)
jämför tre av de fem alternativen vid en fasgräns: `/compact` bevarar din
avsikt, `/clear` bevarar ingenting och `/handoff` bevarar möjligheten att flytta
arbetet vidare. `/handoff` är en av Pococks skills och inget inbyggt kommando i
verktyget. Det är en praktikers regler och inte leverantörsråd. De stämmer med
det som Gas Citys hook säger till agenten: planera mot en ren överlämningspunkt.

Motvikten kommer från en annan praktiker. I juli 2025 skrev
[Armin Ronacher](https://lucumr.pocoo.org/2025/7/30/things-that-didnt-work/) att
även om subagenter borde bevara kontext bättre gav det ofta bättre resultat att
börja nya sessioner och skriva ner tankar i Markdown-filer. Anthropics guide ger
tekniken ett namn, strukturerat antecknande (structured note-taking): agenten
skriver regelbundet anteckningar som sparas utanför kontextfönstret. Den
tekniken är ämnet för en senare artikel om minne.

## Vad som fortfarande går fel och vad du gör först

Användare rapporterar också gränserna ovan som friktion. Två exempel, båda från
användare av Claude Code, är användarrapporter och inte domar över verktyget. I
dess publika ärendehanterare påpekas i
[ett ärende](https://github.com/anthropics/claude-code/issues/27242) – öppnat i
februari 2026 och fortfarande öppet i november – att det inte finns något
fungerande sätt att granska samtalshistorik som har rensats eller komprimerats.
På Hacker News invände
[en kommentator](https://news.ycombinator.com/item?id=49908276) i september 2026
att subagenter måste läsa om allt, vilket stämmer med Anthropics eget påpekande
att en ny subagent först måste samla ihop kontext som huvudsamtalet redan hade.

Börja med den vana som alla tre leverantörerna har gemensamt: en uppgift, en
session. De tre andra vanorna ovan kan följa när den första har blivit en rutin.
Sträcker sig arbetet över många sessioner, skriv ner läget i slutet av varje fas
och börja nästa session med den anteckningen.
