// Apps and services copy rules (redesign REQ-011, REQ-025; founder feedback
// round 1, si-yp2x), as one pure check over src/_data/portfolio.json and the
// two strings files: the founder's four entries in order (marketdata-api and
// Compound left the grid in feedback round 1, and PRIVATE_STATUS_LABEL keeps
// the wording of the `private` label marketdata-api carried), strings in
// every language, known statuses with labels,
// the private/public URL rule (a public entry links its own repository, one
// of PUBLIC_REPOS), sources that are files in the entry's own repository, an
// article the card links only when it is a post in every language (si-3hpa),
// and the copy bands that keep the balanced cards balanced (one-line names
// and titles, one-line chip rows, descriptions within a length band). Used by
// tests/apps.test.mjs and by the content gate, which holds every GitHub
// repository the built site names to the same PUBLIC_REPOS.

/** The founder's list of entries minus the two investing tools removed in
    feedback round 1 (si-yp2x), in grid order. */
export const APP_KEYS = ["niva", "notesage", "ashlands", "gaimer"];

/** Private repositories: never linked (REQ-011 honesty rule). Their url
    is null, or the public page of the product when there is one — nivå's
    since si-gyc4 — and never a page on GitHub, so the card says "Website",
    not "Repository". */
export const PRIVATE_APP_KEYS = ["niva"];

/** The three services (REQ-010; the third card is the experiments card since
    feedback round 1); every entry's theme is one of them. */
export const THEME_KEYS = ["ai-apps", "ai-adoption", "experiments"];

/** Status keys the site labels (strings.portfolioStatus) and styles (chip-<key>). */
export const STATUS_KEYS = ["in-development", "open-source-mit", "experiment", "private"];

/** The founder-confirmed wording of the `private` label, asserted verbatim
    because it is longer than the status-label band.
    No entry carries the status since feedback round 1, so the strings files
    hold no `private` label today; the rule applies the day one returns. */
export const PRIVATE_STATUS_LABEL = {
  en: "private · API keys on request",
  sv: "privat · API-nycklar på förfrågan",
};

/** Copy bands: characters, and the ratio between the longest and
    the shortest description of a language. */
export const BANDS = { name: 16, serviceTitle: 20, statusLabel: 22, ratio: 1.25, getsMin: 2, getsMax: 4 };

/** The GitHub repositories the site may link, as owner/name: the public
    repositories it links today — the public apps', the tooling the articles
    cite and the font's, named in its licence file. An allow-list (si-vwu8):
    the content gate refuses any other repository anywhere in the built site
    and a public entry must link one of these, so a private repository nobody
    thought to list is refused too, and the list itself names only public
    things. Add a repository only once it is public: without a token,
    `curl -s -o /dev/null -w '%{http_code}' https://api.github.com/repos/<owner>/<name>`
    prints 200. */
export const PUBLIC_REPOS = ["addable-labs/ashlands", "addable-labs/gaimer", "PeterBlenessy/notesage", "JetBrains/JetBrainsMono", "gastownhall/beads", "gastownhall/gascity", "gastownhall/gascity-packs"];

/** Public entries link the repository where it lives today; a url with
    this prefix is a repository, and the card labels it so. */
export const PUBLIC_URL_PREFIX = "https://github.com/";

/** The page of a file in a GitHub repository,
    https://github.com/<owner>/<name>/blob/<branch>/<path>, with owner and name
    read as githubRepos() reads them. */
const GITHUB_FILE_URL = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)\/blob\/[^/\s]+\/\S+$/;

/**
 * Every GitHub repository a text names, as owner/name the way it is written:
 * each <host>/<owner>/<name> in it — a link, a feed's escaped markup and
 * plain prose alike — where the host is github.com or one of its subdomains
 * (www., gist.), raw.githubusercontent.com, which serves the repository's
 * files, or github.dev, its editor (si-gnca), but no subdomain of these two:
 * a codespace's address on github.dev names no repository. Three more
 * spellings name one (si-3iuk): git's SSH address,
 * git@github.com:<owner>/<name>, with or without the user; the editor
 * github.dev sends a visitor to, vscode.dev/github/<owner>/<name>, on
 * vscode.dev or any of its subdomains (insiders., www.) but no other host
 * whose name ends in vscode.dev; and the REST API,
 * api.github.com/repos/<owner>/<name>. A colon after github.com starts the
 * path, as in the SSH address, except where digits and a slash follow it and
 * either a scheme comes before the host, as git reads it too, or
 * <owner>/<name> follows them: there it starts a port. So
 * https://github.com:443/<owner> names no repository, but
 * git@github.com:42/<name> names the owner 42's. The host is read in any
 * case, with or without a closing dot and a port, an empty port too. A
 * sentence's full stop and a ".git" suffix are not part of the name.
 * @param {string} text
 * @returns {string[]}
 */
