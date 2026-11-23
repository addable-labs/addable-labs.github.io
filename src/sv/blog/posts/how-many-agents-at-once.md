---
title: Hur många agenter fabriken kör samtidigt
description: Vad en kodande AI-agent till per projekt ändrade i fabriken bakom den här sajten den 26 september 2026, hur det gick när tre körde samtidigt den 15 november och vad borgmästarens start och en ändring på main kostade från september till november.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Fem banor för byggare: två är upptagna (gröna) och tre är tomma. Till höger finns ett lås som släpper igenom ett webbläsarjobb i taget. Jobbet i den första banan har låset och jobbet i den andra väntar, i orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I både Claude Code och Codex kan en person köra flera kodande AI-agenter
samtidigt. För den som redan kör en agent ligger frågorna nära till hands. Blir
det mer gjort när fler agenter arbetar samtidigt? Och var går gränsen?

Fabriken bakom den här sajten, som beskrivs i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/),
har mätt en del av svaret. Byggarna är agentsessioner som var och en tar en
bead – en uppgift i fabrikens ärendehanterare – och levererar den. Den 26
september 2026 gick fabriken från en byggare per projekt till två. På den här
sajten blev en ändring därefter klar var 26:e minut i stället för var 44:e,
räknat på tiden då en byggare var igång. Antalet tokens per ändring ökade inte.
Det blev mer gjort.

Utvecklare nämner framför allt två begränsningar: att merga agenternas arbete
och att granska det. Ingen av dem bromsade de här två byggarna. De fick aldrig
några konflikter i git och grundaren granskar inte varje ändring. Det som
begränsade dem var det de delade: ett lås för varje jobb som startar en
webbläsare, de fullständiga testkörningarna som köade till det och minnet i en
enda dator.

Den 15 november körde tre byggare parallellt på den här sajten, som mest enligt
de uppgifter som finns kvar. Även då fick de köa till låset: 18 av dagens 62
webbläsarjobb väntade på det, sammanlagt 245 minuter. Fem samtidigt har varit
tillåtet sedan den 6 oktober men har ännu inte körts.

## Taket steg från en byggare till fem på tio dagar

