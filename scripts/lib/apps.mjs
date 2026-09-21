// Apps and services copy rules (redesign REQ-011, REQ-025; plan D-14, D-15;
// amendments A-01, A-02, A-04; decomposition decision 4; founder feedback
// round 1, si-yp2x), as one pure check over src/_data/portfolio.json and the
// two strings files: the founder's four entries in order (marketdata-api and
// Compound left the grid in feedback round 1, pending the founder's research
// decision), strings in every language, known statuses with labels,
// the private/public URL rule, the factory never named, and the copy bands
// that keep the balanced cards balanced (one-line names and titles, one-line
// chip rows, descriptions within a length band). Used by tests/apps.test.mjs
// and available to the content gate.

/** The entries of A-01 (plan D-15) minus the two investing tools removed in
    feedback round 1 (si-yp2x), in grid order. */
export const APP_KEYS = ["niva", "notesage", "ashlands", "gaimer"];

/** Private repositories: url must be null (REQ-011 honesty rule, A-01). */
export const PRIVATE_APP_KEYS = ["niva"];

/** The three services (REQ-010; the third card is the experiments card since
    feedback round 1); every entry's theme is one of them. */
export const THEME_KEYS = ["ai-apps", "ai-adoption", "experiments"];

/** Status keys the site labels (strings.portfolioStatus) and styles (chip-<key>). */
export const STATUS_KEYS = ["in-development", "open-source-mit", "experiment", "private"];

/** The founder-confirmed wording of the `private` label (A-04), asserted verbatim
    because it is longer than the status-label band (decomposition decision 4).
    No entry carries the status since feedback round 1, so the strings files
    hold no `private` label today; the rule applies the day one returns. */
export const PRIVATE_STATUS_LABEL = {
  en: "private · API keys on request",
  sv: "privat · API-nycklar på förfrågan",
};

/** Copy bands (plan D-14): characters, and the ratio between the longest and
    the shortest description of a language. */
export const BANDS = { name: 16, serviceTitle: 20, statusLabel: 22, ratio: 1.25, getsMin: 2, getsMax: 4 };

/** Never named or linked anywhere (REQ-011). */
export const FORBIDDEN_REPO = "addable-labs/factory";

/** Public entries link the repository where it lives today (A-01). */
export const PUBLIC_URL_PREFIX = "https://github.com/";

const length = (value) => [...String(value)].length;
const isText = (value) => typeof value === "string" && value.trim() !== "";
const isMap = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const quote = (value) => JSON.stringify(value);

