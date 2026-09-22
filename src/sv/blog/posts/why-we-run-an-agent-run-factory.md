---
title: Därför driver vi en agentdriven mjukvarufabrik
description: Första artikeln i en serie om fabriken bakom den här webbplatsen – vad Gas City och Beads är, vad vi tog från Steve Yegges arbete och vad vi ändrade, med ett bygge i verkliga siffror.
date: 2026-09-21
category: ai-journey             # app-development | ai-journey
translationKey: why-we-run-an-agent-run-factory
draft: true                      # publiceras, men märks "Draft" / "Utkast"
machineTranslated: true          # true tills en person har granskat texten
---

Addable Labs bygger mjukvara till stor del med AI-agenter och sedan
september 2026 byggs och underhålls den här webbplatsen av det vi kallar
fabriken: ett litet team av kodande agenter, organiserat som ett företag, som
samordnar sig genom en gemensam ärendehanterare, med en person som ansvarar.
Avsnittet [Så arbetar vi](/sv/#how) på startsidan säger det på fyra rader och
[en tidigare artikel](/sv/blog/how-this-site-was-built-by-agents/) berättade om
ett bygge. Den här serien beskriver själva uppsättningen – ett lager i taget –
och börjar med den självklara frågan: varför driva något sådant över huvud
taget och vad bygger det på?

## Problemet med en enda mycket duktig agent

En ensam kodande agent i en terminal är anmärkningsvärt produktiv och
anmärkningsvärt glömsk. Varje session börjar från noll. En uppgift som växer ur
en session går förlorad i överlämningen om inte en person bär den vidare och
den personen blir till slut minnet, schemaläggaren och granskaren för hela
verksamheten. Det skalar inte till ett företag som vill att agenter ska
planera, bygga, granska och publicera medan grundaren gör något annat.

Tre saker måste vara på plats först. Arbetet måste skrivas ner någonstans där
varje agent kan läsa det, så att vilken session som helst kan ta vid där en
annan slutade. Granskningen måste göras av en annan agent än den som skrev
koden. Och den som ansvarar måste vara inblandad vid några få kända punkter –
en plan att godkänna, en gren att läsa innan den pushas – i stället för hela
tiden. Vi ville inte bygga det maskineriet själva och det visade sig att vi
inte behövde.

## Steve Yegges iterationer

Uppsättningen vi driver bygger på öppen källkod som Steve Yegge påbörjade i
oktober 2025 med Beads, en ärendehanterare utformad som minne för kodande
agenter snarare än som en att-göra-lista för människor. I januari 2026 kom Gas
Town, hans orkestreringsverktyg: tjugo till trettio agentsessioner som
samordnar sig genom Beads, med en fast uppsättning roller och en tes som vi har
anammat rakt av – en agent är inte en session; sessioner är utbytbara,
arbetet är beständigt. I april 2026 kom Gas City: med hans egna ord "Gas Town,
men sönderplockat och omskrivet från grunden som ett SDK för att bygga egna
mörka fabriker" (vår översättning). Han är noga med att säga att han inte
skrev det – det gjorde Julian Knutsen och Chris Sells. I augusti 2026 beskrev
sedan "Fences, not Sandboxes" den organisation på femtio till sextio agenter
som han faktiskt driver, styrd av skrivna regler snarare än av inlåsning.

Vi gick igenom allt det där i september 2026 och fann att nästan allt vi ville
ha – en fabrik per projekt, en samordnare du kan prata med, delegering med
uppföljning, ett gemensamt register – redan fanns och underhölls aktivt; både
Gas City och Beads är MIT-licensierade. Vi bestämde oss för att bygga på dem i
stället för att bygga ännu ett orkestreringsverktyg.

## Gas City och Beads, i korthet

Beads är en kommandoradsbaserad ärendehanterare ovanpå en versionshanterad
databas. Varje arbetsenhet är en bead – en uppgift, ett meddelande mellan
agenter, en anteckning om en session – med beroenden mellan dem. En bead med en
öppen blockerare är osynlig för agenterna och det är så ordningen hålls utan
någon central schemaläggare. En agent tar en bead, arbetar, skriver ner vad den
gjorde och stänger den; om sessionen dör halvvägs förblir beaden öppen och
nästa session tar vid.

Gas City är orkestreringsverktyget runt det registret och det hårdkodar inga
roller. En agent är konfiguration: ett namn, en prompt, ett ansvarsområde. En
formel är ett arbetsflöde skrivet som steg och beroenden; när den tillämpas
blir den en graf av beads som Gas City driver till avslut – parallelliserar,
sätter grindar, gör nya försök och startar om sessioner som kraschar. Paket
(packs) buntar ihop agenter och formler så att en hel metodik kan importeras
och låsas till en version som vilket beroende som helst. Underhållarnas regel
är att omdömet bor i prompterna, inte i ramverket: det flyttar arbete; det
resonerar inte om det.

## Vad vi tog och vad vi ändrade

Vi tog principerna som de är. Arbetet består, sessionerna gör det inte. Roller
är konfiguration, inte kod. Planerare, byggare och granskare är olika agenter
och granskningen går i flera spår. Reglerna står skrivna där agenterna läser
dem när de vaknar. Och, från "Fences, not Sandboxes", styrning genom avvisning
snarare än inlåsning – ett staket (fence) är, enligt Yegges definition, "varje mekanism
som avvisar dig om du inte ska vara där" (vår översättning).

Det vi ändrade är mest skala och form. Yegge driver femtio till sextio
agenter; vi kör en handfull sessioner åt gången på en enda bärbar dator, en
genomförandesession per projekt och en fabrik per projekt så att var och en
kan startas, stoppas och uppgraderas för sig. Organisationsschemat är medvetet
litet: en borgmästare som grundaren pratar med och ett fabriksgolv – krav,
plan, nedbrytning, genomförande, tre granskningsspår, en publicerare – som bara
finns som steg i en formel, aldrig som stående sessioner. En projektledare per
kodförråd står näst på tur. Golvrollerna kommer oförändrade från startpaketet
i Gas Citys paketregister; vårt eget bidrag är formen runt dem, de skrivna
reglerna och vanorna på en delad maskin. Grundarens grind sitter vid planen i
varje bygge och ingen agent pushar något: att publicera betyder en gren som
grundaren läser lokalt och sedan själv pushar och öppnar som en pull request.
Han pratar med borgmästaren via Discord.

## Ett bygge, i siffror

Omdesignen av den här webbplatsen är det andra bygget fabriken har kört och
dokumenten den skrev finns i kodförrådet. Det började den 20 september 2026
klockan 17:37 UTC med en kort uppdragsbeskrivning och granskningsrapporten
färdigställdes 00:14 nästa morgon: ungefär sex och en halv timme från start
till mål. Däremellan tog kravsteget fram 31 numrerade krav med
acceptanskriterier; plansteget renderade tre designriktningar som riktiga sidor,
grundaren valde en två minuter efter att ha sett dem och godkände planen
19:44; nedbrytningen gav tio arbetspaket; en genomförandesession arbetade sig
igenom dem i 31 commits; och tre granskningsspår hittade två fel som måste
rättas, vilket ett rättningsspår gjorde innan rapporten skrevs. Grenen slutade
på 39 commits som rörde 90 källfiler, klarade tio automatiska kvalitetsgrindar
och 101 tester, med Lighthouse-poängen 97 för prestanda och 100 för
tillgänglighet, bästa praxis och SEO på alla sju sidor som kontrolleras.
Grundaren var inblandad vid tre tillfällen – valet, plangrinden och läsningen
av grenen efteråt – och ingenting blev offentligt enbart på agenternas ord.

Det första bygget, dagen innan, tog ungefär fyra timmar för 27 krav och tio
arbetspaket och behövde en rättning. Ingen av körningarna var felfri: ett steg
i den första började på fel arbetspaket och fick lämnas tillbaka och båda
körningarna lämnade en lista med öppna punkter till grundaren. Vi ser de
listorna som en del av produkten.

## Tack

Inget av det här skulle finnas utan Steve Yegges vilja att bygga öppet, att
skriva lika rakt om det som gick sönder som om det som fungerade och att
släppa Beads och Gas Town under en licens som lät oss bygga vidare på dem. Gas
City i sig är Julian Knutsens och Chris Sells verk, tillsammans med
gemenskapen kring organisationen Gas Town Hall. Tack. Koden finns på GitHub –
[Gas City](https://github.com/gastownhall/gascity),
[Beads](https://github.com/gastownhall/beads) och
[paketregistret](https://github.com/gastownhall/gascity-packs) – och essäerna
finns på Yegges webbplats: [Welcome to Gas Town](https://yegge.ai/essays/welcome-to-gas-town/),
[Welcome to Gas City](https://yegge.ai/essays/welcome-to-gas-city/),
[Fences, not Sandboxes](https://yegge.ai/essays/fences-not-sandboxes/) och
[Beads Best Practices](https://yegge.ai/essays/beads-best-practices/), samlade
på [hans Gas Town-sida](https://yegge.ai/gastown).

## Vad som kommer härnäst

De kommande artiklarna tar uppsättningen ett lager i taget: rollerna och vem
som pratar med vem; beads som mediet agenterna kommunicerar genom; en begärans
väg från grundarens meddelande till en commit han kan slå samman; reglerna en
ändring måste klara; vad grundaren faktiskt ser och beslutar; vad som gick fel
och vad det kostar; och vart det här är på väg. Allt i dem kommer att kunna
spåras till ett kodförråd eller en essä och varje artikel är märkt som utkast
tills grundaren har läst den.
