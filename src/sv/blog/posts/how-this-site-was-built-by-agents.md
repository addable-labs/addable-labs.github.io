---
title: Så byggdes den här sajten av agenter
description: Stegen, kvalitetsgrindarna och grundarens granskningar bakom den första sajt som en agentdriven mjukvarufabrik tog fram från början till slut.
date: 2026-09-20
category: app-development        # app-development | ai-journey
translationKey: how-this-site-was-built-by-agents
draft: true                      # publiceras, men märks "Draft" / "Utkast"
machineTranslated: true          # true tills en person har granskat texten
---

Addable Labs bygger mjukvara till stor del med AI-agenter och den här
sajten är det första som en agentdriven mjukvarufabrik tog fram åt
företaget från början till slut, i två byggen. Den här artikeln beskriver
stegen, vad grundaren tittade på och de kontroller som står mellan en agents
ändring och en publicerad sida.

## Stegen

Varje körning gick igenom en fast sekvens och varje steg skrev ett dokument
som nästa steg var tvunget att läsa: krav, en plan, en granskning av den
planen, en nedbrytning i arbetspaket, genomförandet, en granskning av
resultatet och publicering. Kraven förvandlade en kort uppdragsbeskrivning
till numrerade påståenden med acceptanskriterier. I det första bygget valde
planen tekniken och låste URL-strukturen, artiklarnas schema och färgpaletten,
med de alternativ den förkastade; i det andra valde den designsystemet.
Nedbrytningen delade upp planen i arbetspaket, vart och ett med ett eget
beviskommando och en agent genomförde dem ett i taget på en lokal gren.

{% figure "stages", "wide" %}

## Vad grundaren granskar

{% figure "loop" %}

Ingenting på den här sajten blir offentligt enbart på en agents ord. Men
det första bygget kördes utan grind: krav, plan och tio arbetspaket gick
igenom på fyra timmar och grundarens omdöme om den färdiga sajten var "en
sida från 90-talet". Det andra bygget satte hans grind vid planen: han valde
en av tre renderade riktningar, svarade på planens öppna frågor och gav sitt
omdöme om resultatet på förhandsvisningen morgonen därpå. Han äger de delar
som ingen agent kan avgöra: formuleringarna om företaget, den svenska texten,
vilka privata projekt som får nämnas och stegen som rör domänen och driften.

## Kvalitetsgrindarna

{% figure "gates" %}

Ett enda kommando kör varje kontroll och samma kommando är inställt att köras
på varje pull request. Det bygger webbplatsen, kontrollerar att varje intern
länk leder någonstans, validerar HTML-koden, kontrollerar strukturen på varje
sida – landmärken, en enda huvudrubrik, en hopplänk, alt-text – mäter
kontrasten för varje färgpar i båda teman, bekräftar att varje engelsk sida
har en svensk motsvarighet och att de två uppsättningarna gränssnittstexter
har samma nycklar, validerar flödena och söker igenom resultatet efter de
fakta som sidorna måste ange. Varje kvalitetsgrind har ett test som bevisar
att den misslyckas när något medvetet har gjorts sönder.

## Två ärliga iakttagelser

Det mesta av det agenterna skrev var inte kod: i det första bygget 6 900 rader
krav, planer, sammanfattningar och granskningar mot 3 700 rader webbplats,
kvalitetsgrindar och tester. Precision i dokumenten betydde mer än finurlighet
i koden: den enda rättning som granskningen krävde var en grind som hade
hårdkodat en platshållare som grundaren ska byta ut.

{% figure "words" %}

Kvalitetsgrindarna fångar mekaniska misstag, inte osanningar: en saknad svensk
sida eller en färg som inte klarar kontrastkravet fångas automatiskt; om en
mening om en produkt är sann kan de däremot inte avgöra. Därför kan fakta om
apparna spåras till en källa – den README som var och en hämtades från och
datumet då den lästes – och grundaren läser ändå allt. Agenterna gjorde också
misstag: en session tog en bokföringspost i stället för sin uppgift och
behövde fjorton minuter för att ta sig runt det.

Webbplatsen är enkel: statisk HTML och CSS, två små skript (ett som växlar
mellan mörkt och ljust läge och ett som tonar in innehållet när du rullar;
sidan fungerar utan båda), ett självhostat typsnitt och inga anrop till tredje
part, ingen webbanalys. Det var ett beslut och den del som spelar roll – att
inget laddas från någon annans servrar – verifieras av en kvalitetsgrind vid
varje bygge.
