import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOmitted, isProductionBuild, isScheduled, REQUIRED_KEYS, validateArticle } from "../scripts/lib/frontmatter.mjs";

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
  // (V8 rolls 30 February over into March; Luxon refuses it). Either one passed
  // `pnpm check` and then reddened the build.
  it("accepts the date forms the build accepts", () => {
    for (const date of [
      "2026-09-20",
      "2026-09-22T23:00",
      "2026-09-22T23:00:00",
      "2026-09-22T23:00:00Z",
      "2026-09-22T23:00:00+02:00",
      "2028-02-29",
    ]) {
      assert.deepEqual(validateArticle({ ...valid, date }, { allowedCategories }), [], `should accept ${date}`);
    }
  });

  it("rejects the date forms the build would throw on", () => {
    for (const date of ["2026-09-22 23:00", "2026-02-30", "2026-09-31", "2026-13-01", "yesterday"]) {
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
