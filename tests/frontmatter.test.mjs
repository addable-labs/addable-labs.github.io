import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { after, before, describe, it } from "node:test";
import yaml from "js-yaml";
import { DateTime } from "luxon";
import { frontMatterBlock, isOmitted, isProductionBuild, isScheduled, parseFrontMatter, REQUIRED_KEYS, siteNow, validateArticle, validateArticleDate } from "../scripts/lib/frontmatter.mjs";
import { loadSite, readArticleSources, walk } from "../scripts/lib/site.mjs";
import { buildSite, copyProject, ROOT, SRC, tempDir, utcDate } from "./helpers.mjs";

// The string dates the validator accepts and the ones it refuses, shared by
// its own cases and the checks of the date on its own and in the build.
const ACCEPTED_DATES = [
  "2026-09-20",
  "2026-09-22T23:00",
  "2026-09-22T23:00:00",
  "2026-09-22T23:00:00Z",
  "2026-09-22T23:00:00+02:00",
  "2028-02-29",
];
const REJECTED_DATES = ["2026-09-22 23:00", "2026-02-30", "2026-09-31", "2026-13-01", "yesterday"];

// Days that do not exist, typed the way every article types its date: YAML's
// timestamp type used to turn each into a real Date on another day (1 October,
// 2 March, 1 January 2027) before the check could see it (si-8zyg).
const IMPOSSIBLE_DAYS = ["2026-09-31", "2026-02-30", "2026-13-01"];

/** The instant Eleventy makes of a string date: Luxon, in UTC (Template.js, getMappedDate). */
function eleventyReads(date) {
  return DateTime.fromISO(date, { zone: "utc" }).toJSDate();
}

/** Run `fn` as on a build machine in another time zone, then put the zone back. */
async function inZone(zone, fn) {
  const saved = process.env.TZ;
  process.env.TZ = zone;
  try {
    return await fn();
  } finally {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  }
}

const allowedCategories = ["app-development", "ai-journey"];
const valid = {
  title: "A valid article",
  description: "One sentence.",
  date: new Date("2026-09-20"),
  category: "ai-journey",
  translationKey: "a-valid-article",
  draft: true,
  aiGenerated: true,
  humanReviewed: false,
  lang: "en",
};

describe("article front-matter validator", () => {
  it("accepts a valid article", () => {
    assert.deepEqual(validateArticle(valid, { allowedCategories, dirLang: "en", file: "src/en/blog/posts/a.md" }), []);
  });

  it("rejects an unknown category naming the file and the allowed keys", () => {
    assert.throws(
      () => validateArticle({ ...valid, category: "nope" }, { allowedCategories, dirLang: "en", file: "src/en/blog/posts/a.md" }),
      /Invalid article front matter in src\/en\/blog\/posts\/a\.md: unknown category "nope"; allowed keys: app-development, ai-journey/,
    );
  });

  it("reports every missing required key", () => {
    assert.equal(REQUIRED_KEYS.length, 8);
    assert.throws(() => validateArticle({}, { allowedCategories }), new RegExp(`missing required keys: ${REQUIRED_KEYS.join(", ")}`));
  });

  // aiGenerated says how the text came to exist and humanReviewed whether a
  // person has read it; the two are independent, so all four combinations are
  // valid and only a non-boolean is a problem.
  it("accepts every combination of aiGenerated and humanReviewed, and rejects a non-boolean", () => {
    for (const aiGenerated of [true, false]) {
      for (const humanReviewed of [true, false]) {
        assert.deepEqual(validateArticle({ ...valid, aiGenerated, humanReviewed }, { allowedCategories }), []);
      }
    }
    assert.throws(
      () => validateArticle({ ...valid, aiGenerated: "yes" }, { allowedCategories }),
      /aiGenerated must be true or false, got "yes"/,
    );
    assert.throws(
      () => validateArticle({ ...valid, humanReviewed: "no" }, { allowedCategories }),
      /humanReviewed must be true or false, got "no"/,
    );
  });

  it("rejects a non-slug translationKey, a non-boolean draft and a lang mismatch", () => {
    assert.throws(
      () => validateArticle({ ...valid, translationKey: "Not A Slug", draft: "yes", lang: "sv" }, { allowedCategories, dirLang: "en" }),
      /translationKey must be a slug.*draft must be true or false.*lang "sv" does not match the directory language "en"/s,
    );
  });

  // Eleventy parses a *string* date with Luxon and throws the whole build when
  // Luxon says invalid, so this gate has to be no looser than Luxon is. It used
  // to lean on `new Date()`, which is more forgiving in the two ways a person
  // actually writes a date: a space for the T, and a day that does not exist
  // (V8 rolls 30 February over into March; Luxon refuses it). It would have
  // passed either one; only Eleventy's own error stopped them.
  it("accepts the date forms the build accepts", () => {
    for (const date of ACCEPTED_DATES) {
      assert.deepEqual(validateArticle({ ...valid, date }, { allowedCategories }), [], `should accept ${date}`);
    }
  });

  it("rejects the date forms the build would throw on", () => {
    for (const date of REJECTED_DATES) {
      assert.throws(
        () => validateArticle({ ...valid, date }, { allowedCategories }),
        /date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\), got /,
        `should reject ${date}`,
      );
    }
  });

  // The space form is the one that bit: `date: 2026-09-22 23:00` is not a YAML
  // timestamp either (that needs seconds), so it really does reach the build as
  // a string. The message has to name the forms that would have worked.
  it("names the accepted forms in the message", () => {
    assert.throws(
      () => validateArticle({ ...valid, date: "2026-09-22 23:00" }, { allowedCategories }),
      /date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\), got "2026-09-22 23:00"/,
    );
  });

  // Front matter no longer makes a Date of anything (si-8zyg), but a date set
  // in JavaScript — a data file, a computed value — still arrives as one and
  // never goes near the pattern; that path must keep working.
  it("still accepts a Date object, and rejects an unparsable one", () => {
    assert.deepEqual(validateArticle({ ...valid, date: new Date("2026-09-22") }, { allowedCategories }), []);
    assert.throws(
      () => validateArticle({ ...valid, date: new Date("nope") }, { allowedCategories }),
      /date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\)/,
    );
  });
});

