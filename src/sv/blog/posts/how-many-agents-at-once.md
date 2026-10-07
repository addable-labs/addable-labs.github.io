---
title: Hur många agenter fabriken kör samtidigt
description: Vad en andra kodande agent per projekt ändrade i fabriken bakom den här sajten den 26 september 2026 – ändringar blev klara snabbare utan högre tokenkostnad per ändring och gränsen låg i det som agenterna delade.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Fem banor för genomförandeagenter, där två är upptagna i grönt och tre är tomma. Till höger ett lås som släpper igenom ett webbläsarjobb i taget: den första banans jobb håller det medan den andra banans jobb väntar i orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Claude Code och Codex låter båda en person köra flera kodande agenter
samtidigt. För den som redan arbetar med en väcker det en enkel fråga: blir
mer gjort när fler agenter arbetar samtidigt och vad är det som sätter stopp?

Fabriken bakom den här sajten, som beskrivs i [Därför driver vi en
agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/), har
mätt en del av svaret. Dess genomförandeagenter är agentsessioner som var och
en tar en uppgift ur fabrikens ärendehanterare och levererar den. Den 26
september 2026 gick fabriken från en genomförandeagent per projekt till två.
På den här sajten blev en ändring då klar var 26:e minut i stället för var
44:e medan en genomförandeagent körde. Den andra genomförandeagenten gjorde
inte en ändring dyrare i tokens. Mer blev gjort.

Praktiker som skriver om att köra flera agenter samtidigt nämner framför allt
två gränser: att slå samman agenternas arbete och att själva granska det.
Ingen av dem höll tillbaka de här två genomförandeagenterna. De krockade
aldrig i git och grundaren granskar inte varje ändring. Gränsen låg i det som
de delade: ett lås för varje jobb som startar en webbläsare, de fullständiga
testkörningarna som köade till det och minnet i en enda dator.

Sedan den 6 oktober tillåter fabriken fem genomförandeagenter per projekt.
Fem har ännu inte kört sida vid sida.

## Taket steg från en genomförandeagent till fem på tio dagar

