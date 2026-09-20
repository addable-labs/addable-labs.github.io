#!/usr/bin/env node
// Gate: content (AC-06 … AC-13). The load-bearing facts of the acceptance
// criteria, checked as queries over the built output:
//   - both landing pages name the founder and the founding month
//     ("September 2026" / "september 2026"), carry the three theme headings,
//     the factory note (no link, no name beyond "an agent-run software
//     factory") and the latest-articles section
//   - the about pages have the founder and approach sections
//   - mailto:hello@addablelabs.se on landing, about and the footer of every
//     page; the LinkedIn entry is visible text with no href while
//     site.linkedinUrl is null and a footer link to that URL once it is set
//   - the nivå entry says "in development" and has no link; no GitHub links
//     for private repositories; StockSight-AI and the factory are absent
//   - both seed articles exist in both languages, English articles are
//     300–600 words, drafts show "Draft"/"Utkast" on the article page, in the
//     listings and in the feeds
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import { attr, loadPage, text } from "../lib/html.mjs";
import { exists, loadSite, loadStrings, readArticleSources, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const strings = await loadStrings(src, site);
const report = reporter("content");
const prefixOf = (lang) => (lang === site.languages.default ? "" : `/${lang}`);
const FOUNDER = "Peter Blenessy";
const MONTH = { en: "September 2026", sv: "september 2026" };
const FACTORY_PHRASE = { en: "agent-run software factory", sv: "agentdriven mjukvarufabrik" };
const PRIVATE_LINKS = ["github.com/addable-labs/niva", "github.com/PeterBlenessy/investable", "github.com/PeterBlenessy/StockSight", "addable-labs/factory"];
const FORBIDDEN_TEXT = ["StockSight"];

async function page(relPath) {
  const file = path.join(out, relPath);
  if (!(await exists(file))) {
    report.fail(`${relPath} is missing`);
    return null;
  }
  return loadPage(file, out, site);
}

// Landing pages
for (const lang of site.languages.codes) {
  const rel = `${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}index.html`;
  const landing = await page(rel);
  if (!landing) continue;
  const main = text(landing.doc.querySelector("main"));
  report.check(main.includes(FOUNDER), `${rel}: names ${FOUNDER}`);
  report.check(main.includes(MONTH[lang]), `${rel}: contains "${MONTH[lang]}"`);
  const h2s = landing.doc.querySelectorAll("main h2").map(text);
  for (const key of ["ai-apps", "ai-adoption", "investing"]) {
    const title = strings[lang].themes[key].title;
    report.check(h2s.includes(title), `${rel}: theme heading "${title}"`);
  }
  const note = landing.doc.querySelector(".factory-note");
  report.check(note && text(note).includes(FACTORY_PHRASE[lang]), `${rel}: factory note mentions "${FACTORY_PHRASE[lang]}"`);
  report.check(note && note.querySelectorAll("a").length === 0, `${rel}: factory note has no link`);
  const sentences = note ? text(note).split(/(?<=[.!?])\s+/).filter(Boolean).length : 0;
  report.check(sentences >= 2 && sentences <= 4, `${rel}: factory note is two to four sentences (${sentences})`);
  report.check(h2s.includes(strings[lang].home.latestHeading) && landing.doc.querySelectorAll("main .article-list-item").length >= 2, `${rel}: latest-articles section lists at least two articles`);
  report.check(landing.doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
  const niva = landing.doc.querySelectorAll(".portfolio-entry").find((entry) => text(entry.querySelector(".portfolio-name")).toLowerCase() === "nivå");
  report.check(niva && text(niva).includes(strings[lang].portfolioStatus["in-development"]), `${rel}: nivå entry says "${strings[lang].portfolioStatus["in-development"]}"`);
  report.check(niva && niva.querySelectorAll("a").length === 0, `${rel}: nivå entry has no link`);
  report.check(landing.doc.querySelectorAll('.portfolio-entry a[href^="https://github.com/PeterBlenessy/notesage"]').length === 1, `${rel}: Notesage entry links its repository`);
}

// About pages
for (const lang of site.languages.codes) {
  const rel = `${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}about/index.html`;
  const about = await page(rel);
  if (!about) continue;
  const main = text(about.doc.querySelector("main"));
  const h2s = about.doc.querySelectorAll("main h2").map(text);
  report.check(main.includes(FOUNDER) && h2s.includes(strings[lang].about.founderHeading), `${rel}: founder section names ${FOUNDER}`);
  report.check(h2s.includes(strings[lang].about.approachHeading), `${rel}: approach section present`);
  report.check(about.doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
}

// Every page: footer contact, LinkedIn placeholder or link, forbidden links and names
const pages = [];
for (const file of await walk(out, ".html")) pages.push(await loadPage(file, out, site));
let footerProblems = 0;
let linkedinProblems = 0;
let forbiddenProblems = 0;
for (const p of pages) {
  const footer = p.doc.querySelector("footer");
  if (!footer || footer.querySelectorAll('a[href^="mailto:hello@addablelabs.se"]').length === 0) {
    footerProblems += 1;
    report.fail(`${p.relPath}: footer lacks the mailto:hello@addablelabs.se link`);
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
report.check(footerProblems === 0, `every page's footer links mailto:hello@addablelabs.se (${pages.length} pages)`);
report.check(linkedinProblems === 0, site.linkedinUrl ? `LinkedIn links ${site.linkedinUrl} on every page` : "LinkedIn appears as placeholder text with no href");
report.check(forbiddenProblems === 0, "no links to private repositories, no StockSight-AI, no factory name");

// Seed articles: existence, word count, draft labels
for (const lang of site.languages.codes) {
  const articles = await readArticleSources(src, site, lang);
  report.check(articles.length >= 2, `${lang}: at least two articles in the source tree (${articles.length})`);
  const listing = await page(`${prefixOf(lang).replace(/^\//, "")}${prefixOf(lang) ? "/" : ""}blog/index.html`);
  const feedFile = path.join(out, prefixOf(lang).replace(/^\//, ""), "feed.xml");
  const feed = (await exists(feedFile)) ? await readFile(feedFile, "utf8") : "";
  const draftLabel = strings[lang].article.draftLabel;
  for (const article of articles) {
    const rel = `${article.path.replace(/^\//, "")}index.html`;
    const built = await page(rel);
    if (!built) continue;
    if (lang === site.languages.default) {
      const words = text(built.doc.querySelector(".article-body")).split(/\s+/).filter(Boolean).length;
      report.check(words >= 300 && words <= 600, `${rel}: ${words} words (300–600)`);
    }
    const hasNotice = built.doc.querySelector(".notice-draft") !== null;
    report.check(hasNotice === article.draft, `${rel}: draft notice ${article.draft ? "shown" : "absent"}`);
    if (listing) {
      const entry = listing.doc.querySelectorAll(".article-list-item").find((item) => attr(item.querySelector("a"), "href") === article.path);
      report.check(entry !== undefined, `${lang} blog index lists ${article.path}`);
      if (entry) report.check(text(entry.querySelector(".article-list-title")).startsWith(`${draftLabel}: `) === article.draft, `${lang} blog index entry for ${article.slug} ${article.draft ? "carries" : "omits"} "${draftLabel}"`);
    }
    const itemTitle = new RegExp(`<title>${article.draft ? `${draftLabel}: ` : ""}[^<]*</title>[\\s\\S]*?<link>${article.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</link>`);
    report.check(itemTitle.test(feed), `${lang} feed item for ${article.slug} ${article.draft ? `carries "${draftLabel}"` : "present"}`);
  }
}

report.finish();
