---
title: Från AI-chatt till agentiskt arbete
description: Första delen i serien – vad som skiljer en AI-agent från en chatt med AI, de fem delar agenten består av och hur de ser ut i fabriken bakom den här sajten.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En utvecklare sedd bakifrån, delad i två halvor framför två skärmar. Den vänstra halvan är grå och lugnare framför en chatt. Den högra är grön och aktiv, med handen höjd mot en skärm med en graf av agenter.
date: 2026-10-30
category: ai-journey             # app-development | ai-journey
translationKey: what-makes-a-chat-an-ai-agent
draft: false                     # publicerad — sätt true för att hålla den utanför publika bygget (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: true              # en person har läst den
---

Addable Labs bygger mjukvara till stor del med AI-agenter och den här sajten
byggs och underhålls av det vi kallar fabriken, som vi beskrev i
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/).
Mycket av arbetet med AI sker i en chatt: man klistrar in kod, får ett
förslag och klistrar tillbaka det.

Den här serien beskriver vägen därifrån – en byggsten i taget – och börjar
med vad som skiljer de två åt. Det korta svaret är att modellen ofta är
densamma som i chatten. Det nya är allt runt omkring den: en AI-agent får
läsa projektet, ändra filer, köra kommandon och kontrollera sitt eget
arbete.

## Samma bugg, två sätt att rätta den

Ett påhittat exempel: ett datumfält i ett formulär godtar 31 februari.

Så här går det till i en AI-chatt: man klistrar in koden och beskriver buggen. Man kopierar förslaget
till editorn, kör testerna och ser ett annat test gå sönder. Man klistrar in
felmeddelandet i chatten, får ett nytt förslag och efter några varv
fungerar det. Modellen har aldrig sett projektet, bara de bitar man valde
att visa den.

Med en AI-agent ser det annorlunda ut. Agenten körs där koden redan finns:
i editorn, till exempel som en panel i VS Code, eller som ett program i
terminalen. Den kommer åt projektets filer och kan köra kommandon. Man
skriver uppgiften i agentens ruta, ungefär som i en chatt: "Datumfältet
godtar 31 februari. Rätta det och lägg till ett test." Agenten letar upp filen, läser koden runt omkring,
gör ändringen och kör testerna. När ett annat test går sönder läser den
felet och försöker igen. När alla tester går igenom visar den vad den har
ändrat och användaren bestämmer om ändringen ska in.

Skillnaden är vem som går varven. I chatten är det användaren som kör
testerna, läser felet och kopierar det till chatten. Med en AI-agent sker det
inne i verktyget och användarens del blir att ge uppgiften och granska
resultatet.

{% figure "chat-or-agent", "wide" %}

## Fem delar

