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
//     name and status label and exactly the links it calls for, in its
//     action row: its url, "Repository" to a public repository and "Website"
//     to the public page of a product whose repository is private (si-gyc4),
//     then "Article" to the article about the app when the entry names one
//     and the build lists it (si-3hpa) — an entry with neither unlinked;
//     the trust section carries the factory phrase, the founder's name,
//     "AI-native", the article link and the proof link and links nothing else
//     named "factory"; at least two latest-writing cards — the newest three
//     listed articles of the language, newest first (si-absd) — with
//     category chips and the draft chip where due, and the link to the blog
//     index
//   - the about pages have the mission and approach sections and the
//     founding month ("September 2026" / "september 2026"), the first
//     sentence of their lead names the founder (the founder's request of
//     2026-09-23) and outside the lead the founder's name appears nowhere in
//     their main content, not even without its accents or in capitals
//     (founder call 2026-09-22: no founder section)
//   - every page's footer: mailto:hello@addablelabs.se with the address as
//     text, the company line the law asks for — name, organisation number and
//     registered seat (si-98hh) — the language switch to the counterpart path
//     (footer and header), the appearance toggle and the link to the page
//     language's feed
//   - every GitHub repository the built site names — in a page, a feed, the
//     sitemap or a text file — is one of the public repositories it may link
//     (PUBLIC_REPOS in scripts/lib/apps.mjs, an allow-list, si-vwu8)
//   - both seed articles exist in both languages, the seed articles are
//     300–600 English words of prose and every later article 300–1,500 (the
//     figures' captions and diagram labels are not prose and do not count,
//     si-55iu, and neither do tables' cells), a draft shows "Draft"/"Utkast" on its page, in the listings
//     and in the feeds of a local build and has no page at all in the
//     production build (si-mzf1), an article dated after today is built but
//     listed nowhere (si-gxyg), and every article page ends with the "More
//     from the blog" band listing other articles of its language, never
//     itself (founder feedback 2026-09-22)
//   - each blog index lists exactly the listed articles of its language,
//     newest first (si-absd), and each category page, in both languages,
//     those of its category: none of another category and none of its own
//     missing (si-thf3)
// Optional arguments: <built-site dir> [<source dir>].

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PUBLIC_REPOS, PUBLIC_URL_PREFIX, githubRepos, publicRepo } from "../lib/apps.mjs";
import { attr, loadPage, text } from "../lib/html.mjs";
import { exists, internalPath, langPrefix, loadSite, loadStrings, newestFirst, readArticleSources, reporter, resolveDirs, walk } from "../lib/site.mjs";

const { out, src } = resolveDirs();
const site = await loadSite(src);
const strings = await loadStrings(src, site);
// REQ-011 (AC-11): the apps grid is driven by the data file, so the gate
// reads the same entries the templates render.
const apps = JSON.parse(await readFile(path.join(src, "_data", "portfolio.json"), "utf8"));
// REQ-016: one category page per entry of the data file the build paginates.
const categories = JSON.parse(await readFile(path.join(src, "_data", "categories.json"), "utf8"));
const report = reporter("content");
const FOUNDER = "Péter Blénessy";
const MONTH = { en: "September 2026", sv: "september 2026" };
const FACTORY_PHRASE = { en: "agent-run software factory", sv: "agentdriven mjukvarufabrik" };
// Aktiebolagslagen 28 kap. 5 § (si-98hh): a limited company states its name,
// its organisation number and its registered seat on its website. The seat is
// the town; the street address is the founder's home and is never published.
const COMPANY = { en: "Addable Labs AB · Org.nr 559602-2615 · Registered office: Eslöv", sv: "Addable Labs AB · Org.nr 559602-2615 · Säte: Eslöv" };
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

/**
 * The first sentence of a text: up to and including the first ".", "!" or
 * "?" that whitespace follows, or the whole text when none does.
 */
function firstSentence(value) {
  return value.split(/(?<=[.!?])\s/, 1)[0];
}

/**
 * A text with its accents and case folded away (NFD, combining marks dropped,
 * lower case), so "Peter Blenessy" and "PÉTER BLÉNESSY" read as the founder's
 * name.
 */