/**
 * Validate the apps data against the strings of every language.
 * @param {object} options
 * @param {Array<object>} options.data — the entries of src/_data/portfolio.json
 * @param {Record<string, object>} options.strings — { en: {...}, sv: {...} }
 * @param {string[]} [options.statuses] — status keys the site knows
 * @param {string[]} [options.keys] — the expected entry keys, in order
 * @param {string[]} [options.privateKeys] — entries that must not carry a URL
 * @param {string[]} [options.themes] — the service keys
 * @param {object} [options.bands] — the copy bands
 * @param {Record<string, string>} [options.privateLabels] — the verbatim `private` label per language
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateApps({
  data,
  strings,
  statuses = STATUS_KEYS,
  keys = APP_KEYS,
  privateKeys = PRIVATE_APP_KEYS,
  themes = THEME_KEYS,
  bands = BANDS,
  privateLabels = PRIVATE_STATUS_LABEL,
}) {
  const problems = [];
  const languages = Object.keys(strings ?? {});
  if (!Array.isArray(data)) {
    return { ok: false, problems: ["portfolio data is not an array"] };
  }
  if (languages.length === 0) {
    return { ok: false, problems: ["no strings languages given"] };
  }

  // 1. Exactly the expected keys, in order (A-01, D-15).
  const actual = data.map((entry) => entry?.key);
  if (actual.join("\n") !== keys.join("\n")) {
    for (const key of keys) if (!actual.includes(key)) problems.push(`portfolio.json lacks the entry ${quote(key)}`);
    for (const key of actual) if (!keys.includes(key)) problems.push(`portfolio.json has an unexpected entry ${quote(key)}`);
    if (actual.length === keys.length && keys.every((key) => actual.includes(key))) {
      problems.push(`portfolio.json entries are out of order: ${actual.join(", ")} (expected ${keys.join(", ")})`);
    }
  }

  // 2. Shape, status, URL and forbidden-name rules per entry.
  for (const entry of data) {
    const key = entry?.key;
    const name = isText(key) ? key : "(entry without key)";
    if (!isText(key)) problems.push(`${name}: key must be a non-empty string`);
    if (!themes.includes(entry?.theme)) problems.push(`${name}: theme ${quote(entry?.theme)} is not one of ${themes.join(", ")}`);
    if (!isText(entry?.repo)) problems.push(`${name}: repo must be "owner/name"`);
    if (!(entry?.url === null || isText(entry?.url))) problems.push(`${name}: url must be null or a string`);
    if (!isText(entry?.source?.readme)) problems.push(`${name}: source.readme must point at the repository README`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.source?.retrieved ?? "")) problems.push(`${name}: source.retrieved must be a YYYY-MM-DD date`);
    if (!statuses.includes(entry?.status)) {
      problems.push(`${name}: unknown status ${quote(entry?.status)} (known: ${statuses.join(", ")})`);
    }
    if (privateKeys.includes(key)) {
      if (entry.url !== null) problems.push(`${name}: private repository must not carry a URL (${quote(entry.url)})`);
    } else if (keys.includes(key) && !(isText(entry?.url) && entry.url.startsWith(PUBLIC_URL_PREFIX))) {
      problems.push(`${name}: public entry needs a ${PUBLIC_URL_PREFIX} URL, got ${quote(entry?.url)}`);
    }
    for (const [field, value] of [["repo", entry?.repo], ["url", entry?.url], ["source.readme", entry?.source?.readme]]) {
      if (typeof value === "string" && value.includes(FORBIDDEN_REPO)) problems.push(`${name}: ${field} names ${FORBIDDEN_REPO}`);
    }
  }

  // 3. Strings per language: names, summaries, labels, service copy, bands.
  for (const lang of languages) {
    const s = strings[lang] ?? {};
    const portfolio = isMap(s.portfolio) ? s.portfolio : {};
    const labels = isMap(s.portfolioStatus) ? s.portfolioStatus : {};
    const themeStrings = isMap(s.themes) ? s.themes : {};

    // Every data entry has a name and a summary; no strings entry lacks data.
    for (const entry of data) {
      const copy = portfolio[entry?.key];
      for (const field of ["name", "summary"]) {
        if (!isMap(copy) || !isText(copy[field])) problems.push(`${lang}: portfolio.${entry?.key}.${field} is missing`);
      }
    }
    for (const [key, value] of Object.entries(portfolio)) {
      if (isMap(value) && !actual.includes(key)) problems.push(`${lang}: portfolio.${key} has no data entry`);
    }
    for (const field of ["privateNote", "repoLink"]) {
      if (!isText(portfolio[field])) problems.push(`${lang}: portfolio.${field} is missing`);
    }

    // Every status in use has a label; every label is a known, used status.
    const used = new Set(data.map((entry) => entry?.status));
    for (const status of used) {
      if (statuses.includes(status) && !isText(labels[status])) {
        problems.push(`${lang}: portfolioStatus.${status} is missing (used by ${data.filter((entry) => entry?.status === status).map((entry) => entry.key).join(", ")})`);
      }
    }
    for (const status of Object.keys(labels)) {
      if (!statuses.includes(status)) problems.push(`${lang}: portfolioStatus.${status} is not a known status (${statuses.join(", ")})`);
      else if (!used.has(status)) problems.push(`${lang}: portfolioStatus.${status} is not used by any entry`);
    }

    // Copy bands (D-14, A-02): one-line names and titles, one-line chip rows.
    for (const entry of data) {
      const copy = portfolio[entry?.key];
      if (isMap(copy) && isText(copy.name) && length(copy.name) > bands.name) {
        problems.push(`${lang}: portfolio.${entry.key}.name ${quote(copy.name)} is ${length(copy.name)} characters (band: ≤ ${bands.name})`);
      }
    }
    for (const [status, label] of Object.entries(labels)) {
      if (!isText(label)) continue;
      if (status === "private" && isText(privateLabels?.[lang])) {
        if (label !== privateLabels[lang]) problems.push(`${lang}: portfolioStatus.private must read ${quote(privateLabels[lang])} (founder-confirmed wording, A-04), got ${quote(label)}`);
      } else if (length(label) > bands.statusLabel) {
        problems.push(`${lang}: portfolioStatus.${status} ${quote(label)} is ${length(label)} characters (band: ≤ ${bands.statusLabel})`);
      }
    }
    for (const theme of themes) {
      const service = themeStrings[theme];
      if (!isMap(service)) {
        problems.push(`${lang}: themes.${theme} is missing`);
        continue;
      }
      for (const field of ["title", "text", "getsHeading", "cta"]) {
        if (!isText(service[field])) problems.push(`${lang}: themes.${theme}.${field} is missing`);
      }
      if (isText(service.title) && length(service.title) > bands.serviceTitle) {
        problems.push(`${lang}: themes.${theme}.title ${quote(service.title)} is ${length(service.title)} characters (band: ≤ ${bands.serviceTitle})`);
      }
      const gets = isMap(service.gets) ? Object.values(service.gets) : Array.isArray(service.gets) ? service.gets : [];
      if (gets.length < bands.getsMin || gets.length > bands.getsMax || !gets.every(isText)) {
        problems.push(`${lang}: themes.${theme}.gets has ${gets.length} item(s) (band: ${bands.getsMin}–${bands.getsMax} non-empty items)`);
      }
    }

    // Descriptions within the ratio band, so rows share their line count.
    const band = (label, items) => {
      const measured = items.filter(([, value]) => isText(value)).map(([id, value]) => [id, length(value)]);
      if (measured.length < 2) return;
      const [minId, min] = measured.reduce((a, b) => (b[1] < a[1] ? b : a));
      const [maxId, max] = measured.reduce((a, b) => (b[1] > a[1] ? b : a));
      if (max > min * bands.ratio) {
        problems.push(`${lang}: ${label} are outside the ${Math.round((bands.ratio - 1) * 100)} % band: ${minId} is ${min} characters, ${maxId} is ${max}`);
      }
    };
    band("app summaries", data.map((entry) => [`portfolio.${entry?.key}.summary`, portfolio[entry?.key]?.summary]));
    band("service texts", themes.map((theme) => [`themes.${theme}.text`, themeStrings[theme]?.text]));
  }

  return { ok: problems.length === 0, problems };
}