I oktober 2026 arbetar fabriken med tre projekt, alla på en dator med 24 GB
minne: den här sajten, [Gaimer](https://github.com/addable-labs/gaimer) och
sitt eget privata kodförråd. Borgmästaren, agenten som samordnar fabriken,
startar en genomförandeagent bara när den har en uppgift åt en. Antalet
genomförandeagenter per projekt är alltså ett tak, inte ett mål: en lugn dag
kör ingen.

| När (UTC) | Tak | Vad som hände |
| --- | ---: | --- |
| Fram till 26 sep | 1 | En genomförandeagent per projekt, i den här sajten och i Gaimer; perioden med en genomförandeagent som jämförs nedan pågick från 25 sep 12:09 till 26 sep 09:50 |
| 26 sep 09:59 | 1 | Grundaren ber om en andra genomförandeagent per projekt, med webbläsarjobben i tur och ordning |
| 26 sep 10:06 | 2 | Borgmästaren höjer taket i båda projekten; varje jobb som startar en webbläsare går genom ett lås |
| 26 sep 10:07–15:31 | 2 | Två genomförandeagenter på den här sajten i fyra par, sida vid sida i 44, 18, 63 och 13 minuter; en mätare loggar datorn varje minut från 10:05 till 16:59 |
| 26 sep, kvällen | 2 | Grundaren sätter regeln för att bedöma steget och får en rapport om 13:09–16:55 |
| 29 sep | 2 | Fabrikens eget kodförråd blir det tredje projektet |
| 6 okt 14:53 | 2 | Grundaren frågar var gränserna för tokens och agenter finns; borgmästaren svarar att båda står i fabrikens inställningar |
| 6 okt 15:01–15:02 | 5 | Grundaren ber om fem agenter; från 15:02 är taket fem i vart och ett av de tre projekten |

En andra gräns gäller varje session. Fabrikens inställningar ger modellen ett
fönster på 1 000 000 tokens. Sedan grundarens beslut den 23 september råder
Gas City – orkestreringsverktyget som fabriken körs på – en session att lämna
över sitt arbete till en ny från 25 % av fönstret och uppmanar till det från
30 %. [En studie av borgmästarens
kontext](/sv/blog/what-the-mayors-context-costs/) visar vad
överlämningspunkten gör med kostnaden.

## En andra genomförandeagent höjde takten

Den 26 september skrev grundaren: "Jag tycker att vi borde prova att lägga
till en agent till per rig och se hur det påverkar prestandan.
Verifieringsjobben borde köras i tur och ordning på något sätt så att vi inte
kör för många Chrome-instanser" (vår översättning). Gas City kallar ett
projekt för en rig. Borgmästaren höjde taket till två och från och med då gick
varje jobb som startar Chrome eller WebKit – till exempel en kontroll- eller
testkörning för sajten – genom ett lås: ett jobb i taget i hela fabriken, med
varje väntan och körning loggad. En mätare loggade datorns belastning, minne,
växlingsutrymme (swap) och webbläsarprocesser varje minut.

Samma kväll satte grundaren regeln för att bedöma steget: mät avslutade
sessioner – deras tokens, tid, väntan och fel – och om genomförandeagenterna
kom i vägen för varandra, utan påhittade tester eller omspelningar.

| Sajtens genomförandeagenter | En | Två |
| --- | ---: | ---: |
| Avslutade sessioner | 17 | 8 |
| Klara ändringar | 13 | 11 |
| Tokens per ändring, median (miljoner) | 26,3 | 19,2 |
| Sessionsminuter per ändring | 44 | 39 |
| Minuter med en genomförandeagent igång, per ändring | 44 | 26 |

Vinsten står på sista raden. En sessions tokens och minuter delas lika mellan
de ändringar den arbetade med. Uppgifterna skilde sig åt, så tokens visar bara
att en andra genomförandeagent inte gjorde en ändring dyrare.

## De två genomförandeagenterna väntade på det som de delade

De två genomförandeagenterna kom inte direkt i vägen för varandra. Var och en
arbetade i en egen arbetskatalog i git (worktree), aldrig i projektets
huvudutcheckning. [Guiden till arbetskataloger i
Codex](https://learn.chatgpt.com/docs/environments/git-worktrees) säger att
samma isolering låter flera chattar arbeta i ett projekt "utan att störa
varandra" (vår översättning). Inget kommando från den ena rörde den andras
arbetskatalog eller processer, inget git-kommando föll på ett lås eller en
konflikt och ingen push avvisades. De möttes en gång, i en anteckning som
genomförandeagenterna delar: den ena skrev om den medan den andra, som hade
läst den, fortfarande arbetade. Den andras egen kontroll stoppade senare dess
ändring eftersom texten hade ändrats.

{% figure "lock", "wide" %}

Figuren visar dagen. Av de 97 jobb som tog låset väntade 17, sammanlagt 43
minuter. De längsta väntetiderna kom medan de två genomförandeagenternas
fullständiga test- och kontrollkörningar turades om. Ungefär då tog en
fullständig testkörning tre till fem gånger så lång tid som senare på
eftermiddagen. En genomförandeagent körde dessutom skärmdumpsskript, som
startar Chrome, nio gånger utanför låset under sin första halvtimme; regeln
nämner nu skärmdumpar och prober.

| Låset och datorn den 26 september | Uppmätt |
| --- | ---: |
| Jobb som tog låset, 10:09–15:34 UTC | 97 |
| Jobb som väntade, alla genomförandeagenternas | 17 |
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
medan ett jobb höll låset. Rapporten som grundaren fick samma kväll kom fram
till att två genomförandeagenter får plats, med låset.

## En landad ändring kostade genomförandeagenterna 12,9 till 22,3 miljoner tokens

[Claude Codes guide till att köra agenter
parallellt](https://code.claude.com/docs/en/agents) varnar för att flera
sessioner samtidigt mångdubblar tokenanvändningen. Per ändring steg
användningen inte med fabrikens andra genomförandeagent; tabellen visar vad en
ändring kostade över längre perioder. En landad ändring är en commit som
nådde ett projekts huvudgren och genomförandeagenternas tokens är dem från
alla deras sessioner under perioden.

| Tokens per landad ändring (miljoner) | Genomförandeagenter | Borgmästaren | Ändringar |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 sep | 12,9 | 4,1 | 83 |
| Den här sajten, 24–26 sep | 22,3 | – | 42 |
| Fabrikens eget kodförråd, 29 sep–6 okt | 18,3 | – | 13 |

Samordningen kommer ovanpå: i Gaimer, det enda projekt där borgmästarens
andel är räknad, lade borgmästaren till 4,1 miljoner tokens per ändring.

## Borgmästarens start kostade mer när det fanns lite arbete

Den 28 september bad grundaren att två av borgmästarens mätningar skulle med i
den här artikeln; räknad igen den 6 oktober med samma skript kom en landad
ändring i Gaimer till 16,9 miljoner tokens, mot de 17 till 18 miljoner som
borgmästaren först satte den till.

| Borgmästarens sessioner som handlade (medianen av ett jämnt antal är det övre mittersta värdet) | 24–28 sep | 28 sep–5 okt |
| --- | ---: | ---: |
| Sessioner | 22 | 8 |
| Tokens före den första utåtriktade handlingen (ett svar, ett utskickat uppdrag, en skriven uppgift, ett mejl, en commit eller en redigering), median | 30 600 | 108 300 |
| Startinnehåll i första anropet, median | 42 700 | 43 300 |
| Första turen: anteckningar, lägeskontroll, bevakningar, medel | 26 300 | 27 400 |
| Läsning för uppgiften före handlingen, medel | 5 100 | 44 100 |
| Handlade först efter sin första tur | 4 | 7 |

En start – de tokens som läggs till före den första utåtriktade handlingen –
steg från 30 600 till 108 300 medan startinnehållet och den första turen
knappt ändrades: när ingen genomförandeagent körde i den här sajten eller i
Gaimer från den 28 september till den 5 oktober väntade och läste
borgmästaren innan den handlade.

## Fem genomförandeagenter är tillåtna men ännu inte uppmätta

Sedan den 6 oktober är taket fem genomförandeagenter i vart och ett av de tre
projekten, på grundarens begäran. Borgmästaren berättade för honom vad som
inte hade ändrats: webbläsarjobb körs fortfarande ett i taget och datorn
använder redan växlingsutrymme. Fem genomförandeagenter skulle dela låset och
datorn som två redan delade.

Första gången fler än två genomförandeagenter kör sida vid sida mäter
borgmästaren tiden per uppgift och datorns belastning med mätaren igång igen.
Steget bedöms efter grundarens regel från den 26 september.

Den 6 oktober frågade grundaren också om fabrikens roller passade dess arbete
– som enligt honom mest bestod av artiklar – och lade till tre av de fem
saknade roller som borgmästaren nämnde: en skribent, en faktagranskare och en
redaktör för svenskan. Det följs upp om de två andra – en illustratör och en
analytiker – behövs för att avlasta borgmästaren.

## Vad siffrorna inte visar

- En dag med två genomförandeagenter, på en dator och med olika uppgifter:
  tokens per ändring jämför uppgifterna lika mycket som uppsättningarna.
- Borgmästarens tokens för den här sajten och fabrikens eget kodförråd är
  inte skilda från resten av dess arbete.
- Grundaren granskar inte varje ändring, så siffrorna säger ingenting om en
  uppsättning där en person granskar varje ändring.
