#!/usr/bin/env node
// Gate: content (AC-06 … AC-13 of the first build; re-targeted to the Signal
// landing model by the redesign, REQ-024 as amended by A-01, AC-09 … AC-15).
// The load-bearing facts of the acceptance criteria, checked as queries over
// the built output:
//   - both landing pages: exactly one h1, inside the hero; the primary CTA
//     promotes the existing apps — a.button-primary in the hero links the
//     #apps section (founder feedback round 1, si-yp2x; before that it was a
//     mailto: with a subject); the secondary CTA honours site.nivaUrl (the
//     URL when set, otherwise an honest early-access mailto: with the
//     hero.nivaEarlyAccess label); three service headings equal to
//     the strings; the apps grid renders every data entry in order with its
//     name and status label — private entries without any link, public ones
//     with exactly one link to their repository; the trust section carries
//     the factory phrase, the founder's name, "AI-native", the article link
//     and the proof link and links nothing else named "factory"; at least two
//     latest-writing cards with category chips and the draft chip where due,
//     and the link to the blog index
//   - the about pages have the mission and approach sections, the founding
//     month ("September 2026" / "september 2026") and no founder section
//     (founder call 2026-09-22: a company page, not a personal one)
//   - every page's footer: mailto:hello@addablelabs.se with the address as
//     text, the LinkedIn entry as visible text with no href while
//     site.linkedinUrl is null and as a link once set, the language switch to
//     the counterpart path (footer and header), the appearance toggle and the
//     link to the page language's feed
//   - no GitHub links for private repositories; StockSight-AI and the factory
//     are absent everywhere
//   - both seed articles exist in both languages, the seed articles are
//     300–600 English words of prose and every later article 300–1,500 (the
//     figures' captions and diagram labels are not prose and do not count,
//     si-55iu), a draft shows "Draft"/"Utkast" on its page, in the listings
//     and in the feeds of a local build and has no page at all in the
//     production build (si-mzf1), an article dated after today is built but
//     listed nowhere (si-gxyg), and every article page ends with the "More
//     from the blog" band listing other articles of its language, never
//     itself (founder feedback 2026-09-22)
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import { attr, loadPage, text } from "../lib/html.mjs";
import { exists, internalPath, loadSite, loadStrings, readArticleSources, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const strings = await loadStrings(src, site);
// REQ-011 (AC-11): the apps grid is driven by the data file, so the gate
// reads the same entries the templates render.
const apps = JSON.parse(await readFile(path.join(src, "_data", "portfolio.json"), "utf8"));
const report = reporter("content");
const prefixOf = (lang) => (lang === site.languages.default ? "" : `/${lang}`);
const FOUNDER = "Peter Blenessy";
const MONTH = { en: "September 2026", sv: "september 2026" };
const FACTORY_PHRASE = { en: "agent-run software factory", sv: "agentdriven mjukvarufabrik" };
// REQ-012 (AC-13): "AI-native" or its Swedish rendering ("AI-nativt").
const AI_NATIVE = { en: "AI-native", sv: "AI-nativ" };
// REQ-009 (AC-09; plan D-11): while site.nivaUrl is null the secondary CTA is
// an early-access mailto: whose subject says so in the page's language.
const EARLY_ACCESS_SUBJECT = { en: /access/i, sv: /tillgång/i };
const ARTICLE_SLUG = "how-this-site-was-built-by-agents";
// REQ-006 (AC-11): the two seed articles are 300–600 English words. Later
// articles (the factory series, si-xcpc) get a floor against stubs and a
// ceiling for a readable post: 300–1,500.
const SEED_ARTICLES = new Set([ARTICLE_SLUG, "lessons-from-building-niva"]);
const WORD_RANGE = { seed: [300, 600], other: [300, 1500] };
// REQ-011 as amended by A-01: the private repositories of the curated six
// (marketdata-api and Compound join nivå — both left the grid in feedback
// round 1, si-yp2x, but stay private and unlinkable), the first build's
// private entries and the factory itself are never linked.
const PRIVATE_LINKS = ["github.com/addable-labs/niva", "github.com/PeterBlenessy/investable", "github.com/PeterBlenessy/StockSight", "github.com/PeterBlenessy/marketdata", "github.com/PeterBlenessy/portfolio-app", "addable-labs/factory"];
// A-01: StockSight-AI is not listed, so the first build's ban on the text stands.
const FORBIDDEN_TEXT = ["StockSight"];

async function page(relPath) {
  const file = path.join(out, relPath);
  if (!(await exists(file))) {
    report.fail(`${relPath} is missing`);
    return null;
  }
  return loadPage(file, out, site);
}

/** The subject of a mailto: href, decoded; "" when absent. */
function mailtoSubject(href) {
  try {
    return new URL(href).searchParams.get("subject") ?? "";
  } catch {
    return "";
  }
}

// Landing pages
for (const lang of site.languages.codes) {
  const rel = `${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}index.html`;
  const landing = await page(rel);
  if (!landing) continue;
  const prefix = prefixOf(lang);
  const doc = landing.doc;
  const hero = doc.querySelector(".hero");

  // REQ-009 (AC-09): the hero contains the page's only h1.
  report.check(doc.querySelectorAll("h1").length === 1 && hero?.querySelectorAll("h1").length === 1, `${rel}: exactly one h1, inside .hero`);
  // REQ-009 (AC-09; plan D-10) as amended by founder feedback round 1
  // (si-yp2x): the primary CTA promotes what exists — it is the hero's
  // a.button-primary, labelled hero.ctaPrimary, and links the apps section
  // (#apps, an id on the same page). Email stays the secondary CTA's and the
  // contact band's job.
  const primary = hero?.querySelector("a.button-primary");
  const primaryHref = attr(primary, "href") ?? "";
  // The button's text is the label plus the decorative, aria-hidden arrow.
  const primaryLabel = text(primary).replace(/→$/, "").trim();
  report.check(primary !== null && primary !== undefined && primaryHref === "#apps" && doc.querySelector("#apps") !== null && primaryLabel === strings[lang].hero.ctaPrimary, `${rel}: primary CTA is "${strings[lang].hero.ctaPrimary}" linking #apps`);
  // REQ-009 (AC-09; plan D-11): the secondary CTA honours site.nivaUrl.
  const secondary = hero?.querySelector("a.button-secondary");
  const secondaryHref = attr(secondary, "href") ?? "";
  if (site.nivaUrl) {
    report.check(secondary && secondaryHref === site.nivaUrl && text(secondary) === strings[lang].hero.nivaTry, `${rel}: secondary CTA links site.nivaUrl (${site.nivaUrl}) as "${strings[lang].hero.nivaTry}"`);
  } else {
    const honest = secondary && secondaryHref.startsWith("mailto:hello@addablelabs.se?subject=") && EARLY_ACCESS_SUBJECT[lang].test(mailtoSubject(secondaryHref)) && text(secondary) === strings[lang].hero.nivaEarlyAccess;
    report.check(honest, `${rel}: secondary CTA is an early-access mailto: labelled "${strings[lang].hero.nivaEarlyAccess}" while site.nivaUrl is null`);
  }

  // REQ-010 (AC-10): three service headings equal to the strings.
  const serviceHeadings = doc.querySelectorAll(".service h2, .service h3").map(text);
  report.check(serviceHeadings.length === 3, `${rel}: three service headings (${serviceHeadings.length})`);
  for (const key of ["ai-apps", "ai-adoption", "experiments"]) {
    const title = strings[lang].themes[key].title;
    report.check(serviceHeadings.includes(title), `${rel}: service heading "${title}"`);
  }

  // REQ-011 as amended by A-01 (AC-11): one card per data entry, in data
  // order, with the strings name and status label; private entries carry no
  // link at all, public ones exactly one a.app-action to their repository.
  const entries = doc.querySelectorAll(".portfolio-entry");
  report.check(entries.length === apps.length, `${rel}: apps grid renders one entry per data entry (${entries.length} of ${apps.length})`);
  apps.forEach((app, index) => {
    const entry = entries[index];
    const copy = strings[lang].portfolio[app.key];
    const name = text(entry?.querySelector(".portfolio-name"));
    report.check(entry !== undefined && name === copy?.name, `${rel}: entry ${index + 1} is "${copy?.name}" (${name || "missing"})`);
    report.check(entry !== undefined && text(entry).includes(strings[lang].portfolioStatus[app.status] ?? "\u0000"), `${rel}: ${copy?.name} entry states its status "${strings[lang].portfolioStatus[app.status]}"`);
    const links = entry?.querySelectorAll("a[href]") ?? [];
    if (app.url === null) {
      report.check(entry !== undefined && links.length === 0, `${rel}: ${copy?.name} entry has no link (private repository)`);
    } else {
      report.check(links.length === 1 && attr(links[0], "href") === app.url && (attr(links[0], "class") ?? "").split(/\s+/).includes("app-action"), `${rel}: ${copy?.name} entry links its repository exactly once (${app.url}) through a.app-action`);
    }
  });

  // REQ-012 (AC-13): the trust section.
  const trust = doc.querySelector(".trust");
  const trustText = text(trust);
  const articlePath = `${prefix}/blog/${ARTICLE_SLUG}/`;
  report.check(trust !== null && trustText.includes(FACTORY_PHRASE[lang]), `${rel}: trust section mentions "${FACTORY_PHRASE[lang]}"`);
  report.check(trust !== null && trustText.includes(FOUNDER), `${rel}: trust section names ${FOUNDER}`);
  report.check(trust !== null && trustText.includes(AI_NATIVE[lang]), `${rel}: trust section says "${AI_NATIVE[lang]}"`);
  const trustLinks = trust?.querySelectorAll("a[href]") ?? [];
  report.check(trustLinks.some((a) => attr(a, "href") === articlePath), `${rel}: trust section links ${articlePath}`);
  report.check(trustLinks.some((a) => attr(a, "href") === "#apps" || (attr(a, "href") ?? "").startsWith("https://github.com/PeterBlenessy/ashlands")), `${rel}: trust section links #apps or the Ashlands repository as proof`);
  const factoryLinks = trustLinks.filter((a) => attr(a, "href") !== articlePath && /factory/i.test(`${text(a)} ${attr(a, "href")}`));
  report.check(trust !== null && factoryLinks.length === 0, `${rel}: trust section has no other link named "factory"`);
  const note = doc.querySelector(".factory-note");
  report.check(note !== null && note.querySelectorAll("a[href]").every((a) => attr(a, "href") === articlePath), `${rel}: factory note links nothing but the article`);

  // REQ-013 (AC-14): at least two latest-writing cards with a category chip
  // each, the draft chip where the article is a draft, and the blog link.
  const posts = doc.querySelectorAll("main .post");
  report.check(posts.length >= 2, `${rel}: latest-writing section lists at least two articles (${posts.length})`);
  const articles = await readArticleSources(src, site, lang);
  for (const post of posts) {
    const href = attr(post.querySelector(".post-title a"), "href");
    const chip = post.querySelector("a.chip-cat");
    report.check(chip !== null && (attr(chip, "href") ?? "").startsWith(`${prefix}/blog/`), `${rel}: post ${href} carries a category chip link`);
    const article = articles.find((item) => item.path === href);
    const hasDraftChip = post.querySelector(".chip-draft") !== null;
    report.check(article !== undefined && hasDraftChip === article.draft, `${rel}: post ${href} ${article?.draft ? "carries" : "omits"} the draft chip`);
  }
  report.check(doc.querySelectorAll(`main a[href="${prefix}/blog/"]`).length >= 1, `${rel}: links the blog index ${prefix}/blog/`);
  report.check(doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
}

// About pages
for (const lang of site.languages.codes) {
  const rel = `${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}about/index.html`;
  const about = await page(rel);
  if (!about) continue;
  const main = text(about.doc.querySelector("main"));
  const h2s = about.doc.querySelectorAll("main h2").map(text);
  // Founder call 2026-09-22: the about page is a company page — a mission
  // section instead of a founder section; the founder's name stays on the
  // landing page's trust section (REQ-012) and nowhere else.
  report.check(h2s.includes(strings[lang].about.missionHeading), `${rel}: mission section present`);
  report.check(!main.includes(FOUNDER), `${rel}: no founder section (the name belongs to the landing page's trust section)`);
  // REQ-012 (plan D-12): the founding month moved from the landing page to the about page.
  report.check(main.includes(MONTH[lang]), `${rel}: contains "${MONTH[lang]}"`);
  report.check(h2s.includes(strings[lang].about.approachHeading), `${rel}: approach section present`);
  report.check(about.doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
}

// Every page: footer contact, LinkedIn placeholder or link, language switch,
// toggle, feed link, forbidden links and names
const pages = [];
for (const file of await walk(out, ".html")) pages.push(await loadPage(file, out, site));
let footerProblems = 0;
let linkedinProblems = 0;
let controlProblems = 0;
let forbiddenProblems = 0;
for (const p of pages) {
  const footer = p.doc.querySelector("footer");
  // REQ-014 (AC-15): the address is the visible text of the footer's mailto: link.
  const mailto = footer?.querySelectorAll('a[href^="mailto:hello@addablelabs.se"]') ?? [];
  if (!footer || !mailto.some((a) => text(a) === site.email)) {
    footerProblems += 1;
    report.fail(`${p.relPath}: footer lacks the mailto:hello@addablelabs.se link with the address as text`);
  }
  if (!text(footer).includes("LinkedIn")) {
    linkedinProblems += 1;
    report.fail(`${p.relPath}: footer lacks the LinkedIn entry`);
  }
  // Follow site.js (README open item 5): once the founder sets linkedinUrl,
  // contact.njk renders a link to it and every footer must carry that link;
  // while it is null, LinkedIn is placeholder text and no href may point at it.
  if (site.linkedinUrl) {
    if (!footer || !footer.querySelectorAll("a[href]").some((a) => attr(a, "href") === site.linkedinUrl)) {
      linkedinProblems += 1;
      report.fail(`${p.relPath}: footer lacks the LinkedIn link to ${site.linkedinUrl}`);
    }
  } else {
    for (const a of p.doc.querySelectorAll("a[href]")) {
      if (/linkedin/i.test(attr(a, "href") ?? "")) {
        linkedinProblems += 1;
        report.fail(`${p.relPath}: LinkedIn is a hyperlink (${attr(a, "href")}); expected placeholder text while site.linkedinUrl is null`);
      }
    }
  }
  // REQ-014 (AC-15): the language switches point at the counterpart page —
  // the other language's hreflang alternate in the head — in the footer
  // (a.lang-switch-footer) and still in the header (a.lang-switch); pages
  // without a counterpart (404) have no alternates and no switch.
  const other = site.languages.codes.find((code) => code !== p.lang);
  const counterpart = internalPath(attr(p.doc.querySelector(`head link[rel="alternate"][hreflang="${other}"]`), "href"), site);
  if (counterpart) {
    for (const [where, selector] of [["footer", "footer a.lang-switch-footer"], ["header", "header a.lang-switch"]]) {
      if (attr(p.doc.querySelector(selector), "href") !== counterpart) {
        controlProblems += 1;
        report.fail(`${p.relPath}: ${where} language switch does not point at ${counterpart}`);
      }
    }
  }
  // REQ-007, REQ-014 (AC-15): the appearance toggle is a real button on every page.
  if (p.doc.querySelectorAll("button[data-theme-toggle]").length === 0) {
    controlProblems += 1;
    report.fail(`${p.relPath}: no button[data-theme-toggle]`);
  }
  // REQ-014 (AC-15): a visible link to the page language's feed.
  const feedPath = `${prefixOf(p.lang)}/feed.xml`;
  if (p.doc.querySelectorAll(`a[href="${feedPath}"]`).length === 0) {
    controlProblems += 1;
    report.fail(`${p.relPath}: no link to ${feedPath}`);
  }
  for (const needle of [...PRIVATE_LINKS, ...FORBIDDEN_TEXT]) {
    if (p.html.includes(needle)) {
      forbiddenProblems += 1;
      report.fail(`${p.relPath}: contains "${needle}"`);
    }
  }
}
for (const file of await walk(out, ".xml")) {
  const xml = await readFile(file, "utf8");
  for (const needle of [...PRIVATE_LINKS, ...FORBIDDEN_TEXT]) {
    if (xml.includes(needle)) {
      forbiddenProblems += 1;
      report.fail(`${path.relative(out, file)}: contains "${needle}"`);
    }
  }
}
report.check(footerProblems === 0, `every page's footer links mailto:hello@addablelabs.se with the address as text (${pages.length} pages)`);
report.check(linkedinProblems === 0, site.linkedinUrl ? `LinkedIn links ${site.linkedinUrl} on every page` : "LinkedIn appears as placeholder text with no href");
report.check(controlProblems === 0, "every page carries the language switch to its counterpart, the appearance toggle and the feed link");
report.check(forbiddenProblems === 0, "no links to private repositories, no StockSight-AI, no factory name");

/**
 * Why the built site owes this article nothing: it is a draft and this is the
 * production build, which leaves drafts out altogether (si-mzf1), or it is
 * dated after today and so is built but unlisted (si-gxyg). Used in the
 * message the gate prints, so a passing run says out loud which article it
 * expected to be absent and why.
 */
function because(article) {
  return article.omitted ? "(a draft, and this is the production build)" : `before ${article.date}`;
}

// Articles: existence, word count, the draft label, and the two ways an
// article stays off the listings
for (const lang of site.languages.codes) {
  const articles = await readArticleSources(src, site, lang);
  report.check(articles.length >= 2, `${lang}: at least two articles in the source tree (${articles.length})`);
  const listing = await page(`${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}blog/index.html`);
  const feedFile = path.join(out, prefixOf(lang).replace(/^\//, ""), "feed.xml");
  const feed = (await exists(feedFile)) ? await readFile(feedFile, "utf8") : "";
  const draftLabel = strings[lang].article.draftLabel;
  for (const article of articles) {
    const rel = `${article.path.replace(/^\//, "")}index.html`;
    if (article.omitted) {
      // The production build carries no draft at all: not merely unlisted —
      // there is no page at its URL, and nothing anywhere points at one
      // (si-mzf1). Assert that rather than skipping the article, or the gate
      // would fall silent on exactly the thing it is here to prove.
      report.check(!(await exists(path.join(out, rel))), `${rel} is not built ${because(article)}`);
      const entries = listing?.doc.querySelectorAll(".post") ?? [];
      report.check(entries.every((item) => attr(item.querySelector(".post-title a"), "href") !== article.path), `${lang} blog index does not list ${article.path} ${because(article)}`);
      report.check(!feed.includes(article.url), `${lang} feed has no item for ${article.slug} ${because(article)}`);
      continue;
    }
    const built = await page(rel);
    if (!built) continue;
    if (lang === site.languages.default) {
      // The prose only: a figure's caption and the labels inside its SVG
      // panels are removed before counting (founder feedback 2026-09-21,
      // si-55iu), so an illustrated article is measured like a plain one.
      const body = built.doc.querySelector(".article-body");
      for (const figure of body?.querySelectorAll("figure") ?? []) figure.remove();
      const words = text(body).split(/\s+/).filter(Boolean).length;
      const [min, max] = SEED_ARTICLES.has(article.slug) ? WORD_RANGE.seed : WORD_RANGE.other;
      report.check(words >= min && words <= max, `${rel}: ${words} words (${min}–${max})`);
    }
    const hasNotice = built.doc.querySelector(".notice-draft") !== null;
    report.check(hasNotice === article.draft, `${rel}: draft notice ${article.draft ? "shown" : "absent"}`);
    // The ending band (founder feedback 2026-09-22): the other articles of
    // the page's language as .post cards — at least one, never the page
    // itself, every one an article of this language — and the blog link.
    const more = built.doc.querySelector(".article-more");
    const moreLinks = (more?.querySelectorAll(".post .post-title a") ?? []).map((a) => attr(a, "href"));
    const others = articles.filter((other) => other.path !== article.path).map((other) => other.path);
    report.check(more !== null && moreLinks.length >= 1 && moreLinks.every((href) => others.includes(href)), `${rel}: "more from the blog" lists other ${lang} articles (${moreLinks.length ? moreLinks.join(", ") : "none"})`);
    report.check(more !== null && (more.querySelectorAll("a[href]") ?? []).some((a) => attr(a, "href") === `${prefixOf(lang)}/blog/`), `${rel}: "more from the blog" links the ${lang} blog index`);
    if (listing) {
      // REQ-013, REQ-016: the listings are .post cards whose title link is the
      // article and whose draft label is the .chip-draft chip. An article
      // dated after today is built, as the page above, but listed nowhere
      // until that day (si-gxyg). A draft that reaches here is a draft in a
      // local build, where it is listed and wears its label like any other
      // article (si-mzf1).
      const entry = listing.doc.querySelectorAll(".post").find((item) => attr(item.querySelector(".post-title a"), "href") === article.path);
      if (article.scheduled) {
        report.check(entry === undefined, `${lang} blog index does not list ${article.path} before ${article.date}`);
      } else {
        report.check(entry !== undefined, `${lang} blog index lists ${article.path}`);
        if (entry) report.check((text(entry.querySelector(".chip-draft")) === draftLabel) === article.draft, `${lang} blog index entry for ${article.slug} ${article.draft ? "carries" : "omits"} "${draftLabel}"`);
      }
    }
    if (article.scheduled) {
      report.check(!feed.includes(article.url), `${lang} feed has no item for ${article.slug} before ${article.date}`);
      continue;
    }
    const itemTitle = new RegExp(`<title>${article.draft ? `${draftLabel}: ` : ""}[^<]*</title>[\\s\\S]*?<link>${article.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</link>`);
    report.check(itemTitle.test(feed), `${lang} feed item for ${article.slug} ${article.draft ? `carries "${draftLabel}"` : "present"}`);
  }
}

report.finish();
