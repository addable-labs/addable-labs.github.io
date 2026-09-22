import assert from "node:assert/strict";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyDir, copyProject, runGate, tempDir } from "./helpers.mjs";

// The content gate re-targeted to the Signal landing model (REQ-024 as
// amended by A-01; AC-09 … AC-15): the real build passes, and every
// re-targeted rule fails on a modified copy naming the page and the rule.
describe("content gate", () => {
  let tmp;
  let built;
  before(async () => {
    tmp = await tempDir("content-");
    built = buildSite(path.join(tmp.dir, "site"));
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

  it("passes on the real build, stating the company line on every page (si-98hh)", () => {
    // CHECK_QUIET=0 so the passing run prints its ok lines and the rule can be
    // read back from them.
    const { status, output } = runGate("content", built, undefined, { CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    assert.match(output, /PASS content/);
    assert.match(output, /ok {4}every page's footer states "Addable Labs AB · Org\.nr 559602-2615 · Registered office: Eslöv" in the page's language/);
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

  it("fails when a footer drops the company line the law asks for (si-98hh)", async () => {
    const broken = await withLandingEdit("no-company-line", (html) => html.replace(/<p class="company-line">.*?<\/p>/s, ""));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: footer lacks the company line "Addable Labs AB · Org\.nr 559602-2615 · Registered office: Eslöv"/);
  });

  it("fails when a footer states the organisation number wrong (si-98hh)", async () => {
    const broken = await withLandingEdit("wrong-org-nr", (html) => html.replace("559602-2615", "556000-0000"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: footer lacks the company line/);
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
    const second = path.join(copy, "sv", "blog", "ashlands-what-one-prompt-built", "index.html");
    const secondHtml = await readFile(second, "utf8");
    const without = secondHtml.replace(/<section class="section section-alt article-more"[\s\S]*?<\/section>/, "");
    assert.notEqual(without, secondHtml, "the band must be found");
    await writeFile(second, without);
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    // The listed URLs are whatever articles exist, so the assertion pins the
    // reason for the failure — the page itself among them — not the set.
    assert.match(output, /FAIL {2}blog\/how-this-site-was-built-by-agents\/index\.html: "more from the blog" lists other en articles \([^)]*\/blog\/how-this-site-was-built-by-agents\/[^)]*\)/);
    assert.match(output, /FAIL {2}sv\/blog\/ashlands-what-one-prompt-built\/index\.html: "more from the blog" lists other sv articles \(none\)/);
    assert.match(output, /FAIL {2}sv\/blog\/ashlands-what-one-prompt-built\/index\.html: "more from the blog" links the sv blog index/);
    assert.match(output, /ok {4}blog\/ashlands-what-one-prompt-built\/index\.html: "more from the blog" lists other en articles/);
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
// The blog index of the real tree, newest first, as it stands today, in a
// development build — where every article is present, drafts included: an
// exclusion must neither reorder nor drop anything else. The tree carries no
// draft of its own, so the cases below write the drafts they need. Add a line
// when an article is added.
const EN_ORDER = [
  "/blog/ashlands-what-one-prompt-built/",
  "/blog/why-we-run-an-agent-run-factory/",
  "/blog/how-this-site-was-built-by-agents/",
];
const SV_ORDER = EN_ORDER.map((url) => `/sv${url}`);

/** YYYY-MM-DD, `offset` days from today in UTC — the unit the collections compare. */
function utcDate(offset) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)).toISOString().slice(0, 10);
}

/** Write one article, both languages, into a copy of the project. */
async function writeArticlePair(project, slug, date, enTitle, svTitle, { draft = false } = {}) {
  for (const [lang, title] of [["en", enTitle], ["sv", svTitle]]) {
    const frontMatter = ["---", `title: ${title}`, `description: ${title}, one sentence.`, `date: ${date}`, "category: app-development", `translationKey: ${slug}`, `draft: ${draft}`, `machineTranslated: ${lang === "sv"}`, "---"];
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

describe("scheduled posts", () => {
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
    // One message now names every article the feed is expected to omit, each
    // with its reason — the scheduled one by its date, a draft as a draft.
    assert.match(feeds.output, /ok {4}feed\.xml: no unlisted article \([^)]*\bscheduled-tomorrow on \d{4}-\d{2}-\d{2}\b[^)]*\)/);
    assert.match(feeds.output, /ok {4}sv\/feed\.xml: no unlisted article \([^)]*\bscheduled-tomorrow on \d{4}-\d{2}-\d{2}\b[^)]*\)/);
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

// Drafts (founder ask 2026-09-22, si-mzf1): `draft: true` means the article is
// there to read in a local build — listed, reachable, labelled — and is not in
// the production build at all: no listing, no feed item, no sitemap entry and
// no page at its URL. That is a stronger rule than scheduling above, and the
// two are checked apart. The cases build one copy of the project twice, once
// each way, so the only difference between the two builds is SITE_ENV.
describe("draft posts", () => {
  let tmp;
  let dev; // the development build: drafts present
  let prod; // the production build: drafts absent
  let builtSrc; // the source tree both were built from, for the gates
  before(async () => {
    tmp = await tempDir("drafts-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    builtSrc = path.join(project, "src");
    await writeArticlePair(project, "a-draft", utcDate(0), "A draft", "Ett utkast", { draft: true });
    await writeArticlePair(project, "not-a-draft", utcDate(0), "Not a draft", "Inte ett utkast", { draft: false });
    dev = buildSite(path.join(tmp.dir, "dev"), { SITE_ENV: "" }, project);
    prod = buildSite(path.join(tmp.dir, "prod"), { SITE_ENV: "production" }, project);
  });
  after(() => tmp.cleanup());

  /** Does `out` carry this path? */
  async function built(out, ...parts) {
    try {
      return (await stat(path.join(out, ...parts))).isFile();
    } catch {
      return false;
    }
  }

  const LISTINGS = [["blog", "index.html"], ["blog", "app-development", "index.html"], ["index.html"], ["sv", "blog", "index.html"], ["sv", "blog", "app-development", "index.html"], ["sv", "index.html"]];

  it("lists a draft in a local build, in both languages, wearing its label", async () => {
    for (const page of LISTINGS) {
      const urls = await listed(dev, ...page);
      const prefix = page[0] === "sv" ? "/sv" : "";
      assert.deepEqual(urls.filter((url) => url.endsWith("/a-draft/")), [`${prefix}/blog/a-draft/`], page.join("/"));
    }
    const index = await readFile(path.join(dev, "blog", "index.html"), "utf8");
    assert.match(index, /chip-draft/, "the draft chip is still shown in the listing");
    const page = await readFile(path.join(dev, "blog", "a-draft", "index.html"), "utf8");
    assert.match(page, /chip-draft/, "the draft chip is still shown on the page");
  });

  it("carries a draft in both feeds and in the sitemap of a local build", async () => {
    // The URL form throughout: /a-draft/ as a bare pattern also matches the
    // not-a-draft fixture beside it.
    for (const feed of [["feed.xml"], ["sv", "feed.xml"]]) {
      assert.match(await readFile(path.join(dev, ...feed), "utf8"), /blog\/a-draft\//, feed.join("/"));
    }
    assert.match(await readFile(path.join(dev, "sitemap.xml"), "utf8"), /blog\/a-draft\//);
  });

  it("lists no draft in the production build, in either language", async () => {
    for (const page of LISTINGS) {
      const urls = await listed(prod, ...page);
      const prefix = page[0] === "sv" ? "/sv" : "";
      assert.deepEqual(urls.filter((url) => url.endsWith("/a-draft/")), [], page.join("/"));
      // The article that is not a draft is untouched by any of this.
      assert.deepEqual(urls.filter((url) => url.endsWith("/not-a-draft/")), [`${prefix}/blog/not-a-draft/`], page.join("/"));
    }
  });

  it("keeps a draft out of both feeds and out of the sitemap of the production build", async () => {
    for (const feed of [["feed.xml"], ["sv", "feed.xml"]]) {
      const xml = await readFile(path.join(prod, ...feed), "utf8");
      assert.doesNotMatch(xml, /blog\/a-draft\//, feed.join("/"));
      assert.match(xml, /blog\/not-a-draft\//, feed.join("/"));
    }
    const sitemap = await readFile(path.join(prod, "sitemap.xml"), "utf8");
    assert.doesNotMatch(sitemap, /blog\/a-draft\//);
    assert.match(sitemap, /<loc>https:\/\/addablelabs\.se\/blog\/not-a-draft\/<\/loc>/);
  });

  it("builds no page at all for a draft in production — absent, not unlisted", async () => {
    // The difference from a scheduled article, which IS built at its URL.
    assert.equal(await built(dev, "blog", "a-draft", "index.html"), true);
    assert.equal(await built(dev, "sv", "blog", "a-draft", "index.html"), true);
    assert.equal(await built(prod, "blog", "a-draft", "index.html"), false);
    assert.equal(await built(prod, "sv", "blog", "a-draft", "index.html"), false);
    assert.equal(await built(prod, "blog", "not-a-draft", "index.html"), true);
    assert.equal(await built(prod, "sv", "blog", "not-a-draft", "index.html"), true);
  });

  it("leaves the gates passing in both modes, naming what each expects", () => {
    // The gates read the source tree, so they see the draft in both modes and
    // must expect the opposite thing in each: the founder's draft must turn
    // the workflow red in neither.
    for (const [out, env] of [[dev, ""], [prod, "production"]]) {
      for (const gate of ["links", "feeds", "content", "parity"]) {
        const { status, output } = runGate(gate, out, builtSrc, { SITE_ENV: env });
        assert.equal(status, 0, `${gate} in ${env || "development"}:\n${output}`);
      }
    }
    const devContent = runGate("content", dev, builtSrc, { SITE_ENV: "" });
    assert.match(devContent.output, /ok {4}en blog index lists \/blog\/a-draft\//);
    assert.match(devContent.output, /ok {4}en blog index entry for a-draft carries "Draft"/);
    const prodContent = runGate("content", prod, builtSrc, { SITE_ENV: "production" });
    assert.match(prodContent.output, /ok {4}blog\/a-draft\/index\.html is not built \(a draft, and this is the production build\)/);
    assert.match(prodContent.output, /ok {4}en blog index does not list \/blog\/a-draft\/ \(a draft, and this is the production build\)/);
    assert.match(prodContent.output, /ok {4}sv feed has no item for a-draft \(a draft, and this is the production build\)/);
    const prodFeeds = runGate("feeds", prod, builtSrc, { SITE_ENV: "production" });
    // The message names every article it expects to be absent — the fixture
    // draft and the repository's own.
    assert.match(prodFeeds.output, /ok {4}feed\.xml: no unlisted article \([^)]*\ba-draft is a draft\b[^)]*\)/);
  });

  it("leaves the order of the published articles unchanged in both builds", async () => {
    // Nothing else moves: the repository's own articles carry no draft of
    // their own, so they keep their order in both builds and only the
    // fixture draft is missing from the production one.
    const withoutFixtures = (urls) => urls.filter((url) => !url.endsWith("/a-draft/") && !url.endsWith("/not-a-draft/"));
    assert.deepEqual(withoutFixtures(await listed(dev, "blog", "index.html")), EN_ORDER);
    assert.deepEqual(withoutFixtures(await listed(prod, "blog", "index.html")), EN_ORDER);
    assert.deepEqual(withoutFixtures(await listed(prod, "sv", "blog", "index.html")), SV_ORDER);
  });
});
