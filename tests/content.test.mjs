import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { promisify } from "node:util";
import { isScheduled } from "../scripts/lib/frontmatter.mjs";
import { loadSite, readArticleSources, walk } from "../scripts/lib/site.mjs";
import { buildSite, clockAt, copyDir, copyProject, IMAGE_FRONT_MATTER, NOW, runGate, SRC, tempDir, utcDate, writeArticleImage } from "./helpers.mjs";

// The content gate re-targeted to the Signal landing model (REQ-024;
// AC-09 … AC-15): the real build passes, and every
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

  /** A copy of the build with one edit applied to each page named (its path in the build). */
  async function withPageEdits(name, edits) {
    const copy = await copyDir(built, path.join(tmp.dir, name));
    for (const [rel, edit] of Object.entries(edits)) {
      const file = path.join(copy, rel);
      const html = await readFile(file, "utf8");
      const edited = edit(html);
      assert.notEqual(edited, html, `${name}: the edit must change ${rel}`);
      await writeFile(file, edited);
    }
    return copy;
  }

  it("passes on the real build, stating the company line on every page (si-98hh)", async () => {
    // CHECK_QUIET=0 so the passing run prints its ok lines and the rule can be
    // read back from them.
    const { status, output } = runGate("content", built, undefined, { CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    assert.match(output, /PASS content/);
    assert.match(output, /ok {4}every page's footer states "Addable Labs AB · Org\.nr 559602-2615 · Registered office: Eslöv" in the page's language/);
    // The repository rule saw the site's GitHub repositories rather than
    // passing on none: the apps grid's, in a page, and the font's, in its
    // licence file (si-vwu8).
    assert.match(output, /ok {4}every GitHub repository the site names is one of the public repositories it may link: [^\n]*\baddable-labs\/ashlands\b[^\n]*\bJetBrains\/JetBrainsMono\b/);
    // Ashlands and nivå link their articles beside their own links, in the
    // page's language (si-3hpa), each from the day it is dated (si-x0js).
    assert.match(output, cardArticleLine("index.html", "Ashlands", "/blog/ashlands-what-one-prompt-built/", "Article"));
    assert.match(output, cardArticleLine("sv/index.html", "nivå", "/sv/blog/lessons-from-building-niva/", "Artikel"));
    // Gaimer's entry names no article, so its card links its repository
    // alone; an article the entry names later joins it on its day.
    const { article } = JSON.parse(await readFile(path.join(SRC, "_data", "portfolio.json"), "utf8")).find((entry) => entry.key === "gaimer");
    const gaimer = article !== undefined && listedToday(`/blog/${article}/`) ? "two links, its repository and its article" : "one link, its repository";
    assert.match(output, new RegExp(`ok {4}index\\.html: Gaimer entry has ${gaimer}, and no other`));
  });

  it("fails when the founder's name disappears from the trust section (REQ-012)", async () => {
    const broken = await withLandingEdit("no-founder", (html) => html.replace("Péter Blénessy", "the founder"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: trust section names Péter Blénessy/);
  });

  it("fails when the about page lacks the founding month (REQ-012)", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "no-month"));
    const about = path.join(broken, "about", "index.html");
    await writeFile(about, (await readFile(about, "utf8")).replace("September 2026", "some time ago"));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: contains "September 2026"/);
  });

  it("passes on the real build, whose about pages name the founder in the lead's first sentence and nowhere else in their main content (founder call 2026-09-22, founder request 2026-09-23)", () => {
    const { status, output } = runGate("content", built, undefined, { CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    assert.match(output, /ok {4}about\/index\.html: lead's first sentence names Péter Blénessy/);
    assert.match(output, /ok {4}about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
    assert.match(output, /ok {4}sv\/about\/index\.html: lead's first sentence names Péter Blénessy/);
    assert.match(output, /ok {4}sv\/about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
  });

  it("fails when the about page names the founder outside the lead, as a founder section would (founder call 2026-09-22)", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "founder-outside-lead"));
    const about = path.join(broken, "about", "index.html");
    const html = await readFile(about, "utf8");
    // The mission section's facts line names the founder as well. The lead is
    // untouched, so only the rule against a founder section can fail.
    const edited = html.replace('<p class="facts-line">', '<p class="facts-line">Péter Blénessy · ');
    assert.notEqual(edited, html, "the facts line must be found");
    await writeFile(about, edited);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
    assert.match(output, /ok {4}about\/index\.html: lead's first sentence names Péter Blénessy/);
  });

  it("fails when the about page's lead no longer names the founder (founder request 2026-09-23)", async () => {
    const broken = await copyDir(built, path.join(tmp.dir, "lead-without-founder"));
    const about = path.join(broken, "about", "index.html");
    const html = await readFile(about, "utf8");
    // The first sentence drops its founder clause. The name is then nowhere in
    // the page's main content, so the rule against a founder section still
    // passes: only the lead rule can catch this.
    const edited = html.replace(", founded by Péter Blénessy", "");
    assert.notEqual(edited, html, "the lead's founder clause must be found");
    await writeFile(about, edited);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: lead's first sentence names Péter Blénessy/);
    assert.match(output, /ok {4}about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
  });

  it("fails when an about page's lead names the founder only after its first sentence, which ends at a full stop or a question mark (founder request 2026-09-23)", async () => {
    // English: the founder clause becomes a sentence of its own at the lead's
    // end ("… as we are. Founded by Péter Blénessy."). Swedish: a question
    // opens the lead, so the sentence that names the founder is its second.
    // The name stays in the lead and nowhere else in the main content, so
    // only the first-sentence rule can fail.
    const broken = await withPageEdits("founder-after-first-sentence", {
      "about/index.html": (html) => html.replace(/(<p class="lead[^"]*">)([^<]*)<\/p>/, (_, open, lead) => `${open}${lead.replace(", founded by Péter Blénessy", "")} Founded by Péter Blénessy.</p>`),
      "sv/about/index.html": (html) => html.replace('<p class="lead reveal">', '<p class="lead reveal">Vem står bakom? '),
    });
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: lead's first sentence names Péter Blénessy — it reads "[^"]*\."/);
    assert.match(output, /FAIL {2}sv\/about\/index\.html: lead's first sentence names Péter Blénessy — it reads "Vem står bakom\?"/);
    assert.match(output, /ok {4}about\/index\.html: no founder section/);
    assert.match(output, /ok {4}sv\/about\/index\.html: no founder section/);
  });

  it("fails when an about page names the founder outside the lead without the accents or in capitals (founder call 2026-09-22)", async () => {
    // The facts line names the founder as "Peter Blenessy" in English and as
    // "PÉTER BLÉNESSY" in Swedish: the same name, so a founder section all
    // the same. The leads are untouched, so only the rule against a founder
    // section can fail.
    const broken = await withPageEdits("founder-other-spelling", {
      "about/index.html": (html) => html.replace('<p class="facts-line">', '<p class="facts-line">Peter Blenessy · '),
      "sv/about/index.html": (html) => html.replace('<p class="facts-line">', '<p class="facts-line">PÉTER BLÉNESSY · '),
    });
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
    assert.match(output, /FAIL {2}sv\/about\/index\.html: no founder section \(outside the lead, the main content does not name Péter Blénessy, ignoring accents and case\)/);
    assert.match(output, /ok {4}about\/index\.html: lead's first sentence names Péter Blénessy/);
    assert.match(output, /ok {4}sv\/about\/index\.html: lead's first sentence names Péter Blénessy/);
  });

  it("fails when the nivå card links more than its public page and its article, or calls the page \"Repository\" (REQ-011; si-gyc4, si-3hpa)", async () => {
    // The repository is private and the product is not: the page, labelled
    // as a website, then the article about nivå from the day it is dated
    // (si-x0js), and nothing else.
    const twice = await withLandingEdit("niva-linked", (html) => html.replace(/(<h3 class="app-name portfolio-name"[^>]*>)nivå(<\/h3>)/, '$1<a href="https://example.com/niva">nivå</a>$2'));
    const linked = runGate("content", twice);
    assert.equal(linked.status, 1);
    const links = listedToday("/blog/lessons-from-building-niva/") ? "two links, its public page and its article" : "one link, its public page";
    assert.match(linked.output, new RegExp(`FAIL {2}index\\.html: nivå entry has ${links}, and no other`));
    const repository = await withLandingEdit("niva-repository", (html) => html.replace('href="https://erniva.se/">Website<span', 'href="https://erniva.se/">Repository<span'));
    const labelled = runGate("content", repository);
    assert.equal(labelled.status, 1);
    assert.match(labelled.output, /FAIL {2}index\.html: nivå entry links its public page \(https:\/\/erniva\.se\/\) through a\.app-action labelled "Website ↗", first in its action row/);
  });

  it("fails when an app card's article link is missing, wears the arrow of a link that leaves the site or links the other language's article (si-3hpa)", async () => {
    // Each edit needs a card's link to its article, which the card carries
    // only while the build lists the article (si-x0js). The edits of a card
    // whose article is dated after today are left out, and the gate is
    // expected to say that card links its article nowhere.
    const niva = listedToday("/blog/lessons-from-building-niva/");
    const ashlands = listedToday("/blog/ashlands-what-one-prompt-built/");
    const edits = {};
    if (niva || ashlands) {
      edits["index.html"] = (html) => {
        let edited = html;
        if (niva) edited = edited.replace(/\n\s*<a class="app-action" href="\/blog\/lessons-from-building-niva\/">Article<span class="arrow" aria-hidden="true">→<\/span><\/a>/, "");
        if (ashlands) edited = edited.replace('href="/blog/ashlands-what-one-prompt-built/">Article<span class="arrow" aria-hidden="true">→', 'href="/blog/ashlands-what-one-prompt-built/">Article<span class="arrow" aria-hidden="true">↗');
        return edited;
      };
    }
    if (ashlands) edits["sv/index.html"] = (html) => html.replace('<a class="app-action" href="/sv/blog/ashlands-what-one-prompt-built/">', '<a class="app-action" href="/blog/ashlands-what-one-prompt-built/">');
    const broken = await withPageEdits("article-links", edits);
    const { status, output } = runGate("content", broken);
    assert.equal(status, niva || ashlands ? 1 : 0, output);
    if (niva) {
      assert.match(output, /FAIL {2}index\.html: nivå entry links its article \(\/blog\/lessons-from-building-niva\/\) through a\.app-action labelled "Article →", second in its action row/);
      assert.match(output, /FAIL {2}index\.html: nivå entry has two links, its public page and its article, and no other/);
    } else {
      assert.match(output, cardArticleLine("index.html", "nivå", "/blog/lessons-from-building-niva/", "Article"));
    }
    if (ashlands) {
      assert.match(output, /FAIL {2}index\.html: Ashlands entry links its article \(\/blog\/ashlands-what-one-prompt-built\/\) through a\.app-action labelled "Article →", second in its action row/);
      assert.match(output, /FAIL {2}sv\/index\.html: Ashlands entry links its article \(\/sv\/blog\/ashlands-what-one-prompt-built\/\) through a\.app-action labelled "Artikel →", second in its action row/);
    } else {
      assert.match(output, cardArticleLine("index.html", "Ashlands", "/blog/ashlands-what-one-prompt-built/", "Article"));
      assert.match(output, cardArticleLine("sv/index.html", "Ashlands", "/sv/blog/ashlands-what-one-prompt-built/", "Artikel"));
    }
    // The link beside each of them is untouched and still passes.
    assert.match(output, /ok {4}index\.html: Ashlands entry links its repository \(https:\/\/github\.com\/addable-labs\/ashlands\) through a\.app-action labelled "Repository ↗", first in its action row/);
  });

  it("fails when the hero's primary CTA no longer points at the apps section (REQ-009 as amended by founder feedback round 1, si-yp2x)", async () => {
    const broken = await withLandingEdit("primary-mailto", (html) => html.replace('<a class="button button-primary" href="#apps">See what we have built', '<a class="button button-primary" href="mailto:hello@addablelabs.se?subject=Start%20a%20project">See what we have built'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: primary CTA is "See what we have built" linking #apps/);
  });

  it("fails when the secondary CTA still asks for early access while site.nivaUrl is set (REQ-009; si-gyc4)", async () => {
    const broken = await withLandingEdit("niva-early", (html) => html.replace('href="https://erniva.se/">nivå</a>', 'href="mailto:hello@addablelabs.se?subject=Early%20access%20to%20niv%C3%A5">Get early access to nivå</a>'));
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: secondary CTA links site\.nivaUrl \(https:\/\/erniva\.se\/\) as "nivå"/);
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

  it("counts the prose only: table cells do not count either", async () => {
    // 400 words in a table's cells would push the seed article past 600 if
    // they counted, as the same words in a <p> do.
    const copy = await copyDir(built, path.join(tmp.dir, "seed-table"));
    const page = path.join(copy, "blog", "how-this-site-was-built-by-agents", "index.html");
    const html = await readFile(page, "utf8");
    const padded = html.replace('<div class="article-body">', `<div class="article-body"><div class="table-scroll"><table><thead><tr><th>${"heading ".repeat(100).trim()}</th></tr></thead><tbody><tr><td>${"cell ".repeat(300).trim()}</td></tr></tbody></table></div>`);
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
    // The band's first card points back at the page itself. The band lists
    // the newest other articles, so which one comes first changes whenever
    // an article is added: the edit takes the first card, whatever it links.
    const self = firstHtml.replace(/(class="post-title"[^>]*><a href=")[^"]+"/, "$1/blog/how-this-site-was-built-by-agents/\"");
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

  it("passes on the real build, every category page listing exactly the listed articles of its category, newest first, in both languages (si-thf3)", async () => {
    const { status, output } = runGate("content", built, undefined, { CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    // One line for each category of the data file, so a new category is
    // checked without a change here.
    const categories = JSON.parse(await readFile(path.join(SRC, "_data", "categories.json"), "utf8"));
    for (const [prefix, lang] of [["", "en"], ["sv/", "sv"]]) {
      for (const { key } of categories) {
        assert.match(output, new RegExp(`^ok {4}${prefix}blog/${key}/index\\.html: lists exactly the listed ${lang} articles of ${key}, newest first \\(`, "m"));
      }
    }
  });

  it("fails both category pages when an article is listed under the other category, in both languages (si-thf3)", async () => {
    await moveAcrossCategories(await copyDir(built, path.join(tmp.dir, "category-moved")), SRC);
  });

  it("fails a category page that lists its own articles in another order than newest first (si-thf3)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "category-order"));
    const file = path.join(copy, "sv", "blog", "ai-journey", "index.html");
    const [newest, next] = await listed(copy, "sv", "blog", "ai-journey", "index.html");
    // The first two cards trade places, whatever they link.
    const html = await readFile(file, "utf8");
    const [first, second] = cards(html);
    assert.ok(second !== undefined, "the page must list two articles");
    await writeFile(file, html.replace(first, () => "\u0000").replace(second, () => first).replace("\u0000", () => second));
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    assert.match(output, new RegExp(`^FAIL {2}sv/blog/ai-journey/index\\.html: lists exactly the listed sv articles of ai-journey, newest first \\(${newest}, ${next}[,)].* — in another order: ${next}, ${newest}(, |$)`, "m"));
  });

  // The blog index and the landing page of each language, with the rule the
  // gate's one line for the page states (si-absd): the index lists every
  // listed article of its language, newest first, and the landing page's
  // latest-writing section the first three of them.
  const LIST_LINES = [
    { page: ["blog", "index.html"], rule: "lists exactly the listed en articles, newest first" },
    { page: ["sv", "blog", "index.html"], rule: "lists exactly the listed sv articles, newest first" },
    { page: ["index.html"], rule: "latest-writing section lists the newest three listed en articles, newest first" },
    { page: ["sv", "index.html"], rule: "latest-writing section lists the newest three listed sv articles, newest first" },
  ];

  it("passes on the real build, each blog index listing exactly the listed articles of its language, newest first, and each landing page the first three of them (si-absd)", () => {
    const { status, output } = runGate("content", built, undefined, { CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    for (const [prefix, lang] of [["", "en"], ["sv/", "sv"]]) {
      const index = new RegExp(`^ok {4}${prefix}blog/index\\.html: lists exactly the listed ${lang} articles, newest first \\(([^)]+)\\)`, "m").exec(output);
      assert.ok(index, `${prefix}blog/index.html: the line must be printed`);
      const three = index[1].split(", ").slice(0, 3).join(", ");
      assert.match(output, new RegExp(`^ok {4}${prefix}index\\.html: latest-writing section lists the newest three listed ${lang} articles, newest first \\(${three}\\)`, "m"));
    }
  });

  it("fails a blog index or a landing page whose first two cards trade places, in both languages (si-absd)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "listing-order"));
    const expected = [];
    for (const listing of LIST_LINES) {
      const [newest, next, ...rest] = await listed(copy, ...listing.page);
      // The first two cards trade places, whatever they link.
      const file = path.join(copy, ...listing.page);
      const html = await readFile(file, "utf8");
      const [first, second] = cards(html);
      assert.ok(second !== undefined, `${listing.page.join("/")}: the page must list two articles`);
      await writeFile(file, html.replace(first, () => "\u0000").replace(second, () => first).replace("\u0000", () => second));
      expected.push(failLine(listing, [newest, next, ...rest], `in another order: ${[next, newest, ...rest].join(", ")}`));
    }
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    for (const line of expected) assert.match(output, line);
  });

  it("fails a blog index or a landing page that lists a card too many, in both languages (si-absd)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "listing-extra"));
    // After its last card, each blog index gets the first card of the other
    // language's index, and each landing page the fourth card of its own
    // language's index: the next article, one too many. Whatever they link.
    const extras = {
      "blog/index.html": [["sv", "blog", "index.html"], 0, "(not a en article)"],
      "sv/blog/index.html": [["blog", "index.html"], 0, "(not a sv article)"],
      "index.html": [["blog", "index.html"], 3, "(not one of the newest three)"],
      "sv/index.html": [["sv", "blog", "index.html"], 3, "(not one of the newest three)"],
    };
    const expected = [];
    for (const listing of LIST_LINES) {
      const [from, position, why] = extras[listing.page.join("/")];
      const href = (await listed(built, ...from))[position];
      const card = cards(await readFile(path.join(built, ...from), "utf8"))[position];
      assert.ok(card?.includes(`href="${href}"`), `${from.join("/")}: card ${position + 1} must be found`);
      const want = await listed(copy, ...listing.page);
      const file = path.join(copy, ...listing.page);
      const html = await readFile(file, "utf8");
      const last = cards(html).at(-1);
      await writeFile(file, html.replace(last, () => `${last}\n    ${card}`));
      expected.push(failLine(listing, want, `extra: ${href} ${why}`));
    }
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    for (const line of expected) assert.match(output, line);
  });

  it("fails a blog index or a landing page that misses a card, in both languages (si-absd)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "listing-missing"));
    const expected = [];
    for (const listing of LIST_LINES) {
      const want = await listed(copy, ...listing.page);
      // The first card goes, whatever it links: the newest article.
      const file = path.join(copy, ...listing.page);
      const html = await readFile(file, "utf8");
      const [first] = cards(html);
      await writeFile(file, html.replace(first, ""));
      expected.push(failLine(listing, want, `missing: ${want[0]}`));
    }
    const { status, output } = runGate("content", copy);
    assert.equal(status, 1);
    for (const line of expected) assert.match(output, line);
    // Those lines and no other: a card missing from a blog index is one
    // problem, not a second one for the article as well (si-eieu).
    assert.match(output, new RegExp(`^FAIL content \\(${expected.length} problems\\)$`, "m"));
  });

  it("fails when a later article grows past 1,500 English words (the series ceiling, si-xcpc)", async () => {
    const broken = await withPaddedArticle("series-long", "why-we-run-an-agent-run-factory", 600);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}blog\/why-we-run-an-agent-run-factory\/index\.html: \d+ words \(300–1500\)/);
  });

  it("fails a link preview that shows another page's image, a card without its article's image, and an article image that is lazy, above the title or described otherwise (si-awlu)", async () => {
    const other = (card) => card.replace(/\/blog\/[a-z0-9-]+\/cover/g, "/blog/how-this-site-was-built-by-agents/cover");
    const broken = await withPageEdits("images", {
      // The landing page shares an article's image, and an article the default.
      "index.html": (html) => html.replace('<meta property="og:image" content="https://addablelabs.se/assets/img/share.png">', '<meta property="og:image" content="https://addablelabs.se/blog/ashlands-what-one-prompt-built/cover.png">'),
      "blog/lessons-from-building-niva/index.html": (html) => html.replace(/(<meta property="og:image" content=")[^"]*"/, "$1https://addablelabs.se/assets/img/share.png\""),
      // The first card of the Swedish index shows another article's image,
      // and the first card of the English index describes its image.
      "sv/blog/index.html": (html) => html.replace(cards(html)[0], other(cards(html)[0])),
      "blog/index.html": (html) => html.replace('alt=""', 'alt="A picture"'),
      // One article's image loads lazily, one's is described otherwise and
      // one's stands above the title.
      "blog/why-we-run-an-agent-run-factory/index.html": (html) => html.replace(' fetchpriority="high">', ' loading="lazy">'),
      "sv/blog/how-this-site-was-built-by-agents/index.html": (html) => html.replace(/(<img class="article-image"[^>]* alt=")[^"]*"/, '$1En bild"'),
      "sv/blog/ashlands-what-one-prompt-built/index.html": (html) => {
        const [image] = /\n\s*<img class="article-image"[^>]*>/.exec(html);
        return html.replace(image, "").replace("<h1 ", `${image.trim()}\n    <h1 `);
      },
    });
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /^FAIL {2}index\.html: its link preview shows https:\/\/addablelabs\.se\/blog\/ashlands-what-one-prompt-built\/cover\.png, described as "The Addable Labs logo[^"]*", not the site's default image, https:\/\/addablelabs\.se\/assets\/img\/share\.png, described as "The Addable Labs logo[^"]*"$/m);
    assert.match(output, /^FAIL {2}blog\/lessons-from-building-niva\/index\.html: its link preview shows https:\/\/addablelabs\.se\/assets\/img\/share\.png, described as "Five statements[^"]*", not its article's image, https:\/\/addablelabs\.se\/blog\/lessons-from-building-niva\/cover\.png, described as "Five statements[^"]*"$/m);
    assert.match(output, /^FAIL {2}sv\/blog\/index\.html: the card for \/sv\/blog\/[a-z0-9-]+\/ shows \/blog\/how-this-site-was-built-by-agents\/cover-600\.webp, \/blog\/how-this-site-was-built-by-agents\/cover-1200\.webp with alt="", not its article's image alone with alt=""$/m);
    assert.match(output, /^FAIL {2}blog\/index\.html: the card for \/blog\/[a-z0-9-]+\/ shows [^\n]* with alt="A picture", not its article's image alone with alt=""$/m);
    assert.match(output, /^FAIL {2}every page's link preview shows its own image/m);
    assert.match(output, /^FAIL {2}every article card shows its article's image with alt="" \(\d+ cards\)$/m);
    for (const page of ["blog/why-we-run-an-agent-run-factory", "sv/blog/how-this-site-was-built-by-agents", "sv/blog/ashlands-what-one-prompt-built"]) {
      const slug = page.split("/").at(-1);
      assert.match(output, new RegExp(`^FAIL {2}${page}/index\\.html: shows its image, /blog/${slug}/, under its summary, described as its imageAlt and loaded at once$`, "m"), page);
    }
    assert.match(output, /^ok {4}sv\/blog\/why-we-run-an-agent-run-factory\/index\.html: shows its image/m, "the untouched Swedish page passes");
  });

  it("fails a GitHub repository that is not one of the public ones the site may link, in a page and in a feed (si-vwu8)", async () => {
    // A made-up repository: the rule is an allow-list, so any repository it
    // does not list is refused and the test needs no real private one.
    const broken = await withLandingEdit("private-link", (html) => html.replace("</main>", '<a href="https://github.com/example-org/private-app">A private app</a></main>'));
    const feed = path.join(broken, "feed.xml");
    const xml = await readFile(feed, "utf8");
    const linked = xml.replace("</channel>", "<item><title>A private app</title><link>https://github.com/example-org/private-app</link></item></channel>");
    assert.notEqual(linked, xml, "the feed's channel must be found");
    await writeFile(feed, linked);
    const { status, output } = runGate("content", broken);
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: names github\.com\/example-org\/private-app, which is not one of the public repositories the site may link \(PUBLIC_REPOS in scripts\/lib\/apps\.mjs\)/);
    assert.match(output, /FAIL {2}feed\.xml: names github\.com\/example-org\/private-app, which is not one of the public repositories the site may link/);
  });
});

// Scheduled articles (founder ask 2026-09-22, si-gxyg): an article dated after
// today is built at its real URL but listed nowhere until the day it is dated,
// so articles can be prepared in advance. The cases build a copy of src/ with
// three extra articles — one dated tomorrow in each category, one dated
// today — so the real tree carries no fixture of its own, and compare that
// build with one of the real tree.
// The blog index of the real tree, newest first, as it stands today, in a
// development build — where every article is present, drafts included: an
// exclusion must neither reorder nor drop anything else. A draft of the tree's
// own is listed here like any other article; the production order below
// leaves it out, and the cases below write the fixture drafts they need. Add
// a line when an article is added, with its date: an article of the real tree
// can be scheduled too (nivå until 2026-09-23, si-gyc4), and it joins the
// index on its day — the daily rebuild runs this suite on every one of them.
// The content gate holds each blog index to the order it works out from the
// same front matter the build reads (si-absd), so an article whose date
// changes moves in both alike: only this table, written by hand, notices.
const ARTICLES = [
  ["/blog/cleaning-up-gaimer/", "2026-09-26"],
  ["/blog/what-the-mayors-context-costs/", "2026-09-25"],
  ["/blog/lessons-from-building-niva/", "2026-09-23"],
  ["/blog/ashlands-what-one-prompt-built/", "2026-09-22"],
  ["/blog/why-we-run-an-agent-run-factory/", "2026-09-21"],
  ["/blog/how-this-site-was-built-by-agents/", "2026-09-20"],
];
const EN_ORDER = ARTICLES.filter(([, date]) => !isScheduled(date, NOW)).map(([url]) => url);
const SV_ORDER = EN_ORDER.map((url) => `/sv${url}`);
// The production build leaves the tree's own drafts out as well (si-mzf1).
// Which articles are drafts is read from their front matter, so publishing
// one — draft: false in both files — needs no change here.
const DRAFTS = new Set((await readArticleSources(SRC, await loadSite(SRC), "en")).filter((article) => article.draft).map((article) => article.path));
const EN_PUBLISHED = EN_ORDER.filter((url) => !DRAFTS.has(url));
const SV_PUBLISHED = EN_PUBLISHED.map((url) => `/sv${url}`);

// An app card links the article its entry names only while the build lists
// it (si-3hpa). Each case that expects a card of the real tree to link its
// article, or to link none, asks first whether the build lists the article
// today, as EN_ORDER does: by the date ARTICLES gives it, against this file's
// NOW (si-x0js). The card of an article dated after today, perhaps the next
// article a card links, then fails no case before its day, and every case
// expects the link from that day on.

/**
 * Does a build list the real article at `url` today? `url` is its English
 * or its Swedish URL, and `production` asks about the published build, which
 * leaves the drafts out as well.
 */
function listedToday(url, { production = false } = {}) {
  return (production ? EN_PUBLISHED : EN_ORDER).includes(url.replace(/^\/sv\//, "/"));
}

/** The date ARTICLES gives the real article at `url`, its English or its Swedish URL. */
function articleDate(url) {
  const row = ARTICLES.find(([path]) => path === url.replace(/^\/sv\//, "/"));
  assert.ok(row, `${url} has no row in ARTICLES`);
  return row[1];
}

/**
 * The content gate's ok line for the article link of the app card `name` on
 * the landing page `page` of a development build, whose entry names the
 * article at `url` (si-3hpa): its `label →` action, second in the card's
 * action row, or, while the article is dated after today, no link to it at
 * all. `date` is the one ARTICLES gives the article unless the case names one.
 */
function cardArticleLine(page, name, url, label, date = articleDate(url)) {
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const line = isScheduled(date, NOW)
    ? `${page}: ${name} entry does not link its article ${url} before ${date}`
    : `${page}: ${name} entry links its article (${url}) through a.app-action labelled "${label} →", second in its action row`;
  return new RegExp(`^ok {4}${escape(line)}`, "m");
}

/** Write one article, both languages, into a copy of the project; `linkTo` links another article's slug from the body. */
async function writeArticlePair(project, slug, date, enTitle, svTitle, { draft = false, linkTo, category = "app-development" } = {}) {
  for (const [lang, title] of [["en", enTitle], ["sv", svTitle]]) {
    const frontMatter = ["---", `title: ${title}`, `description: ${title}, one sentence.`, ...IMAGE_FRONT_MATTER, `date: ${date}`, `category: ${category}`, `translationKey: ${slug}`, `draft: ${draft}`, "aiGenerated: true", "humanReviewed: true", "---"];
    const link = linkTo ? `\n\nIt links [another article](${lang === "en" ? "" : `/${lang}`}/blog/${linkTo}/).` : "";
    // A body long enough to clear the content gate's 300-word floor, so the
    // gates can run against this build as they do against the real one.
    const body = `The body of ${title}.${link}\n\n${"One sentence of filler prose, written only to give this fixture article its words. ".repeat(30)}`;
    await writeFile(path.join(project, "src", lang, "blog", "posts", `${slug}.md`), `${frontMatter.join("\n")}\n\n${body}\n`);
  }
  await writeArticleImage(project, slug);
}

/** The article URLs of a built listing page, in the order it lists them. */
async function listed(out, ...parts) {
  const html = await readFile(path.join(out, ...parts), "utf8");
  // The heading carries an id from the IdAttributePlugin.
  return [...html.matchAll(/class="post-title"[^>]*><a href="([^"]+)"/g)].map(([, url]) => url);
}

/** The .post cards of a listing page's HTML, in the order it lists them, each its <li> element. */
function cards(html) {
  return html.match(/<li class="post[^"]*">[\s\S]*?<\/li>/g) ?? [];
}

/**
 * The gate's whole FAIL line for a listing page — a blog index, a landing
 * page's newest three or a category page (si-eieu): its rule, the list it
 * must show and what it gets wrong. An article the page leaves out, dated
 * after today or a draft of the production build, is named between the two
 * (", not /blog/x/ before …"); the real tree can carry one on any day, so the
 * line matches with that part and without it.
 */
function failLine({ page, rule }, want, problem) {
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escape(`FAIL  ${page.join("/")}: ${rule} (${want.join(", ")})`)}(, not .*)? — ${escape(problem)}$`, "m");
}

/**
 * Move a card to the other category's page in `copy`, a copy of a build, and
 * run the content gate on it with the source tree `src` (si-thf3): the first
 * card of the English ai-journey page goes to the English app-development
 * page, and the first card of the Swedish app-development page to the Swedish
 * ai-journey page, whatever they link, as if the build had filed each article
 * under the wrong category. Each page then fails, naming the article extra on
 * the one and missing from the other. Returns the gate's output.
 */
async function moveAcrossCategories(copy, src) {
  const expected = [];
  for (const [lang, dir, from, to] of [["en", ["blog"], "ai-journey", "app-development"], ["sv", ["sv", "blog"], "app-development", "ai-journey"]]) {
    const want = { [from]: await listed(copy, ...dir, from, "index.html"), [to]: await listed(copy, ...dir, to, "index.html") };
    const [href] = want[from];
    const fromFile = path.join(copy, ...dir, from, "index.html");
    const fromHtml = await readFile(fromFile, "utf8");
    const [card] = cards(fromHtml);
    assert.ok(card?.includes(`href="${href}"`), `${lang} ${from}: the first card must be found`);
    await writeFile(fromFile, fromHtml.replace(card, ""));
    const toFile = path.join(copy, ...dir, to, "index.html");
    const toHtml = await readFile(toFile, "utf8");
    const edited = toHtml.replace('<ol class="post-list">', (list) => `${list}\n    ${card}`);
    assert.notEqual(edited, toHtml, `${lang} ${to}: the list must be found`);
    await writeFile(toFile, edited);
    const line = (key, problem) => failLine({ page: [...dir, key, "index.html"], rule: `lists exactly the listed ${lang} articles of ${key}, newest first` }, want[key], problem);
    expected.push(line(to, `extra: ${href} (category ${from})`), line(from, `missing: ${href}`));
  }
  const { status, output } = runGate("content", copy, src);
  assert.equal(status, 1);
  for (const line of expected) assert.match(output, line);
  return output;
}

describe("scheduled posts", () => {
  let tmp;
  let built; // the build of the copy that carries the three extra articles
  let builtSrc; // that copy's source tree, for the gates
  let real; // the repository's own tree, for the order comparison
  before(async () => {
    tmp = await tempDir("scheduled-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    builtSrc = path.join(project, "src");
    await writeArticlePair(project, "scheduled-tomorrow", utcDate(1), "Dated tomorrow", "Daterad i morgon");
    // The one dated today links the one dated tomorrow, as the factory
    // article links the nivå article the day before it is listed (si-gyc4):
    // unlisted, not secret, so the link is allowed and the feeds carry it in
    // the item's content.
    await writeArticlePair(project, "published-today", utcDate(0), "Dated today", "Daterad i dag", { linkTo: "scheduled-tomorrow" });
    // One of the other category dated tomorrow as well, so that each category
    // page has an article to name as not listed yet (si-eieu).
    await writeArticlePair(project, "journey-tomorrow", utcDate(1), "Journey dated tomorrow", "Resa daterad i morgon", { category: "ai-journey" });
    built = buildSite(path.join(tmp.dir, "site"), {}, project);
    real = buildSite(path.join(tmp.dir, "real"));
  });
  after(() => tmp.cleanup());

  it("lists neither language of an article dated tomorrow, and does list one dated today", async () => {
    // The blog index of each language, the category page of the one dated
    // today and the landing page's newest three.
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
      // No item for it; the article dated today links it in its content.
      assert.doesNotMatch(xml, /<link>[^<]*\/scheduled-tomorrow\/<\/link>/, feed.join("/"));
      assert.match(xml, /href=&quot;https:\/\/addablelabs\.se\/(sv\/)?blog\/scheduled-tomorrow\/&quot;/, `${feed.join("/")}: the link in the content`);
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
    assert.match(content.output, /ok {4}sv feed has no item for scheduled-tomorrow before \d{4}-\d{2}-\d{2}/);
    // The category page of the one dated today lists it and names the one of
    // its category dated tomorrow as not listed yet (si-thf3).
    assert.match(content.output, /ok {4}sv\/blog\/app-development\/index\.html: lists exactly the listed sv articles of app-development, newest first \([^)]*\/sv\/blog\/published-today\/[^)]*\), not [^\n]*\/sv\/blog\/scheduled-tomorrow\/ before \d{4}-\d{2}-\d{2}/);
    // So do the blog index and the landing page's newest three (si-absd).
    assert.match(content.output, /ok {4}blog\/index\.html: lists exactly the listed en articles, newest first \([^)]*\/blog\/published-today\/[^)]*\), not [^\n]*\/blog\/scheduled-tomorrow\/ before \d{4}-\d{2}-\d{2}/);
    assert.match(content.output, /ok {4}sv\/index\.html: latest-writing section lists the newest three listed sv articles, newest first \([^)]*\/sv\/blog\/published-today\/[^)]*\), not [^\n]*\/sv\/blog\/scheduled-tomorrow\/ before \d{4}-\d{2}-\d{2}/);
  });

  it("fails a blog index and a landing page that list an article dated after today (si-absd)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "listing-scheduled"));
    // A card for the article dated tomorrow before the first card of the
    // English blog index and of the Swedish landing page, where the newest
    // article goes: the card of the one dated today, pointed at it, its link
    // and its image (si-awlu).
    for (const [page, prefix] of [[["blog", "index.html"], ""], [["sv", "index.html"], "/sv"]]) {
      const file = path.join(copy, ...page);
      const html = await readFile(file, "utf8");
      const [card] = cards(html).filter((item) => item.includes(`href="${prefix}/blog/published-today/"`));
      assert.ok(card, `${page.join("/")}: the card of the article dated today must be found`);
      const [first] = cards(html);
      await writeFile(file, html.replace(first, () => `${card.replaceAll("/blog/published-today/", "/blog/scheduled-tomorrow/")}\n    ${first}`));
    }
    const { status, output } = runGate("content", copy, builtSrc);
    assert.equal(status, 1);
    // The articles the page leaves out are named in file order, the fixture's
    // among any of the real tree's (si-eieu).
    assert.match(output, new RegExp(`^FAIL {2}blog/index\\.html: lists exactly the listed en articles, newest first \\(.*\\), not (.*, )?/blog/scheduled-tomorrow/ before ${utcDate(1)}(, .*)? — extra: /blog/scheduled-tomorrow/ before ${utcDate(1)}$`, "m"));
    assert.match(output, new RegExp(`^FAIL {2}sv/index\\.html: latest-writing section lists the newest three listed sv articles, newest first \\(.*\\), not (.*, )?/sv/blog/scheduled-tomorrow/ before ${utcDate(1)}(, .*)? — extra: /sv/blog/scheduled-tomorrow/ before ${utcDate(1)}$`, "m"));
    // Those two lines and no other: a card on a blog index for an article
    // dated after today is one problem, not a second one for the article as
    // well (si-eieu).
    assert.match(output, /^FAIL content \(2 problems\)$/m);
  });

  it("fails a category page that lists an article dated after today (si-thf3)", async () => {
    const copy = await copyDir(built, path.join(tmp.dir, "category-scheduled"));
    const file = path.join(copy, "blog", "app-development", "index.html");
    const html = await readFile(file, "utf8");
    // A card for the article dated tomorrow, after the card of the one dated
    // today: that card, pointed at it, its link and its image (si-awlu).
    const [card] = cards(html).filter((item) => item.includes('href="/blog/published-today/"'));
    assert.ok(card, "the card of the article dated today must be found");
    await writeFile(file, html.replace(card, () => `${card}\n    ${card.replaceAll("/blog/published-today/", "/blog/scheduled-tomorrow/")}`));
    const { status, output } = runGate("content", copy, builtSrc);
    assert.equal(status, 1);
    assert.match(output, new RegExp(`^FAIL {2}blog/app-development/index\\.html: lists exactly the listed en articles of app-development, newest first \\(.*\\), not (.*, )?/blog/scheduled-tomorrow/ before ${utcDate(1)}(, .*)? — extra: /blog/scheduled-tomorrow/ before ${utcDate(1)}$`, "m"));
  });

  it("still fails both category pages when an article is listed under the other category while each category has an article dated after today (si-eieu)", async () => {
    // The content gate's case on the real build, on this one. Each of its four
    // lines now names the article of its category dated tomorrow between its
    // list and what the page gets wrong, as the lines of the real build do on
    // any day the real tree carries such an article. The case expected the
    // problem right after the list, so an ai-journey article dated after
    // today failed it, and with it the daily rebuild. The real tree's own
    // such articles are named beside the fixture's, in file order.
    const output = await moveAcrossCategories(await copyDir(built, path.join(tmp.dir, "category-moved")), builtSrc);
    for (const [page, href] of [["blog/app-development", "/blog/scheduled-tomorrow/"], ["blog/ai-journey", "/blog/journey-tomorrow/"], ["sv/blog/ai-journey", "/sv/blog/journey-tomorrow/"], ["sv/blog/app-development", "/sv/blog/scheduled-tomorrow/"]]) {
      assert.match(output, new RegExp(`^FAIL {2}${page}/index\\.html: .*, not (.*, )?${href} before ${utcDate(1)}(, .*)? — `, "m"));
    }
  });

  it("leaves the order of the articles that are listed unchanged", async () => {
    assert.deepEqual(await listed(real, "blog", "index.html"), EN_ORDER);
    assert.deepEqual(await listed(real, "sv", "blog", "index.html"), SV_ORDER);
    // The same order inside the build that also carries the three extra
    // articles: the one dated today takes its place among them by date, the
    // two dated tomorrow are not there, and nothing else moves.
    assert.deepEqual((await listed(built, "blog", "index.html")).filter((url) => !url.endsWith("-today/")), EN_ORDER);
    assert.deepEqual((await listed(built, "sv", "blog", "index.html")).filter((url) => !url.endsWith("-today/")), SV_ORDER);
  });
});

// One moment for everything a run starts (si-nka4). The build and each gate
// take the day in a process of their own, and so do the builds a test
// compares, so a run that began a moment before 00:00 UTC on the eve of an
// article's date built the site once without the article listed and once
// with it, or built it without and then ran gates that expected it listed.
// Each test file now pins one moment, its NOW, for every build and gate it
// starts (tests/helpers.mjs), and `pnpm check` pins one for its own
// (tests/check.test.mjs). The cases build a copy of the project that carries
// an article dated tomorrow, on clocks stopped half a second either side of
// the midnight that begins it (tests/fixtures/clock.mjs), and run gates after
// that midnight on the build made before it — once taking this file's NOW,
// as every build and gate here does, and once on their clocks alone. The
// clocks stand still (si-0xjb): the CI runner took longer than half a second
// to reach its first read of the clock, and one that ran on from before
// midnight had passed it by then.
describe("builds and gates a second apart across 00:00 UTC", () => {
  const midnight = Date.parse(`${utcDate(1)}T00:00:00Z`);
  const BEFORE = new Date(midnight - 500).toISOString();
  const AFTER = new Date(midnight + 500).toISOString();
  let tmp;
  let builtSrc; // the copy's source tree, for the gates
  const built = {};
  before(async () => {
    tmp = await tempDir("midnight-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    builtSrc = path.join(project, "src");
    await writeArticlePair(project, "after-midnight", utcDate(1), "Dated after midnight", "Daterad efter midnatt");
    // An empty SITE_NOW leaves a build to its clock, as before si-nka4.
    for (const [name, env] of [["before", clockAt(BEFORE)], ["after", clockAt(AFTER)], ["before-unpinned", { ...clockAt(BEFORE), SITE_NOW: "" }], ["after-unpinned", { ...clockAt(AFTER), SITE_NOW: "" }]]) {
      built[name] = buildSite(path.join(tmp.dir, name), env, project);
    }
  });
  after(() => tmp.cleanup());

  /** The files that differ between two built sites, and those only one of them has. */
  async function differingFiles(one, other) {
    const names = new Set();
    for (const out of [one, other]) for (const file of await walk(out)) names.add(path.relative(out, file));
    const differing = [];
    for (const name of [...names].sort()) {
      const [these, those] = await Promise.all([one, other].map((out) => readFile(path.join(out, name)).catch(() => null)));
      if (these === null || those === null || !these.equals(those)) differing.push(name);
    }
    return differing;
  }

  const INDEXES = [[["blog", "index.html"], ""], [["sv", "blog", "index.html"], "/sv"]];

  it("keeps each clock at its instant however long the process runs, so a slow build or gate still asks on its own side of midnight", async () => {
    // A process that reads its clock a second after it starts: twice the half
    // second the clocks leave on either side of midnight.
    const read = "setTimeout(() => console.log(JSON.stringify([new Date(), Date.now(), Date()])), 1000)";
    await Promise.all([BEFORE, AFTER].map(async (instant) => {
      const { stdout } = await promisify(execFile)(process.execPath, ["-e", read], { env: { ...process.env, ...clockAt(instant) } });
      assert.deepEqual(JSON.parse(stdout), [instant, Date.parse(instant), new Date(instant).toString()], instant);
    }));
  });

  it("builds the same site on either side of midnight when both builds take this file's moment, listing the article dated tomorrow in neither", async () => {
    assert.deepEqual(await differingFiles(built.before, built.after), []);
    for (const [page, prefix] of INDEXES) {
      assert.equal((await listed(built.after, ...page)).includes(`${prefix}/blog/after-midnight/`), false, page.join("/"));
    }
  });

  it("builds two different sites on their clocks alone: one clock is before midnight, the other after it", async () => {
    for (const [page, prefix] of INDEXES) {
      assert.equal((await listed(built["before-unpinned"], ...page)).includes(`${prefix}/blog/after-midnight/`), false, page.join("/"));
      assert.equal((await listed(built["after-unpinned"], ...page)).includes(`${prefix}/blog/after-midnight/`), true, page.join("/"));
    }
  });

  it("passes the gates run after midnight on the build made before it, all taking this file's moment", () => {
    for (const gate of ["feeds", "content"]) {
      const { status, output } = runGate(gate, built.before, builtSrc, clockAt(AFTER));
      assert.equal(status, 0, `${gate}:\n${output}`);
    }
  });

  it("fails those gates on their clocks alone, each expecting the article that build does not list", () => {
    const feeds = runGate("feeds", built.before, builtSrc, { ...clockAt(AFTER), SITE_NOW: "" });
    assert.equal(feeds.status, 1, feeds.output);
    // Among any article of the real tree dated the same day.
    assert.match(feeds.output, /FAIL {2}feed\.xml: every listed en article appears \(missing: [^)]*\bafter-midnight\b[^)]*\)/);
    const content = runGate("content", built.before, builtSrc, { ...clockAt(AFTER), SITE_NOW: "" });
    assert.equal(content.status, 1, content.output);
    assert.match(content.output, /^FAIL {2}blog\/index\.html: lists exactly the listed en articles, newest first \([^\n]* — missing: [^\n]*\/blog\/after-midnight\//m);
  });
});

// One build across 00:00 UTC (si-vv7h). A build asks whether an article is
// scheduled once for every listing that can show it — each collection as the
// build gathers it, the sitemap as it renders — and each question used to
// read the clock, so one `pnpm build`, or one rebuild of `pnpm dev`, that ran
// across the midnight that begins an article's date could list the article
// on one page and not on another. A build now reads the clock once, as it
// starts, and every listing takes that moment (eleventy.config.js). The case
// builds a copy of the project that carries an article dated tomorrow, with
// SITE_NOW empty as in a build nobody pins, on a clock that passes that
// midnight halfway through the reads the build makes of it
// (tests/fixtures/clock.mjs). A first build of the same copy, on a clock that
// stands still, counts those reads.
describe("one build across 00:00 UTC", () => {
  const midnight = Date.parse(`${utcDate(1)}T00:00:00Z`);
  const BEFORE = new Date(midnight - 500).toISOString();
  const AFTER = new Date(midnight + 500).toISOString();
  let tmp;
  let built;
  let reads; // the instants the build read, in the order it read them
  before(async () => {
    tmp = await tempDir("one-build-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    await writeArticlePair(project, "after-midnight", utcDate(1), "Dated after midnight", "Daterad efter midnatt");
    /** Build the copy on a clock that starts at BEFORE; returns the build and the instants it read. */
    async function buildOnClock(name, clock) {
      const log = path.join(tmp.dir, `${name}.log`);
      const out = buildSite(path.join(tmp.dir, name), { ...clockAt(BEFORE), ...clock, TEST_CLOCK_LOG: log, SITE_NOW: "" }, project);
      return [out, (await readFile(log, "utf8")).split("\n").filter(Boolean)];
    }
    const [, counted] = await buildOnClock("counted", {});
    [built, reads] = await buildOnClock("site", { TEST_CLOCK_THEN: AFTER, TEST_CLOCK_READS: String(Math.floor(counted.length / 2)) });
  });
  after(() => tmp.cleanup());

  it("lists an article dated tomorrow on no page, feed or sitemap when the build's clock passes midnight halfway through the build: every listing takes the moment the build started", async () => {
    assert.deepEqual([reads[0], reads.at(-1)], [BEFORE, AFTER], "the build reads its clock before midnight first and after it last");
    // Each listing, and whether it lists the article in its language.
    const where = {};
    for (const page of [["blog", "index.html"], ["blog", "app-development", "index.html"], ["index.html"], ["sv", "blog", "index.html"], ["sv", "blog", "app-development", "index.html"], ["sv", "index.html"]]) {
      where[page.join("/")] = (await listed(built, ...page)).some((url) => url.endsWith("/blog/after-midnight/"));
    }
    for (const feed of [["feed.xml"], ["sv", "feed.xml"]]) {
      where[feed.join("/")] = /<link>[^<]*\/blog\/after-midnight\/<\/link>/.test(await readFile(path.join(built, ...feed), "utf8"));
    }
    const sitemap = await readFile(path.join(built, "sitemap.xml"), "utf8");
    for (const prefix of ["", "/sv"]) {
      where[`sitemap.xml ${prefix}/blog/after-midnight/`] = new RegExp(`<loc>https?://[^/<]+${prefix}/blog/after-midnight/</loc>`).test(sitemap);
    }
    assert.deepEqual(where, Object.fromEntries(Object.keys(where).map((listing) => [listing, false])));
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
    assert.match(devContent.output, /ok {4}en blog index entry for a-draft carries "Draft"/);
    const prodContent = runGate("content", prod, builtSrc, { SITE_ENV: "production" });
    assert.match(prodContent.output, /ok {4}blog\/a-draft\/index\.html is not built \(a draft, and this is the production build\)/);
    assert.match(prodContent.output, /ok {4}sv feed has no item for a-draft \(a draft, and this is the production build\)/);
    // The category page of the draft lists it in the local build and names it
    // as left out of the production one (si-thf3).
    assert.match(devContent.output, /ok {4}blog\/app-development\/index\.html: lists exactly the listed en articles of app-development, newest first \([^)]*\/blog\/a-draft\/[^)]*\)/);
    assert.match(prodContent.output, /ok {4}sv\/blog\/app-development\/index\.html: lists exactly the listed sv articles of app-development, newest first \([^)]*\/sv\/blog\/not-a-draft\/[^)]*\), not [^\n]*\/sv\/blog\/a-draft\/ \(a draft, and this is the production build\)/);
    // So do the blog index and the landing page's newest three (si-absd).
    assert.match(devContent.output, /ok {4}blog\/index\.html: lists exactly the listed en articles, newest first \([^)]*\/blog\/a-draft\/[^)]*\)/);
    assert.match(devContent.output, /ok {4}index\.html: latest-writing section lists the newest three listed en articles, newest first \([^)]*\/blog\/a-draft\/[^)]*\)/);
    assert.match(prodContent.output, /ok {4}blog\/index\.html: lists exactly the listed en articles, newest first \([^)]*\/blog\/not-a-draft\/[^)]*\), not [^\n]*\/blog\/a-draft\/ \(a draft, and this is the production build\)/);
    assert.match(prodContent.output, /ok {4}sv\/index\.html: latest-writing section lists the newest three listed sv articles, newest first \([^)]*\/sv\/blog\/not-a-draft\/[^)]*\), not [^\n]*\/sv\/blog\/a-draft\/ \(a draft, and this is the production build\)/);
    const prodFeeds = runGate("feeds", prod, builtSrc, { SITE_ENV: "production" });
    // The message names every article it expects to be absent — the fixture
    // draft and the repository's own.
    assert.match(prodFeeds.output, /ok {4}feed\.xml: no unlisted article \([^)]*\ba-draft is a draft\b[^)]*\)/);
  });

  it("leaves the order of the published articles unchanged in both builds", async () => {
    // Nothing else moves: the repository's own articles keep their order in
    // both builds, and the production one lacks only drafts — the fixture's
    // and any of the repository's own.
    const withoutFixtures = (urls) => urls.filter((url) => !url.endsWith("/a-draft/") && !url.endsWith("/not-a-draft/"));
    assert.deepEqual(withoutFixtures(await listed(dev, "blog", "index.html")), EN_ORDER);
    assert.deepEqual(withoutFixtures(await listed(prod, "blog", "index.html")), EN_PUBLISHED);
    assert.deepEqual(withoutFixtures(await listed(prod, "sv", "blog", "index.html")), SV_PUBLISHED);
  });
});

