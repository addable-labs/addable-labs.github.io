---
title: Hur många agenter fabriken kör samtidigt
description: Vad en andra kodande agent per projekt ändrade i fabriken bakom den här sajten den 26 september 2026, vad tre samtidigt gjorde den 15 november och vad en start för borgmästaren och en landad ändring kostade från september till november.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Fem banor för byggare, där två är upptagna i grönt och tre är tomma. Till höger ett lås som släpper igenom ett webbläsarjobb i taget: den första banans jobb håller det medan den andra banans jobb väntar i orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Claude Code och Codex låter båda en person köra flera kodande agenter samtidigt.
För den som redan arbetar med en väcker det en enkel fråga: blir mer gjort när
fler agenter arbetar samtidigt och vad är det som sätter stopp?

Fabriken bakom den här sajten, som beskrivs i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/),
har mätt en del av svaret. Dess byggare är agentsessioner som var och en tar en
uppgift ur fabrikens ärendehanterare och levererar den. Den 26 september 2026
gick fabriken från en byggare per projekt till två. På den här sajten blev en
ändring då klar var 26:e minut i stället för var 44:e medan en byggare körde.
Den andra byggaren gjorde inte en ändring dyrare i tokens. Mer blev gjort.

Praktiker nämner framför allt två gränser: att slå samman agenternas arbete och
att granska det. Ingen av dem höll tillbaka de här två byggarna. De krockade
aldrig i git och grundaren granskar inte varje ändring. Gränsen låg i det som de
delade: ett lås för varje jobb som startar en webbläsare, de fullständiga
testkörningarna som köade till det och minnet i en enda dator.

Den 15 november körde tre byggare sida vid sida på den här sajten – flest som de
kvarvarande uppgifterna visar. Återigen köade de till låset: 18 av dagens 62
webbläsarjobb väntade på det, sammanlagt 245 minuter. Fem samtidigt – tillåtet
sedan den 6 oktober – återstår.

## Taket steg från en byggare till fem på tio dagar

