import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildSite, fixture, runGate, tempDir } from "./helpers.mjs";

describe("links gate", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("links-");
    buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  it("passes on the real build (external links skipped offline)", () => {
    const { status, output } = runGate("links", tmp.dir);
    assert.equal(status, 0, output);
    assert.match(output, /PASS links/);
    assert.match(output, /CHECK_OFFLINE=1: skipped \d+ external link/);
  });

  it("fails on a broken internal link and a missing fragment, naming them", () => {
    const { status, output } = runGate("links", fixture("links-broken", "site"));
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html <a href>: \/missing-page\/ does not resolve/);
    assert.match(output, /fragment #no-such-id has no element with that id/);
    assert.doesNotMatch(output, /mailto/);
    assert.match(output, /FAIL links \(2 problems\)/);
  });

  it("reports an unreachable external link as a warning only", () => {
    const { status, output } = runGate("links", fixture("links-external", "site"), undefined, {
      CHECK_OFFLINE: "0",
      CHECK_LINK_TIMEOUT: "2000",
    });
    assert.equal(status, 0, output);
    assert.match(output, /warn {2}external https:\/\/unreachable\.invalid\/page/);
    assert.match(output, /PASS links/);
  });
});
