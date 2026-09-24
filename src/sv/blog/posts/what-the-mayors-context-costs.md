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
startinnehållet har ändrats sedan dess. Två av ändringarna har mätts, en gång
vardera; om omorienteringen nu kostar mindre är öppet.

## Konfiguration

Borgmästaren är en agent i Gas City som körs som en följd av Claude
Code-sessioner. Varje steg skickar hela konversationen hittills till modellen:
sessionens kontext. När kontexten passerar en bestämd storlek ber Gas City
sessionen att lämna över. Den skriver ner läget i sitt arbete och en ny
session fortsätter därifrån.

Konversationens oförändrade början läses från en cache och bearbetas inte
igen: till API:ets listpriser kostar en cachad token en tiondel av en ny eller
mindre, beroende på modell, men den räknas fortfarande in i förbrukningen. En
lång kontext kostar ändå i svarstid, svarskvalitet och förbrukning. Dessutom
ligger gammal information kvar i fönstret.

Innan en session gör något innehåller dess kontext följande (startloggar, 24
september):

- Claude Codes systemprompt och verktygsdefinitioner: ungefär 33 000 tokens,
  räknat som skillnad; går inte att ställa in
- Listan med färdigheter (skills): 18 893 tecken
- Kontots kopplingar (MCP-servrar som når en session via Claude-kontot, inte
  via Gas City): ungefär 10 000 tecken
- Gas Citys prompt för borgmästaren med fabrikens regler: 6 505 tecken plus 8
  rader för färdigheter (798 tecken), ungefär 2 000 tokens
- Maskinens regelfil med minnesindexet: 3 787 tecken

Totalt 46 290 tokens. En färdighet når en session bara som en rad, sitt namn
och sin beskrivning; hela texten laddas först när färdigheten används.

Modellens fönster är 1 000 000 tokens. Två promptkrokar körs före varje
meddelande till borgmästaren och lägger till en klockrad med meddelandena i kö
och en påminnelse om oläst mejl. Varje svar använder den högsta inställningen
för resonemang.

## Data och metod

Källorna, inga av dem offentliga: borgmästarens sessionstranskript med deras
uppgifter om tokenanvändning, dess startloggar, dess direktmeddelanden med
grundaren på Discord och dess minnesfiler. Borgmästarens rapport från den 22
september täcker dess 38 sessioner från den 20 september klockan 12:33 UTC
till kvällen den 22 september; en andra räkning täcker tiden från den 22
september klockan 21:09 UTC till den 23 september klockan 18:54 UTC. Tokens
räknades per anrop till modellen, varje sessions första anrop inräknat. Ett
skript sorterade verktygens utdata i kategorier, med några procentenheters
felmarginal.

Begränsningar: ett enda projekt; effekterna av tilläggen och kopplingarna
bygger på en mätning vardera; ingen annan ändring är mätt än.

## Resultat

### Kontextanvändning

Rapporten från den 22 september:

- 38 sessioner på 55 timmar, 21 av dem under en dag, ett projekt, 31
  överlämningar
- Varje session började på 55 000 till 66 000 tokens före sitt första
  verktygsanrop
- Överlämningarna kom vid 106 000 till 251 000 tokens
- Mediansessionen växte med 87 000 tokens, varav 49 000 före dess första
  utåtriktade handling (ett svar, ett utskickat uppdrag, en skriven bead, en
  commit): ungefär hälften

Räkningen för 22–23 september:

- 51 sessioner och 2 315 anrop till modellen, 45 per session
- En genomsnittlig kontext på 124 000 tokens per anrop
- Medianer: start på 64 000 tokens, slut på 154 000, tillväxt på 2 200 tokens
  per anrop
- 281 miljoner tokens lästa från cachen, ungefär 98 % av alla kontexttokens

### Sessionernas aktivitet

Andelar av borgmästarens verktygsutdata efter volym (rapporten från den 22
september), inte av hela kontexten; andra kategorier står för resten.

Under omdesignbygget av sajten (9 sessioner):

- Läsning av beads: 19 % (69 anrop)
- Felsökning av själva fabriken: ungefär 10 %
- Minne: 9 %
- Skärmbilder: 9 %
- Mejl: 8 %
- Körningens krav, plan och plangranskning: 7 %
- Omläsning av egna utkast och skript: 7 %
- Discord: 4 %

