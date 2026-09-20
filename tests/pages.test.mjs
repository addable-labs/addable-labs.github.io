import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildSite, fixture, runGate, tempDir } from "./helpers.mjs";

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

  it("fails on two h1 elements and an image without alt, naming the page", () => {
    const { status, output } = runGate("pages", fixture("pages-bad", "site"));
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: 2 h1 element\(s\), expected 1/);
    assert.match(output, /FAIL {2}index\.html: img \/assets\/img\/mark\.svg lacks alt/);
    assert.match(output, /FAIL pages/);
  });
});
