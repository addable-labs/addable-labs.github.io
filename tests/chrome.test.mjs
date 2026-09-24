import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { findChrome, launchChrome } from "../scripts/lib/chrome.mjs";
import { buildSite, fixture, runGate, SRC, tempDir } from "./helpers.mjs";

// The Chrome gates when Chrome is lost (si-828d). launchChrome kills a Chrome
// that never opens its DevTools port and names the port it waited for (the
// connection refused on CI run 35903450397); a stand-in for Chrome plays that
// part, so the case needs no browser. The gate cases kill a real Chrome by its
// own pid mid-measure, as it loads the page (tests/fixtures/kill-chrome.mjs):
// killed once, the page is measured again in a new Chrome; killed twice, the
// gate fails with one line naming the page and the cause, and measures nothing
// after it. An error nobody handles fails the try in flight, unless a Chrome
// was lost before it: then it is the lost Chrome's run's, and dropped. The
// Lighthouse lines of such a run go to the step summary a case names, and to
// none it does not: a gate run by a test writes nothing to the summary of the
// CI step that runs the tests. A gate stopped by SIGINT or SIGTERM mid-measure
// (si-shkd) exits 130 or 143 at once, with no page measured again and no line
// after the signal, and leaves no Chrome and no profile; SIGINT comes twice,
// as it does under pnpm. The gate cases skip when no Chrome is found,
// except under CHECK_REQUIRE_CHROME=1 (CI), where they run.

/** Whether a process in the group `pid` leads is alive (Chrome's helpers share its group). */
function groupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

/** Wait until no process of the group `pid` leads is alive; false if some still is after `ms`. */
async function groupGone(pid, ms = 5000) {
  const until = Date.now() + ms;
  while (groupAlive(pid)) {
    if (Date.now() > until) return false;
    await delay(50);
  }
  return true;
}

/** The value of `--<name>=` among a command's arguments. */
function flag(args, name) {
  return args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

describe("launchChrome with a Chrome that never opens its DevTools port (si-828d)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("chrome-launch-");
  });
  after(() => tmp.cleanup());

  it("kills that Chrome, removes its profile and rejects naming the port it waited for", async () => {
    // A stand-in for Chrome: writes its pid and arguments, then waits without
    // listening. The launch polls its port for 2 s, time enough for a first
    // exec of a new script (macOS can take over 100 ms).
    const chromePath = path.join(tmp.dir, "chrome");
    const record = path.join(tmp.dir, "chrome.txt");
    await writeFile(chromePath, `#!/bin/sh\necho "$$ $*" > "${record}"\nexec sleep 30\n`, { mode: 0o755 });
    const error = await launchChrome({ chromePath, maxConnectionRetries: 20, connectionPollInterval: 100 }).then(
      () => null,
      (rejection) => rejection,
    );
    assert.ok(error, "the launch did not reject");
    const [pid, ...args] = (await readFile(record, "utf8")).trim().split(" ");
    assert.equal(error.message, `Chrome did not start: connect ECONNREFUSED 127.0.0.1:${flag(args, "remote-debugging-port")}`);
    assert.ok(await groupGone(Number(pid)), `the stand-in Chrome ${pid} is still running`);
    const profile = flag(args, "user-data-dir");
    assert.match(profile, /addable-chrome-/);
    assert.equal(existsSync(profile), false, `its profile ${profile} is left`);
  });
});

const CHROME = await findChrome();
const noChrome = CHROME === null && process.env.CHECK_REQUIRE_CHROME !== "1" ? "no Chrome found" : false;