Efter bygget (29 sessioner):

- Artiklar och planer: 18 %
- Minne: 13 %
- Mejl: 9 %
- Sajtens källkod: 9 %
- Discord: 6 %
- Skärmbilder: 6 %
- Läsningar i git: 5 %
- Byggen, förhandsvisningar och kontroller av den publicerade sajten: 4 %

Direktmeddelanden på Discord: 116 från borgmästaren till grundaren (135 000
tecken), 84 från grundaren (16 000). Den 22 september var borgmästarens minne
en logg som bara fylldes på: 769 rader och 138 kB.

## Problem

1. **Omorientering efter varje överlämning.** I mediansessionen gick 49 000
   tokens åt före den första utåtriktade handlingen och det upprepades vid
   varje överlämning: 31 gånger på 55 timmar.
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

## Ändringar

- **22–23 september: lägeskort och referens.** Ett lägeskort med fast form och
  en referens med beständiga fakta och regler ersatte loggen. Kortet skrivs
  över vid varje överlämning och referensen läses i ett anrop. Kortet anger
  id:t för det senast hanterade inkommande meddelandet, eftersom meddelanden
  hade gått förlorade vid överlämningar; vad som pågår; vad som har lovats men
  inte levererats; öppna frågor, var och en med id:t för meddelandet den
  ställdes i; processer som körs, med sina id:n; och för varje "klart" det
  kommando som bevisar det. Inte mätt än.
- **23 september: snabba frågor och krokar.** Ett meddelande från grundaren
  som börjar med "?" besvaras direkt utifrån det borgmästaren redan vet, utan
  något annat verktygsanrop än själva svaret. Krokarnas tidsgräns gick från 15
  sekunder till 5. Inte mätt än.
- **23–24 september: fönster och överlämningspunkter.** Fönstret sattes till
  1 000 000 tokens den 23 september, med råd om överlämning vid 20 % och
  uppmaning vid 25 %; sedan den 24 september vid 25 % och 30 % (250 000 och
  300 000 tokens). Inte mätt än.
- **24 september: fyra tillägg avstängda** för fabrikens sessioner:
  hostingplattformens, ett tillägg för frontenddesign med en färdighet och två
  tillägg med språkservrar utan rader för färdigheter. Mätt en gång: nästa
  borgmästarsession startade på 46 290 tokens, mot 51 020, 59 091 och 65 150
  för de tre före. Mellan 51 020 och 46 290 ändrades bara listorna med
  färdigheter och agenter, ungefär 12 000 tecken kortare, så hostingtillägget
  kostade ungefär 4 700 tokens per start: en tiondel, inte den femtedel som
  hade uppskattats utifrån tilläggets filer på disken. De tre tidigare
  starterna skilde sig redan med 14 000 tokens: en mätning, inte ett bevis.
- **24 september: kontots kopplingar avstängda** för fabrikens sessioner: tio,
  ingen av dem använd. Efter att tillägget stängts av hade hostingplattformens
  verktyg ändå nått varje session, genom kontots egen koppling till samma
  plattform. Mätt en gång, på två sessioner hos genomförandeagenten som tog
  samma första steg: kopplingarna kostade ungefär 9 700 tokens per session,
  det mesta strax efter det första anropet, ungefär 8 % av den genomsnittliga
  kontexten per anrop. En mätning, inte ett bevis.

## Öppna frågor och idéer

- Antalet tokens före den första utåtriktade handlingen, mätt igen mot 49 000.
- Tokens per session och överlämningar per dag efter en dag med normalt
  arbete, jämfört med den 22 och 23 september.
- Om den lägre starten håller över fler sessioner.
- En lägre inställning för resonemang vid snabba svar; inte beslutat.
- Överlämningspunkten: senare överlämningar ger färre omorienteringar men en
  längre kontext i varje steg och äldre fakta i fönstret. Vilket som är
  billigare beror på vad omorienteringen kostar, något som ändringarna ska
  minska; det avgörs utifrån mätningarna.
- En projektledarroll och ett andra projekt, att besluta om utifrån uppmätta
  data.
