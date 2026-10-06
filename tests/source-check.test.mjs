import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { checkSources, fetchPage, findQuote, fold, htmlText, jsonReport, judge, main, MAX_REDIRECTS, markdownReport, pageText, parseArguments, quoteParts, RESULTS, samePage, summaryLine, USER_AGENT } from "../scripts/lib/source-check.mjs";
import { ENTRY_KEYS, SOURCES_DIR } from "../scripts/lib/sources.mjs";
import { ROOT, tempDir } from "./helpers.mjs";

// The source check (`pnpm sources:check`, si-1q9z), offline: the quote
// matcher and the page text on fixtures, then the fetch, the results and the
// command against a local HTTP server that stands in for the vendors' hosts
// — https://<host>/<path> is fetched from http://127.0.0.1:<port>/<host>/<path>
// — with a redirect chain, a 404, a moved page, a network error, a timeout.
// Each rule fails when it is broken. No request leaves the machine.

const NBSP = String.fromCharCode(0xa0);
const SOFT_HYPHEN = String.fromCharCode(0xad);
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/** A page's text as the check reads it: `pageText`, then `fold` of it. */
function page(html, contentType = "text/html; charset=utf-8", url = "https://example.test/") {
  const shown = pageText(html, contentType, url);
  return { ...shown, ...fold(shown.text) };
}

const found = (quote, html) => findQuote(quote, page(html)).found;

describe("source check: the quote matcher (si-1q9z)", () => {
  it("finds a quote in the page's text, whatever its whitespace and case", () => {
    assert.equal(found("Tools are what make Claude Code agentic.", "<p>Tools are what make\n   Claude Code <em>agentic</em>.</p>"), true);
    assert.equal(found("a simple, open format for guiding coding agents", "<h1>AGENTS.md</h1><p>A simple, open format for guiding coding agents.</p>"), true);
    assert.equal(found("ninety-nine per cent", `<p>ninety-nine${NBSP}per cent</p>`), true);
    assert.equal(found("percent of AGENTS.md", `<p>per${SOFT_HYPHEN}cent of AGENTS${ZERO_WIDTH_SPACE}.md</p>`), true);
    assert.equal(found("Tools are what make Claude Code agentic.", "<p>Tools are what make Claude agentic.</p>"), false);
  });

  it("reads typographic quotes, apostrophes and dashes as plain ones, both ways", () => {
    const html = "<p>It’s “agentic” – or ‘agent-like’ — says the page.</p>";
    assert.equal(found(`It's "agentic" - or 'agent-like' - says the page.`, html), true);
    assert.equal(found("It’s “agentic” — or ‘agent-like’ – says", "<p>It's \"agentic\" - or 'agent-like' - says</p>"), true);
    assert.equal(found("« agentic »", "<p>\" agentic \"</p>"), true);
    assert.equal(found(`It's "agentive"`, html), false);
  });

  it("reads a quote with an omission as parts that must all be on the page, in order", () => {
    const html = "<p>Your terminal. Any command you could run in a shell. If you can do it from the command line, Claude can too.</p>";
    assert.equal(found("Your terminal. Any command you could run … If you can do it from the command line, Claude can too.", html), true);
    assert.equal(found("Your terminal ... Claude can too.", html), true);
    assert.equal(found("Your terminal. [...] Claude can too.", html), true);
    assert.equal(found("Your terminal. (…) Claude can too.", html), true);
    assert.deepEqual(quoteParts("Your terminal. Any command … Claude can too.").map((part) => part.text), ["Your terminal. Any command", "Claude can too."]);
    // Out of order, or a part that is not there, fails.
    assert.equal(found("Claude can too … Your terminal", html), false);
    assert.equal(findQuote("Claude can too … Your terminal", page(html)).note, "«Your terminal» is on the page, but not after «Claude can too»");
    assert.equal(found("Your terminal … Claude can do anything.", html), false);
    // A quote whose own words hold three dots: its parts are still in order.
    assert.equal(found('Where you might have said "CRITICAL: You MUST use this tool when...", you can use "Use this tool when..."', '<p>Where you might have said "CRITICAL: You MUST use this tool when...", you can use "Use this tool when..." instead.</p>'), true);
    assert.equal(findQuote("…", page(html)).found, false);
  });

  it("matches a quote's Markdown backticks with code text on the page", () => {
    const html = "<p>An <code>AGENTS.md</code>, and no <code>CLAUDE.md</code> or <code>CLAUDE.local.md</code> in your working directory or above it.</p>";
    assert.equal(found("An `AGENTS.md`, and no `CLAUDE.md` or `CLAUDE.local.md` in your working directory or above it", html), true);
    assert.equal(found("An AGENTS.md, and no CLAUDE.md", html), true);
    assert.equal(found("An `AGENTS.md`, and no `GEMINI.md`", html), false);
  });

  it("says where the page parts ways with the quote", () => {
    const html = "<p>Codex concatenates files from the root down. Files closer to your current directory override earlier guidance because they appear later.</p>";
    assert.deepEqual(findQuote("Files closer to your location override earlier guidance", page(html)), {
      found: false,
      note: "the page reads «…s from the root down. Files closer to your current directory override earlier guidance» where the quote has «Files closer to your location override earlier guidance»",
    });
    const session = "<p>An agent harness runs a session, maintaining session state as the work progresses. VS Code supports several.</p>";
    assert.deepEqual(findQuote("An agent harness runs a session, maintaining session state.", page(session)), {
      found: false,
      note: "the page reads «…uns a session, maintaining session state as the work progresses. VS Code supports several.» where the quote has «…uns a session, maintaining session state.»",
    });
    assert.deepEqual(findQuote("Something else entirely", page(session)), { found: false, note: "the page has no passage like «Something else entirely»" });
  });
});