function folded(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// Landing pages
for (const lang of site.languages.codes) {
  const prefix = langPrefix(lang, site);
  const rel = `${prefix.replace(/^\//, "")}${prefix ? "/" : ""}index.html`;
  const landing = await page(rel);
  if (!landing) continue;
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
    report.check(secondary && secondaryHref === site.nivaUrl && text(secondary) === strings[lang].hero.nivaLink, `${rel}: secondary CTA links site.nivaUrl (${site.nivaUrl}) as "${strings[lang].hero.nivaLink}"`);
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
  // order, with the strings name and status label, and exactly the links
  // its entry calls for, each an a.app-action in the card's action row
  // (.app-actions): first its url — labelled "Repository" when it is the
  // repository on github.com and "Website" when it is the public page of a
  // product whose repository is private (si-gyc4), so no card calls a
  // private repository open — then, beside it, the article about the app
  // when the entry names one and this build lists it (founder request
  // 2026-09-23, si-3hpa), labelled "Article" and linking the article in the
  // page's language. A draft in the production build and an article dated
  // after today are listed nowhere, and no card links them either. An entry
  // with no url and no listed article links nothing.
  const articles = await readArticleSources(src, site, lang);
  const entries = doc.querySelectorAll(".portfolio-entry");
  report.check(entries.length === apps.length, `${rel}: apps grid renders one entry per data entry (${entries.length} of ${apps.length})`);
  apps.forEach((app, index) => {
    const entry = entries[index];
    const copy = strings[lang].portfolio[app.key];
    const name = text(entry?.querySelector(".portfolio-name"));
    report.check(entry !== undefined && name === copy?.name, `${rel}: entry ${index + 1} is "${copy?.name}" (${name || "missing"})`);
    report.check(entry !== undefined && text(entry).includes(strings[lang].portfolioStatus[app.status] ?? "\u0000"), `${rel}: ${copy?.name} entry states its status "${strings[lang].portfolioStatus[app.status]}"`);
    const links = entry?.querySelectorAll("a[href]") ?? [];
    // The links the entry calls for, in the order of its action row. Each
    // link's text is its label and then its decorative, aria-hidden arrow:
    // ↗ for a link that leaves the site, → for one that stays on it.
    const wanted = [];
    if (app.url !== null) {
      const repository = app.url.startsWith(PUBLIC_URL_PREFIX);
      wanted.push({ what: repository ? "its repository" : "its public page", href: app.url, label: strings[lang].portfolio[repository ? "repoLink" : "siteLink"], arrow: "↗" });
    }
    if (app.article !== undefined) {
      const article = articles.find((item) => item.slug === app.article);
      if (!article) {
        report.fail(`${rel}: ${copy?.name} entry names the article "${app.article}", which is not a ${lang} article`);
      } else if (article.listed) {
        wanted.push({ what: "its article", href: article.path, label: strings[lang].portfolio.articleLink, arrow: "→" });
      } else {
        report.check(!links.some((link) => attr(link, "href") === article.path), `${rel}: ${copy?.name} entry does not link its article ${article.path} ${because(article)}`);
      }
    }
    const row = entry?.querySelector(".app-actions")?.querySelectorAll("a[href]") ?? [];
    wanted.forEach((link, position) => {
      const found = row[position];
      const label = text(found).endsWith(link.arrow) ? text(found).slice(0, -link.arrow.length).trim() : undefined;
      report.check(found !== undefined && attr(found, "href") === link.href && (attr(found, "class") ?? "").split(/\s+/).includes("app-action") && label === link.label, `${rel}: ${copy?.name} entry links ${link.what} (${link.href}) through a.app-action labelled "${link.label} ${link.arrow}", ${position === 0 ? "first" : "second"} in its action row`);
    });
    const count = ["no link", "one link", "two links"][wanted.length];
    report.check(entry !== undefined && links.length === wanted.length, wanted.length === 0 ? `${rel}: ${copy?.name} entry has no link (private repository)` : `${rel}: ${copy?.name} entry has ${count}, ${wanted.map((link) => link.what).join(" and ")}, and no other`);
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
  report.check(trustLinks.some((a) => attr(a, "href") === "#apps" || (attr(a, "href") ?? "").startsWith("https://github.com/addable-labs/ashlands")), `${rel}: trust section links #apps or the Ashlands repository as proof`);
  const factoryLinks = trustLinks.filter((a) => attr(a, "href") !== articlePath && /factory/i.test(`${text(a)} ${attr(a, "href")}`));
  report.check(trust !== null && factoryLinks.length === 0, `${rel}: trust section has no other link named "factory"`);
  const note = doc.querySelector(".factory-note");
  report.check(note !== null && note.querySelectorAll("a[href]").every((a) => attr(a, "href") === articlePath), `${rel}: factory note links nothing but the article`);

  // REQ-013 (AC-14): at least two latest-writing cards with a category chip
  // each, the draft chip where the article is a draft, and the blog link.
  const posts = doc.querySelectorAll("main .post");
  report.check(posts.length >= 2, `${rel}: latest-writing section lists at least two articles (${posts.length})`);
  for (const post of posts) {
    const href = attr(post.querySelector(".post-title a"), "href");
    const chip = post.querySelector("a.chip-cat");
    report.check(chip !== null && (attr(chip, "href") ?? "").startsWith(`${prefix}/blog/`), `${rel}: post ${href} carries a category chip link`);
    const article = articles.find((item) => item.path === href);
    const hasDraftChip = post.querySelector(".chip-draft") !== null;
    report.check(article !== undefined && hasDraftChip === article.draft, `${rel}: post ${href} ${article?.draft ? "carries" : "omits"} the draft chip`);
  }
  // REQ-013 (si-absd): the cards are the newest three listed articles of the
  // language, newest first: the first three of the list the blog index is
  // held to below. So the newest article takes the first card, and no
  // article of another language, none dated after today and no draft of the
  // production build takes one. One line names what the section gets wrong.
  const newest = listedNewestFirst(articles).slice(0, 3);
  const shown = doc.querySelectorAll("main .post .post-title a").map((a) => attr(a, "href"));
  const writingProblems = listingProblems(shown, newest, (href) => {
    const article = articles.find((item) => item.path === href);
    if (!article) return `${href} (not a ${lang} article)`;
    return article.listed ? `${href} (not one of the newest three)` : `${href} ${because(article)}`;
  });
  const unlisted = articles.filter((article) => !article.listed).map((article) => `${article.path} ${because(article)}`);
  report.check(writingProblems.length === 0, `${rel}: latest-writing section lists the newest three listed ${lang} articles, newest first (${newest.join(", ") || "none"})${unlisted.length > 0 ? `, not ${unlisted.join(", ")}` : ""}${writingProblems.length > 0 ? ` — ${writingProblems.join("; ")}` : ""}`);
  report.check(doc.querySelectorAll(`main a[href="${prefix}/blog/"]`).length >= 1, `${rel}: links the blog index ${prefix}/blog/`);
  report.check(doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
}

// About pages
for (const lang of site.languages.codes) {
  const prefix = langPrefix(lang, site);
  const rel = `${prefix.replace(/^\//, "")}${prefix ? "/" : ""}about/index.html`;
  const about = await page(rel);
  if (!about) continue;
  const main = text(about.doc.querySelector("main"));
  const lead = text(about.doc.querySelector("main .page-hero .lead"));
  const opening = firstSentence(lead);
  const h2s = about.doc.querySelectorAll("main h2").map(text);
  // Founder call 2026-09-22: a mission section and no founder section. The
  // lead's first sentence must name the founder (the founder's request of
  // 2026-09-23), as the landing page's trust section must (REQ-012): the name
  // only in a later sentence of the lead fails. Outside the lead the name
  // appears nowhere in the page's main content, with or without its accents
  // and in any case: "Peter Blenessy" names the founder too.
  report.check(h2s.includes(strings[lang].about.missionHeading), `${rel}: mission section present`);
  report.check(opening.includes(FOUNDER), `${rel}: lead's first sentence names ${FOUNDER}${opening.includes(FOUNDER) ? "" : ` — it reads "${opening}"`}`);
  report.check(!folded(main.replace(lead, "")).includes(folded(FOUNDER)), `${rel}: no founder section (outside the lead, the main content does not name ${FOUNDER}, ignoring accents and case)`);
  // REQ-012 (plan D-12): the founding month moved from the landing page to the about page.
  report.check(main.includes(MONTH[lang]), `${rel}: contains "${MONTH[lang]}"`);
  report.check(h2s.includes(strings[lang].about.approachHeading), `${rel}: approach section present`);
  report.check(about.doc.querySelectorAll('main a[href^="mailto:hello@addablelabs.se"]').length >= 1, `${rel}: mailto:hello@addablelabs.se in the page body`);
}

// Every page: footer contact, the company line, language switch, toggle, feed
// link
const pages = [];
for (const file of await walk(out, ".html")) pages.push(await loadPage(file, out, site));
let footerProblems = 0;
let companyProblems = 0;
let controlProblems = 0;
for (const p of pages) {
  const footer = p.doc.querySelector("footer");
  // REQ-014 (AC-15): the address is the visible text of the footer's mailto: link.
  const mailto = footer?.querySelectorAll('a[href^="mailto:hello@addablelabs.se"]') ?? [];
  if (!footer || !mailto.some((a) => text(a) === site.email)) {
    footerProblems += 1;
    report.fail(`${p.relPath}: footer lacks the mailto:hello@addablelabs.se link with the address as text`);
  }
  // The company line the law asks for, in the page's language. Read from the
  // rendered text, so the facts are checked as a visitor sees them however
  // the partial marks them up.
  const company = COMPANY[p.lang];
  if (!text(footer).includes(company)) {
    companyProblems += 1;
    report.fail(`${p.relPath}: footer lacks the company line "${company}"`);
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
  const feedPath = `${langPrefix(p.lang, site)}/feed.xml`;
  if (p.doc.querySelectorAll(`a[href="${feedPath}"]`).length === 0) {
    controlProblems += 1;
    report.fail(`${p.relPath}: no link to ${feedPath}`);
  }
}
report.check(footerProblems === 0, `every page's footer links mailto:hello@addablelabs.se with the address as text (${pages.length} pages)`);
report.check(companyProblems === 0, `every page's footer states "${COMPANY[site.languages.default]}" in the page's language (${pages.length} pages)`);
report.check(controlProblems === 0, "every page carries the language switch to its counterpart, the appearance toggle and the feed link");

// REQ-011 (si-vwu8): every GitHub repository the built site names — a link or
// text, in a page, a feed, the sitemap or a text file such as the font
// licence — is one of the public repositories it may link. An allow-list, not
// a list of private repositories to keep out: it refuses a repository nobody
// thought of, and it names only public things.
const named = new Set(); // the PUBLIC_REPOS entries the site names
let repoProblems = 0;
for (const extension of [".html", ".xml", ".txt"]) {
  for (const file of await walk(out, extension)) {
    const rel = path.relative(out, file).split(path.sep).join("/");
    for (const repo of new Set(githubRepos(await readFile(file, "utf8")))) {
      const allowed = publicRepo(repo);
      if (allowed) {
        named.add(allowed);
      } else {
        repoProblems += 1;
        report.fail(`${rel}: names github.com/${repo}, which is not one of the public repositories the site may link (PUBLIC_REPOS in scripts/lib/apps.mjs)`);
      }
    }
  }
}
report.check(repoProblems === 0, `every GitHub repository the site names is one of the public repositories it may link: ${PUBLIC_REPOS.filter((repo) => named.has(repo)).join(", ") || "none named"}`);

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

/**
 * What a listing gets wrong when it must show the article paths `want`, in
 * that order, and shows `got`: each path it shows but should not (worded by
 * `describe`), each it misses, each it shows twice and, when it shows exactly
 * the right ones, the order it shows them in. Empty when `got` is `want`.
 */
function listingProblems(got, want, describe) {
  const extra = [...new Set(got.filter((href) => !want.includes(href)))];
  const missing = want.filter((href) => !got.includes(href));
  const twice = [...new Set(got.filter((href, index) => got.indexOf(href) !== index))];
  const problems = [];
  if (extra.length > 0) problems.push(`extra: ${extra.map(describe).join(", ")}`);
  if (missing.length > 0) problems.push(`missing: ${missing.join(", ")}`);
  if (twice.length > 0) problems.push(`listed twice: ${twice.join(", ")}`);
  if (problems.length === 0 && got.some((href, index) => href !== want[index])) problems.push(`in another order: ${got.join(", ")}`);
  return problems;
}

/**
 * The paths of the listed ones of `articles`, newest first: what a listing of
 * them must show, in its order (`newestFirst`, the build's own comparison).
 */
function listedNewestFirst(articles) {
  return newestFirst(articles.filter((article) => article.listed)).map((article) => article.path);
}

// Articles: existence, word count, the draft label, and the two ways an
// article stays off the listings
for (const lang of site.languages.codes) {
  const articles = await readArticleSources(src, site, lang);
  report.check(articles.length >= 2, `${lang}: at least two articles in the source tree (${articles.length})`);
  const prefix = langPrefix(lang, site);
  const listing = await page(`${prefix.replace(/^\//, "")}${prefix ? "/" : ""}blog/index.html`);
  const feedFile = path.join(out, prefix.replace(/^\//, ""), "feed.xml");
  const feed = (await exists(feedFile)) ? await readFile(feedFile, "utf8") : "";
  // The article each feed item is for: the <link> that follows its <item>.
  const feedItems = [...feed.matchAll(/<item>[\s\S]*?<link>([^<]*)<\/link>/g)].map(([, url]) => url);
  const draftLabel = strings[lang].article.draftLabel;
  for (const article of articles) {
    const rel = `${article.path.replace(/^\//, "")}index.html`;
    if (article.omitted) {
      // The production build carries no draft at all: not merely unlisted —
      // there is no page at its URL, and nothing anywhere points at one
      // (si-mzf1). Assert that rather than skipping the article, or the gate
      // would fall silent on exactly the thing it is here to prove. The blog
      // index's line below names it as left out, and refuses a card for it.
      report.check(!(await exists(path.join(out, rel))), `${rel} is not built ${because(article)}`);
      report.check(!feed.includes(article.url), `${lang} feed has no item for ${article.slug} ${because(article)}`);
      continue;
    }
    const built = await page(rel);
    if (!built) continue;
    if (lang === site.languages.default) {
      // The prose only: a figure's caption and the labels inside its SVG
      // panels are removed before counting (founder feedback 2026-09-21,
      // si-55iu), so an illustrated article is measured like a plain one.
      // A table goes too: its cells are data, not prose, and the context
      // study's tables (2026-09-24) would otherwise spend its words.
      const body = built.doc.querySelector(".article-body");
      for (const element of body?.querySelectorAll("figure, table") ?? []) element.remove();
      const words = text(body).split(/\s+/).filter(Boolean).length;
      const [min, max] = SEED_ARTICLES.has(article.slug) ? WORD_RANGE.seed : WORD_RANGE.other;
      report.check(words >= min && words <= max, `${rel}: ${words} words (${min}–${max})`);
    }
    // The ending band (founder feedback 2026-09-22): the other articles of
    // the page's language as .post cards — at least one, never the page
    // itself, every one an article of this language — and the blog link.
    const more = built.doc.querySelector(".article-more");
    const moreLinks = (more?.querySelectorAll(".post .post-title a") ?? []).map((a) => attr(a, "href"));
    const others = articles.filter((other) => other.path !== article.path).map((other) => other.path);
    report.check(more !== null && moreLinks.length >= 1 && moreLinks.every((href) => others.includes(href)), `${rel}: "more from the blog" lists other ${lang} articles (${moreLinks.length ? moreLinks.join(", ") : "none"})`);
    report.check(more !== null && (more.querySelectorAll("a[href]") ?? []).some((a) => attr(a, "href") === `${prefix}/blog/`), `${rel}: "more from the blog" links the ${lang} blog index`);
    if (listing && !article.scheduled) {
      // REQ-013, REQ-016: the listings are .post cards whose title link is the
      // article and whose draft label is the .chip-draft chip. A draft that
      // reaches here is a draft in a local build, where it is listed and wears
      // its label like any other article (si-mzf1). Which articles the index
      // lists is the index line's to check, below: it names each one missing
      // and each card for an article dated after today, which is built, as
      // the page above, but listed nowhere until that day (si-gxyg).
      const entry = listing.doc.querySelectorAll(".post").find((item) => attr(item.querySelector(".post-title a"), "href") === article.path);
      if (entry) report.check((text(entry.querySelector(".chip-draft")) === draftLabel) === article.draft, `${lang} blog index entry for ${article.slug} ${article.draft ? "carries" : "omits"} "${draftLabel}"`);
    }
    if (article.scheduled) {
      // No item for it. A listed article may still link it in its content:
      // it is unlisted, not secret, and its page is built (si-gyc4).
      report.check(!feedItems.includes(article.url), `${lang} feed has no item for ${article.slug} before ${article.date}`);
      continue;
    }
    const itemTitle = new RegExp(`<title>${article.draft ? `${draftLabel}: ` : ""}[^<]*</title>[\\s\\S]*?<link>${article.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</link>`);
    report.check(itemTitle.test(feed), `${lang} feed item for ${article.slug} ${article.draft ? `carries "${draftLabel}"` : "present"}`);
  }

  // The blog index (REQ-013, REQ-016; si-absd): exactly the listed articles
  // of the language, newest first — the list each category page shows its
  // share of and the landing page its first three. One line names every
  // article the index misses, every card it should not show and any other
  // order, and it is the only line that does: a line per article as well
  // gave one missing card two FAIL lines (si-eieu). The build fills the index
  // from posts_<lang> (eleventy.config.js); this works the list out from the
  // source tree.
  if (listing) {
    const want = listedNewestFirst(articles);
    const got = listing.doc.querySelectorAll(".post .post-title a").map((a) => attr(a, "href"));
    const problems = listingProblems(got, want, (href) => {
      const article = articles.find((item) => item.path === href);
      return article ? `${href} ${because(article)}` : `${href} (not a ${lang} article)`;
    });
    const unlisted = articles.filter((article) => !article.listed).map((article) => `${article.path} ${because(article)}`);
    report.check(problems.length === 0, `${listing.relPath}: lists exactly the listed ${lang} articles, newest first (${want.join(", ") || "none"})${unlisted.length > 0 ? `, not ${unlisted.join(", ")}` : ""}${problems.length > 0 ? ` — ${problems.join("; ")}` : ""}`);
  }

  // Category pages (REQ-013, REQ-016; si-thf3): each lists exactly the listed
  // articles of its category, newest first in the order of every listing —
  // not one of another category, not one of its own that is dated after
  // today or is a draft in the production build, and none of the others
  // missing. The build fills the page from a collection filtered on the
  // article's `category` (eleventy.config.js); this works the list out from
  // the source tree, and one line per page names what the page gets wrong.
  for (const { key } of categories) {
    const rel = `${prefix.replace(/^\//, "")}${prefix ? "/" : ""}blog/${key}/index.html`;
    const categoryPage = await page(rel);
    if (!categoryPage) continue;
    const own = articles.filter((article) => article.category === key);
    const want = listedNewestFirst(own);
    const got = categoryPage.doc.querySelectorAll(".post .post-title a").map((a) => attr(a, "href"));
    const problems = listingProblems(got, want, (href) => {
      const article = articles.find((item) => item.path === href);
      if (!article) return `${href} (not a ${lang} article)`;
      return article.category === key ? `${href} ${because(article)}` : `${href} (category ${article.category})`;
    });
    const unlisted = own.filter((article) => !article.listed).map((article) => `${article.path} ${because(article)}`);
    report.check(problems.length === 0, `${rel}: lists exactly the listed ${lang} articles of ${key}, newest first (${want.join(", ") || "none"})${unlisted.length > 0 ? `, not ${unlisted.join(", ")}` : ""}${problems.length > 0 ? ` — ${problems.join("; ")}` : ""}`);
  }
}

report.finish();
