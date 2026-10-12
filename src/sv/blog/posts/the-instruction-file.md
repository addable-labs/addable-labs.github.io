---
title: Instruktionsfilen, det första en AI-agent läser
description: Andra delen i serien "Från AI-chatt till agentiskt arbete" – samma instruktionsfil några veckor senare, vad som kommer till och vad som stryks, varför kort slår långt och hur en fil räcker för tre verktyg.
image: cover.png                 # en PNG på 1200 × 630 i artikelns mediemapp
imageAlt: En utvecklare sedd bakifrån, delad i två halvor framför två skärmar. Den vänstra halvan är grå och lugnare framför en chatt. Den högra är grön och aktiv, med handen höjd mot en skärm med en graf av agenter.
date: 2026-10-12
category: ai-journey             # app-development | ai-journey
translationKey: the-instruction-file
draft: true                      # ett utkast — sätt false för att publicera det
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # ingen har läst den ännu
---

I [Vad som gör en chatt till en AI-agent](/sv/blog/what-makes-a-chat-an-ai-agent/),
seriens första del, visade vi en kort AGENTS.md för en påhittad webbapp.
Den här delen följer samma fil några veckor senare: vad som kommer till,
vad som stryks och var en regel måste stå för att varje verktyg ska läsa
den i tid.

