---
title: En studie av borgmästarens kontext
description: Vad en bead kostade borgmästaren, agenten som samordnar fabriken bakom den här sajten, den 22–23 och 24–25 september 2026, vad som drev den kostnaden och vad varje ändring i dess kontext gjorde.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två av borgmästarens sessioner bredvid varandra. Den förstas kontext har fyllts anrop för anrop: startinnehållet längst ner, omorienteringen i orange, sedan arbetet upp till den streckade överlämningspunkten. Vid överlämningen skriver borgmästaren läget i sitt arbete på ett kort; en ny session börjar på samma startinnehåll och läser kortet först."
date: 2026-09-25
category: ai-journey             # app-development | ai-journey
translationKey: what-the-mayors-context-costs
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

## Sammanfattning

Borgmästaren, agenten som samordnar
[fabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här sajten,
bearbetade 8,28 miljoner tokens per bead som en genomförandeagent levererade
den 22–23 september och 5,14 miljoner den 24–25 september: 38 % färre, för 57
beads i stället för 35. En bead är en uppgift i fabrikens ärendehanterare och
en genomförandeagent är en agentsession som utför en.

Hela besparingen kom från omorienteringen, de anrop som en ny session gör före
sin första utåtriktade handling (ett svar, ett utskickat uppdrag, en skriven
bead, en commit). Omorienteringen kostade 3,71 miljoner tokens per bead under
den första perioden och 0,15 miljoner under den andra: överlämningarna sjönk
från 1,46 till 0,18 per bead och varje ny session behövde ungefär en
tredjedel så många tokens för att orientera sig. Priset för att lämna över
senare var en längre kontext i varje anrop. Efter den första utåtriktade
handlingen bearbetade ett anrop i genomsnitt 187 000 tokens i stället för
142 000, så själva arbetet kostade 4,99 miljoner tokens per bead i stället för
4,57 miljoner, 9 % mer, trots färre anrop per bead.

Siffrorna visar vart tokens gick, inte hur stor del av minskningen varje
ändring orsakade. Arbetet skilde sig mellan perioderna och ändringarna kom
samtidigt: överlämningspunkten, innehållet som varje session startar med,
anteckningarna som borgmästaren för mellan sessionerna och hur den besvarar
snabba frågor. Räknat per bead som borgmästaren hanterade, inklusive 33 som
den stängde själv, blir den första perioden billigare.

## Vad en session är

Borgmästaren är en långlivad agent i Gas City som arbetar i sessioner. En
session är en Claude Code-konversation med en kontext. Den börjar med
startinnehållet (Claude Codes systemprompt och verktygsdefinitioner, listorna
med färdigheter och verktyg, regelfilerna och Gas Citys prompt för
borgmästaren), läser sina anteckningar, arbetar och slutar med en överlämning:
den skriver ner läget i sitt arbete och en ny session fortsätter därifrån.
Alla 61 sessioner under de två perioderna slutade med en egen överlämning;
ingen slutade med en krasch eller en omstart.

En session är alltså en enhet av kontext och inte av arbete: hur många det
blir beror på hur snabbt kontexten växer och var överlämningspunkten ligger.
Den 22–23 september bad Gas City om en överlämning vid 160 000 tokens och
mediansessionen gjorde 44 anrop till modellen på 19 minuter. Från den 24
september bad den om en vid 300 000 tokens och mediansessionen gjorde 160
anrop på 122 minuter.

Varje anrop skickar hela kontexten till modellen. Studien räknar varje
skickad token och varje token som modellen producerade som bearbetad, oavsett
om den lästes från cachen eller inte. Det en session kostar är alltså det som
ligger i dess kontext gånger de anrop som skickar det igen. En token som lades
till mitt i en session skickades igen i genomsnitt 28 gånger den 22–23
september och 90 gånger den 24–25 september. Startinnehållet följer med varje
anrop, så det kostar sin storlek gånger anropen, inte gånger sessionerna:
färre sessioner gör det inte billigare, bara ett mindre startinnehåll eller
färre anrop gör det.

## Arbetet och meddelandena

Varje period är en följd av hela sessioner, från den 22 september klockan
21:09 UTC till den 23 september klockan 18:54 UTC och från den 24 september
klockan 08:34 UTC till den 25 september klockan 07:21 UTC. Källorna, inga av
dem offentliga, är borgmästarens sessionstranskript med deras tokenräkning,
ärendehanteraren, mejlen mellan agenterna, grundarens meddelanden och
git-historiken.

| I varje period | 22–23 sep | 24–25 sep |
| --- | ---: | ---: |
| Beads levererade av genomförandeagenter | 35 | 57 |
| Beads som borgmästaren stängde själv | 33 | 0 |
| Commits som nådde main | 32 | 85 |
| Beads skickade till en genomförandeagent | 38 | 58 |
| Rapporter mejlade av genomförandeagenter | 37 | 58 |
| Meddelanden på Discord från grundaren | 18 | 10 |
| Sessioner, var och en avslutad med en överlämning | 51 | 10 |
| Tokens bearbetade av borgmästaren (miljoner) | 290 | 293 |
| Per bead levererad av genomförandeagenter (miljoner) | 8,28 | 5,14 |

Under den första perioden gällde alla genomförandeagenternas beads sajten:
dess texter, dess kontroller och tester samt dess README, mycket av det i nära
kontakt med grundaren. Borgmästaren stängde dessutom 33 beads själv, de flesta
granskningsfynd som den avfärdade. Under den andra perioden gällde 32 av de 57
beads ett andra projekt, [Gaimer](https://github.com/addable-labs/gaimer), de
flesta små pull requests från en granskning av dess kod. En genomförandeagent
fick sina instruktioner i den bead som borgmästaren skickade ut och mejlade en
rapport när den var klar; borgmästaren följde arbetet genom sina egna
bevakningar. Utöver uppdragen skickade den två mejl och två korta meddelanden
till genomförandeagenter, alla under den andra perioden.

## Vad som fyllde kontexten

{% figure "sources" %}

Kontextens tillväxt från ett anrop till nästa fördelades på det som orsakade
den: borgmästarens egna utdata exakt, utifrån tokenräkningen, samt
verktygsresultat och meddelanden efter sin storlek, en uppskattning. Under den
första perioden var hälften av alla bearbetade tokens startinnehållet, som
skickades med varje anrop i 51 korta sessioner. Under den andra var det en
fjärdedel: startinnehållet var mindre och det som arbetet lade till skickades
igen i genomsnitt 90 gånger i stället för 28. Borgmästarens egna utdata, mest
dess resonemang, diffarna den läste och genomförandeagenternas rapporter vägde
tyngre.

## Fynd, ändringar och utfall

| Fynd | Ändring | Utfall |
| --- | --- | --- |
| En överlämning var 19:e minut (median): Gas City uppfattade modellens fönster som 200 000 tokens | Fönstret satt till 1 000 000 tokens, uppmaning att lämna över vid 30 % av det | 0,18 överlämningar per bead i stället för 1,46, men 187 000 tokens per anrop efter den första utåtriktade handlingen i stället för 142 000 |
| Startinnehåll som ingen session använde, i varje anrop: fyra tillägg och tio av kontots kopplingar | Avstängt | 42 500 tokens startinnehåll per anrop i stället för 64 000 (medianer); med den gamla storleken hade den andra perioden bearbetat 12 % mer |
| En anteckningslogg för lång för att läsas i sin helhet: sessionerna hoppade över det mesta av den och tog gamla fakta för aktuella | Ett lägeskort som skrivs om vid varje överlämning och en referens som läses i ett anrop, båda kortade och med tak sedan den 24 september | En ny session agerade efter 12 anrop i stället för 21, med en kontext som hade vuxit med 31 000 tokens i stället för 58 000 (medianer); går inte att skilja från de två ändringarna ovan |
| Långsamma svar på enkla frågor | En fråga från grundaren som börjar med "?" besvaras direkt; kortare tidsgränser för två promptkrokar | Oprövad: inga svarstider från tidigare |

Lägeskortet och referensen fanns redan under den första perioden, så
jämförelsen visar bara att de kortades, tillsammans med de andra ändringarna.
Fyndet bakom dem hade ett enkelt exempel: en session rapporterade att
uppgiftsdatabasens synk var flyttad till ett privat kodförråd medan
databasens egen fjärradress fortfarande pekade på det publika, tills en senare
session kontrollerade läget i stället för att lita på sina anteckningar.

## Vad siffrorna inte visar

- Arbetet skilde sig. Räknat per bead som borgmästaren hanterade, inklusive de
  33 som den stängde själv, använde den första perioden 4,26 miljoner tokens
  per bead och den andra 5,14 miljoner: ordningen vänds. Siffrorna visar
  mekanismen, färre omorienteringar i utbyte mot en längre kontext per anrop,
  inte att ändringarna orsakade hela minskningen per bead.
- Anteckningarna och överlämningspunkten ändrades samtidigt och
  startinnehållet krympte också mellan perioderna; två perioder kan inte
  skilja dem åt.
- Borgmästarens subagenter, tre under varje period, använde 62,9 miljoner
  egna tokens under den första perioden och 15,2 miljoner under den andra. De
  ingår inte i summorna och det gör inte heller genomförandeagenternas tokens.
- En token som lästes från cachen räknas som vilken annan som helst: 97 % av
  den första periodens tokens och 99 % av den andras var cacheläsningar.

Två tester skulle kunna avgöra mer. I en omkörning startar nya sessioner som
inte kan agera från ett och samma sparade läge med ett väntande meddelande, en
gång vardera med den gamla loggen, det första kortet och det kortade kortet;
mätvärdena är tokens fram till den första utåtriktade handlingen och om den
handlingen är den rätta. Överlämningspunkter som växlar dag för dag, 15 % och
30 % av fönstret, med liknande arbete skulle mäta överlämningspunkten per
levererad bead.

## Vad nästa ändringar skulle rikta in sig på

Den andra periodens andelar pekar på tre mål:

- Borgmästarens eget resonemang, 17 % av alla tokens, med den högsta
  inställningen för resonemang på varje svar: en lägre inställning för
  rutinsteg.
- Diffarna och genomförandeagenternas rapporter som den läser i sin egen
  kontext, 13 %: att läsa dem i en subagent som bara lämnar tillbaka sitt
  utlåtande.
- Startinnehållet, 25 %: ungefär 33 000 tokens av varje start är Claude Codes
  egen systemprompt och verktygsdefinitioner, som fabriken inte kan ställa in,
  så bara resten kan krympa.
