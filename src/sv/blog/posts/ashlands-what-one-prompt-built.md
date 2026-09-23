---
title: "Ashlands: vad en enda prompt byggde"
description: En prompt och en flotta subagenter gav 94 000 rader av ett spel som går att spela – men klarade inte den sista biten. Vad Gauntlet Loop fick rätt, vad det kostade och vad grundaren tillförde.
date: 2026-09-22
category: ai-journey             # app-development | ai-journey
translationKey: ashlands-what-one-prompt-built
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

Den 31 juli 2026 gav vi Claude Code [en enda
prompt](https://github.com/addable-labs/ashlands#this-is-an-experiment):
bygg ett action-rollspel i nivå med Morrowind, i Three.js, starta
subagenter parallellt, låt en separat hård kritiker jämföra varje del sida
vid sida med det riktiga spelet och sluta inte förrän varje kritiker är
imponerad. Ingen arkitektur, ingen uppgiftslista, ingen definition av vad som
är klart. Bygget pågick i tre dagar; den 10 augusti skrev agenten på vår
begäran en utvärdering av sin egen körning. Båda är offentliga:
[Ashlands](https://github.com/addable-labs/ashlands) är MIT-licensierat och
dess
[utvärderingsrapport](https://github.com/addable-labs/ashlands/blob/main/EVALUATION.md)
lutar medvetet åt det som gick fel – och är agentens egen redogörelse för
sin egen körning, värt att minnas för varje siffra nedan.

Prompten följer **Gauntlet Loop**, metoden Matt Shumer beskrev i [How to Run
a Gauntlet Loop](https://somethingbig.ai/gauntlet-loop) – ett gatlopp där
varje del av arbetet får löpa förbi kritiker om och om igen: kör den i ett
agentsystem i stället för i en chatt, formulera målet utan att föreskriva
lösningen, ge kritikern en konkret referens att jämföra mot, låt
ledaragenten dela upp arbetet i delar som kan bedömas var för sig och låt
aldrig en byggare sätta betyg på sitt eget arbete. Andra har kört den sedan
dess och spelen de byggde finns samlade på [hans
sajt](https://somethingbig.ai/games), flera av dem riktigt bra.

{% figure "gauntlet", "wide" %}

## Vad som kom ut

Ungefär 94 000 rader TypeScript i 160 filer; sexton delsystem, vart och ett
bakom ett namngivet kontrakt; arton uppdrag med dialog, fraktioner, brott
och en dagbok; noll binära resurser – terräng, material, himmel, växtlighet,
arkitektur, varelser, musik och ljud genereras alla ur kod. Agenten byggde
också maskineriet som dömer den: 32 grindkontroller och 17
end-to-end-kontroller som kör en riktig webbläsare. Vid körningens slut föll
1 av 32 grindkontroller, 16 av 16 end-to-end-kontroller gick igenom och
spelet gick i 20 till 35 bilder per sekund i den upplösning som bilderna
fångades i, på en MacBook Air.

Och det går att spela: du kan vandra i världen, använda färdigheter och
slutföra alla arton uppdrag – ett skript driver vart och ett till sista
steget utan att fastna. Det som står öppet är bildfrekvensen och den
konstnärliga riktningen: en palettkontroll som faller på en vy, trappsteg
där vatten möter terräng, fläckighet på avstånd. Inte ett spel som faller
ihop – ett ofärdigt.

## Vad metoden fick rätt

Kontrakten först: ett namngivet gränssnitt per delsystem som bara
kommunicerar genom en händelsebuss, vilket lät subagenter skriva terräng,
himmel, strid och ljud samtidigt med nästan inga integrationskonflikter –
rapporten kallar det det beslut som mest av allt är skälet till att kodbasen
finns. Byggare hålls isär från kritiker: agenter som satte betyg på sitt
eget arbete förklarade sig klara, fristående kritiker gjorde det inte. Och
negativa resultat som det mest värdefulla en agent lämnade ifrån sig – fyra
av slutfasens sex rundor slutade med att en agent gjorde en ändring, mätte
den, fann den sämre och tog tillbaka den men behöll mätningen. Var och en av
dem stängde ett undersökningsspår för gott.

## Vad som gick fel

Uppdragets slutvillkor, en blind jämförelse sida vid sida med det riktiga
spelet, inträffade aldrig: inga referensbilder togs någonsin fram, så varje
omdöme om att något "slår Morrowind" var en agent som jämförde en bildruta
med sitt eget minne – en avvikelse från metoden, vars tredje princip är att
ge kritikern något konkret att granska.

Det dyraste felet var inte dålig kod utan självsäkert felaktig diagnos. En
utsiktspunkt renderades som ett platt terrakottafärgat svep och tre rundor
subagenter skickades till terrängmaterialet, ljussättningen och
atmosfären; alla tre mätte rätt, fann ingenting och tog tillbaka sina
ändringar. Orsaken var en enda saknad avståndsterm i sökningen efter
kameraläge, som hade klättrat upp på närmaste höjd och siktat rakt på
toppen: ingen ändring i en shader kan rädda en bildruta utan djup. En andra
flerrundig jakt var samma sorts fel.

## Varifrån rättelserna kom

Rapporten är agentens röst och den är tunn just där människan var avgörande:
vi spelade spelet medan det byggdes och styrde det. Armarna i
förstapersonsvy tog ett elvatal rundor. Den 1 augusti (citaten är översatta
från engelska): "Vilka hemska armar! Fingrarna pekar åt fel håll och armarna
ser ut som rör snarare än riktiga armar." Senare samma dag: "Handen ser ut
som en vänsterhand, men spelaren håller svärdet i höger hand." På kvällen
jämförde vi det med tidig bildgenerering där hästar hade fem ben och bad om
att armen skulle göras om från en bild i stället för att lappas. Den 2
augusti, med en skärmbild: "knogarna ska vara på höger sida av handen, inte
på vänster". Sedan: "om du inte får handen rätt den här gången vill jag att
du undersöker hur andra gör". Agentens egen sammanfattning den 3 augusti är
rakare än rapporten: "Användarens återkoppling var korrekt varje gång och
min var det inte."

Med bildfrekvensen gick det likadant: varje subagent ville nå 60 bilder
per sekund på en fläktlös dator, ingen kom i närheten och vi kom på varför –
flera agenter testade samtidigt, var och en med sin egen webbläsare och
grafikkrets, så det som var och en mätte var inte det en spelare skulle se.
"Vi gör all utveckling på en MacBook Air. Fps kommer inte att bli perfekt.
Dessutom arbetar några andra agenter också. Fortsätt", skrev vi den 1
augusti. Rapporten noterar den kollisionen som ett eget fynd – en
systembelastning på 37 på åtta kärnor – och ger "användaren" en enda bisats.

Sedan bad vi om de två saker körningen saknade: "Bygg regressionsgrinden och
fundera på hur vi kan gå från ett slumpvandrande arbetsflöde till en tydligt
strukturerad och avsiktlig karta över de steg subagenterna behöver ta."
Båda finns i kodförrådet nu: grinden som ingen ändring får slås samman utan
att ha klarat och en arbetsordning som håller verifieringen till en
webbläsare i taget och tillåter en enda ändring av det gemensamma utseendet
per runda – en fabrik som kommer inifrån en körning på en enda prompt, två
dagar in.

## Vad det kostade

Under tre dygn startade körningen 242 subagenter: 236 inuti 34
arbetsflöden och 6 direkt. Som mest levde sju samtidigt och tio nåddes
aldrig. De är kortlivade, i median fyrtio minuter, så totalen växte medan
antalet som kördes samtidigt förblev litet: fem eller fler under sjutton
av de sjuttiotvå timmarna – trängseln bakom den systembelastning på 37 som
rapporten noterar. De andra siffrorna här kommer inte från rapporten utan
från körningens egna sessionsloggar, som inte är offentliga.

{% figure "fleet", "wide" %}

De sista sex av de 242 kördes i slutfasen och fem blev klara: ungefär 1,32
miljoner tokens och 654 verktygsanrop på omkring 3,8 timmar, för en skeppad
visuell rättning och fyra avslutade utredningar. Den sjätte dog innan den
läst en enda fil när kontot slog i veckogränsen för tokens – taket för den
här metoden är kvoten och kvoten tar slut utan förvarning. Ungefär en miljon
av de tokens gick till den enda utsiktspunkt vars orsak var den saknade
avståndstermen.

{% figure "agents" %}

## Var loopen passar

Rapportens avslutande resonemang, som den själv märker som åsikt och inte
mätning, är att kostnaden för loopen sätts av kritikern och inte av
byggaren. Byggarsidan fungerade; det var att döma arbetet som slukade tokens
och den här körningen hade nära nog värsta tänkbara kritiker på varje axel.
Två frågor förutsäger utfallet bättre än något annat: finns det ett körbart
orakel som svarar ja eller nej utan en modells åsikt och pekar en fallerande
kontroll ut det som ska rättas? Att porta ett bibliotek, implementera en
specifikation, optimera för snabbhet, balansera ett kortspel över
hundratusen simulerade matcher – allt ja. En renderare utan referensbilder:
nej på båda.

{% figure "critic" %}

## Vad vi tar med oss in i fabriken

Vi kör agenter tvärtom – steg, kvalitetsgrindar, ett gemensamt register
och en granskning av grundaren innan något publiceras, vilket är så [den
här sajten byggdes](/sv/blog/how-this-site-was-built-by-agents/) och vad
[fabriksartikeln](/sv/blog/why-we-run-an-agent-run-factory/) beskriver.
Den här körningen styrdes och styrningarna finns i kodförrådet: armarna,
diagnosen av bildfrekvensen, grinden och kartan över steg. Instrumenten
byggdes under loopen av den agent vars arbete de dömde och de hade fel sju
gånger. Så, för våra egna körningar: bygg instrumentet först och kalibrera
det mot en känd defekt, lägg referensen i kritikerns händer före första
rundan och håll kvar en människa där en agent inte kan tala om för dig att
den har fel. Kontrakten först, byggare som hålls isär från kritiker och
ett rent negativt resultat som ett fullgott svar tar vi som de är.

Metoden är det som fick 94 000 rader att köra över huvud taget och
rapporten avslutas med att bygga på den: en omarbetad startprompt för den
som vill göra om körningen, där tillägget är hur arbetet ska verifieras –
namnge referensen, namnge instrumentet, säg vad ett godkänt resultat är
innan första agenten startar. Kör den så och den här körningen hade slutat
längre fram.

*Morrowind nämns här bara som den designförebild experimentet mätte sig mot;
Ashlands innehåller inga resurser från de spelen. The Elder Scrolls och
Morrowind är varumärken som tillhör ZeniMax Media.*
