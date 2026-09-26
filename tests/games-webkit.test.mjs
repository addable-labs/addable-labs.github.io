// The games of the Gaimer article in WebKit, the engine of Safari (si-wusy):
// Playwright's WebKit, headless, plays each game in the article as a reader
// does. After Play every key reaches the game, pressed and let go, and none
// scrolls the article; again after the window changes size, when a game
// from before the cleanup loads again in a new frame; and a click into a
// game gives it the keys, also in Tetris after the cleanup, which cancels
// the press of the pointer. Until handOnKey and focusOnPress in the game
// pages (game-page-<version>.js), no key reached a game in WebKit until the
// reader clicked into it, and a click did not reach Tetris after the
// cleanup: WebKit lets a page in a frame of another origin, as the game
// page is in the article, give the focus to a frame of its own only once
// the reader has used the page, so the game page's focusGame did nothing.
// Now the first key after Play reaches the game page, which hands it on to
// the game and gives the game's frame the focus. And as a game from before
// the cleanup loaded again, the focus left with the old frame and the keys
// scrolled the article, until keepFocus in game-page-before.js had the page
// take the focus itself after the blur. Chrome's cases are in
// games.test.mjs. The cases skip when Playwright's WebKit is not installed,
// as in CI; `pnpm exec playwright-core install webkit` installs it.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { webkit } from "playwright-core";
import { gamePagePaths } from "../scripts/lib/games.mjs";
import { start as serve } from "../scripts/lib/static-server.mjs";
import { buildSite, SRC, tempDir } from "./helpers.mjs";

const ARTICLE = "cleaning-up-gaimer";
const GAME_PAGES = [...gamePagePaths(SRC)].filter((url) => url.startsWith(`/blog/${ARTICLE}/`));

/**
 * The keys that scroll a page, by the names Playwright presses them by,
 * which are also their codes.
 */
const SCROLL_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "PageUp", "PageDown", "Home", "End"];

const noWebKit = existsSync(webkit.executablePath()) ? false : "Playwright's WebKit is not installed";

describe("the games of the Gaimer article take the keys in WebKit, after Play, after the window changes size and after a click (si-wusy)", { skip: noWebKit }, () => {
  let tmp;
  let server;
  let browser;
  let context;
  before(async () => {
    tmp = await tempDir("games-webkit-");
    server = await serve(buildSite(path.join(tmp.dir, "site")));
    browser = await webkit.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  });
  after(async () => {
    await browser?.close();
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

  /** Resolves once the article has drawn `count` more frames, or after a second. */
  const frames = (page, count) =>
    page.evaluate(
      (count) =>
        new Promise((resolve) => {
          setTimeout(resolve, 1000);
          const next = () => (--count === 0 ? resolve() : requestAnimationFrame(next));
          requestAnimationFrame(next);
        }),
      count,
    );

  /** Whether the game's page in `frame` has loaded, with its canvas. */
  const loaded = (frame) => frame.evaluate(() => document.readyState === "complete" && document.getElementById("game-canvas") !== null);

  /**
   * Press each of `keys` in the tab in turn. Resolves to the keys that
   * scrolled the article, the keys that did not reach `frame`, where the game
   * runs, pressed and let go, and how far the article is from where it was.
   */
  async function press(page, frame, keys) {
    await frame.evaluate(() => {
      if (!window.keysDown) {
        addEventListener("keydown", (event) => window.keysDown.push(event.code), true);
        addEventListener("keyup", (event) => window.keysUp.push(event.code), true);
      }
      window.keysDown = [];
      window.keysUp = [];
    });
    const y = await page.evaluate(() => scrollY);
    const scrolledBy = [];
    const missed = [];
    for (const key of keys) {
      await page.keyboard.press(key);
      const reached = () => frame.evaluate((key) => window.keysDown.includes(key) && window.keysUp.includes(key), key);
      if (!(await until(reached, 3000))) missed.push(key);
      // A scroll by a key shows in the article's first or second frame after
      // the key: five are time enough
      await frames(page, 5);
      if ((await page.evaluate(() => scrollY)) !== y) {
        scrolledBy.push(key);
        await delay(500);
        await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
      }
    }
    await delay(300);
    return { scrolledBy, missed, scrolled: (await page.evaluate(() => scrollY)) - y };
  }

  for (const url of GAME_PAGES) {
    const id = url.split("/").at(-2);
    it(`${id}: every key reaches the game and none scrolls the article, after Play, after the window changes size and after a click into the game`, async () => {
      const page = await context.newPage();
      try {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`${server.url}/blog/${ARTICLE}/`, { waitUntil: "load" });
        const button = page.locator(`.game-play[data-game-page="${url}"]`);
        await button.evaluate((element) => element.closest(".game").scrollIntoView({ block: "start", behavior: "instant" }));
        await button.click();
        const gameFrame = () => page.frames().find((frame) => frame.url() === `${server.url}${url}`)?.childFrames()[0];
        assert.ok(await until(() => loaded(gameFrame()), 10000), "the game loads after Play");
        const first = gameFrame();
        assert.deepEqual(await press(page, first, SCROLL_KEYS), { scrolledBy: [], missed: [], scrolled: 0 }, "after Play");
        assert.equal(await first.evaluate(() => document.hasFocus()), true, "the game's frame has the focus");

        await page.setViewportSize({ width: 1000, height: 900 });
        // A game from before the cleanup loads again in a new frame 300 ms
        // after the window stops resizing, as the app did
        if (id.endsWith("-before")) assert.ok(await until(() => gameFrame() && gameFrame() !== first, 10000), "the game loads again in a new frame");
        assert.ok(await until(() => loaded(gameFrame()), 10000), "the game's page loads");
        assert.deepEqual(await press(page, gameFrame(), SCROLL_KEYS), { scrolledBy: [], missed: [], scrolled: 0 }, "after the window changed size");

        // A click beside the article takes the keys from the game, and a
        // click into the game gives them back. The article has moved as the
        // window changed size: the game goes back into view first.
        await page.locator(".game-frame").evaluate((frame) => frame.scrollIntoView({ block: "center", behavior: "instant" }));
        const box = await page.locator(".game-frame").boundingBox();
        await page.mouse.click(4, box.y + box.height / 2);
        assert.equal(await gameFrame().evaluate(() => document.hasFocus()), false, "a click beside the article takes the focus from the game");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        assert.deepEqual((await press(page, gameFrame(), ["ArrowLeft"])).missed, [], "after a click into the game");
      } finally {
        await page.close();
      }
    });
  }
});