describe("a Chrome gate whose measure fails: Chrome killed, or an error nobody handles (si-828d)", { skip: noChrome }, () => {
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("chrome-lost-");
    out = buildSite(path.join(tmp.dir, "site"), { SITE_ENV: "production" });
  });
  after(() => tmp?.cleanup());

  /**
   * Run `gate` on the production build, Chrome required, with Chrome killed
   * as it loads the tries `kills` names. Returns the gate's status, its stdout
   * lines, all its output, and what the fixture logged, in order (`logged`):
   * every try, { label, attempt, pid, profile, killed, at } (also `tries`),
   * every kill, { kill, at } (also `kills`), and the exit, { exit, at }.
   */
  async function killedRun(name, gate, kills, env = {}) {
    const log = path.join(tmp.dir, `${name}.jsonl`);
    const preload = `--import=${pathToFileURL(fixture("kill-chrome.mjs")).href}`;
    const { status, stdout, stderr } = runGate(gate, out, SRC, {
      SITE_ENV: "production",
      CHECK_REQUIRE_CHROME: "1",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(" "),
      KILL_CHROME: JSON.stringify(kills),
      KILL_CHROME_LOG: log,
      ...env,
    });
    const logged = (await readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    return {
      status,
      lines: stdout.trim().split("\n"),
      output: `${stdout}${stderr}`,
      logged,
      tries: logged.filter((entry) => "label" in entry),
      kills: logged.filter((entry) => "kill" in entry),
    };
  }

  /**
   * After each kill the gate went on at once, to the page's next try or to
   * its end: a Lighthouse run whose Chrome dies as it loads the page can
   * wait out the rest of its 45 s load timeout before it fails.
   */
  function assertAtOnce(run) {
    run.logged.forEach((entry, index) => {
      if (!("kill" in entry)) return;
      const next = run.logged[index + 1];
      assert.ok(next && next.at - entry.at < 10_000, `the gate went on ${next ? next.at - entry.at : "never"} ms after it lost Chrome ${entry.kill}`);
    });
  }

  /** The fixture's line for a killed try. */
  function killLine(label, attempt) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return new RegExp(`^kill-chrome: killed Chrome \\d+ while it loaded ${escaped} \\(try ${attempt}\\)$`);
  }

  /** Each line equals its string or matches its pattern, and there are no others. */
  function assertLines(lines, expected, output) {
    assert.equal(lines.length, expected.length, output);
    expected.forEach((want, index) => (want instanceof RegExp ? assert.match(lines[index], want, output) : assert.equal(lines[index], want, output)));
  }

  /** No stack trace or crash anywhere in the output, and no Chrome the gate used is left: process group or profile. */
  async function assertClean(run) {
    assert.doesNotMatch(run.output, /^\s+at |node:internal|triggerUncaughtException/m, run.output);
    for (const { pid, profile } of run.tries) {
      assert.ok(await groupGone(pid), `Chrome ${pid} is still running`);
      assert.equal(existsSync(profile), false, `its profile ${profile} is left`);
    }
  }

  it("lighthouse: measures a page killed once again in a new Chrome, at once; a page killed twice is one FAIL line, and nothing after it is measured; the page lines go to the step summary", async () => {
    const summary = path.join(tmp.dir, "lighthouse-summary.md");
    const run = await killedRun("lighthouse", "lighthouse", { "/": 1, "/sv/": 2 }, { GITHUB_STEP_SUMMARY: summary });
    assert.equal(run.status, 1, run.output);
    assertLines(
      run.lines,
      [
        killLine("/", 1),
        "lighthouse /: not measured (Chrome exited on SIGKILL), measuring it again in a new Chrome",
        // Measured: four scores and a layout shift, whatever they are.
        /^lighthouse \/: performance \d+(?: \([\d, –]+\))? · accessibility \d+ · best-practices \d+ · seo \d+ · CLS \d+\.\d{3} (?:ok|FAIL — .+)$/,
        killLine("/sv/", 1),
        "lighthouse /sv/: not measured (Chrome exited on SIGKILL), measuring it again in a new Chrome",
        killLine("/sv/", 2),
        "lighthouse /sv/: FAIL — not measured in a new Chrome either (Chrome exited on SIGKILL)",
        "FAIL lighthouse (/sv/ not measured)",
      ],
      run.output,
    );
    // The Chromes killed are those of the tries marked killed, and each try after a kill ran in a new Chrome.
    const killed = run.tries.filter((entry) => entry.killed);
    assert.deepEqual(
      killed.map(({ label, attempt }) => [label, attempt]),
      [
        ["/", 1],
        ["/sv/", 1],
        ["/sv/", 2],
      ],
    );
    assert.deepEqual(
      run.kills.map((entry) => entry.kill),
      killed.map((entry) => entry.pid),
    );
    const retry = run.tries.find(({ label, attempt }) => label === "/" && attempt === 2);
    assert.notEqual(retry.pid, killed[0].pid);
    assert.notEqual(killed[2].pid, killed[1].pid);
    // The page lines go to the summary, those about a page measured again or not measured among them; the kill lines and the verdict do not.
    const pageLines = run.lines.filter((line) => line.startsWith("lighthouse "));
    assert.equal(await readFile(summary, "utf8"), `### Lighthouse\n\n\`\`\`text\n${pageLines.join("\n")}\n\`\`\`\n`);
    assertAtOnce(run);
    await assertClean(run);
  });

  it("lighthouse, run by a test: writes nothing to the step summary the test process names (runGate clears GITHUB_STEP_SUMMARY, which GitHub sets for the test step)", async () => {
    const summary = path.join(tmp.dir, "step-summary.md");
    await writeFile(summary, "earlier output\n");
    const saved = process.env.GITHUB_STEP_SUMMARY;
    process.env.GITHUB_STEP_SUMMARY = summary;
    let run;
    try {
      // "/" killed twice: the shortest run to the gate's end, where it writes
      // the summary it is given (the case above).
      run = await killedRun("summary", "lighthouse", { "/": 2 });
    } finally {
      if (saved === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = saved;
    }
    assert.equal(run.status, 1, run.output);
    assert.equal(run.lines.at(-1), "FAIL lighthouse (/ not measured)", run.output);
    await assertClean(run);
    assert.equal(await readFile(summary, "utf8"), "earlier output\n");
  });

  it("layout: measures a page × width killed once again in a new Chrome, at its width, and passes", async () => {
    // The article the Lighthouse gate measures too, at a width set before the kill.
    const label = "/blog/how-this-site-was-built-by-agents/ 768";
    const dump = path.join(tmp.dir, "layout.json");
    const run = await killedRun("layout-once", "layout", { [label]: 1 }, { LAYOUT_DUMP: dump });
    assert.equal(run.status, 0, run.output);
    const labels = new Set(run.tries.map((entry) => entry.label));
    assert.ok(labels.has(label), `no try of ${label}`);
    // The kill, the line about it, one line per page × width as without a kill, and PASS.
    assert.match(run.lines[0], killLine(label, 1), run.output);
    assert.equal(run.lines[1], `layout ${label}: not measured (Chrome exited on SIGKILL), measuring it again in a new Chrome`, run.output);
    assert.equal(run.lines.length, 2 + labels.size + 1, run.output);
    assert.ok(run.lines.some((line) => line.startsWith(`layout ${label}: ok (`)), run.output);
    assert.equal(run.lines.at(-1), "PASS layout", run.output);
    // Measured in the new Chrome's tab at 768 px, not at the 800 px a new tab opens with.
    const measured = JSON.parse(await readFile(dump, "utf8")).find(({ page, width }) => `${page} ${width}` === label);
    assert.equal(measured.article.innerWidth, 768);
    // Two Chromes: the killed one, and the new one for this page and every page after it.
    const pids = [...new Set(run.tries.map((entry) => entry.pid))];
    assert.equal(pids.length, 2, JSON.stringify(run.tries));
    assert.deepEqual(
      run.kills.map((entry) => entry.kill),
      [pids[0]],
    );
    assertAtOnce(run);
    await assertClean(run);
  });

  it("drops an error nobody handles once a Chrome is lost: it belongs to the lost Chrome's run, not to the page's next try", async () => {
    const label = "/sv/ 768";
    const run = await killedRun("stray-after-loss", "layout", { [label]: 1 }, { KILL_CHROME_STRAY: JSON.stringify({ [label]: 2 }) });
    assert.equal(run.status, 0, run.output);
    assert.match(run.lines[0], killLine(label, 1), run.output);
    assert.equal(run.lines[1], `layout ${label}: not measured (Chrome exited on SIGKILL), measuring it again in a new Chrome`, run.output);
    assert.ok(run.lines.some((line) => line.startsWith(`layout ${label}: ok (`)), run.output);
    assert.equal(run.lines.at(-1), "PASS layout", run.output);
    await assertClean(run);
  });

  it("fails the try in flight on an error nobody handles while its Chrome runs, and measures the page again", async () => {
    const label = "/sv/ 768";
    const run = await killedRun("stray-before-loss", "layout", {}, { KILL_CHROME_STRAY: JSON.stringify({ [label]: 1 }) });
    assert.equal(run.status, 0, run.output);
    assert.equal(run.lines[0], `layout ${label}: not measured (kill-chrome: an error nobody handles, in try 1 of ${label}), measuring it again in a new Chrome`, run.output);
    assert.ok(run.lines.some((line) => line.startsWith(`layout ${label}: ok (`)), run.output);
    assert.equal(run.lines.at(-1), "PASS layout", run.output);
    assert.equal(new Set(run.tries.map((entry) => entry.pid)).size, 2, JSON.stringify(run.tries));
    await assertClean(run);
  });

  it("layout: a page × width killed twice is one FAIL line, and nothing after it is measured", async () => {
    const run = await killedRun("layout-twice", "layout", { "/ 360": 2 });
    assert.equal(run.status, 1, run.output);
    assertLines(
      run.lines,
      [
        killLine("/ 360", 1),
        "layout / 360: not measured (Chrome exited on SIGKILL), measuring it again in a new Chrome",
        killLine("/ 360", 2),
        "layout / 360: FAIL — not measured in a new Chrome either (Chrome exited on SIGKILL)",
        "FAIL layout (/ 360 not measured)",
      ],
      run.output,
    );
    assert.deepEqual(
      run.tries.map(({ label, attempt, killed }) => [label, attempt, killed]),
      [
        ["/ 360", 1, true],
        ["/ 360", 2, true],
      ],
    );
    assertAtOnce(run);
    await assertClean(run);
  });

  describe("stopped by a signal mid-measure (si-shkd)", () => {
    /** The fixture's lines for the signals it sent while Chrome loaded `label`. */
    function signalLines(label, signals) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      return signals.map((signal, index) =>
        index === 0 ? new RegExp(`^kill-chrome: sent ${signal} to the gate while Chrome \\d+ loaded ${escaped} \\(try 1\\)$`) : `kill-chrome: sent ${signal} to the gate again, once it had taken ${signals[index - 1]}`,
      );
    }

    for (const { gate, label, signals, code } of [
      // Ctrl-C under pnpm, which passes it on to the script it runs: SIGINT twice.
      { gate: "lighthouse", label: "/", signals: ["SIGINT", "SIGINT"], code: 130 },
      { gate: "layout", label: "/sv/ 360", signals: ["SIGTERM"], code: 143 },
    ]) {
      it(`${gate}, ${signals.join(" and ")} as it loads ${label}: exits ${code} at once, measures nothing again, prints no FAIL or "not measured" line and leaves no Chrome or profile`, async () => {
        // Chrome's profiles go to a temp dir of the case's own, so whatever is
        // left in it is this run's.
        const tmpdir = path.join(tmp.dir, `tmpdir-${gate}`);
        await mkdir(tmpdir);
        const run = await killedRun(`signal-${gate}`, gate, {}, { KILL_CHROME_SIGNAL: JSON.stringify({ [label]: signals }), TMPDIR: tmpdir });
        assert.equal(run.status, code, run.output);
        // The fixture's lines are all the gate printed: nothing after the signal.
        assertLines(run.lines, signalLines(label, signals), run.output);
        assert.doesNotMatch(run.output, /FAIL|not measured/, run.output);
        // The page's first try was the last one.
        const last = run.tries.at(-1);
        assert.deepEqual([last.label, last.attempt], [label, 1], JSON.stringify(run.tries));
        const signalled = run.logged.find((entry) => "signal" in entry);
        const exited = run.logged.find((entry) => "exit" in entry);
        assert.ok(exited.at - signalled.at < 10_000, `the gate exited ${exited.at - signalled.at} ms after ${signals[0]}`);
        await assertClean(run);
        assert.deepEqual(
          (await readdir(tmpdir)).filter((name) => name.startsWith("addable-chrome-")),
          [],
        );
      });
    }
  });
});