describe("source check: the text of a page (si-1q9z)", () => {
  it("is what an HTML page shows: no head, script, style or template, blocks apart, inline text together", () => {
    const html = [
      "<!DOCTYPE html><html><head><title>Hidden title</title><style>.x { content: 'hidden style' }</style></head>",
      "<body><nav><a href='/'>Copy as Markdown</a></nav><ul><li>Overview</li><li>Setup</li></ul>",
      "<p>Select <strong>Session</strong> <strong>Target</strong>, then <a href='#x'>Agent</a>.</p>",
      "<pre><code><span>npm</span> test</code></pre><script>var hidden = 'hidden script';</script>",
      "<template><p>hidden template</p></template><svg><text>hidden label</text></svg>",
      "<p id='restore'>It&#8217;s &amp; it&rsquo;s<br>done</p></body></html>",
    ].join("");
    const { text, ids } = htmlText(html);
    assert.equal(text, "Copy as Markdown Overview Setup Select Session Target, then Agent. npm test It’s & it’s done");
    assert.ok(ids.has("restore"));
    assert.equal(found("hidden", html), false);
  });

  it("reads a Markdown page as plain text, and any other text as it comes", () => {
    const markdown = "Claude treats them as context, not enforced configuration. To block an action, use a [PreToolUse hook](/en/hooks#pretooluse) instead.";
    assert.deepEqual(pageText(markdown, "text/markdown; charset=utf-8"), { text: "Claude treats them as context, not enforced configuration. To block an action, use a PreToolUse hook instead.", ids: null });
    assert.equal(pageText(markdown, "text/plain", "https://code.claude.com/docs/en/memory.md").text, pageText(markdown, "text/markdown").text);
    assert.equal(pageText("A  plain\ntext", "text/plain").text, "A plain text");
    assert.equal(pageText("<!doctype html><p>Sniffed</p>", "").text, "Sniffed");
  });
});

/** A page the check fetched, for `judge`. */
function fetched(html, fields = {}) {
  const shown = pageText(html, "text/html");
  return { url: "https://one.test/page", hops: [], status: 200, finalUrl: "https://one.test/page", contentType: "text/html", error: null, retried: false, seconds: 0.1, ...shown, ...fold(shown.text), ...fields };
}

const ENTRY = {
  id: "C7",
  article: "demo",
  sentence: { sv: "Utan verktyg kan Claude bara svara med text.", en: "Without tools, Claude can only respond with text." },
  vendor: "Anthropic",
  url: "https://one.test/page",
  final_url: "https://one.test/page",
  quote: "Without tools, Claude can only respond with text.",
  retrieved: "2026-10-06",
  last_checked: "2026-10-06",
};
const QUOTED = "<p>Tools are what make Claude Code agentic. Without tools, Claude can only respond with text.</p>";

