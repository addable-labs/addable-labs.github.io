// The games an article plays in its page (si-y6pp; scripts/lib/games.mjs):
// the data and media checks, the block the `games` shortcode writes, the game
// pages, the draft rule that keeps all of it out of the production build
// (C14), the keys a game keeps in a real Chrome when the window changes size
// (si-27c8), and the gate rules a game page is held to by its path, and only
// by its path.

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { parse } from "node-html-parser";
import puppeteer from "puppeteer-core";
import { findChrome, launchChrome } from "../scripts/lib/chrome.mjs";
import { GAME_FILES, gameId, gamePagePaths, gameProblems, gamePages, MEDIA_DIR, readGames, renderGames } from "../scripts/lib/games.mjs";
import { exists, walk } from "../scripts/lib/site.mjs";
import { renderFigure } from "../src/_includes/figures/figures.mjs";
import { start as serve } from "../scripts/lib/static-server.mjs";
import { buildSite, copyDir, copyProject, runGate, SRC, tempDir } from "./helpers.mjs";

// The one article that plays games, and its game pages.
const ARTICLE = "cleaning-up-gaimer";
const GAME_PAGES = ["tetris-before", "tetris-after", "pong-before", "pong-after", "space-invaders-before", "space-invaders-after"].map((id) => `/blog/${ARTICLE}/${id}/`);
const ARTICLE_FILES = ["en", "sv"].map((lang) => path.join(lang, "blog", "posts", `${ARTICLE}.md`));

// The gates that read every built page, and so every game page.
const PAGE_GATES = ["pages", "parity", "content", "links", "feeds"];

/** Every file under `dir`, as paths relative to it with "/" between parts. */
async function relativeFiles(dir) {
  return (await walk(dir)).map((file) => path.relative(dir, file).split(path.sep).join("/"));
}

/**
 * A copy of the source files gameProblems reads for the article: the games
 * data, its media and its two files. Only its own media: every article has a
 * media directory now, for its image (si-awlu), and the copy holds no other
 * article to publish one with.
 */
async function copyGameSources(dir) {
  await cp(path.join(SRC, "_data", "games.json"), path.join(dir, "_data", "games.json"));
  await cp(path.join(SRC, MEDIA_DIR, ARTICLE), path.join(dir, MEDIA_DIR, ARTICLE), { recursive: true });
  for (const file of ARTICLE_FILES) await cp(path.join(SRC, file), path.join(dir, file));
  return dir;
}

/** Set `draft` in both language files of the article in a project copy. */
async function setDraft(project, draft) {
  for (const file of ARTICLE_FILES) {
    const full = path.join(project, "src", file);
    const source = await readFile(full, "utf8");
    const changed = source.replace(/^draft: (true|false)\b/m, `draft: ${draft}`);
    assert.notEqual(changed.match(/^draft: /m), null, `${file} has a draft line`);
    await writeFile(full, changed);
  }
}

