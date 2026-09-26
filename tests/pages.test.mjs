import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { gzipSync } from "node:zlib";
import { parse } from "node-html-parser";
import { COMPRESSED_BUDGET, compressedSize, fontFaceSources, formatBytes, gzipBytes, inlineParts } from "../scripts/lib/budget.mjs";
import { gamePages } from "../scripts/lib/games.mjs";
import { fileToUrl, walk } from "../scripts/lib/site.mjs";
import { buildSite, copyDir, fixture, makePng, runGate, SRC, tempDir } from "./helpers.mjs";

// The same-origin CSS and JS both landing pages reference (head.njk); the
// helper is fed the built files so the test computes the number the gate prints.
const STYLESHEETS = ["/assets/css/fonts.css", "/assets/css/tokens.css", "/assets/css/base.css"];
const SCRIPTS = ["/assets/js/reveal.js"];
const SIZE_LINE = (url) => new RegExp(`^ok {4}pages: ${url.replaceAll("/", "\\/")} compressed css\\+js ([\\d,]+) B \\(limit 61,440\\)$`, "m");

async function assets(out, urls) {
  return Promise.all(urls.map(async (name) => ({ name, text: await readFile(path.join(out, name), "utf8") })));
}

async function measure(out, page) {
  return compressedSize(await readFile(path.join(out, page), "utf8"), {
    stylesheets: await assets(out, STYLESHEETS),
    scripts: await assets(out, SCRIPTS),
  });
}

describe("budget library (REQ-020, REQ-004)", () => {
  it("measures gzip at zlib's default level and formats byte counts", () => {
    const text = "body { margin: 0 }".repeat(40);
    assert.equal(gzipBytes(text), gzipSync(Buffer.from(text)).length);
    assert.equal(gzipBytes(Buffer.from(text)), gzipBytes(text));
    assert.equal(COMPRESSED_BUDGET, 61440);
    assert.equal(formatBytes(61440), "61,440");
    assert.equal(formatBytes(999), "999");
  });

  it("lists inline <style> and <script> content in document order, skipping script[src]", () => {
    const html = '<head><style>a{}</style><script src="/x.js"></script><script>1</script><style>b{}</style><script>2</script></head>';
    assert.deepEqual(inlineParts(html), [
      { kind: "inline-style", name: "inline <style> #1", text: "a{}" },
      { kind: "inline-style", name: "inline <style> #2", text: "b{}" },
      { kind: "inline-script", name: "inline <script> #1", text: "1" },
      { kind: "inline-script", name: "inline <script> #2", text: "2" },
    ]);
    assert.deepEqual(inlineParts("<p>no inline content</p>"), []);
  });

  it("compressedSize is gzip over the concatenation of files and inline content, with a per-part breakdown", () => {
    const html = "<head><style>.a { color: var(--x) }</style><script>console.log(1)</script></head>";
    const stylesheets = [{ name: "/a.css", text: ".a { margin: 0 }\n".repeat(50) }];
    const scripts = [{ name: "/b.js", text: "function b() { return 1 }\n".repeat(50) }];
    const result = compressedSize(html, { stylesheets, scripts });
    const texts = [stylesheets[0].text, scripts[0].text, ".a { color: var(--x) }", "console.log(1)"];
    assert.equal(result.total, gzipSync(Buffer.from(texts.join("\n"))).length);
    assert.equal(result.raw, Buffer.byteLength(texts.join("\n")));
    assert.deepEqual(result.parts.map((part) => [part.kind, part.name]), [
      ["stylesheet", "/a.css"],
      ["script", "/b.js"],
      ["inline-style", "inline <style> #1"],
      ["inline-script", "inline <script> #1"],
    ]);
    for (const [index, part] of result.parts.entries()) {
      assert.equal(part.raw, Buffer.byteLength(texts[index]));
      assert.equal(part.bytes, gzipBytes(texts[index]));
      assert.ok(!("text" in part), "the breakdown carries sizes, not the content");
    }
    // Compressing the concatenation never costs more than the parts one by one.
    assert.ok(result.total <= result.parts.reduce((sum, part) => sum + part.bytes, 0));
    assert.equal(compressedSize("<p></p>").raw, 0);
  });

  it("fontFaceSources reads every url() of every @font-face src, in the three spellings, skipping local() and other rules", () => {
    const css = `
      /* url(https://comment.example/ignored.woff2) */
      @font-face { font-family: "A"; src: local("Menlo"), url("https://fonts.gstatic.com/a.woff2") format("woff2"), url( '/b.woff2' ) format("woff2"); }
      .mark { background: url(/img/x.svg); }
      @font-face {
        font-family: "B";
        src: url(/c.woff2) format("woff2");
        unicode-range: U+0000-00FF;
      }
      @font-face { font-family: "C"; src: local("Consolas"); size-adjust: 109%; }
    `;
    assert.deepEqual(fontFaceSources(css), ["https://fonts.gstatic.com/a.woff2", "/b.woff2", "/c.woff2"]);
    assert.deepEqual(fontFaceSources(".a { src: url(/not-a-font.css) }"), []);
    assert.deepEqual(fontFaceSources(""), []);
  });
});

