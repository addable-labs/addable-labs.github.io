import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { articleBody, ENTRY_KEYS, parseSourceList, plainText, readSourceList, SENTENCE_LANGUAGES, SOURCES_DIR, sourceListFiles, validateSourceList } from "../scripts/lib/sources.mjs";
import { ROOT, SRC, tempDir } from "./helpers.mjs";

// The articles' source lists (si-1q9z): every docs/sources/*.yaml follows the
// format of scripts/lib/sources.mjs and its sentences are in its article,
// offline — none exists yet on the day this lands, and the suite passes with
// none — and each rule of the format fails a list that breaks it, naming the
// file, the entry and the rule.

const relative = (file) => path.relative(ROOT, file);
const listing = await sourceListFiles(path.join(ROOT, SOURCES_DIR), { label: relative });

describe("the source lists in docs/sources/ (si-1q9z)", () => {
  it("holds nothing but source lists", () => {
    assert.deepEqual(listing.problems, []);
  });

  for (const file of listing.files) {
    it(`${relative(file)} follows the format, and its article holds every sentence`, async () => {
      const list = await readSourceList(file, { src: SRC, label: relative(file) });
      assert.deepEqual(list.problems, []);
      assert.ok(list.entries.length > 0);
    });
  }
});

// An article in both languages, and a list of one good entry for it.
const FILE = "docs/sources/demo.yaml";
const ARTICLES = {
  en: [
    "---",
    "title: A demo",
    "description: A sentence only the front matter holds.",
    "---",
    "",
    "The model is the same kind of",
    "[language model](https://example.com/model) as in the chat.",
    "",
    "{% figure \"five-parts\" %}",
    "",
    "It reads **the error**, runs `npm test` and uses project_doc_max_bytes.",
    "",
  ].join("\n"),
  sv: ["---", "title: En demo", "---", "", "Modellen är samma slags [språkmodell](https://example.com/model) som i chatten.", ""].join("\n"),
};
const ENTRY = {
  id: "C3",
  article: "demo",
  sentence: { sv: "Modellen är samma slags språkmodell som i chatten.", en: "The model is the same kind of language model as in the chat." },
  vendor: "Anthropic",
  url: "https://code.claude.com/docs/en/memory#agents-md",
  final_url: "https://code.claude.com/docs/en/memory",
  quote: "An `AGENTS.md`, and no `CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it",
  retrieved: "2026-10-06",
  last_checked: "2026-10-06",
};

/** The problems of a list of entries for the demo article. */
function problemsOf(entries, articles = ARTICLES) {
  return validateSourceList(entries, { file: FILE, articles }).problems;
}

/** The problems of the good entry changed by `change`. */
function problemsWith(change) {
  const entry = structuredClone(ENTRY);
  change(entry);
  return problemsOf([entry]);
}

