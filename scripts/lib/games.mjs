// The games an article plays in its page (si-y6pp), shared by
// eleventy.config.js, the gates and the tests.
//
// An article's media, what it shows and links besides its text, sit in
// src/media/<slug>/ and are published under the article's own URL,
// /blog/<slug>/: a directory for each game, <game>-<version>/, with the
// game's code as it was generated (game.js) and two screenshots
// (start.webp, the start screen, and play.webp, a moment of play); the
// script of each version's game page (game-page-<version>.js); and the
// article's script that plays a game in the page (play.js).
// src/_data/games.json lists the games, and each gets a game page of its own
// at /blog/<slug>/<game>-<version>/, built from src/game-pages.njk.
//
// A draft's media are as absent from the production build as the draft
// itself (C14): the build copies an article's media and builds its game
// pages only when it builds the article (`articleIsBuilt`), by the draft
// rule of frontmatter.mjs.
//
// A game page is the game and nothing else, as it is in the app: no header,
// navigation or footer, no skip link, no language switch and no counterpart
// in the other language, since the games speak English. The gates hold the
// pages at the paths `gamePagePaths` gives to the rules that fit such a page,
// and every other page to all of them.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { frontMatterBlock, isOmitted, isProductionBuild, isSlug, parseFrontMatter } from "./frontmatter.mjs";

/** The directory under src/ that holds each article's media, by slug. */
export const MEDIA_DIR = "media";

/** The versions of a game: made before the cleanup, and after it. */
export const VERSIONS = ["before", "after"];

/** What each game's directory holds. */
export const GAME_FILES = ["game.js", "start.webp", "play.webp"];

/** A game's id and the name of its directory: "tetris-before". */
export function gameId(entry) {
  return `${entry.game}-${entry.version}`;
}

/** The URL of a game's page: /blog/<article>/<game>-<version>/. */
export function gamePagePath(entry) {
  return `/blog/${entry.article}/${gameId(entry)}/`;
}

/**
 * The entries of src/_data/games.json, in its order; none when the source
 * tree has no such file, as a gate's test fixture may not.
 */
