import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { walk } from "../scripts/lib/site.mjs";
import { buildSite, copyDir, runGate, SRC, tempDir } from "./helpers.mjs";

// What the founder's documented step (README open item 5) sets in site.js.
const LINKEDIN_URL = "https://www.linkedin.com/company/addable-labs";

// The content gate re-targeted to the Signal landing model (REQ-024 as
// amended by A-01; AC-09 … AC-15): the real build passes, and every
// re-targeted rule fails on a modified copy naming the page and the rule.
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

  /** A copy of the build with one landing-page edit applied. */
  async function withLandingEdit(name, edit) {
    const copy = await copyDir(built, path.join(tmp.dir, name));
    const landing = path.join(copy, "index.html");
    const html = await readFile(landing, "utf8");
    const edited = edit(html);
    assert.notEqual(edited, html, `${name}: the edit must change the page`);
    await writeFile(landing, edited);
    return copy;
  }

  it("passes on the real build", () => {
    const { status, output } = runGate("content", built);
    assert.equal(status, 0, output);
    assert.match(output, /PASS content/);
  });

  it("fails when the founder's name disappears from the trust section (REQ-012)", async () => {
    const broken = await withLandingEdit("no-founder", (html) => html.replace("Peter Blenessy", "the founder"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: trust section names Peter Blenessy/);
  });

  it("fails when the about page lacks the founding month (REQ-012, D-12)", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "no-month"));
    const about = path.join(broken, "about", "index.html");
    await writeFile(about, (await readFile(about, "utf8")).replace("September 2026", "some time ago"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: contains "September 2026"/);
  });

  it("fails when the nivå card is linked (REQ-011, A-01)", async () => {
    const broken = await withLandingEdit("niva-linked", (html) => html.replace(/(<h3 class="app-name portfolio-name"[^>]*>)nivå(<\/h3>)/, '$1<a href="https://example.com/niva">nivå</a>$2'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: nivå entry has no link \(private repository\)/);
  });

  it("fails when the hero's primary CTA no longer points at the apps section (REQ-009 as amended by founder feedback round 1, si-yp2x)", async () => {
    const broken = await withLandingEdit("primary-mailto", (html) => html.replace('<a class="button button-primary" href="#apps">See what we have built', '<a class="button button-primary" href="mailto:hello@addablelabs.se?subject=Start%20a%20project">See what we have built'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: primary CTA is "See what we have built" linking #apps/);
  });

  it("fails when the secondary CTA promises a live product while site.nivaUrl is null (REQ-009, D-11)", async () => {
    const broken = await withLandingEdit("niva-try", (html) => html.replace("Get early access to nivå</a>", "Try nivå</a>"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: secondary CTA is an early-access mailto: labelled "Get early access to nivå" while site\.nivaUrl is null/);
  });

  it("fails when the trust section links a URL containing \"factory\" (REQ-012)", async () => {
    const broken = await withLandingEdit("factory-link", (html) => html.replace('<a class="text-link" href="#apps">See the open-source portfolio', '<a class="text-link" href="https://example.com/factory">Our factory</a><a class="text-link" href="#apps">See the open-source portfolio'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: trust section has no other link named "factory"/);
  });

  it("fails when the appearance toggle is missing (REQ-007, REQ-014)", async () => {
    const broken = await withLandingEdit("no-toggle", (html) => html.replaceAll(" data-theme-toggle", ""));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: no button\[data-theme-toggle\]/);
  });

  it("fails when the footer language switch points at another page (REQ-014)", async () => {
    const broken = await withLandingEdit("wrong-switch", (html) => html.replace('class="lang-switch-footer" href="/sv/"', 'class="lang-switch-footer" href="/sv/about/"'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: footer language switch does not point at \/sv\//);
  });

  it("fails when a page contains \"StockSight\" (A-01: the ban stays)", async () => {
    const broken = await withLandingEdit("stocksight", (html) => html.replace("</main>", "<p>StockSight-AI is coming.</p></main>"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: contains "StockSight"/);
  });

  it("passes once site.linkedinUrl is set and every footer links it", async () => {
    // The build patched the way footer.njk renders the entry once the URL is
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
    const broken = await withLandingEdit("private-link", (html) => html.replace("</main>", '<a href="https://github.com/PeterBlenessy/portfolio-app">Compound</a></main>'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: contains "github\.com\/PeterBlenessy\/portfolio-app"/);
  });
});
