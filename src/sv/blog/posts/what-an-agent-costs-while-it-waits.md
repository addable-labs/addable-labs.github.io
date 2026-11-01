---
title: Vad en agent kostar medan den väntar
description: "Hur många tokens borgmästaren, agenten som samordnar fabriken bakom den här sajten, förbrukade medan den väntade i september och oktober 2026: i regel ungefär dubbelt så många som kontexten varje gång något väckte den utan att det fanns något att göra – oavsett om en bevakning hade löpt ut eller en händelse hade kommit."
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: "Två banor över samma del av ett lugnt dygn. Bredvid ett stoppur har den övre banan sexton orange markeringar med jämna mellanrum: en bevakning som startas om var 30:e minut. Bredvid en ringklocka har den nedre banan fem gröna markeringar med ojämna mellanrum: en agent som bara väcks när något händer. Markeringarna är lika stora i båda banorna."
date: 2026-10-11
category: ai-journey             # app-development | ai-journey
translationKey: what-an-agent-costs-while-it-waits
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Vad kostar en AI-agent medan den väntar? För borgmästaren, agenten som
samordnar fabriken bakom den här sajten, kostade en väckning utan något att
göra i regel ungefär dubbelt så många tokens som dess kontext.

Fram till den 9 oktober 2026 väntade borgmästaren i en bevakning som löpte ut
var 30:e minut och fick startas igen. Under intensiva dagar försvann de
omstarterna bland arbetet. Under tio lugna dygn tog de 36 % av borgmästarens
tokens och den 8 oktober, en dag utan arbete, 68 %. Från den 9 oktober väcktes
borgmästaren bara när något hände eller en schemalagd kontroll skulle köras.
Den 10 oktober, det första hela dygnet efter ändringen, blev det inga
omstarter alls, men borgmästaren använde ändå bara omkring 20 % färre tokens
per timme som dess dator var vaken: de flesta händelser som väckte den krävde
ingen åtgärd och en väckning kostade ungefär lika mycket som en omstart hade
gjort.

Borgmästaren mätte allt detta i sina egna sessionstranskript, den 9 och den
11 oktober.

## En bevakning löpte ut var 30:e minut