export function githubRepos(text) {
  return [...String(text).matchAll(/(?:(?:\bgithub\.com|(?<![\w.-])(?:raw\.githubusercontent\.com|github\.dev))\.?(?::\d*)?\/|\bgithub\.com\.?:(?:(?!\d*\/)|(?<!\/\/[\w.%+~:@-]*))|(?<![\w-])vscode\.dev\.?(?::\d*)?\/github\/|api\.github\.com\.?(?::\d*)?\/repos\/)([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)/gi)].map(([, owner, name]) => `${owner}/${name.replace(/\.+$/, "").replace(/\.git$/i, "")}`);
}

/** The entry of `repos` that is this owner/name, or undefined. GitHub matches
    names without regard to case, and so does this. */
export function publicRepo(repo, repos = PUBLIC_REPOS) {
  return repos.find((allowed) => allowed.toLowerCase() === repo.toLowerCase());
}

/** The hosts GitHub serves repositories and their files from, each with
    every subdomain: github.com (www., gist., api.), githubusercontent.com
    (raw., gist.) and github.dev, its editor. */
const GITHUB_HOSTS = ["github.com", "githubusercontent.com", "github.dev"];

/** The host of a URL as a browser reads it — in lower case, without a port,
    a user name or closing dots — or undefined for a string that is no URL. */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/\.+$/, "");
  } catch {
    return undefined;
  }
}

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
 * @param {string[]} [options.privateKeys] — entries whose repository is private: no url, or the product's public page
 * @param {string[]} [options.publicRepos] — the GitHub repositories a public entry may link, as owner/name
 * @param {string[]} [options.themes] — the service keys
 * @param {object} [options.bands] — the copy bands
 * @param {Record<string, string>} [options.privateLabels] — the verbatim `private` label per language
 * @param {Record<string, string[]>} [options.articles] — the posts of each language, by file name without .md; a language not given has none
 * @returns {{ ok: boolean, problems: string[] }}
 */