describe("the source list format (si-1q9z)", () => {
  it("passes the good entry, and names the keys and languages of the format", () => {
    assert.deepEqual(problemsOf([ENTRY]), []);
    assert.equal(validateSourceList([ENTRY], { file: FILE, articles: ARTICLES }).ok, true);
    assert.deepEqual(ENTRY_KEYS, ["id", "article", "sentence", "vendor", "url", "final_url", "quote", "retrieved", "last_checked"]);
    assert.deepEqual(SENTENCE_LANGUAGES, ["sv", "en"]);
    assert.equal(SOURCES_DIR, path.join("docs", "sources"));
  });

  it("fails a file that is not a list of entries, or an empty one", () => {
    assert.deepEqual(problemsOf({ id: "C3" }), [`${FILE}: must be a YAML list of entries, got a mapping`]);
    assert.deepEqual(problemsOf([]), [`${FILE}: must be a YAML list of entries, got an empty list`]);
    assert.deepEqual(problemsOf(undefined), [`${FILE}: must be a YAML list of entries, got nothing`]);
    assert.deepEqual(problemsOf("C3"), [`${FILE}: must be a YAML list of entries, got a string`]);
  });

  it("fails an entry that is not a mapping", () => {
    assert.deepEqual(problemsOf([ENTRY, "C4"]), [`${FILE}: entry 2: must be a mapping of the keys ${ENTRY_KEYS.join(", ")}, got "C4"`]);
  });

  it("fails an entry without one of the keys, naming it", () => {
    for (const key of ENTRY_KEYS) {
      const problems = problemsWith((entry) => delete entry[key]);
      assert.ok(problems.includes(`${FILE}: entry 1${key === "id" ? "" : " (C3)"}: missing key ${key}`), `${key}: ${problems.join("\n")}`);
    }
    assert.deepEqual(problemsWith((entry) => {
      delete entry.vendor;
      delete entry.quote;
    }), [`${FILE}: entry 1 (C3): missing keys vendor, quote`]);
  });

  it("fails an entry with a key the format does not have", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.leverantör = "Anthropic";
    }), [`${FILE}: entry 1 (C3): unknown key leverantör; the keys are exactly ${ENTRY_KEYS.join(", ")}`]);
  });

  it("fails an id that is not a non-empty string, and an id given twice", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.id = 3;
    }), [`${FILE}: entry 1: id must be a non-empty string, got 3`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.id = " ";
    }), [`${FILE}: entry 1: id must be a non-empty string, got " "`]);
    const twice = { ...structuredClone(ENTRY), quote: "Another quote" };
    assert.deepEqual(problemsOf([ENTRY, { ...ENTRY, id: "C4" }, twice]), [`${FILE}: entry 3 (C3): id "C3" is also entry 1's; an id is unique in the file`]);
  });

  it("fails an article that is not the file's name", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.article = "another-article";
    }), [`${FILE}: entry 1 (C3): article must be the file's name, "demo", got "another-article"`]);
  });

  it("fails a list whose article does not exist in a language", () => {
    assert.deepEqual(problemsOf([ENTRY], { en: ARTICLES.en, sv: null }), [`${FILE}: the article "demo" does not exist in src/sv/blog/posts/demo.md`]);
    assert.deepEqual(problemsOf([ENTRY], { en: null, sv: null }), [`${FILE}: the article "demo" does not exist in src/sv/blog/posts/demo.md or src/en/blog/posts/demo.md`]);
  });

  it("fails a sentence that is not in its article's body, in each language", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.sv = "Modellen är en annan sorts språkmodell.";
    }), [`${FILE}: entry 1 (C3): sentence.sv is not in the body of src/sv/blog/posts/demo.md: "Modellen är en annan sorts språkmodell."`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.en = "The model is a different kind of model.";
    }), [`${FILE}: entry 1 (C3): sentence.en is not in the body of src/en/blog/posts/demo.md: "The model is a different kind of model."`]);
    // Each language's sentence is looked for in its own article.
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.en = entry.sentence.sv;
    }), [`${FILE}: entry 1 (C3): sentence.en is not in the body of src/en/blog/posts/demo.md: "Modellen är samma slags språkmodell som i chatten."`]);
    // The front matter is not the body: the description does not count.
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.en = "A sentence only the front matter holds.";
    }), [`${FILE}: entry 1 (C3): sentence.en is not in the body of src/en/blog/posts/demo.md: "A sentence only the front matter holds."`]);
    // An article edit that breaks the sentence fails the list.
    const edited = { ...ARTICLES, en: ARTICLES.en.replace("same kind", "very same kind") };
    assert.deepEqual(problemsOf([ENTRY], edited), [`${FILE}: entry 1 (C3): sentence.en is not in the body of src/en/blog/posts/demo.md: "The model is the same kind of language model as in the chat."`]);
  });

  it("finds a sentence as plain text: link syntax and Markdown gone, whitespace collapsed", () => {
    // ENTRY's English sentence spans a line break and a link in the article.
    for (const en of [
      "It reads the error, runs npm test and uses project_doc_max_bytes.",
      "It reads **the error**, runs `npm test` and uses project_doc_max_bytes.",
      "the same kind of [language model](https://example.com/model) as",
      "as in the chat. It reads the error",
    ]) {
      assert.deepEqual(problemsWith((entry) => {
        entry.sentence.en = en;
      }), [], en);
    }
  });

  it("fails a sentence that is not a mapping of sv and en, or has an empty one", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence = "Modellen är samma slags språkmodell som i chatten.";
    }), [`${FILE}: entry 1 (C3): sentence must be a mapping of sv and en, got "Modellen är samma slags språkmodell som i chatten."`]);
    assert.deepEqual(problemsWith((entry) => {
      delete entry.sentence.en;
    }), [`${FILE}: entry 1 (C3): sentence has no en`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.de = "Das Modell";
    }), [`${FILE}: entry 1 (C3): sentence has de; its keys are exactly sv and en`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.sv = "";
    }), [`${FILE}: entry 1 (C3): sentence.sv must be a non-empty string, got ""`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.sentence.en = "**`**`**";
    }), [`${FILE}: entry 1 (C3): sentence.en must be a non-empty string, got "**\`**\`**"`]);
  });

  it("fails an empty vendor or quote", () => {
    assert.deepEqual(problemsWith((entry) => {
      entry.vendor = "";
    }), [`${FILE}: entry 1 (C3): vendor must be a non-empty string, got ""`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.quote = "  ";
    }), [`${FILE}: entry 1 (C3): quote must be a non-empty string, got "  "`]);
    assert.deepEqual(problemsWith((entry) => {
      entry.quote = null;
    }), [`${FILE}: entry 1 (C3): quote must be a non-empty string, got null`]);
  });

  it("fails a url or final_url that is not an https URL", () => {
    for (const key of ["url", "final_url"]) {
      for (const value of ["http://code.claude.com/docs/en/memory", "code.claude.com/docs/en/memory", "https://", "https://code.claude.com/docs/en/my memory", 42]) {
        assert.deepEqual(problemsWith((entry) => {
          entry[key] = value;
        }), [`${FILE}: entry 1 (C3): ${key} must be an https URL, got ${JSON.stringify(value)}`], `${key} ${value}`);
      }
    }
  });

  it("fails a retrieved or last_checked that is not a real day written YYYY-MM-DD", () => {
    for (const key of ["retrieved", "last_checked"]) {
      for (const value of ["2026-10-6", "2026-02-30", "2026-13-01", "6 October 2026", "2026-10-06T19:00", 20261006]) {
        assert.deepEqual(problemsWith((entry) => {
          entry[key] = value;
        }), [`${FILE}: entry 1 (C3): ${key} must be a real day, YYYY-MM-DD, got ${JSON.stringify(value)}`], `${key} ${value}`);
      }
    }
  });

  it("reads YAML dates as the text that was typed, so a day that does not exist is refused", () => {
    const [entry] = parseSourceList("- retrieved: 2026-10-06\n  last_checked: 2026-02-30\n");
    assert.equal(entry.retrieved, "2026-10-06");
    assert.equal(entry.last_checked, "2026-02-30");
    assert.throws(() => parseSourceList("- id: C3\n  id: C4\n"), /duplicated mapping key/);
  });

  it("skips the two rules that read the article when told to, and only those", () => {
    const placeholder = { ...structuredClone(ENTRY), sentence: { sv: "platshållare", en: "placeholder" } };
    assert.deepEqual(validateSourceList([placeholder], { file: FILE, articles: null }).problems, []);
    assert.deepEqual(validateSourceList([{ ...placeholder, article: "other" }], { file: FILE, articles: null }).problems, [`${FILE}: entry 1 (C3): article must be the file's name, "demo", got "other"`]);
  });
});

