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
    await writeFile(feed, xml.replace("<link>https://addablelabs.se/blog/lessons-from-building-niva/</link>", "<link>/blog/lessons-from-building-niva/</link>"));
    const { status, output } = runGate("feeds", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}feed\.xml: item link absolute with language prefix \(\/blog\/lessons-from-building-niva\/\)/);
    assert.match(output, /FAIL feeds/);
  });

  it("fails when an item carries an article figure (the feeds carry the prose only, si-55iu)", async () => {
    // The feed templates strip the inline-SVG figures with `withoutFigures`;
    // one that slips through is escaped markup inside <content:encoded>.
    const broken = await copyDir(built, path.join(tmp.dir, "figure-in-feed"));
    const feed = path.join(broken, "feed.xml");
    const xml = await readFile(feed, "utf8");
    const edited = xml.replace("<content:encoded>", "<content:encoded>&lt;figure class=&quot;figure figure-side&quot;&gt;&lt;svg viewBox=&quot;0 0 1 1&quot;&gt;&lt;/svg&gt;&lt;/figure&gt;");
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
