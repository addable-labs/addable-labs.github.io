import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { articlesShownIn, fallbackPages, untranslated } from "../scripts/lib/fallback.mjs";
import { eleventyDate } from "../scripts/lib/frontmatter.mjs";
import { attr, loadPage, text } from "../scripts/lib/html.mjs";
import { loadSite, loadStrings, newestFirst, readArticleSources } from "../scripts/lib/site.mjs";
import { buildSite, copyDir, copyProject, runGate, runHtmlValidate, SRC, tempDir } from "./helpers.mjs";

// Articles in English only (the founder's decision D206, 24 November 2026;
// scripts/lib/fallback.mjs): an English article without a Swedish file is
// shown on the Swedish side of the site in English — at /sv/blog/<slug>/, in
// the Swedish listings with a "På engelska" chip and in the Swedish feed —
// and articles that have a Swedish file behave as before. The real site has
// no such article yet, so these cases build a copy of the project with the
// Swedish files of two articles removed: the newest listed article, which the
// Swedish landing page's newest three, the blog index and the feed all show,
// and a draft, which a local build shows and the production build leaves out
// in both languages. Nothing here reaches the repository's own build.

const SITE = await loadSite(SRC);
const STRINGS = await loadStrings(SRC, SITE);
const ORIGIN = SITE.url.replace(/\/$/, "");
const ENGLISH = await readArticleSources(SRC, SITE, "en");
// The newest listed article, and an English draft that no published article
// links (the production build passes the links gate without it).
const NEWEST = newestFirst(ENGLISH.filter((article) => article.listed))[0];
const DRAFT = ENGLISH.find((article) => article.draft && !article.scheduled);
const GATES = ["links", "pages", "parity", "feeds", "content"];

/** Text as Nunjucks escapes it in a template, as the feed writes a title. */
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** The day before `date` (an article's date as typed), as an ISO instant at noon UTC. */
function dayBefore(date) {
  const day = eleventyDate(date);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - 1, 12)).toISOString();
}

