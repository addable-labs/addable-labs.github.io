---
title: Lärdomar från att bygga nivå
description: Vad en självskattning av AI-kompetens och AI-mognad för individer och team har lärt oss om angreppssätt och beslut medan den fortfarande är under utveckling.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Fem påståenden, nivå ett till fem, där ett är valt, blir ett radardiagram över sex områden: en persons nivåer i grönt och en teammedlems i grått."
date: 2026-09-23
category: ai-journey             # app-development | ai-journey
translationKey: lessons-from-building-niva
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # true när en person har läst den
---

[nivå](https://erniva.se/) är en självskattning av AI-kompetens och AI-mognad för individer och team.
Den är under utveckling, så det här är ingen berättelse om resultat. Det är en
anteckning om angreppssättet och de beslut som hittills har fattats, skriven
medan de fortfarande är färska.

## Problemet

Det är svårt att veta hur väl man egentligen behärskar AI-verktyg och ännu
svårare att veta var ett team står. Människor skattar sig själva utifrån sin
självbild snarare än utifrån vad de gör och ett teams bild är summan av de
gissningarna. nivå finns för att ersätta den gissningen med något ärligare och
mer användbart.

## Produktens form

{% figure "assessment" %}

Individer väljer, för varje område, det beteendeförankrade påstående – nivå ett
till fem – som stämmer med hur de faktiskt arbetar. De får ett radardiagram, ett
mognadsindex och, per område, en guide till nästa nivå. För team tillkommer
inbjudningar, ett samlat radardiagram, en värmekarta över medlemmar mot områden,
en gapanalys mot målet, trender över tid och målnivåer per område som teamet
själv sätter; formuleringarna av nivåerna förblir nivås egna.
Produkten är tvåspråkig – engelska och svenska – och är byggd på Next.js och
Supabase, med data som lagras i Sverige.

{% figure "team", "wide" %}

## Nuläget

Applikationen nivå är fortfarande under utveckling, men landningssidan är
publicerad och där går det att registrera sig. Applikationsskalet,
språkrutterna, test- och CI-miljön, självskattningen i sig, dess datamodell och
inloggningen är alla på plats. Det som återstår är en noggrann granskning av
guidetexterna och de svenska översättningarna, samt att färdigställa
backoffice-applikationen. Applikationen har ännu inget lanseringsdatum.

## Lärdomar hittills

**Förankra nivåerna i beteende, inte i självbild.** Varje nivå är ett påstående
om hur någon arbetar, inte en etikett man väljer. Att välja mellan konkreta
beskrivningar är svårare att överdriva än att välja en siffra och det gör
guiden till nästa nivå till ett naturligt nästa steg i stället för något som
läggs till i efterhand.

**Skriv planen före koden.** Ett dokument är den auktoritativa planen, ett annat
innehåller begränsningarna och arbetsöverenskommelserna och framsteg och beslut
loggas när de sker. Människor och agenter läser samma filer och ett beslut som
är nedskrivet är ett beslut som testmiljön ser till att vi lever upp till.

{% figure "bilingual" %}

**Var tvåspråkig från första commit.** De engelska och svenska rutterna fanns
innan det fanns några funktioner och gränssnittstexterna för båda språken
ligger i två filer vars nyckeluppsättningar jämförs av ett enhetstest, så att en
saknad översättning stoppar bygget i stället för att skeppas. Den här
sajten har anammat samma regel.

{% figure "harness" %}

**Bygg testmiljön före funktionerna.** Typkontroll, lintning och enhetstester
körs före varje commit, end-to-end-tester prövar den byggda appen och
databasmigreringar får bara läggas till, aldrig ändras. Att börja med
testmiljön är långsammare i början och snabbare för varje commit därefter.

**Skjut upp det som kan vänta.** Vissa integrationer – till exempel mot
HR-system – och vissa moduler i självskattningen skjuts upp tills behovet av dem
är validerat. Vart och ett av de besluten handlar om att först ägna
uppmärksamheten åt kärnan i självskattningen.

## Vad vi inte vet ännu

Om guiderna är tillräckligt användbara för alla användare, om team har nytta av
värmekartan och hur självskattningen beter sig i större skala är öppna frågor
som bara verklig användning kan besvara. Svaren kommer från återkoppling –
därför planerar vi att erbjuda förhandsversioner av moduler, för att kunna putsa
dem lite till innan de blir slutgiltiga. När det finns något att berätta skriver
vi om det här.
