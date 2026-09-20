import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { walk } from "../scripts/lib/site.mjs";
import { buildSite, copyDir, runGate, SRC, tempDir } from "./helpers.mjs";

// What the founder's documented step (README open item 5) sets in site.js.
const LINKEDIN_URL = "https://www.linkedin.com/company/addable-labs";

describe("content gate", () => {
  let tmp;
  let built;
  let srcWithUrl;
  before(async () => {
    tmp = await tempDir("content-");
    built = buildSite(path.join(tmp.dir, "site"));
    // The real source tree with linkedinUrl set instead of null.
    srcWithUrl = await copyDir(SRC, path.join(tmp.dir, "src-linkedin"));
    const siteJs = path.join(srcWithUrl, "_data", "site.js");
    await writeFile(siteJs, (await readFile(siteJs, "utf8")).replace("linkedinUrl: null,", `linkedinUrl: ${JSON.stringify(LINKEDIN_URL)},`));
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

  it("passes once site.linkedinUrl is set and every footer links it", async () => {
    // The build patched the way contact.njk renders the entry once the URL is
    // set: the placeholder item becomes a link, everywhere the block appears.
    const linked = await copyDir(built, path.join(tmp.dir, "linkedin-link"));
    for (const file of await walk(linked, ".html")) {
      await writeFile(file, (await readFile(file, "utf8")).replaceAll(/<li class="contact-placeholder">[^<]*<\/li>/g, `<li><a href="${LINKEDIN_URL}">LinkedIn</a></li>`));
    }
    const { status, output } = runGate("content", linked, srcWithUrl);
    assert.equal(status, 0, output);
    assert.match(output, /PASS content/);
    assert.match(output, /ok {4}LinkedIn links https:\/\/www\.linkedin\.com\/company\/addable-labs on every page/);
  });

  it("fails when site.linkedinUrl is set but the pages still show the placeholder", () => {
    const { status, output } = runGate("content", built, srcWithUrl);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: footer lacks the LinkedIn link to https:\/\/www\.linkedin\.com\/company\/addable-labs/);
    assert.match(output, /FAIL {2}sv\/about\/index\.html: footer lacks the LinkedIn link to/);
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