describe("games data and media (si-y6pp)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("games-data-");
  });
  after(() => tmp.cleanup());

  it("finds nothing wrong with the real games data and media", () => {
    assert.deepEqual(gameProblems(SRC), []);
  });

  it("names the six game pages of the Gaimer article, and none for a source tree without games data", async () => {
    assert.deepEqual([...gamePagePaths(SRC)], GAME_PAGES);
    const empty = path.join(tmp.dir, "empty");
    await mkdir(empty);
    assert.deepEqual(readGames(empty), []);
    assert.equal(gamePagePaths(empty).size, 0);
    assert.deepEqual(gameProblems(empty), []);
  });

  it("names a media directory without its article, an entry without a name, an entry listed twice and a missing screenshot", async () => {
    const src = await copyGameSources(path.join(tmp.dir, "faults"));
    await mkdir(path.join(src, MEDIA_DIR, "no-such-article"));
    await writeFile(path.join(src, MEDIA_DIR, "no-such-article", "play.js"), "");
    const games = readGames(src);
    delete games[1].name;
    games.push({ ...games[0] });
    await writeFile(path.join(src, "_data", "games.json"), JSON.stringify(games, null, 2));
    await rm(path.join(src, MEDIA_DIR, ARTICLE, "pong-after", "play.webp"));
    const copy = games.length; // the entry listed twice, last
    assert.deepEqual(gameProblems(src), [
      "src/media/no-such-article/: no article no-such-article to publish it with (src/en/blog/posts/no-such-article.md and src/sv/blog/posts/no-such-article.md missing)",
      "src/_data/games.json entry 2: name missing or not valid (article and game are slugs, version is before or after, width and height whole pixels, touch true or false)",
      `src/_data/games.json entry 4: src/media/${ARTICLE}/pong-after/play.webp is missing`,
      `src/_data/games.json entry ${copy}: ${ARTICLE}/tetris-before is listed twice`,
    ]);
  });

  it("names the language whose article is missing, for the media and for each game", async () => {
    const src = await copyGameSources(path.join(tmp.dir, "no-sv"));
    await rm(path.join(src, ARTICLE_FILES[1]));
    const problems = gameProblems(src);
    assert.equal(problems[0], `src/media/${ARTICLE}/: no article ${ARTICLE} to publish it with (src/sv/blog/posts/${ARTICLE}.md missing)`);
    assert.deepEqual(problems.slice(1), [1, 2, 3, 4, 5, 6].map((entry) => `src/_data/games.json entry ${entry}: no article ${ARTICLE} (src/sv/blog/posts/${ARTICLE}.md missing)`));
  });

  it("fails the build, naming the file, when a game's screenshot is missing", async () => {
    const project = await copyProject(path.join(tmp.dir, "project"));
    await rm(path.join(project, "src", MEDIA_DIR, ARTICLE, "tetris-after", "start.webp"));
    assert.throws(() => buildSite(path.join(tmp.dir, "site"), {}, project), new RegExp(`src/media/${ARTICLE}/tetris-after/start\\.webp is missing`));
  });

  it("draws the calls of every game of the Gaimer article in its price figure, with the lines of the code it holds, in both languages (si-ri9t)", async () => {
    const entries = readGames(SRC).filter((entry) => entry.article === ARTICLE);
    const games = [...new Set(entries.map((entry) => entry.game))];
    assert.deepEqual(games, ["tetris", "pong", "space-invaders"]);
    for (const lang of ["en", "sv"]) {
      const strings = JSON.parse(await readFile(path.join(SRC, "_data", "strings", `${lang}.json`), "utf8"));
      const t = strings.figures.price;
      const [calls] = parse(renderFigure("price", { placement: "wide", strings })).querySelectorAll("svg title");
      for (const game of games) {
        const run = (side) => `${t[side]} ${t.rows[game][side].time} (${t.rows[game][side].tokens}, ${t.rows[game][side].lines})`;
        assert.ok(calls.text.includes(`${t.games[game]}: ${run("before")}, ${run("after")}`), `${lang}: ${game}'s two calls in the panel's name`);
      }
      // A line of code is a line as an editor counts it: a newline that ends
      // the file starts no line of its own
      for (const entry of entries) {
        const code = await readFile(path.join(SRC, MEDIA_DIR, ARTICLE, gameId(entry), "game.js"), "utf8");
        const lines = code.split(/\r\n|\n|\r/).length - (/(\r\n|\n|\r)$/.test(code) ? 1 : 0);
        assert.equal(Number(t.rows[entry.game][entry.version].lines.replace(/\D/g, "")), lines, `${lang}: figures.price.rows.${entry.game}.${entry.version}.lines`);
      }
    }
  });

  it("fails the build when an article asks for a game the data does not hold", async () => {
    const project = await copyProject(path.join(tmp.dir, "unknown"));
    const file = path.join(project, "src", ARTICLE_FILES[0]);
    await writeFile(file, (await readFile(file, "utf8")).replace('{% games "pong" %}', '{% games "chess" %}'));
    assert.throws(() => buildSite(path.join(tmp.dir, "unknown-site"), {}, project), new RegExp(`no games of "chess" for the article ${ARTICLE}`));
  });
});

