---
title: Vad en agent kostar medan den väntar
description: "Hur många tokens borgmästaren, agenten som samordnar fabriken bakom den här sajten, förbrukade medan den väntade från den 27 september till den 10 oktober 2026: en omstart av en bevakning som inte hade rapporterat något kostade ungefär dubbla kontexten, tills den bara väcktes när något hände."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två banor över samma del av ett lugnt dygn. Bredvid ett stoppur har den övre banan en rad orange markeringar med jämna mellanrum: en bevakning som startas om var 30:e minut. Bredvid en ringklocka har den nedre banan några gröna markeringar med ojämna mellanrum: en agent som bara väcks när något händer."
date: 2026-10-11
category: ai-journey             # app-development | ai-journey
translationKey: what-an-agent-costs-while-it-waits
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

## Hur borgmästaren väntade

Vad kostar en AI-agent medan den väntar? Mellan uppgifterna väntade
borgmästaren, agenten som samordnar
[fabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här sajten, på
ett meddelande från grundaren, ett mejl, en sammanslagen pull request eller en
ny commit på en huvudgren. Fram till den 9 oktober 2026 väntade den i Claude
Codes bevakningar, som slutade efter högst 30 minuter. När en bevakning
slutade utan något att rapportera startade borgmästaren den igen.

En sådan omstart var en tur i borgmästarens konversation. Av de 626
omstarterna från den 20 september till den 8 oktober bestod 565 av två anrop
till modellen. Varje anrop skickade hela kontexten till modellen igen, så var och
en av de omstarterna kostade dubbelt så många tokens som kontexten. [En
studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
förklarar vad det kostar att skicka hela kontexten med varje anrop.

## Omstarterna dag för dag

{% figure "waiting-per-day" %}

Under de tio fullständiga dygnen från den 27 september till den 7 oktober,
utom den 6 oktober, använde borgmästaren 12 till 74 miljoner tokens om dygnet
och omstarterna tog 36 % av dem: mer än hälften under fem av dygnen och 98 %
den 30 september. Under de intensiva dagarna 22–26 september, med 200 till 355
miljoner tokens om dagen, tog samma omstarter mellan 0,3 % och 4 %.

## En omstart kostade dubbla kontexten

Ju större kontexten var, desto mer kostade en omstart. Tabellen delar in
omstarterna efter kontextens storlek i deras första anrop.

| Kontext i första anropet (tokens) | Omstarter | Tokens per omstart, median | Gånger kontexten, median |
| --- | ---: | ---: | ---: |
| 50 000–100 000 | 221 | 168 000 | 2,0 |
| 100 000–150 000 | 142 | 256 000 | 2,0 |
| 150 000–200 000 | 135 | 359 000 | 2,0 |
| Över 200 000 | 128 | 487 000 | 2,0 |

Vid varje storlek kostade en omstart ungefär dubbelt så mycket som sin
kontext, så samma väntan kostade tre gånger så mycket vid 256 000 tokens
kontext som vid 84 000.

## Väckt bara när något händer

Den 9 oktober ändrade borgmästaren hur den väntade, så att den bara väcktes
när något hände: den 10 oktober, det första hela dygnet efter ändringen, blev
det inga omstarter alls, men under dygnet gick det ändå åt 10,78 miljoner
tokens. Två tredjedelar av dem gick till väckningar som inte krävde någon åtgärd, de
flesta av dem larmmejl om en långsam databas, skickade medan annat arbete
belastade maskinen.
