---
title: Hur många agenter fabriken kör samtidigt
description: De två gränserna för hur mycket fabriken bakom den här sajten gör samtidigt, vad två genomförandeagenter per projekt mätte den 26 september 2026, vad en start för borgmästaren och en landad ändring kostade då och nu samt steget till fem.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Fem banor för genomförandeagenter, där två är upptagna i grönt och tre är tomma. Till höger ett lås som släpper igenom ett webbläsarjobb i taget: den första banans jobb håller det medan den andra banans jobb väntar i orange."
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: how-many-agents-at-once
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

## Sammanfattning

Två gränser avgör hur mycket
[fabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här sajten gör
samtidigt: hur många tokens en agentsession rymmer innan den lämnar över sitt
arbete till en ny och hur många genomförandeagenter som kör i ett projekt på
en gång. En genomförandeagent är en agentsession som tar en bead och levererar
den; en bead är en uppgift i fabrikens ärendehanterare. Gas City kallar ett
projekt för en rig; den här artikeln säger projekt.

Den andra gränsen var en genomförandeagent per projekt fram till den 26
september 2026, två från den dagen och fem sedan den 6 oktober. Med två kom en
regel: ett jobb som startar en webbläsare väntar på sin tur vid ett enda lås.
Den 26 september körde fyra par genomförandeagenter sida vid sida på den här
sajten och möttes en gång, i en gemensam anteckning. 17 av 97 webbläsarjobb
väntade på låset i sammanlagt 43 minuter. Medan en genomförandeagent körde
blev en ändring klar var 26:e minut i stället för var 44:e.

Den 28 september mätte borgmästaren, agenten som samordnar fabriken, vad en
start av en av dess sessioner och en landad ändring kostade. Mätt igen den 6
oktober tog en start 108 300 tokens i stället för 30 600: fabriken hade lite
arbete och borgmästaren väntade innan den handlade, medan själva starten
knappt växte. Fem genomförandeagenter har ännu inte kört sida vid sida.

## Två gränser

Den första gränsen gäller per session. Fabrikens inställningar anger modellens
fönster till 1 000 000 tokens. Gas City råder en session att lämna över från
25 % av det (250 000 tokens) och uppmanar till det från 30 % (300 000):
grundarens beslut den 23 september. Vad överlämningspunkten gör med en
sessions kostnad är ämnet för [En studie av borgmästarens
kontext](/sv/blog/what-the-mayors-context-costs/).

Den andra gränsen gäller per projekt: hur många genomförandeagenter som får
köra på en gång. Den är ett tak, inte ett mål. En genomförandeagent startar
bara när borgmästaren skickar en bead till den, så en lugn dag kör ingen.
Fabriken arbetar nu med tre projekt, den här sajten,
[Gaimer](https://github.com/addable-labs/gaimer) och sitt eget privata
repository, alla på en dator med 24 GB minne.

## En genomförandeagent, sedan två

Den 26 september klockan 09:59 UTC skrev grundaren: "I think we should try
adding another agent per rig and see how that affects performance. The
verification jobs should be sequenced somehow so we don't run too many chrome
instances". Klockan 10:06 höjde borgmästaren taket till två i dåtidens båda
projekt. Varje verifieringsjobb som startar Chrome eller WebKit, till exempel
en kontroll- eller testkörning för sajten, gick genom ett lås: ett jobb i
taget i hela fabriken, med varje väntan och körning loggad. En mätare loggade
maskinens belastning, minne, swap och webbläsarprocesser varje minut från
10:05 till 16:59.

Samma kväll satte grundaren regeln för att bedöma ändringen: mät avslutade
sessioner, deras tokens, tid, väntan och fel och om genomförandeagenterna kom
i vägen för varandra, utan påhittade tester eller omspelningar.

| Sajtens genomförandeagenter | En | Två |
| --- | ---: | ---: |
| Avslutade sessioner | 17 | 8 |
| Klara ändringar | 13 | 11 |
| Tokens per ändring, median (miljoner) | 26,3 | 19,2 |
| Sessionsminuter per ändring | 44 | 39 |
| Minuter med en genomförandeagent igång, per ändring | 44 | 26 |

En genomförandeagent körde från den 25 september klockan 12:09 UTC till den 26
september klockan 09:50. De två körde i fyra par från 10:07 till 15:31, sida
vid sida i 44, 18, 63 och 13 minuter. En sessions tokens och minuter delas
lika mellan de ändringar den arbetade med. Uppgifterna skilde sig åt, så
tokens visar bara att en andra genomförandeagent inte gjorde en ändring
dyrare; vinsten ligger i takten.

{% figure "lock", "wide" %}

Genomförandeagenterna kom inte direkt i vägen för varandra. Inget kommando
från den ena rörde den andras worktree eller processer, inget git-kommando
föll på ett lås eller en konflikt och ingen push avvisades. De möttes i en
fil, en anteckning som genomförandeagenterna delar: den ena skrev om den medan
den andra, som hade läst den, fortfarande arbetade. Den andras egen kontroll
stoppade senare dess ändring eftersom texten hade ändrats.

Maskinen och låset delade de däremot. Av de 97 jobb som tog låset från 10:09
till 15:34 väntade 17, alla genomförandeagenternas, 43 minuter sammanlagt. De
tre längsta väntetiderna, 21 minuter tillsammans, föll mellan 13:55 och 14:18,
medan de två genomförandeagenternas fullständiga test- och kontrollkörningar
turades om. En godkänd fullständig testkörning tog 441 och 467 sekunder mellan
14:10 och 14:40, mot 87 till 137 sekunder efter 15:00; en underkänd körning
strax innan hade tillbringat 7,5 av sina 8,9 minuter i ett känt instabilt
webbläsartest. En genomförandeagent körde skärmdumpsskript, som startar
Chrome, nio gånger utanför låset under sin första halvtimme; regeln nämner nu
skärmdumpar och prober.

Maskinen höll. Använd swap steg från 2,7 till 8,1 GB, ledigt minne låg mellan
33 % och 68 % och som mest körde nio Chrome-processer utan fönster samtidigt.
Belastningen över en minut hade medianen 34 när ett jobb höll låset och 6,5
när det var ledigt, med en topp på 219 klockan 12:37. Rapporten som grundaren
fick samma kväll gällde 13:09 till 16:55 UTC. Slutsatsen: två
genomförandeagenter får plats, med låset.

## Vad en start och en ändring kostade, då och nu

Den 28 september bad grundaren att två av borgmästarens mätningar skulle med i
nästa artikel: kostnaden för en start och för en landad ändring. Båda kördes
igen den 6 oktober med samma skript, på avslutade sessioner. En start är de
tokens som borgmästarens kontext växer med före dess första utåtriktade
handling: ett svar, ett utskickat uppdrag, en skriven bead, ett mejl, en
commit eller en redigering. Med ett jämnt antal är medianen det övre av de två
mittersta värdena.

| Borgmästarens sessioner som handlade | 24–28 sep | 28 sep–5 okt |
| --- | ---: | ---: |
| Sessioner | 22 | 8 |
| Tokens före första handlingen, median | 30 600 | 108 300 |
| Startinnehåll i första anropet, median | 42 700 | 43 300 |
| Första turen: anteckningar, lägeskontroll, bevakningar, medel | 26 300 | 27 400 |
| Läsning för uppgiften före handlingen, medel | 5 100 | 44 100 |
| Handlade först efter sin första tur | 4 | 7 |

Själva starten ändrades knappt: omkring 43 000 tokens startinnehåll och sedan
en första tur på omkring 27 000 där borgmästaren läser sina anteckningar,
kontrollerar läget i fabriken och sätter sina bevakningar på nytt. Det som
ändrades kom efteråt. Den 24–28 september låg beads i kö och 18 av 22
sessioner handlade inom sin första tur, 11 av dem genom att skicka ut en. Från
den 28 september till den 5 oktober körde ingen genomförandeagent i sajten
eller i Gaimer och en av åtta första handlingar var ett utskickat uppdrag. Fem
av de sessionerna väntade först igenom 3, 23, 26, 67 och 85 väckningar från
sina bevakningar och läste anteckningar, kontrollerade läget och satte
bevakningar på nytt däremellan; de övriga tre handlade inom 23 minuter, efter
att ha läst in sig på sin uppgift.

Lugnet syns också i borgmästarens dag. Med överlämningen vid 160 000 tokens
den 22–23 september startade den 57 sessioner om dagen och lade 43 % av sina
tokens före varje sessions första utåtriktade handling; den 24–28 september,
vid 300 000, var det 8 om dagen och 4–5 %. Sedan den 28 september har den
startat en om dagen och lagt 32 % av 12 till 118 miljoner tokens om dagen, mot
204 till 470 miljoner den 24–26 september.

| Tokens per landad ändring (miljoner) | Genomförandeagenter | Borgmästaren | Ändringar |
| --- | ---: | ---: | ---: |
| Gaimer, 24–26 sep | 12,9 | 4,1 | 83 |
| Den här sajten, 24–26 sep | 22,3 | – | 42 |
| Fabrikens eget repository, 29 sep–6 okt | 18,3 | – | 13 |

En landad ändring är en commit som nådde ett projekts huvudgren och
genomförandeagenternas tokens är dem från alla deras sessioner under perioden.
Den 28 september satte borgmästaren en ändring i Gaimer till 17 till 18
miljoner tokens; räknad igen är den 16,9 miljoner, varav 4,1 miljoner
borgmästarens, räknat på dess anrop om Gaimer. Inget av projekten har landat
en ändring sedan den 26 september; fabrikens eget repository blev ett av dem
den 29 september.

## Från två till fem

Den 6 oktober klockan 14:53 UTC frågade grundaren var gränserna för tokens och
agenter fanns; borgmästaren svarade att båda står i fabrikens inställningar.
Klockan 15:01 skrev han "Let's increase to 5 agents" och klockan 15:02 var
taket fem i vart och ett av de tre projekten. Borgmästaren berättade för honom
vad som inte hade ändrats: webbläsarjobb körs fortfarande ett i taget och
maskinen swappar redan. Varje genomförandeagent arbetar fortfarande i en egen
worktree och aldrig i ett projekts huvudutcheckning.

Klockan 15:13 frågade grundaren om fabrikens roller passade dess arbete, som
enligt honom mest hade bestått av artiklar. Borgmästaren svarade att alla tolv
roller var gjorda för mjukvara och nämnde fem som saknades: en skribent, en
faktagranskare, en redaktör för svenskan, en illustratör och en analytiker.
Klockan 18:51 lade grundaren till de tre första; kod, figurer och bilder
ligger kvar hos genomförandeagenterna. Det följs upp om de två andra behövs
för att avlasta borgmästaren.

Första gången fler än två genomförandeagenter kör sida vid sida mäter
borgmästaren tiden per uppgift och maskinens belastning med mätaren igång
igen. Steget bedöms efter grundarens regel från den 26 september.

## Vad siffrorna inte visar

- En dag med två genomförandeagenter, på en maskin och med olika uppgifter:
  tokens per ändring jämför uppgifterna lika mycket som uppsättningarna.
- Borgmästarens tokens för den här sajten och fabrikens eget repository är
  inte skilda från resten av dess arbete.
- Skriptet som hittar den första utåtriktade handlingen missade handlingarna
  i en session efter den 28 september, som körde sina kommandon med en
  tidsgräns. Räknade med sänker de andelen före den första handlingen från
  skriptets 40 % till 32 % och lämnar medianen på 108 300.
