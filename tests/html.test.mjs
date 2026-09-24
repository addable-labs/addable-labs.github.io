import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { buildSite, copyProject, fixture, runHtmlValidate, tempDir } from "./helpers.mjs";

describe("html gate (html-validate with .htmlvalidate.json)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("html-");
    buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  it("passes on the real build with zero errors", () => {
    const { status, output } = runHtmlValidate(tmp.dir);
    assert.equal(status, 0, output);
  });

  it("fails on inline styles and an image without alt, naming the file", () => {
    const { status, output } = runHtmlValidate(fixture("html-bad", "site"));
    assert.equal(status, 1);
    assert.match(output, /html-bad[\\/]site[\\/]index\.html/);
    assert.match(output, /no-inline-style/);
    assert.match(output, /wcag\/h37|alt/);
  });

  it("gets a Markdown table in div.table-scroll with a column's alignment as a class, never an inline style (si-t64i)", async () => {
    // markdown-it writes a `---:` column as style="text-align:right", which
    // this gate forbids; eleventy.config.js makes it a class and wraps the
    // table in the box base.css lets it scroll in. The article is the case's
    // own, in a copy of the project, so the case holds whichever articles
    // carry tables.
    const project = await copyProject(path.join(tmp.dir, "project"));
    const table = "| Measure | Value |\n| --- | ---: |\n| Sessions | 38 |\n| Calls | 2,315 |";
    for (const lang of ["en", "sv"]) {
      const frontMatter = ["---", "title: A table", "description: An article with a table.", "date: 2026-09-20", "category: ai-journey", "translationKey: a-table", "draft: false", "aiGenerated: true", "humanReviewed: true", "---"];
      await writeFile(path.join(project, "src", lang, "blog", "posts", "a-table.md"), `${frontMatter.join("\n")}\n\nA table follows.\n\n${table}\n`);
    }
    const out = buildSite(path.join(tmp.dir, "table-site"), {}, project);
    const html = await readFile(path.join(out, "blog", "a-table", "index.html"), "utf8");
    const body = html.slice(html.indexOf('<div class="article-body">'));
    assert.match(body, /<div class="table-scroll">\s*<table>\s*<thead>[\s\S]*<\/table>\s*<\/div>/);
    assert.deepEqual([...body.matchAll(/<(th|td)(?: class="([^"]*)")?>/g)].map(([, tag, cls]) => (cls ? `${tag}.${cls}` : tag)), ["th", "th.align-right", "td", "td.align-right", "td", "td.align-right"]);
    assert.doesNotMatch(body, /\sstyle=/);
    const { status, output } = runHtmlValidate(out);
    assert.equal(status, 0, output);
  });
});
