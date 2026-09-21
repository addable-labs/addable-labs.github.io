---
title: Så byggdes den här webbplatsen av agenter
description: Stegen, kvalitetsgrindarna och grundarens granskningar bakom den första webbplats som en agentdriven mjukvarufabrik tog fram från början till slut.
date: 2026-09-20
category: app-development        # app-development | ai-journey
translationKey: how-this-site-was-built-by-agents
draft: true                      # publiceras, men märks "Draft" / "Utkast"
machineTranslated: true          # true tills en person har granskat texten
---

Addable Labs bygger mjukvara till stor del med AI-agenter, och den här
webbplatsen är det första som en agentdriven mjukvarufabrik tog fram åt
företaget från början till slut. Den här artikeln beskriver hur det gick till:
stegen, vad grundaren tittade på och de kontroller som står mellan en agents
ändring och en publicerad sida.

## Stegen

Körningen gick igenom en fast sekvens, och varje steg skrev ett dokument som
nästa steg var tvunget att läsa: krav, en genomförandeplan, en granskning av den
planen, en nedbrytning i arbetspaket, själva genomförandet, en granskning av
resultatet och till sist publicering. Kraven förvandlade en kort
uppdragsbeskrivning till numrerade påståenden med acceptanskriterier. Planen
valde tekniken, låste URL-strukturen, artiklarnas front matter-schema och till
och med färgpaletten med uppmätta kontrastvärden, och förklarade vilka
alternativ den förkastade. Nedbrytningen delade upp planen i arbetspaket, vart
och ett med ett eget beviskommando, och en agent genomförde dem sedan ett i
taget på en lokal gren.

{% figure "stages", "wide" %}

## Vad grundaren granskar

{% figure "loop" %}

Ingenting på den här webbplatsen blir offentligt enbart på en agents ord.
Grundaren granskar kraven, planens beslut och varje commit lokalt innan något
pushas eller slås samman, och äger de delar som ingen agent kan avgöra:
formuleringarna om företaget och dess grundare, den svenska texten, vilka
privata projekt som får nämnas och stegen som rör domänen och driften. Där
agenterna var tvungna att anta något säger planen det och markerar antagandet
för granskning.

## Kvalitetsgrindarna

{% figure "gates" %}

Ett enda kommando kör varje kontroll, och samma kommando körs på varje pull
request. Det bygger webbplatsen, verifierar att varje intern länk pekar på en
riktig sida, validerar HTML-koden, kontrollerar strukturen på varje sida –
landmärken, en enda huvudrubrik, en hopplänk, alt-text på bilder – mäter
kontrasten för varje färgpar i både det ljusa och det mörka temat, bekräftar att
varje engelsk sida har en svensk motsvarighet och att de två uppsättningarna
gränssnittstexter har samma nycklar, validerar flödena och söker igenom
resultatet efter de fakta som sidorna måste ange. Varje kvalitetsgrind har ett
test som bevisar att den misslyckas när något medvetet har gjorts sönder.

## Två ärliga iakttagelser

Det mesta av arbetet gick åt till att skriva ner saker innan någon kod skrevs.
Agenterna fungerade bra överallt där planen var exakt – ett tokennamn, ett
permalänksmönster, ett tröskelvärde – och fick gissa överallt där den var vag.
Precision i dokumenten visade sig betyda mer än finurlighet i koden.

Kvalitetsgrindarna fångar mekaniska misstag, inte osanningar. En saknad svensk
sida, en länk till ingenstans eller en färg som inte klarar kontrastkravet
fångas automatiskt. Om en mening om en produkt är sann kan de däremot inte
avgöra. Därför kan varje faktapåstående på den här webbplatsen spåras till en
källa, oftast ett kodförråds README som läses igen vid bygget, och grundaren
läser ändå allt. Agenterna gjorde också misstag längs vägen: ett
genomförandesteg började på fel arbetspaket och fick lämnas tillbaka, vilket är
precis därför varje steg avslutas med en skriven sammanfattning som en granskare
kan kontrollera.

Webbplatsen i sig är enkel: statisk HTML och CSS, två små skript (ett som
växlar mellan mörkt och ljust läge och ett som tonar in innehållet när du
rullar; sidan fungerar utan båda), ett självhostat typsnitt och inga anrop till
tredje part, ingen webbanalys. Det var ett beslut, inte en slump, och den del
som spelar roll – att inget laddas från någon annans servrar – är en som
kvalitetsgrindarna verifierar vid varje bygge.