describe("pages gate", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("pages-");
    buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  it("passes on the real build", () => {
    const { status, output } = runGate("pages", tmp.dir);
    assert.equal(status, 0, output);
    assert.match(output, /PASS pages/);
  });

  it("prints both landing pages' compressed CSS + JS within 61,440 B — the helper's number (REQ-020, AC-21)", async () => {
    const { output } = runGate("pages", tmp.dir);
    for (const [url, page] of [["/", "index.html"], ["/sv/", path.join("sv", "index.html")]]) {
      const match = SIZE_LINE(url).exec(output);
      assert.ok(match, `${output}\nno compressed-size line for ${url}`);
      const printed = Number(match[1].replaceAll(",", ""));
      const measured = await measure(tmp.dir, page);
      assert.equal(printed, measured.total, `${url}: the gate prints the number scripts/lib/budget.mjs measures`);
      assert.ok(printed <= COMPRESSED_BUDGET, `${url}: ${printed} B exceeds the budget`);
      assert.deepEqual(measured.parts.map((part) => part.name), [...STYLESHEETS, ...SCRIPTS, "inline <script> #1"], `${url}: three stylesheets, reveal.js and the inline theme script`);
    }
    // The game pages and the pages that play a game (si-y6pp) are held to
    // the same budget, and no other page is.
    const measuredPages = [...output.matchAll(/^ok {4}pages: (\S+) compressed css\+js/gm)].map(([, url]) => url).sort();
    const playing = [];
    for (const file of await walk(tmp.dir, ".html")) {
      if (parse(await readFile(file, "utf8")).querySelector(".games")) playing.push(fileToUrl(path.relative(tmp.dir, file)));
    }
    const games = gamePages(SRC, false).map((game) => game.url);
    assert.ok(games.length > 0 && playing.length > 0, "this development build has game pages and pages that play them");
    assert.deepEqual(measuredPages, ["/", "/sv/", ...games, ...playing].sort(), "the compressed budget is measured on the two landing pages, the game pages and the pages that play a game only");
  });

  it("fails a landing page whose compressed CSS + JS exceeds the budget, naming the total (REQ-020)", async () => {
    const over = await tempDir("pages-over-");
    try {
      const copy = await copyDir(tmp.dir, path.join(over.dir, "site"));
      const file = path.join(copy, "index.html");
      // A 70 KB script of base64 noise: gzip cannot shrink it below the
      // budget. The page links it as a same-origin file, so it weighs on the
      // compressed CSS + JS only and never on the HTML + CSS size budget,
      // whatever the landing page itself weighs (inline, it pushed a landing
      // page of over 80 KB past that budget too: si-jwwd).
      const pad = randomBytes(53760).toString("base64");
      assert.equal(pad.length, 70 * 1024);
      await writeFile(path.join(copy, "assets", "js", "pad.js"), `var pad = "${pad}";\n`);
      const html = (await readFile(file, "utf8")).replace("</head>", `<script src="/assets/js/pad.js"></script>\n</head>`);
      await writeFile(file, html);
      const { status, output } = runGate("pages", copy);
      assert.equal(status, 1, output);
      const match = /^FAIL {2}index\.html: compressed css\+js is ([\d,]+) B, limit 61,440 B \(REQ-020\)$/m.exec(output);
      assert.ok(match, output);
      const total = Number(match[1].replaceAll(",", ""));
      assert.ok(total > COMPRESSED_BUDGET, `${total} B names a total over the budget`);
      const scripts = [...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map(([, src]) => src);
      assert.deepEqual(scripts, [...SCRIPTS, "/assets/js/pad.js"]);
      assert.equal(total, compressedSize(html, { stylesheets: await assets(copy, STYLESHEETS), scripts: await assets(copy, scripts) }).total);
      assert.doesNotMatch(output, SIZE_LINE("/"));
      assert.match(output, SIZE_LINE("/sv/"), "the untouched Swedish landing page still passes");
      assert.doesNotMatch(output, /FAIL {2}sv\/index\.html/);
      assert.match(output, /FAIL pages \(1 problem\)/);
    } finally {
      await over.cleanup();
    }
  });

  it("fails a page without og:image, one whose og:image is relative, missing, not a PNG, not 1200 × 630 or over 300 KB, and tags that do not state the image (si-awlu)", async () => {
    const broken = await tempDir("pages-images-");
    try {
      const copy = await copyDir(tmp.dir, path.join(broken.dir, "site"));
      const heavy = makePng(1200, 630, { noise: true });
      await writeFile(path.join(copy, "assets", "img", "small.png"), makePng(1200, 600));
      await writeFile(path.join(copy, "assets", "img", "heavy.png"), heavy);
      const image = (url) => (html) => html.replace(/(<meta property="og:image" content=")[^"]*"/, `$1${url}"`);
      const edits = {
        "about/index.html": (html) => html.replace(/\n\s*<meta property="og:image" content="[^"]*">/, ""),
        "blog/index.html": image("/assets/img/share.png"),
        "sv/index.html": image("https://addablelabs.se/assets/img/nowhere.png"),
        "sv/about/index.html": image("https://addablelabs.se/assets/img/small.png"),
        "sv/blog/index.html": image("https://addablelabs.se/assets/img/heavy.png"),
        "blog/how-this-site-was-built-by-agents/index.html": (html) =>
          image("https://addablelabs.se/blog/how-this-site-was-built-by-agents/cover-600.webp")(html)
            .replace('<meta property="og:image:width" content="1200">', '<meta property="og:image:width" content="600">')
            .replace('<meta name="twitter:card" content="summary_large_image">', '<meta name="twitter:card" content="summary">')
            .replace(/(<meta name="twitter:image:alt" content=")[^"]*"/, '$1Another text"'),
        "404.html": (html) => html.replace(/\n\s*<meta property="og:image:type" content="[^"]*">/, ""),
      };
      for (const [rel, edit] of Object.entries(edits)) {
        const file = path.join(copy, rel);
        const html = await readFile(file, "utf8");
        const edited = edit(html);
        assert.notEqual(edited, html, `the edit must change ${rel}`);
        await writeFile(file, edited);
      }
      const { status, output } = runGate("pages", copy);
      assert.equal(status, 1, output);
      const failures = output.split("\n").filter((line) => line.startsWith("FAIL  "));
      assert.deepEqual(failures, [
        "FAIL  404.html: og:image:type is null, expected \"image/png\"",
        "FAIL  about/index.html: missing og:image",
        "FAIL  blog/how-this-site-was-built-by-agents/index.html: og:image /blog/how-this-site-was-built-by-agents/cover-600.webp is not a PNG",
        "FAIL  blog/how-this-site-was-built-by-agents/index.html: og:image:width is \"600\", expected \"1200\"",
        "FAIL  blog/how-this-site-was-built-by-agents/index.html: twitter:card is \"summary\", expected \"summary_large_image\"",
        "FAIL  blog/how-this-site-was-built-by-agents/index.html: twitter:image:alt is not og:image:alt",
        "FAIL  blog/index.html: og:image /assets/img/share.png is not an absolute URL on https://addablelabs.se",
        "FAIL  sv/about/index.html: og:image /assets/img/small.png is 1200 × 600 px, not 1200 × 630",
        `FAIL  sv/blog/index.html: og:image /assets/img/heavy.png is ${(heavy.length / 1024).toFixed(1)} KB, over 300.0 KB`,
        "FAIL  sv/index.html: og:image /assets/img/nowhere.png is not a file in the build",
      ]);
      assert.match(output, /FAIL pages \(10 problems\)/);
    } finally {
      await broken.cleanup();
    }
  });

  it("fails a cross-origin script[src], module preload, font preload and @font-face src, each once, and not the same-origin or inline scripts (REQ-024, REQ-020, REQ-004)", () => {
    const { status, output } = runGate("pages", fixture("pages-off-origin", "site"));
    assert.equal(status, 1);
    assert.match(output, /^FAIL {2}index\.html: cross-origin script\[src\] https:\/\/cdn\.example\.com\/lib\.js$/m);
    assert.match(output, /^FAIL {2}index\.html: cross-origin link\[rel~=modulepreload\] \/\/cdn\.example\.com\/module\.js$/m);
    assert.match(output, /^FAIL {2}index\.html: cross-origin link\[rel~=preload\]\[as=font\] https:\/\/fonts\.gstatic\.com\/s\/jetbrainsmono\/v1\/Light\.woff2$/m);
    assert.match(output, /^FAIL {2}index\.html: @font-face src https:\/\/fonts\.gstatic\.com\/s\/jetbrainsmono\/v1\/Light\.woff2 in \/assets\/css\/fonts\.css is not on the site's origin$/m);
    assert.match(output, /FAIL pages \(4 problems\)/);
    assert.doesNotMatch(output, /app\.js/, "the same-origin script is not reported");
    assert.doesNotMatch(output, /<script>/, "inline scripts are allowed");
    assert.doesNotMatch(output, /Regular\.woff2/, "the same-origin @font-face src is not reported");
  });

  it("passes a same-origin script[src], an inline script, same-origin module and font preloads and same-origin @font-face sources", () => {
    const { status, output } = runGate("pages", fixture("pages-scripts", "site"));
    assert.equal(status, 0, output);
    assert.match(output, /PASS pages/);
    assert.match(output, SIZE_LINE("/"));
  });

  it("fails on two h1 elements and an image without alt, naming the page", () => {
    const { status, output } = runGate("pages", fixture("pages-bad", "site"));
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: 2 h1 element\(s\), expected 1/);
    assert.match(output, /FAIL {2}index\.html: img \/assets\/img\/mark\.svg lacks alt/);
    assert.match(output, /FAIL pages/);
  });
});
