import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { before, describe, it } from "node:test";
import { APP_KEYS, BANDS, PRIVATE_APP_KEYS, PRIVATE_STATUS_LABEL, PUBLIC_REPOS, STATUS_KEYS, THEME_KEYS, githubRepos, publicRepo, validateApps } from "../scripts/lib/apps.mjs";
import { loadSite, loadStrings, readArticleSources } from "../scripts/lib/site.mjs";
import { SRC } from "./helpers.mjs";

// Apps data and copy (REQ-011, REQ-025; AC-11, AC-12, AC-30; founder feedback
// round 1, si-yp2x: four entries, the experiments service in place of
// investing): the real files validate, and
// every rule fails on a modified in-memory copy naming the key, the language
// or the band.

describe("apps data and copy (REQ-011, REQ-025; AC-11, AC-12, AC-30)", () => {
  let data;
  let strings;
  let site;
  let articles; // the posts of each language, by file name
  before(async () => {
    data = JSON.parse(await readFile(path.join(SRC, "_data", "portfolio.json"), "utf8"));
    site = await loadSite(SRC);
    strings = await loadStrings(SRC, site);
    articles = {};
    for (const lang of site.languages.codes) articles[lang] = (await readArticleSources(SRC, site, lang)).map((article) => article.slug);
  });

  /** A deep copy of the real inputs for a negative case. */
  const copy = () => ({ data: structuredClone(data), strings: structuredClone(strings), articles: structuredClone(articles) });
  const problemsOf = (input) => validateApps(input).problems;

  it("validates the real data file, both strings files and the articles the cards link", () => {
    const result = validateApps({ data, strings, articles });
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
  });

  it("holds exactly the curated entries of APP_KEYS in the founder's order", () => {
    assert.deepEqual(data.map((entry) => entry.key), APP_KEYS);
    const reordered = copy();
    reordered.data.reverse();
    assert.ok(problemsOf(reordered).some((p) => /entries are out of order/.test(p)), problemsOf(reordered).join("\n"));
    const missing = copy();
    missing.data = missing.data.filter((entry) => entry.key !== "gaimer");
    assert.ok(problemsOf(missing).some((p) => p === 'portfolio.json lacks the entry "gaimer"'), problemsOf(missing).join("\n"));
  });

  it("gives every entry a name and a summary in both languages, and every strings entry a data entry", () => {
    for (const lang of site.languages.codes) {
      for (const key of APP_KEYS) {
        assert.ok(strings[lang].portfolio[key]?.name, `${lang}: portfolio.${key}.name`);
        assert.ok(strings[lang].portfolio[key]?.summary, `${lang}: portfolio.${key}.summary`);
      }
    }
    const orphan = copy();
    orphan.strings.en.portfolio.newapp = { name: "New app", summary: "A desktop app for following markets, funds and portfolios." };
    assert.ok(problemsOf(orphan).includes("en: portfolio.newapp has no data entry"), problemsOf(orphan).join("\n"));
  });

  it("fails an added entry that lacks Swedish strings, naming the key and the language (AC-12)", () => {
    const added = copy();
    added.data.push({ key: "newapp", theme: "ai-apps", repo: "example-org/newapp", url: "https://github.com/example-org/newapp", status: "open-source-mit", source: { readme: "https://github.com/example-org/newapp/blob/main/README.md", retrieved: "2026-09-20" } });
    added.strings.en.portfolio.newapp = { name: "New app", summary: "A desktop app for following markets, funds and portfolios in one place." };
    const problems = problemsOf({ ...added, keys: [...APP_KEYS, "newapp"], publicRepos: [...PUBLIC_REPOS, "example-org/newapp"] });
    assert.ok(problems.includes("sv: portfolio.newapp.name is missing"), problems.join("\n"));
    assert.ok(problems.includes("sv: portfolio.newapp.summary is missing"), problems.join("\n"));
    assert.ok(!problems.some((p) => p.startsWith("en: portfolio.newapp")), problems.join("\n"));
  });

  it("never links a private repository — nivå links its public page instead — and links the public ones to github.com (si-gyc4)", () => {
    for (const entry of data) {
      if (PRIVATE_APP_KEYS.includes(entry.key)) assert.ok(entry.url === null || !entry.url.startsWith("https://github.com/"), `${entry.key} is private`);
      else assert.match(entry.url, /^https:\/\/github\.com\//, `${entry.key} links its repository`);
    }
    assert.equal(data.find((entry) => entry.key === "niva").url, "https://erniva.se/");
    const linked = copy();
    linked.data.find((entry) => entry.key === "niva").url = "https://github.com/example-org/private-app";
    assert.ok(problemsOf(linked).some((p) => /^niva: private repository must not be linked/.test(p)), problemsOf(linked).join("\n"));
    // Without a public page a private entry is unlinked, as before si-gyc4.
    const noPage = copy();
    noPage.data.find((entry) => entry.key === "niva").url = null;
    assert.deepEqual(problemsOf(noPage), []);
    const unlinked = copy();
    unlinked.data.find((entry) => entry.key === "notesage").url = null;
    assert.ok(problemsOf(unlinked).some((p) => /^notesage: public entry needs a https:\/\/github\.com\/ URL/.test(p)), problemsOf(unlinked).join("\n"));
  });

  it("refuses a private entry's url that names a GitHub repository in any spelling of github.com, not only on https://github.com/ (si-i5uk)", () => {
    const withUrl = (url) => {
      const input = copy();
      input.data.find((entry) => entry.key === "niva").url = url;
      return problemsOf(input);
    };
    const refused = (url, repo) => `niva: private repository must not be linked — url is null or the product's public https:// page, never one that names a GitHub repository (got ${JSON.stringify(url)}, which names github.com/${repo})`;
    // nivå's own repository on www.github.com, read from the data so that no
    // test spells it: an https:// page off https://github.com/, so only
    // githubRepos() sees the repository.
    const own = data.find((entry) => entry.key === "niva").repo;
    assert.deepEqual(withUrl(`https://www.github.com/${own}`), [refused(`https://www.github.com/${own}`, own)]);
    // The other spellings githubRepos() reads, as the content gate does: the
    // host in another case, a subdomain, a ".git" suffix, a repository in the
    // query, and a repository the site may link, which is no private entry's
    // page either.
    for (const [url, repo] of [
      ["https://GitHub.com/example-org/private-app", "example-org/private-app"],
      ["https://gist.github.com/example-org/private-app", "example-org/private-app"],
      ["https://www.github.com/example-org/private-app.git", "example-org/private-app"],
      ["https://erniva.se/?from=github.com/example-org/private-app", "example-org/private-app"],
      ["https://www.github.com/addable-labs/gaimer", "addable-labs/gaimer"],
    ]) {
      assert.deepEqual(withUrl(url), [refused(url, repo)], url);
    }
    // A url on https://github.com/ gets the message it had, and only that one.
    assert.deepEqual(withUrl("https://github.com/example-org/private-app"), ['niva: private repository must not be linked — url is null or the product\'s public https:// page, never https://github.com/ (got "https://github.com/example-org/private-app")']);
    // nivå's own page still passes.
    assert.deepEqual(withUrl("https://erniva.se/"), []);
  });

  it("refuses a private entry's url on any of GitHub's hosts, whether or not it names a repository — with a port, on raw.githubusercontent.com, an owner's page — and a string that is no URL (si-qtwy)", () => {
    const withUrl = (url) => {
      const input = copy();
      input.data.find((entry) => entry.key === "niva").url = url;
      return problemsOf(input);
    };
    const refused = (url, host) => `niva: private repository must not be linked — url is null or the product's public https:// page, never one on a GitHub host (got ${JSON.stringify(url)}, which is on ${host})`;
    // githubRepos() reads no repository in any of these — each names an
    // owner, a gist or a codespace — so the content gate does not see one in
    // the built site either: only the host refuses them. A port, the raw
    // host, an owner's page on www.; then the host in another case with
    // another port or with a closing dot, behind a user name, on gist., on
    // another subdomain of githubusercontent.com, in the editor and in a
    // codespace. A repository after the owner is read with a port or a
    // closing dot, on the raw host and in the editor (si-gnca, the tests
    // below).
    for (const [url, host] of [
      ["https://github.com:443/example-org", "github.com"],
      ["https://raw.githubusercontent.com/example-org", "raw.githubusercontent.com"],
      ["https://www.github.com/example-org", "www.github.com"],
      ["https://GitHub.com:8443/example-org", "github.com"],
      ["https://GITHUB.COM./example-org", "github.com"],
      ["https://erniva.se@github.com/example-org", "github.com"],
      ["https://gist.github.com/example-org", "gist.github.com"],
      ["https://gist.githubusercontent.com/example-org/0123456789abcdef/raw/notes.md", "gist.githubusercontent.com"],
      ["https://github.dev/example-org", "github.dev"],
      ["https://example-app-8080.app.github.dev/api/items", "example-app-8080.app.github.dev"],
    ]) {
      assert.deepEqual(githubRepos(url), [], url);
      assert.deepEqual(withUrl(url), [refused(url, host)], url);
    }
    // A string no browser opens is no page, so the first rule refuses it: a
    // port out of range, a host with escaped slashes in it.
    for (const url of ["https://github.com:99999/example-org/private-app", "https://github.com%2Fexample-org%2Fprivate-app"]) {
      assert.deepEqual(withUrl(url), [`niva: private repository must not be linked — url is null or the product's public https:// page, never https://github.com/ (got ${JSON.stringify(url)})`], url);
    }
    // A host that only looks like one of GitHub's is another site, and its
    // page passes.
    for (const url of ["https://notgithub.com/example-org", "https://github.com.example/example-org"]) {
      assert.deepEqual(withUrl(url), [], url);
    }
  });

  // A repository written with a port, as a file on raw.githubusercontent.com
  // or in the editor, github.dev (si-gnca), and one after the path that the
  // editor on vscode.dev, where github.dev sends a visitor, or the REST API
  // puts before it (si-3iuk): githubRepos() reads it, so the content gate
  // refuses a private one linked so from any page, and a private entry's url
  // written so gets the message that names the repository, not the host's.
  // (Before si-3iuk the API's named "repos/<owner>", and vscode.dev's
  // passed: it is none of GitHub's hosts.) The host in capitals with a
  // closing dot, and an empty port, lead to the repository all the same.
  for (const [how, url, bead = "si-gnca"] of [
    ["with a port", "https://github.com:443/example-org/private-app"],
    ["with an empty port", "https://github.com:/example-org/private-app"],
    ["in capitals with a closing dot", "https://GITHUB.COM./example-org/private-app"],
    ["as a file on raw.githubusercontent.com", "https://raw.githubusercontent.com/example-org/private-app/main/README.md"],
    ["as a file on raw.githubusercontent.com with a port", "https://raw.githubusercontent.com:443/example-org/private-app/refs/heads/main/README.md"],
    ["in the editor, github.dev", "https://github.dev/example-org/private-app"],
    ["in the editor on vscode.dev", "https://vscode.dev/github/example-org/private-app", "si-3iuk"],
    ["at a file in the editor on insiders.vscode.dev", "https://insiders.vscode.dev/github/example-org/private-app/blob/main/README.md", "si-3iuk"],
    ["in the REST API", "https://api.github.com/repos/example-org/private-app", "si-3iuk"],
    ["at a file's contents in the REST API", "https://api.github.com/repos/example-org/private-app/contents/README.md", "si-3iuk"],
  ]) {
    it(`reads the repository in a url ${how}, ${url}, and refuses it as a private entry's url, naming the repository (${bead})`, () => {
      assert.deepEqual(githubRepos(url), ["example-org/private-app"]);
      const input = copy();
      input.data.find((entry) => entry.key === "niva").url = url;
      assert.deepEqual(problemsOf(input), [`niva: private repository must not be linked — url is null or the product's public https:// page, never one that names a GitHub repository (got ${JSON.stringify(url)}, which names github.com/example-org/private-app)`]);
    });
  }

  // Git's SSH address, git@github.com:<owner>/<name> (si-3iuk), is what a
  // "git clone" line in an article holds, in prose or in a code block, which
  // the article's page carries as markup and its feed as escaped markup, as
  // the build writes them. githubRepos() reads it in each, so the content
  // gate refuses a private one written so and names it. Like git, it reads
  // digits after the colon as the owner, not as a port. Unlike git, it also
  // reads the path after the colon of an address written with a scheme, where
  // no port can follow the colon: a reader sees the repository there too. (As
  // a private entry's url the address is no https:// page, which the first
  // rule refuses.)
  for (const [how, text, repo = "example-org/private-app"] of [
    ["git's SSH address, git@github.com:<owner>/<name>.git", "git@github.com:example-org/private-app.git"],
    ["git's SSH address without .git", "git@github.com:example-org/private-app"],
    ["git's SSH address without the user, github.com:<owner>/<name>.git", "github.com:example-org/private-app.git"],
    ["git's SSH address of an owner whose name is digits, git@github.com:42/<name>.git", "git@github.com:42/private-app.git", "42/private-app"],
    ["an SSH address written with a scheme, ssh://git@github.com:<owner>/<name>.git", "ssh://git@github.com:example-org/private-app.git"],
    ["a git clone line in prose", "<p>To build it, run git clone git@github.com:example-org/private-app.git first.</p>"],
    ["a git clone line in a code block", '<pre><code class="language-sh">git clone git@github.com:example-org/private-app.git\n</code></pre>'],
    ["a git clone line in a code block's escaped markup, as a feed carries it", "&lt;pre&gt;&lt;code class=&quot;language-sh&quot;&gt;git clone git@github.com:example-org/private-app.git\n&lt;/code&gt;&lt;/pre&gt;"],
  ]) {
    it(`reads the repository in ${how} (si-3iuk)`, () => {
      assert.deepEqual(githubRepos(text), [repo]);
    });
  }

  it("reads no repository where these spellings name only an owner or another host, and reads a port wherever one can be read (si-3iuk)", () => {
    // An owner alone names no repository, as before, and a host whose name
    // only ends in vscode.dev is another site.
    for (const text of ["git@github.com:example-org", "https://vscode.dev/github/example-org", "https://my-vscode.dev/github/example-org/private-app"]) {
      assert.deepEqual(githubRepos(text), [], text);
    }
    // Digits and a slash after the colon are a port after a scheme, as git
    // reads them — GitHub's SSH address over port 443, an owner's page — and
    // wherever <owner>/<name> follows them.
    for (const [text, repos] of [
      ["ssh://git@ssh.github.com:443/example-org/private-app.git", ["example-org/private-app"]],
      ["https://github.com:443/example-org", []],
      ["github.com:443/example-org/private-app", ["example-org/private-app"]],
    ]) {
      assert.deepEqual(githubRepos(text), repos, text);
    }
  });

  it("fails an unknown status key and a status without a label in either language (AC-12)", () => {
    const unknown = copy();
    unknown.data.find((entry) => entry.key === "gaimer").status = "beta";
    assert.ok(problemsOf(unknown).some((p) => /^gaimer: unknown status "beta"/.test(p)), problemsOf(unknown).join("\n"));
    const unlabelled = copy();
    unlabelled.data.find((entry) => entry.key === "gaimer").status = "prototype";
    unlabelled.strings.en.portfolioStatus.prototype = "prototype";
    const problems = problemsOf({ ...unlabelled, statuses: [...STATUS_KEYS, "prototype"] });
    assert.ok(problems.includes("sv: portfolioStatus.prototype is missing (used by gaimer)"), problems.join("\n"));
    assert.ok(!problems.some((p) => p.startsWith("en: portfolioStatus.prototype")), problems.join("\n"));
  });

  it("labels every used status in both languages and carries no unused label", () => {
    const used = new Set(data.map((entry) => entry.status));
    for (const lang of site.languages.codes) {
      assert.deepEqual(new Set(Object.keys(strings[lang].portfolioStatus)), used, lang);
    }
    const unused = copy();
    unused.strings.sv.portfolioStatus.prototype = "prototyp";
    assert.ok(problemsOf({ ...unused, statuses: [...STATUS_KEYS, "prototype"] }).includes("sv: portfolioStatus.prototype is not used by any entry"));
  });

  it("links every public entry to one of the public repositories the site may link, and fails one it does not list (REQ-011, si-vwu8)", () => {
    for (const entry of data.filter((item) => !PRIVATE_APP_KEYS.includes(item.key))) {
      const [repo] = githubRepos(entry.url);
      assert.ok(repo && publicRepo(repo), `${entry.key}: ${entry.url}`);
    }
    // A made-up repository: the list refuses whatever it does not name, so no
    // real private one is needed to prove it.
    const unlisted = copy();
    unlisted.data.find((entry) => entry.key === "notesage").url = "https://github.com/example-org/private-app";
    assert.ok(problemsOf(unlisted).includes('notesage: url "https://github.com/example-org/private-app" is not a repository the site may link — the public ones are PUBLIC_REPOS in scripts/lib/apps.mjs'), problemsOf(unlisted).join("\n"));
    // Nor is a github.com page that is no repository at all.
    const noRepository = copy();
    noRepository.data.find((entry) => entry.key === "notesage").url = "https://github.com/example-org";
    assert.ok(problemsOf(noRepository).some((p) => /^notesage: url "https:\/\/github\.com\/example-org" is not a repository the site may link/.test(p)), problemsOf(noRepository).join("\n"));
  });

  it("accepts an optional source.report in the entry's own repository — the Ashlands evaluation report — and fails one elsewhere or one that is no file URL (si-9qlz)", () => {
    // The real one: the report, not the README, says a person steered the build.
    assert.equal(data.find((entry) => entry.key === "ashlands").source.report, "https://github.com/addable-labs/ashlands/blob/main/EVALUATION.md");
    const withReport = (report) => {
      const input = copy();
      input.data.find((entry) => entry.key === "ashlands").source.report = report;
      return problemsOf(input);
    };
    // A good report passes: a heading anchor, a pinned commit, any case.
    for (const report of [
      "https://github.com/addable-labs/ashlands/blob/main/EVALUATION.md#6-honest-verdict-against-the-brief",
      "https://github.com/addable-labs/ashlands/blob/126437d6bb4ce95e28ea15f06056f71dec06808f/EVALUATION.md",
      "https://github.com/Addable-Labs/Ashlands/blob/main/EVALUATION.md",
    ]) {
      assert.deepEqual(withReport(report), [], report);
    }
    // A report in another repository fails, even one the site may link.
    for (const [report, repo] of [
      ["https://github.com/example-org/private-app/blob/main/EVALUATION.md", "example-org/private-app"],
      ["https://github.com/addable-labs/gaimer/blob/main/README.md", "addable-labs/gaimer"],
    ]) {
      const problems = withReport(report);
      assert.ok(problems.includes(`ashlands: source.report ${JSON.stringify(report)} is in ${repo}, not in the entry's own repository "addable-labs/ashlands"`), problems.join("\n"));
    }
    // A report that is no URL fails, and so does a URL that is no file's page.
    for (const report of ["EVALUATION.md", "https://github.com/addable-labs/ashlands"]) {
      const problems = withReport(report);
      assert.ok(problems.includes(`ashlands: source.report must be the URL of a file in the entry's own repository, https://github.com/addable-labs/ashlands/blob/<branch>/<path>, got ${JSON.stringify(report)}`), problems.join("\n"));
    }
  });

  it("links every public entry to its own repository, the one its repo names, and fails a url of another repository (si-nepq)", () => {
    for (const entry of data.filter((item) => !PRIVATE_APP_KEYS.includes(item.key))) {
      assert.equal(githubRepos(entry.url)[0].toLowerCase(), entry.repo.toLowerCase(), `${entry.key}: ${entry.url}`);
    }
    // A url of another repository fails, even one the site may link.
    const other = copy();
    other.data.find((entry) => entry.key === "notesage").url = "https://github.com/addable-labs/gaimer";
    assert.deepEqual(problemsOf(other), ['notesage: url "https://github.com/addable-labs/gaimer" links addable-labs/gaimer, not the entry\'s own repository "PeterBlenessy/notesage"']);
    // One the site may not link breaks both rules, and both are named, so
    // putting it on the list does not look like the fix.
    const unlisted = copy();
    unlisted.data.find((entry) => entry.key === "notesage").url = "https://github.com/example-org/private-app";
    assert.deepEqual(problemsOf(unlisted), [
      'notesage: url "https://github.com/example-org/private-app" is not a repository the site may link — the public ones are PUBLIC_REPOS in scripts/lib/apps.mjs',
      'notesage: url "https://github.com/example-org/private-app" links example-org/private-app, not the entry\'s own repository "PeterBlenessy/notesage"',
    ]);
    // A repo that is not the one the url links fails too, though the
    // sources, which are held to repo, agree with it.
    const moved = copy();
    Object.assign(moved.data.find((entry) => entry.key === "ashlands"), {
      repo: "example-org/other-app",
      source: { readme: "https://github.com/example-org/other-app/blob/main/README.md", report: "https://github.com/example-org/other-app/blob/main/EVALUATION.md", retrieved: "2026-09-23" },
    });
    assert.deepEqual(problemsOf(moved), ['ashlands: url "https://github.com/addable-labs/ashlands" links addable-labs/ashlands, not the entry\'s own repository "example-org/other-app"']);
    // Its own repository written in another case passes: like publicRepo(),
    // the rule ignores case.
    const cased = copy();
    cased.data.find((entry) => entry.key === "notesage").url = "https://github.com/peterblenessy/NoteSage";
    assert.deepEqual(problemsOf(cased), []);
  });

  it("holds source.readme to a file in the entry's own repository, a private entry's too, and fails a README in another repository (si-nepq)", () => {
    const withReadme = (key, readme) => {
      const input = copy();
      input.data.find((entry) => entry.key === key).source.readme = readme;
      return problemsOf(input);
    };
    // nivå's README is in its own repository though the repository is private:
    // the site links no source.
    const niva = data.find((entry) => entry.key === "niva");
    assert.ok(niva.source.readme.startsWith(`https://github.com/${niva.repo}/blob/`), niva.source.readme);
    // Its own repository written in another case passes.
    assert.deepEqual(withReadme("notesage", "https://github.com/peterblenessy/NoteSage/blob/main/README.md"), []);
    // A README in another repository fails, even one the site may link, and
    // a private entry's too.
    for (const [key, readme, repo] of [
      ["notesage", "https://github.com/addable-labs/gaimer/blob/main/README.md", "addable-labs/gaimer"],
      ["niva", "https://github.com/example-org/private-app/blob/main/README.md", "example-org/private-app"],
    ]) {
      const own = data.find((entry) => entry.key === key).repo;
      assert.deepEqual(withReadme(key, readme), [`${key}: source.readme ${JSON.stringify(readme)} is in ${repo}, not in the entry's own repository ${JSON.stringify(own)}`]);
    }
  });

  it("fails a source.readme that is no URL of a file on github.com, naming the URL it needs (si-nepq)", () => {
    // A path, the repository's page, the raw file, nothing and no README at all.
    for (const readme of ["README.md", "https://github.com/PeterBlenessy/notesage#readme", "https://raw.githubusercontent.com/PeterBlenessy/notesage/main/README.md", "", undefined]) {
      const input = copy();
      const { source } = input.data.find((entry) => entry.key === "notesage");
      if (readme === undefined) delete source.readme;
      else source.readme = readme;
      assert.deepEqual(problemsOf(input), [`notesage: source.readme must be the URL of a file in the entry's own repository, https://github.com/PeterBlenessy/notesage/blob/<branch>/<path>, got ${JSON.stringify(readme)}`], String(readme));
    }
  });

  it("names the article about the app where there is one — Ashlands and nivå — and fails an article that is not a post in both languages (si-3hpa)", () => {
    // The founder's request of 2026-09-23: the two apps with an article link
    // it, by the post's file name; the others name none.
    assert.deepEqual(Object.fromEntries(data.map((entry) => [entry.key, entry.article])), { niva: "lessons-from-building-niva", notesage: undefined, ashlands: "ashlands-what-one-prompt-built", gaimer: undefined });
    for (const lang of site.languages.codes) {
      assert.ok(strings[lang].portfolio.articleLink, `${lang}: portfolio.articleLink`);
    }
    const withArticle = (article, edit = () => {}) => {
      const input = copy();
      input.data.find((entry) => entry.key === "gaimer").article = article;
      edit(input);
      return problemsOf(input);
    };
    // A post of both languages passes, whichever app names it.
    assert.deepEqual(withArticle("how-this-site-was-built-by-agents"), []);
    // A name that is no post fails in each language, and so does a URL:
    // the data names the post, and the build makes each language's link.
    for (const article of ["no-such-article", "ashlands-what-one-prompt-built.md", "https://addablelabs.se/blog/ashlands-what-one-prompt-built/"]) {
      const problems = withArticle(article);
      for (const lang of site.languages.codes) {
        assert.ok(problems.includes(`gaimer: article ${JSON.stringify(article)} names no post in ${lang}: there is no src/${lang}/blog/posts/${article}.md`), problems.join("\n"));
      }
    }
    // A post of one language only fails for the other language.
    const englishOnly = withArticle("how-this-site-was-built-by-agents", (input) => {
      input.articles.sv = input.articles.sv.filter((slug) => slug !== "how-this-site-was-built-by-agents");
    });
    assert.deepEqual(englishOnly, ['gaimer: article "how-this-site-was-built-by-agents" names no post in sv: there is no src/sv/blog/posts/how-this-site-was-built-by-agents.md']);
    // A value that is no file name at all.
    for (const article of ["", null, 7]) {
      assert.ok(withArticle(article).includes(`gaimer: article must be the file name of a post, without .md, got ${JSON.stringify(article)}`), JSON.stringify(article));
    }
    // The link's label in every language.
    const unlabelled = copy();
    delete unlabelled.strings.sv.portfolio.articleLink;
    assert.deepEqual(problemsOf(unlabelled), ["sv: portfolio.articleLink is missing"]);
  });

  it("reads every GitHub repository a text names and matches the list without regard to case (si-vwu8)", () => {
    // A link, a feed's escaped markup and prose, with a ".git" suffix and a
    // sentence's full stop that are not part of the name.
    const text = '<a href="https://github.com/addable-labs/ashlands/blob/main/README.md">it</a>, href=&quot;https://github.com/gastownhall/beads&quot; and github.com/Example-Org/private-app.git. Also github.com/JetBrains/JetBrainsMono.';
    assert.deepEqual(githubRepos(text), ["addable-labs/ashlands", "gastownhall/beads", "Example-Org/private-app", "JetBrains/JetBrainsMono"]);
    assert.equal(publicRepo("jetbrains/jetbrainsmono"), "JetBrains/JetBrainsMono");
    assert.equal(publicRepo("example-org/private-app"), undefined);
  });

  it("keeps names within 16 characters and fails a 17-character name naming the band", () => {
    for (const lang of site.languages.codes) {
      for (const key of APP_KEYS) assert.ok([...strings[lang].portfolio[key].name].length <= BANDS.name, `${lang}: ${key}`);
    }
    const long = copy();
    long.strings.en.portfolio.gaimer.name = "Gaimer Studio Pro";
    assert.equal([...long.strings.en.portfolio.gaimer.name].length, 17);
    assert.ok(problemsOf(long).includes('en: portfolio.gaimer.name "Gaimer Studio Pro" is 17 characters (band: ≤ 16)'), problemsOf(long).join("\n"));
  });

  it("keeps status labels within 22 characters except the founder-confirmed private label, asserted verbatim", () => {
    // No entry carries the private status since feedback round 1 (si-yp2x),
    // so the strings hold no private label; the verbatim rule still applies
    // to any private label that is present (the reworded case below).
    for (const lang of site.languages.codes) {
      assert.equal(strings[lang].portfolioStatus.private, undefined, `${lang}: no private label while no entry is private`);
      for (const [status, label] of Object.entries(strings[lang].portfolioStatus)) {
        if (status !== "private") assert.ok([...label].length <= BANDS.statusLabel, `${lang}: ${status}`);
      }
    }
    assert.equal(PRIVATE_STATUS_LABEL.en, "private · API keys on request");
    assert.equal(PRIVATE_STATUS_LABEL.sv, "privat · API-nycklar på förfrågan");
    const long = copy();
    long.strings.en.portfolioStatus.experiment = "experiment and case study";
    assert.ok(problemsOf(long).includes('en: portfolioStatus.experiment "experiment and case study" is 25 characters (band: ≤ 22)'), problemsOf(long).join("\n"));
    const reworded = copy();
    reworded.strings.sv.portfolioStatus.private = "privat";
    assert.ok(problemsOf(reworded).some((p) => /^sv: portfolioStatus\.private must read "privat · API-nycklar på förfrågan"/.test(p)), problemsOf(reworded).join("\n"));
  });

  it("keeps the four summaries within a 25 % length band per language (AC-30)", () => {
    for (const lang of site.languages.codes) {
      const lengths = APP_KEYS.map((key) => [...strings[lang].portfolio[key].summary].length);
      assert.ok(Math.max(...lengths) <= Math.min(...lengths) * BANDS.ratio, `${lang}: ${lengths.join(", ")}`);
    }
    const uneven = copy();
    uneven.strings.sv.portfolio.niva.summary += " " + uneven.strings.sv.portfolio.niva.summary;
    assert.ok(problemsOf(uneven).some((p) => /^sv: app summaries are outside the 25 % band: .* portfolio\.niva\.summary is \d+$/.test(p)), problemsOf(uneven).join("\n"));
  });

  it("keeps service titles within 20 characters, texts within a 45 % band and 2–4 gets items per service", () => {
    for (const lang of site.languages.codes) {
      const lengths = THEME_KEYS.map((key) => [...strings[lang].themes[key].text].length);
      assert.ok(Math.max(...lengths) <= Math.min(...lengths) * BANDS.serviceRatio, `${lang}: ${lengths.join(", ")}`);
      for (const key of THEME_KEYS) {
        assert.ok([...strings[lang].themes[key].title].length <= BANDS.serviceTitle, `${lang}: ${key}`);
        const gets = Object.values(strings[lang].themes[key].gets).length;
        assert.ok(gets >= BANDS.getsMin && gets <= BANDS.getsMax, `${lang}: ${key} has ${gets} gets items`);
      }
    }
    const long = copy();
    long.strings.sv.themes.experiments.title = "AI-experiment och lärdomarna från dem";
    assert.ok(problemsOf(long).some((p) => /^sv: themes\.experiments\.title .* is 37 characters \(band: ≤ 20\)$/.test(p)), problemsOf(long).join("\n"));
    const few = copy();
    few.strings.en.themes["ai-adoption"].gets = { only: "A fluency baseline" };
    assert.ok(problemsOf(few).includes("en: themes.ai-adoption.gets has 1 item(s) (band: 2–4 non-empty items)"), problemsOf(few).join("\n"));
    const many = copy();
    // Every card holds three items since feedback round 1; two more overflow the band.
    many.strings.en.themes["ai-apps"].gets.fourth = "A fourth item";
    many.strings.en.themes["ai-apps"].gets.fifth = "A fifth item";
    assert.ok(problemsOf(many).includes("en: themes.ai-apps.gets has 5 item(s) (band: 2–4 non-empty items)"), problemsOf(many).join("\n"));
    const uneven = copy();
    uneven.strings.en.themes["ai-apps"].text += " " + uneven.strings.en.themes["ai-apps"].text;
    assert.ok(problemsOf(uneven).some((p) => /^en: service texts are outside the 45 % band/.test(p)), problemsOf(uneven).join("\n"));
    // The band's edge (si-hqi0): beside the longest English text, the others
    // may be as short as the longest over 1.45, and one character shorter fails.
    const texts = THEME_KEYS.map((key) => [key, [...strings.en.themes[key].text].length]);
    const [longestKey, longest] = texts.reduce((a, b) => (b[1] > a[1] ? b : a));
    const others = THEME_KEYS.filter((key) => key !== longestKey);
    let edge = 1;
    while (longest > edge * BANDS.serviceRatio) edge += 1;
    const withShortest = (shortest) => {
      const input = copy();
      for (const key of others) input.strings.en.themes[key].text = "x".repeat(edge);
      input.strings.en.themes[others[0]].text = "x".repeat(shortest);
      return input;
    };
    assert.ok(!problemsOf(withShortest(edge)).some((p) => p.startsWith("en: service texts")), problemsOf(withShortest(edge)).join("\n"));
    assert.ok(problemsOf(withShortest(edge - 1)).includes(`en: service texts are outside the 45 % band: themes.${others[0]}.text is ${edge - 1} characters, themes.${longestKey}.text is ${longest}`), problemsOf(withShortest(edge - 1)).join("\n"));
  });
});
