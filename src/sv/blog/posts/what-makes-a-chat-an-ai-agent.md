---
title: Vad som gör en chatt till en AI-agent
description: Första delen i serien Från AI-chatt till agentiskt arbete – vad som skiljer en AI-agent från en chatt med AI, de fem delar den består av och hur de ser ut i fabriken bakom den här sajten.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En utvecklare sedd bakifrån, delad i två halvor framför två skärmar. Den vänstra halvan är grå och lugnare framför en chatt. Den högra är grön och aktiv, med handen höjd mot en skärm med en graf av agenter.
date: 2026-10-06
category: ai-journey             # app-development | ai-journey
translationKey: what-makes-a-chat-an-ai-agent
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

Addable Labs bygger mjukvara till stor del med AI-agenter och den här sajten
byggs och underhålls av en agentdriven mjukvarufabrik, som vi beskrev i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
Mycket av arbetet med AI sker ändå i en chatt: man klistrar in kod, får ett
förslag och klistrar tillbaka det.

Den här serien beskriver vägen därifrån – en byggsten i taget – och börjar
med vad som skiljer de två. Det korta svaret är att modellen ofta är
densamma som i chatten. Det nya är allt runt omkring den: en AI-agent får
läsa projektet, ändra filer, köra kommandon och kontrollera sitt eget
arbete.

## Samma fel, två sätt att rätta det

Ett påhittat men vanligt exempel: ett datumfält i ett formulär godtar 31
februari.

I chatten klistrar man in koden och beskriver felet. Förslaget förs över
till editorn, testerna körs och ett annat test går sönder. Felmeddelandet
klistras in i chatten, ett nytt förslag kommer tillbaka och efter några
varv fungerar det. Modellen har aldrig sett projektet, bara de bitar någon
valde att visa den.

En AI-agent får i stället uppgiften: "Datumfältet godtar 31 februari. Rätta
det och lägg till ett test." Den letar upp filen, läser koden runt omkring,
gör ändringen och kör testerna. När ett annat test går sönder läser den
felet och försöker igen. När alla tester går igenom visar den vad den har
ändrat och en människa bestämmer om ändringen ska in.

Skillnaden är vem som går varven. I chatten är det människan som kör
testerna, läser felet och bär det tillbaka. Med en AI-agent sker det inne i
verktyget och människans del blir att ge uppgiften och granska resultatet.

{% figure "chat-or-agent", "wide" %}

## Fem delar