Poängen är att en kort och sann instruktionsfil gör mer nytta än en lång
prompt. OpenAI säger nästan detsamma om själva filen:
["en kort och korrekt AGENTS.md är mer användbar än en lång fil full av vaga regler"](https://learn.chatgpt.com/docs/learn/best-practices)
(vår översättning).

## Samma fil några veckor senare

Historien är påhittad, liksom filen. Första dagen stod bara det i filen som
en ny kollega behöver veta. Anthropic skriver att en rad hör hemma där när
["en ny kollega skulle behöva samma sammanhang för att komma igång"](https://code.claude.com/docs/en/memory)
(vår översättning). Några veckor senare ser filen ut så här:

```markdown
# Instruktioner för AI-agenter

## Bygga och testa
- Installera beroenden med `npm install`.
- Kör en enskild testfil med `npm test -- <fil>`.
- Kör `npm test` innan du säger att du är klar.

## Regler
- Skriv ett test för varje bugg du rättar.
- Ändra inget i mappen `migrations/`: filerna där har redan körts i
  produktion. Lägg till en ny migrering i stället.
- Fråga innan du lägger till ett nytt paket.
```

**Regeln om migreringarna har fått sitt skäl** och en väg ut.
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
och
[dokumentationen för GitHub Copilot i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
råder båda att skälet står med regeln. Den senare skriver att AI:n fattar
["bättre beslut i gränsfall"](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
(vår översättning) när instruktionen förklarar varför regeln finns.

**En rad kom till när ett misstag kom tillbaka.** Två gånger körde agenten
hela testsviten efter en ändring på en enda rad, så nu står det i filen hur
en enskild testfil körs. Det är det första skälet på Anthropics lista över
när en rad ska läggas till:
["Claude gör samma misstag en andra gång"](https://code.claude.com/docs/en/memory)
(vår översättning).

**Ett stycke har strukits.** Filen hade fått en beskrivning av vad varje
fil i projektet gör. Agenten läser filerna själv och Anthropic räknar
[beskrivningar av kodbasen fil för fil](https://code.claude.com/docs/en/best-practices)
till det som inte hör hemma i filen. Anthropics fråga för varje rad är
["Skulle Claude göra misstag om det här togs bort?"](https://code.claude.com/docs/en/best-practices)
(vår översättning). För beskrivningen av filerna var svaret nej.

**Webbklienten har fått en egen fil.** Testerna i mappen `web/` ingår inte
i `npm test`, så där ligger en egen AGENTS.md med en rad som lägger till
något och inte säger emot rotfilen:

```markdown
- Kör också `npm run test:web` innan du säger att du är klar.
```

**Regeln om `migrations/` står kvar i rotfilen.** Den hade kunnat ligga i
en egen fil i mappen, men verktygen läser filer i undermappar vid olika
tillfällen (se tabellen längre ned). Claude Code läser en undermapps
AGENTS.md [när det öppnar en fil där](https://code.claude.com/docs/en/memory),
Codex
[slutar leta i den mapp det startade i](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
och i VS Code är filer i undermappar
[ett experiment](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
som för den lokala agenten [är avstängt från början](https://code.visualstudio.com/docs/agent-customization/custom-instructions).
En regel i `migrations/` kan alltså nå agenten för sent eller inte alls.
Även i rotfilen stoppar regeln ingenting:
[Anthropics eget exempel på en krok (hook)](https://code.claude.com/docs/en/best-practices)
är en som blockerar skrivningar till mappen med migreringar och sådana
spärrar är ämnet för del 7.

I självskattningen nivå, som vi skrev om i
[Lärdomar från att bygga nivå](/sv/blog/lessons-from-building-niva/), får
databasmigreringar bara läggas till och aldrig ändras. Där är regeln mer
än en rad i en fil. Den hör till testmiljön som byggdes före funktionerna:
"ett beslut som är nedskrivet är ett beslut som testmiljön ser till att vi
lever upp till".

## Kort slår långt, men vinsterna är små

Leverantörerna sätter också gränser i siffror. GitHubs förslag till prompt
för att låta Copilot skriva filen säger att instruktionerna
["inte får vara längre än två sidor"](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
(vår översättning) och Codex
[slutar som standard lägga till filer när de tillsammans når 32 KiB](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Beläggen för att filen hjälper är tunnare än råden.
[En studie från ETH Zürich](https://arxiv.org/html/2602.11988v3), i sin
tredje version från den 29 september 2026, lät AI-agenter lösa verkliga
uppgifter med och utan instruktionsfil. Filer som utvecklarna själva hade
skrivit höjde andelen lösta uppgifter med 2,4 % i genomsnitt, en skillnad
som inte är statistiskt säkerställd. Filer som en språkmodell hade skrivit
sänkte den med 0,5 och 2 % i studiens två uppsättningar uppgifter och
gjorde körningarna 20 och 23 % dyrare.
Forskarna föreslår att man tills vidare avstår från genererade filer.
Översikter av repot hjälpte inte.
[En mindre studie av 124 pull requests](https://arxiv.org/abs/2601.20404)
fann att körningarna med en AGENTS.md hade 28,64 % kortare mediantid och
att agenterna löste uppgifterna ungefär lika ofta.

Vinsterna är alltså små och beläggen spretar. ETH-studien stöder ändå en
del av leverantörernas råd: det som agenten kan ta reda på själv hör inte
hemma i filen.

**Så har det ändrats.** Instruktioner som skrevs för en äldre modell kan
behöva bli kortare och lugnare när modellen byts.
[Anthropics promptguide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
skriver i oktober 2026 att nyare modeller lyssnar mer på systemprompten och
att den som tidigare skrev "CRITICAL: You MUST use this tool when..." nu
kan skriva "Use this tool when...". Betoning som "IMPORTANT" hör enligt
[Anthropic](https://code.claude.com/docs/en/best-practices) hemma på en
enda rad som Claude gång på gång hoppar över:
["om man betonar många rader sticker ingen av dem ut"](https://code.claude.com/docs/en/best-practices)
(vår översättning).
[Sedan den 25 september 2026](https://code.claude.com/docs/en/changelog)
har Claude Code kommandot `/doctor prompt-audit`, som
[letar efter instruktioner skrivna för äldre modeller](https://code.claude.com/docs/en/memory).

## En fil för tre verktyg

Verktygen beskriver vi här så som dokumentationen såg ut den 12 oktober
2026.

**Claude Code**
[läser AGENTS.md när det inte finns någon CLAUDE.md](https://code.claude.com/docs/en/memory).
Där finns en fälla: en personlig CLAUDE.local.md räknas som en CLAUDE.md.
Den som lägger till en sådan för egna anteckningar
[får Claude Code att sluta läsa AGENTS.md](https://code.claude.com/docs/en/memory)
om inte inställningen Project instructions är satt till att läsa båda. Ett
projekt som behöver en CLAUDE.md kan
[importera den gemensamma filen med raden `@AGENTS.md`](https://code.claude.com/docs/en/memory).
En mening som ber agenten läsa AGENTS.md räcker inte:
["Claude ser AGENTS.md bara om det bestämmer sig för att öppna filen"](https://code.claude.com/docs/en/memory)
(vår översättning). En symbolisk länk fungerar också, men Anthropic
[rekommenderar importen om någon arbetar på Windows](https://code.claude.com/docs/en/memory),
där Git annars kan checka ut länken som en vanlig textfil.

**Codex**
[läser AGENTS.md innan det gör något arbete](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
men
[slutar leta när det når den mapp det startade i](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
så en fil längre ned i trädet läses inte om Codex startas i roten. En
[AGENTS.override.md ersätter AGENTS.md i samma mapp](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

**GitHub Copilot** på GitHub
[läser både `.github/copilot-instructions.md` och AGENTS.md, där den närmaste AGENTS.md i mappträdet går före](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
[En enda CLAUDE.md i roten fungerar också](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
[Alla instruktioner som gäller skickas med till Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions),
så två filer som säger emot varandra är ett problem även där. I VS Code
kallar dokumentationen AGENTS.md
[ett format för flera agenter](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
och avråder från att
[räkna med en viss ordning när filer säger emot varandra](https://code.visualstudio.com/docs/agent-customization/custom-instructions),
eftersom verktygen hittar och slår ihop filer på olika sätt.

Tabellen visar vad sidorna samma dag säger om filer i undermappar.

| Verktyg | Vilka filer i undermappar som läses | När filerna säger emot varandra |
|---|---|---|
| [AGENTS.md, formatet](https://agents.md/) | Den närmaste filen till den fil som ändras | Den närmaste filen gäller |
| [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | Från roten ner till mappen Codex startade i | Den närmare filen går före |
| [Claude Code](https://code.claude.com/docs/en/memory) | Ovanför: vid start. Nedanför: när Claude Code öppnar en fil där | Alla läses ihop och Claude kan välja en av dem godtyckligt |
| [GitHub Copilot på GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) | Den närmaste AGENTS.md går före | Alla skickas med, personliga instruktioner först |
| [GitHub Copilot i VS Code](https://code.visualstudio.com/docs/agent-customization/custom-instructions) | Ett experiment, avstängt från början för den lokala agenten | Ingen ordning att räkna med |

Det som sidorna har gemensamt är det säkra: regler som måste gälla
överallt står i rotfilen och ingen fil säger emot en annan.

## Fabrikens regler står i filerna som läses först

Fabriken bakom den här sajten arbetar på samma sätt – det var i en sådan
fil, den som varje agent på maskinen läser först, som vi klistrade in
meddelandet till de andra agenterna den 12 september.
[Därför driver vi en agentdriven mjukvarufabrik](/sv/blog/why-we-run-an-agent-run-factory/)
säger att reglerna "står i de filer varje session läser först" och räknar
"reglerna för en delad maskin" till vårt eget bidrag. Två av dem,
förkortade och utan namn:

```markdown
- Stoppa aldrig processer med ett namnmönster: det träffar också andra
  agenters processer. Spara id:t för det du startar och stoppa det.
- Radera aldrig den delade containermiljöns data: där ligger alla
  projekts avbilder (images) och databaser.
```

Båda raderna bär sitt skäl så som leverantörerna råder. Inget av skälen
går att läsa ut ur koden.

Varje rad har också ett pris.
[En studie av borgmästarens kontext](/sv/blog/what-the-mayors-context-costs/)
räknar regelfilerna till startinnehållet och "startinnehållet följer med
varje anrop, så det kostar sin storlek gånger anropen, inte gånger
sessionerna". En rad som ingen behöver kostar alltså något i varje anrop.

Det som bara behövs ibland hör hemma någon annanstans: beskrivningen av en
agent med ett eget jobb i del 3 och färdigheter (skills) i del 4.
Instruktionsfilen är det första agenten läser, så den bär bara det som
gäller varje gång.
