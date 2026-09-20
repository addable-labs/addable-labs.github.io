import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { parse } from "node-html-parser";
import { fontFaceSources } from "../scripts/lib/budget.mjs";
import { candidatesForPath, internalPath, loadSite, walk } from "../scripts/lib/site.mjs";
import { buildSite, SRC, tempDir } from "./helpers.mjs";

// REQ-004 (AC-04): the three JetBrains Mono weights, copied unmodified from the
// founder's source and pinned by SHA-256 in the requirements' trace.upstream,
// ship with the OFL licence. If WI-08 subsets the fonts (plan D-06 fallback),
// it updates these digests and documents the derivation in its summary.
const FONT_DIGESTS = {
  "JetBrainsMono-Light.woff2": "43eb798d59b557c3d87c1402ce684b3fda1ad66bf7ec8021b0a43dc31ad9c572",
  "JetBrainsMono-Regular.woff2": "a9cb1cd82332b23a47e3a1239d25d13c86d16c4220695e34b243effa999f45f2",
  "JetBrainsMono-Medium.woff2": "086c48dfbea9ddaff1320f7e09399b8e2924e88ce67453721255db3bdbb5a353",
};
const FONT_DIR = path.join("assets", "fonts");
// REQ-005: the fonts a landing page references stay within 300 KB.
const FONT_BUDGET = 300 * 1024;
// REQ-005 (AC-05): at most the weights used above the fold are preloaded.
const MAX_PRELOADS = 2;

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

describe("fonts in the built output (REQ-004, REQ-005; AC-04, AC-05)", () => {
  let tmp;
  let out;
  let site;
  let landingPages;
  before(async () => {
    tmp = await tempDir("fonts-");
    out = buildSite(tmp.dir);
    site = await loadSite(SRC);
    landingPages = site.languages.codes.map((lang) => (lang === site.languages.default ? "index.html" : path.join(lang, "index.html")));
  });
  after(() => tmp.cleanup());

  /** The output file a same-origin URL resolves to, or null. */
  async function outputFile(url) {
    const urlPath = internalPath(url, site);
    if (urlPath === null) return null;
    for (const candidate of candidatesForPath(urlPath)) {
      const file = path.join(out, candidate);
      const info = await stat(file).catch(() => null);
      if (info?.isFile()) return file;
    }
    return null;
  }

  /** Every @font-face url() of the stylesheets a page links, in order, with the page's lang. */
  async function fontSourcesOf(page) {
    const html = await readFile(path.join(out, page), "utf8");
    const doc = parse(html, { comment: false });
    const sources = [];
    for (const link of doc.querySelectorAll("link[rel~=stylesheet]")) {
      const file = await outputFile(link.getAttribute("href"));
      assert.ok(file, `${page}: stylesheet ${link.getAttribute("href")} is same-origin and in the output`);
      sources.push(...fontFaceSources(await readFile(file, "utf8")));
    }
    return { doc, sources };
  }

  it("ships the three JetBrains Mono woff2 files with the pinned digests and the OFL licence beside them", async () => {
    for (const [name, digest] of Object.entries(FONT_DIGESTS)) {
      const file = path.join(out, FONT_DIR, name);
      assert.equal(sha256(await readFile(file)), digest, `${name} differs from the pinned source`);
    }
    const licence = await readFile(path.join(out, FONT_DIR, "OFL.txt"), "utf8");
    assert.match(licence, /SIL OPEN FONT LICENSE/i);
    assert.match(licence, /JetBrains Mono/);
  });

  it("declares every @font-face src in the built CSS on the site's origin, pointing at shipped files", async () => {
    const stylesheets = await walk(out, ".css");
    assert.ok(stylesheets.length > 0);
    const sources = [];
    for (const file of stylesheets) sources.push(...fontFaceSources(await readFile(file, "utf8")));
    assert.ok(sources.length >= Object.keys(FONT_DIGESTS).length, "the @font-face rules of the three weights are found");
    for (const url of sources) {
      assert.notEqual(internalPath(url, site), null, `@font-face src ${url} is not on the site's origin`);
      assert.ok(await outputFile(url), `@font-face src ${url} is not in the output`);
    }
    assert.deepEqual(new Set(sources.map((url) => path.basename(url))), new Set(Object.keys(FONT_DIGESTS)), "exactly the three weights are declared");
  });

  it("preloads at most two fonts per landing page, each same-origin, declared in @font-face and fetched anonymously", async () => {
    for (const page of landingPages) {
      const { doc, sources } = await fontSourcesOf(page);
      const preloads = doc.querySelectorAll("link[rel~=preload][as=font]");
      assert.ok(preloads.length >= 1 && preloads.length <= MAX_PRELOADS, `${page}: ${preloads.length} font preload(s)`);
      for (const link of preloads) {
        const href = link.getAttribute("href");
        assert.notEqual(internalPath(href, site), null, `${page}: preload ${href} is not on the site's origin`);
        assert.ok(sources.includes(href), `${page}: preload ${href} is not a declared @font-face source`);
        assert.ok(link.hasAttribute("crossorigin"), `${page}: font preload ${href} lacks crossorigin, so the browser would fetch the font twice`);
        assert.equal(link.getAttribute("type"), "font/woff2", page);
      }
    }
  });

  it("keeps the font bytes each landing page references within 300 KB", async () => {
    for (const page of landingPages) {
      const { sources } = await fontSourcesOf(page);
      const files = new Set();
      for (const url of sources) {
        const file = await outputFile(url);
        assert.ok(file, `${page}: ${url} is not in the output`);
        files.add(file);
      }
      assert.ok(files.size > 0, `${page}: references fonts`);
      let total = 0;
      for (const file of files) total += (await stat(file)).size;
      assert.ok(total <= FONT_BUDGET, `${page}: ${total} B of fonts exceeds ${FONT_BUDGET} B`);
    }
  });
});
