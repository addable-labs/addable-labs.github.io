// Syntax highlighting of the code blocks in articles (si-20k4;
// scripts/lib/highlight.mjs): a fence with a language gets span.tok-<kind>
// around its tokens at build time, ```text and every other tag stay as they
// were, the code is coloured and never changed, the page gains no script and
// no inline style, and both themes define every colour the spans use.

import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { auditTokens } from "../scripts/lib/contrast.mjs";
import { parseHtml, text } from "../scripts/lib/html.mjs";
import { highlight, KINDS, LANGUAGES, tokenize } from "../scripts/lib/highlight.mjs";
import { buildSite, copyProject, IMAGE_FRONT_MATTER, ROOT, runHtmlValidate, tempDir, writeArticleImage } from "./helpers.mjs";

/** The tokens of `code` as "kind:text" strings, for readable comparisons. */
function marked(code, lang) {
  return tokenize(code, lang)
    .filter(([kind]) => kind)
    .map(([kind, text]) => `${kind}:${text}`);
}

// Code of the shapes an article shows, written for this test.
const SH = `#!/bin/sh
# Check the build, then say so.

root=$(git rev-parse --show-toplevel) || exit 1
cd "$root" || exit 1

name=$(node -p "require('./package.json').name" 2>/dev/null)
if [ -z "$name" ]; then
  echo "No name in package.json: $HOME/x" >&2
  exit 1
fi
for f in a b; do echo "$f" | tr -d ' ' ; done
mkdir -p .tools/bin
ln -s ../../shared/bin .tools/bin/shared
`;

const MARKDOWN = `---
name: example
description: A skill that does one thing. Use it when asked to.
---

# Example

1. Run \`sh run.sh\` first.
2. Then check the output.

- a point with \`code\`
> a quote

\`\`\`sh
echo plain inside a fence
\`\`\`
`;

const YAML = `# A comment
policy:
  allow: false
  retries: 3
  label: "quoted: value" # trailing
  note: >
    text: that is no key
- item: yes
`;

const JSON_TEXT = `{"name": "x", "list": [1, 2.5, true, null], "nested": {"a": "b\\"c"}}
`;

describe("the languages", () => {
  it("highlights sh, markdown, yaml and json, under the names authors use", () => {
    assert.deepEqual(Object.keys(LANGUAGES).sort(), ["bash", "json", "markdown", "md", "sh", "shell", "yaml", "yml", "zsh"]);
    assert.deepEqual(KINDS, ["comment", "string", "param", "keyword", "name"]);
  });

  it("leaves text, no language and unknown languages alone ('' makes markdown-it escape the block as it always did)", () => {
    for (const lang of ["text", "txt", "", undefined, "python", "console", "constructor", "__proto__", "toString", "hasOwnProperty"]) {
      assert.equal(highlight(SH, lang), "", `language ${String(lang)}`);
      assert.equal(tokenize(SH, lang), null, `language ${String(lang)}`);
    }
  });

  it("takes the tag in any case, and bash, zsh and shell as sh", () => {
    const expected = highlight(SH, "sh");
    assert.notEqual(expected, "");
    for (const lang of ["SH", "Bash", "zsh", "shell"]) assert.equal(highlight(SH, lang), expected);
    assert.equal(highlight(YAML, "yml"), highlight(YAML, "yaml"));
    assert.equal(highlight(MARKDOWN, "md"), highlight(MARKDOWN, "markdown"));
  });
});

