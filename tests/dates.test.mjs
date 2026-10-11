// Dates for readers (si-eqxt): a page prints a date as its language writes
// one, day before month: "11 October 2026" in English, as the English writing
// rule has it, and "11 oktober 2026" in Swedish, on the day its <time
// datetime> names (the `localeDate` and `isoDate` filters in
// eleventy.config.js). The month names are typed here rather than asked of
// Intl, so the test does not lean on the code it checks.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { walk } from "../scripts/lib/site.mjs";
import { buildSite, tempDir } from "./helpers.mjs";

const MONTHS = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  sv: ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"],
};

/** The day a YYYY-MM-DD names, as `lang` writes it: "11 October 2026", "11 oktober 2026". */
function written(datetime, lang) {
  const [year, month, day] = datetime.split("-").map(Number);
  return `${day} ${MONTHS[lang][month - 1]} ${year}`;
}

describe("dates on the pages", () => {
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("dates-");
    // Built west of UTC, where a date read in the machine's own time zone
    // would print the day before the one its datetime names.
    out = buildSite(path.join(tmp.dir, "site"), { TZ: "America/Los_Angeles" });
  });
  after(() => tmp.cleanup());

  it("prints every date day, month, year in the page's language: '11 October 2026' in English, '11 oktober 2026' in Swedish", async () => {
    const seen = new Set();
    for (const file of await walk(out, ".html")) {
      const html = await readFile(file, "utf8");
      const lang = /<html[^>]*\slang="([^"]+)"/.exec(html)[1];
      const where = path.relative(out, file);
      for (const [element, datetime, text] of html.matchAll(/<time datetime="([^"]*)">([^<]*)<\/time>/g)) {
        assert.match(datetime, /^\d{4}-\d{2}-\d{2}$/, `${where}: ${element}`);
        assert.equal(text, written(datetime, lang), `${where}: ${element}`);
      }
      assert.equal(html.match(/<time datetime="[^"]*">[^<]*<\/time>/g)?.length ?? 0, html.match(/<time[\s>]/g)?.length ?? 0, `${where}: every <time> is checked`);
      for (const [, place] of html.matchAll(/<p class="(article-meta|post-meta)">\s*<time /g)) seen.add(`${lang} ${place}`);
    }
    // The article's head and the blog cards, in both languages.
    assert.deepEqual([...seen].sort(), ["en article-meta", "en post-meta", "sv article-meta", "sv post-meta"]);
  });
});