// The date on its own, as the build checks it while Eleventy maps it
// (si-xpn0): the same rule as `validateArticle`, in the same words.
describe("article date, checked on its own", () => {
  const file = "./src/en/blog/posts/a.md";

  it("accepts every date validateArticle accepts, and hands nothing back", () => {
    for (const date of [...ACCEPTED_DATES, new Date("2026-09-22")]) {
      assert.equal(validateArticleDate(date, { file }), undefined, `should accept ${date}`);
    }
  });

  it("refuses every date validateArticle refuses, word for word", () => {
    // 2026 is what YAML makes of `date: 2026`.
    for (const date of [...REJECTED_DATES, 2026, new Date("nope")]) {
      const expected = thrownBy(() => validateArticle({ ...valid, date }, { allowedCategories, file }));
      assert.throws(() => validateArticleDate(date, { file }), { message: expected }, `should refuse ${date}`);
    }
  });

  // Eleventy parses neither a missing date nor an empty one — it falls back to
  // the file's own dates — so there is no error of Eleventy's to get ahead of:
  // both stay with validateArticle, which reports them with the rest.
  it("leaves a missing or an empty date to validateArticle", () => {
    for (const date of [undefined, null, ""]) {
      assert.equal(validateArticleDate(date, { file }), undefined, String(date));
    }
    assert.throws(() => validateArticle({ ...valid, date: undefined }, { allowedCategories }), /missing required key: date/);
    assert.throws(() => validateArticle({ ...valid, date: "" }, { allowedCategories }), /date must be .*, got ""/);
  });
});

/** The message of the Error `fn` throws; fails the test when it throws none. */
function thrownBy(fn) {
  try {
    fn();
  } catch (error) {
    return error.message;
  }
  return assert.fail("expected an error");
}