describe("the text of an article (si-1q9z)", () => {
  it("is the body after the front matter, split as the build splits it", () => {
    assert.equal(articleBody("---\ntitle: T\n---\nBody.\n"), "Body.\n");
    assert.equal(articleBody("\uFEFF---\r\ntitle: T\r\n---\r\nBody.\r\n"), "Body.\r\n");
    assert.equal(articleBody("---yaml\ntitle: T\n---\nBody.\n"), "Body.\n");
    assert.equal(articleBody("Body without front matter.\n"), "Body without front matter.\n");
    assert.equal(articleBody("----\nBody.\n"), "----\nBody.\n");
    assert.equal(articleBody("---\ntitle: T\nno end\n"), "");
  });

  it("is plain text: link and image syntax, emphasis, code, template tags and block markers gone", () => {
    assert.equal(plainText("A [link](https://example.com/a_(b) \"title\") and ![an image](x.png) here."), "A link and here.");
    assert.equal(plainText("A [reference][ref] link.\n\n[ref]: https://example.com/\n"), "A reference link.");
    assert.equal(plainText("**Bold**, *italic*, _emphasis_, ~~gone~~ and `code`."), "Bold, italic, emphasis, gone and code.");
    assert.equal(plainText("project_doc_max_bytes and __init__"), "project_doc_max_bytes and init");
    assert.equal(plainText("## A heading\n\n> A quote\n\n- an item\n1. a step\n"), "A heading A quote an item a step");
    assert.equal(plainText("Before.\n\n{% figure \"chat-or-agent\", \"wide\" %}\n\nAfter."), "Before. After.");
    assert.equal(plainText("| Part | Count |\n| --- | ---: |\n| Model | 1 |\n"), "Part Count Model 1");
    assert.equal(plainText("```markdown\n# Instructions\n```\n"), "Instructions");
    assert.equal(plainText("Tom &amp; Jerry&#8217;s <abbr>AI</abbr>, \\*not\\* escaped, <https://agents.md/>"), "Tom & Jerry’s AI, not escaped, https://agents.md/");
    assert.equal(plainText("Line one\nline two,\u00A0with a no-break space"), "Line one line two, with a no-break space");
  });
});

