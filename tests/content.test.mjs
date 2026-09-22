import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { walk } from "../scripts/lib/site.mjs";
import { buildSite, copyDir, copyProject, runGate, SRC, tempDir } from "./helpers.mjs";

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

  /** A copy of the build with `count` filler words prepended to one article's body. */
  async function withPaddedArticle(name, slug, count) {
    const copy = await copyDir(built, path.join(tmp.dir, name));
    const page = path.join(copy, "blog", slug, "index.html");
    const html = await readFile(page, "utf8");
    const padded = html.replace('<div class="article-body">', `<div class="article-body"><p>${"filler ".repeat(count).trim()}</p>`);
    assert.notEqual(padded, html, `${name}: the article body must be found`);
    await writeFile(page, padded);
    return copy;
  }

  it("fails when a seed article grows past 600 English words (REQ-006, AC-11)", async () => {
    const broken = await withPaddedArticle("seed-long", "how-this-site-was-built-by-agents", 400);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}blog\/how-this-site-was-built-by-agents\/index\.html: \d+ words \(300–600\)/);
  });

  it("counts the prose only: figure captions and diagram labels do not count (si-55iu)", async () => {
    // 400 words inside a <figure> would push the seed article past 600 if
    // they counted; the same words in a <p> (the test above) do.
    const copy = await copyDir(built, path.join(tmp.dir, "seed-figure"));
    const page = path.join(copy, "blog", "how-this-site-was-built-by-agents", "index.html");
    const html = await readFile(page, "utf8");
    const padded = html.replace('<div class="article-body">', `<div class="article-body"><figure class="figure figure-inline"><svg viewBox="0 0 10 10" role="img" aria-labelledby="pad-title"><title id="pad-title">padding</title><text>${"label ".repeat(200).trim()}</text></svg><figcaption>${"caption ".repeat(200).trim()}</figcaption></figure>`);
    assert.notEqual(padded, html, "the article body must be found");
    await writeFile(page, padded);
    const { status, output } = runGate("content", copy);
    assert.equal(status, 0, output);
    assert.match(output, /ok {4}blog\/how-this-site-was-built-by-agents\/index\.html: \d+ words \(300–600\)/);
  });

  it("fails an article page whose \"more from the blog\" band lists the page itself or is missing (founder feedback 2026-09-22)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "more-band"));
    const first = path.join(copy, "blog", "how-this-site-was-built-by-agents", "index.html");
    const firstHtml = await readFile(first, "utf8");
    // The band's first card points back at the page itself.
    const self = firstHtml.replace(/(class="post-title"[^>]*><a href=")\/blog\/why-we-run-an-agent-run-factory\/"/, "$1/blog/how-this-site-was-built-by-agents/\"");
    assert.notEqual(self, firstHtml, "the band's first card must be found");
    await writeFile(first, self);
    const second = path.join(copy, "sv", "blog", "lessons-from-building-niva", "index.html");
    const secondHtml = await readFile(second, "utf8");
    const without = secondHtml.replace(/<section class="section section-alt article-more"[\s\S]*?<\/section>/, "");
    assert.notEqual(without, secondHtml, "the band must be found");
    await writeFile(second, without);
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    // The listed URLs are whatever articles exist, so the assertion pins the
    // reason for the failure — the page itself among them — not the set.
    assert.match(output, /FAIL {2}blog\/how-this-site-was-built-by-agents\/index\.html: "more from the blog" lists other en articles \([^)]*\/blog\/how-this-site-was-built-by-agents\/[^)]*\)/);
    assert.match(output, /FAIL {2}sv\/blog\/lessons-from-building-niva\/index\.html: "more from the blog" lists other sv articles \(none\)/);
    assert.match(output, /FAIL {2}sv\/blog\/lessons-from-building-niva\/index\.html: "more from the blog" links the sv blog index/);
    assert.match(output, /ok {4}blog\/lessons-from-building-niva\/index\.html: "more from the blog" lists other en articles/);
  });

  it("fails when a later article grows past 1,500 English words (the series ceiling, si-xcpc)", async () => {
    const broken = await withPaddedArticle("series-long", "why-we-run-an-agent-run-factory", 600);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}blog\/why-we-run-an-agent-run-factory\/index\.html: \d+ words \(300–1500\)/);
  });

  it("fails when a private repository is linked", async () => {
    const broken = await withLandingEdit("private-link", (html) => html.replace("</main>", '<a href="https://github.com/PeterBlenessy/portfolio-app">Compound</a></main>'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: contains "github\.com\/PeterBlenessy\/portfolio-app"/);
  });
});