describe("sh", () => {
  it("marks comments, strings, variables, flags, command names and keywords", () => {
    assert.deepEqual(marked("# note\necho \"hi $USER\" -n 'it'\n", "sh"), [
      "comment:# note",
      "name:echo",
      'string:"hi ',
      "param:$USER",
      'string:"',
      "param:-n",
      "string:'it'",
    ]);
    assert.deepEqual(marked("if [ -z \"$x\" ]; then exit 1; fi\n", "sh"), [
      "keyword:if",
      "name:[",
      "param:-z",
      'string:"',
      "param:$x",
      'string:"',
      "keyword:then",
      "keyword:exit",
      "keyword:fi",
    ]);
  });

  it("reads a command substitution as sh again, and a command after | ; && ||", () => {
    assert.deepEqual(marked("top=$(git rev-parse --show-toplevel) || exit 1\n", "sh"), ["param:top", "name:git", "param:--show-toplevel", "keyword:exit"]);
    assert.deepEqual(marked("a | b && c; d || e\n", "sh"), ["name:a", "name:b", "name:c", "name:d", "name:e"]);
  });

  it("does not take arguments, file names or a # inside a word for commands or comments", () => {
    assert.deepEqual(marked("ln -s ../../a/b c#d\n", "sh"), ["name:ln", "param:-s"]);
    assert.deepEqual(marked("echo x 2>/dev/null >out.txt\n", "sh"), ["name:echo"]);
  });

  it("keeps a continued command one command, and a single-quoted string whole", () => {
    assert.deepEqual(marked("grep -m1 \\\n  -v '$x # y' file\n", "sh"), ["name:grep", "param:-m1", "param:-v", "string:'$x # y'"]);
  });

  it("marks a typed prompt's command", () => {
    assert.deepEqual(marked("$ npm test\n", "sh"), ["name:npm"]);
  });
});

describe("markdown, yaml and json", () => {
  it("marks a front matter as YAML between comment-coloured --- lines, then headings, list markers and inline code", () => {
    assert.deepEqual(marked(MARKDOWN, "markdown"), [
      "comment:---",
      "name:name",
      "name:description",
      "comment:---",
      "name:# Example",
      "keyword:1.",
      "string:`sh run.sh`",
      "keyword:2.",
      "keyword:-",
      "string:`code`",
      "comment:> ",
      "comment:```sh",
      "comment:```",
    ]);
  });

  it("is not a front matter without the closing line: the --- is a rule, name: x is text", () => {
    assert.deepEqual(marked("---\nname: x\n", "markdown"), ["comment:---"]);
  });

  it("marks YAML keys, literals, quoted strings, comments, and leaves a block scalar's lines alone", () => {
    assert.deepEqual(marked(YAML, "yaml"), [
      "comment:# A comment",
      "name:policy",
      "name:allow",
      "keyword:false",
      "name:retries",
      "keyword:3",
      "name:label",
      'string:"quoted: value"',
      "comment:# trailing",
      "name:note",
      "name:item",
    ]);
    assert.deepEqual(marked("disable-model-invocation: true\n", "yaml"), ["name:disable-model-invocation", "keyword:true"]);
    // a literal word inside a longer plain value is prose
    assert.deepEqual(marked("note: true story of 3 days\n", "yaml"), ["name:note"]);
  });

  it("marks JSON keys, strings, numbers and literals", () => {
    assert.deepEqual(marked(JSON_TEXT, "json"), ['name:"name"', 'string:"x"', 'name:"list"', "keyword:1", "keyword:2.5", "keyword:true", "keyword:null", 'name:"nested"', 'name:"a"', 'string:"b\\"c"']);
  });
});