// App cards link the article about the app (founder request 2026-09-23,
// si-3hpa) only while the build lists it, by the same rules as every listing:
// a draft is linked in a local build, where it is listed, and not in the
// production build, where it does not exist; an article dated after today is
// linked by neither until its day. The cases point two entries of a copy of
// the project at two fixture articles — a draft dated today and an article
// dated tomorrow — and build the copy both ways.
describe("app card articles", () => {
  let tmp;
  let dev; // the development build: the draft is linked
  let prod; // the production build: it is not
  let builtSrc; // the source tree both were built from, for the gates
  before(async () => {
    tmp = await tempDir("app-articles-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    builtSrc = path.join(project, "src");
    await writeArticlePair(project, "app-draft", utcDate(0), "A draft about an app", "Ett utkast om en app", { draft: true });
    await writeArticlePair(project, "app-tomorrow", utcDate(1), "An app article for tomorrow", "En appartikel för i morgon");
    const file = path.join(builtSrc, "_data", "portfolio.json");
    const portfolio = JSON.parse(await readFile(file, "utf8"));
    portfolio.find((entry) => entry.key === "gaimer").article = "app-draft";
    portfolio.find((entry) => entry.key === "notesage").article = "app-tomorrow";
    await writeFile(file, JSON.stringify(portfolio, null, 2));
    dev = buildSite(path.join(tmp.dir, "dev"), { SITE_ENV: "" }, project);
    prod = buildSite(path.join(tmp.dir, "prod"), { SITE_ENV: "production" }, project);
  });
  after(() => tmp.cleanup());

  /** The hrefs of each app card's action row on a built landing page, by the app's name. */
  async function cardLinks(out, ...parts) {
    const html = await readFile(path.join(out, ...parts), "utf8");
    const cards = html.matchAll(/<h3 class="app-name portfolio-name"[^>]*>([^<]+)<\/h3>[\s\S]*?<div class="app-actions">([\s\S]*?)<\/div>/g);
    return Object.fromEntries([...cards].map(([, name, row]) => [name, [...row.matchAll(/href="([^"]+)"/g)].map(([, href]) => href)]));
  }

  const LANDINGS = [[["index.html"], ""], [["sv", "index.html"], "/sv"]];

  it("links an article from its card in a local build while it is listed, a draft included, and never one dated after today", async () => {
    // The real tree's Ashlands article, from the day it is dated (si-x0js).
    const ashlands = listedToday("/blog/ashlands-what-one-prompt-built/") ? ["/blog/ashlands-what-one-prompt-built/"] : [];
    for (const [page, prefix] of LANDINGS) {
      const links = await cardLinks(dev, ...page);
      assert.deepEqual(links.Gaimer, ["https://github.com/addable-labs/gaimer", `${prefix}/blog/app-draft/`], page.join("/"));
      assert.deepEqual(links.Notesage, ["https://github.com/PeterBlenessy/notesage"], page.join("/"));
      assert.deepEqual(links.Ashlands, ["https://github.com/addable-labs/ashlands", ...ashlands.map((url) => `${prefix}${url}`)], page.join("/"));
    }
  });

  it("links no draft from a card in the production build", async () => {
    // The real tree's nivå article, from the day it is dated and while it is
    // no draft (si-x0js).
    const niva = listedToday("/blog/lessons-from-building-niva/", { production: true }) ? ["/blog/lessons-from-building-niva/"] : [];
    for (const [page, prefix] of LANDINGS) {
      const links = await cardLinks(prod, ...page);
      assert.deepEqual(links.Gaimer, ["https://github.com/addable-labs/gaimer"], page.join("/"));
      assert.deepEqual(links.Notesage, ["https://github.com/PeterBlenessy/notesage"], page.join("/"));
      assert.deepEqual(links.nivå, ["https://erniva.se/", ...niva.map((url) => `${prefix}${url}`)], page.join("/"));
    }
  });

  it("expects the card of an article dated tomorrow to link it nowhere, as the cases on the real tree expect of theirs (si-x0js)", () => {
    // `cardArticleLine` is what those cases expect of a card whose article the
    // real tree dates; here it is handed the fixtures' dates, and the gate on
    // this build, where a card links an article of each, must say the same.
    const { status, output } = runGate("content", dev, builtSrc, { SITE_ENV: "", CHECK_QUIET: "0" });
    assert.equal(status, 0, output);
    for (const [page, prefix, label] of [["index.html", "", "Article"], ["sv/index.html", "/sv", "Artikel"]]) {
      const tomorrow = cardArticleLine(page, "Notesage", `${prefix}/blog/app-tomorrow/`, label, utcDate(1));
      assert.match(tomorrow.source, /does not link its article/, `${page}: an article dated tomorrow is expected unlinked`);
      assert.match(output, tomorrow);
      // Dated today, and a draft this development build lists: linked.
      assert.match(output, cardArticleLine(page, "Gaimer", `${prefix}/blog/app-draft/`, label, utcDate(0)));
    }
  });

  it("leaves the content and links gates passing in both modes, naming the article a card does not link and why", () => {
    for (const [out, env] of [[dev, ""], [prod, "production"]]) {
      for (const gate of ["content", "links"]) {
        const { status, output } = runGate(gate, out, builtSrc, { SITE_ENV: env });
        assert.equal(status, 0, `${gate} in ${env || "development"}:\n${output}`);
      }
    }
    const devContent = runGate("content", dev, builtSrc, { SITE_ENV: "", CHECK_QUIET: "0" });
    assert.match(devContent.output, /ok {4}index\.html: Gaimer entry links its article \(\/blog\/app-draft\/\) through a\.app-action labelled "Article →", second in its action row/);
    assert.match(devContent.output, /ok {4}sv\/index\.html: Notesage entry does not link its article \/sv\/blog\/app-tomorrow\/ before \d{4}-\d{2}-\d{2}/);
    const prodContent = runGate("content", prod, builtSrc, { SITE_ENV: "production", CHECK_QUIET: "0" });
    assert.match(prodContent.output, /ok {4}index\.html: Gaimer entry does not link its article \/blog\/app-draft\/ \(a draft, and this is the production build\)/);
    assert.match(prodContent.output, /ok {4}sv\/index\.html: Gaimer entry has one link, its repository, and no other/);
  });

  it("fails a card that links an article the build does not list", async () => {
    const leaked = await copyDir(prod, path.join(tmp.dir, "leaked"));
    const landing = path.join(leaked, "index.html");
    const html = await readFile(landing, "utf8");
    const edited = html.replace('href="https://github.com/addable-labs/gaimer">Repository<span class="arrow" aria-hidden="true">↗</span></a>', '$&<a class="app-action" href="/blog/app-draft/">Article<span class="arrow" aria-hidden="true">→</span></a>');
    assert.notEqual(edited, html, "the Gaimer card's repository link must be found");
    await writeFile(landing, edited);
    const { status, output } = runGate("content", leaked, builtSrc, { SITE_ENV: "production" });
    assert.equal(status, 1);
    assert.match(output, /FAIL {2}index\.html: Gaimer entry does not link its article \/blog\/app-draft\/ \(a draft, and this is the production build\)/);
    assert.match(output, /FAIL {2}index\.html: Gaimer entry has one link, its repository, and no other/);
  });
});