// Scheduled articles (founder ask 2026-09-22, si-gxyg): an article dated after
// today is built at its real URL but listed nowhere until the day it is dated,
// so articles can be prepared in advance. The cases build a copy of src/ with
// two extra articles — one dated tomorrow, one dated today — so the real tree
// carries no fixture of its own, and compare that build with one of the real
// tree.
describe("scheduled posts", () => {
  // The blog index of the real tree, newest first, as it stands today: the
  // exclusion must neither reorder nor drop anything. Add a line when an
  // article is added.
  const EN_ORDER = [
    "/blog/ashlands-what-one-prompt-built/",
    "/blog/why-we-run-an-agent-run-factory/",
    "/blog/how-this-site-was-built-by-agents/",
    "/blog/lessons-from-building-niva/",
  ];
  const SV_ORDER = EN_ORDER.map((url) => `/sv${url}`);

  let tmp;
  let built; // the build of the copy that carries the two extra articles
  let builtSrc; // that copy's source tree, for the gates
  let real; // the repository's own tree, for the order comparison
  before(async () => {
    tmp = await tempDir("scheduled-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    builtSrc = path.join(project, "src");
    await writeArticlePair(project, "scheduled-tomorrow", utcDate(1), "Dated tomorrow", "Daterad i morgon");
    await writeArticlePair(project, "published-today", utcDate(0), "Dated today", "Daterad i dag");
    built = buildSite(path.join(tmp.dir, "site"), {}, project);
    real = buildSite(path.join(tmp.dir, "real"));
  });
  after(() => tmp.cleanup());

  /** YYYY-MM-DD, `offset` days from today in UTC — the unit the collections compare. */
  function utcDate(offset) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
  }

  /** Write one article, both languages, into a copy of the project. */
  async function writeArticlePair(project, slug, date, enTitle, svTitle) {
    for (const [lang, title] of [["en", enTitle], ["sv", svTitle]]) {
      const frontMatter = ["---", `title: ${title}`, `description: ${title}, one sentence.`, `date: ${date}`, "category: app-development", `translationKey: ${slug}`, "draft: false", `machineTranslated: ${lang === "sv"}`, "---"];
      // A body long enough to clear the content gate's 300-word floor, so the
      // gates can run against this build as they do against the real one.
      const body = `The body of ${title}.\n\n${"One sentence of filler prose, written only to give this fixture article its words. ".repeat(30)}`;
      await writeFile(path.join(project, "src", lang, "blog", "posts", `${slug}.md`), `${frontMatter.join("\n")}\n\n${body}\n`);
    }
  }

  /** The article URLs of a built listing page, in the order it lists them. */
  async function listed(out, ...parts) {
    const html = await readFile(path.join(out, ...parts), "utf8");
    // The heading carries an id from the IdAttributePlugin.
    return [...html.matchAll(/class="post-title"[^>]*><a href="([^"]+)"/g)].map(([, url]) => url);
  }

  it("lists neither language of an article dated tomorrow, and does list one dated today", async () => {
    // The blog index of each language, the category page the two extra
    // articles belong to and the landing page's newest three.
    const pages = [["blog", "index.html"], ["blog", "app-development", "index.html"], ["index.html"], ["sv", "blog", "index.html"], ["sv", "blog", "app-development", "index.html"], ["sv", "index.html"]];
    for (const page of pages) {
      const urls = await listed(built, ...page);
      const prefix = page[0] === "sv" ? "/sv" : "";
      assert.deepEqual(urls.filter((url) => url.endsWith("-tomorrow/")), [], page.join("/"));
      assert.deepEqual(urls.filter((url) => url.endsWith("-today/")), [`${prefix}/blog/published-today/`], page.join("/"));
    }
  });

  it("keeps an article dated tomorrow out of both feeds", async () => {
    for (const feed of [["feed.xml"], ["sv", "feed.xml"]]) {
      const xml = await readFile(path.join(built, ...feed), "utf8");
      assert.doesNotMatch(xml, /scheduled-tomorrow/, feed.join("/"));
      assert.match(xml, /published-today/, feed.join("/"));
      // lastBuildDate reads the same collection, so it never runs ahead either.
      const [, lastBuild] = xml.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/);
      assert.ok(new Date(lastBuild) < new Date(`${utcDate(1)}T00:00:00Z`), `${feed.join("/")}: lastBuildDate ${lastBuild} runs ahead of the newest listed article`);
    }
  });

  it("keeps an article dated tomorrow out of the sitemap", async () => {
    const xml = await readFile(path.join(built, "sitemap.xml"), "utf8");
    assert.doesNotMatch(xml, /scheduled-tomorrow/);
    assert.match(xml, /<loc>https:\/\/addablelabs\.se\/blog\/published-today\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/addablelabs\.se\/sv\/blog\/published-today\/<\/loc>/);
  });

  it("still builds the scheduled article at its own URL in both languages (unlisted, not secret)", async () => {
    const en = await readFile(path.join(built, "blog", "scheduled-tomorrow", "index.html"), "utf8");
    assert.match(en, /<h1[^>]*>Dated tomorrow<\/h1>/);
    assert.match(en, /The body of Dated tomorrow\./);
    const sv = await readFile(path.join(built, "sv", "blog", "scheduled-tomorrow", "index.html"), "utf8");
    assert.match(sv, /<h1[^>]*>Daterad i morgon<\/h1>/);
    // Reachable: each page sits at the URL its own canonical names, and the
    // two point at each other through the language switch.
    assert.match(en, /<link rel="canonical" href="https:\/\/addablelabs\.se\/blog\/scheduled-tomorrow\/"/);
    assert.match(sv, /<link rel="canonical" href="https:\/\/addablelabs\.se\/sv\/blog\/scheduled-tomorrow\/"/);
    assert.match(en, /href="\/sv\/blog\/scheduled-tomorrow\/"/);
    assert.match(sv, /href="\/blog\/scheduled-tomorrow\/"/);
  });

  it("leaves the feeds gate and the content gate passing, naming the article they expect to be absent", () => {
    // The gates read the source tree, so they see the scheduled article and
    // must expect exactly the opposite of a listed one: the founder's first
    // scheduled article must not turn the workflow red.
    const feeds = runGate("feeds", built, builtSrc);
    assert.equal(feeds.status, 0, feeds.output);
    assert.match(feeds.output, /ok {4}feed\.xml: no scheduled article \(scheduled-tomorrow on \d{4}-\d{2}-\d{2}\)/);
    assert.match(feeds.output, /ok {4}sv\/feed\.xml: no scheduled article \(scheduled-tomorrow on \d{4}-\d{2}-\d{2}\)/);
    const content = runGate("content", built, builtSrc);
    assert.equal(content.status, 0, content.output);
    assert.match(content.output, /ok {4}en blog index does not list \/blog\/scheduled-tomorrow\/ before \d{4}-\d{2}-\d{2}/);
    assert.match(content.output, /ok {4}sv feed has no item for scheduled-tomorrow before \d{4}-\d{2}-\d{2}/);
    assert.match(content.output, /ok {4}en blog index lists \/blog\/published-today\//);
  });

  it("leaves the order of the articles that are listed unchanged", async () => {
    assert.deepEqual(await listed(real, "blog", "index.html"), EN_ORDER);
    assert.deepEqual(await listed(real, "sv", "blog", "index.html"), SV_ORDER);
    // The same order inside the build that also carries the two extra
    // articles: the one dated today takes its place among them by date and the
    // one dated tomorrow is not there, and nothing else moves.
    assert.deepEqual((await listed(built, "blog", "index.html")).filter((url) => !url.endsWith("-today/")), EN_ORDER);
    assert.deepEqual((await listed(built, "sv", "blog", "index.html")).filter((url) => !url.endsWith("-today/")), SV_ORDER);
  });
});