describe("the code is coloured and never changed", () => {
  it("joins every token back to the code, for the samples and for random input", () => {
    for (const [lang, code] of [["sh", SH], ["markdown", MARKDOWN], ["yaml", YAML], ["json", JSON_TEXT]]) {
      const tokens = tokenize(code, lang);
      assert.ok(tokens, lang);
      assert.equal(tokens.map(([, text]) => text).join(""), code, lang);
    }
    // A generator of fixed seed, so a failure repeats: pieces that open
    // quotes, expansions, fences, comments and front matters at random.
    const pieces = ["a", "b", " ", "\n", "\t", "\r", "$", "(", ")", "{", "}", "'", '"', "`", "\\", "#", "-", "=", ";", "|", "&", "<", ">", "*", "1", "2", " ", "\f", "[", "]", ":", "~", "!", "é", "\u{1F600}", "---", "```", "$(", "${", "<<", "2>&1", "if", "fi", "true", "null", " "];
    let seed = 20261031;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (const lang of Object.keys(LANGUAGES)) {
      for (let run = 0; run < 3000; run += 1) {
        let code = "";
        for (let k = Math.floor(random() * 40); k > 0; k -= 1) code += pieces[Math.floor(random() * pieces.length)];
        const tokens = tokenize(code, lang);
        assert.ok(tokens, `${lang}: ${JSON.stringify(code)} did not round-trip`);
        assert.equal(tokens.map(([, text]) => text).join(""), code);
      }
    }
  });

  it("escapes the code as markdown-it does, in the spans and between them", () => {
    const html = highlight('echo "<b> & </b>" # a < b\n', "sh");
    assert.equal(html, '<span class="tok-name">echo</span> <span class="tok-string">&quot;&lt;b&gt; &amp; &lt;/b&gt;&quot;</span> <span class="tok-comment"># a &lt; b</span>\n');
    // no raw markup of the author's survives
    assert.ok(!/<b>|<\/b>/.test(html));
  });
});