describe("the games block of an article (renderGames)", () => {
  // Two versions of a made-up game: the first handles no touch, and its name
  // and alt text carry the characters HTML escapes.
  const entries = [
    { article: "an-article", game: "chess", version: "before", name: 'Knights & "Bishops"', title: "t", description: "d", width: 640, height: 480, touch: false },
    { article: "an-article", game: "chess", version: "after", name: "Chess", title: "t", description: "d", width: 320, height: 240, touch: true },
  ];
  const words = {
    before: "Before the cleanup",
    after: "After the cleanup",
    play: "Play",
    stop: "Stop",
    fullScreen: "Play full screen",
    code: "Code",
    needsKeyboard: "Needs a keyboard",
    "chess-before": { start: 'The board & a "start" button', play: "A move" },
    "chess-after": { start: "The start screen", play: "Mid-game" },
  };
  const html = renderGames(entries, { strings: { games: words } });
  const doc = parse(html);
  const figures = doc.querySelectorAll("figure.game");

  it("is one div with a figure per version, in the data's order, one script and no blank line", () => {
    assert.equal(html.match(/<div\b/g).length, 1, "one div, so a feed can drop the block whole");
    assert.ok(html.startsWith('<div class="games" id="games-chess">'), html.slice(0, 60));
    assert.ok(html.endsWith("</div>"));
    assert.doesNotMatch(html, /\n\s*\n/, "a blank line would end the HTML block in Markdown");
    assert.deepEqual(figures.map((figure) => figure.querySelector(".game-version").text), ["Before the cleanup", "After the cleanup"]);
    assert.deepEqual(doc.querySelectorAll("script").map((script) => [script.getAttribute("type"), script.getAttribute("src")]), [["module", "/blog/an-article/play.js"]]);
  });

  it("shows each version's start screen and a moment of play, with their size, alt text and lazy loading", () => {
    for (const [index, figure] of figures.entries()) {
      const entry = entries[index];
      const page = `/blog/an-article/chess-${entry.version}/`;
      const [start, play] = figure.querySelectorAll("img.game-shot");
      assert.equal(figure.querySelector(".game-screen img"), start, "the start screen is where a game plays");
      for (const [image, file] of [[start, "start.webp"], [play, "play.webp"]]) {
        assert.equal(image.getAttribute("src"), `${page}${file}`);
        assert.equal(image.getAttribute("width"), String(entry.width));
        assert.equal(image.getAttribute("height"), String(entry.height));
        assert.equal(image.getAttribute("loading"), "lazy");
        assert.equal(image.getAttribute("alt"), words[`chess-${entry.version}`][file === "start.webp" ? "start" : "play"]);
      }
    }
    assert.match(html, /alt="The board &amp; a &quot;start&quot; button"/);
  });

  it("gives each version a Play button, a link to its page and one to its code, each naming the game for a screen reader", () => {
    for (const [index, figure] of figures.entries()) {
      const entry = entries[index];
      const page = `/blog/an-article/chess-${entry.version}/`;
      const which = `${entry.name}, ${entry.version} the cleanup`;
      const button = figure.querySelector("button.game-play");
      assert.equal(button.getAttribute("type"), "button");
      assert.equal(button.getAttribute("data-game-page"), page);
      assert.equal(button.getAttribute("data-game-title"), which);
      assert.equal(button.getAttribute("data-play"), "Play");
      assert.equal(button.getAttribute("data-stop"), "Stop");
      assert.equal(button.querySelector(".game-play-label").text, "Play");
      assert.equal(button.querySelector(".game-for").text, ` ${which}`);
      const links = figure.querySelectorAll(".game-actions a");
      assert.deepEqual(links.map((link) => link.getAttribute("href")), [page, `${page}game.js`]);
      assert.deepEqual(links.map((link) => link.text), [`Play full screen: ${which}`, `Code: ${which}`]);
      assert.deepEqual(links.map((link) => link.querySelector(".game-for").text), [`: ${which}`, `: ${which}`]);
    }
    assert.match(html, /data-game-title="Knights &amp; &quot;Bishops&quot;, before the cleanup"/);
  });

  it('says "Needs a keyboard" only under a game that handles no touch', () => {
    assert.deepEqual(figures.map((figure) => figure.querySelector(".game-note")?.text ?? null), ["Needs a keyboard", null]);
  });

  it("refuses a game without the alt texts of both its screenshots", () => {
    const { "chess-after": _, ...withoutAfter } = words;
    assert.throws(() => renderGames(entries, { strings: { games: withoutAfter } }), /strings games\.chess-after needs the alt texts of its two screenshots, start and play/);
    const halfway = { ...words, "chess-after": { start: "The start screen" } };
    assert.throws(() => renderGames(entries, { strings: { games: halfway } }), /strings games\.chess-after needs/);
  });
});

