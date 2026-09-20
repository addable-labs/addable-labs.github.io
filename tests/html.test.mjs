import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { buildSite, fixture, runHtmlValidate, tempDir } from "./helpers.mjs";

describe("html gate (html-validate with .htmlvalidate.json)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("html-");
    buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  it("passes on the real build with zero errors", () => {
    const { status, output } = runHtmlValidate(tmp.dir);
    assert.equal(status, 0, output);
  });

  it("fails on inline styles and an image without alt, naming the file", () => {
    const { status, output } = runHtmlValidate(fixture("html-bad", "site"));
    assert.equal(status, 1);
    assert.match(output, /html-bad[\\/]site[\\/]index\.html/);
    assert.match(output, /no-inline-style/);
    assert.match(output, /wcag\/h37|alt/);
  });
});