// The pages the build writes, for an article of the case's own in both
// languages: once with a language on each fence, once with every fence
// ```text (what every article did before).
describe("the build", () => {
  let tmp;
  let out;
  const fences = (lang, plain) => {
    const tag = (name) => (plain ? "text" : name);
    return [
      `\`\`\`${tag("sh")}`,
      SH.trimEnd(),
      "```",
      "",
      `\`\`\`${tag("markdown")}`,
      MARKDOWN.replace(/```sh\necho plain inside a fence\n```\n/, "").trimEnd(),
      "```",
      "",
      `\`\`\`${tag("yaml")}`,
      "key: value # c",
      "```",
      "",
      `\`\`\`${tag("json")}`,
      JSON_TEXT.trimEnd(),
      "```",
      "",
      "```text",
      'plain <b>text</b> & "quotes" for ' + lang,
      "```",
      "",
      "```",
      "no language <i>at all</i>",
      "```",
      "",
      `\`\`\`${plain ? "text" : "python"}`,
      "print('unknown language <ok>')",
      "```",
      "",
    ].join("\n");
  };

  before(async () => {
    tmp = await tempDir("highlight-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    for (const [slug, plain] of [["fences", false], ["plain", true]]) {
      for (const lang of ["en", "sv"]) {
        const title = slug === "plain" ? "Fences of plain text" : "Fences with a language";
        const frontMatter = ["---", `title: ${title}`, `description: ${title}.`, ...IMAGE_FRONT_MATTER, "date: 2026-09-20", "category: ai-journey", `translationKey: ${slug}`, "draft: false", "aiGenerated: true", "humanReviewed: true", "---"];
        await writeFile(path.join(project, "src", lang, "blog", "posts", `${slug}.md`), `${frontMatter.join("\n")}\n\n${fences(lang, plain)}`);
      }
      await writeArticleImage(project, slug);
    }
    out = buildSite(path.join(tmp.dir, "site"), {}, project);
  });
  after(() => tmp.cleanup());

  const page = (slug, lang) => readFile(path.join(out, lang === "sv" ? "sv" : "", "blog", slug, "index.html"), "utf8");
  const blocks = (html) => [...html.matchAll(/<pre><code(?: class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g)].map(([, cls, inner]) => ({ cls, inner }));
  const withoutSpans = (inner) => inner.replace(/<span class="tok-[a-z]+">/g, "").replace(/<\/span>/g, "");

  for (const lang of ["en", "sv"]) {
    it(`writes spans on the fences with a language and nothing else (${lang})`, async () => {
      const marked = blocks(await page("fences", lang));
      const plain = blocks(await page("plain", lang));
      assert.equal(marked.length, 7);
      assert.equal(plain.length, 7);
      // sh, markdown, yaml and json carry spans of the kinds the highlighter has
      assert.deepEqual(marked.slice(0, 4).map((block) => block.cls), ["language-sh", "language-markdown", "language-yaml", "language-json"]);
      for (const block of marked.slice(0, 4)) {
        assert.match(block.inner, /<span class="tok-(comment|string|param|keyword|name)">/);
        for (const [, kind] of block.inner.matchAll(/<span class="tok-([a-z]+)">/g)) assert.ok(KINDS.includes(kind), kind);
      }
      assert.match(marked[0].inner, /<span class="tok-name">git<\/span>/);
      assert.match(marked[0].inner, /<span class="tok-comment">#!\/bin\/sh<\/span>/);
      // ```text and a fence without a language: exactly the block the page had before
      for (const index of [4, 5]) assert.deepEqual(marked[index], plain[index], `block ${index}`);
      assert.deepEqual(marked[4].cls, "language-text");
      assert.equal(marked[5].cls, undefined);
      // an unknown language keeps its class and the plain escaping
      assert.equal(marked[6].cls, "language-python");
      assert.equal(marked[6].inner, plain[6].inner);
      // and in the four highlighted blocks the spans are all that was added
      for (const index of [0, 1, 2, 3]) assert.equal(withoutSpans(marked[index].inner), plain[index].inner, `block ${index}`);
    });

    it(`adds no script and no inline style to the page, and the pages validate (${lang})`, async () => {
      const marked = await page("fences", lang);
      const plain = await page("plain", lang);
      const count = (html, pattern) => (html.match(pattern) ?? []).length;
      for (const pattern of [/<script\b/g, /\sstyle=/g, /\son[a-z]+=/g, /<link\b[^>]*rel="stylesheet"/g]) {
        assert.equal(count(marked, pattern), count(plain, pattern), String(pattern));
      }
      for (const { inner } of blocks(marked)) assert.ok(!/<script|\sstyle=|\son[a-z]+=|<link|<img|https?:/.test(inner), inner);
      const validate = runHtmlValidate(path.join(out, lang === "sv" ? "sv" : "", "blog", "fences"));
      assert.equal(validate.status, 0, validate.output);
    });
  }
});

describe("the themes", () => {
  it("define every colour token the spans use, in light and in dark", async () => {
    const tokens = auditTokens(await readFile(path.join(ROOT, "src", "assets", "css", "tokens.css"), "utf8"));
    assert.deepEqual(tokens.problems, []);
    for (const kind of KINDS) {
      for (const scheme of ["light", "dark"]) {
        assert.match(tokens[scheme][`--color-code-${kind}`] ?? "", /^#[0-9A-Fa-f]{6}$/, `${scheme} --color-code-${kind}`);
      }
    }
    // no token without a kind: a colour nothing uses is dead weight in the gate
    const defined = Object.keys(tokens.dark).filter((name) => name.startsWith("--color-code-"));
    assert.deepEqual(defined.sort(), KINDS.map((kind) => `--color-code-${kind}`).sort());
  });

  it("style every class the highlighter writes with its token, and no other tok- class", async () => {
    const css = await readFile(path.join(ROOT, "src", "assets", "css", "base.css"), "utf8");
    for (const kind of KINDS) {
      assert.match(css, new RegExp(`\\.article-body \\.tok-${kind} \\{ color: var\\(--color-code-${kind}\\); \\}`), `no rule for .tok-${kind}`);
    }
    const classes = new Set([...css.matchAll(/\.tok-([a-z-]+)/g)].map(([, kind]) => kind));
    assert.deepEqual([...classes].sort(), [...KINDS].sort());
  });
});

describe("the gates' reading of a coloured block", () => {
  it("takes the text of a <pre> with spans in it, not its markup (the content gate counts words from it)", () => {
    const doc = parseHtml('<div class="article-body"><pre><code class="language-sh"><span class="tok-name">mkdir</span> <span class="tok-param">-p</span> a\n</code></pre></div>');
    assert.equal(text(doc.querySelector("pre")), "mkdir -p a");
  });
});