export function readGames(srcDir) {
  const file = path.join(srcDir, "_data", "games.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

/** The URL of every game page the data names, built or not. */
export function gamePagePaths(srcDir) {
  return new Set(readGames(srcDir).map(gamePagePath));
}

/** The article sources of a slug, one per language: src/<lang>/blog/posts/<slug>.md. */
function articleFiles(srcDir, slug) {
  return ["en", "sv"].map((lang) => path.join(srcDir, lang, "blog", "posts", `${slug}.md`));
}

/**
 * Does this build build the article `slug`? It does unless the article is a
 * draft and this is the production build (`isOmitted`). Both languages carry
 * the same `draft`, which the build checks; this reads the English file.
 */
export function articleIsBuilt(srcDir, slug, production = isProductionBuild()) {
  const [file] = articleFiles(srcDir, slug);
  const data = parseFrontMatter(frontMatterBlock(readFileSync(file, "utf8"), { file }) ?? "") ?? {};
  return !isOmitted({ draft: data.draft === true }, production);
}

/** The slugs that have a media directory: the subdirectories of src/media/. */
export function mediaSlugs(srcDir) {
  const dir = path.join(srcDir, MEDIA_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * What is wrong with the media and the game data, one line each: a media
 * directory or a game whose article is missing in a language, a game entry
 * without its fields, a second entry for one game, and a file a game or its
 * page needs that is not there. Empty when nothing is.
 */
export function gameProblems(srcDir) {
  const problems = [];
  const media = (...parts) => path.join(srcDir, MEDIA_DIR, ...parts);
  const missingArticle = (slug) => articleFiles(srcDir, slug).filter((file) => !existsSync(file)).map((file) => path.relative(srcDir, file));
  for (const slug of mediaSlugs(srcDir)) {
    const missing = missingArticle(slug);
    if (missing.length > 0) problems.push(`src/${MEDIA_DIR}/${slug}/: no article ${slug} to publish it with (${missing.map((file) => `src/${file}`).join(" and ")} missing)`);
  }
  const seen = new Set();
  for (const [index, entry] of readGames(srcDir).entries()) {
    const name = `src/_data/games.json entry ${index + 1}`;
    const fields = [
      [isSlug(entry.article), "article"],
      [isSlug(entry.game), "game"],
      [VERSIONS.includes(entry.version), "version"],
      [typeof entry.name === "string" && entry.name.trim() !== "", "name"],
      [typeof entry.title === "string" && entry.title.trim() !== "", "title"],
      [typeof entry.description === "string" && entry.description.trim() !== "", "description"],
      [Number.isInteger(entry.width) && entry.width > 0, "width"],
      [Number.isInteger(entry.height) && entry.height > 0, "height"],
      [typeof entry.touch === "boolean", "touch"],
    ];
    const bad = fields.filter(([ok]) => !ok).map(([, field]) => field);
    if (bad.length > 0) {
      problems.push(`${name}: ${bad.join(", ")} missing or not valid (article and game are slugs, version is ${VERSIONS.join(" or ")}, width and height whole pixels, touch true or false)`);
      continue;
    }
    const id = `${entry.article}/${gameId(entry)}`;
    if (seen.has(id)) problems.push(`${name}: ${id} is listed twice`);
    seen.add(id);
    const missing = missingArticle(entry.article);
    if (missing.length > 0) problems.push(`${name}: no article ${entry.article} (${missing.map((file) => `src/${file}`).join(" and ")} missing)`);
    const files = [...GAME_FILES.map((file) => [gameId(entry), file]), [`game-page-${entry.version}.js`], ["play.js"]];
    for (const parts of files) {
      if (!existsSync(media(entry.article, ...parts))) problems.push(`${name}: src/${MEDIA_DIR}/${entry.article}/${parts.join("/")} is missing`);
    }
  }
  return problems;
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

/** A label as it reads inside a sentence: "Before the cleanup" → "before the cleanup". */
function midSentence(label) {
  return `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

/**
 * The block of one game's versions in an article, in the page's language (the
 * `games` shortcode, eleventy.config.js): a figure per version, in the order
 * of src/_data/games.json, side by side from 48rem and stacked below
 * (base.css). Each figure's caption names the version and the game; then
 * come its start screen, a row with the Play button and the links to its
 * page and its code, with "Needs a keyboard" for a game that handles no
 * touch, and a moment of play. The button and the two links carry the game
 * and its version in text that only a screen reader reads, since every
 * figure has the same three. The words come from `strings.games`: the
 * labels, and for each game the alt texts of its two screenshots, start and
 * play. The block's one script, play.js, puts a game in the page where its
 * start screen was when its Play button is clicked, and the button then
 * reads Stop. The block holds no blank line, so Markdown passes it through as
 * HTML, and one div, so a feed can drop it whole (`withoutGames`).
 */
export function renderGames(entries, { strings }) {
  const words = strings.games;
  const { article, game } = entries[0];
  const figures = entries.map((entry) => {
    const id = gameId(entry);
    const page = gamePagePath(entry);
    const texts = words?.[id];
    if (!texts?.start || !texts.play) throw new Error(`strings games.${id} needs the alt texts of its two screenshots, start and play`);
    const version = words[entry.version];
    const which = `${entry.name}, ${midSentence(version)}`;
    const shot = (file, alt) => `<img class="game-shot" src="${page}${file}" width="${entry.width}" height="${entry.height}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
    const hidden = (text) => `<span class="game-for">${escapeHtml(text)}</span>`;
    const button = `<button type="button" class="button button-primary button-sm game-play" data-game-page="${page}" data-game-title="${escapeHtml(which)}" data-play="${escapeHtml(words.play)}" data-stop="${escapeHtml(words.stop)}"><span class="game-play-label">${escapeHtml(words.play)}</span>${hidden(` ${which}`)}</button>`;
    const note = entry.touch ? "" : ` <span class="game-note">${escapeHtml(words.needsKeyboard)}</span>`;
    return [
      '<figure class="game">',
      `<figcaption><span class="game-version">${escapeHtml(version)}</span> <span class="game-name">${escapeHtml(entry.name)}</span></figcaption>`,
      `<span class="game-screen">${shot("start.webp", texts.start)}</span>`,
      `<span class="game-actions">${button} <a href="${page}">${escapeHtml(words.fullScreen)}${hidden(`: ${which}`)}</a> <a href="${page}game.js">${escapeHtml(words.code)}${hidden(`: ${which}`)}</a>${note}</span>`,
      shot("play.webp", texts.play),
      "</figure>",
    ].join("\n");
  });
  return [`<div class="games" id="games-${game}">`, ...figures, `<script type="module" src="/blog/${article}/play.js"></script>`, "</div>"].join("\n");
}

/**
 * The game pages this build builds: every game of an article it builds, with
 * the page's URL, the version's page script and the game's code, for
 * src/game-pages.njk. An article left out of the build takes its games with
 * it.
 */
export function gamePages(srcDir, production = isProductionBuild()) {
  return readGames(srcDir)
    .filter((entry) => articleIsBuilt(srcDir, entry.article, production))
    .map((entry) => ({
      ...entry,
      id: gameId(entry),
      url: gamePagePath(entry),
      script: `/blog/${entry.article}/game-page-${entry.version}.js`,
      code: readFileSync(path.join(srcDir, MEDIA_DIR, entry.article, gameId(entry), "game.js"), "utf8"),
    }));
}