I november 2026 har fabriken fortfarande tre projekt på en dator med 24 GB
minne: den här sajten, [Gaimer](https://github.com/addable-labs/gaimer) och sitt
eget privata kodförråd. Allt arbete i november gick till den här sajten, där fem
agenter till skriver, granskar och redigerar artiklarna. Borgmästaren, agenten
som samordnar fabriken, startar en byggare bara när den har en uppgift åt en.
Antalet byggare per projekt är alltså ett tak, inte ett mål.

Taket började på en byggare per projekt. Den 26 september bad grundaren om en
andra och några minuter senare höjde borgmästaren taket till två i den här
sajten och i Gaimer. Fabrikens eget kodförråd blev det tredje projektet den 29
september. Den 6 oktober bad grundaren om fem agenter och taket blev fem i varje
projekt. Samma kväll lade han till en skribent, en faktagranskare och en
redaktör för svenskan. En redaktör för engelskan och en utredare (researcher)
följde inom ett dygn.

En andra gräns gäller varje session. Fabrikens inställningar ger modellen ett
fönster på 1 000 000 tokens. Gas City – orkestreringsverktyget som fabriken körs
på – råder en session att lämna över sitt arbete till en ny från 25 % av
fönstret och uppmanar till det från 30 %.
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
visar effekten på kostnaden. Sedan oktober har Claude Code också
[komprimerat en lång konversation som ligger overksam i ungefär en timme](https://code.claude.com/docs/en/settings-reference#idlecompaction),
innan dess cache löper ut, så en av borgmästarens sessioner varade från 31
oktober till 15 november.

## En andra byggare höjde takten

Den 26 september skrev grundaren: "Jag tycker att vi borde prova att lägga till
en agent till per rig och se hur det påverkar prestandan. Verifieringsjobben
borde köras i tur och ordning på något sätt så att vi inte kör för många
Chrome-instanser" (vår översättning). Gas City kallar ett projekt för en rig.
Borgmästaren höjde taket till två och från och med då gick varje jobb som
startar Chrome eller WebKit – till exempel en kontroll- eller testkörning för
sajten – genom ett lås: ett jobb i taget i hela fabriken, med varje väntan och
körning loggad. En mätare loggade datorns belastning, minne, växlingsutrymme
(swap) och webbläsarprocesser varje minut medan de två byggarna körde.

Samma kväll satte grundaren regeln för att bedöma steget: mät avslutade
sessioner – deras tokens, tid, väntan och fel – och om byggarna kom i vägen för
varandra, utan påhittade tester eller omspelningar.

| Sajtens byggare | En byggare, 25–26 sep | Två byggare, 26 sep | Övriga sessioner, 14–20 nov | Tre sida vid sida, 15 nov |
| --- | ---: | ---: | ---: | ---: |
| Avslutade sessioner | 17 | 8 | 11 | 3 |
| Klara ändringar | 13 | 11 | 12 | 3 |
| Tokens per ändring, median (miljoner) | 26,3 | 19,2 | 7,9 | 16,1 |
| Sessionsminuter per ändring | 44 | 39 | 29 | 166 |
| Minuter med en byggare igång, per ändring | 44 | 26 | 29 | 74 |

Vinsten med den andra byggaren står på sista raden. En sessions tokens och
minuter delas lika mellan de ändringar den arbetade med. Uppgifterna skilde sig
åt, så tokens per ändring jämför uppgifterna lika mycket som uppsättningarna.
Den 15 november gick sista raden åt andra hållet: med tre byggare sida vid sida
tog en ändring 74 minuter med en byggare igång, mot 29 för novembers övriga
sessioner, även om bara tre ändringar blev klara. En ändring finns med i båda
novemberkolumnerna. I november var uppgifterna främst illustrationer, omslag,
namnbyten och publiceringssteg.

## Byggarna väntade på det som de delade

De två byggarna kom inte direkt i vägen för varandra. Var och en arbetade i en
egen arbetskatalog i git (worktree), aldrig i projektets huvudutcheckning.
[Guiden till arbetskataloger i Codex](https://learn.chatgpt.com/docs/environments/git-worktrees)
säger att samma isolering låter flera chattar arbeta i ett projekt "utan att
störa varandra" (vår översättning). Inget kommando från den ena rörde den andras
arbetskatalog eller processer, inget git-kommando föll på ett lås eller en
konflikt och ingen push avvisades. De möttes en gång, i en anteckning som
byggarna delar: den ena skrev om den medan den andra fortfarande arbetade och
den andras egen kontroll stoppade ändringen eftersom texten hade ändrats.

{% figure "lock", "wide" %}

Figuren visar dagen. Av de 97 jobb som tog låset väntade 17, sammanlagt 43
minuter. De längsta väntetiderna kom medan de två byggarnas fullständiga test-
och kontrollkörningar turades om.

| Låset och datorn den 26 september | Uppmätt |
| --- | ---: |
| Jobb som tog låset, 10:09–15:34 UTC | 97 |
| Jobb som väntade, alla byggarnas | 17 |
| Minuter av väntan, sammanlagt | 43 |
| De tre längsta väntetiderna, 13:55–14:18 UTC (minuter tillsammans) | 21 |
| Godkända fullständiga testkörningar, 14:10–14:40 UTC (sekunder) | 441 och 467 |
| Godkända fullständiga testkörningar efter 15:00 UTC (sekunder) | 87–137 |
| En underkänd fullständig testkörning strax före dem (minuter) | 8,9 |
| Varav i ett känt instabilt webbläsartest (minuter) | 7,5 |
| Använt växlingsutrymme medan det steg (GB) | 2,7 → 8,1 |
| Ledigt minne (%) | 33–68 |
| Chrome-processer utan fönster samtidigt, som mest | 9 |
| Belastning över en minut, median, när ett jobb höll låset | 34 |
| Belastning över en minut, median, när låset var ledigt | 6,5 |
| Belastning över en minut, topp klockan 12:37 UTC | 219 |

Datorn höll: det lediga minnet sjönk aldrig under en tredjedel, även om det
använda växlingsutrymmet steg till 8,1 GB och belastningen låg mycket högre
medan ett jobb höll låset.

## Tre samtidigt, den 15 november

Den 15 november körde tre byggare sida vid sida på den här sajten i 130 minuter:
två lade till en andra illustration till del 6 respektive del 7 av serien om
AI-agenter och den tredje gjorde den fjärde omgången av namnbytet på produkten
på sajten. Var och en väntade sammanlagt ungefär en timme på låset och den
längsta enskilda väntan var 44 minuter. Låset var inte längre bara deras:
skribentens kontrollkörning av en annan artikel höll det i 48 minuter medan alla
tre köade. Skribenten tar, liksom de andra agenterna som arbetar med artiklarna,
samma lås som byggarna.

| Låset | 26 sep, två byggare | 15 nov, tre byggare |
| --- | ---: | ---: |
| Jobb som tog låset, hela dagen | 102 | 62 |
| Jobb som väntade | 17 | 18 |
| Minuter av väntan, sammanlagt | 43 | 245 |
| Längsta enskilda väntan (minuter) | 8,5 | 44 |
| Vilka som väntade | Bara byggare | Byggare och skribenten |

Datorns mätare hade slutat köra i slutet av oktober, så datorns minne och
växlingsutrymme den 15 november är inte kända. Siffrorna visar att de tre köade
till låset, inte om datorn fick slut på resurser.

## En landad ändring kostade byggarna 12,9 till 22,3 miljoner tokens

[Claude Codes guide till att köra agenter parallellt](https://code.claude.com/docs/en/agents)
varnar för att flera sessioner samtidigt mångdubblar tokenanvändningen. Tabellen
visar vad en landad ändring – en commit som nådde ett projekts huvudgren –
kostade över längre perioder. Byggarnas tokens är dem från alla deras sessioner
under perioden.

| Tokens per landad ändring (miljoner) | Byggare | Borgmästaren | Ändringar |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 sep | 12,9 | 4,1 | 83 |
| Den här sajten, 24–26 sep | 22,3 | – | 42 |
| Fabrikens eget kodförråd, 29 sep–6 okt | 18,3 | – | 13 |
| Den här sajten, 1–20 nov | 17,5 | 32,4 | 12 |

Samordningen kommer ovanpå. I september räknades borgmästarens andel bara i
Gaimer: 4,1 miljoner tokens per ändring. Till och med den 20 november landade
sajten 12 ändringar och de andra två projekten ingen, så alla borgmästarens
tokens räknas på sajten: 32,4 miljoner per ändring, en övre gräns, eftersom de
också omfattar granskningssidor, kontroller av leverantörers sidor och utkast
som inte har landat. Agenterna som skriver, granskar och redigerar artiklarna
använde ytterligare 62,0 miljoner tokens per landad ändring.

## Borgmästarens start kostade mer när det fanns lite arbete

| Borgmästarens sessioner som handlade (medianen av ett jämnt antal är det övre mittersta värdet) | 24–28 sep | 28 sep–5 okt | 31 okt–20 nov |
| --- | ---: | ---: | ---: |
| Sessioner | 22 | 8 | 5 |
| Tokens före den första utåtriktade handlingen (ett svar, ett utskickat uppdrag, en skriven uppgift, ett mejl, en commit eller en redigering), median | 30 600 | 108 300 | 15 300 |
| Startinnehåll i första anropet, median | 42 700 | 43 300 | 51 600 |
| Första turen: anteckningar, lägeskontroll, bevakningar, medel | 26 300 | 27 400 | 15 000 |
| Läsning för uppgiften före handlingen, medel | 5 100 | 44 100 | 2 900 |
| Handlade först efter sin första tur | 4 | 7 | 2 |

En start – de tokens som läggs till före den första utåtriktade handlingen –
steg från 30 600 till 108 300 medan startinnehållet och den första turen knappt
ändrades: när ingen byggare körde i den här sajten eller i Gaimer från den 28
september till den 5 oktober väntade och läste borgmästaren innan den handlade.
Från den 31 oktober till den 20 november startade den bara fem sessioner som
handlade: de började med mer startinnehåll, i median 51 600 tokens, men lade
till en median på 15 300 före sin första handling. Sedan den 11 oktober svarar
borgmästaren också grundaren på granskningssidor, vilket räkningen bortser från.

## Fem byggare är tillåtna men har inte kört tillsammans

Sedan den 6 oktober är taket fem byggare i vart och ett av de tre projekten.
Borgmästaren berättade för grundaren vad som inte hade ändrats: webbläsarjobb
körs fortfarande ett i taget och datorn använder redan växlingsutrymme. Fem
byggare skulle dela låset och datorn som två redan delade. Den 15 november
väntade tre redan ungefär en timme var på låset.

## Vad siffrorna inte visar

- En dag med två byggare och en eftermiddag med tre, på en dator och med olika
  uppgifter.
- Om de tre byggarna den 15 november kom i vägen för varandra i git eller i
  filer har inte undersökts.
- Transkripten från före slutet av oktober finns inte längre, så siffrorna för
  september och oktober kommer från de mätningar som gjordes då.
- Under större delen av november körde borgmästaren och byggarna på en annan
  modell.
- Grundaren granskar inte varje ändring, så siffrorna säger ingenting om en
  uppsättning där en person granskar varje ändring.