// How front matter is read (si-8zyg): the build (eleventy.config.js makes this
// Eleventy's YAML engine) and the gates (scripts/lib/site.mjs) read it with
// `parseFrontMatter` — js-yaml's default schema, which Eleventy's own engine
// used, less the timestamp type. A date stays the text that was typed, and
// nothing else changes.
describe("reading front matter", () => {
  it("keeps a date as the text that was typed, quoted or not, a day that does not exist included", () => {
    for (const date of [...ACCEPTED_DATES, ...IMPOSSIBLE_DAYS]) {
      for (const typed of [date, `"${date}"`, `'${date}'`]) {
        assert.equal(parseFrontMatter(`date: ${typed}`).date, date, typed);
      }
    }
  });

  // YAML used to hand Eleventy a Date for most of these; Eleventy now parses
  // the text itself. Every form the check accepts has to come out as the same
  // instant as before, or an article would move.
  it("gives every accepted form the instant YAML gave it", () => {
    const forms = [...ACCEPTED_DATES, "2026-09-22T23:00Z", "2026-09-22T23:59:59.999Z", "2026-09-22T01:00:00.123456+02:00"];
    for (const date of forms) {
      const before = yaml.load(`date: ${date}`).date;
      const was = before instanceof Date ? before : eleventyReads(before);
      assert.equal(eleventyReads(parseFrontMatter(`date: ${date}`).date).toISOString(), was.toISOString(), date);
    }
  });

  it("reads every other kind of value as js-yaml's default schema does", () => {
    const text = [
      "flag: true",
      "capital: True",
      "cleared: false",
      "word: yes",
      "nothing: null",
      "tilde: ~",
      "empty:",
      "integer: 42",
      "hex: 0x1F",
      "octal: 0o17",
      "float: 3.14",
      "infinity: .inf",
      "nan: .nan",
      "version: 1.10",
      "plain: plain text",
      'quoted: "a title: with a colon"',
      "single: 'it''s'",
      "folded: >\n  one\n  two",
      "literal: |\n  one\n  two",
      "list: [a, 1, true]",
      "map: { key: value }",
      "base: &base { x: 1 }",
      "merged:\n  <<: *base\n  y: 2",
      "binary: !!binary aGVsbG8=",
      "set: !!set { a, b }",
      "pairs: !!pairs [ { a: 1 }, { a: 2 } ]",
      "tagged: !!str 2026-09-22",
    ].join("\n");
    assert.deepEqual(parseFrontMatter(text), yaml.load(text));
  });

  // Every page of the site, articles and the rest, against what Eleventy's own
  // engine made of it: the same values, but for a date YAML made a Date of,
  // which is now its text and gives Eleventy the same instant. Every article
  // types its date that way today, as the README shows.
  it("reads every page's front matter as before, a date aside, which keeps its instant", async () => {
    let pages = 0;
    let dated = 0;
    for (const file of await walk(SRC)) {
      if (!/\.(md|njk)$/.test(file)) continue;
      const block = frontMatterBlock(await readFile(file, "utf8"));
      if (block === undefined) continue;
      pages += 1;
      const now = parseFrontMatter(block) ?? {};
      const before = yaml.load(block) ?? {};
      if (before.date instanceof Date) {
        dated += 1;
        assert.equal(eleventyReads(now.date).toISOString(), before.date.toISOString(), file);
      } else {
        assert.equal(now.date, before.date, file);
      }
      assert.deepEqual({ ...now, date: undefined }, { ...before, date: undefined }, file);
    }
    assert.ok(pages > dated && dated > 0, `${pages} pages, ${dated} with a date YAML made a Date of`);
  });

  // An explicit tag must not bring the type back: nothing here writes one.
  it("refuses an explicit !!timestamp", () => {
    assert.throws(() => parseFrontMatter("date: !!timestamp 2026-09-31"), /unknown tag/);
  });

  // The engine is Eleventy's minus one type, and the gates read a date as
  // Eleventy does, only while both come from the copies Eleventy itself uses:
  // package.json pins js-yaml and luxon to the versions Eleventy resolves.
  // When an Eleventy upgrade moves either one, move the pin with it.
  it("uses the very copies of js-yaml and luxon that Eleventy uses", () => {
    const ours = createRequire(import.meta.url);
    const eleventys = createRequire(import.meta.resolve("@11ty/eleventy"));
    for (const name of ["js-yaml", "luxon"]) {
      assert.equal(
        realpathSync(ours.resolve(`${name}/package.json`)),
        realpathSync(eleventys.resolve(`${name}/package.json`)),
        name,
      );
    }
  });
});

