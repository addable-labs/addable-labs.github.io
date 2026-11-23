---
title: Vad en agent kostar medan den väntar
description: "Hur många tokens borgmästaren, agenten som samordnar fabriken bakom den här sajten, använde medan den väntade från september till november 2026: i regel två till tre gånger kontextens storlek varje gång den väcktes och det slutade utan utåtriktad handling, oavsett om en bevakning hade löpt ut, en kontroll var schemalagd eller en händelse hade inträffat."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två banor över samma del av ett lugnt dygn. Bredvid ett stoppur har den övre banan sexton orange markeringar med jämna mellanrum: en bevakning som startas om var 30:e minut. Bredvid en notisklocka har den nedre banan fem gröna markeringar med ojämna mellanrum: en agent som bara väcks när något händer. Markeringarna är lika stora i båda banorna."
date: 2026-10-11
category: ai-journey             # app-development | ai-journey
translationKey: what-an-agent-costs-while-it-waits
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Vad kostar en AI-agent medan den väntar? För borgmästaren, agenten som samordnar
fabriken bakom den här sajten, kostade det i regel två till tre gånger
kontextens storlek i tokens varje gång den väcktes utan att någon utåtriktad
handling följde. En väckning är varje tillfälle då något väcker borgmästaren,
med eller utan utåtriktad handling efteråt. Ett dygn då inget väckte den
kostade ingenting.

Fram till den 9 oktober 2026 väntade borgmästaren i en bevakning som löpte ut
var 30:e minut och måste startas om. På intensiva dagar försvann omstarterna i
allt annat arbete. Under tio lugna dygn stod de för 36 % av borgmästarens
tokens. Den 8 oktober, en dag utan arbete, var andelen 68 %. Från den 9 oktober
väcktes borgmästaren bara när något hände eller en schemalagd kontroll skulle
köras. Den 10 oktober, det första hela dygnet efter ändringen, blev det inga
omstarter. Ändå använde borgmästaren bara omkring 20 % färre tokens per timme
som datorn var vaken: de flesta händelser som väckte den krävde ingen åtgärd och
varje gång den väcktes kostade det ungefär lika mycket som en omstart. I
november förekom inga omstarter någon dag. En händelse som väckte borgmästaren
utan att någon utåtriktad handling följde kostade omkring tre gånger kontexten.
När inget hände gick det däremot knappt åt några tokens: den 4 november var de
tre schemalagda kontrollerna de enda anropen, tillsammans 0,69 miljoner tokens.
I omkring 95 timmar efter den 7 november väckte ingenting borgmästaren, så den
gjorde inga anrop.

Siffrorna kommer från borgmästarens egna sessionstranskript och mättes den 9 och
11 oktober samt igen den 21 november.

## En bevakning löpte ut var 30:e minut

