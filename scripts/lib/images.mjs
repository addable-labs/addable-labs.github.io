// The image of each article (si-awlu), shared by eleventy.config.js, the
// gates and the tests: one picture that shows the article in a link preview
// (og:image), as the thumbnail on its card in every listing and under its
// title and summary on its own page.
//
// An article names its image in its front matter, `image: cover.png`, and
// describes it in `imageAlt`, in the article's own language (frontmatter.mjs
// requires both). The file sits in the article's media directory,
// src/media/<slug>/ (scripts/lib/games.mjs), which the build copies to the
// article's URL, /blog/<slug>/, only when it builds the article: a draft's
// image is as absent from the production build as the draft. It is a PNG of
// IMAGE_WIDTH × IMAGE_HEIGHT, the size the platforms draw a large preview
// at, and at most IMAGE_MAX_BYTES, so that a platform that caps the size of
// a preview image still takes it. Beside it sit two WebP copies of it for
// the site's own pages, much smaller, named after it: cover-600.webp and
// cover-1200.webp (`WEBP_WIDTHS`). Both languages show the same file; each
// describes it in its own words.
//
// Every page that is not an article shares DEFAULT_IMAGE, the site's mark on
// the same grid, a PNG held to the same size and budget.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { frontMatterBlock, isImageName, parseFrontMatter } from "./frontmatter.mjs";
import { MEDIA_DIR } from "./games.mjs";

/** The size of every share image, in px: the size of a large link preview. */
export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 630;

/** The most a share image may weigh, in bytes: 300 KB. */
export const IMAGE_MAX_BYTES = 300 * 1024;

/** The widths of an article image's WebP copies, in px, for the page's srcset. */
export const WEBP_WIDTHS = [600, 1200];

/** The image of every page that is not an article: its URL, and its file under src/. */
export const DEFAULT_IMAGE = "/assets/img/share.png";

const LANGUAGES = ["en", "sv"];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The name of an image's WebP copy `width` px wide: cover.png, 600 → cover-600.webp. */
export function webpName(image, width) {
  return `${image.replace(/\.png$/, "")}-${width}.webp`;
}

/** The height of a copy `width` px wide, at the image's proportions: 600 → 315. */
export function heightAt(width) {
  return Math.round((width * IMAGE_HEIGHT) / IMAGE_WIDTH);
}

/**
 * The URLs of an article's image, as the templates write them (the
 * `articleImage` filter in eleventy.config.js): `png`, the file the link
 * previews take; `src`, the widest WebP copy; `srcset`, every copy with its
 * width, narrowest first; and `small`, the narrowest copy, which a card
 * shows on a phone.
 */
export function articleImage(slug, image) {
  const url = (file) => `/blog/${slug}/${file}`;
  return {
    png: url(image),
    src: url(webpName(image, WEBP_WIDTHS.at(-1))),
    srcset: WEBP_WIDTHS.map((width) => `${url(webpName(image, width))} ${width}w`).join(", "),
    small: url(webpName(image, WEBP_WIDTHS[0])),
  };
}

/** The width and height a PNG's header gives, or null when the bytes are no PNG. */
export function pngSize(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("latin1", 12, 16) !== "IHDR") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * The width and height a WebP's header gives, or null when the bytes are no
 * WebP: the frame of a lossy file (VP8), the header of a lossless one (VP8L)
 * or the canvas of an extended one (VP8X).
 */
export function webpSize(bytes) {
  if (bytes.length < 30 || bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * What is wrong with a share image, the PNG a link preview takes, one line
 * each: not a PNG, not IMAGE_WIDTH × IMAGE_HEIGHT, or over IMAGE_MAX_BYTES.
 * Empty when nothing is. `name` begins each line.
 */
export function pngProblems(bytes, name) {
  const size = pngSize(bytes);
  if (!size) return [`${name} is not a PNG`];
  const problems = [];
  if (size.width !== IMAGE_WIDTH || size.height !== IMAGE_HEIGHT) problems.push(`${name} is ${size.width} × ${size.height} px, not ${IMAGE_WIDTH} × ${IMAGE_HEIGHT}`);
  if (bytes.length > IMAGE_MAX_BYTES) problems.push(`${name} is ${formatKB(bytes.length)}, over ${formatKB(IMAGE_MAX_BYTES)}`);
  return problems;
}

/** Bytes as kilobytes of 1,024 for a message: 307,201 → "300.0 KB". */
function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * The articles' images as their front matter names them: one entry per
 * article file, `{ file, slug, image }`, where `file` is the path under src/
 * and `image` what `image` holds. The .md files directly in each language's
 * posts/ directory, as the build and the gates take them (urls.mjs).
 */
function articleImages(srcDir) {
  const entries = [];
  for (const lang of LANGUAGES) {
    const dir = path.join(srcDir, lang, "blog", "posts");
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((file) => file.endsWith(".md")).sort()) {
      const file = path.join(dir, name);
      const data = parseFrontMatter(frontMatterBlock(readFileSync(file, "utf8"), { file }) ?? "") ?? {};
      entries.push({ file: `src/${path.relative(srcDir, file).split(path.sep).join("/")}`, slug: name.replace(/\.md$/, ""), image: data.image });
    }
  }
  return entries;
}

/**
 * What is wrong with the images, one line each: an article whose image is
 * missing from its media directory, is not a PNG of IMAGE_WIDTH ×
 * IMAGE_HEIGHT or is over IMAGE_MAX_BYTES, or lacks a WebP copy of the width
 * its name gives; and the same of DEFAULT_IMAGE. Empty when nothing is.
 *
 * An article whose front matter names no image, or no file name, is
 * frontmatter.mjs's to report (`validateArticle`), with its other keys. A
 * file both languages name is checked once.
 */
export function imageProblems(srcDir) {
  const problems = [];
  const checked = new Set();
  const read = (file) => (existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null);
  for (const { file, slug, image } of articleImages(srcDir)) {
    if (!isImageName(image)) continue;
    const dir = `src/${MEDIA_DIR}/${slug}`;
    if (checked.has(`${dir}/${image}`)) continue;
    checked.add(`${dir}/${image}`);
    const png = read(path.join(srcDir, MEDIA_DIR, slug, image));
    if (!png) {
      problems.push(`${file}: its image ${dir}/${image} is missing`);
      continue;
    }
    problems.push(...pngProblems(png, `${dir}/${image}`));
    for (const width of WEBP_WIDTHS) {
      const name = `${dir}/${webpName(image, width)}`;
      const webp = read(path.join(srcDir, MEDIA_DIR, slug, webpName(image, width)));
      const size = webp && webpSize(webp);
      if (!webp) problems.push(`${name} is missing (the ${width} px WebP copy of ${image})`);
      else if (!size) problems.push(`${name} is not a WebP`);
      else if (size.width !== width || size.height !== heightAt(width)) problems.push(`${name} is ${size.width} × ${size.height} px, not ${width} × ${heightAt(width)}`);
    }
  }
  const fallback = read(path.join(srcDir, ...DEFAULT_IMAGE.split("/")));
  if (!fallback) problems.push(`src${DEFAULT_IMAGE}, the image of every page that is not an article, is missing`);
  else problems.push(...pngProblems(fallback, `src${DEFAULT_IMAGE}`));
  return problems;
}