// How the block is split off a file (si-0eez). Eleventy hands every file to
// gray-matter and the gates split with `frontMatterBlock`, which follows
// gray-matter's rules; these cases hold the one to the other. gray-matter is
// the copy Eleventy loads, called with the engine eleventy.config.js gives it,
// and the two must split off the same block and read the same data from it,
// however a file opens and closes its block, and on every page of the site.
describe("splitting front matter off a file", () => {
  const matter = createRequire(import.meta.resolve("@11ty/eleventy"))("gray-matter");
  const byBuild = (text) => {
    const file = matter(text, { engines: { yaml: parseFrontMatter } });
    return { block: file.matter ?? "", data: file.data };
  };
  const byGates = (text) => {
    const block = frontMatterBlock(text) ?? "";
    return { block, data: parseFrontMatter(block) ?? {} };
  };

  it("splits off the block the build does, and reads the same data from it, however the file opens and closes it", () => {
    const texts = {
      "Unix line endings": "---\ntitle: A\ndraft: true\n---\nThe body.\n",
      "Windows line endings": "---\r\ntitle: A\r\ndraft: true\r\n---\r\nThe body.\r\n",
      "a byte-order mark": "\uFEFF---\ntitle: A\ndraft: true\n---\nThe body.\n",
      "the language named": "---yaml\ntitle: A\n---\nThe body.\n",
      "the language named in capitals, between spaces": "--- YAML \ntitle: A\n---\nThe body.\n",
      "yml named, with Windows line endings": "---yml\r\ntitle: A\r\n---\r\nThe body.\r\n",
      "spaces after the opening dashes": "---  \ntitle: A\n---\nThe body.\n",
      "no closing line": "---\ntitle: A\ndraft: true\n",
      "a closing line of five dashes": "---\ntitle: A\n-----\nThe body.\n",
      "four dashes, which open no block": "----\ntitle: A\n----\nThe body.\n",
      "no front matter": "title: A\n",
      "an empty block": "---\n---\nThe body.\n",
      "a block of comments": "---\n# a comment\n---\nThe body.\n",
      "three dashes and nothing else": "---",
      "one line and no line end": "---a",
      "nothing at all": "",
    };
    for (const [name, text] of Object.entries(texts)) assert.deepEqual(byGates(text), byBuild(text), name);
  });

  it("splits every page of the site as the build does", async () => {
    let pages = 0;
    for (const file of await walk(SRC)) {
      if (!/\.(md|njk)$/.test(file)) continue;
      const text = await readFile(file, "utf8");
      assert.deepEqual(byGates(text), byBuild(text), file);
      pages += 1;
    }
    assert.ok(pages > 0);
  });

  // The build reads a block in another language with an engine that is not
  // ours — JSON's, or Eleventy's JavaScript — so the gates cannot promise to
  // read it the same way and refuse it: a check may stop where the build
  // would have gone on, never the other way round. Nothing here writes one.
  it("refuses a block in any language but YAML, naming the file and the opening line", () => {
    for (const opening of ["---json", "---js", "---javascript", "--- toml"]) {
      assert.throws(
        () => frontMatterBlock(`${opening}\n{ "title": "A" }\n---\nThe body.\n`, { file: "src/en/blog/posts/a.md" }),
        { message: `Front matter in src/en/blog/posts/a.md must be YAML (---, ---yaml or ---yml), got ${JSON.stringify(opening)}` },
        opening,
      );
    }
  });
});

