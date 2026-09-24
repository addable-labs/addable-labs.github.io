import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { checkPageUrls, urlProblem } from "../scripts/lib/urls.mjs";
import { buildSite, copyProject, ROOT, tempDir } from "./helpers.mjs";

// The names that become URLs (si-2a7h): a file's name becomes its URL, and
// the build holds every URL it forms to one rule — each part a slug, and a
// URL that does not end in "/" may end in one extension — and refuses a file
// name Eleventy would change on the way to the URL (si-ok07): a date in it,
// or an article named index.md. It refuses a file in a subdirectory of
// posts/ too (si-73wj), which it would otherwise publish as an article that
// no check reads, a draft included.

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

// The file names the build refuses whatever their URLs (si-ok07), each with
// the URL Eleventy gives it and the part of the name Eleventy drops from it.
const DATED = [
  ["./src/en/blog/posts/2026-09-24-name.md", "/blog/name/", "2026-09-24-"],
  ["./src/sv/blog/posts/notes-2026-09-24-name.md", "/sv/blog/name/", "notes-2026-09-24-"],
  ["./src/en/blog/posts/2026-09-24-2026-09-25-name.md", "/blog/2026-09-25-name/", "2026-09-24-"], // the first date only
  ["./src/en/2026-09-24-page.njk", "/page/", "2026-09-24-"], // a page, not an article
];

// Articles named index.md, each with the URL Eleventy gives it: its directory's name.
const ARTICLE_INDEXES = [
  ["./src/en/blog/posts/index.md", "/blog/posts/"],
  ["./src/sv/blog/posts/index.md", "/sv/blog/posts/"],
];

// Files in a subdirectory of posts/, each with the URL the build gives it —
// posts.11tydata.js makes it an article all the same — and the subdirectory
// the refusal names.
const NESTED = [
  ["./src/en/blog/posts/sub/nested-draft.md", "/blog/nested-draft/", "sub"],
  ["./src/sv/blog/posts/sub/nested-draft.md", "/sv/blog/nested-draft/", "sub"],
  ["./src/en/blog/posts/2026/09/name.md", "/blog/name/", "2026/09"], // two levels down
  ["./src/en/blog/posts/sub/index.md", "/blog/sub/", "sub"],
  ["./src/sv/blog/posts/sub/page.njk", "/sv/blog/page/", "sub"], // a template that is not Markdown
];

// Names Eleventy makes the URL they spell, each with that URL.
const KEPT = [
  ["./src/en/blog/posts/name-2026-09-24.md", "/blog/name-2026-09-24/"], // a date at the end
  ["./src/en/index.njk", "/"], // index pages that are not articles
  ["./src/en/blog/index.njk", "/blog/"],
  ["./src/sv/blog/index.njk", "/sv/blog/"],
];

/** The message `checkPageUrls` throws for these files and their URLs, or null when it throws none. */
function refusal(inputPathToUrl) {
  try {
    checkPageUrls(inputPathToUrl);
    return null;
  } catch (error) {
    return error.message;
  }
}

describe("file names", () => {
  it("refuses a date anywhere in a file name, naming the file and what Eleventy would drop", () => {
    // [] as well: a draft the production build leaves out comes with no URL.
    for (const [inputPath, url, dropped] of DATED) {
      for (const urls of [[url], []]) {
        const message = refusal({ [inputPath]: urls });
        assert.ok(message?.startsWith("These files have a date in their names:\n"), `${inputPath} ${JSON.stringify(urls)}: ${message}`);
        assert.ok(message.includes(`\n  ${inputPath}: Eleventy would drop ${JSON.stringify(dropped)} from the URL\n`), message);
      }
    }
  });

  it("refuses an article named index.md, naming the file", () => {
    for (const [inputPath, url] of ARTICLE_INDEXES) {
      for (const urls of [[url], []]) {
        const message = refusal({ [inputPath]: urls });
        assert.ok(message?.startsWith("These articles are named index.md:\n"), `${inputPath} ${JSON.stringify(urls)}: ${message}`);
        assert.ok(message.includes(`\n  ${inputPath}: Eleventy would name it after its directory, "posts"\n`), message);
      }
    }
  });

  it("refuses a file in a subdirectory of posts/, naming the file and the subdirectory", () => {
    // [] as well: the rule is about where the file is, whatever its URL.
    for (const [inputPath, url, dir] of NESTED) {
      for (const urls of [[url], []]) {
        const message = refusal({ [inputPath]: urls });
        assert.ok(message?.startsWith("These files are in a subdirectory of posts/:\n"), `${inputPath} ${JSON.stringify(urls)}: ${message}`);
        assert.ok(message.includes(`\n  ${inputPath}: in the subdirectory ${JSON.stringify(dir)}\n`), message);
      }
    }
  });

  it("keeps a date at the end of a name, and an index page that is not an article", () => {
    assert.equal(refusal(Object.fromEntries(KEPT.map(([inputPath, url]) => [inputPath, [url]]))), null);
  });

  it("lists the files under each rule they break, and states each rule once", () => {
    const message = refusal({
      "./src/en/blog/posts/notes-2026-09-24-name.md": ["/blog/name/"],
      "./src/sv/blog/posts/notes-2026-09-24-name.md": ["/sv/blog/name/"],
      "./src/en/blog/posts/2026-09-24-About.md": ["/blog/About/"],
      "./src/en/blog/posts/index.md": ["/blog/posts/"],
      "./src/en/blog/posts/drafts/name.md": ["/blog/name/"],
    });
    assert.equal(
      message,
      [
        "These files give their pages URLs that are not made of slugs:",
        '  ./src/en/blog/posts/2026-09-24-About.md: URL /blog/About/ has "About"',
        'Each part of a URL must be lowercase letters, digits and single hyphens, as in /blog/ai-journey/; only a URL that does not end in "/" may end in one extension, as in /feed.xml.',
        "A file's name becomes its URL, so rename the file, or fix its permalink if it sets one.",
        "These files have a date in their names:",
        '  ./src/en/blog/posts/2026-09-24-About.md: Eleventy would drop "2026-09-24-" from the URL',
        '  ./src/en/blog/posts/notes-2026-09-24-name.md: Eleventy would drop "notes-2026-09-24-" from the URL',
        '  ./src/sv/blog/posts/notes-2026-09-24-name.md: Eleventy would drop "notes-2026-09-24-" from the URL',
        "Eleventy drops a date and the hyphen after it (YYYY-MM-DD-) from a file name when it makes the URL, and everything before the date too.",
        "A file's name becomes its URL and an article's date goes in its front matter, so rename the file.",
        "These articles are named index.md:",
        '  ./src/en/blog/posts/index.md: Eleventy would name it after its directory, "posts"',
        "An article's file name becomes its URL, and Eleventy names an index.md after its directory instead, so rename the file.",
        "These files are in a subdirectory of posts/:",
        '  ./src/en/blog/posts/drafts/name.md: in the subdirectory "drafts"',
        "Eleventy gives a file in a subdirectory of posts/ an article's layout and URL, but the checks and the draft rule see only the files directly in posts/, so it would be published unchecked, even with draft: true.",
        "Articles live directly in src/<lang>/blog/posts/, so move the file there.",
      ].join("\n"),
    );
  });
});