Mellan uppgifterna väntade borgmästaren på ett meddelande från grundaren, ett
mejl från en annan agent, en mergad pull request eller en ny commit på en
huvudgren. Fram till den 9 oktober väntade den i Claude Codes bevakningar. Från
den 22 september täckte en enda bevakning alla fyra. Enligt Claude Codes
[verktygsreferens](https://code.claude.com/docs/en/tools-reference) har varje
bevakning en timeout på högst 30 minuter. När timeouten nås avslutas
bevakningen och agenten får ett enda meddelande om det, så att den kan starta om
den.

När inget hände nådde borgmästarens bevakning sin timeout och borgmästaren
startade om den. Från den 27 september skedde det ungefär var 30:e minut, dygnet
runt. Av 626 sådana omstarter mellan den 20 september och den 8 oktober bestod
565 av två anrop till modellen: ett för att starta om bevakningen och ett för
att avsluta svaret med en rad text. Varje anrop skickade hela kontexten till
modellen igen, vilket
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
förklarar, så varje sådan omstart kostade två gånger kontextens storlek i
tokens. Nästan alla tokens lästes från cachen.

Det gällde också borgmästarens schemalagda kontroller. Claude Codes sida om
[att hantera kostnader](https://code.claude.com/docs/en/costs) säger att en
schemalagd uppgift som hör till en session körs enligt sitt intervall även när
sessionen är inaktiv och att varje körning skickar hela kontexten. Den 8 oktober
stod kontrollerna för 18 % av borgmästarens tokens. En sådan uppgift
[löper också ut sju dagar efter att den har skapats](https://code.claude.com/docs/en/scheduled-tasks#seven-day-expiry).
Kontrollerna från den 31 oktober kördes för sista gången den 7 november. Ingen
händelse kom förrän den 11 november: i omkring 95 timmar väckte ingenting
borgmästaren, så den gjorde inga anrop.

## Intensiva dagar dolde vad väntan kostade

{% figure "waiting-per-day" %}

Under de tio hela dygnen från den 27 september till den 7 oktober, med
undantag för den 6 oktober, startades bevakningen om 36 till 46 gånger per dygn
utan att ha rapporterat något. Omstarterna använde 8,4 till 22,6 miljoner
tokens per dygn. Det var 36 % av borgmästarens tokens under de dygnen – mer än
hälften under fem av dem och 98 % den 30 september, då 89 av dygnets 91 anrop
var omstarter.

Under de intensiva dagarna 22–26 september, då borgmästaren använde 200 till
355 miljoner tokens per dygn, tog samma sorts omstarter mellan 0,3 % och 4 % av
dem. Ju lugnare dygnet var, desto större andel gick till att vänta.

## En omstart kostade två gånger kontexten, en väckning i november tre gånger

Ju större kontexten var, desto mer kostade en omstart. Tabellen delar in
omstarterna och novembers väckningar som orsakades av händelser och slutade utan
utåtriktad handling, efter kontextens storlek i första anropet.

| Kontext i första anropet (tokens) | Omstarter, sep–okt | Tokens per omstart, median | Gånger kontexten, median | Väckningar (händelse), nov | Tokens per väckning, median | Gånger kontexten, median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 000–100 000 | 221 | 168 000 | 2,0 | 19 | 277 000 | 3,0 |
| 100 000–150 000 | 142 | 256 000 | 2,0 | 35 | 364 000 | 3,0 |
| 150 000–200 000 | 135 | 359 000 | 2,0 | 42 | 544 000 | 3,0 |
| Över 200 000 | 128 | 487 000 | 2,0 | 70 | 1 002 000 | 3,0 |

Oavsett storlek kostade en omstart ungefär två gånger kontexten. Samma väntan
kostade därför tre gånger så mycket den 27 september, med en mediankontext på
256 000 tokens, som den 2 oktober, med 84 000. Kontexten avgjorde vad varje
väntan kostade.

En händelse som väckte borgmästaren i november utan att någon utåtriktad
handling följde krävde tre anrop i median och kostade tre gånger kontexten,
oavsett storlek. En schemalagd kontroll som inte hittade något kostade
fortfarande ungefär två gånger kontexten.

## En händelse utan åtgärd kostade lika mycket som en omstart

Den 9 oktober ändrades hur borgmästaren väntade. Från och med då startade den
ett bakgrundskommando som tog slut först när något hände. När kommandot tog slut
väcktes borgmästaren. Mellan händelserna gjorde den inga anrop, utom när en
schemalagd kontroll skulle köras.

Den 10 oktober, det första hela dygnet efter ändringen, blev det inga omstarter.
Borgmästaren använde 10,78 miljoner tokens i 90 anrop, mot 11,73 miljoner i 112
anrop den 8 oktober. Datorn var vaken hela den 10 oktober men bara 21 timmar den
8 oktober, så per vaken timme blir det omkring 20 % mindre. Det är bara ett
dygn, med ovanligt hög belastning.

Borgmästaren väcktes 22 gånger av händelser och 5 gånger av schemalagda
kontroller. En av kontrollerna startade en undersökning. Av de 22 händelserna
krävde 19 ingen åtgärd: alla larm och meddelanden om att faran var över utom
ett av dem samt grundarens commit. De 19 tog 66 % av dygnets tokens, mot 68 %
för omstarterna den 8 oktober: orsaken hade ändrats, andelen inte.

| Vad som väckte borgmästaren den 10 oktober | Väckningar | Anrop | Tokens (miljoner) | Andel av dygnet |
| --- | ---: | ---: | ---: | ---: |
| Ett larmmejl om en långsam databas eller mejlet om att faran var över | 17 | 51 | 6,43 | 60 % |
| Ett larm om ett rensningsjobb som fick timeout under belastningen | 2 | 10 | 1,43 | 13 % |
| En schemalagd kontroll som inte hittade något | 4 | 9 | 1,11 | 10 % |
| Arbete: en schemalagd kontroll som startade en undersökning samt undersökningens resultat | 2 | 13 | 1,07 | 10 % |
| En annan händelse: en uppgift som den nyss hade skapat eller en commit av grundaren i ett annat repo | 2 | 7 | 0,74 | 7 % |
| Totalt | 27 | 90 | 10,78 | 100 % |

När borgmästaren hade skrivit ett litet hjälpskript åt sig själv för larmmejlen,
svarade den på de flesta senare larm med två anrop. Det kostade 2,01 gånger
kontexten, ungefär lika mycket som en omstart hade kostat.

Att borgmästaren väcktes av händelser i stället för av en bevakning som löpte ut
tog bort kostnaden för omstarterna. Det ändrade inte vad det kostade att väckas:
varje händelse innebar ändå att hela kontexten lästes in igen, så en händelse
som inte krävde någon åtgärd kostade lika mycket som en omstart.

## Två cloud-agenter startas av händelser

Enligt dokumentationen från OpenAI och GitHub i oktober 2026 väntar deras
cloud-agenter på ett annat sätt.
[Ett meddelande i Slack](https://learn.chatgpt.com/docs/third-party/slack) som
nämner ChatGPT kan starta en
[cloud task i Codex](https://learn.chatgpt.com/docs/cloud), som fortsätter att
arbeta medan användarens dator sover.
[GitHub Copilots cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
startar när ett issue tilldelas den eller en kommentar nämner den. Codex kan
också köra en [schemalagd uppgift](https://learn.chatgpt.com/docs/automations) i
en pågående chatt och använder då – som borgmästaren – chattens kontext i
stället för en ny prompt varje gång. En samordnare som har en enda lång
konversation igång, som borgmästaren, väntar i den konversationen: vad som än
väcker den, skickar nästa anrop hela kontexten.

## Efter en timmes tystnad löpte cachen ut eller konversationen komprimerades

Claude Codes sida om
[prompt caching](https://code.claude.com/docs/en/prompt-caching) säger att
Claude Code begär en cache som gäller i en timme med ett Claude-abonnemang –
inom det som ingår i abonnemanget – och en som gäller i fem minuter med en
API-nyckel.
Varje anrop som läser från cachen startar timmen på nytt, så omstarterna var
30:e minut hade hållit cachen varm.

Den 10 oktober kom sex anrop efter mer än en timmes tystnad. Vart och ett läste
bara 25 387 tokens från cachen och skrev resten av kontexten till cachen igen:
475 045 tokens sammanlagt, 4 % av dygnets tokens. I november var det 47 anrop,
tillsammans 1 % av månadens tokens.

Sedan oktober komprimerar Claude Code
[en lång session som har stått inaktiv](https://code.claude.com/docs/en/settings-reference#idlecompaction)
innan timmen har gått: när kontexten når standardgränsen på 200 000 tokens och
ungefär en timme har gått sedan det senaste anropet ersätts konversationen av en
sammanfattning. Borgmästarens konversation komprimerades sex gånger i november,
varje gång efter ungefär 55 minuter utan anrop. En kontext på 217 000–300 000
tokens minskade då till 58 000–65 000. Anropet som skriver sammanfattningen
ingår inte i siffrorna.

## Vad siffrorna inte visar

- Den 10 oktober var ett ovanligt dygn, med en enda arbetsuppgift, inga
  meddelanden från grundaren och ovanligt hög belastning från andra projekt.
  I november finns 13 fullständiga dygn med och utan arbete, på en dator.
- "Ingen utåtriktad handling" betyder inte att inget behövdes: borgmästarens svar
  på grundarens kommentarer på sidor där en ändring läses innan den publiceras
  räknas inte som utåtriktade handlingar.
- En token som lästes från cachen räknas här lika mycket som en som skrevs till
  den. Dokumentationen säger inte hur mycket någon av dem räknas mot
  användningsgränserna i ett abonnemang.
- Bara borgmästaren räknas. De andra agenternas tokens ingår inte i siffrorna.
- Transkripten från före slutet av oktober finns inte kvar, så siffrorna för
  september och början av oktober kommer från mätningar som gjordes då. Under
  större delen av november körde borgmästaren på en annan modell.
