---
title: "Städningen av Gaimer: Tetris och Pong, före och efter"
description: Den 24 och 25 september 2026 slog fabriken ihop 41 pull requests i Gaimer, skrivbordsappen som gör ett litet spel av en beskrivning. Vad de ändrade och ett Tetris och ett Pong gjorda med dess systemprompt från före och efter, att spela på sidan.
date: 2026-09-25
category: app-development        # app-development | ai-journey
translationKey: cleaning-up-gaimer
draft: true                      # byggs lokalt, lämnas utanför det publika bygget (se README)
aiGenerated: true                # AI har skrivit texten
humanReviewed: false             # true när en person har läst den
---

[Gaimer](https://github.com/addable-labs/gaimer) är en skrivbordsapp som
gör ett litet spel av en beskrivning. Du skriver vad du vill ha, till
exempel "Pong". Appen ber då den AI-leverantör du själv kopplar in, OpenAI
med din egen API-nyckel eller Claude genom ditt eget Claude Code, om ett
helt spel i JavaScript som den sparar och kör i en egen isolerad sida. Den
är öppen källkod under MIT-licensen och körs på macOS, Windows, Linux och
iOS.

Den 24 och 25 september 2026 slog fabriken, den [agentdrivna
mjukvarufabriken](/sv/blog/why-we-run-an-agent-run-factory/) bakom den här
sajten, ihop 41 pull requests i Gaimer med sammanlagt 68 commits. Var och
en säger varför den gjordes och vad som kontrollerades. Tetris och Pong,
gjorda med den gamla och den nya systemprompten, visar sedan vad den nya
prompten gör. Alla fyra spelen går att spela här.

## Vad som ändrades

### Att öppna och spara spel

Ett sparat spel kunde vägra att öppnas ("Missing required field: title")
när dess framsteg hade sparats: appen läste ibland de sparade framstegen
som spelet. "Restore progress?" visades aldrig, eftersom dialogrutan som
den behöver inte var installerad. Ett sparat spel öppnas nu direkt i
stället för efter en sekunds väntan och ett nytt spel som blir klart medan
ett sparat är öppet tar dess plats. Appen frågar innan den raderar ett spel
och en sparning som inte kan fungera säger direkt varför.

### Fel som ett spel kastar

Ett syntaxfel i ett spels kod stoppade förut sidans enda skript: spelaren
såg en mörk canvas utan något meddelande. Spelets kod körs nu i ett eget
skript och varje fel når appen. I WebKit, som kör appen på macOS och iOS,
visades felen bara som "Script error." och den byggda appens policy
stoppade skriptet som rapporterar dem; båda skripten laddas nu från
`data:`-adresser, vilket löser båda. Ett fel kommer med sin rad och kolumn
i spelets kod, eller med en notering om att det hittades efter kodens slut.
Kod som klipptes av mitt i ett uttryck ger nu ett syntaxfel.

### Kopplingen till Claude

Gaimer når Claude genom användarens kommandorad för Claude Code. Varje spel
var förut en hel Claude Code-session, med Claude Codes egen systemprompt,
Gaimers inklistrad i användarens meddelande och en sessionslogg sparad
varje gång. Nu är det ett enkelt anrop till modellen: Gaimers prompt i en
egen fil, de inbyggda verktygen avstängda och ingen session sparad. Två
flaggor till håller användarens egna CLAUDE.md-filer, hooks, plugins,
skills och MCP-servrar utanför. Ett anrop som går över appens tidsgräns
stoppas nu i stället för att fortsätta på användarens abonnemang, ett
misslyckat anrop säger varför i stället för "Exit code 1" och inloggningen
kontrolleras en gång där upp till fyra inloggningsskal startade förut.

### Säkerhet

Huvudfönstrets Content Security Policy tillåter inte längre anrop till
Anthropics API eller bilder från valfri https-adress, något som appen inte
använder. Skalbehörigheten, som lät vilket skript som helst i fönstret köra
vilket kommando som helst som användaren, tillåter bara de tre
kommandorader som appen bygger. OpenAI-nyckeln, som låg i ett valv vars
lösenord och salt fanns i kodförrådet, ligger nu i systemets nyckelring.

### Städning

Det som inget använde togs bort: ett HTTP-plugin som byggdes in i appen men
aldrig anropades, vilket tog bort 31 crates ur Rust-bygget, rester från
projektmallen, ett tillståndslager som inget läste, metoder som inget
anropade och två engångsflyttar av gamla data som inte längre kunde hitta
något. Beroendena uppdaterades inom sina intervall, vilket rättade alla 22
anmärkningar i paketgranskningen.

### Tester och CI

Tester som inte kunde misslyckas byttes ut, tester lades till där en
regression skulle nå användaren och täckningen fick ett golv: 94 % av
satserna, 89 % av grenarna, 90 % av funktionerna och 96 % av raderna, de
nivåer som hade nåtts, avrundade nedåt. Enhetstesterna ökade från 101
till 358. CI gick från Node 20, utan stöd sedan 30 april, till Node 24
och aktuella actions med en token som bara kan läsa. Den kontrollerar
också Rust-kodens formatering och lints och bygger appen för Linux,
macOS, Windows och iOS på varje pull request; efter den sista
sammanslagningen gick alla fyra igenom.

### Den nya systemprompten

Ett spel görs i ett enda anrop, av Gaimers systemprompt och användarens
beskrivning. Den gamla prompten sa hur svaret skulle se ut, var spelet
körs, att det måste ta både tangentbord och pekskärm och hur det sparar och
återställer, men inget om hur ett spel ska se ut eller kännas.
[Omskrivningen](https://github.com/addable-labs/gaimer/pull/40) behåller
det kontraktet och lägger till avsnitt om utseende, spel och hastighet: en
visuell stil, partiklar och en liten skakning av skärmen, en startskärm,
ett bästa resultat, en jämnt stigande svårighet, ljud som görs i kod,
rörelse efter bildrutornas tid och pekarhändelser (pointer events), så att
en mus fungerar lika bra som ett finger. Den ber om "några hundra rader"
kod och gjorde prompten 6 873 tecken lång i stället för 2 830. Dess pull
request kallar den ett utkast att läsa, skrivet utan att anropa någon
AI-leverantör eller köra ett spel som gjorts med den.

### Den automatiska rättningsrundan

Ett nytt spel som får ett fel redan när det startar skickas nu tillbaka en
gång, med sin kod och sitt fel, till leverantören som skrev det. Det
rättade spelet tar sedan dess plats. Det gäller ett fel innan spelet är
redo, under de fem sekunderna efter det eller, eftersom den nya prompten
ber varje spel om en startskärm, under de fem sekunderna efter spelarens
första tryck, klick eller tangenttryckning.

### Att ändra det öppna spelet

När ett spel är öppet ändrar beskrivningsrutan nu det spelet. Modellen
svarar med ändringsblock, var och ett en bit av koden och det som ersätter
den, eller med hela spelet ändrat, som appen då tar som det är. Går blocken
inte att använda ber appen en gång om hela spelet. Knappen Undo change går
tillbaka en version och New game stänger spelet.

## Så gjordes spelen

Varje spel gjordes så som Gaimers Claude-leverantör gör ett efter
städningen: samma kommandorad, körd på samma sätt, med ordet "Tetris" eller
"Pong" som beskrivning och den modell som Gaimer använder för Claude när
ingen är vald. Bara systemprompten skiljer sig: den från före städningen,
oförändrad sedan 1 april, eller den som städningen skrev. Varje svar lästes
med appens egen kod och varje spel körs på en spelsida byggd som appens i
dess version, utan det som bara appen har, till exempel dess sparfiler. Det
är ett spel per prompt och beskrivning, inte ett prestandatest.

| Spel | Systemprompt | Tid | Utdata-tokens | Rader kod |
|---|---|---:|---:|---:|
| Tetris | före | 245 s | 29 720 | 478 |
| Tetris | efter | 476 s | 58 031 | 545 |
| Pong | före | 68 s | 9 093 | 219 |
| Pong | efter | 204 s | 22 030 | 370 |

Utdata-tokens räknar in modellens tänkande. Det första anropet för Tetris
med den nya prompten gick över appens dåvarande gräns på 300 sekunder och
stoppades där, så som appen skulle ha gjort: i Gaimer betydde det felet
"Command timed out" och inget spel. Det Tetris som visas kommer från ett
andra anrop, gjort på samma sätt utan gränsen, som tog 476 sekunder.
Fabriken har sedan dess höjt gränsen till
[15 minuter](https://github.com/addable-labs/gaimer/pull/51). Alla fyra
startade utan fel, så inget av spelen från efter städningen behövde
rättningsrundan.

Spela kör ett spel där dess startskärm är och tangenterna går sedan till
spelet, inte till sidan. Ett spel körs åt gången.

{% games "tetris" %}

Tetris från före städningen startar direkt, utan startskärm. Det ritar
alltid fem pekknappar längs nederkanten och tar emot tryck bara genom
touch-händelser, så en mus gör ingenting i det. Det visar poäng, nivå,
rader och nästa bit, markerar var biten kommer att landa och pausar på P.
Det från efter kallade sig Neon Block Drop och skrev TETRIS på sin
startskärm. Det väntar på ett tryck, ett klick eller en tangent, ritar
rundade block i en inramad spelplan, sparar ett bästa resultat, visar
pekknappar först när skärmen har rörts och rensar rader med ett ljud,
partiklar och en liten skakning.

{% games "pong" %}

Pong från före städningen startar också direkt, med bollen redan i spel.
Racketarna är platta staplar, det tar piltangenterna, W och S eller ett
finger som dras och det har inget ljud. Det från efter öppnar med en
startskärm, ritar lysande racketar och en lysande boll som sprutar
partiklar där den träffar och visar poäng, bästa resultat och en nivå längs
överkanten. Det spelar ljud, tar ett drag med ett finger eller en mus,
ritar två pilknappar efter en beröring och sätter racketarna nedtill och
upptill på en skärm som är högre än den är bred.

Båda spelen från den nya prompten är längre och deras anrop gav ungefär två
till två och en halv gånger så många utdata-tokens. Paren visar att
promptens nya avsnitt når spelen: startskärmar, bästa resultat, ljud och pekarhändelser
finns i båda spelen från efter städningen och i inget av dem från före.