describe("source check: one result per entry (si-1q9z)", () => {
  it("is ok when the page answers at final_url and holds the quote", () => {
    const result = judge(ENTRY, fetched(QUOTED));
    assert.equal(result.result, "ok");
    assert.equal(result.note, "");
    assert.equal(result.statuses, "200");
    assert.deepEqual(RESULTS, ["ok", "moved", "quote-missing", "unreachable"]);
  });

  it("is moved when the link ends elsewhere than final_url and the page holds the quote", () => {
    const hops = [{ url: "https://one.test/page", status: 301, location: "/new-page" }];
    const result = judge(ENTRY, fetched(QUOTED, { hops, finalUrl: "https://one.test/new-page" }));
    assert.equal(result.result, "moved");
    assert.equal(result.statuses, "301 → 200");
    assert.equal(result.final_url, "https://one.test/new-page");
    assert.equal(result.note, "final_url is https://one.test/page; redirected 301 to https://one.test/new-page");
    // A redirect to final_url itself is no move.
    assert.equal(judge({ ...ENTRY, final_url: "https://one.test/new-page" }, fetched(QUOTED, { hops, finalUrl: "https://one.test/new-page" })).result, "ok");
  });

  it("is quote-missing when the page answers without the quote, moved or not", () => {
    const changed = "<p>Without tools, Claude can only answer in text.</p>";
    assert.equal(judge(ENTRY, fetched(changed)).result, "quote-missing");
    assert.match(judge(ENTRY, fetched(changed)).note, /^quote not found: the page reads «Without tools, Claude can only answer in text\.» where the quote has «Without tools, Claude can only respond with text\.»$/);
    const moved = judge(ENTRY, fetched(changed, { finalUrl: "https://one.test/elsewhere" }));
    assert.equal(moved.result, "quote-missing");
    assert.match(moved.note, /; final_url is https:\/\/one\.test\/page$/);
  });

  it("is unreachable on an HTTP error after the redirects, a network error or a timeout", () => {
    assert.equal(judge(ENTRY, fetched("<p>Not found</p>", { status: 404 })).result, "unreachable");
    assert.equal(judge(ENTRY, fetched("<p>Not found</p>", { status: 404 })).note, "HTTP 404");
    assert.equal(judge(ENTRY, fetched("", { status: 500 })).result, "unreachable");
    const lost = judge(ENTRY, fetched("", { status: null, error: "ECONNRESET, also on the one retry" }));
    assert.equal(lost.result, "unreachable");
    assert.equal(lost.statuses, "—");
    assert.equal(lost.note, "ECONNRESET, also on the one retry");
  });

  it("compares URLs without their fragment, and notes a fragment the page has no element for", () => {
    assert.equal(samePage("https://one.test/page#agents-md", "https://one.test/page"), true);
    assert.equal(samePage("https://ONE.test:443/page", "https://one.test/page"), true);
    assert.equal(samePage("https://one.test/page/", "https://one.test/page"), false);
    const anchored = { ...ENTRY, url: "https://one.test/page#restore" };
    assert.equal(judge(anchored, fetched(`<h2 id="restore">Restore</h2>${QUOTED}`, { finalUrl: "https://one.test/page#restore" })).note, "");
    const lost = judge(anchored, fetched(QUOTED, { finalUrl: "https://one.test/page#restore" }));
    assert.equal(lost.result, "ok");
    assert.equal(lost.note, 'the page has no element with id "restore", the link\'s fragment');
  });
});

/**
 * A local server standing in for the vendors' hosts: `routes` maps
 * "<host>/<path>" to a handler (req, res, n), n counting the requests for
 * that path. It records each request and how many it served at once.
 */