export function validateApps({
  data,
  strings,
  articles = {},
  statuses = STATUS_KEYS,
  keys = APP_KEYS,
  privateKeys = PRIVATE_APP_KEYS,
  publicRepos = PUBLIC_REPOS,
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

  // 1. Exactly the expected keys, in order.
  const actual = data.map((entry) => entry?.key);
  if (actual.join("\n") !== keys.join("\n")) {
    for (const key of keys) if (!actual.includes(key)) problems.push(`portfolio.json lacks the entry ${quote(key)}`);
    for (const key of actual) if (!keys.includes(key)) problems.push(`portfolio.json has an unexpected entry ${quote(key)}`);
    if (actual.length === keys.length && keys.every((key) => actual.includes(key))) {
      problems.push(`portfolio.json entries are out of order: ${actual.join(", ")} (expected ${keys.join(", ")})`);
    }
  }

  // 2. Shape, status and URL rules per entry.
  for (const entry of data) {
    const key = entry?.key;
    const name = isText(key) ? key : "(entry without key)";
    if (!isText(key)) problems.push(`${name}: key must be a non-empty string`);
    if (!themes.includes(entry?.theme)) problems.push(`${name}: theme ${quote(entry?.theme)} is not one of ${themes.join(", ")}`);
    if (!isText(entry?.repo)) problems.push(`${name}: repo must be "owner/name"`);
    if (!(entry?.url === null || isText(entry?.url))) problems.push(`${name}: url must be null or a string`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.source?.retrieved ?? "")) problems.push(`${name}: source.retrieved must be a YYYY-MM-DD date`);
    // The sources the entry's facts come from: its README and, for a fact the
    // README does not state, an optional second file (the Ashlands evaluation
    // report, si-9qlz). Each is a file in the entry's own repository, a
    // private entry's too (si-nepq): the site links neither, and a source
    // names no repository the entry does not already name. Like publicRepo(),
    // the match ignores case.
    const own = isText(entry?.repo) ? entry.repo : "<owner>/<name>";
    const sourceFile = (field, value) => {
      const [, owner, repoName] = (isText(value) && value.match(GITHUB_FILE_URL)) || [];
      if (!owner) {
        problems.push(`${name}: source.${field} must be the URL of a file in the entry's own repository, ${PUBLIC_URL_PREFIX}${own}/blob/<branch>/<path>, got ${quote(value)}`);
      } else if (`${owner}/${repoName}`.toLowerCase() !== own.toLowerCase()) {
        problems.push(`${name}: source.${field} ${quote(value)} is in ${owner}/${repoName}, not in the entry's own repository ${quote(own)}`);
      }
    };
    sourceFile("readme", entry?.source?.readme);
    if (entry?.source?.report !== undefined) sourceFile("report", entry.source.report);
    // An optional article about the app (founder request 2026-09-23,
    // si-3hpa): the file name of a post, without .md, which the card links
    // in the page's language — so it must be a post in every language, or
    // one language's card would go without the link.
    const article = entry?.article;
    if (article !== undefined) {
      if (!isText(article)) {
        problems.push(`${name}: article must be the file name of a post, without .md, got ${quote(article)}`);
      } else {
        for (const lang of languages) {
          if (!(articles[lang] ?? []).includes(article)) problems.push(`${name}: article ${quote(article)} names no post in ${lang}: there is no src/${lang}/blog/posts/${article}.md`);
        }
      }
    }
    if (!statuses.includes(entry?.status)) {
      problems.push(`${name}: unknown status ${quote(entry?.status)} (known: ${statuses.join(", ")})`);
    }
    if (privateKeys.includes(key)) {
      // The url is null or an https:// page off https://github.com/, a URL a
      // browser can open. It names no GitHub repository in any spelling
      // githubRepos() reads — www.github.com, GitHub.com, a subdomain, a
      // port, raw.githubusercontent.com, github.dev, vscode.dev/github/,
      // api.github.com/repos/ — as the content gate reads the built site
      // (si-i5uk, si-gnca, si-3iuk), and, whatever it names, it
      // is on none of GITHUB_HOSTS, so a url in which githubRepos() reads no
      // repository — an owner's page, a gist's file on
      // gist.githubusercontent.com — is refused too (si-qtwy). A url gets
      // the message of the first of these rules it breaks, only.
      const host = isText(entry.url) ? hostOf(entry.url) : undefined;
      const repos = isText(entry.url) ? [...new Set(githubRepos(entry.url))] : [];
      if (entry.url !== null && !(isText(entry.url) && entry.url.startsWith("https://") && host !== undefined && !entry.url.startsWith(PUBLIC_URL_PREFIX))) {
        problems.push(`${name}: private repository must not be linked — url is null or the product's public https:// page, never ${PUBLIC_URL_PREFIX} (got ${quote(entry.url)})`);
      } else if (repos.length > 0) {
        problems.push(`${name}: private repository must not be linked — url is null or the product's public https:// page, never one that names a GitHub repository (got ${quote(entry.url)}, which names ${repos.map((repo) => `github.com/${repo}`).join(" and ")})`);
      } else if (host !== undefined && GITHUB_HOSTS.some((github) => host === github || host.endsWith(`.${github}`))) {
        problems.push(`${name}: private repository must not be linked — url is null or the product's public https:// page, never one on a GitHub host (got ${quote(entry.url)}, which is on ${host})`);
      }
    } else if (keys.includes(key)) {
      // A public entry links its repository: one the site may link
      // (si-vwu8), and the one its "repo" names, which the sources are held
      // to (si-nepq). A url that breaks both rules is reported for both, so
      // a wrong url is not mended by listing its repository.
      const [repo] = isText(entry?.url) ? githubRepos(entry.url) : [];
      if (!(isText(entry?.url) && entry.url.startsWith(PUBLIC_URL_PREFIX))) {
        problems.push(`${name}: public entry needs a ${PUBLIC_URL_PREFIX} URL, got ${quote(entry?.url)}`);
      } else {
        if (!repo || !publicRepo(repo, publicRepos)) {
          problems.push(`${name}: url ${quote(entry.url)} is not a repository the site may link — the public ones are PUBLIC_REPOS in scripts/lib/apps.mjs`);
        }
        if (repo && repo.toLowerCase() !== own.toLowerCase()) {
          problems.push(`${name}: url ${quote(entry.url)} links ${repo}, not the entry's own repository ${quote(own)}`);
        }
      }
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
    for (const field of ["privateNote", "repoLink", "siteLink", "articleLink"]) {
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

    // Copy bands: one-line names and titles, one-line chip rows.
    for (const entry of data) {
      const copy = portfolio[entry?.key];
      if (isMap(copy) && isText(copy.name) && length(copy.name) > bands.name) {
        problems.push(`${lang}: portfolio.${entry.key}.name ${quote(copy.name)} is ${length(copy.name)} characters (band: ≤ ${bands.name})`);
      }
    }
    for (const [status, label] of Object.entries(labels)) {
      if (!isText(label)) continue;
      if (status === "private" && isText(privateLabels?.[lang])) {
        if (label !== privateLabels[lang]) problems.push(`${lang}: portfolioStatus.private must read ${quote(privateLabels[lang])} (founder-confirmed wording), got ${quote(label)}`);
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
