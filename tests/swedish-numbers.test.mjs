// Swedish numbers on one line (si-j1b7): the space inside a digit group and
// the space before "%" become no-break spaces on the Swedish pages, in their
// body's text and nowhere else (scripts/lib/swedish-numbers.mjs).

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { NO_BREAK_SPACE, numbersOnOneLine, swedishNumbersOnOneLine } from "../scripts/lib/swedish-numbers.mjs";
import { buildSite, copyProject, IMAGE_FRONT_MATTER, tempDir, writeArticleImage } from "./helpers.mjs";

// U+00A0, built here rather than typed, so that it cannot be lost on the way.
const N = String.fromCharCode(0xa0);

// posthtml as the build runs it: the copy Eleventy's HTML transformer loads.
const posthtml = createRequire(import.meta.resolve("@11ty/eleventy"))("posthtml");
const transform = async (html) => (await posthtml([swedishNumbersOnOneLine]).process(html)).html;

describe("numbersOnOneLine", () => {
  it("is U+00A0 it joins with", () => {
    assert.equal(NO_BREAK_SPACE, N);
  });

  it("joins digit groups of one to three leading digits and of several groups", () => {
    for (const [typed, joined] of [
      ["5 000", `5${N}000`],
      ["25 387", `25${N}387`],
      ["142 000", `142${N}000`],
      ["1 500 000", `1${N}500${N}000`],
      ["12 345 678 901", `12${N}345${N}678${N}901`],
    ]) {
      assert.equal(numbersOnOneLine(`kostade ${typed} tokens`), `kostade ${joined} tokens`, typed);
    }
  });

  it("keeps a number and its per cent sign together", () => {
    assert.equal(numbersOnOneLine("tog 36 % av dygnet"), `tog 36${N}% av dygnet`);
    assert.equal(numbersOnOneLine("mellan 0,3 % och 4–5 %."), `mellan 0,3${N}% och 4–5${N}%.`);
    assert.equal(numbersOnOneLine("1 500 %"), `1${N}500${N}%`);
    assert.equal(numbersOnOneLine("36% och ett ensamt %"), "36% och ett ensamt %");
  });

  it("leaves a year, a date and numbers that are no digit groups as they are", () => {
    for (const text of ["2026", "den 11 oktober 2026", "år 2025 och 2026", "år 2026 100 gånger", "12 34", "1 0000", "kapitel 3 och 4"]) {
      assert.equal(numbersOnOneLine(text), text);
    }
  });

  it("leaves a group that touches a letter or another digit as it is", () => {
    for (const text of ["x1 000", "25 387kr", "A4 000"]) assert.equal(numbersOnOneLine(text), text);
  });

  it("joins each end of a range and a group before a decimal comma", () => {
    assert.equal(numbersOnOneLine("50 000–100 000"), `50${N}000–100${N}000`);
    assert.equal(numbersOnOneLine("1 234,5"), `1${N}234,5`);
  });

  it("takes a line break in a hard-wrapped source for the space it shows as", () => {
    assert.equal(numbersOnOneLine("kostade 25\n387 tokens, 36\n%"), `kostade 25${N}387 tokens, 36${N}%`);
  });
});