Anthropic, OpenAI och GitHub beskriver en AI-agent på nästan samma sätt i
dokumentationen för
[Claude Code](https://code.claude.com/docs/en/how-claude-code-works),
[Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) och
[GitHub Copilot](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses):
en modell, instruktioner, verktyg, en loop och ett lager som håller ihop det
hela.

{% figure "five-parts" %}

**Modellen** är samma slags språkmodell som i chatten. Den resonerar och
väljer nästa steg, men gör ingenting på egen hand – med Anthropics ord:
["Utan verktyg kan Claude bara svara med text"](https://code.claude.com/docs/en/how-claude-code-works)
(vår översättning). Modellen körs ofta hos leverantören: en agent kan
[ändra filer lokalt och samtidigt skicka det den läser till en modell i molnet](https://code.visualstudio.com/docs/agents/overview),
om man inte har valt en lokal modell.

**Instruktionerna** är en textfil i projektet som agenten läser varje gång
den startar: hur projektet byggs och testas, vilka regler som gäller och
vad den ska låta bli. [AGENTS.md](https://agents.md/) är ett öppet format
för en sådan fil. Det växte fram ur ett samarbete där bland andra OpenAI:s
Codex ingick och läses i dag av en lång rad verktyg. Filen kan vara kort:

```markdown
# Instruktioner för AI-agenter

## Bygga och testa
- Installera beroenden med `npm install`.
- Kör `npm test` innan du säger att du är klar.

## Regler
- Skriv ett test för varje fel du rättar.
- Ändra inget i mappen `migrations/`.
- Fråga innan du lägger till ett nytt paket.
```

Filen är också den enklaste vägen att nå alla agenter på en gång. Den 12
september, med fyra agenter på samma dator, behövde ett meddelande nå alla
fyra och vi klistrade in det i den regelfil som varje agent på maskinen
läser först. Men filen vägleder och låser ingenting: Anthropic skriver att
Claude behandlar den
[som sammanhang, inte som tvingande inställningar](https://code.claude.com/docs/en/memory)
(vår översättning). Det som aldrig får hända stoppas utanför modellen – del
7 i serien handlar om det.

**Verktygen** låter agenten göra saker: söka i koden, ändra filer, köra
tester. En agent med tillgång till terminalen
[kan köra samma kommandon](https://code.claude.com/docs/en/how-claude-code-works)
som den som sitter vid tangentbordet. Kopplingar till system utanför
projektet, som ett ärendesystem, görs ofta med
[Model Context Protocol](https://modelcontextprotocol.io/), en öppen
standard för just sådana kopplingar.

**Loopen** är varvet från exemplet med datumfältet: ta ett steg, titta på
resultatet, välj nästa.
[Anthropic beskriver den](https://code.claude.com/docs/en/how-claude-code-works)
som tre faser – samla sammanhang, agera och kontrollera resultatet. Loopen
är också där agenten hittar runt sina egna misstag. I fabrikens första bygge
tog en session en administrativ post i registret i stället för sin uppgift
och behövde fjorton minuter för att ta sig runt det. Den skrev ner lösningen
i sina anteckningar och när det andra byggets första session råkade ut för
samma sak var den igång med sin uppgift inom en minut.

**Det som håller ihop allt** kallas på engelska harness, ungefär sele.
[Dokumentationen för GitHub Copilot i VS Code definierar det](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses)
som mjukvaran som kör en agentsession och gör en språkmodell till en agent
genom att koppla den till sammanhang och verktyg, styra loopen och hålla
reda på sessionen. Det kan vara ett tillägg i editorn, ett program i
terminalen, ett jobb i CI eller en schemalagd körning. I fabriken är Claude
Code harness för borgmästarens sessioner – borgmästaren är agenten som
samordnar fabriken – och i september var ungefär 33 000 tokens av varje
start Claude Codes egen systemprompt och verktygsdefinitioner, enligt
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/).
Att en planerare och en granskare kan vara olika agenter kommer från lagret
ovanpå, Gas City, där en agent är konfiguration: ett namn, en prompt, ett
ansvarsområde.

## Vad som bär arbetet i fabriken

I fabriken är det fyra saker utanför modellen som bär arbetet.

**Grindar.** När sajten byggdes i september körde ett enda kommando tio
kvalitetsgrindar på varje pull request och varje grind har ett test som
bevisar att den misslyckas när något medvetet har gjorts sönder. Det står i
[Så byggdes den här sajten av agenter](/sv/blog/how-this-site-was-built-by-agents/).

**Uppgifter med ett tydligt slut.** Kraven blev numrerade påståenden med
acceptanskriterier och varje arbetspaket fick ett eget beviskommando. En
agent vet när den är klar när ett kommando säger det.

**Korta instruktioner.** Anthropic rekommenderar
[under 200 rader per fil](https://code.claude.com/docs/en/memory), eftersom
längre filer tar mer plats och följs sämre. Vi såg samma sak i september:
borgmästarens anteckningslogg hade blivit för lång för att läsas i sin
helhet, så nya sessioner hoppade över det mesta och tog gamla fakta för
aktuella. Sedan den 24 september är lägeskortet – som skrivs om vid varje
överlämning – och referensen kortade och har ett tak.

**En människa som läser.** Ingen artikel och ingen ändring av det som står
på sajten blir offentlig utan att grundaren har läst den först. Det första
bygget kördes utan grind vid planen och grundarens omdöme om resultatet blev
"en sida från 90-talet". Sedan dess sitter grinden vid planen.

## Claude Code, Codex och GitHub Copilot

Borgmästaren arbetar i Claude Code. Codex och GitHub Copilot beskriver vi
utifrån dokumentationen, så som den såg ut den 6 oktober 2026; menynamnen
ändras ofta.

I **Claude Code** är instruktionsfilen CLAUDE.md och Claude Code kan själv
[skriva ett första utkast till den](https://code.claude.com/docs/en/memory)
utifrån koden. Finns det ingen CLAUDE.md läser det AGENTS.md i stället. Vad
agenten får göra utan att fråga styrs av
[lägen](https://code.claude.com/docs/en/permission-modes): från version
2.1.283 startar det i läget Auto om inget annat är inställt och då granskar
en automatisk kontroll det mesta i bakgrunden och stoppar det som ser
riskabelt ut. I läget Manual frågar Claude Code innan det ändrar filer eller
kör kommandon. [Filändringar kan återställas](https://code.claude.com/docs/en/how-claude-code-works#undo-changes-with-checkpoints),
men inte det som redan har nått andra system.

I OpenAI:s **Codex** är AGENTS.md själva instruktionsfilen: Codex
[läser den innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
en fil per mapp från projektets rot ner till den mapp det arbetar i. Den
närmaste filen väger tyngst. På den egna datorn
[arbetar Codex i en sandlåda](https://learn.chatgpt.com/docs/agent-approvals-security)
som oftast bara når projektets mapp – utan nätverk om inget annat är inställt –
och en regel för godkännanden avgör när det måste stanna och fråga.

I **GitHub Copilot** i VS Code är instruktionsfilen
[`.github/copilot-instructions.md`](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
och Copilot läser också AGENTS.md. Med [Manual permissions](https://code.visualstudio.com/docs/agents/agents-tutorial)
ber Copilot om lov innan den kör kommandon eller använder andra verktyg,
men ändrar filer i projektmappen utan att fråga. En
[checkpoint](https://code.visualstudio.com/docs/agents/run/review-code-edits#_restore-a-checkpoint)
återställer filerna och chatten till hur de såg ut före en viss förfrågan,
men inte kommandon som har körts eller ändringar i andra tjänster.

## Vad som kommer härnäst

De kommande delarna tar byggstenarna en i taget: instruktionsfilen, agenter
med var sitt ansvarsområde, färdigheter (skills) för det som ska bli
likadant varje gång, Model Context Protocol för att nå resten av systemen,
var agenten körs, vem som startar den och vilka gränser som sätts i förväg.
Den sista delen handlar om hur mycket som har ändrats under tiden: att varje
ny modell behöver mindre styrning, men fortfarande en del.
