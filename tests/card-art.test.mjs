import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { APP_KEYS, THEME_KEYS } from "../scripts/lib/apps.mjs";
import { SRC } from "./helpers.mjs";

// Card art (si-jwwd): every service card and every app card has its drawing,
// src/_includes/card-art/<key>.svg, which services.njk and apps.njk inline
// as the picture band the card opens with. A drawing is decoration in the
// page's tokens: an <svg> on the 400 x 104 box, cut at the sides in a
// narrower card (xMidYMid slice), no words or pictures inside, no
// inline style, no id (an id could repeat on the page) and no colour of its
// own — every shape takes its colours from an .art-* class that base.css
// draws. The theme test already refuses a hex literal anywhere in src/.
const ART = path.join(SRC, "_includes", "card-art");
const VIEWBOX = "0 0 400 104";

describe("card art (si-jwwd)", () => {
  it("has one drawing per service and per app, and none without a card", async () => {
    const files = (await readdir(ART)).sort();
    assert.deepEqual(files, [...THEME_KEYS, ...APP_KEYS].map((key) => `${key}.svg`).sort());
  });

  it("draws every card in the page's tokens, without words", async () => {
    const css = await readFile(path.join(SRC, "assets", "css", "base.css"), "utf8");
    for (const file of await readdir(ART)) {
      const svg = await readFile(path.join(ART, file), "utf8");
      assert.match(svg, new RegExp(`^<svg [^>]*viewBox="${VIEWBOX}"`), `${file}: an <svg> on the ${VIEWBOX} box`);
      assert.match(svg, /^<svg [^>]*preserveAspectRatio="xMidYMid slice"/, `${file}: cut at the sides, never scaled down`);
      assert.doesNotMatch(svg, /<(text|image|foreignObject|style|script)\b/, `${file}: no words, pictures, styles or scripts inside`);
      assert.doesNotMatch(svg, /\s(style|id|fill|stroke|color|stop-color)=/, `${file}: colours come from classes, and there are no ids`);
      for (const [, names] of svg.matchAll(/class="([^"]+)"/g)) {
        for (const name of names.split(" ")) {
          assert.match(name, /^art-/, `${file}: .${name} is not a card-art class`);
          assert.match(css, new RegExp(`(^|[\\s,])\\.${name}(?![\\w-])[^{]*\\{`, "m"), `${file}: .${name} is drawn in base.css`);
        }
      }
    }
  });
});