// The order in the build (si-xpn0). Eleventy maps a page's date while it
// gathers the page's data, before any preprocessor runs, so a bad date used to
// stop the build with Eleventy's own error, which names the value but not the
// rule, and the validator above was never reached. The date is now checked as
// Eleventy maps it. Each case builds a copy of the project with front-matter
// lines of one or more articles set as a person would type them.
describe("an article date in the build", () => {
  const ELEVENTY_DATE_ERROR = /Data cascade value for `date`/;
  let tmp;
  let project;
  let builds = 0;
  let touched = [];
  before(async () => {
    tmp = await tempDir("dates-");
    project = await copyProject(path.join(tmp.dir, "project"));
  });
  after(() => tmp.cleanup());

  const article = (lang, slug) => path.join("src", lang, "blog", "posts", `${slug}.md`);

  /**
   * Build the copy with these lines set — `{ [file]: { key: "value as
   * typed" } }`, a key the file lacks added at the top of its front matter —
   * and every other file as the repository has it, in the environment `env`
   * adds to. Returns the output directory; throws with the build's output
   * when it fails.
   */
  async function buildWith(edits, env = {}) {
    for (const file of touched) await copyFile(path.join(ROOT, file), path.join(project, file));
    touched = Object.keys(edits);
    for (const [file, lines] of Object.entries(edits)) {
      let text = await readFile(path.join(ROOT, file), "utf8");
      for (const [key, value] of Object.entries(lines)) {
        const line = new RegExp(`^${key}:.*$`, "m");
        text = line.test(text) ? text.replace(line, `${key}: ${value}`) : text.replace(/^---\n/, `---\n${key}: ${value}\n`);
      }
      await writeFile(path.join(project, file), text);
    }
    builds += 1;
    return buildSite(path.join(tmp.dir, `site-${builds}`), env, project);
  }

  /** The output of a build that has to fail. */
  async function failure(edits) {
    try {
      await buildWith(edits);
    } catch (error) {
      return error.message;
    }
    return assert.fail("the build should have failed");
  }

  const EN = article("en", "why-we-run-an-agent-run-factory");

  // The one that bit: a space for the T, typed without quotes. A time without
  // seconds is no YAML timestamp, so it reaches the build as a string.
  it("fails a date with a space for the T in our words, naming the forms that work", async () => {
    const output = await failure({ [EN]: { date: "2026-09-22 23:00" } });
    assert.ok(
      output.includes(
        'Invalid article front matter in ./src/en/blog/posts/why-we-run-an-agent-run-factory.md: date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS)(Z), got "2026-09-22 23:00"',
      ),
      output,
    );
    assert.doesNotMatch(output, ELEVENTY_DATE_ERROR);
  });

  it("fails every date the validator refuses in the same words, in either language", async () => {
    // Written as JSON, which YAML reads back as the same value: each string
    // quoted, and 2026 the number Eleventy used to refuse with a type error of
    // its own. The language alternates so both directories are covered.
    for (const [index, date] of [...REJECTED_DATES, 2026].entries()) {
      const file = article(index % 2 ? "sv" : "en", "why-we-run-an-agent-run-factory");
      const output = await failure({ [file]: { date: JSON.stringify(date) } });
      const ours = thrownBy(() => validateArticleDate(date, { file: `./${file}` }));
      assert.ok(output.includes(ours), `${date}:\n${output}`);
      assert.doesNotMatch(output, ELEVENTY_DATE_ERROR, String(date));
    }
  });

  // The hole si-8zyg closes. Typed without quotes, as every article types its
  // date, a day that does not exist was turned into a Date on another day by
  // YAML before the check saw it, and the article went out on that day with
  // no error. Front matter now keeps the text, and the check refuses it.
  for (const date of IMPOSSIBLE_DAYS) {
    it(`fails ${date} typed without quotes in our words, in either language`, async () => {
      for (const lang of ["en", "sv"]) {
        const file = article(lang, "why-we-run-an-agent-run-factory");
        const output = await failure({ [file]: { date } });
        assert.ok(
          output.includes(`Invalid article front matter in ./${file}: date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS)(Z), got "${date}"`),
          `${lang}:\n${output}`,
        );
        assert.doesNotMatch(output, ELEVENTY_DATE_ERROR, lang);
      }
    });
  }

  // Every form the check accepts, typed as is and again in quotes, each on
  // the UTC day it names. Before si-8zyg YAML made a Date of the unquoted
  // bare date, the time with seconds, the UTC time and the offset, and the
  // rest reached Eleventy as text; now all of it does. The builds run 14
  // hours ahead of UTC, where a date read as the machine's own time would
  // land a day early.
  it("builds every accepted form on the day it names, typed with quotes or without", async () => {
    const forms = [
      ["en", "why-we-run-an-agent-run-factory", "2026-09-19", "2026-09-19"],
      ["en", "how-this-site-was-built-by-agents", "2026-09-18T01:00", "2026-09-18"],
      ["en", "ashlands-what-one-prompt-built", "2026-09-17T01:00:00", "2026-09-17"],
      ["en", "lessons-from-building-niva", "2026-09-16T01:00:00Z", "2026-09-16"],
      // 01:00 at +02:00 is 23:00 UTC the day before: the offset is honoured.
      ["sv", "why-we-run-an-agent-run-factory", "2026-09-15T01:00:00+02:00", "2026-09-14"],
    ];
    for (const quote of ["", '"']) {
      const edits = Object.fromEntries(forms.map(([lang, slug, date]) => [article(lang, slug), { date: `${quote}${date}${quote}` }]));
      const out = await buildWith(edits, { TZ: "Pacific/Kiritimati" });
      for (const [lang, slug, date, day] of forms) {
        const html = await readFile(path.join(out, lang === "en" ? "" : lang, "blog", slug, "index.html"), "utf8");
        assert.equal(html.match(/class="article-meta">\s*<time datetime="([^"]+)"/)[1], day, `${quote}${date}${quote}`);
      }
    }
  });

  // The engine reads every page, not only the articles. A page that is not
  // an article gets its date the same way — kept as typed, parsed by
  // Eleventy — so a day that does not exist stops the build there too, in
  // Eleventy's own words, where YAML used to roll it over. A real date on
  // such a page still builds: tests/sitemap.test.mjs dates the Swedish home
  // page.
  it("stops the build on a day that does not exist on a page that is not an article, in Eleventy's words", async () => {
    const output = await failure({ [path.join("src", "sv", "index.njk")]: { date: "2026-09-31" } });
    assert.match(output, /Data cascade value for `date` \(2026-09-31\) is invalid for \.\/src\/sv\/index\.njk/);
    assert.doesNotMatch(output, /Invalid article front matter/);
  });

  // Which error wins when the date is not the only problem: the date, alone.
  // Eleventy cannot place a page without its date, so the date is the problem
  // the build stops at; the rest is reported, as before, once it is right.
  it("reports a bad date first when the file has another problem, and the rest once the date is right", async () => {
    const both = await failure({ [EN]: { date: "2026-09-22 23:00", category: "nope" } });
    assert.match(both, /why-we-run-an-agent-run-factory\.md: date must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\), got "2026-09-22 23:00"/);
    assert.doesNotMatch(both, /unknown category/);
    assert.doesNotMatch(both, ELEVENTY_DATE_ERROR);
    const rest = await failure({ [EN]: { category: "nope" } });
    assert.match(
      rest,
      /Invalid article front matter in \.\/src\/en\/blog\/posts\/why-we-run-an-agent-run-factory\.md: unknown category "nope"; allowed keys: app-development, ai-journey/,
    );
    assert.doesNotMatch(rest, /date must be/);
  });
});

