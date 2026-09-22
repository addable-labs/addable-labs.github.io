import assert from "node:assert/strict";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { isOmitted, isProductionBuild, isScheduled, REQUIRED_KEYS, validateArticle, validateArticleDate } from "../scripts/lib/frontmatter.mjs";
import { buildSite, copyProject, ROOT, tempDir } from "./helpers.mjs";

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

  // A YAML date (`date: 2026-09-22`, no quotes) is parsed into a Date before it
  // gets here and never goes near the pattern; that path must keep working.
  it("still accepts a YAML date as a Date object, and rejects an unparsable one", () => {
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
   * Build the copy with these lines set — `{ [article]: { key: "value as
   * typed" } }` — and every other article as the repository has it. Returns
   * the output directory; throws with the build's output when it fails.
   */
  async function buildWith(edits) {
    for (const file of touched) await copyFile(path.join(ROOT, file), path.join(project, file));
    touched = Object.keys(edits);
    for (const [file, lines] of Object.entries(edits)) {
      let text = await readFile(path.join(ROOT, file), "utf8");
      for (const [key, value] of Object.entries(lines)) {
        text = text.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
      }
      await writeFile(path.join(project, file), text);
    }
    builds += 1;
    return buildSite(path.join(tmp.dir, `site-${builds}`), {}, project);
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

  // Quoted where YAML would otherwise make a Date of it, so each reaches the
  // check as a string, the form it rules on; an unquoted bare date, a YAML
  // Date, is what every article in the repository carries.
  it("still builds a bare date, a time, a UTC time and an offset, each on the day it names", async () => {
    const out = await buildWith({
      [EN]: { date: '"2026-09-19"' },
      [article("en", "how-this-site-was-built-by-agents")]: { date: "2026-09-18T23:00" },
      [article("en", "ashlands-what-one-prompt-built")]: { date: '"2026-09-17T23:00:00Z"' },
      [article("sv", "why-we-run-an-agent-run-factory")]: { date: '"2026-09-17T01:00:00+02:00"' },
    });
    const day = async (...parts) => {
      const html = await readFile(path.join(out, ...parts, "index.html"), "utf8");
      return html.match(/class="article-meta">\s*<time datetime="([^"]+)"/)[1];
    };
    assert.equal(await day("blog", "why-we-run-an-agent-run-factory"), "2026-09-19");
    assert.equal(await day("blog", "how-this-site-was-built-by-agents"), "2026-09-18");
    assert.equal(await day("blog", "ashlands-what-one-prompt-built"), "2026-09-17");
    // 01:00 at +02:00 is 23:00 UTC the day before: the offset is honoured.
    assert.equal(await day("sv", "blog", "why-we-run-an-agent-run-factory"), "2026-09-16");
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