Mellan uppgifterna väntade borgmästaren på ett meddelande från grundaren, ett
mejl från en annan agent, en sammanslagen pull request eller en ny commit på
en huvudgren. Fram till den 9 oktober väntade den i Claude Codes
bevakningar; från den 22 september täckte en enda bevakning alla fyra. Enligt
Claude Codes [verktygsreferens](https://code.claude.com/docs/en/tools-reference)
har varje bevakning en tidsgräns på högst 30 minuter. Vid tidsgränsen upphör
bevakningen och agenten får ett enda meddelande om det, så att den kan starta
bevakningen igen.

När inget hände löpte borgmästarens bevakning till sin tidsgräns och
borgmästaren startade den igen; från den 27 september skedde det ungefär var
30:e minut, dygnet runt. Av 626 sådana omstarter från den 20 september till
den 8 oktober bestod 565 av två anrop till modellen: ett för att starta
bevakningen igen och ett för att avsluta sin tur med en rad text. Varje anrop
skickade hela kontexten till modellen igen, som [En studie av borgmästarens
kontext](/sv/blog/what-the-mayors-context-costs/) förklarar, så var och en av
de omstarterna kostade dubbelt så många tokens som kontexten. Nästan alla
dessa tokens var cacheläsningar.

Borgmästarens schemalagda kontroller kostade på samma sätt: Claude Codes sida
om att [hantera kostnader](https://code.claude.com/docs/en/costs) påpekar att
en schemalagd uppgift inom sessionen körs enligt sitt intervall även när
sessionen är overksam och då skickar hela kontexten varje gång. Den 8 oktober
tog de 18 % av borgmästarens tokens.

## Intensiva dagar dolde vad väntan kostade

{% figure "waiting-per-day" %}

Under de tio fullständiga dygnen från den 27 september till den 7 oktober,
utom den 6 oktober, startades bevakningen om 36 till 46 gånger om dygnet efter
att inte ha rapporterat något. De omstarterna använde 8,4 till 22,6 miljoner
tokens om dygnet. Det var 36 % av borgmästarens tokens under de dygnen – mer
än hälften under fem av dem och 98 % den 30 september, då 89 av dygnets 91
anrop gick till omstarter.

Under de intensiva dagarna 22–26 september, då borgmästaren använde 200 till
355 miljoner tokens om dygnet, tog samma slags omstarter mellan 0,3 % och 4 %
av dem. Ju lugnare dygnet var, desto större andel gick till att vänta.

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
kontext. Samma väntan kostade därför tre gånger så mycket den 27 september,
med en mediankontext på 256 000 tokens, som den 2 oktober, med 84 000.
Kontexten avgjorde vad varje väntan kostade.

## En händelse utan åtgärd kostade lika mycket som en omstart

Den 9 oktober ändrades hur borgmästaren väntade. Från och med då startade den
ett bakgrundskommando som tog slut först när något hände; att kommandot tog
slut väckte den. Mellan händelserna gjorde borgmästaren inga anrop, utom när
någon av dess schemalagda kontroller skulle köras.

Den 10 oktober, det första hela dygnet efter ändringen, blev det inga
omstarter. Borgmästaren använde 10,78 miljoner tokens i 90 anrop, mot 11,73
miljoner i 112 anrop den 8 oktober. Datorn var vaken hela den 10 oktober men
bara 21 timmar av den 8 oktober, så per vaken timme använde borgmästaren 0,45
miljoner tokens i stället för 0,56 miljoner: omkring 20 % mindre. Det är ett
enda dygn, med ovanligt hög belastning.

Borgmästaren väcktes 22 gånger av händelser och 5 gånger av sina schemalagda
kontroller; en av kontrollerna startade en undersökning. Av de 22 händelserna
krävde 19 ingen åtgärd: grundarens commit och alla larm och mejl som blåste
faran över utom ett. De andra tre var en uppgift som den nyss hade skapat,
undersökningens resultat och det mejl som blåste faran över medan borgmästaren
skrev ett hjälpskript åt sig själv. De 19 tog 66 % av dygnets tokens, mot 68 %
för omstarterna den 8 oktober: orsaken hade ändrats, andelen inte. De flesta
av de 19 var larmmejl om en långsam databas och mejlen som blåste faran över
efter vart och ett. De skickades medan arbete från andra projekt belastade
datorn.

| Vad som väckte borgmästaren den 10 oktober | Väckningar | Anrop | Tokens (miljoner) | Andel av dygnet |
| --- | ---: | ---: | ---: | ---: |
| Ett larmmejl om en långsam databas eller ett som blåste faran över | 17 | 51 | 6,43 | 60 % |
| Ett larm om ett rensningsjobb som överskred sin tidsgräns under belastningen | 2 | 10 | 1,43 | 13 % |
| En schemalagd kontroll som inte hittade något | 4 | 9 | 1,11 | 10 % |
| Arbete: en schemalagd kontroll som startade en undersökning samt undersökningens resultat | 2 | 13 | 1,07 | 10 % |
| En annan händelse: en uppgift som den nyss hade skapat eller en commit av grundaren i ett annat kodförråd | 2 | 7 | 0,74 | 7 % |
| Totalt | 27 | 90 | 10,78 | 100 % |

När borgmästaren hade skrivit ett litet hjälpskript åt sig själv för
larmmejlen, besvarade den de flesta senare larm med två anrop. En sådan
väckning kostade 2,01 gånger kontexten – ungefär vad en omstart hade kostat.
Kontexten växte dessutom under dygnet, från 68 892 tokens i det första anropet
till 154 675 vid den sista väckningen, så samma väckning kostade mer ju längre
dagen led.

Att väckas av händelser i stället för av en bevakning som löpte ut tog bort
kostnaden för omstarterna. Det ändrade inte vad en väckning kostade: varje
händelse innebar fortfarande att hela kontexten lästes igen, så en händelse
som inte krävde någon åtgärd kostade lika mycket som en omstart hade gjort.

## Två molnagenter startas av händelser

Så som OpenAI och GitHub beskrev dem i oktober 2026 väntar deras molnagenter
på ett annat sätt. [Ett meddelande i
Slack](https://learn.chatgpt.com/docs/third-party/slack) som nämner ChatGPT
kan starta en [molnuppgift i Codex](https://learn.chatgpt.com/docs/cloud), som
fortsätter att arbeta medan användarens dator sover. [Molnagenten i GitHub
Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
startar när ett ärende tilldelas den eller en kommentar nämner den, ber om en
granskning när den är klar och minns kontext från tidigare sessioner på samma
pull request. I båda fallen startar en händelse en session som tar slut när
uppgiften är klar. Codex kan också köra en [schemalagd
uppgift](https://learn.chatgpt.com/docs/automations) i en befintlig chatt och
använder då – som borgmästaren – chattens kontext i stället för en ny prompt
varje gång. En samordnare som håller en enda lång konversation, som
borgmästaren gör, väntar inuti den konversationen: vad som än väcker den
skickar nästa anrop hela kontexten.

## Cachen löpte nu ut efter en timmes tystnad

Claude Codes sida om
[promptcachning](https://code.claude.com/docs/en/prompt-caching) säger att
Claude Code begär en cache på en timme med ett Claude-abonnemang – inom den
användning som ingår i abonnemanget – och en på fem minuter med en API-nyckel.
Varje anrop som läser från cachen startar timmen på nytt, så omstarterna var
30:e minut hade hållit cachen varm.

Den 10 oktober kom sex anrop efter mer än en timmes tystnad. Vart och ett
läste bara 25 387 tokens från cachen och skrev resten av kontexten på nytt:
475 045 tokens sammanlagt, 4 % av dygnets tokens. Efter tysta perioder på upp
till 58 minuter fanns cachen kvar. Det stämmer med den timme som
dokumentationen beskriver.

## Vad siffrorna inte visar

- Ett dygn räcker inte. Den 10 oktober fanns en enda arbetsuppgift, inga
  meddelanden från grundaren och en ovanligt hög belastning från andra
  projekt; den 8 oktober fanns inget arbete alls och kontexten var mindre.
  Fler dygn, med och utan arbete, mäts innan artikeln publiceras.
- Under den 10 oktober började borgmästaren hantera ett larm med två anrop i
  stället för tre till nio. Utan det hade larmen kostat mer.
- En token som lästes från cachen räknas här som en som skrevs till den.
  Dokumentationen säger inte hur mycket någon av dem räknas mot ett
  abonnemangs användningsgränser.
- Bara borgmästaren räknas. De andra agenternas tokens ingår inte i
  siffrorna.