describe("swedishNumbersOnOneLine (posthtml, as Eleventy's HTML transformer runs it)", () => {
  const head = [
    "<head>",
    "<title>25 387 tokens, 36 %</title>",
    '<meta name="description" content="25 387 tokens, 36 %">',
    '<script type="application/ld+json">{"name": "25 387 tokens, 36 %"}</script>',
    "</head>",
  ].join("\n");
  const page = (lang, body) => `<!doctype html>\n<html lang="${lang}">\n${head}\n<body>\n${body}\n</body>\n</html>\n`;
  // Every place a Swedish page may hold a number, and the text the rule
  // leaves alone in each: code, attributes (a link's URL among them), the
  // figures, scripts, styles, form fields and comments.
  const body = (s) =>
    [
      `<p>Omstarten kostade 25${s}387 tokens, 36${s}% av dygnet, år 2026.</p>`,
      `<table><tr><td class="align-right">1${s}500${s}000</td><td>12${s}%</td></tr></table>`,
      `<p><a href="https://github.com/addable-labs/gaimer/blob/main/prompts.js#L2-L73" title="25 387 tokens" data-count="1 500 000">2${s}830</a> tecken</p>`,
      "<p>Kör <code>sleep 1 000</code>, tryck <kbd>36 %</kbd>, se <samp>25 387</samp>.</p>",
      "<pre>25 387\n36 %</pre>",
      '<figure class="figure"><svg viewBox="0 0 320 248" role="img"><title>25 387 tokens</title><text x="16" y="24">29 720 tokens, 36 %</text></svg></figure>',
      "<textarea>25 387</textarea>",
      '<style>.a::after { content: "25 387"; }</style>',
      '<script>const tokens = "25 387, 36 %";</script>',
      "<!-- 25 387 tokens, 36 % -->",
    ].join("\n");

  it("joins the numbers in a Swedish page's text, its tables and its links' text, and changes nothing else", async () => {
    assert.equal(await transform(page("sv", body(" "))), page("sv", body(N)));
  });

  it("leaves an English page as it was, to the byte", async () => {
    const english = page("en", body(" "));
    assert.equal(await transform(english), english);
  });

  it("leaves a page without <html lang=\"sv\"> as it was", async () => {
    const fragment = body(" ");
    assert.equal(await transform(fragment), fragment);
  });
});

// The plugin as the build registers it: the pages of an article of the case's
// own, in a copy of the project, as Eleventy writes them.
describe("the build", () => {
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("numbers-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    const articles = {
      en: { title: "What 25,387 tokens cost", body: "## 25,387 tokens\n\nThe restart cost 25,387 tokens, 36% of the day, in 2026. Swedish writes 25 387 and 36 %.\n\nRun `sleep 1 000` to wait.\n" },
      sv: { title: "Vad 25 387 tokens kostade", body: "## 25 387 tokens\n\nOmstarten kostade 25 387 tokens, 36 % av dygnet, år 2026.\n\nKör `sleep 1 000` för att vänta.\n" },
    };
    for (const [lang, { title, body }] of Object.entries(articles)) {
      const frontMatter = ["---", `title: ${title}`, `description: ${title}.`, ...IMAGE_FRONT_MATTER, "date: 2026-09-20", "category: ai-journey", "translationKey: numbers", "draft: false", "aiGenerated: true", "humanReviewed: true", "---"];
      await writeFile(path.join(project, "src", lang, "blog", "posts", "numbers.md"), `${frontMatter.join("\n")}\n\n${body}`);
    }
    await writeArticleImage(project, "numbers");
    out = buildSite(path.join(tmp.dir, "site"), {}, project);
  });
  after(() => tmp.cleanup());

  it("joins the numbers of a Swedish article's body, not its <head>, code or heading id", async () => {
    const html = await readFile(path.join(out, "sv", "blog", "numbers", "index.html"), "utf8");
    const [headPart, bodyPart] = html.split("</head>");
    assert.ok(bodyPart.includes(`Omstarten kostade 25${N}387 tokens, 36${N}% av dygnet, år 2026.`), "the paragraph");
    assert.ok(bodyPart.includes(`<h2 id="25-387-tokens">25${N}387 tokens</h2>`), "the heading, with the id made of it as typed");
    assert.ok(bodyPart.includes("<code>sleep 1 000</code>"), "the code");
    assert.ok(headPart.includes("<title>Vad 25 387 tokens kostade"), "the title");
    assert.ok(!headPart.includes(N), "nothing in the <head>");
  });

  it("leaves the English article and the feeds without a no-break space", async () => {
    const english = await readFile(path.join(out, "blog", "numbers", "index.html"), "utf8");
    assert.ok(english.includes("The restart cost 25,387 tokens, 36% of the day, in 2026. Swedish writes 25 387 and 36 %."));
    assert.ok(!english.includes(N), "the English article");
    for (const feed of [path.join("sv", "feed.xml"), "feed.xml"]) {
      const xml = await readFile(path.join(out, feed), "utf8");
      assert.ok(!xml.includes(N), feed);
    }
    assert.ok((await readFile(path.join(out, "sv", "feed.xml"), "utf8")).includes("Omstarten kostade 25 387 tokens, 36 % av dygnet"));
  });
});