Dokumentationen för
[Claude Code](https://code.claude.com/docs/en/how-claude-code-works),
[Codex](https://developers.openai.com/api/docs/guides/agents-api/architecture)
och
[GitHub Copilot](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses)
beskriver en AI-agent på nästan samma sätt: en modell, instruktioner,
verktyg, en loop och ett lager som håller ihop det hela.

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
Codex ingick. Sedan december 2025 förvaltas det av
[Agentic AI Foundation (AAIF)](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation),
en stiftelse inom Linux Foundation. I dag läses det av en lång rad verktyg. Filen kan vara kort:

```text
# Instruktioner för AI-agenter

## Bygga och testa
- Installera beroenden med `npm install`.
- Kör `npm test` innan du säger att du är klar.

## Regler
- Skriv ett test för varje bugg du rättar.
- Ändra inget i mappen `migrations/`.
- Fråga innan du lägger till ett nytt paket.
```

Det kan finnas flera sådana filer på olika nivåer: en för alla projekt på
datorn, en för hela projektet och en för en enskild mapp. Agenten läser dem
från den mest allmänna till den mest specifika, så den närmaste filen har
sista ordet. Filen vägleder agenten men låser ingenting. Det som aldrig får
hända stoppas utanför modellen – [del 7](#del-7) i serien handlar om det.

**Verktygen** låter agenten göra saker: söka i koden, ändra filer, köra
tester. En agent med tillgång till terminalen
[kan köra samma slags kommandon](https://code.claude.com/docs/en/how-claude-code-works)
som den som sitter vid tangentbordet. Kopplingar till system utanför
projektet, som ett ärendesystem, görs ofta med
[Model Context Protocol](https://modelcontextprotocol.io/), en öppen
standard för just sådana kopplingar.

**Loopen** är varvet från exemplet med datumfältet: ta ett steg, titta på
resultatet, välja nästa.
[Anthropic beskriver den](https://code.claude.com/docs/en/how-claude-code-works)
som tre faser – samla kontext, agera och kontrollera resultatet. Loopen är
också där agenten tar sig förbi sina egna misstag. När ett annat test gick
sönder i exemplet läste agenten felet, ändrade igen och körde testerna på
nytt, utan att användaren behövde göra något.

**Det som håller ihop allt** kallas på engelska harness, ungefär sele.
[Dokumentationen för GitHub Copilot i VS Code definierar det](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses)
som mjukvarulagret som kör en agentsession och gör en språkmodell till en
agent genom att koppla den till kontext och verktyg, styra loopen och hålla
reda på sessionen. Det kan köras
[som ett tillägg i editorn eller som ett program i terminalen, i ett jobb i CI eller på schema](https://code.claude.com/docs/en/overview).
I fabriken är Claude Code harness inne i varje session som borgmästaren
kör – borgmästaren är agenten som samordnar fabriken. Runt sessionerna har
fabriken dessutom ett eget lager som startar nya sessioner och lämnar över
mellan dem. Det återkommer vi till senare i serien. En del av det en harness
gör syns inte för användaren: innan modellen läser projektets instruktioner
har harnessen redan gett den sina egna, om vilka verktyg som finns och hur
de ska användas.

## Vad som styr arbetet i fabriken

I fabriken är det fyra saker utanför modellen som styr arbetet.

{% figure "four-things" %}

**Grindar.** När sajten byggdes i september körde ett enda kommando tio
kvalitetsgrindar på varje pull request. Varje grind har ett test som
bevisar att den misslyckas när något medvetet har tagits sönder. Det beskrivs mer detaljerat i
[Så byggdes den här sajten av agenter](/sv/blog/how-this-site-was-built-by-agents/).

**Uppgifter med ett tydligt slut.** Uppgiften i exemplet har ett sådant
slut: alla tester går igenom. I båda byggena blev kraven numrerade
påståenden med acceptanskriterier och varje arbetspaket fick ett eget
beviskommando.

**Korta instruktioner.** Anthropic rekommenderar
[under 200 rader per fil](https://code.claude.com/docs/en/memory), eftersom
längre filer tar mer plats och följs sämre. Vi såg något liknande i
september med borgmästarens anteckningar: loggen hade blivit för lång för
att läsas i sin helhet, så nya sessioner hoppade över det mesta och tog
gamla fakta för aktuella. Den 24 september kortades lägeskortet – som
skrivs om varje gång en session lämnar över till nästa – och fick ett tak.

**En människa i början och i slutet.** Det första bygget kördes utan grind
vid planen och grundarens omdöme om resultatet blev "en sida från
90-talet". Sedan dess sitter grundarens grind vid planen. Ingen artikel och
ingen ändring av det som står på sajten blir offentlig utan att grundaren
har läst den först.

## Claude Code, Codex och GitHub Copilot

Vi beskriver alla tre utifrån dokumentationen, så som den såg ut den
12 oktober 2026, och reserverar oss för att verktygens begrepp och menyval
kan ha ändrats sedan dess. Borgmästaren arbetar i Claude Code, men det hade
lika gärna kunnat vara något av de andra två.

I **Claude Code** är instruktionsfilen CLAUDE.md och verktyget kan själv
[skriva ett första utkast till den](https://code.claude.com/docs/en/memory)
utifrån koden. Finns det ingen CLAUDE.md läser Claude Code AGENTS.md i
stället. Vad agenten får göra utan att fråga styrs av
[lägen](https://code.claude.com/docs/en/permission-modes): i terminalen och
i VS Code startar det i läget Auto om inget annat är inställt. Då granskar
en automatisk kontroll det mesta i bakgrunden och stoppar det som ser
riskabelt ut. I läget Manual frågar Claude Code innan det ändrar filer eller
kör kommandon som gör mer än att läsa.
[Claude Codes egna filändringar kan oftast återställas](https://code.claude.com/docs/en/checkpointing),
men inte det som ett kommando har ändrat eller
[som redan har nått andra system](https://code.claude.com/docs/en/how-claude-code-works#undo-changes-with-checkpoints).

I OpenAI:s **Codex** är AGENTS.md själva instruktionsfilen: Codex
[läser den innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
en fil per mapp från projektets rot ner till den mapp det arbetar i. Den
närmaste filen väger tyngst. På den egna datorn
[arbetar Codex i en sandlåda](https://learn.chatgpt.com/docs/agent-approvals-security)
där det oftast bara får skriva i projektets mapp, utan nätverk om inget
annat är inställt. En regel för godkännanden avgör när det måste stanna och
fråga.

I **GitHub Copilot** i VS Code är instruktionsfilen
[`.github/copilot-instructions.md`](https://code.visualstudio.com/docs/agent-customization/custom-instructions#_use-a-githubcopilot-instructionsmd-file)
och Copilot läser också AGENTS.md. Med inställningen
[Manual permissions](https://code.visualstudio.com/docs/agents/run/approvals),
som är förvald, ber Copilot om lov innan den kör kommandon eller använder
andra verktyg – utom vanliga kommandon som bara läser – men
[ändrar filer i projektmappen utan att fråga](https://code.visualstudio.com/docs/agents/agents-tutorial).
En
[kontrollpunkt (checkpoint)](https://code.visualstudio.com/docs/agents/run/review-code-edits#_restore-a-checkpoint)
återställer filerna och chatten till hur de såg ut före en viss förfrågan,
men inte kommandon som har körts eller ändringar i andra tjänster.

## Vad som kommer härnäst

Serien tar byggstenarna en i taget. Arbetstitlarna kan ändras på vägen.

1. Från AI-chatt till agentiskt arbete (den här delen)
2. [Instruktionsfilen](/sv/blog/the-instruction-file/)
3. Agenter med var sitt ansvarsområde
4. Skills – färdigheter som beskriver hur något ska göras
5. Model Context Protocol – ett gemensamt sätt för agenter att nå andra system
6. Var agenten körs och vem som startar den
7. <span id="del-7"></span>Gränser som sätts i förväg
8. Vad som har ändrats på vägen – [de senaste modellerna behöver mindre styrning än de förra](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices), men fortfarande en del
