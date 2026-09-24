---
title: En studie av borgmästarens kontext
description: Hur kontexten hos borgmästaren, agenten som samordnar fabriken bakom den här sajten, konfigurerades och användes 20–24 september 2026, vilka problem underlagen från sessionerna visar, vad som ändrades och vad som fortfarande är öppet.
date: 2026-09-24
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: true                      # byggs lokalt, lämnas utanför det publika bygget (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # true när en person har läst den
---

## Sammanfattning

Den här studien undersöker kontexten hos borgmästaren, agenten som samordnar
[fabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här sajten,
utifrån underlagen från dess sessioner 20–24 september 2026. Mellan den 20 och
22 september kom ungefär hälften av en sessions tillväxt före dess första
utåtriktade handling, medan den orienterade sig på nytt efter en överlämning.
Anteckningarna mellan sessionerna, överlämningspunkterna, promptkrokarna och
startinnehållet har ändrats sedan dess. Under de första åtta timmarna med den
senare överlämningspunkten sjönk andelen av alla bearbetade tokens före en
sessions första utåtriktade handling från 45 % till 7 %, medan kontexten per
anrop växte med hälften; räknat per anrop efter den första utåtriktade
handlingen sjönk alla bearbetade tokens med en tiondel. De första nya
anteckningarna gjorde omorienteringen dyrare i utbyte mot en korrekt start;
sedan de kortades har den blivit billigare i de två sessioner som har mätts.

## Konfiguration

Borgmästaren är en agent i Gas City som körs som en följd av Claude
Code-sessioner. Varje steg skickar hela konversationen hittills till modellen:
sessionens kontext. När kontexten passerar en bestämd storlek ber Gas City
sessionen att lämna över. Den skriver ner läget i sitt arbete och en ny
session fortsätter därifrån.

Konversationens oförändrade början läses från en cache: till API:ets
listpriser kostar en cachad token en tiondel av en ny eller mindre, men den
räknas fortfarande in i förbrukningen. En lång kontext kostar ändå i svarstid,
svarskvalitet och förbrukning. Dessutom ligger gammal information kvar i
fönstret.

{% figure "session", "wide" %}

Innan en session gör något innehåller dess kontext följande (startloggar, 24
september):

| Startinnehåll | Tecken | Tokens |
| --- | ---: | ---: |
| Claude Codes systemprompt och verktygsdefinitioner (räknat som skillnad; går inte att ställa in) | – | ~33 000 |
| Listan med färdigheter (skills) | 18 893 | – |
| Kontots kopplingar (MCP-servrar som når en session via Claude-kontot) | ~10 000 | – |
| Gas Citys prompt för borgmästaren med fabrikens regler, plus 8 rader för färdigheter | 6 505 + 798 | ~2 000 |
| Maskinens regelfil med minnesindexet | 3 787 | – |
| Totalt | – | 46 290 |

En färdighet når en session bara som en rad, sitt namn och sin beskrivning;
hela texten laddas först när färdigheten används.

Modellens fönster är 1 000 000 tokens. Två promptkrokar körs före varje
meddelande till borgmästaren och lägger till en klockrad med meddelandena i kö
och en påminnelse om oläst mejl. Varje svar använder den högsta inställningen
för resonemang.

## Data och metod

Källorna, inga av dem offentliga: borgmästarens sessionstranskript med deras
uppgifter om tokenanvändning, dess startloggar, dess direktmeddelanden med
grundaren på Discord och dess minnesfiler. Borgmästarens rapport från den 22
september täcker tiden från den 20 september klockan 12:33 UTC till kvällen
den 22 september; en andra räkning täcker tiden från den 22 september klockan
21:09 UTC till den 23 september klockan 18:54 UTC; en tredje den 24 september
klockan 04:07–12:00 UTC, de första åtta timmarna med överlämningar vid 30 %.
Tokens räknades per anrop till modellen, varje sessions första anrop
inräknat. Tokens per anrop efter den första utåtriktade handlingen delar alla
bearbetade tokens med anropen efter varje sessions första utåtriktade
handling. Ett skript sorterade verktygens utdata i kategorier, med några
procentenheters felmarginal.

Begränsningar: ett enda projekt; de flesta effekter bygger på en enda
mätning, den tredje räkningen på fem sessioner vars arbete skilde sig från den
andras.

## Resultat

### Kontextanvändning

| Mått | Rapporten från den 22 september |
| --- | ---: |
| Sessioner på 55 timmar | 38 |
| Varav under en dag | 21 |
| Överlämningar | 31 |
| Varje sessions start, före dess första verktygsanrop (tokens) | 55 000–66 000 |
| Kontext vid en överlämning (tokens) | 106 000–251 000 |
| Mediansessionens tillväxt (tokens) | 87 000 |
| Varav före dess första utåtriktade handling (ett svar, ett utskickat uppdrag, en skriven bead, en commit) | 49 500 |

| Mått | Räkningen för 22–23 september | Räkningen för 24 september |
| --- | ---: | ---: |
| Timmar | 22 | 8 |
| Sessioner | 51 | 5 |
| Minuter per session | 26 | 95 |
| Anrop till modellen | 2 315 | 626 |
| Anrop per session | 45 | 125 |
| Genomsnittlig kontext per anrop (tokens) | 124 000 | 194 000 |
| Start, median (tokens) | 64 000 | 46 000 |
| Slut, median (tokens) | 154 000 | 306 000 |
| Tillväxt per anrop, median (tokens) | 2 200 | 2 500 |
| Lästa från cachen (tokens) | 281 miljoner | 120 miljoner |
| Av alla kontexttokens | ~98 % | ~99 % |
| Andel av bearbetade tokens före den första utåtriktade handlingen | 45 % | 7 % |
| Tokens per anrop efter den första utåtriktade handlingen | 257 000 | 231 000 |

### Sessionernas aktivitet

Andelar av borgmästarens verktygsutdata efter volym (rapporten från den 22
september), inte av hela kontexten. Andra kategorier står för resten; ett
streck betyder att kategorin inte finns med för den perioden.

| Kategori | Under omdesignbygget av sajten (9 sessioner) | Efter bygget (29 sessioner) |
| --- | ---: | ---: |
| Läsning av beads (69 anrop) | 19 % | – |
| Felsökning av själva fabriken | ~10 % | – |
| Minne | 9 % | 13 % |
| Skärmbilder | 9 % | 6 % |
| Mejl | 8 % | 9 % |
| Körningens krav, plan och plangranskning | 7 % | – |
| Omläsning av egna utkast och skript | 7 % | – |
| Discord | 4 % | 6 % |
| Artiklar och planer | – | 18 % |
| Sajtens källkod | – | 9 % |
| Läsningar i git | – | 5 % |
| Byggen, förhandsvisningar och kontroller av den publicerade sajten | – | 4 % |

| Direktmeddelanden på Discord | Meddelanden | Tecken |
| --- | ---: | ---: |
| Från borgmästaren till grundaren | 116 | 135 000 |
| Från grundaren | 84 | 16 000 |

Den 22 september var borgmästarens minne en logg som bara fylldes på: 769
rader och 138 kB.

## Problem

1. **Omorientering efter varje överlämning.** I mediansessionen gick 49 500
   tokens åt före den första utåtriktade handlingen.
2. **Startinnehåll som ingen session använde.** Fram till den 24 september
   innehöll listan med färdigheter 91 färdigheter på 32 572 tecken; 12 128 av
   tecknen var de 40 raderna från ett tillägg för en hostingplattform som
   fabriken inte använder. Inte heller kontots kopplingar användes av någon
   session.
3. **Långsamma svar på enkla frågor.** En separat Claude Code-session som
   grundaren körde fann den 23 september att maskinen inte var flaskhalsen (en
   systembelastning på 2,2; verktyget för beads svarade på 0,07 sekunder).
   Orsakerna: den högsta inställningen för resonemang på varje svar, att
   borgmästaren hämtade färskt läge innan den svarade även på det den redan
   visste, två promptkrokar med 15 sekunders tidsgräns före varje meddelande
   samt kontextens storlek.
4. **Gamla fakta som tas för aktuella.** En session litar på sin kontext och
   sina anteckningar, hur gamla de än är, om den inte kontrollerar dem. Den 22
   september bad grundaren om att fabrikens uppgiftsdatabas skulle synkas till
   ett privat kodförråd; fram till dess hade den synkats till det publika
   kodförråd som den här sajten byggs från. Den 32:a borgmästarsessionen
   skapade det privata kodförrådet, pekade synkinställningen dit och
   rapporterade att synken var flyttad. Databasens egen fjärradress pekade
   fortfarande på det publika kodförrådet, som ett schemalagt jobb pushar till
   var 15:e minut; klockan 16:58 UTC misslyckades jobbets push av hela
   databasen bara för att anslutningen var stängd. Den 34:e sessionen
   kontrollerade läget i stället för att lita på sina anteckningar och pekade
   om fjärradressen klockan 17:13 UTC.
5. **En överlämningspunkt satt av en felaktig fönsterstorlek.** Gas City kände
   inte till modellen, uppfattade fram till den 23 september fönstret som
   200 000 tokens och bad om överlämningar vid ungefär 160 000, 16 % av det
   verkliga fönstret.
6. **En minneslogg för stor för en läsning.** Ingen session kunde läsa loggen
   i sin helhet.

{% figure "sync" %}

## Ändringar

- **22–24 september: lägeskort och referens.** Ett lägeskort med fast form och
  en referens med beständiga fakta och regler ersatte loggen. Kortet skrivs
  över vid varje överlämning och referensen läses i ett anrop. Kortet anger
  id:t för det senast hanterade inkommande meddelandet, eftersom meddelanden
  hade gått förlorade vid överlämningar; vad som pågår; vad som har lovats men
  inte levererats; öppna frågor; och för varje "klart" det kommando som
  bevisar det. Mätt en gång, som medianer före den första utåtriktade
  handlingen: 54 700 tokens och 32 100 tecken lästa ur anteckningarna i 56
  sessioner med kortet, mot 49 500 och 2 200 i 33 sessioner före det. De
  tidigare sessionerna hade hoppat över det mesta av loggen och det var så
  gamla fakta överlevde (problem 4): en korrekt start till ett högre pris, inte
  den besparing som var avsikten. Den 24 september kortades båda med två
  femtedelar och fick ett tak för sin storlek. De två första sessionerna därefter
  läste 26 000 och 28 000 tecken ur anteckningarna före sin första utåtriktade
  handling och nådde den efter 34 000 och 38 000 tokens; de tre sessionerna
  före dem samma dag läste 42 000–47 000 tecken och behövde 63 000–105 000.
- **23 september: snabba frågor och krokar.** Ett meddelande från grundaren
  som börjar med "?" besvaras direkt utifrån det borgmästaren redan vet, utan
  något annat verktygsanrop än själva svaret. Krokarnas tidsgräns gick från 15
  sekunder till 5. De tre snabba frågorna sedan dess besvarades på 24–58
  sekunder; krokarna mättes inte för sig.
- **23–24 september: fönster och överlämningspunkter.** Fönstret sattes till
  1 000 000 tokens den 23 september, med råd om överlämning vid 20 % och
  uppmaning vid 25 %; sedan den 24 september vid 25 % och 30 % (250 000 och
  300 000 tokens). Den tredje räkningen täcker de första åtta timmarna vid
  30 %: sessionerna gjorde nästan tre gånger så många anrop och andelen tokens
  som bearbetades före den första utåtriktade handlingen sjönk från 45 % till
  7 %, men den genomsnittliga kontexten per anrop steg med hälften, vilket åt
  upp det mesta av vinsten: per anrop efter den första utåtriktade handlingen
  en tiondel färre tokens. De tre sessionerna innan anteckningarna kortades
  sparade ingenting (257 000); de två efter sparade en femtedel (209 000).
- **24 september: fyra tillägg avstängda** för fabrikens sessioner:
  hostingplattformens, ett tillägg för frontenddesign med en färdighet och två
  tillägg med språkservrar utan rader för färdigheter. Mätt en gång: nästa
  borgmästarsession startade på 46 290 tokens, mot 51 020 för den före; bara
  listorna med färdigheter och agenter hade ändrats, ungefär 12 000 tecken
  kortare, så hostingtillägget kostade ungefär 4 700 tokens per start: en
  tiondel, inte den femtedel som hade uppskattats utifrån tilläggets filer på
  disken. Alla fem sessionerna i den tredje räkningen startade mellan 42 000
  och 55 000 tokens; de tre starterna före ändringen hade skilt sig med
  14 000.
- **24 september: kontots kopplingar avstängda** för fabrikens sessioner: tio,
  ingen av dem använd. Efter att tillägget stängts av hade hostingplattformens
  verktyg ändå nått varje session, genom kontots egen koppling till samma
  plattform. Mätt en gång, på två sessioner hos genomförandeagenten som tog
  samma första steg: kopplingarna kostade ungefär 9 700 tokens per session,
  det mesta strax efter det första anropet, ungefär 8 % av den genomsnittliga
  kontexten per anrop.

{% figure "handoffs" %}

## Öppna frågor och idéer

- Den tredje räkningen över en hel dag med normalt arbete, med fler sessioner.
- En lägre inställning för resonemang vid snabba svar; inte beslutat.
- Överlämningspunkten: senare överlämningar ger färre omorienteringar men en
  längre kontext i varje steg och äldre fakta i fönstret. Under de första åtta
  timmarna sparade den senare punkten en tiondel, allt efter att anteckningarna
  kortades; en hel dag avgör.
- En projektledarroll, att besluta om utifrån uppmätta data; ett andra
  projekt, inte tills vidare.
