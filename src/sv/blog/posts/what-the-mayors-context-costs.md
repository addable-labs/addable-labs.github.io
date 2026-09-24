---
title: Vad borgmästarens kontext kostar och vad vi ändrade
description: Ungefär hälften av en typisk session för borgmästaren, agenten vi pratar med, gick åt till att orientera sig på nytt. Vad vi mätte, var dess egen förklaring av kostnaden blev fel, vad vi ändrade och vad som ännu inte är mätt.
date: 2026-09-24
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: true                      # byggs lokalt, lämnas utanför det publika bygget (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # true när en person har läst den
---

Borgmästaren är agenten i centrum av [vår
fabrik](/sv/blog/why-we-run-an-agent-run-factory/): den vi pratar med via
Discord, som lämnar det vi ber om vidare till de andra agenterna och följer
upp det. Den arbetar i sessioner. När en sessions kontext – allt modellen får
vid varje steg – växer förbi en bestämd storlek ber Gas City den att lämna
över: den skriver ner hur läget är och en ny session tar vid därifrån. De
flesta siffrorna här kommer från underlag som inte är offentliga –
borgmästarens sessionsloggar, dess rapporter och dess meddelanden till oss –
och vi säger vilka.

## Varför vi tittade närmare

Enkla frågor på Discord tog för lång tid att besvara; en fråga om läget kunde
ta minuter. Den 23 september, när vi ville att sessionerna skulle köra mycket
längre innan de lämnade över, avrådde borgmästaren från det av ett skäl vi
inte kunde följa. Och dess egen rapport från den 22 september, om huruvida vi
borde lägga till en projektledarroll, visade att ungefär hälften av varje
session gick åt till att orientera sig på nytt.

## Rätt fakta, fel enhet

Borgmästarens skäl, i dess Discordmeddelanden till oss samma kväll, var att
"varje steg läser om hela konversationen, så en senare överlämning gör varje
steg dyrare" (vår översättning). Den lade till en tabell där en överlämning
vid 500 000 tokens kostade 1,45 gånger så många tokens som en vid 250 000 och
en vid 750 000 dubbelt så många. Den skrev också att cachning "gör den
upprepade delen billigare, inte gratis" (vår översättning).

Det underliggande faktumet stämmer: varje steg skickar hela konversationen
hittills till modellen igen. Men dess oförändrade början kommer från en cache
så länge cachen håller den. Den bearbetas inte igen och till API:ets
listpriser kostar en token som läses från cachen en tiondel av en ny eller
mindre, beroende på modell. Så "läser om" är fel bild och ett antal tokens är
fel enhet för kostnad: tabellen räknade en token från cachen som en ny.
Borgmästaren hade rätt fakta och använde ändå fel enhet.

En lång kontext är ändå dyr, av andra skäl. Svaren kommer långsammare och kan
bli sämre när kontexten växer. En cachad token är billigare, inte gratis; hur
vårt abonnemangs användningsgräns väger den är inte publicerat och vi vet
inte. Och gammal information ligger kvar i fönstret efter att den har slutat
vara sann.

## Vad som fyller en session

Rapporten täcker borgmästarens sessioner från den 20 september klockan 12:33
UTC till kvällen den 22 september: 38 sessioner på 55 timmar, 21 av dem under
en dag, med 31 överlämningar och alla för ett enda projekt, den här sajten.
Den byggdes på sessionernas transkript med deras uppgifter om tokenanvändning,
Discordhistoriken och borgmästarens minnesfiler, inget av det offentligt.

Varje session började på 55 000 till 66 000 tokens före sitt första
verktygsanrop och överlämningarna kom vid 106 000 till 251 000.
Mediansessionen växte med 87 000 tokens och 49 000 av dem gick åt före dess
första utåtriktade handling: ett svar, ett utskickat uppdrag, en skriven bead,
en commit. Ungefär hälften.

Ett skript sorterade det som borgmästarens verktygsanrop returnerade i
kategorier. Andelarna gäller den utdatan efter volym, med några
procentenheters felmarginal, inte hela fönstret. Under de nio sessionerna i
sajtens omdesignbygge tog läsningen av beads, fabrikens arbetsenheter, 19
procent i 69 anrop och felsökningen av själva fabriken ungefär 10; under de 29
sessionerna efter bygget tog artiklar och planer 18 och minnet 13. Discord tog
4 procent, sedan 6.

I samma Discordhistorik skickade borgmästaren 116 meddelanden till oss,
sammanlagt 135 000 tecken; vi skickade 84 med 16 000 tecken. Vår sida av
samtalet är ett avrundningsfel; agentens eget arbete fyller fönstret.
Borgmästarens minne hade blivit en logg som bara fylldes på: 769 rader och 138
kB den 22 september, mer än någon session kunde läsa i sin helhet.

## Vad en session börjar med