// The rule the build and the gates share (si-gxyg): an article dated after
// today is built but listed nowhere until the day it is dated.
describe("scheduled articles", () => {
  // Late on 22 September UTC, and the same instant seen from a machine two
  // hours ahead — the comparison must give the same answer in both.
  const lateOn22nd = new Date("2026-09-22T23:30:00Z");

  it("does not schedule an article dated today, at any hour of that day", () => {
    assert.equal(isScheduled("2026-09-22", new Date("2026-09-22T00:00:00Z")), false);
    assert.equal(isScheduled("2026-09-22", lateOn22nd), false);
    assert.equal(isScheduled(new Date("2026-09-22"), lateOn22nd), false);
  });

  it("does not schedule an article dated in the past", () => {
    assert.equal(isScheduled("2026-09-21", lateOn22nd), false);
    assert.equal(isScheduled("2020-01-01", lateOn22nd), false);
  });

  it("schedules an article dated tomorrow, however little of today is left", () => {
    assert.equal(isScheduled("2026-09-23", lateOn22nd), true);
    assert.equal(isScheduled(new Date("2026-09-23"), lateOn22nd), true);
    assert.equal(isScheduled("2027-01-01", lateOn22nd), true);
  });

  it("reads both the date and the moment as UTC, so no article shifts by a day", () => {
    // 01:30 on the 23rd in Stockholm is still the 22nd in UTC: an article
    // dated the 23rd stays scheduled until UTC reaches it.
    assert.equal(isScheduled("2026-09-23", new Date("2026-09-22T23:30:00+02:00")), true);
    assert.equal(isScheduled("2026-09-23", new Date("2026-09-23T00:00:00Z")), false);
  });

  // The build asks with the date Eleventy made, the gates with the text that
  // was typed (scripts/lib/site.mjs). A time without a zone is UTC to
  // Eleventy, so it has to be here too, on a machine far ahead of UTC and on
  // one far behind it: `new Date()` read it as the machine's own time.
  it("reads a time typed without a zone as UTC, as the build does, in any time zone", async () => {
    for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      await inZone(zone, () => {
        assert.equal(isScheduled("2026-09-23T00:30", lateOn22nd), true, zone);
        assert.equal(isScheduled("2026-09-22T23:45", lateOn22nd), false, zone);
      });
    }
  });
});

// The moment a build or a gate takes for now (si-nka4): the one SITE_NOW
// names, typed and read like an article's date, or the clock when it names
// none. Whatever runs several builds and gates sets it once for all of them.
describe("now, as the build and the gates take it", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("now-");
  });
  after(() => tmp.cleanup());

  it("reads SITE_NOW as an article's date is read, in UTC unless it names a zone, in any time zone", async () => {
    const forms = [
      ["2026-09-24", "2026-09-24T00:00:00.000Z"],
      ["2026-09-24T04:17", "2026-09-24T04:17:00.000Z"],
      ["2026-09-24T04:17:00", "2026-09-24T04:17:00.000Z"],
      // What toISOString() writes, and so what `pnpm check` and the tests set.
      ["2026-09-24T04:17:00.123Z", "2026-09-24T04:17:00.123Z"],
      ["2026-09-24T01:30:00+02:00", "2026-09-23T23:30:00.000Z"],
    ];
    for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      await inZone(zone, () => {
        for (const [value, instant] of forms) assert.equal(siteNow({ SITE_NOW: value }).toISOString(), instant, `${value} in ${zone}`);
      });
    }
  });

  it("reads the clock when SITE_NOW is unset or empty", () => {
    for (const env of [{}, { SITE_NOW: "" }]) {
      const before = Date.now();
      const now = siteNow(env).getTime();
      assert.ok(before <= now && now <= Date.now(), JSON.stringify(env));
    }
  });

  it("refuses a SITE_NOW it cannot read, naming the forms it takes, rather than reading the clock", () => {
    // Besides the dates an article may not have: a blank, a count of seconds,
    // and the form a mail header writes, which `new Date()` would read.
    for (const value of [...REJECTED_DATES, " ", "1790183964", "Wed, 23 Sep 2026 17:19:24 GMT"]) {
      assert.throws(() => siteNow({ SITE_NOW: value }), { message: `SITE_NOW must be YYYY-MM-DD or YYYY-MM-DDTHH:MM(:SS)(Z), got ${JSON.stringify(value)}` }, value);
    }
  });

  it("is the moment isScheduled takes when it is given none", () => {
    // SITE_NOW holds this file's moment (tests/helpers.mjs); two others, briefly.
    const saved = process.env.SITE_NOW;
    try {
      process.env.SITE_NOW = "2026-09-22T23:59:59.500Z";
      assert.equal(isScheduled("2026-09-23"), true);
      process.env.SITE_NOW = "2026-09-23T00:00:00.500Z";
      assert.equal(isScheduled("2026-09-23"), false);
    } finally {
      if (saved === undefined) delete process.env.SITE_NOW;
      else process.env.SITE_NOW = saved;
    }
  });

  it("fails the build on a SITE_NOW it cannot read", () => {
    assert.throws(() => buildSite(path.join(tmp.dir, "site"), { SITE_NOW: "tomorrow" }), /SITE_NOW must be YYYY-MM-DD or YYYY-MM-DDTHH:MM\(:SS\)\(Z\), got "tomorrow"/);
  });
});

