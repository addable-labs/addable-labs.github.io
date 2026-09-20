import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { before, describe, it } from "node:test";
import { APP_KEYS, BANDS, PRIVATE_APP_KEYS, PRIVATE_STATUS_LABEL, STATUS_KEYS, THEME_KEYS, validateApps } from "../scripts/lib/apps.mjs";
import { loadSite, loadStrings } from "../scripts/lib/site.mjs";
import { SRC } from "./helpers.mjs";

// Apps data and copy (REQ-011, REQ-025; AC-11, AC-12, AC-30; plan D-14, D-15;
// A-01, A-02, A-04): the real files validate, and every rule fails on a
// modified in-memory copy naming the key, the language or the band.

describe("apps data and copy (REQ-011, REQ-025; AC-11, AC-12, AC-30)", () => {
  let data;
  let strings;
  let site;
  before(async () => {
    data = JSON.parse(await readFile(path.join(SRC, "_data", "portfolio.json"), "utf8"));
    site = await loadSite(SRC);
    strings = await loadStrings(SRC, site);
  });

  /** A deep copy of the real inputs for a negative case. */
  const copy = () => ({ data: structuredClone(data), strings: structuredClone(strings) });
  const problemsOf = (input) => validateApps(input).problems;

  it("validates the real data file and both strings files", () => {
    const result = validateApps({ data, strings });
    assert.deepEqual(result.problems, []);
    assert.equal(result.ok, true);
  });

  it("holds exactly the curated entries of APP_KEYS in the founder's order (A-01)", () => {
    assert.deepEqual(data.map((entry) => entry.key), APP_KEYS);
    const reordered = copy();
    reordered.data.reverse();
    assert.ok(problemsOf(reordered).some((p) => /entries are out of order/.test(p)), problemsOf(reordered).join("\n"));
    const missing = copy();
    missing.data = missing.data.filter((entry) => entry.key !== "compound");
    assert.ok(problemsOf(missing).some((p) => p === 'portfolio.json lacks the entry "compound"'), problemsOf(missing).join("\n"));
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
    added.data.push({ key: "newapp", theme: "investing", repo: "PeterBlenessy/newapp", url: "https://github.com/PeterBlenessy/newapp", status: "open-source-mit", source: { readme: "https://github.com/PeterBlenessy/newapp/blob/main/README.md", retrieved: "2026-09-20" } });
    added.strings.en.portfolio.newapp = { name: "New app", summary: "A desktop app for following markets, funds and portfolios in one place." };
    const problems = problemsOf({ ...added, keys: [...APP_KEYS, "newapp"] });
    assert.ok(problems.includes("sv: portfolio.newapp.name is missing"), problems.join("\n"));
    assert.ok(problems.includes("sv: portfolio.newapp.summary is missing"), problems.join("\n"));
    assert.ok(!problems.some((p) => p.startsWith("en: portfolio.newapp")), problems.join("\n"));
  });

  it("keeps the private entries unlinked and links the public ones to github.com (A-01)", () => {
    for (const entry of data) {
      if (PRIVATE_APP_KEYS.includes(entry.key)) assert.equal(entry.url, null, `${entry.key} is private`);
      else assert.match(entry.url, /^https:\/\/github\.com\//, `${entry.key} links its repository`);
    }
    const linked = copy();
    linked.data.find((entry) => entry.key === "niva").url = "https://github.com/addable-labs/niva";
    assert.ok(problemsOf(linked).some((p) => /^niva: private repository must not carry a URL/.test(p)), problemsOf(linked).join("\n"));
    const unlinked = copy();
    unlinked.data.find((entry) => entry.key === "notesage").url = null;
    assert.ok(problemsOf(unlinked).some((p) => /^notesage: public entry needs a https:\/\/github\.com\/ URL/.test(p)), problemsOf(unlinked).join("\n"));
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

  it("never names the factory in a repo, url or source (REQ-011)", () => {
    for (const entry of data) {
      for (const value of [entry.repo, entry.url, entry.source.readme]) assert.ok(!String(value).includes("addable-labs/factory"), entry.key);
    }
    const named = copy();
    named.data.find((entry) => entry.key === "niva").repo = "addable-labs/factory";
    assert.ok(problemsOf(named).includes("niva: repo names addable-labs/factory"));
  });

  it("keeps names within 16 characters and fails a 17-character name naming the band (D-14)", () => {
    for (const lang of site.languages.codes) {
      for (const key of APP_KEYS) assert.ok([...strings[lang].portfolio[key].name].length <= BANDS.name, `${lang}: ${key}`);
    }
    const long = copy();
    long.strings.en.portfolio.gaimer.name = "Gaimer Studio Pro";
    assert.equal([...long.strings.en.portfolio.gaimer.name].length, 17);
    assert.ok(problemsOf(long).includes('en: portfolio.gaimer.name "Gaimer Studio Pro" is 17 characters (band: ≤ 16)'), problemsOf(long).join("\n"));
  });

  it("keeps status labels within 22 characters except the founder-confirmed private label, asserted verbatim (A-04)", () => {
    for (const lang of site.languages.codes) {
      assert.equal(strings[lang].portfolioStatus.private, PRIVATE_STATUS_LABEL[lang], lang);
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

  it("keeps the six summaries within a 25 % length band per language (D-14, AC-30)", () => {
    for (const lang of site.languages.codes) {
      const lengths = APP_KEYS.map((key) => [...strings[lang].portfolio[key].summary].length);
      assert.ok(Math.max(...lengths) <= Math.min(...lengths) * BANDS.ratio, `${lang}: ${lengths.join(", ")}`);
    }
    const uneven = copy();
    uneven.strings.sv.portfolio.niva.summary += " " + uneven.strings.sv.portfolio.niva.summary;
    assert.ok(problemsOf(uneven).some((p) => /^sv: app summaries are outside the 25 % band: .* portfolio\.niva\.summary is \d+$/.test(p)), problemsOf(uneven).join("\n"));
  });

  it("keeps service titles within 20 characters, texts within a 25 % band and 2–4 gets items per service (D-14)", () => {
    for (const lang of site.languages.codes) {
      const lengths = THEME_KEYS.map((key) => [...strings[lang].themes[key].text].length);
      assert.ok(Math.max(...lengths) <= Math.min(...lengths) * BANDS.ratio, `${lang}: ${lengths.join(", ")}`);
      for (const key of THEME_KEYS) {
        assert.ok([...strings[lang].themes[key].title].length <= BANDS.serviceTitle, `${lang}: ${key}`);
        const gets = Object.values(strings[lang].themes[key].gets).length;
        assert.ok(gets >= BANDS.getsMin && gets <= BANDS.getsMax, `${lang}: ${key} has ${gets} gets items`);
      }
    }
    const long = copy();
    long.strings.sv.themes.investing.title = "Investerings- och marknadsdataverktyg";
    assert.ok(problemsOf(long).some((p) => /^sv: themes\.investing\.title .* is 37 characters \(band: ≤ 20\)$/.test(p)), problemsOf(long).join("\n"));
    const few = copy();
    few.strings.en.themes["ai-adoption"].gets = { only: "A fluency baseline" };
    assert.ok(problemsOf(few).includes("en: themes.ai-adoption.gets has 1 item(s) (band: 2–4 non-empty items)"), problemsOf(few).join("\n"));
    const many = copy();
    many.strings.en.themes["ai-apps"].gets.fifth = "A fifth item";
    assert.ok(problemsOf(many).includes("en: themes.ai-apps.gets has 5 item(s) (band: 2–4 non-empty items)"), problemsOf(many).join("\n"));
    const uneven = copy();
    uneven.strings.en.themes["ai-apps"].text += " " + uneven.strings.en.themes["ai-apps"].text;
    assert.ok(problemsOf(uneven).some((p) => /^en: service texts are outside the 25 % band/.test(p)), problemsOf(uneven).join("\n"));
  });
});