Enligt borgmästarens startloggar, som inte heller är offentliga, hade den
första sessionen efter ändringen nedan 46 290 tokens vid sitt första anrop
till modellen. Ungefär 33 000 av dem, räknat som skillnad, är kodverktygets
egen systemprompt och verktygsdefinitioner, som vi inte kommer åt. Resten,
ungefär 13 000, kan vi forma själva: listan med färdigheter (skills), 18 893
tecken; kontots kopplingar till andra tjänster, MCP-servrar som når varje
session via kontot, inte via Gas City, ungefär 10 000 tecken; Gas Citys prompt
för borgmästaren, 6 505; och maskinens regelfil med minnesindexet, 3 787.

## Vad vi ändrade

När vi mätte fördröjningarna den 23 september var maskinen inte problemet: en
systembelastning på 2,2 och verktyget för beads svarade på 0,07 sekunder.
Orsakerna var den högsta inställningen för resonemang på varje svar, att
borgmästaren hämtade färskt läge innan den svarade även på det den redan
visste, två krokar med en tidsgräns på 15 sekunder före varje meddelande och
kontextens storlek.

Borgmästaren har nu ett lägeskort med fast form som skrivs över vid varje
överlämning, samt en separat referensfil som den läser i ett anrop. Det anger
id:t för det senaste meddelandet från oss som den har hanterat, eftersom
meddelanden hade gått förlorade vid överlämningar; vad som pågår; vad som har
lovats men inte levererats; öppna frågor, var och en med id:t för meddelandet
den ställdes i; processer som körs, med sina id:n; och för varje "klart" det
kommando som bevisar det.

Ett meddelande från oss som börjar med "?" är nu en snabb fråga: borgmästaren
svarar direkt utifrån det den vet och säger till om den är osäker, utan något
annat verktygsanrop än själva svaret. Krokarnas tidsgräns gick från 15
sekunder till 5.

Den 24 september stängde vi av fyra tillägg (plugins) som fabrikens sessioner
inte använder: ett för en hostingplattform vi inte använder, ett för
frontenddesign med en enda färdighet och två tillägg med språkservrar för
språk som sajten inte använder, vilka inte lägger något till listan med
färdigheter. Utifrån hostingtilläggets filer på disken hade vi väntat oss att
det skulle stå för ungefär en femtedel av en sessions start. Men en färdighet
når en session bara som en rad, sitt namn och sin beskrivning; hela texten
laddas först när färdigheten används. Hostingtilläggets 40 rader var 12 128
tecken. Nästa borgmästarsession startade på 46 290 tokens och den före på 51
020. Mellan dem var det bara listorna med färdigheter och agenter som ändrade
storlek, ungefär 12 000 tecken kortare; allt annat var lika stort.
Hostingtillägget kostade alltså ungefär 4 700 tokens per start: en tiondel,
inte en femtedel. Det är en mätning, inte ett bevis: de tre sessionerna före
ändringen startade på 51 020, 59 091 och 65 150 tokens, redan 14 000 ifrån
varandra.

Till sist överlämningspunkten. Gas City hade uppfattat modellens fönster som
200 000 tokens och bad om en överlämning vid ungefär 160 000. Den 23 september
satte borgmästaren det verkliga fönstret, en miljon tokens, medan vi lade
rådet att lämna över vid 200 000 och uppmaningen vid 250 000; den 24:e
flyttade vi dem till 250 000 och 300 000.

## Överlämningen är inte fienden

Fienden är omorienteringen; en överlämning är där dess pris betalas. Om det
vore gratis att lämna över skulle vi vilja ha täta överlämningar: varje ny
session är snabbare, billigare per steg och arbetar utifrån hur det är nu i
stället för utifrån påståenden som var sanna när de lästes.

Det tydligaste exemplet finns i borgmästarens körlogg för den 22 september,
som inte är offentlig. Vi bad om att fabrikens uppgiftsdatabas, registret med
beads, skulle flyttas till ett privat kodförråd; fram till dess hade den
synkats till det publika kodförråd som den här sajten byggs från. Den 32:a
borgmästarsessionen skapade det privata kodförrådet, pekade synkinställningen
dit och berättade för oss att synken hade flyttats. Det hade den inte:
databasens egen fjärradress pekade fortfarande på det publika kodförrådet och
ett schemalagt jobb pushar till den adressen var 15:e minut. Klockan 16:58 UTC
försökte jobbet pusha hela uppgiftsdatabasen dit och misslyckades bara för att
anslutningen var stängd. Två sessioner senare kontrollerade den 34:e igen i
stället för att lita på anteckningen den hade ärvt, hittade den gamla
fjärradressen och pekade om den klockan 17:13 UTC.

Påståendet var tvärsäkert och fel; sessionen som hittade misstaget hade bara
anteckningen och tittade efter. En lång kontext gör en agent tvärsäker och fel
om gamla fakta.

## Vad vi ännu inte vet

Vi hoppas på färre tokens som går åt till att orientera sig på nytt, snabbare
svar på enkla frågor och framför allt att besluten om en projektledarroll och
ett andra projekt kan fattas på uppmätta data i stället för gissningar. Nästa
mätning är borgmästarens: hur många tokens som nu går åt före en sessions
första utåtriktade handling, jämfört med 49 000. Den är inte gjord än. Det här
är inte löst: det är en analys, en uppsättning åtgärder och en mätning som
återstår.
