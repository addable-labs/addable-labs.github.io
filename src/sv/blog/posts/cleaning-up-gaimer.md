---
title: "Storstädning i Gaimer: tre spel före och efter"
description: Den 24 och 25 september 2026 slog fabriken ihop 49 pull requests i Gaimer, skrivbordsappen som gör ett litet spel utifrån en beskrivning. Här är vad de ändrade. Du kan också spela Tetris, Pong och Space Invaders, gjorda med appens systemprompt före och efter städningen, direkt på sidan.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Ett Tetrisspel och ett Pongspel före och efter städningen: till vänster platta grå block och racketar, till höger rundade, lysande block, en rad som rensas och en boll som sprutar partiklar."
date: 2026-09-26
category: app-development        # app-development | ai-journey
translationKey: cleaning-up-gaimer
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

[Gaimer](https://github.com/addable-labs/gaimer) är en skrivbordsapp som gör
ett litet spel utifrån en beskrivning. Du skriver vad du vill ha, till
exempel "Pong". Appen ber den AI-leverantör du har kopplat in om ett
komplett spel i JavaScript, som den sparar och kör i en isolerad sida.
Leverantören kan vara OpenAI med din egen API-nyckel eller Claude via ditt
eget Claude Code. Gaimer har öppen källkod under MIT-licensen och körs på
macOS, Windows, Linux och iOS.

Fabriken, alltså den [agentdrivna
mjukvarufabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här
sajten, slog ihop 49 pull requests i Gaimer den 24 och 25 september 2026.
Det blev 76 commits sammanlagt och varje pull request förklarar varför den
gjordes och vad som kontrollerades. Längre ner visar Tetris, Pong och Space
Invaders vad den nya systemprompten gör. Varje spel gjordes en gång med
varje prompt och alla sex går att spela här.

{% figure "merges", "wide" %}

## Vad som ändrades

### Öppna och spara spel

Ett sparat spel kunde vägra att öppnas ("Missing required field: title") när
spelets framsteg väl hade sparats, eftersom appen ibland tog dem för själva
spelet. Frågan "Restore progress?" kom aldrig upp: dialogrutan som behövs
för den var inte installerad. Nu öppnas ett sparat spel direkt i stället för
efter en sekund. Blir ett nytt spel klart medan ett sparat är öppet visas
det nya i stället. Appen frågar innan den raderar ett spel. Går framstegen
inte att spara får du veta varför direkt.

### Fel i spelen

Förut stoppade ett syntaxfel i spelkoden sidans enda skript: spelaren såg en
mörk spelyta och inget felmeddelande. Nu körs spelets kod i ett eget skript
och alla fel når appen. I WebKit, som appen körs i på macOS och iOS, syntes
felen bara som "Script error." och i den byggda appen stoppade
säkerhetspolicyn skriptet som rapporterar dem. Båda skripten laddas nu från
`data:`-adresser och det löser båda problemen. Ett fel anges med rad och
kolumn i spelets kod eller med en upplysning om att det hittades efter
kodens slut. Kod som har klippts av mitt i ett uttryck ger nu ett syntaxfel.

### Kopplingen till Claude

Förut kördes en hel Claude Code-session för varje spel. Nu blir det ett
enkelt anrop där det mesta av användarens egen konfiguration hålls utanför.
Misslyckas ett anrop visar appen nu varför i stället för "Exit code 1".

{% figure "connection" %}

### Säkerhet

Huvudfönstrets Content Security Policy tillåter inte längre anrop till
Anthropics API eller bilder från alla https-adresser – appen använder inget
av dem. Behörigheten att köra kommandon lät förut alla skript i fönstret
köra alla kommandon med användarens rättigheter. Nu tillåter den bara de tre
kommandorader som appen själv bygger. API-nyckeln till OpenAI låg i ett
valv, men valvets lösenord och salt fanns i kodförrådet. Nu ligger nyckeln i
systemets nyckelring.

### Städning

Det som inte användes togs bort: ett HTTP-plugin som var inbyggt i appen men
aldrig anropades (utan det har Rust-bygget 31 crates färre), rester från
projektmallen, anslutningsdata som skrevs men aldrig lästes, metoder som
aldrig anropades och två engångsmigreringar som inte längre hittade några
gamla data. Beroendena uppdaterades inom de versioner som redan var tillåtna
och då försvann alla 22 anmärkningar i paketgranskningen.

### Tester och CI

Tester som inte kunde misslyckas byttes ut och nya tester skrevs där en
regression skulle märkas av användaren. Testtäckningen får nu inte sjunka
under de nivåer som hade nåtts, avrundade nedåt: 94 % av satserna, 89 % av
grenarna, 90 % av funktionerna och 96 % av raderna. Antalet enhetstester
ökade från 101 till 408. CI gick över från Node 20, som saknar stöd sedan
den 30 april, till Node 24 och aktuella versioner av sina actions. Den har
nu en token som bara kan läsa. Dessutom kontrollerar den formatering och
lints i Rust-koden och bygger appen för Linux, macOS, Windows och iOS på
varje pull request. Efter den sista sammanslagningen gick alla fyra byggena
igenom.

### Den nya systemprompten

Varje spel görs i ett enda anrop, utifrån Gaimers systemprompt och
användarens beskrivning. Den gamla prompten sa hur svaret skulle se ut, var
spelet körs, att det måste gå att styra med både tangentbord och pekskärm
och hur spelet sparar och återställer sitt läge. Om hur ett spel ska se ut
eller kännas sa den ingenting.
[Omskrivningen](https://github.com/addable-labs/gaimer/pull/40) behåller
allt det och lägger till avsnitt om utseende, spelkänsla och prestanda: en
enhetlig stil, partiklar och en lätt skakning av skärmen, en startskärm, ett
sparat rekord, en svårighetsgrad som ökar jämnt, ljud som skapas i koden,
hastigheter som räknas per sekund och inte per bildruta samt pointer events,
så att en mus fungerar lika bra som ett finger. Den ber om "några hundra
rader" kod och prompten växte från
[2 830](https://github.com/addable-labs/gaimer/blob/7cef601c4b38cf6ead002c2864ad3a41ddd621a6/src/helpers/prompts.js#L2-L73)
till [6 873 tecken](https://github.com/addable-labs/gaimer/blob/2693e10465e22c61f51c2f561f111ef20740164b/src/helpers/prompts.js#L6-L103). I pull requesten
kallas den ett utkast att läsa, skrivet utan att någon AI-leverantör
anropades och utan att något spel gjordes med den.

### Automatisk rättning

Om ett nytt spel får ett fel redan när det startar skickas det nu tillbaka
en gång till leverantören som skrev det. Det rättade spelet ersätter sedan
det trasiga.

### Ändra det öppna spelet

När ett spel är öppet ändrar beskrivningsrutan nu det spelet.

{% figure "lifecycle", "wide" %}

### Appens ikon

Gaimer hade ingen egen ikon: appen använde Tauris standardikon. Den 25
september bad grundaren om en logotyp som visar spel gjorda med AI, i appens
gröna färg och som SVG så att den går att skala till appikoner. En agent
skrev fyra förslag direkt som SVG-kod, utan någon bildgenerator. Vart och
ett bygger på en enda idé och agenten förhandsvisade dem i ikonstorlekar och
i efterbildningar av Docken på macOS och av hemskärmen på en iPhone.
Grundaren valde det första, Spark pad. Den sista pull requesten gjorde det
till appens ikon på alla plattformar.

{% figure "logos", "wide" %}

### Mindre ändringar

Varje AI-leverantör har nu en egen modell. Förut gällde ett enda val för
båda, så när användaren bytte leverantör kunde en modell som valts för
OpenAI skickas till Claude. Då gick det inte att göra något spel förrän en
modell hade valts igen. Listorna har inte längre med modeller som inte
kunde fungera, till exempel OpenAI:s modeller för tal och transkribering.
Nu finns också nio GPT-5-modeller, med ett anrop anpassat för dem: inget
temperaturvärde och en gräns för svaret som räknar in både resonemanget
och spelet.

Ett spel fick inga tangenttryck förrän spelaren klickade på det. Om spelet
avbryter klicket, som en del spel gjorda med den nya prompten gör, fick det
inga alls. Nu får ett spel tangentbordsfokus när det är redo och när någon
klickar på det. Beskrivningsrutan släpper fokus när en beskrivning har
skickats. Den nya prompten sa till modellen att tangenttryck når ett spel
först efter ett klick eller ett tryck. Den raden är borta, men de tre nya
spelen i artikeln gjordes med den.

Förut startade spelet om när fönstret ändrade storlek eller telefonen
vändes. Det spelaren inte hade sparat gick förlorat. Nu fortsätter spelet,
skalat för att få plats, i den form det startade med: vänds telefonen från
stående till liggande blir spelet mindre, med tomma fält på sidorna.

## Så gjordes spelen

Varje spel gjordes precis som Gaimer gjorde spel med Claude när den nya
prompten infördes: samma kommandorad, körd på samma sätt, med "Tetris",
"Pong" eller "Space Invaders" som enda beskrivning och med den modell som
Gaimer använder för Claude när ingen är vald. Bara systemprompten skiljer
sig: den gamla, oförändrad sedan den 1 april, eller omskrivningen.
Space Invaders gjordes den 26 september, de andra två den 25. Svaren
tolkades med appens egen kod. Varje spel körs på en spelsida byggd som den i
motsvarande version av appen, men utan sådant som bara appen har, till
exempel sparfilerna.

{% figure "price", "wide" %}

De första anropen för Tetris och Space Invaders med den nya prompten drog
över appens dåvarande gräns på 300 sekunder och stoppades där, precis som
appen skulle ha gjort. I Gaimer betydde det felet "Command timed out" och
inget spel. Spelen här kommer i båda fallen från ett andra anrop som gjordes
på samma sätt men utan gräns. Fabriken har sedan dess höjt gränsen till [15
minuter](https://github.com/addable-labs/gaimer/pull/51). Alla sex spelen
startade utan fel, så inget av de tre nya behövde skickas tillbaka för
rättning.

Knappen Spela startar spelet i stället för bilden av startskärmen. Sedan går
tangenterna till spelet och inte till sidan. Ett spel i taget kan vara
igång.

{% games "tetris" %}

Det gamla Tetrisspelet startar direkt. Längs nederkanten visas alltid fem
pekknappar och spelet reagerar bara på touch-händelser, så med en mus händer
ingenting. Det visar poäng, nivå, rader och nästa bit, markerar var biten
kommer att landa och pausar när man trycker på P. Det nya kallade sig Neon
Block Drop och skrev TETRIS på startskärmen. Det väntar på ett tryck, ett
klick eller en tangent och ritar rundade block i en inramad spelplan.
Pekknapparna visas först när någon rör vid skärmen. När en rad rensas hörs
ett ljud, partiklar sprutar och skärmen skakar lite.

{% games "pong" %}

Det gamla Pongspelet startar också direkt, med bollen redan i spel.
Racketarna är enkla, platta rektanglar och spelet styrs med piltangenterna,
W och S eller genom att man drar med fingret. Det har inget ljud. Det nya
öppnar med en startskärm. Racketarna lyser, bollen sprutar partiklar där den
träffar och längs överkanten visas poäng, rekord och nivå. Det har ljud, går
att styra genom att dra med ett finger eller med musen och visar två
pilknappar när någon har rört vid skärmen. Är skärmen högre än den är bred
hamnar racketarna nertill och upptill.

{% games "space-invaders" %}

Det gamla Space Invaders-spelet startar när man trycker på mellanslag eller
på skärmen. En mus gör ingenting i det. Utomjordingarna är platta block, de
gröna skydden smulas sönder när de träffas och ibland släpper en utomjording
en kapsel som ger snabbare eld, tre skott åt gången, en sköld eller ett
extra liv. Det nya kallade sig Nebula Invaders. Utomjordingarna är
sexkantiga och marscherar fram i rosa, gult och lila. Varje träff ger
partiklar och en poängsiffra som stiger uppåt. Knapparna för att styra och
skjuta på en pekskärm ritas inte ut medan man spelar.

Spelparen visar att promptens nya avsnitt får genomslag i spelen. Anropen
med den nya prompten gav 1,7 till 2,4 gånger så många utdata-tokens.

Anropen tog också längre tid. När fabriken senare tog tid på appens eget
anrop med Claude Codes förvalda effort-nivå, tog ett Pongspel 194 sekunder
och ett Tetrisspel 488. Det mesta av varje svar var tänkande: 63 respektive
79 % av utdata-tokens. På den lägsta nivån tog ett Pongspel 53 sekunder och
två Tetrisspel 70 respektive 60, nästan helt utan tänkande. Ändå hade alla
tre startskärm, rekord, ljud, pekstyrning, sparande och återställning av
läget samt hastigheter som räknas per sekund. Det ena Tetrisspelet gick
däremot inte att spela med mus. Det var ett spel per mätning, ingen
systematisk jämförelse. Med
[PR #53](https://github.com/addable-labs/gaimer/pull/53) började Gaimer be
om varje spel på den lägsta nivån. Nu kan användaren välja nivå i
inställningarna. Med standardmodellen heter valen "Low · about a minute",
"Medium · 1–5 minutes" och "High · 3–8 minutes".
