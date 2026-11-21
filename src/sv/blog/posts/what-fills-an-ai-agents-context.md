---
title: Vad som fyller en AI-agents kontext
description: "Vad en AI-agent för kodning skickar till modellen i varje steg, hur en session fyller det utrymmet, vad en subagent håller utanför det och vad komprimeringen förlorar, så som leverantörerna beskrev det i november 2026, med Gas Citys planerade överlämning som exempel."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "En hög stapel, kontextfönstret, med en streckad linje som överkant fylls nerifrån i lager. Längst ner ligger ett tunt grått startlager av fyra band. Ovanpå det ligger ett grönt, ett orange och ett vitt lager. Ett blekt grönt lager är på väg in. Bredvid står en liten tom stapel, en subagents egen kontext."
date: 2026-11-21
category: ai-journey             # app-development | ai-journey
translationKey: what-fills-an-ai-agents-context
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

En AI-agent för kodning minns inte ditt samtal från ett steg till nästa. Varje
gång den frågar språkmodellen vad den ska göra skickar verktyget med allt som
modellen ska se: instruktionerna, filerna den har läst, utdata från kommandona
den har kört och samtalet hittills. Det paketet är kontexten.

[VS Codes dokumentation](https://code.visualstudio.com/docs/agents/concepts/context)
definierar den som den information som agenten och dess språkmodell har tillgång
till medan de arbetar med din begäran. Samma sida är tydlig med vad den inte är:
att lägga till kontext är inte detsamma som att träna en modell.

Den här artikeln följer en session från första prompten till det ögonblick då
verktyget måste komprimera den: vad som finns i kontexten innan du skriver
något, vad varje steg lägger till, vad en subagent håller utanför och vad som
går förlorat när kontexten komprimeras. Beskrivningarna följer dokumentationen
för Claude Code, Codex och GitHub Copilot i VS Code så som den såg ut i november
2026 och fabriken bakom den här sajten är exemplet. Vad en agent behåller från
en session till nästa är ett annat ämne – minne – och en senare artikel tar upp
det.

## Kontexten rymmer mer än ditt samtal

Enligt
[Claude Codes dokumentation](https://code.claude.com/docs/en/context-window)
rymmer kontextfönstret allt som Claude vet om din session: dina instruktioner,
filerna den läser, dess egna svar och innehåll som aldrig syns i din terminal.
Allt räknas mot samma gräns. VS Codes dokumentation säger att användarens
meddelande, samtalshistoriken, instruktioner, refererade filer och verktygens
utdata alla tar plats i kontextfönstret och den definierar fönstret som den
största mängd information som en språkmodell kan behandla i en begäran.

## En del av kontexten finns där innan du skriver något

Claude Codes dokumentation listar vad som läses in före den första prompten:
CLAUDE.md, automatiskt minne, namnen på MCP-verktyg och beskrivningar av skills.
Instruktionsfilen, skills och MCP-servrar har var sin del i den här serien:
[instruktionsfilen](/sv/blog/the-instruction-file/),
[skills](/sv/blog/skills-for-repeatable-work/) och
[MCP](/sv/blog/mcp-reaching-your-systems/). Verktygets egna instruktioner kommer
före allt det, som [den första delen](/sv/blog/what-makes-a-chat-an-ai-agent/)
beskriver.

{% figure "context-before-you-type" %}

Det som läses in först följer med i varje senare begäran. I figuren är det ett
tunt lager under det tomma fönstret: lagret är aldrig tomt och det är den del av
kontexten som du styr genom din egen konfiguration. En längre instruktionsfil
eller fler anslutna servrar gör det tjockare i varje begäran under sessionen.

## Varje steg lägger till i kontexten och varje begäran skickar allt

Medan Claude arbetar lägger enligt samma sida varje läst fil till i kontexten.
Sidan säger också att tokenantalen i dess exempelsession är illustrativa och
varierar med storleken på din CLAUDE.md, dina MCP-servrar och dina filers längd,
så figurerna här visar bara relativa storlekar. Filer, kommandons utdata och
modellens egna svar läggs på i lager och en gammal uppgifts lager finns kvar när
en ny börjar.

{% figure "context-as-it-fills", "wide" %}

Det som blir kvar skickas igen.
[Claude Codes sida om bästa praxis](https://code.claude.com/docs/en/best-practices)
uttrycker det så här: "Varje begäran skickar hela samtalet, så en session som
har samlat tre orelaterade uppgifter läser om alla tre i varje varv av den
fjärde." (vår översättning) En gammal uppgift kostar därför tokens i varje
senare steg, oavsett om den spelar roll för den nya.

Den andra kostnaden är modellens uppmärksamhet. Anthropics ingenjörer kallar
effekten kontextröta (context rot): när antalet tokens i kontextfönstret ökar
minskar modellens förmåga att på ett riktigt sätt återge information ur
kontexten. [Chroma](https://www.trychroma.com/research/context-rot) testade 18
modeller i juli 2025 och rapporterade att deras prestanda blir allt mindre
tillförlitlig när indatan blir längre. Modellerna är från 2025, så effektens
storlek i dag är en fråga för nyare tester, men riktningen är den som
leverantörerna beskriver. Anthropics guide till kontextteknik drar slutsatsen
att god kontextteknik betyder att hitta den minsta möjliga uppsättningen tokens
med hög signal som maximerar sannolikheten för ett önskat resultat.

Du kan se dina egna siffror. I Claude Code ger /context en levande uppdelning
per kategori med förslag på optimeringar, inklusive vilka CLAUDE.md- och
automatiska minnesfiler som lästes in. Att titta en gång i början av en session
och en gång efter en lång uppgift visar det som figurerna bara skissar.

## En subagent arbetar i en egen kontext

En subagent är en andra agent som huvudagenten lämnar en uppgift till och den
börjar med en egen kontext.
[Claude Codes dokumentation](https://code.claude.com/docs/en/sub-agents)
rekommenderar en när en sidouppgift skulle fylla huvudsamtalet med sökresultat,
loggar eller filinnehåll som du inte kommer att titta på igen: subagenten gör
det arbetet i sin egen kontext och lämnar bara tillbaka sammanfattningen. Sidan
om kontextfönstret lägger till att bara sammanfattningen och en liten
metadatasvans kommer tillbaka.

{% figure "context-subagent", "wide" %}

[Codex dokumentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
beskriver problemet som en subagent löser från andra hållet. Om du fyller
huvudchatten med utforskningsanteckningar, testloggar, stackspår och
kommandoutdata kan sessionen enligt den bli mindre tillförlitlig med tiden. Den
namnger två effekter: kontextförorening (context pollution), där användbar
information begravs under brusiga mellanresultat och kontextröta, där prestandan
sjunker när chatten fylls med mindre relevanta detaljer.

En subagent är inte gratis. Enligt Claude Codes sida om bästa praxis är
kostnaden mest tokens, eftersom varje subagent skickar egna begäranden och de
räknas mot samma användning som huvudsamtalet. Ibland kostar den också tid,
eftersom en ny subagent först måste samla ihop kontext som huvudsamtalet redan
hade. Anthropic mätte samma avvägning i sitt eget forskningssystem med flera
agenter i juni 2025: i dess data använde agenter ungefär fyra gånger så många
tokens som chattar och system med flera agenter ungefär femton gånger så många.
Det är siffror för det systemet, inte en regel för kodande agenter.

En separat kontext är inte en separat plats att arbeta på. VS Codes
dokumentation sammanfattar det i en mening: kontextisolering är inte
kodisolering. Den skapar inte i sig ett separat arbetsträd eller en sandlåda, så
vad subagenten får röra beror på de behörigheter den körs med, vilket
[del 7 av serien](/sv/blog/set-the-limits-in-advance/) går igenom. Två praktiker
har namn på mekanismen.
[Simon Willison](https://simonwillison.net/2025/Oct/11/sub-agents/) beskriver en
subagent som en separat agentloop med en ny tokenkontext och
[Drew Breunig](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html)
kallar det att isolera kontexter i egna trådar för kontextkarantän (context
quarantine). Det är praktikers termer, inte leverantörernas.

## När kontexten är full sammanfattar verktyget den

En full kontext avslutar inte sessionen. Claude Code komprimerar automatiskt när
du närmar dig gränsen, VS Code komprimerar automatiskt äldre delar av samtalet
till en sammanfattning och Codex komprimerar också chattar automatiskt. Det som
går förlorat är priset. VS Code säger att komprimeringen skapar utrymme för ny
information men att detaljer från tidigare meddelanden kan sammanfattas eller
utelämnas och Anthropics guide varnar för att alltför aggressiv komprimering kan
förlora subtil men avgörande kontext vars betydelse först senare blir uppenbar.

{% figure "context-compaction", "wide" %}

Claude Codes dokumentation visar vad som kommer tillbaka efteråt. Det mesta av
start-innehållet läses in igen automatiskt och verktyget läser om upp till fem
av de filer som Claude har läst eller redigerat i sessionen, de som ändrades
senast. Allt annat finns i sammanfattningen eller är borta. Regler som gäller en
viss sökväg och nästlade CLAUDE.md-filer, som bara läses in när Claude rör en
matchande fil, sammanfattas bort tillsammans med resten av samtalet, så en regel
som måste finnas kvar hör hemma i CLAUDE.md i projektets rot. I november 2026
komprimerar Claude Code också en lång session som står overksam, strax innan
cachen går ut, så efter en paus fortsätter du från en sammanfattning.

## I november 2026 råder leverantörerna dig att rensa mellan uppgifter

Tyngdpunkten har flyttats. Claude Codes sida om bästa praxis säger att de flesta
aktuella modeller har ett fönster på 1 miljon tokens och att komprimeringen sker
av sig själv, så att få slut på utrymme är ovanligt. Rådet att hantera fönstret
aggressivt är borta. Det som återstår är att det fortfarande är värt att rensa
mellan uppgifter, eftersom en fokuserad kontext ger bättre svar och kostar
mindre. De fyra vanor som leverantörerna delar är dessa:

- Börja en ny session eller rensa samtalet för varje uppgift. VS Code säger att
  du ska börja en ny session för en orelaterad uppgift eller ett annat projekt
  och Codex säger att du ska ha en chatt per sammanhängande arbetsenhet.
- Komprimera med fokus. Claude Codes sida föreslår att du kör /compact med
  instruktioner före en lång ny uppgift, så att sammanfattningen behåller det du
  väljer i stället för det som den automatiska komprimeringen gissar är viktigt.
- Skicka stora läsningar till en subagent – som avsnittet ovan beskriver – och
  räkna med att det kostar tokens.
- Håll start-filerna korta, eftersom instruktionsfilen följer med i varje
  begäran. Del 2 av serien visar hur.

## Gas City planerar överlämningen i stället för att vänta på komprimering

Fabriken bakom den här sajten har ett genomarbetat exempel på samma problem.
Dess samordnande agent, borgmästaren, körs i sessioner som var och en slutar med
en överlämning: sessionen skriver ner läget i sitt arbete och en ny session
fortsätter därifrån.
[En studie av borgmästarens kontext](https://addablelabs.se/sv/blog/what-the-mayors-context-costs/)
mätte vad det kostar. En agent kan inte göra planeringen själv, eftersom en
session inte kan se sin egen kontextanvändning.
[Gas City](https://github.com/gastownhall/gascity/blob/main/cmd/gc/context_inject.go),
det öppna verktyg som kör fabrikens agenter, har därför en hook som gör det åt
agenten. Hooken är med kodens egna ord tröskelstyrd av design och inte en
nedräkning som alltid är på: den läser tokenantalet ur sessionens transkript, är
tyst under en första nivå, ber sedan agenten att planera mot en ren
överlämningspunkt och, över en andra nivå, att utlösa den kanoniska
överlämningen nu.

{% figure "context-handoff", "wide" %}

Tanken handlar om vem som avgör vad som överlever. Vid komprimering skriver
verktyget sammanfattningen. Vid en planerad överlämning skriver agenten ner det
nästa session behöver medan den ännu kan och koden nämner vad som annars skulle
gå förlorat: den medvetna avslutningen. De tre nivåerna måste följa modellen.
Den 22 och 23 september 2026 begärde Gas City en överlämning vid 160 000 tokens,
eftersom den utgick från att fönstret var 200 000. Efter att fabriken satt
fönstret till 1 000 000 tokens och överlämningen till 30 % blev det 0,18
överlämningar per bead, fabrikens arbetsenhet, i stället för 1,46, men varje
anrop efter den första utåtriktade handlingen bar 187 000 tokens i stället för
142 000. En sen överlämning gör varje anrop längre och en tidig ger fler
överlämningar. Det nedskrivna läget måste också vara kort: den 24 september
ersattes anteckningarna av ett lägeskort – som skrivs om vid varje överlämning –
och en referens som läses i ett anrop, båda trimmade och begränsade.

## Matt Pocock lägger beslutet vid fasgränsen

Matt Pocock, som publicerar en uppsättning skills för agenter, kommer fram till
en liknande tanke från personens sida. I
[hans regler för fasgränser](https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/PHASE-BOUNDARIES.md)
skriver han att det mitt i en fas inte finns något beslut att fatta: fortsätt,
eller dela upp det arbete som återstår på subagenter, eftersom komprimering mitt
i en fas får agenten att tappa tråden. Vid gränsen ställer han alternativen
bredvid varandra: /compact bevarar din avsikt, /clear bevarar ingenting och
/handoff bevarar arbetets förmåga att flytta. Det är en praktikers regler, inte
leverantörsråd och de stämmer med fabrikens rådgivning: rensa eller lämna över
där inget är halvfärdigt.

Motvikten kommer från
[Armin Ronacher](https://lucumr.pocoo.org/2025/7/30/things-that-didnt-work/):
även om subagenter borde bevara kontext bättre får han ofta bättre resultat
genom att börja nya sessioner och skriva ner tankar i Markdown-filer. Anthropics
guide ger tekniken ett namn, strukturerad anteckning (structured note-taking),
där agenten regelbundet skriver anteckningar som sparas utanför kontextfönstret
och det är ämnet för artikeln om minne.

## Vad som fortfarande går fel och vad du gör först

Användare av alla tre verktygen rapporterar samma sorts friktion och det är
användarrapporter, inte domar över något enskilt verktyg. I Claude Codes öppna
ärendehantering klagar
[ett ärende](https://github.com/anthropics/claude-code/issues/27242) på att det
inte finns något fungerande sätt att granska samtalshistorik som har rensats
eller komprimerats. På Hacker News invänder
[en kommentator](https://news.ycombinator.com/item?id=49908276) att subagenter
inte kan använda cachen och måste läsa om allt, vilket stämmer med Anthropics
egen anmärkning att en subagent kan bli långsammare.

Börja med den vana som alla källor delar: en uppgift, en session. Rensa samtalet
mellan uppgifter, håll instruktionsfilen kort, skicka stora sökningar och långa
loggar till en subagent och komprimera med fokus före en lång ny uppgift.
Sträcker sig arbetet över många sessioner, skriv ner läget i slutet av varje fas
och börja nästa session från den anteckningen.