I november 2026 har fabriken fortfarande tre projekt på en dator med 24 GB
minne: den här sajten, [Gaimer](https://github.com/addable-labs/gaimer) och ett
eget privat repo. Allt arbete i november gällde den här sajten, där fem
agenter till skriver, granskar och redigerar artiklarna. Borgmästaren, agenten
som samordnar fabriken, startar en byggare först när det finns en bead åt den.
Antalet byggare per projekt är alltså ett tak, inte ett mål.

Taket var från början en byggare per projekt. Den 26 september bad grundaren om
en byggare till och några minuter senare höjde borgmästaren taket till två på den
här sajten och i Gaimer. Fabrikens eget repo blev det tredje projektet den 29
september. Den 6 oktober bad grundaren om fem agenter och taket blev fem i varje
projekt. Samma kväll lade han till en skribent, en faktagranskare och en
redaktör för svenska. En redaktör för engelska och en researcher kom till inom
ett dygn.

Varje session har dessutom en egen begränsning. Med fabrikens inställningar har
modellen ett kontextfönster på 1 000 000 tokens. Gas City, orkestreringsverktyget
som fabriken körs på, rekommenderar att en session lämnar över arbetet till en
ny från 25 % av fönstret och uppmanar till det från 30 %.
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
visar hur det påverkar kostnaden. Sedan oktober komprimerar Claude Code också
[en lång session som har stått inaktiv i ungefär en timme](https://code.claude.com/docs/en/settings-reference#idlecompaction),
strax innan sessionens promptcache går ut. Därför kunde en av borgmästarens
sessioner pågå från 31 oktober till 15 november.

## En byggare till höjde tempot

Den 26 september skrev grundaren: "Jag tycker att vi borde prova att lägga till
en agent till per rig och se hur det påverkar prestandan. Verifieringsjobben
borde köras i tur och ordning på något sätt så att vi inte kör för många
Chrome-instanser" (vår översättning). Gas City kallar ett projekt för en rig.
Borgmästaren höjde taket till två. Från och med då kördes varje jobb som startar
Chrome eller WebKit, till exempel en kontroll- eller testkörning av sajten, via
ett lås: bara ett jobb åt gången i hela fabriken. Varje väntan och körning
loggades. Ett mätskript loggade datorns belastning (load average över en
minut), minne, swap och webbläsarprocesser varje minut medan de två byggarna
körde.

Samma kväll bestämde grundaren hur steget skulle utvärderas: att mäta
avslutade sessioner – tokens, tid, väntetider och fel – och se om byggarna
störde varandra, utan påhittade tester eller replays.

| Sajtens byggare | En byggare, 25–26 sep | Två byggare, 26 sep | Övriga sessioner, 14–20 nov | Tre parallellt, 15 nov |
| --- | ---: | ---: | ---: | ---: |
| Avslutade sessioner | 17 | 8 | 11 | 3 |
| Klara ändringar | 13 | 11 | 12 | 3 |
| Tokens per ändring, median (miljoner) | 26,3 | 19,2 | 7,9 | 16,1 |
| Sessionsminuter per ändring | 44 | 39 | 29 | 166 |
| Minuter med en byggare igång, per ändring | 44 | 26 | 29 | 74 |

Vinsten med den andra byggaren syns på sista raden. En sessions tokens och
minuter fördelas lika på de ändringar den arbetade med. Eftersom uppgifterna var
olika är en jämförelse av tokens per ändring lika mycket en jämförelse av
uppgifter som av upplägg. Den 15 november gick sista raden åt andra hållet: med
tre byggare parallellt och bara tre klara ändringar krävde en ändring 74
minuter med en byggare igång, mot 29 för novembers övriga sessioner. En ändring
finns med i båda novemberkolumnerna. I november var uppgifterna främst
illustrationer, omslag, namnbyten och publiceringssteg.

## Byggarna väntade på det de delade

De två byggarna kom inte direkt i vägen för varandra. Var och en arbetade i en
egen worktree, aldrig i projektets vanliga checkout.
[Codex guide till worktrees](https://learn.chatgpt.com/docs/environments/git-worktrees)
säger att samma isolering gör att flera chattar kan arbeta i ett projekt "utan
att störa varandra" (vår översättning). Inget kommando från den ena byggaren
rörde den andras worktree eller processer, inget git-kommando misslyckades på
grund av ett lås eller en konflikt och ingen push avvisades. De krockade bara en
gång, i en anteckning som byggarna delar. Den ena skrev om den medan den andra
fortfarande arbetade. Den andras egen kontroll stoppade då ändringen eftersom
anteckningen hade ändrats.

{% figure "lock", "wide" %}

Figuren visar dagen. Av de 97 jobb som tog låset fick 17 vänta, sammanlagt 43
minuter. De längsta väntetiderna kom medan de två byggarnas fullständiga test-
och kontrollkörningar turades om.

| Låset och datorn den 26 september | Uppmätt |
| --- | ---: |
| Jobb som tog låset, 10:09–15:34 UTC | 97 |
| Jobb som väntade (alla byggarnas) | 17 |
| Väntetid sammanlagt (minuter) | 43 |
| De tre längsta väntetiderna, 13:55–14:18 UTC (minuter tillsammans) | 21 |
| Godkända fullständiga testkörningar, 14:10–14:40 UTC (sekunder) | 441 och 467 |
| Godkända fullständiga testkörningar efter 15:00 UTC (sekunder) | 87–137 |
| En misslyckad fullständig testkörning strax före dem (minuter) | 8,9 |
| Varav i ett känt flaky webbläsartest (minuter) | 7,5 |
| Använd swap, från–till (GB) | 2,7 → 8,1 |
| Ledigt minne (%) | 33–68 |
| Headless Chrome-processer samtidigt, som mest | 9 |
| Load average över en minut, median, när ett jobb höll låset | 34 |
| Load average över en minut, median, när låset var ledigt | 6,5 |
| Load average över en minut, topp klockan 12:37 UTC | 219 |

Datorn klarade det: det lediga minnet sjönk aldrig under en tredjedel, trots att
swapen steg till 8,1 GB och load average var mycket högre medan ett jobb höll
låset.

## Tre samtidigt, den 15 november

Den 15 november körde tre byggare parallellt på den här sajten i 130 minuter:
två lade till ytterligare en illustration i del 6 respektive del 7 av serien om
AI-agenter och den tredje gjorde den fjärde omgången av produktens namnbyte på
sajten. Var och en väntade sammanlagt ungefär en timme på låset. Den längsta
enskilda väntan var 44 minuter. Låset var inte längre bara byggarnas:
skribentens kontrollkörning av en annan artikel höll det i 48 minuter medan alla
tre stod i kö. Skribenten använder samma lås som byggarna, liksom de andra
agenterna som arbetar med artiklarna.

| Låset | 26 sep, två byggare | 15 nov, tre byggare |
| --- | ---: | ---: |
| Jobb som tog låset, hela dagen | 102 | 62 |
| Jobb som väntade | 17 | 18 |
| Väntetid sammanlagt (minuter) | 43 | 245 |
| Längsta enskilda väntan (minuter) | 8,5 | 44 |
| Vem som väntade | Bara byggare | Byggare och skribenten |

Mätskriptet hade slutat köra i slutet av oktober, så minne och swap den 15
november är okända. Siffrorna visar att de tre köade till låset men inte om
datorn fick ont om resurser.

## En ändring på main kostade byggarna 12,9 till 22,3 miljoner tokens

[Claude Codes guide till att köra agenter parallellt](https://code.claude.com/docs/en/agents)
varnar för att flera sessioner samtidigt mångdubblar tokenanvändningen. Tabellen
visar vad en ändring på main – en commit som hamnade på ett projekts
huvudgren (main) – kostade under längre perioder. Byggarnas tokens är de från alla byggarsessioner
under perioden.

| Tokens per ändring på main (miljoner) | Byggare | Borgmästaren | Ändringar |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 sep | 12,9 | 4,1 | 83 |
| Den här sajten, 24–26 sep | 22,3 | – | 42 |
| Fabrikens eget repo, 29 sep–6 okt | 18,3 | – | 13 |
| Den här sajten, 1–20 nov | 17,5 | 32,4 | 12 |

Sedan tillkommer samordningen. I september räknades borgmästarens andel bara för
Gaimer: 4,1 miljoner tokens per ändring. Fram till den 20 november hade sajten
fått 12 ändringar på main och de andra två projekten ingen, så alla
borgmästarens tokens räknas på sajten: 32,4 miljoner per ändring. Det är en övre
gräns, eftersom de också går åt till sidor där grundaren läser en ändring innan
den publiceras, till kontroller av leverantörernas sidor och till utkast som
inte har mergats till main. Agenterna som skriver, granskar och redigerar artiklarna
använde ytterligare 62,0 miljoner tokens per ändring på main.

## Borgmästarens start kostade mer när det fanns lite arbete

| Borgmästarens sessioner med en utåtriktad handling (vid ett jämnt antal är medianen det övre av de två mittersta värdena) | 24–28 sep | 28 sep–5 okt | 31 okt–20 nov |
| --- | ---: | ---: | ---: |
| Sessioner | 22 | 8 | 5 |
| Tokens före den första utåtriktade handlingen (ett svar, ett utskickat uppdrag, en skriven bead, ett mejl, en commit eller en redigering), median | 30 600 | 108 300 | 15 300 |
| Startinnehåll i första anropet, median | 42 700 | 43 300 | 51 600 |
| Första varvet: anteckningar, lägeskontroll, bevakningar, genomsnitt | 26 300 | 27 400 | 15 000 |
| Läsning för uppgiften före den första handlingen, genomsnitt | 5 100 | 44 100 | 2 900 |
| Agerade först efter första varvet | 4 | 7 | 2 |

En start – de tokens som läggs till före den första utåtriktade handlingen –
steg från 30 600 till 108 300 medan startinnehållet och det första varvet knappt
ändrades. Från den 28 september till den 5 oktober körde ingen byggare på den
här sajten eller i Gaimer. Då väntade och läste borgmästaren innan den agerade.
Från den 31 oktober till den 20 november startade den bara fem sessioner som
agerade: de började med mer startinnehåll, i median 51 600 tokens, men lade till
i median 15 300 före den första handlingen. Sedan den 11 oktober svarar
borgmästaren dessutom på grundarens kommentarer på sidor där en ändring läses
innan den publiceras, vilket inte ingår i räkningen.

## Fem byggare är tillåtna men har inte kört tillsammans

Sedan den 6 oktober är taket fem byggare i vart och ett av de tre projekten.
Borgmästaren berättade för grundaren vad som inte hade ändrats: webbläsarjobb
körs fortfarande ett i taget och datorn använder redan swap. Fem byggare skulle
få dela på låset och datorn, vilket två redan gjorde. Den 15 november väntade tre
redan ungefär en timme var på låset.

## Vad siffrorna inte visar

- Bara en dag med två byggare och en eftermiddag med tre, på en dator och med
  olika uppgifter.
- Det har inte undersökts om de tre byggarna den 15 november kom i vägen för
  varandra i git eller i filer.
- Transkripten från före slutet av oktober finns inte kvar, så siffrorna för
  september och oktober kommer från mätningar som gjordes då.
- Under större delen av november körde borgmästaren och byggarna på en annan
  modell.
- Grundaren granskar inte varje ändring, så siffrorna säger ingenting om ett
  upplägg där en person granskar varje ändring.
