---
title: Därför driver vi en agentdriven mjukvarufabrik
description: Första artikeln i en serie om fabriken bakom den här sajten – vad Gas City och Beads är, vad vi tog från Steve Yegges arbete och vad vi ändrade, med ett bygge i verkliga siffror.
date: 2026-09-21
category: ai-journey             # app-development | ai-journey
translationKey: why-we-run-an-agent-run-factory
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

Addable Labs bygger mjukvara till stor del med AI-agenter och sedan september
2026 byggs och underhålls den här sajten av det vi kallar fabriken: ett
litet team av kodande agenter, organiserat som ett företag, som samordnar sig
genom en gemensam ärendehanterare, med en person som är ansvarig för fabriken.
Artikeln [Så byggdes den här sajten av
agenter](/sv/blog/how-this-site-was-built-by-agents/) berättade om ett bygge;
den här serien beskriver själva uppsättningen – ett lager i taget – och börjar
med den uppenbara frågan: varför driva något sådant över huvud taget och vad
bygger det på?

## Vad en agent och en person inte kunde göra

nivå, produkten bakom [Lärdomar från att bygga
nivå](/sv/blog/lessons-from-building-niva/), byggdes tvärtom: en kodande
agent och en person, 480 commits på 26 dagar, varenda en med agenten som
medförfattare. Den uppsättningen börjar inte från noll. En fil med
arbetsöverenskommelser, fyra nedskrivna rutiner – granskning,
kvalitetsgrindar, driftsättning och innehållsändringar – arton anteckningar
som agenten för åt sig själv, tio av dem om sådant som vi har rättat, en
framstegslogg med en post per session och 105 dokumenterade beslut bär
arbetet från en session till nästa.

Det den uppsättningen inte kan är att prata med någon annan än oss. Den 12
september, med fyra agenter på en dator, var och en med sitt eget projekt,
lät vi nivå-agenten skriva ett meddelande som vi själva kunde bära till de
andra tre och klistrade in det i den regelfil som varje agent på maskinen
läser först. Varje uppgift börjar hos oss och när två sessioner behöver veta
något om varandra är det vi som bär meddelandet emellan. Det skalar inte
till agenter som planerar, bygger, granskar och publicerar medan vi gör
något annat och det håller oss kvar i detaljer vi inte vill vara i.

{% figure "ledger" %}

Tre saker behövde ändras: arbetet behövde ligga i ett gemensamt register som
vilken session som helst kan ta uppgifter ur, inte i ett enda projekts
anteckningar; sessioner behövde kunna lämna över arbete till varandra och
följa upp det utan en person emellan; och den som är ansvarig behövde vara
inblandad vid några få kända punkter – en plan att godkänna, en gren att
läsa innan den pushas – i stället för hela tiden.

## Steve Yegges iterationer

