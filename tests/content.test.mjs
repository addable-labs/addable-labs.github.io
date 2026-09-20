import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyDir, runGate, tempDir } from "./helpers.mjs";

describe("content gate", () => {
  let tmp;
  let built;
  before(async () => {
    tmp = await tempDir("content-");
    built = buildSite(path.join(tmp.dir, "site"));
  });
  after(() => tmp.cleanup());

  it("passes on the real build", () => {
    const { status, output } = runGate("content", built);
    assert.equal(status, 0, output);
    assert.match(output, /PASS content/);
  });

  it("fails when a load-bearing fact disappears from the landing page", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "no-founder"));
    const landing = path.join(broken, "index.html");
    await writeFile(landing, (await readFile(landing, "utf8")).replace("Peter Blenessy", "the founder").replace("September 2026", "some time ago"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: names Peter Blenessy/);
    assert.match(output, /FAIL {2}index\.html: contains "September 2026"/);
  });

  it("fails when a private repository is linked", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "private-link"));
    const landing = path.join(broken, "index.html");
    await writeFile(landing, (await readFile(landing, "utf8")).replace("</main>", '<a href="https://github.com/addable-labs/niva">nivå</a></main>'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: contains "github\.com\/addable-labs\/niva"/);
  });
});