/**
 * Write one article, both languages, into a copy of the project, front matter
 * valid. `name` is the file's path under posts/, without .md: "name", or
 * "sub/name" for a file in a subdirectory.
 */
async function writeArticlePair(project, name, translationKey, { draft = false } = {}) {
  for (const lang of ["en", "sv"]) {
    const file = path.join(project, "src", lang, "blog", "posts", `${name}.md`);
    const frontMatter = ["---", `title: ${translationKey} (${lang})`, "description: One sentence.", "date: 2026-09-01", "category: app-development", `translationKey: ${translationKey}`, `draft: ${draft}`, "aiGenerated: true", "humanReviewed: true", "---"];
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${frontMatter.join("\n")}\n\nThe body.\n`);
  }
}

/** The message of the build of `project` that must fail, or "" when it builds. */
function buildFailure(project, out, env = {}) {
  try {
    buildSite(out, env, project);
    return "";
  } catch (error) {
    return error.message;
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

  it("fails naming every file whose name holds a date, and every article named index.md", async () => {
    const project = await copyProject(path.join(tmp.dir, "refused"));
    await writeArticlePair(project, "2026-09-24-first", "first");
    await writeArticlePair(project, "notes-2026-09-24-second", "second");
    await writeArticlePair(project, "index", "index-probe");
    const message = buildFailure(project, path.join(tmp.dir, "refused-site"));
    assert.notEqual(message, "", "the build passed");
    for (const lang of ["en", "sv"]) {
      assert.ok(message.includes(`./src/${lang}/blog/posts/2026-09-24-first.md: Eleventy would drop "2026-09-24-" from the URL`), message);
      assert.ok(message.includes(`./src/${lang}/blog/posts/notes-2026-09-24-second.md: Eleventy would drop "notes-2026-09-24-" from the URL`), message);
      assert.ok(message.includes(`./src/${lang}/blog/posts/index.md: Eleventy would name it after its directory, "posts"`), message);
    }
  });

  it("fails on a dated name in a draft the production build leaves out", async () => {
    const project = await copyProject(path.join(tmp.dir, "draft"));
    await writeArticlePair(project, "2026-09-24-draft", "draft-probe", { draft: true });
    const message = buildFailure(project, path.join(tmp.dir, "draft-site"), { SITE_ENV: "production" });
    assert.notEqual(message, "", "the build passed");
    for (const lang of ["en", "sv"]) {
      assert.ok(message.includes(`./src/${lang}/blog/posts/2026-09-24-draft.md: Eleventy would drop "2026-09-24-" from the URL`), message);
    }
  });

  it("fails on a draft in a subdirectory of posts/, which the production build would publish", async () => {
    const project = await copyProject(path.join(tmp.dir, "nested"));
    await writeArticlePair(project, "sub/nested-draft", "nested-draft", { draft: true });
    for (const [mode, env] of [
      ["production", { SITE_ENV: "production" }],
      ["development", {}],
    ]) {
      const message = buildFailure(project, path.join(tmp.dir, `nested-site-${mode}`), env);
      assert.notEqual(message, "", `the ${mode} build passed`);
      for (const lang of ["en", "sv"]) {
        assert.ok(message.includes(`./src/${lang}/blog/posts/sub/nested-draft.md: in the subdirectory "sub"`), `${mode}: ${message}`);
      }
    }
  });

  it("passes a date at the end of a name, beside every file of the site", async () => {
    const project = await copyProject(path.join(tmp.dir, "kept"));
    await writeArticlePair(project, "name-2026-09-24", "name-dated");
    const out = path.join(tmp.dir, "kept-site");
    assert.equal(buildFailure(project, out), "");
    for (const prefix of ["", "sv"]) assert.ok(existsSync(path.join(out, prefix, "blog", "name-2026-09-24", "index.html")), `${prefix}/blog/name-2026-09-24/`);
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