describe("a draft's games are only in the development build (C14)", () => {
  // The article is a draft in a copy of the project whatever its front
  // matter says in the repository, so this keeps testing the rule after the
  // article is published.
  let tmp;
  let src;
  let dev;
  let prod;
  let expected; // every file of the article: its pages, its game pages, its media
  before(async () => {
    tmp = await tempDir("games-draft-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    src = path.join(project, "src");
    await setDraft(project, true);
    dev = buildSite(path.join(tmp.dir, "dev"), {}, project);
    prod = buildSite(path.join(tmp.dir, "prod"), { SITE_ENV: "production" }, project);
    const media = (await relativeFiles(path.join(src, MEDIA_DIR, ARTICLE))).map((file) => `blog/${ARTICLE}/${file}`);
    const pages = GAME_PAGES.map((url) => `${url.slice(1)}index.html`);
    expected = [`blog/${ARTICLE}/index.html`, `sv/blog/${ARTICLE}/index.html`, ...pages, ...media].sort();
  });
  after(() => tmp.cleanup());

  it("builds the article, its game pages, the games' code and the screenshots in a development build", async () => {
    assert.equal(expected.length, 2 + 6 + 6 * GAME_FILES.length + 3 + 3, "two articles, six game pages, three files a game, three scripts and the article's image with its two WebP copies (si-awlu)");
    const built = new Set(await relativeFiles(dev));
    assert.deepEqual(expected.filter((file) => !built.has(file)), []);
    // And the listings, the feeds and the sitemap point at it.
    for (const file of ["index.html", "blog/index.html", "sv/index.html", "sv/blog/index.html", "feed.xml", "sv/feed.xml", "sitemap.xml"]) {
      assert.match(await readFile(path.join(dev, file), "utf8"), new RegExp(`/blog/${ARTICLE}/`), file);
    }
  });

  it("leaves every file of it out of the production build, and every mention of it", async () => {
    const built = await relativeFiles(prod);
    assert.deepEqual(expected.filter((file) => built.includes(file)), []);
    assert.equal(await exists(path.join(prod, "blog", ARTICLE)), false, `no blog/${ARTICLE}/ directory`);
    const mentions = [];
    for (const file of built) {
      const content = await readFile(path.join(prod, file));
      if (content.includes(0)) continue; // a binary file, a font
      if (content.toString("utf8").includes(`/blog/${ARTICLE}/`)) mentions.push(file);
    }
    assert.deepEqual(mentions, [], "no page, listing, feed item or sitemap entry names the draft or its games");
  });

  it("passes the gates that read every page, on both builds", () => {
    for (const gate of PAGE_GATES) {
      const development = runGate(gate, dev, src);
      assert.equal(development.status, 0, `${gate} (development):\n${development.output}`);
      const production = runGate(gate, prod, src, { SITE_ENV: "production" });
      assert.equal(production.status, 0, `${gate} (production):\n${production.output}`);
    }
  });
});

describe("the game pages", () => {
  let tmp;
  let out;
  let games;
  before(async () => {
    tmp = await tempDir("games-pages-");
    out = buildSite(path.join(tmp.dir, "site"));
    games = gamePages(SRC, false);
  });
  after(() => tmp.cleanup());

  it("carry each game's code exactly, as JSON no HTML parser reads into, then the page script of its version", async () => {
    assert.deepEqual(games.map((game) => game.url), GAME_PAGES);
    for (const game of games) {
      const html = await readFile(path.join(out, game.url, "index.html"), "utf8");
      const doc = parse(html);
      const json = doc.querySelector("script#game-code");
      assert.equal(json.getAttribute("type"), "application/json");
      assert.doesNotMatch(json.rawText, /</, `${game.url}: no "<" that could end or bend the element`);
      const code = await readFile(path.join(SRC, MEDIA_DIR, ARTICLE, gameId(game), "game.js"), "utf8");
      assert.equal(JSON.parse(json.rawText), code, `${game.url}: the code as it was generated`);
      assert.deepEqual(doc.querySelectorAll("script[src]").map((script) => script.getAttribute("src")), [`/blog/${ARTICLE}/game-page-${game.version}.js`]);
      assert.equal(doc.querySelector("html").getAttribute("lang"), "en");
      assert.equal(doc.querySelector("link[rel=canonical]").getAttribute("href"), `https://addablelabs.se${game.url}`);
      assert.equal(doc.querySelector("h1").text, game.title);
      assert.equal(doc.querySelectorAll("iframe").length, 0, `${game.url}: its script makes the game's frame`);
    }
  });

  it("keep a game's code intact when it holds </script> or <!--", async () => {
    const project = await copyProject(path.join(tmp.dir, "project"));
    const file = path.join(project, "src", MEDIA_DIR, ARTICLE, "pong-before", "game.js");
    const code = `${await readFile(file, "utf8")}\n// </script><!-- <script> -->\nconst text = "</SCRIPT>";\n`;
    await writeFile(file, code);
    const site = buildSite(path.join(tmp.dir, "copy"), {}, project);
    const doc = parse(await readFile(path.join(site, "blog", ARTICLE, "pong-before", "index.html"), "utf8"));
    assert.equal(doc.querySelectorAll("script").length, 2);
    assert.equal(JSON.parse(doc.querySelector("script#game-code").rawText), code);
  });

  it("are left out of the feeds with the games block: a feed item carries the article's text only", async () => {
    for (const feed of ["feed.xml", "sv/feed.xml"]) {
      const xml = await readFile(path.join(out, feed), "utf8");
      const item = xml.split("<item>").find((part) => part.includes(`/blog/${ARTICLE}/</link>`));
      assert.ok(item, `${feed} has the draft's item in a development build`);
      assert.match(item, /Opening and saving games|Öppna och spara spel/, `${feed}: the article's text`);
      assert.doesNotMatch(item, /games-(tetris|pong|space-invaders)|game-shot|game-play|play\.js|\.webp/, feed);
    }
  });
});

// A real Chrome plays each game in the article as a reader does (si-27c8):
// Play, ArrowDown (Space in Space Invaders, which leaves ArrowDown to the
// page), the window changes size, the key again. Each key reaches the game
// and the article does not scroll. A game from before the cleanup
// loads again in a new frame at the new size, as the app did, and the new
// frame takes the keys as the first one did; until keepFocus in
// game-page-before.js the focus left with the old frame, and ArrowDown
// scrolled the article 40 px. A text field of the article keeps the focus,
// and its keys, while a game loads again. The cases skip when no Chrome is
// found, except under CHECK_REQUIRE_CHROME=1 (CI), where they run.
const CHROME = await findChrome();
const noChrome = CHROME === null && process.env.CHECK_REQUIRE_CHROME !== "1" ? "no Chrome found" : false;

describe("a game played in the article keeps the keys when the window changes size (si-27c8)", { skip: noChrome }, () => {
  let tmp;
  let server;
  let chrome;
  let browser;
  // Stopped by a signal, this file never reaches `after`, and Chrome, in a
  // process group of its own, would outlive it: kill it, and remove the
  // build, first.
  const onSignal = (signal) =>
    Promise.resolve(chrome?.kill())
      .then(() => tmp?.cleanup())
      .finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  before(async () => {
    assert.ok(CHROME, "CHECK_REQUIRE_CHROME=1 and no Chrome was found");
    tmp = await tempDir("games-keys-");
    server = await serve(buildSite(path.join(tmp.dir, "site")));
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    chrome = await launchChrome({ chromePath: CHROME });
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
  });
  after(async () => {
    await browser?.disconnect();
    await chrome?.kill();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await server?.close();
    await tmp?.cleanup();
  });

  /**
   * Whether `check` comes true within `ms`, asked every 50 ms. An error, as
   * from a frame not there yet or going away, counts as not yet.
   */
  async function until(check, ms) {
    const end = Date.now() + ms;
    for (;;) {
      if (await Promise.resolve().then(check).catch(() => false)) return true;
      if (Date.now() > end) return false;
      await delay(50);
    }
  }

  /**
   * The article in a new tab 1280 px wide, the game `id` (tetris-before, say)
   * scrolled to the top and played. Resolves to the tab and a function that
   * gives the frame the game runs in now, inside the frame of its page.
   */
  async function play(id) {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${server.url}/blog/${ARTICLE}/`, { waitUntil: "load" });
    const button = await page.$(`.game-play[data-game-page="/blog/${ARTICLE}/${id}/"]`);
    await button.evaluate((element) => element.closest(".game").scrollIntoView({ block: "start", behavior: "instant" }));
    await button.click();
    const gameFrame = () => page.frames().find((frame) => frame.url() === `${server.url}/blog/${ARTICLE}/${id}/`)?.childFrames()[0];
    return { page, gameFrame };
  }

  /** Whether `frame` has the focus: key presses go to it. */
  const hasKeys = (frame) => frame.evaluate(() => document.hasFocus());

  /**
   * The key pressed in a game: one the game takes itself, so the article
   * scrolls only if the key went to the article. Tetris and Pong take
   * ArrowDown. The Space Invaders games take Space and not ArrowDown, which
   * then scrolls the article 40 px even while the game has the keys, as a
   * key the game leaves alone goes on to the page (si-ri9t).
   */
  const keyOf = (id) => (id.startsWith("space-invaders-") ? { key: " ", name: "Space" } : { key: "ArrowDown", name: "ArrowDown" });

  /**
   * Press `key` in the tab. Resolves to how far the article scrolled and
   * whether the key reached `frame`, where the game runs.
   */
  async function press(page, frame, key) {
    await frame.evaluate(() => {
      if (!window.keysSeen) addEventListener("keydown", (event) => window.keysSeen.push(event.key), true);
      window.keysSeen = [];
    });
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press(key);
    const reached = await until(() => frame.evaluate((key) => window.keysSeen.includes(key), key), 3000);
    // A scroll by a key is animated: time enough for one to show
    await delay(300);
    return { scrolled: (await page.evaluate(() => scrollY)) - y, reached };
  }

  for (const url of GAME_PAGES) {
    const id = url.split("/").at(-2);
    const { key, name } = keyOf(id);
    it(`${id}: ${name} reaches the game and does not scroll the article, after Play and after the window changes size`, async () => {
      const { page, gameFrame } = await play(id);
      try {
        assert.ok(await until(() => hasKeys(gameFrame()), 10000), "the game's frame takes the keys after Play");
        const first = gameFrame();
        assert.deepEqual(await press(page, first, key), { scrolled: 0, reached: true }, `${name} after Play`);
        await page.setViewport({ width: 1000, height: 900 });
        // A game from before the cleanup loads again in a new frame 300 ms
        // after the window stops resizing, as the app did
        if (id.endsWith("-before")) assert.ok(await until(async () => gameFrame() && gameFrame() !== first, 10000), "the game loads again in a new frame");
        // The new frame takes the keys once its page has loaded: the key
        // tells whether it did
        await until(() => hasKeys(gameFrame()), 5000);
        assert.deepEqual(await press(page, gameFrame(), key), { scrolled: 0, reached: true }, `${name} after the window changed size`);
      } finally {
        await page.close();
      }
    });
  }

  it("leaves the focus in a text field of the article, and the keys to it, while a game from before the cleanup loads again", async () => {
    const { page, gameFrame } = await play("tetris-before");
    try {
      assert.ok(await until(() => hasKeys(gameFrame()), 10000), "the game's frame takes the keys after Play");
      const first = gameFrame();
      // The article has no text field: one before the games stands in for
      // anything a reader types in
      const field = await page.evaluateHandle(() => {
        const input = document.createElement("input");
        input.setAttribute("aria-label", "A text field");
        document.querySelector(".games").before(input);
        return input;
      });
      await field.click();
      await page.keyboard.type("ab");
      await page.setViewport({ width: 1000, height: 900 });
      assert.ok(await until(async () => gameFrame() && gameFrame() !== first, 10000), "the game loads again in a new frame");
      const loaded = () => gameFrame().evaluate(() => document.readyState === "complete" && document.getElementById("game-canvas") !== null);
      assert.ok(await until(loaded, 10000), "the game's page loads in the new frame");
      // The new frame would take the focus just after its page loaded
      await delay(500);
      await page.keyboard.type("cd");
      assert.equal(await field.evaluate((input) => input.value), "abcd");
      assert.equal(await field.evaluate((input) => document.activeElement === input && document.hasFocus()), true, "the text field has the focus");
      assert.equal(await hasKeys(gameFrame()), false, "the game's frame does not");
    } finally {
      await page.close();
    }
  });
});

describe("the gate rules a game page is held to, by its path (si-y6pp)", () => {
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("games-gates-");
    out = buildSite(path.join(tmp.dir, "site"));
  });
  after(() => tmp.cleanup());

  it("passes the pages, parity and content gates on the real game pages, naming each one", () => {
    const pages = runGate("pages", out);
    assert.equal(pages.status, 0, pages.output);
    const parity = runGate("parity", out);
    assert.equal(parity.status, 0, parity.output);
    const content = runGate("content", out);
    assert.equal(content.status, 0, content.output);
    for (const url of GAME_PAGES) {
      const file = `${url.slice(1)}index.html`;
      assert.match(pages.output, new RegExp(`^ok {4}pages: ${url} compressed css\\+js [\\d,]+ B \\(limit 61,440\\)$`, "m"));
      assert.ok(parity.output.includes(`ok    ${file} is a game page: in English like its game, with no counterpart\n`), `parity names ${file}`);
      assert.ok(content.output.includes(`ok    ${file}: a game page, the game and nothing else: no footer, language switch, toggle or feed link to check\n`), `content names ${file}`);
    }
  });

  it("holds a copy of a game page at any other path to every rule of a page", async () => {
    const copy = await copyDir(out, path.join(tmp.dir, "moved"));
    const file = `blog/${ARTICLE}/not-a-game/index.html`;
    await mkdir(path.join(copy, path.dirname(file)));
    await cp(path.join(out, "blog", ARTICLE, "pong-after", "index.html"), path.join(copy, file));
    const pages = runGate("pages", copy);
    assert.equal(pages.status, 1);
    for (const problem of ["header appears 0 time(s), expected 1", "footer appears 0 time(s), expected 1", "first focusable element is not the skip link", "0 hreflang alternate(s), expected 3", "0 language switch(es) in the header, expected 1"]) {
      assert.ok(pages.output.includes(`FAIL  ${file}: ${problem}\n`), `pages: ${problem}`);
    }
    const parity = runGate("parity", copy);
    assert.equal(parity.status, 1);
    assert.ok(parity.output.includes(`FAIL  sv/${file} is missing (counterpart of ${file})`), parity.output);
    const content = runGate("content", copy);
    assert.equal(content.status, 1);
    assert.ok(content.output.includes(`FAIL  ${file}: footer lacks the mailto:hello@addablelabs.se link`), content.output);
    assert.ok(content.output.includes(`FAIL  ${file}: no button[data-theme-toggle]`), content.output);
  });

  it("still holds a game page to the rules that fit it: nothing around the game, no alternates, nothing from another origin", async () => {
    const copy = await copyDir(out, path.join(tmp.dir, "broken"));
    const file = `blog/${ARTICLE}/tetris-before/index.html`;
    const html = await readFile(path.join(copy, file), "utf8");
    const broken = html
      .replace("<body>", "<body>\n  <header>Addable Labs</header>")
      .replace('<link rel="icon"', '<link rel="alternate" hreflang="sv" href="https://addablelabs.se/sv/">\n  <link rel="icon"')
      .replace("</body>", '<script src="https://example.com/x.js"></script>\n<iframe src="https://example.com/"></iframe>\n</body>');
    assert.notEqual(broken, html);
    await writeFile(path.join(copy, file), broken);
    const pages = runGate("pages", copy);
    assert.equal(pages.status, 1);
    const failures = pages.output.split("\n").filter((line) => line.startsWith("FAIL  "));
    assert.deepEqual(failures, [
      `FAIL  ${file}: header appears 1 time(s), expected 0 on a game page`,
      `FAIL  ${file}: a game page should carry no hreflang alternates`,
      `FAIL  ${file}: cross-origin script[src] https://example.com/x.js`,
      `FAIL  ${file}: cross-origin iframe[src] https://example.com/`,
    ]);
  });

  it("holds a game page to the compressed budget of 61,440 B, naming the total", async () => {
    const copy = await copyDir(out, path.join(tmp.dir, "heavy"));
    const script = path.join(copy, "blog", ARTICLE, "game-page-before.js");
    // 64 KiB of random bytes as base64, which gzip cannot shrink below the
    // budget, in the script both "before" game pages load and no other page
    // does.
    await writeFile(script, `${await readFile(script, "utf8")}\n// ${randomBytes(64 * 1024).toString("base64")}\n`);
    const pages = runGate("pages", copy);
    assert.equal(pages.status, 1);
    const over = [...pages.output.matchAll(/^FAIL {2}(\S+): compressed css\+js is [\d,]+ B, limit 61,440 B \(REQ-020\)$/gm)].map(([, file]) => file);
    assert.deepEqual(over, GAME_PAGES.filter((url) => url.endsWith("-before/")).map((url) => `${url.slice(1)}index.html`).sort());
  });
});