// The gates work out from the article sources what the built site must show
// (scripts/lib/site.mjs, readArticleSources), so they have to read them as the
// build does. They used to read each key with a regular expression: a quoted
// date kept its quotes, `draft: True` was no draft, and `new Date()` read the
// date — quoted, or with a time and no zone — as the machine's own time, so
// near an article's date the gates could fail a good build. Each article here
// is typed so that such a reading gets it wrong: the flag anywhere, each date
// in one of the two zones.
describe("the gates read an article's front matter as the build does", () => {
  let tmp;
  let src;
  const today = utcDate(0);
  const tomorrow = utcDate(1);
  before(async () => {
    tmp = await tempDir("sources-");
    src = path.join(tmp.dir, "src");
    const dir = path.join(src, "en", "blog", "posts");
    await mkdir(dir, { recursive: true });
    const lines = {
      "quoted-tomorrow": [`title: "Quoted: a title"`, `date: "${tomorrow}"`, "draft: false"],
      "tomorrow-after-midnight": ["title: After midnight", `date: ${tomorrow}T00:30`, "draft: false"],
      "today-before-midnight": ["title: Before midnight", `date: ${today}T23:59`, "draft: false"],
      "capital-true": ["title: A draft", `date: ${today}`, "draft: True"],
    };
    for (const [slug, front] of Object.entries(lines)) {
      await writeFile(path.join(dir, `${slug}.md`), ["---", ...front, "---", "", "The body.", ""].join("\n"));
    }
  });
  after(() => tmp.cleanup());

  for (const zone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
    it(`reads the title, the date, the schedule and the draft flag as the build does, in ${zone}`, async () => {
      const site = await loadSite(SRC);
      const read = await inZone(zone, () => readArticleSources(src, site, "en"));
      const by = Object.fromEntries(read.map((article) => [article.slug, article]));
      assert.equal(by["quoted-tomorrow"].title, "Quoted: a title");
      assert.equal(by["quoted-tomorrow"].date, tomorrow);
      assert.equal(by["quoted-tomorrow"].scheduled, true);
      assert.equal(by["tomorrow-after-midnight"].scheduled, true);
      assert.equal(by["today-before-midnight"].scheduled, false);
      assert.equal(by["capital-true"].draft, true);
    });
  }
});

