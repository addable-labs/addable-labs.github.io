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
  machineTranslated: false,
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
    assert.throws(() => validateArticle({}, { allowedCategories }), new RegExp(`missing required keys: ${REQUIRED_KEYS.join(", ")}`));
  });

  it("rejects a non-slug translationKey, a non-boolean draft and a lang mismatch", () => {
    assert.throws(
      () => validateArticle({ ...valid, translationKey: "Not A Slug", draft: "yes", lang: "sv" }, { allowedCategories, dirLang: "en" }),
      /translationKey must be a slug.*draft must be true or false.*lang "sv" does not match the directory language "en"/s,
    );
  });

  it("accepts ISO date strings and rejects nonsense dates", () => {
    assert.deepEqual(validateArticle({ ...valid, date: "2026-09-20" }, { allowedCategories }), []);
    assert.throws(() => validateArticle({ ...valid, date: "yesterday" }, { allowedCategories }), /date must be a valid date/);
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