Uppsättningen vi driver bygger på öppen källkod som Steve Yegge påbörjade i
oktober 2025 med [Beads](https://github.com/gastownhall/beads), en
ärendehanterare som han beskriver som minne för kodande agenter snarare än som
en att-göra-lista för människor. I januari 2026 kom [Gas
Town](https://yegge.ai/essays/welcome-to-gas-town/), hans
orkestreringsverktyg: upp till trettio agentsessioner som samordnar sig genom
Beads, ett dussintal aktiva åt gången, med en fast uppsättning roller och en
tes som vi har anammat rakt av, med hans egna ord: "en agent är inte en
session" (vår översättning) – sessioner är utbytbara, arbetet är beständigt. I
april 2026 kom [Gas City](https://yegge.ai/essays/welcome-to-gas-city/): med
hans egna ord "Gas Town, men sönderplockat och omskrivet från grunden som ett
SDK för att bygga egna mörka fabriker" (vår översättning). Han är noga med att
säga att han inte skrev det – det gjorde Julian Knutsen och Chris Sells. I
augusti 2026 beskrev sedan "[Fences, not
Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/)" den organisation på
femtio till sextio agenter som han driver, styrd av skrivna regler snarare än
av inlåsning.

{% figure "timeline" %}

Vi gick igenom allt det där den 20 september 2026 och fann att nästan allt vi
ville ha – en fabrik per projekt, en samordnare du kan prata med, delegering
med uppföljning, ett gemensamt register – redan fanns, underhölls aktivt och
var MIT-licensierat. Vi byggde vidare på det i stället för att bygga ännu ett
orkestreringsverktyg och körde det första bygget samma eftermiddag.

## Gas City och Beads, i korthet

{% figure "setup" %}

Beads är en kommandoradsbaserad ärendehanterare ovanpå en versionshanterad
databas. Varje arbetsenhet är en bead – en uppgift, ett meddelande mellan
agenter, en anteckning om en session – med beroenden mellan dem. En bead som
blockeras av en annan erbjuds inte till någon agent, och det är så ordningen
hålls utan någon central schemaläggare. En agent tar en bead, arbetar,
skriver ner vad den gjorde och stänger den; om sessionen dör halvvägs
förblir beaden öppen för nästa.

Gas City är orkestreringsverktyget runt det registret och hårdkodar inga
roller. En agent är konfiguration: ett namn, en prompt, ett ansvarsområde. En
formel är ett arbetsflöde skrivet som steg och beroenden; när den tillämpas
blir den en graf av beads som Gas City driver till avslut och startar om
sessioner som kraschar. Paket (packs) buntar ihop agenter och formler så att
en metodik kan låsas till en version som vilket beroende som helst.
Underhållarnas egen regel för ramverket är att det "flyttar arbete; det
resonerar inte om det" (vår översättning) – omdömet bor i prompterna.

## Vad vi tog och vad vi ändrade

Vi tog principerna som de är. Arbetet består, sessionerna gör det inte. Roller
är konfiguration, inte kod. Planerare, byggare och granskare är olika agenter
och granskningen går i flera spår. Reglerna står i de filer varje session
läser först. Och, från "Fences, not Sandboxes", styrning genom avvisning
snarare än inlåsning – ett staket (fence) är, enligt den definition han
citerar, "varje mekanism som avvisar dig om du inte ska vara där" (vår
översättning).

Yegge driver femtio till sextio agenter; vi kör en handfull sessioner åt
gången på en enda dator och siktar på en fabrik per projekt – hittills finns
en, för den här sajten. Organisationsschemat är litet: en borgmästare och
ett golv av roller tagna som de är från startpaketet i Gas Citys
paketregister – krav, plan, plangranskning, nedbrytning, genomförande, tre
granskningsspår, en publicerare – var och en startad som en session när ett
steg i bygget behöver den och avslutad efteråt. Vårt eget bidrag hittills är
borgmästarens prompt, gränser för hur många sessioner en dator kör samtidigt
och reglerna för en delad maskin. Grundarens grind sitter vid planen, sedan
det andra bygget. Agenterna pushar själva till GitHub: en ändring publiceras
först när den klarat kvalitetsgrindarna och en text först när vi har läst
den. Vi pratar med borgmästaren via Discord.

## Ett bygge, i siffror

Omdesignen av den här sajten var fabrikens andra bygge. Det började den
20 september 2026 klockan 17:34
UTC med en kort uppdragsbeskrivning och granskningsrapporten färdigställdes
00:14 nästa morgon: sex timmar och fyrtio minuter från start till mål.
Däremellan tog kravsteget fram 31 krav med acceptanskriterier; plansteget
renderade tre designriktningar som riktiga sidor – vi såg dem redan på
förhandsvisningsservern och valde en inom två minuter efter att ha fått
frågan – och godkände den granskade planen 19:45; nedbrytningen gav tio
arbetspaket; en genomförandeagent arbetade sig igenom dem i fyra sessioner
och 22 commits; och tre granskningsspår hittade två fel som måste rättas,
vilket ett rättningsspår gjorde innan rapporten skrevs. Grenen slutade på 39
commits som rörde 90 källfiler, klarade tio automatiska kvalitetsgrindar,
101 tester och Lighthouse-poäng på 97 till 100 på alla sju sidor som
kontrolleras. Vår del var sex korta meddelanden medan körningen pågick –
valet, våra rättelser, svaren vid plangrinden – och morgonen därpå vårt
omdöme om den färdiga sidan. Själva körningen var 112 beads, 17
agentsessioner i tio roller och tio mejl mellan borgmästaren och golvet som
vi aldrig behövde bära; ingen text blev offentlig utan att jag läst den.

{% figure "build", "wide" %}

Det första bygget, tidigare samma dag, tog ungefär fyra timmar för 27 krav
och tio arbetspaket, behövde en rättning och hade ingen grind före slutet:
vi såg resultatet när det var klart och gillade inte utseendet. Ingen av
körningarna var felfri. I den första tog en session en administrativ post i
registret i stället för sin uppgift och behövde fjorton minuter för att ta
sig runt det; den skrev ner lösningen i sina anteckningar och när det andra
byggets första session råkade ut för samma kapplöpning var den igång med sin
uppgift inom en minut. Båda körningarna lämnade oss en lista med öppna
punkter; vi ser de listorna som en del av produkten.

## Tack

Inget av det här skulle finnas utan Steve Yegges vilja att bygga öppet och att
släppa Beads och Gas Town under en licens som lät oss bygga vidare på dem –
och inte heller utan Julian Knutsen, Chris Sells och gemenskapen kring
organisationen Gas Town Hall, som byggde Gas City. Tack. Koden finns på GitHub
– [Gas City](https://github.com/gastownhall/gascity),
[Beads](https://github.com/gastownhall/beads) och
[paketregistret](https://github.com/gastownhall/gascity-packs) – och essäerna
finns på Yegges webbplats: [Welcome to Gas
Town](https://yegge.ai/essays/welcome-to-gas-town/), [Welcome to Gas
City](https://yegge.ai/essays/welcome-to-gas-city/), [Fences, not
Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/) och [Beads Best
Practices](https://yegge.ai/essays/beads-best-practices/).

## Vad som kommer härnäst

De kommande artiklarna tar uppsättningen ett lager i taget – rollerna, de
beads som agenterna kommunicerar genom, en begärans väg, reglerna en ändring
måste klara, vad grundaren ser och beslutar, vad som gick fel och vad det
kostar.