// The same for the block as a whole (si-0eez). The gates used to cut it out
// with /^---\n([\s\S]*?)\n---/, while Eleventy's gray-matter splits it by rules
// of its own, so an article saved in any of the ways below had no front matter
// to the gates — no draft flag, no date, no category — and the gates and the
// build disagreed about drafts and scheduling. A copy of the project carries
// one article saved each way, a draft with a date and a category in both
// languages, and is built; the article's page shows what the build read — the
// date, the category chip and the draft chip — and the gates must read the
// same from the source.
describe("the gates split an article's front matter off as the build does", () => {
  const SAVED = [
    ["saved with Windows line endings", "windows-line-endings", (text) => text.replaceAll("\n", "\r\n")],
    ["whose opening line names its language (---yaml)", "language-named", (text) => text.replace(/^---\n/, "---yaml\n")],
    ["saved with a byte-order mark", "byte-order-mark", (text) => `\uFEFF${text}`],
    ["with spaces after its opening ---", "spaces-after-dashes", (text) => text.replace(/^---\n/, "---  \n")],
  ];
  let tmp;
  let src;
  let out;
  before(async () => {
    tmp = await tempDir("split-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    src = path.join(project, "src");
    for (const [index, [, slug, save]] of SAVED.entries()) {
      const front = [`date: 2026-09-0${index + 1}`, `category: ${index % 2 ? "ai-journey" : "app-development"}`, `translationKey: ${slug}`, "draft: true"];
      for (const lang of ["en", "sv"]) {
        const text = ["---", `title: Saved ${slug}`, "description: One sentence.", ...front, "aiGenerated: true", "humanReviewed: false", "---", "", "The body.", ""].join("\n");
        await writeFile(path.join(src, lang, "blog", "posts", `${slug}.md`), save(text));
      }
    }
    out = buildSite(path.join(tmp.dir, "site"), {}, project);
  });
  after(() => tmp.cleanup());

  for (const [how, slug] of SAVED) {
    it(`reads the draft flag, the date and the category the build reads from an article ${how}`, async () => {
      const site = await loadSite(SRC);
      for (const lang of ["en", "sv"]) {
        const article = (await readArticleSources(src, site, lang)).find((source) => source.slug === slug);
        const html = await readFile(path.join(out, article.path, "index.html"), "utf8");
        const meta = /<p class="article-meta">([\s\S]*?)<\/p>/.exec(html)[1];
        const page = {
          draft: meta.includes("chip-draft"),
          date: /<time datetime="([^"]+)"/.exec(meta)[1],
          category: /class="chip chip-cat" href="[^"]*\/blog\/([^/"]+)\/"/.exec(meta)[1],
        };
        assert.deepEqual({ draft: article.draft, date: article.date, category: article.category }, page, lang);
      }
    });
  }

  // A block in another language stops the gates, naming the file ("splitting
  // front matter off a file" above).
  it("stops at an article whose front matter is not YAML, naming the file", async () => {
    const dir = path.join(tmp.dir, "json", "en", "blog", "posts");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "a.md"), '---json\n{ "title": "A" }\n---\nThe body.\n');
    await assert.rejects(readArticleSources(path.join(tmp.dir, "json"), await loadSite(SRC), "en"), {
      message: `Front matter in ${path.join(dir, "a.md")} must be YAML (---, ---yaml or ---yml), got "---json"`,
    });
  });
});

// The rule that keeps a draft off the public web (si-mzf1): a draft is built
// and listed everywhere except the production build, which does not carry it
// at all. Unlike `isScheduled` this one asks about the build, not the clock.
describe("drafts and the production build", () => {
  it("calls a build production only on SITE_ENV=production", () => {
    assert.equal(isProductionBuild({ SITE_ENV: "production" }), true);
    assert.equal(isProductionBuild({ SITE_ENV: "development" }), false);
    assert.equal(isProductionBuild({}), false);
  });

  it("defaults to development, so forgetting the variable cannot publish a draft", () => {
    // Every spelling but the exact one is a local build: unset, empty, the
    // wrong case, a stray space.
    for (const value of [undefined, "", "Production", "PRODUCTION", " production", "prod", "1", "true"]) {
      assert.equal(isProductionBuild({ SITE_ENV: value }), false, JSON.stringify(value));
    }
  });

  it("omits a draft from the production build and from no other", () => {
    assert.equal(isOmitted({ draft: true }, true), true);
    assert.equal(isOmitted({ draft: true }, false), false);
  });

  it("never omits an article that is not a draft", () => {
    assert.equal(isOmitted({ draft: false }, true), false);
    assert.equal(isOmitted({ draft: undefined }, true), false);
    // `draft` is validated as a boolean, so nothing else should reach this;
    // if something does, it is not a draft and stays in the build.
    assert.equal(isOmitted({ draft: "true" }, true), false);
  });

  it("is a different rule from scheduling: neither implies the other", () => {
    // A draft dated in the past is omitted from production but not scheduled;
    // an article dated tomorrow is scheduled but built in production.
    const tomorrow = new Date("2026-09-23");
    const lateOn22nd = new Date("2026-09-22T23:30:00Z");
    assert.equal(isOmitted({ draft: true }, true), true);
    assert.equal(isScheduled("2020-01-01", lateOn22nd), false);
    assert.equal(isOmitted({ draft: false }, true), false);
    assert.equal(isScheduled(tomorrow, lateOn22nd), true);
  });
});