async function startServer(routes) {
  const requests = [];
  let active = 0;
  let mostAtOnce = 0;
  const counts = new Map();
  const server = createServer((req, res) => {
    active += 1;
    mostAtOnce = Math.max(mostAtOnce, active);
    res.on("close", () => {
      active -= 1;
    });
    res.setHeader("connection", "close");
    const key = req.url.slice(1);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    requests.push({ path: key, userAgent: req.headers["user-agent"] });
    const route = routes[key];
    if (!route) {
      res.writeHead(404, { "content-type": "text/html" }).end("<p>Not found</p>");
      return;
    }
    route(req, res, counts.get(key));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  // A port nothing listens on: a request to down.test is refused.
  const closed = createServer();
  await new Promise((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const closedPort = closed.address().port;
  await new Promise((resolve) => closed.close(resolve));
  const fetchVia = (url, init) => {
    const target = new URL(url);
    assert.equal(target.protocol, "https:", `the check asked for ${url}`);
    assert.equal(target.hash, "", `the check sent a fragment: ${url}`);
    const local = target.hostname === "down.test" ? `http://127.0.0.1:${closedPort}/` : `http://127.0.0.1:${port}/${target.hostname}${target.pathname}${target.search}`;
    return fetch(local, init);
  };
  return {
    fetch: fetchVia,
    requests,
    get mostAtOnce() {
      return mostAtOnce;
    },
    countAtOnceFromNow() {
      mostAtOnce = active;
    },
    close: () => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

const html = (body) => (req, res) => res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(`<!doctype html><html><head><title>T</title></head><body>${body}</body></html>`);
const redirect = (status, location) => (req, res) => res.writeHead(status, { location }).end();
const drop = (req) => req.socket.destroy();
const hang = () => {};

// A request to the local server answers at once, but the machine may be
// busy: a timeout no answer comes near, and a short one only for the page
// that never answers.
const FAST = { timeoutMs: 10_000, retryDelayMs: 10 };
const HANG = { timeoutMs: 300, retryDelayMs: 10 };

describe("source check: fetching a page (si-1q9z)", () => {
  let server;
  before(async () => {
    server = await startServer({
      "one.test/start": redirect(301, "/middle"),
      "one.test/middle": redirect(308, "https://two.test/end"),
      "two.test/end": html(QUOTED),
      "one.test/page": html(QUOTED),
      "one.test/loop-a": redirect(302, "/loop-b"),
      "one.test/loop-b": redirect(302, "/loop-a"),
      "one.test/to-404": redirect(301, "/gone"),
      "one.test/server-error": (req, res) => res.writeHead(503).end(),
      "one.test/drops": drop,
      "one.test/drops-once": (req, res, n) => (n === 1 ? drop(req) : html(QUOTED)(req, res)),
      "one.test/hangs": hang,
      "one.test/anchor": redirect(301, "/page#elsewhere"),
      "one.test/bad-redirect": redirect(302, "http://[bad"),
      "one.test/latin1": (req, res) => res.writeHead(200, { "content-type": "text/html; charset=iso-8859-1" }).end(Buffer.from("<p>Caf\u00e9 cr\u00e8me</p>", "latin1")),
    });
  });
  after(async () => {
    await server.close();
  });

  it("follows a chain of redirects by hand and records every hop", async () => {
    const result = await fetchPage("https://one.test/start", { fetch: server.fetch, ...FAST });
    assert.equal(result.status, 200);
    assert.equal(result.error, null);
    assert.equal(result.finalUrl, "https://two.test/end");
    assert.deepEqual(result.hops, [
      { url: "https://one.test/start", status: 301, location: "/middle" },
      { url: "https://one.test/middle", status: 308, location: "https://two.test/end" },
    ]);
    assert.match(result.body, /Without tools, Claude can only respond with text\./);
  });

  it("carries the link's fragment to the final URL, unless a redirect names its own", async () => {
    assert.equal((await fetchPage("https://one.test/start#part", { fetch: server.fetch, ...FAST })).finalUrl, "https://two.test/end#part");
    assert.equal((await fetchPage("https://one.test/anchor#part", { fetch: server.fetch, ...FAST })).finalUrl, "https://one.test/page#elsewhere");
  });

  it("is unreachable after a redirect to something that is not a URL", async () => {
    const result = await fetchPage("https://one.test/bad-redirect", { fetch: server.fetch, ...FAST });
    assert.equal(result.error, 'a redirect to "http://[bad", which is not a URL');
    const shown = judge(ENTRY, { ...result, text: "", folded: "", at: [], ids: null });
    assert.equal(shown.result, "unreachable");
    assert.equal(shown.note, 'a redirect to "http://[bad", which is not a URL; redirected 302 to "http://[bad"');
  });

  it("stops after too many redirects", async () => {
    const result = await fetchPage("https://one.test/loop-a", { fetch: server.fetch, ...FAST });
    assert.equal(result.error, `more than ${MAX_REDIRECTS} redirects`);
    assert.equal(result.hops.length, MAX_REDIRECTS + 1);
  });

  it("gives a network error one retry, and no more", async () => {
    const before = server.requests.length;
    const lost = await fetchPage("https://one.test/drops", { fetch: server.fetch, ...FAST });
    assert.equal(lost.status, null);
    assert.match(lost.error, /, also on the one retry$/);
    assert.equal(server.requests.slice(before).length, 2);
    const answered = await fetchPage("https://one.test/drops-once", { fetch: server.fetch, ...FAST });
    assert.equal(answered.status, 200);
    assert.equal(answered.retried, true);
    const refused = await fetchPage("https://down.test/page", { fetch: server.fetch, ...FAST });
    assert.match(refused.error, /^connect ECONNREFUSED 127\.0\.0\.1:\d+, also on the one retry$/);
  });

  it("gives up on a page that does not answer within the timeout, after one retry", async () => {
    const before = server.requests.length;
    const result = await fetchPage("https://one.test/hangs", { fetch: server.fetch, ...HANG });
    assert.equal(result.error, "timed out after 0.3 s, also on the one retry");
    assert.ok(server.requests.slice(before).length <= 2);
  });

  it("decodes a page in the charset it names", async () => {
    const result = await fetchPage("https://one.test/latin1", { fetch: server.fetch, ...FAST });
    assert.equal(pageText(result.body, result.contentType).text, "Café crème");
  });

  it("checks each entry against its page, each page fetched once, one request at a time, naming the site", async () => {
    const before = server.requests.length;
    server.countAtOnceFromNow();
    const entries = [
      { ...ENTRY, id: "A", url: "https://one.test/start", final_url: "https://two.test/end" },
      { ...ENTRY, id: "B", url: "https://one.test/start#part", final_url: "https://one.test/start" },
      { ...ENTRY, id: "C", url: "https://one.test/page", quote: "Claude can only answer in text." },
      { ...ENTRY, id: "D", url: "https://one.test/to-404" },
      { ...ENTRY, id: "E", url: "https://one.test/server-error" },
      { ...ENTRY, id: "F", url: "https://one.test/page", quote: "Tools are what make … Claude can only respond" },
    ];
    const lines = [];
    const run = await checkSources([{ label: "demo.yaml", article: "demo", entries }], { fetch: server.fetch, ...FAST, log: (line) => lines.push(line) });
    assert.deepEqual(run.results.map((row) => [row.entry.id, row.result, row.statuses]), [
      ["A", "ok", "301 → 308 → 200"],
      ["B", "moved", "301 → 308 → 200"],
      ["C", "quote-missing", "200"],
      ["D", "unreachable", "301 → 404"],
      ["E", "unreachable", "503"],
      ["F", "ok", "200"],
    ]);
    assert.equal(run.results[1].final_url, "https://two.test/end#part");
    assert.equal(run.results[3].note, "HTTP 404; redirected 301 to https://one.test/gone");
    assert.equal(run.pages, 4);
    // The page that never answers may still be heard from late; it is no part of this run.
    const requests = server.requests.slice(before).filter((request) => request.path !== "one.test/hangs");
    assert.deepEqual(requests.map((request) => request.path), ["one.test/start", "one.test/middle", "two.test/end", "one.test/page", "one.test/to-404", "one.test/gone", "one.test/server-error"]);
    assert.ok(requests.every((request) => request.userAgent === USER_AGENT));
    assert.match(USER_AGENT, /^addablelabs\.se source check/);
    assert.equal(server.mostAtOnce, 1);
    assert.equal(lines.length, 4);
    assert.match(lines[0], /^https:\/\/one\.test\/start → 301 → 308 → 200 in \d+\.\d s$/);
  });
});

/** A source list's YAML for `entries`. */
function listYaml(entries) {
  return entries
    .map((entry) => [
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
    ].join("\n"))
    .join("\n")
    .concat("\n");
}

/** Somewhere `main` writes: a stream that keeps what it was given. */
function sink() {
  const chunks = [];
  return { write: (chunk) => chunks.push(String(chunk)), get text() {
    return chunks.join("");
  } };
}

const sha = async (file) => createHash("sha256").update(await readFile(file)).digest("hex");
const exists = (file) => stat(file).then(() => true, () => false);

describe("source check: the command (si-1q9z)", () => {
  let server;
  let tmp;
  let root;
  let list;
  const NOW = new Date("2026-10-06T19:00:00Z");
  before(async () => {
    server = await startServer({ "one.test/page": html(QUOTED), "one.test/old": redirect(301, "/page") });
    tmp = await tempDir("source-check-");
    // A repository of its own: an article in both languages and its list.
    root = path.join(tmp.dir, "repo");
    for (const lang of ["sv", "en"]) {
      await mkdir(path.join(root, "src", lang, "blog", "posts"), { recursive: true });
      await writeFile(path.join(root, "src", lang, "blog", "posts", "demo.md"), `---\ntitle: Demo\n---\n\n${ENTRY.sentence[lang]}\n`);
    }
    await mkdir(path.join(root, SOURCES_DIR), { recursive: true });
    list = path.join(root, SOURCES_DIR, "demo.yaml");
    // C8's page moved since its final_url was recorded.
    await writeFile(list, listYaml([ENTRY, { ...ENTRY, id: "C8", url: "https://one.test/old", final_url: "https://one.test/old" }]));
  });
  after(async () => {
    await server.close();
    await tmp.cleanup();
  });

  /** Run the command in the test repository against the local server. */
  async function run(argv, io = {}) {
    const stdout = sink();
    const stderr = sink();
    const code = await main(argv, { fetch: server.fetch, root, cwd: root, stdout, stderr, now: () => NOW, ...FAST, ...io });
    return { code, stdout: stdout.text, stderr: stderr.text };
  }

  it("checks every list in docs/sources/, prints the report and exits 1 when an entry is not ok", async () => {
    const before = await sha(list);
    const { code, stdout, stderr } = await run([]);
    assert.equal(code, 1);
    assert.match(stdout, /^# Source check\n\nChecked 2026-10-06 19:00 UTC: 1 ok, 1 moved, 0 quote-missing, 0 unreachable \(2 entries in 1 source list, 2 pages, \d+\.\d s\)\.\n\n## demo\n\n`docs\/sources\/demo\.yaml`: 2 entries\.\n\n\| Id \| Result \| Status \| Final URL \| Note \|\n/);
    assert.match(stdout, /\n\| C7 \| ok \| 200 \| https:\/\/one\.test\/page \| {2}\|\n/);
    assert.match(stdout, /\n\| C8 \| moved \| 301 → 200 \| https:\/\/one\.test\/page \| final_url is https:\/\/one\.test\/old; redirected 301 to https:\/\/one\.test\/page \|\n/);
    assert.match(stderr, /^https:\/\/one\.test\/page → 200 in /m);
    // The founder's rule: the check never changes a list.
    assert.equal(await sha(list), before);
  });

  it("exits 0 when every entry is ok, and writes the report and its JSON where it is told", async () => {
    const good = path.join(tmp.dir, "good", "demo.yaml");
    await mkdir(path.dirname(good), { recursive: true });
    await writeFile(good, listYaml([ENTRY, { ...ENTRY, id: "C8", url: "https://one.test/old" }].map((entry) => ({ ...entry, final_url: "https://one.test/page" }))));
    const out = path.join(tmp.dir, "report.md");
    const json = path.join(tmp.dir, "report.json");
    const { code, stdout } = await run(["--out", out, `--json=${json}`, good]);
    assert.equal(code, 0);
    assert.match(stdout, new RegExp(`^sources:check: 2 ok, 0 moved, 0 quote-missing, 0 unreachable \\(2 entries in 1 source list, 2 pages, \\d+\\.\\d s\\); report in ${out.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\n$`));
    assert.match(await readFile(out, "utf8"), /\n\| C8 \| ok \| 301 → 200 \| https:\/\/one\.test\/page \| redirected 301 to https:\/\/one\.test\/page \|\n/);
    const report = JSON.parse(await readFile(json, "utf8"));
    assert.equal(report.checkedAt, NOW.toISOString());
    assert.deepEqual(report.summary, { entries: 2, lists: 1, pages: 2, ok: 2, moved: 0, "quote-missing": 0, unreachable: 0 });
    assert.deepEqual(report.lists, [{ file: good, article: "demo", entries: 2 }]);
    const [first, second] = report.results;
    assert.deepEqual(Object.keys(first), ["file", "article", "id", "result", "status", "final_url", "hops", "note", "entry"]);
    assert.deepEqual(Object.keys(first.entry), ENTRY_KEYS);
    assert.deepEqual(second.hops, [{ url: "https://one.test/old", status: 301, location: "/page" }]);
  });

  it("exits 2 on a format error, and fetches nothing", async () => {
    const bad = path.join(root, SOURCES_DIR, "demo.yaml");
    const original = await readFile(bad, "utf8");
    await writeFile(bad, listYaml([{ ...ENTRY, final_url: "http://one.test/page" }]));
    try {
      const { code, stdout, stderr } = await run([], { fetch: () => assert.fail("the check fetched despite a format error") });
      assert.equal(code, 2);
      assert.equal(stdout, "");
      assert.equal(stderr, 'docs/sources/demo.yaml: entry 1 (C7): final_url must be an https URL, got "http://one.test/page"\nsources:check: 1 format problem; nothing was fetched\n');
      await writeFile(bad, listYaml([{ ...ENTRY, sentence: { ...ENTRY.sentence, en: "Not in the article." } }]));
      assert.equal((await run([], { fetch: () => assert.fail("fetched") })).code, 2);
      // --no-article-check lets a list written before its article through.
      assert.equal((await run(["--no-article-check"])).code, 0);
    } finally {
      await writeFile(bad, original);
    }
    await writeFile(path.join(root, SOURCES_DIR, "notes.md"), "");
    try {
      const { code, stderr } = await run([], { fetch: () => assert.fail("fetched") });
      assert.equal(code, 2);
      assert.match(stderr, /^docs\/sources\/notes\.md: not a source list; /);
    } finally {
      await rm(path.join(root, SOURCES_DIR, "notes.md"));
    }
  });

  it("exits 2 on a usage error: an unknown option, a missing value or a file that does not exist", async () => {
    const usage = [
      [["--bogus"], "unknown option --bogus"],
      [["--out"], "--out needs a file"],
      [["--out", "--json", "report.json"], "--out needs a file"],
      [["--json"], "--json needs a file"],
      [["missing.yaml"], `no such file: ${path.join(root, "missing.yaml")}`],
      [["--out", path.join("no-such-directory", "report.md")], `--out ${path.join("no-such-directory", "report.md")}: no such directory`],
      [["--out", "report.out", "--json", "report.out"], "--out and --json name the same file"],
    ];
    for (const [argv, message] of usage) {
      const { code, stdout, stderr } = await run(argv, { fetch: () => assert.fail("fetched") });
      assert.equal(code, 2, argv.join(" "));
      assert.equal(stdout, "");
      assert.ok(stderr.startsWith(`sources:check: ${message}\n\nusage: pnpm sources:check `), stderr);
    }
    assert.deepEqual(parseArguments(["--out=report.md", "--no-article-check", "--", "--odd.yaml"]), { files: ["--odd.yaml"], out: "report.md", json: null, checkArticles: false, help: false });
    const help = await run(["--help"]);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /^usage: pnpm sources:check /);
  });

  it("refuses to write a report into docs/sources/, src/ or over a list (the founder's rule)", async () => {
    const state = async (file) => ((await exists(file)) ? sha(file) : "absent");
    for (const [flag, target] of [["--out", path.join(SOURCES_DIR, "report.md")], ["--json", path.join(SOURCES_DIR, "demo.yaml")], ["--out", path.join("src", "en", "blog", "posts", "demo.md")], ["--json", path.join("src", "report.json")]]) {
      const before = [await state(list), await state(path.join(root, target))];
      const { code, stderr } = await run([flag, target], { fetch: () => assert.fail("fetched") });
      assert.equal(code, 2, `${flag} ${target}`);
      assert.match(stderr, new RegExp(`^sources:check: ${flag} ${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: the check never writes to (docs/sources|src)/\n`));
      assert.deepEqual([await state(list), await state(path.join(root, target))], before);
    }
    const elsewhere = path.join(tmp.dir, "elsewhere.yaml");
    await writeFile(elsewhere, listYaml([{ ...ENTRY, article: "elsewhere" }]));
    const { code, stderr } = await run(["--no-article-check", "--out", elsewhere, elsewhere], { fetch: () => assert.fail("fetched") });
    assert.equal(code, 2);
    assert.match(stderr, /the check never writes to a source list/);
  });

  it("exits 0 with nothing to check when docs/sources/ holds no list", async () => {
    const empty = path.join(tmp.dir, "empty-repo");
    await mkdir(path.join(empty, "src"), { recursive: true });
    const { code, stdout } = await run([], { root: empty, cwd: empty, fetch: () => assert.fail("fetched") });
    assert.equal(code, 0);
    assert.match(stdout, /: 0 ok, 0 moved, 0 quote-missing, 0 unreachable \(0 entries in 0 source lists, 0 pages, \d+\.\d s\)\.\n\nNo source lists: docs\/sources\/ holds none\.\n$/);
  });
});

describe("source check: the report (si-1q9z)", () => {
  it("is a Markdown table per article, and the same as JSON", () => {
    const rows = [
      { list: "docs/sources/demo.yaml", article: "demo", ...judge(ENTRY, fetched(QUOTED)) },
      { list: "docs/sources/demo.yaml", article: "demo", ...judge({ ...ENTRY, id: "C9", quote: "A | pipe" }, fetched(QUOTED)) },
    ];
    const run = { checkedAt: new Date("2026-10-06T19:00:00Z"), seconds: 1.23, pages: 1, lists: [{ label: "docs/sources/demo.yaml", article: "demo", entries: [ENTRY, ENTRY] }], results: rows };
    assert.equal(summaryLine(run), "1 ok, 0 moved, 1 quote-missing, 0 unreachable (2 entries in 1 source list, 1 page, 1.2 s)");
    assert.equal(
      markdownReport(run),
      [
        "# Source check",
        "",
        "Checked 2026-10-06 19:00 UTC: 1 ok, 0 moved, 1 quote-missing, 0 unreachable (2 entries in 1 source list, 1 page, 1.2 s).",
        "",
        "## demo",
        "",
        "`docs/sources/demo.yaml`: 2 entries.",
        "",
        "| Id | Result | Status | Final URL | Note |",
        "| --- | --- | --- | --- | --- |",
        "| C7 | ok | 200 | https://one.test/page |  |",
        "| C9 | quote-missing | 200 | https://one.test/page | quote not found: the page has no passage like «A \\| pipe» |",
        "",
      ].join("\n"),
    );
    const json = JSON.parse(jsonReport(run));
    assert.deepEqual(json.results.map((row) => [row.id, row.result, row.status]), [["C7", "ok", 200], ["C9", "quote-missing", 200]]);
    assert.equal(json.seconds, 1.2);
  });
});

describe("source check: the script (si-1q9z)", () => {
  it("is `pnpm sources:check`, not a gate, and exits 2 on a usage or format error without the network", async () => {
    const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
    assert.equal(pkg.scripts["sources:check"], "node scripts/sources-check.mjs");
    assert.equal(Object.keys(pkg.scripts).filter((name) => name.includes("sources")).length, 1);
    const script = path.join(ROOT, "scripts", "sources-check.mjs");
    const usage = spawnSync(process.execPath, [script, "--bogus"], { cwd: ROOT, encoding: "utf8" });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /^sources:check: unknown option --bogus\n\nusage: pnpm sources:check /);
    const { dir, cleanup } = await tempDir("source-check-script-");
    try {
      const bad = path.join(dir, "bad.yaml");
      await writeFile(bad, "- id: C3\n");
      const format = spawnSync(process.execPath, [script, bad], { cwd: ROOT, encoding: "utf8" });
      assert.equal(format.status, 2);
      assert.match(format.stderr, /bad\.yaml: entry 1 \(C3\): missing keys article, sentence, vendor, url, final_url, quote, retrieved, last_checked\n/);
      assert.match(format.stderr, /nothing was fetched\n$/);
    } finally {
      await cleanup();
    }
  });
});
