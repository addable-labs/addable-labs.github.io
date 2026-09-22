import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyDir, runGate, tempDir } from "./helpers.mjs";

describe("feeds gate", () => {
  let tmp;
  let built;
  before(async () => {
    tmp = await tempDir("feeds-");
    built = buildSite(path.join(tmp.dir, "site"));
  });
  after(() => tmp.cleanup());

  it("passes on the real build", () => {
    const { status, output } = runGate("feeds", built);
    assert.equal(status, 0, output);
    assert.match(output, /PASS feeds/);
  });

  it("fails on a feed item with a relative link", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "relative-link"));
    const feed = path.join(broken, "feed.xml");
    const xml = await readFile(feed, "utf8");
    await writeFile(feed, xml.replace("<link>https://addablelabs.se/blog/ashlands-what-one-prompt-built/</link>", "<link>/blog/ashlands-what-one-prompt-built/</link>"));
    const { status, output } = runGate("feeds", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}feed\.xml: item link absolute with language prefix \(\/blog\/ashlands-what-one-prompt-built\/\)/);
    assert.match(output, /FAIL feeds/);
  });

  it("fails when an item carries an article figure (the feeds carry the prose only, si-55iu)", async () => {
    // The feed templates strip the inline-SVG figures with `withoutFigures`;
    // one that slips through is escaped markup inside <content:encoded>.
    const broken = await copyDir(built, path.join(tmp.dir, "figure-in-feed"));
    const feed = path.join(broken, "feed.xml");
    const xml = await readFile(feed, "utf8");
    const edited = xml.replace("<content:encoded>", "<content:encoded>&lt;figure class=&quot;figure figure-inline&quot;&gt;&lt;svg viewBox=&quot;0 0 1 1&quot;&gt;&lt;/svg&gt;&lt;/figure&gt;");
    assert.notEqual(edited, xml, "the first item's content must be found");
    await writeFile(feed, edited);
    const { status, output } = runGate("feeds", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}feed\.xml: item ".*" carries no <figure> \(the illustrations stay on the page\)/);
  });

  it("fails on malformed XML", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "malformed"));
    const feed = path.join(broken, "sv", "feed.xml");
    await writeFile(feed, (await readFile(feed, "utf8")).replace("</channel>", ""));
    const { status, output } = runGate("feeds", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}sv\/feed\.xml: well-formed XML/);
  });
});

// Feed dates (si-vdle): the pages print every date in UTC — the `localeDate`
// and `isoDate` filters in eleventy.config.js — and the feeds must too, or the
// same commit builds a different feed on a different machine. The RSS
// plugin's `dateToRfc822` writes the build machine's time zone unless it is
// given one: before the feeds passed it "UTC", CI (which builds in UTC)
// published "Tue, 22 Sep 2026 00:00:00 +0000" where a build in Stockholm wrote
// "Tue, 22 Sep 2026 02:00:00 +0200" — the same instant, written differently.
// The cases build the site in UTC and on either side of it: in Los Angeles a
// date at UTC midnight falls on the day before.
describe("feed dates", () => {
  const ELSEWHERE = ["Europe/Stockholm", "America/Los_Angeles"];
  const ZONES = ["UTC", ...ELSEWHERE];
  const FEEDS = [["feed.xml"], ["sv", "feed.xml"]];
  let tmp;
  const built = {};
  before(async () => {
    tmp = await tempDir("feed-dates-");
    for (const zone of ZONES) {
      built[zone] = buildSite(path.join(tmp.dir, zone.replace("/", "-")), { TZ: zone });
    }
  });
  after(() => tmp.cleanup());

  const read = (zone, feed) => readFile(path.join(built[zone], ...feed), "utf8");

  /** The lines on which two texts differ, as [line number, this line, that line]. */
  function differingLines(text, other) {
    const these = text.split("\n");
    const those = other.split("\n");
    const rows = Array.from({ length: Math.max(these.length, those.length) }, (_, index) => [index + 1, these[index], those[index]]);
    return rows.filter(([, line, otherLine]) => line !== otherLine);
  }

  it("writes every pubDate and lastBuildDate in UTC, as +0000, whatever the build machine's time zone", async () => {
    for (const zone of ZONES) {
      for (const feed of FEEDS) {
        const where = `${feed.join("/")} built in ${zone}`;
        const dates = [...(await read(zone, feed)).matchAll(/<(?:pubDate|lastBuildDate)>([^<]*)</g)].map(([, date]) => date);
        assert.ok(dates.length > 1, `${where} carries a lastBuildDate and the items' pubDates`);
        for (const date of dates) {
          // toUTCString() writes the same instant in RFC 822's shape, in UTC,
          // naming the zone "GMT" where the feeds write "+0000".
          assert.equal(date, new Date(date).toUTCString().replace(/GMT$/, "+0000"), where);
        }
      }
    }
  });

  it("builds the same feeds in Stockholm and in Los Angeles as in UTC, where CI builds the published ones", async () => {
    for (const feed of FEEDS) {
      const published = await read("UTC", feed);
      for (const zone of ELSEWHERE) {
        // The differing lines only, so a failure names them rather than printing two whole feeds.
        assert.deepEqual(differingLines(await read(zone, feed), published), [], `${feed.join("/")} built in ${zone}, line by line against the build in UTC`);
      }
    }
  });
});
