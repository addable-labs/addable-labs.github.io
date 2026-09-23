import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyProject, tempDir } from "./helpers.mjs";

// The sitemap's order (si-s3nr): src/sitemap.njk walks collections.all, which
// Eleventy keeps in date order, and a page without a `date:` (every page but
// the articles) is dated by its file's creation time. Unsorted, the checkout
// decided where the home, about, blog and category pages fell, so a fresh
// clone could publish the same pages in another order. The template sorts by
// URL. The first case pins that order; the second pins what the order is for:
// a page's date, whatever a checkout makes it, does not change the file.
describe("sitemap order", () => {
  let tmp;
  let built;
  before(async () => {
    tmp = await tempDir("sitemap-");
    built = buildSite(path.join(tmp.dir, "site"));
  });
  after(() => tmp.cleanup());

  const sitemap = (out) => readFile(path.join(out, "sitemap.xml"), "utf8");

  it("lists every URL once, in ascending order", async () => {
    // Decoded first (si-8fl3): absoluteUrl writes each <loc> with new URL(),
    // which percent-encodes a letter outside ASCII, while the template sorts
    // the raw page URLs. A page at /blog/å-x/ is listed after every ASCII slug,
    // but its <loc> .../blog/%C3%A5-x/ sorts before them ("%" comes before
    // every digit and letter, "å" after all of them), so the encoded <loc>s
    // would fail this case although every checkout writes the same file.
    // Decoded, each <loc> is site.url, the same on all of them, followed by
    // the raw URL the template sorted by.
    const urls = [...(await sitemap(built)).matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc]) => decodeURI(loc));
    assert.ok(urls.length > 1, "the sitemap lists the pages");
    assert.deepEqual(urls.filter((url, index) => urls.indexOf(url) !== index), [], "URLs listed more than once");
    assert.deepEqual(urls, urls.toSorted());
  });

  it("is the same file when an undated page is dated otherwise, as another checkout dates it", async () => {
    // The Swedish home page, dated long before any article: in date order it
    // would move to the top of the sitemap.
    const project = await copyProject(path.join(tmp.dir, "project"));
    const page = path.join(project, "src", "sv", "index.njk");
    const source = await readFile(page, "utf8");
    const dated = source.replace(/^---\n/, "---\ndate: 2000-01-01\n");
    assert.notEqual(dated, source, "the page's front matter must be found");
    await writeFile(page, dated);
    const redated = buildSite(path.join(tmp.dir, "redated"), {}, project);
    assert.equal(await sitemap(redated), await sitemap(built));
  });
});