describe("an article in English only (D206)", () => {
  let tmp;
  let project;
  let dev;
  let prod;
  let early; // a build of the day before NEWEST's date, when it is scheduled
  const page = (out, urlPath) => loadPage(path.join(out, ...urlPath.split("/").filter(Boolean), "index.html"), out, SITE);
  const english = (slug) => `/blog/${slug}/`;
  const swedish = (slug) => `/sv/blog/${slug}/`;

  before(async () => {
    assert.ok(NEWEST && DRAFT, "the cases need a listed article and a draft in the source tree");
    tmp = await tempDir("fallback-");
    project = await copyProject(path.join(tmp.dir, "project"));
    for (const { slug } of [NEWEST, DRAFT]) await rm(path.join(project, "src", "sv", "blog", "posts", `${slug}.md`));
    dev = buildSite(path.join(tmp.dir, "dev"), {}, project);
    prod = buildSite(path.join(tmp.dir, "prod"), { SITE_ENV: "production" }, project);
    early = buildSite(path.join(tmp.dir, "early"), { SITE_NOW: dayBefore(NEWEST.date) }, project);
  });
  after(() => tmp?.cleanup());

  it("reads which articles are in English only, as the build does", async () => {
    const src = path.join(project, "src");
    assert.deepEqual((await fallbackPages(src, SITE)).map((entry) => [entry.path, entry.original]).sort(), [NEWEST, DRAFT].map(({ slug }) => [swedish(slug), english(slug)]).sort());
    const shown = await articlesShownIn(src, SITE, "sv");
    const newest = shown.find((article) => article.slug === NEWEST.slug);
    assert.deepEqual({ lang: newest.lang, fallback: newest.fallback, path: newest.path, url: newest.url, original: newest.original, title: newest.title }, { lang: "sv", fallback: true, path: swedish(NEWEST.slug), url: `${ORIGIN}${swedish(NEWEST.slug)}`, original: english(NEWEST.slug), title: NEWEST.title });
    assert.equal(shown.filter((article) => article.fallback).length, 2);
    assert.deepEqual(await articlesShownIn(src, SITE, "en"), await readArticleSources(src, SITE, "en"));
    // The real site has a Swedish file for every article.
    assert.deepEqual(await fallbackPages(SRC, SITE), []);
    // Paired by translationKey, not by file name.
    assert.deepEqual(untranslated([{ translationKey: "a" }, { translationKey: "b" }], [{ translationKey: "b" }]), [{ translationKey: "a" }]);
  });

  it("lists it on the Swedish side, labelled \"På engelska\", at its Swedish address, and on the English side as before", async () => {
    const label = STRINGS.sv.article.inEnglishLabel;
    assert.equal(label, "På engelska");
    for (const where of ["/sv/blog/", "/sv/"]) {
      const list = await page(dev, where);
      const card = list.doc.querySelectorAll("main .post").find((item) => attr(item.querySelector(".post-title a"), "href") === swedish(NEWEST.slug));
      assert.ok(card, `${where} lists ${swedish(NEWEST.slug)}`);
      assert.deepEqual(card.querySelectorAll(".chip-lang").map(text), [label], where);
      assert.equal(text(card.querySelector(".post-title")), NEWEST.title, where);
      assert.equal(attr(card.querySelector(".post-title"), "lang"), "en", where);
      assert.equal(attr(card.querySelector(".post-text"), "lang"), "en", where);
      // Only the article in English wears the label.
      assert.equal(list.doc.querySelectorAll("main .chip-lang").length, where === "/sv/" ? 1 : 2, where);
    }
    // The landing page's newest three start with it, as they would with a Swedish file.
    const landing = await page(dev, "/sv/");
    assert.equal(attr(landing.doc.querySelector("main .writing .post .post-title a"), "href"), swedish(NEWEST.slug));
    // The English side shows no label.
    for (const where of ["/blog/", "/"]) assert.equal((await page(dev, where)).doc.querySelectorAll(".chip-lang").length, 0, where);
  });

  it("shows it at /sv/blog/<slug>/ in English, with the Swedish chrome and the line that says so", async () => {
    const shown = await page(dev, swedish(NEWEST.slug));
    const own = await page(dev, english(NEWEST.slug));
    const { doc } = shown;
    assert.equal(attr(doc.querySelector("html"), "lang"), "sv");
    const note = doc.querySelector("main .article-lang-note a");
    assert.equal(text(note).replace(/→$/, "").trim(), "Den här artikeln finns bara på engelska.");
    assert.equal(attr(note, "href"), english(NEWEST.slug));
    const article = doc.querySelector("main article.article");
    assert.equal(doc.querySelector("main .article-lang-note").nextElementSibling, article, "the line sits right above the article");
    assert.equal(attr(article, "lang"), "en");
    assert.equal(text(article.querySelector("h1")), NEWEST.title);
    // The English text, figures and all, as the English page renders it.
    assert.equal(article.querySelector(".article-body").innerHTML.trim(), own.doc.querySelector("main article.article .article-body").innerHTML.trim());
    // The Swedish chrome: navigation, date and category chip in Swedish.
    assert.equal(text(doc.querySelector("header nav a")), STRINGS.sv.nav.home);
    const meta = article.querySelector(".article-meta");
    assert.equal(attr(meta, "lang"), "sv");
    assert.equal(text(meta.querySelector("time")), new Intl.DateTimeFormat("sv", { dateStyle: "long", timeZone: "UTC" }).format(eleventyDate(NEWEST.date)));
    assert.equal(attr(meta.querySelector(".chip-cat"), "href"), `/sv/blog/${NEWEST.category}/`);
    // No "read it in the other language" button: it is already in English.
    assert.equal(doc.querySelector(".article-footer"), null);
  });

  it("points the page's canonical link at the English page and claims no hreflang alternate, on either page", async () => {
    const shown = (await page(dev, swedish(NEWEST.slug))).doc;
    const own = (await page(dev, english(NEWEST.slug))).doc;
    assert.equal(attr(shown.querySelector('link[rel="canonical"]'), "href"), `${ORIGIN}${english(NEWEST.slug)}`);
    assert.equal(attr(shown.querySelector('meta[property="og:url"]'), "content"), `${ORIGIN}${english(NEWEST.slug)}`);
    assert.equal(attr(own.querySelector('link[rel="canonical"]'), "href"), `${ORIGIN}${english(NEWEST.slug)}`);
    assert.equal(shown.querySelectorAll('link[rel="alternate"][hreflang]').length, 0);
    assert.equal(own.querySelectorAll('link[rel="alternate"][hreflang]').length, 0);
    // An article with a Swedish file keeps its three.
    const paired = ENGLISH.find((article) => article.listed && article.slug !== NEWEST.slug);
    assert.equal((await page(dev, english(paired.slug))).doc.querySelectorAll('link[rel="alternate"][hreflang]').length, 3);
    assert.equal((await page(dev, swedish(paired.slug))).doc.querySelectorAll('link[rel="alternate"][hreflang]').length, 3);
  });

  it("switches from the English page to the Swedish one and back, in the header and the footer", async () => {
    const shown = (await page(dev, swedish(NEWEST.slug))).doc;
    const own = (await page(dev, english(NEWEST.slug))).doc;
    for (const selector of ["header a.lang-switch", "footer a.lang-switch-footer"]) {
      const there = own.querySelector(selector);
      assert.deepEqual([attr(there, "href"), attr(there, "hreflang"), text(there)], [swedish(NEWEST.slug), "sv", STRINGS.en.languages.sv], selector);
      const back = shown.querySelector(selector);
      assert.deepEqual([attr(back, "href"), attr(back, "hreflang"), text(back)], [english(NEWEST.slug), "en", STRINGS.sv.languages.en], selector);
    }
  });

  it("lists it in the sitemap once, at its English URL alone, and never the Swedish page", async () => {
    const sitemap = await readFile(path.join(dev, "sitemap.xml"), "utf8");
    const entry = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => body).filter((body) => body.includes(`/blog/${NEWEST.slug}/`));
    assert.equal(entry.length, 1, "one entry names the article");
    assert.equal(entry[0].trim(), `<loc>${ORIGIN}${english(NEWEST.slug)}</loc>`);
    assert.ok(!sitemap.includes(`${ORIGIN}${swedish(NEWEST.slug)}`), "the Swedish page is not in the sitemap");
    // An article with a Swedish file keeps its alternates there.
    assert.ok(sitemap.includes(`hreflang="sv" href="${ORIGIN}${swedish(ENGLISH.find((article) => article.listed && article.slug !== NEWEST.slug).slug)}"`));
  });

  it("puts it in the Swedish feed with its English title, linking its Swedish address", async () => {
    const feed = await readFile(path.join(dev, "sv", "feed.xml"), "utf8");
    const item = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => body).find((body) => body.includes(`<link>${ORIGIN}${swedish(NEWEST.slug)}</link>`));
    assert.ok(item, "the Swedish feed has an item for it");
    assert.ok(item.includes(`<title>${escapeXml(NEWEST.title)}</title>`), item.slice(0, 300));
    assert.match(item, new RegExp(`<guid isPermaLink="true">${ORIGIN}${swedish(NEWEST.slug)}</guid>`));
    const englishFeed = await readFile(path.join(dev, "feed.xml"), "utf8");
    assert.ok(englishFeed.includes(`<link>${ORIGIN}${english(NEWEST.slug)}</link>`));
  });

  it("keeps a draft in English only out of the production build in both languages, and in a local build shows it like the other", async () => {
    for (const urlPath of [english(DRAFT.slug), swedish(DRAFT.slug)]) {
      await assert.rejects(page(prod, urlPath), { code: "ENOENT" }, `${urlPath} in production`);
      const local = await page(dev, urlPath);
      assert.equal(text(local.doc.querySelector("main h1")), DRAFT.title, `${urlPath} locally`);
    }
    const index = await page(dev, "/sv/blog/");
    const card = index.doc.querySelectorAll("main .post").find((item) => attr(item.querySelector(".post-title a"), "href") === swedish(DRAFT.slug));
    assert.deepEqual([card.querySelectorAll(".chip-draft").map(text), card.querySelectorAll(".chip-lang").map(text)], [[STRINGS.sv.article.draftLabel], [STRINGS.sv.article.inEnglishLabel]]);
    const published = await page(prod, "/sv/blog/");
    assert.equal(published.doc.querySelectorAll(`a[href="${swedish(DRAFT.slug)}"]`).length, 0);
    assert.ok(!(await readFile(path.join(prod, "sv", "feed.xml"), "utf8")).includes(swedish(DRAFT.slug)));
  });

  it("builds it, unlisted, on the day before its date, as it builds a scheduled article", async () => {
    for (const urlPath of [english(NEWEST.slug), swedish(NEWEST.slug)]) assert.equal(text((await page(early, urlPath)).doc.querySelector("main h1")), NEWEST.title, urlPath);
    assert.equal((await page(early, "/sv/blog/")).doc.querySelectorAll(`.post-title a[href="${swedish(NEWEST.slug)}"]`).length, 0);
    assert.ok(!(await readFile(path.join(early, "sv", "feed.xml"), "utf8")).includes(`<link>${ORIGIN}${swedish(NEWEST.slug)}</link>`));
  });

  for (const [name, mode] of [["a local build", "dev"], ["the production build", "prod"], ["a build that schedules it", "early"]]) {
    it(`passes every gate that reads the built pages, and html-validate, in ${name}`, () => {
      const out = { dev, prod, early }[mode];
      const env = mode === "prod" ? { SITE_ENV: "production" } : mode === "early" ? { SITE_NOW: dayBefore(NEWEST.date) } : {};
      for (const gate of GATES) {
        const { status, output } = runGate(gate, out, path.join(project, "src"), env);
        assert.equal(status, 0, `${gate}:\n${output}`);
      }
      const html = runHtmlValidate(out);
      assert.equal(html.status, 0, html.output);
    });
  }

  it("fails the gates when the Swedish page or its card says nothing of the English, or claims a translation", async () => {
    const src = path.join(project, "src");
    const fails = async (name, edit, gate, pattern) => {
      const broken = await copyDir(dev, path.join(tmp.dir, name));
      await edit(broken);
      const { status, output } = runGate(gate, broken, src);
      assert.equal(status, 1, `${name}: ${gate} should fail\n${output}`);
      assert.match(output, pattern, name);
    };
    const editFile = async (out, urlPath, change) => {
      const file = path.join(out, ...urlPath.split("/").filter(Boolean), "index.html");
      const html = await readFile(file, "utf8");
      const changed = change(html);
      assert.notEqual(changed, html, `${urlPath}: the edit must find its text`);
      await writeFile(file, changed);
    };
    const shownPath = `sv/blog/${NEWEST.slug}/index.html`;
    await fails("no-label", (out) => editFile(out, "/sv/blog/", (html) => html.replace(`<span class="chip chip-lang">${STRINGS.sv.article.inEnglishLabel}</span>`, "")), "content", new RegExp(`FAIL {2}sv/blog/index\\.html: the card for /sv/blog/${NEWEST.slug}/ shows an article in English`));
    await fails("no-note", (out) => editFile(out, swedish(NEWEST.slug), (html) => html.replace(/<div class="container article-lang-note">[\s\S]*?<\/div>\n/, "")), "content", new RegExp(`FAIL {2}${shownPath.replace(/\./g, "\\.")}: shows /blog/${NEWEST.slug}/ in English`));
    await fails("swedish-article", (out) => editFile(out, swedish(NEWEST.slug), (html) => html.replace('<article class="container article" lang="en">', '<article class="container article">')), "content", new RegExp(`FAIL {2}${shownPath.replace(/\./g, "\\.")}: shows /blog/${NEWEST.slug}/ in English`));
    await fails("own-canonical", (out) => editFile(out, swedish(NEWEST.slug), (html) => html.replace(`<link rel="canonical" href="${ORIGIN}${english(NEWEST.slug)}">`, `<link rel="canonical" href="${ORIGIN}${swedish(NEWEST.slug)}">`)), "pages", new RegExp(`FAIL {2}${shownPath.replace(/\./g, "\\.")}: canonical is "${ORIGIN}${swedish(NEWEST.slug)}", expected ${ORIGIN}${english(NEWEST.slug)}`));
    await fails("claims-translation", (out) => editFile(out, swedish(NEWEST.slug), (html) => html.replace("<link rel=\"canonical\"", `<link rel="alternate" hreflang="sv" href="${ORIGIN}${swedish(NEWEST.slug)}">\n  <link rel="canonical"`)), "pages", /hreflang alternate\(s\), expected none: the page shows the English article, it does not translate it/);
    await fails("switch-nowhere", (out) => editFile(out, english(NEWEST.slug), (html) => html.replace(`<a class="lang-switch" href="${swedish(NEWEST.slug)}"`, '<a class="lang-switch" href="/sv/"')), "parity", new RegExp(`the language switch leads to /sv/, not ${swedish(NEWEST.slug)}`));
    await fails("page-missing", (out) => rm(path.join(out, "sv", "blog", NEWEST.slug), { recursive: true }), "parity", new RegExp(`FAIL {2}sv/blog/${NEWEST.slug}/index\\.html is missing \\(counterpart of blog/${NEWEST.slug}/index\\.html\\)`));
  });
});

describe("a page without its counterpart, other than an English article (REQ-009)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("fallback-pairs-");
  });
  after(() => tmp?.cleanup());

  it("still fails the build: a Swedish article without its English file, and a page without its Swedish one", async () => {
    // The article's media are published with its English file, so the build
    // names that file first.
    const swedishOnly = await copyProject(path.join(tmp.dir, "swedish-only"));
    const slug = ENGLISH.find((article) => article.listed).slug;
    await rm(path.join(swedishOnly, "src", "en", "blog", "posts", `${slug}.md`));
    assert.throws(() => buildSite(path.join(tmp.dir, "swedish-only-site"), {}, swedishOnly), new RegExp(`src/media/${slug}/: no article ${slug} to publish it with \\(src/en/blog/posts/${slug}\\.md missing\\)`));
    const noAbout = await copyProject(path.join(tmp.dir, "no-about"));
    await rm(path.join(noAbout, "src", "sv", "about.njk"));
    assert.throws(() => buildSite(path.join(tmp.dir, "no-about-site"), {}, noAbout), /src\/en\/about\.njk: expected exactly one "sv" page with translationKey "about", found 0 \(none\)/);
  });
});
