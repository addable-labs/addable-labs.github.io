import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REQUIRED_KEYS, validateArticle } from "../scripts/lib/frontmatter.mjs";

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