describe("the files of docs/sources/ (si-1q9z)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("sources-");
  });
  after(async () => {
    await tmp.cleanup();
  });

  it("are the .yaml files, and anything else there is a problem", async () => {
    const dir = path.join(tmp.dir, "listing");
    await mkdir(path.join(dir, "notes"), { recursive: true });
    for (const name of ["b-article.yaml", "a-article.yaml", "c-article.yml", "README.md", ".DS_Store"]) await writeFile(path.join(dir, name), "");
    const { files, problems } = await sourceListFiles(dir, { label: (file) => path.relative(dir, file) });
    assert.deepEqual(files, [path.join(dir, "a-article.yaml"), path.join(dir, "b-article.yaml")]);
    assert.deepEqual(problems.sort(), [
      "README.md: not a source list; the directory holds only <article slug>.yaml files",
      "c-article.yml: not a source list; the directory holds only <article slug>.yaml files",
      "notes: not a source list; the directory holds only <article slug>.yaml files",
    ]);
    assert.deepEqual(await sourceListFiles(path.join(dir, "missing")), { files: [], problems: [] });
  });

  it("are read with their article, and a file that is not YAML is one problem", async () => {
    const src = path.join(tmp.dir, "src");
    for (const lang of SENTENCE_LANGUAGES) {
      await mkdir(path.join(src, lang, "blog", "posts"), { recursive: true });
      await writeFile(path.join(src, lang, "blog", "posts", "demo.md"), ARTICLES[lang]);
    }
    const file = path.join(tmp.dir, "demo.yaml");
    const yaml = (entry) => [
      `- id: ${entry.id}`,
      `  article: ${entry.article}`,
      "  sentence:",
      `    sv: ${JSON.stringify(entry.sentence.sv)}`,
      `    en: ${JSON.stringify(entry.sentence.en)}`,
      `  vendor: ${entry.vendor}`,
      `  url: ${entry.url}`,
      `  final_url: ${entry.final_url}`,
      `  quote: ${JSON.stringify(entry.quote)}`,
      `  retrieved: ${entry.retrieved}`,
      `  last_checked: ${entry.last_checked}`,
      "",
    ].join("\n");
    await writeFile(file, yaml(ENTRY));
    const good = await readSourceList(file, { src, label: "demo.yaml" });
    assert.deepEqual(good.problems, []);
    assert.deepEqual(good.entries, [ENTRY]);
    assert.equal(good.article, "demo");

    await writeFile(file, yaml({ ...ENTRY, sentence: { ...ENTRY.sentence, sv: "Ingen sådan mening." } }));
    assert.deepEqual((await readSourceList(file, { src, label: "demo.yaml" })).problems, ['demo.yaml: entry 1 (C3): sentence.sv is not in the body of src/sv/blog/posts/demo.md: "Ingen sådan mening."']);
    assert.deepEqual((await readSourceList(file, { src, label: "demo.yaml", checkArticles: false })).problems, []);

    const orphan = path.join(tmp.dir, "orphan.yaml");
    await writeFile(orphan, yaml({ ...ENTRY, article: "orphan" }));
    assert.deepEqual((await readSourceList(orphan, { src, label: "orphan.yaml" })).problems, ['orphan.yaml: the article "orphan" does not exist in src/sv/blog/posts/orphan.md or src/en/blog/posts/orphan.md']);

    await writeFile(file, "- id: C3\n  sentence: [unclosed\n");
    const broken = await readSourceList(file, { src, label: "demo.yaml" });
    assert.equal(broken.problems.length, 1);
    assert.match(broken.problems[0], /^demo\.yaml: not valid YAML: /);
    assert.deepEqual(broken.entries, []);
  });
});
