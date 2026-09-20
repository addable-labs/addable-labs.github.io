import assert from "node:assert/strict";
import { readFile, rm, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyDir, runGate, SRC, tempDir } from "./helpers.mjs";

describe("parity gate", () => {
  let tmp;
  let built;
  before(async () => {
    tmp = await tempDir("parity-");
    built = buildSite(path.join(tmp.dir, "site"));
  });
  after(() => tmp.cleanup());

  it("passes on the real build", () => {
    const { status, output } = runGate("parity", built);
    assert.equal(status, 0, output);
    assert.match(output, /PASS parity/);
  });

  it("fails when a Swedish page is missing, naming the path", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "missing-page"));
    await rm(path.join(broken, "sv", "about", "index.html"));
    const { status, output } = runGate("parity", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}sv\/about\/index\.html is missing \(counterpart of about\/index\.html\)/);
  });

  it("fails when a strings key exists in en but not in sv, naming the key", async () => {
    // A source tree with the real site.js and strings, minus one Swedish key.
    const src = path.join(tmp.dir, "src-missing-key");
    await mkdir(path.join(src, "_data", "strings"), { recursive: true });
    await writeFile(path.join(src, "_data", "site.js"), await readFile(path.join(SRC, "_data", "site.js"), "utf8"));
    const en = JSON.parse(await readFile(path.join(SRC, "_data", "strings", "en.json"), "utf8"));
    const sv = JSON.parse(await readFile(path.join(SRC, "_data", "strings", "sv.json"), "utf8"));
    delete sv.nav.blog;
    await writeFile(path.join(src, "_data", "strings", "en.json"), JSON.stringify(en));
    await writeFile(path.join(src, "_data", "strings", "sv.json"), JSON.stringify(sv));
    const { status, output } = runGate("parity", built, src);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}strings\/en\.json and strings\/sv\.json have identical key sets.*missing in sv: nav\.blog/);
  });
});
