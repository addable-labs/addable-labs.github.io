import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { urlProblem } from "../scripts/lib/urls.mjs";
import { buildSite, copyProject, ROOT, tempDir } from "./helpers.mjs";

// The names that become URLs (si-2a7h): a file's name becomes its URL, and
// the build holds every URL it forms to one rule — each part a slug, and a
// URL that does not end in "/" may end in one extension.

// Every kind of URL the site gives a page (2026-09-23).
const ACCEPTED = [
  "/",
  "/about/",
  "/blog/",
  "/blog/how-this-site-was-built-by-agents/",
  "/blog/app-development/",
  "/blog/ai-journey/",
  "/sv/",
  "/sv/about/",
  "/sv/blog/",
  "/sv/blog/how-this-site-was-built-by-agents/",
  "/sv/blog/app-development/",
  "/sv/blog/ai-journey/",
  "/feed.xml",
  "/sv/feed.xml",
  "/sitemap.xml",
  "/robots.txt",
  "/404.html",
];

// Each URL with the part the reason must name.
const REJECTED = [
  ["/blog/a#b/", "a#b"], // a fragment
  ["/blog/a?b/", "a?b"], // a query
  ["/blog/a%20b/", "a%20b"], // an escape
  ["/blog/åtta/", "åtta"],
  ["/blog/Atta/", "Atta"],
  ["/blog/a b/", "a b"],
  ["/blog/a_b/", "a_b"],
  ["/blog/a--b/", "a--b"],
  ["/blog/-a/", "-a"],
  ["/blog/a&b/", "a&b"],
  ["/blog/it's/", "it's"],
  ["/blog/feed.xml/", "feed.xml"], // ends in "/", so no extension
  ["/feed.XML", "feed.XML"],
  ["/a.b.c", "a.b.c"], // one extension only
];

describe("page URLs", () => {
  it("accepts every kind of URL the site has", () => {
    for (const url of ACCEPTED) assert.equal(urlProblem(url), null, url);
  });

  it("rejects a URL with a part that is not a slug, naming the part", () => {
    for (const [url, part] of REJECTED) assert.equal(urlProblem(url), `URL ${url} has ${JSON.stringify(part)}`);
  });

  it("names every such part, and skips a page with no URL", () => {
    assert.equal(urlProblem("/Blog/a#b/"), 'URL /Blog/a#b/ has "Blog" and "a#b"');
    assert.equal(urlProblem(false), null);
  });
});

/** Write one article, both languages, into a copy of the project, front matter valid. */
async function writeArticlePair(project, name, translationKey) {
  for (const lang of ["en", "sv"]) {
    const frontMatter = ["---", `title: ${translationKey} (${lang})`, "description: One sentence.", "date: 2026-09-01", "category: app-development", `translationKey: ${translationKey}`, "draft: false", "aiGenerated: true", "humanReviewed: true", "---"];
    await writeFile(path.join(project, "src", lang, "blog", "posts", `${name}.md`), `${frontMatter.join("\n")}\n\nThe body.\n`);
  }
}

describe("file names in the build", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("urls-");
  });
  after(() => tmp.cleanup());

  it("fails naming every file whose name is not a slug, with its URL", async () => {
    const project = await copyProject(path.join(tmp.dir, "project"));
    await writeArticlePair(project, "a#b", "a-hash-b");
    await writeArticlePair(project, "åtta", "atta");
    let message = "";
    assert.throws(() => buildSite(path.join(tmp.dir, "site"), {}, project), (error) => {
      // NFC: a file system may hand the name back decomposed.
      message = error.message.normalize("NFC");
      return true;
    });
    for (const prefix of ["", "/sv"]) {
      const lang = prefix === "" ? "en" : "sv";
      assert.ok(message.includes(`./src/${lang}/blog/posts/a#b.md: URL ${prefix}/blog/a#b/ has "a#b"`), message);
      assert.ok(message.includes(`./src/${lang}/blog/posts/åtta.md: URL ${prefix}/blog/åtta/ has "åtta"`), message);
    }
  });
});

// The tiebreak of same-date articles, computed in a child process started
// under Danish collation, where "aa" is "å" and sorts after "z": with
// localeCompare, "b-test" came first there and "aa-test" everywhere else.
describe("same-date articles", () => {
  it("list by slug in code-unit order, whatever the build machine's locale", (t) => {
    const script = `
      import { byDateDescThenSlug } from ${JSON.stringify(pathToFileURL(path.join(ROOT, "scripts", "lib", "urls.mjs")).href)};
      const date = new Date("2026-09-20T00:00:00Z");
      const posts = [{ date, fileSlug: "b-test" }, { date, fileSlug: "aa-test" }];
      console.log(JSON.stringify({
        locale: new Intl.Collator().resolvedOptions().locale,
        localeCompare: "aa-test".localeCompare("b-test"),
        order: posts.sort(byDateDescThenSlug).map((post) => post.fileSlug),
      }));
    `;
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "da_DK.UTF-8" },
    });
    assert.equal(child.status, 0, child.stderr);
    const { locale, localeCompare, order } = JSON.parse(child.stdout);
    if (!locale.startsWith("da")) {
      t.skip(`LC_ALL=da_DK.UTF-8 gave the collator locale ${locale}: this platform ignores LC_ALL, so the case cannot run`);
      return;
    }
    assert.ok(localeCompare > 0, `under ${locale}, localeCompare must put "aa-test" after "b-test", or this case proves nothing`);
    assert.deepEqual(order, ["aa-test", "b-test"]);
  });
});
