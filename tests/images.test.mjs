// The article images (si-awlu; scripts/lib/images.mjs): the headers the
// check reads, the check on the real images and on a copy of the sources
// with each fault, the build that stops on a missing or wrong image or on an
// article without `image` or `imageAlt`, the draft rule that keeps a draft's
// image out of the production build, and which images load at once.

import assert from "node:assert/strict";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { parse } from "node-html-parser";
import { MEDIA_DIR } from "../scripts/lib/games.mjs";
import { articleImage, DEFAULT_IMAGE, heightAt, IMAGE_HEIGHT, IMAGE_MAX_BYTES, IMAGE_WIDTH, imageProblems, pngProblems, pngSize, WEBP_WIDTHS, webpName, webpSize } from "../scripts/lib/images.mjs";
import { exists, loadSite, readArticleSources, walk } from "../scripts/lib/site.mjs";
import { buildSite, copyProject, makePng, SRC, tempDir } from "./helpers.mjs";

const SITE = await loadSite(SRC);
const SLUGS = (await readArticleSources(SRC, SITE, "en")).map((article) => article.slug);

/** The first bytes of a WebP whose one chunk is `chunk` with `data`: all the size reader looks at. */
function webpHeader(chunk, data) {
  const body = Buffer.concat([Buffer.from(`WEBP${chunk}`, "latin1"), Buffer.alloc(4), data, Buffer.alloc(16)]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from("RIFF", "latin1"), size, body]);
}

/** The files of an article's image, as the check looks for them: the PNG and its WebP copies. */
const FILES = ["cover.png", ...WEBP_WIDTHS.map((width) => webpName("cover.png", width))];

describe("the sizes the image check reads (si-awlu)", () => {
  it("reads every article image in the repository at its size, and the default image", async () => {
    assert.equal(SLUGS.length >= 6, true, "every article of the site");
    for (const slug of SLUGS) {
      const dir = path.join(SRC, MEDIA_DIR, slug);
      assert.deepEqual(pngSize(await readFile(path.join(dir, "cover.png"))), { width: IMAGE_WIDTH, height: IMAGE_HEIGHT }, slug);
      for (const width of WEBP_WIDTHS) {
        assert.deepEqual(webpSize(await readFile(path.join(dir, webpName("cover.png", width)))), { width, height: heightAt(width) }, `${slug} ${width}`);
      }
    }
    assert.deepEqual(pngSize(await readFile(path.join(SRC, DEFAULT_IMAGE))), { width: 1200, height: 630 });
    assert.deepEqual(WEBP_WIDTHS.map(heightAt), [315, 630]);
  });

  it("reads the size of a lossless and of an extended WebP, and none of a file that is not a WebP or not a PNG", async () => {
    const lossless = Buffer.alloc(5);
    lossless[0] = 0x2f;
    lossless.writeUInt32LE((600 - 1) | ((315 - 1) << 14), 1);
    assert.deepEqual(webpSize(webpHeader("VP8L", lossless)), { width: 600, height: 315 });
    const extended = Buffer.alloc(10);
    extended.writeUIntLE(1200 - 1, 4, 3);
    extended.writeUIntLE(630 - 1, 7, 3);
    assert.deepEqual(webpSize(webpHeader("VP8X", extended)), { width: 1200, height: 630 });
    const webp = await readFile(path.join(SRC, MEDIA_DIR, SLUGS[0], "cover-600.webp"));
    const image = makePng(1200, 630);
    assert.equal(pngSize(webp), null, "a WebP is no PNG");
    assert.equal(webpSize(image), null, "a PNG is no WebP");
    assert.equal(webpSize(webpHeader("VP8 ", Buffer.alloc(10))), null, "a lossy WebP without its frame's start code");
    assert.equal(pngSize(Buffer.from("not an image")), null);
  });

  it("names a share image that is not a PNG, not 1200 × 630 or over 300 KB", async () => {
    assert.deepEqual(pngProblems(makePng(1200, 630), "cover.png"), []);
    assert.deepEqual(pngProblems(makePng(1200, 600), "cover.png"), ["cover.png is 1200 × 600 px, not 1200 × 630"]);
    assert.deepEqual(pngProblems(makePng(630, 1200), "cover.png"), ["cover.png is 630 × 1200 px, not 1200 × 630"]);
    const heavy = makePng(1200, 630, { noise: true });
    assert.ok(heavy.length > IMAGE_MAX_BYTES, `${heavy.length} B`);
    assert.deepEqual(pngProblems(heavy, "cover.png"), [`cover.png is ${(heavy.length / 1024).toFixed(1)} KB, over 300.0 KB`]);
    const limit = Buffer.concat([makePng(1200, 630), Buffer.alloc(IMAGE_MAX_BYTES)]).subarray(0, IMAGE_MAX_BYTES);
    assert.deepEqual(pngProblems(limit, "cover.png"), [], "300 KB exactly is within the budget");
    assert.deepEqual(pngProblems(Buffer.concat([limit, Buffer.alloc(1)]), "cover.png"), ["cover.png is 300.0 KB, over 300.0 KB"]);
    assert.deepEqual(pngProblems(await readFile(path.join(SRC, MEDIA_DIR, SLUGS[0], "cover-1200.webp")), "cover.png"), ["cover.png is not a PNG"]);
  });

  it("gives the templates the PNG, the widest WebP copy, every copy with its width and the narrowest", () => {
    assert.deepEqual(articleImage("a-slug", "cover.png"), {
      png: "/blog/a-slug/cover.png",
      src: "/blog/a-slug/cover-1200.webp",
      srcset: "/blog/a-slug/cover-600.webp 600w, /blog/a-slug/cover-1200.webp 1200w",
      small: "/blog/a-slug/cover-600.webp",
    });
  });
});

describe("the images of the articles and the pages (si-awlu)", () => {
  let tmp;
  before(async () => {
    tmp = await tempDir("images-");
  });
  after(() => tmp.cleanup());

  /** A copy of what the check reads: the articles of both languages, their media and the default image. */
  async function copySources(name) {
    const src = path.join(tmp.dir, name);
    for (const part of [["en", "blog", "posts"], ["sv", "blog", "posts"], [MEDIA_DIR], DEFAULT_IMAGE.split("/").filter(Boolean)]) {
      await cp(path.join(SRC, ...part), path.join(src, ...part), { recursive: true });
    }
    return src;
  }

  it("finds nothing wrong with the real images", () => {
    assert.deepEqual(imageProblems(SRC), []);
  });

  it("names every article of both languages as naming an image it describes", async () => {
    for (const lang of SITE.languages.codes) {
      for (const article of await readArticleSources(SRC, SITE, lang)) {
        assert.equal(article.image, "cover.png", `${lang} ${article.slug}`);
        assert.ok(typeof article.imageAlt === "string" && article.imageAlt.trim().length > 20, `${lang} ${article.slug} describes its image`);
      }
    }
  });

  it("names each fault, one line each: a missing, mis-sized, heavy or false image, a missing or mis-sized WebP copy, and the default image's", async () => {
    const src = await copySources("faults");
    const media = (slug, file) => path.join(src, MEDIA_DIR, slug, file);
    const [ashlands, gaimer, built, niva, context, factory] = ["ashlands-what-one-prompt-built", "cleaning-up-gaimer", "how-this-site-was-built-by-agents", "lessons-from-building-niva", "what-the-mayors-context-costs", "why-we-run-an-agent-run-factory"];
    const heavy = makePng(1200, 630, { noise: true });
    await writeFile(media(ashlands, "cover.png"), heavy);
    await cp(media(gaimer, "cover-1200.webp"), media(gaimer, "cover-600.webp"));
    await rm(media(built, "cover.png"));
    await cp(media(niva, "cover-1200.webp"), media(niva, "cover.png"));
    await rm(media(context, "cover-600.webp"));
    await writeFile(media(factory, "cover.png"), makePng(1200, 600));
    await writeFile(path.join(src, DEFAULT_IMAGE), makePng(1200, 628));
    assert.deepEqual(imageProblems(src), [
      `src/media/${ashlands}/cover.png is ${(heavy.length / 1024).toFixed(1)} KB, over 300.0 KB`,
      `src/media/${gaimer}/cover-600.webp is 1200 × 630 px, not 600 × 315`,
      `src/en/blog/posts/${built}.md: its image src/media/${built}/cover.png is missing`,
      `src/media/${niva}/cover.png is not a PNG`,
      `src/media/${context}/cover-600.webp is missing (the 600 px WebP copy of cover.png)`,
      `src/media/${factory}/cover.png is 1200 × 600 px, not 1200 × 630`,
      "src/assets/img/share.png is 1200 × 628 px, not 1200 × 630",
    ]);
    await rm(path.join(src, DEFAULT_IMAGE));
    assert.equal(imageProblems(src).at(-1), "src/assets/img/share.png, the image of every page that is not an article, is missing");
  });

  it("names the language whose article names an image its media directory lacks", async () => {
    const src = await copySources("sv-image");
    const [slug] = SLUGS;
    const file = path.join(src, "sv", "blog", "posts", `${slug}.md`);
    await writeFile(file, (await readFile(file, "utf8")).replace(/^image: cover\.png/m, "image: cover-sv.png"));
    assert.deepEqual(imageProblems(src), [`src/sv/blog/posts/${slug}.md: its image src/media/${slug}/cover-sv.png is missing`]);
  });

  it("fails the build, naming the files, when an image is missing, is not 1200 × 630 or is over 300 KB", async () => {
    const project = await copyProject(path.join(tmp.dir, "project"));
    const media = (slug, file) => path.join(project, "src", MEDIA_DIR, slug, file);
    await rm(media(SLUGS[0], "cover.png"));
    await writeFile(media(SLUGS[1], "cover.png"), makePng(1200, 600));
    const heavy = makePng(1200, 630, { noise: true });
    await writeFile(media(SLUGS[2], "cover.png"), heavy);
    assert.throws(() => buildSite(path.join(tmp.dir, "site"), {}, project), (error) => {
      for (const line of [
        "The article images:",
        `src/en/blog/posts/${SLUGS[0]}.md: its image src/media/${SLUGS[0]}/cover.png is missing`,
        `src/media/${SLUGS[1]}/cover.png is 1200 × 600 px, not 1200 × 630`,
        `src/media/${SLUGS[2]}/cover.png is ${(heavy.length / 1024).toFixed(1)} KB, over 300.0 KB`,
      ]) {
        assert.ok(error.message.includes(line), `${line}\n${error.message}`);
      }
      return true;
    });
  });

  it("fails the build when an article lacks image or imageAlt, in either language", async () => {
    for (const [lang, key] of [["sv", "imageAlt"], ["en", "image"], ["en", "imageAlt"], ["sv", "image"]]) {
      const project = await copyProject(path.join(tmp.dir, `without-${lang}-${key}`));
      const file = path.join(project, "src", lang, "blog", "posts", `${SLUGS[3]}.md`);
      const source = await readFile(file, "utf8");
      const without = source.replace(new RegExp(`^${key}: .*\\n`, "m"), "");
      assert.notEqual(without, source, `${lang} ${key}: the line was there`);
      await writeFile(file, without);
      assert.throws(
        () => buildSite(path.join(tmp.dir, `without-${lang}-${key}-site`), {}, project),
        new RegExp(`Invalid article front matter in \\./src/${lang}/blog/posts/${SLUGS[3]}\\.md: missing required key: ${key}`),
        `${lang} without ${key}`,
      );
    }
  });
});

describe("a draft's image is only in the development build (C14)", () => {
  // The nivå article is a draft in a copy of the project, whatever its front
  // matter says in the repository, and it plays no game: its media directory
  // holds its image and nothing else.
  const SLUG = "lessons-from-building-niva";
  let tmp;
  let dev;
  let prod;
  before(async () => {
    tmp = await tempDir("images-draft-");
    const project = await copyProject(path.join(tmp.dir, "project"));
    for (const lang of ["en", "sv"]) {
      const file = path.join(project, "src", lang, "blog", "posts", `${SLUG}.md`);
      await writeFile(file, (await readFile(file, "utf8")).replace(/^draft: false\b/m, "draft: true"));
    }
    dev = buildSite(path.join(tmp.dir, "dev"), {}, project);
    prod = buildSite(path.join(tmp.dir, "prod"), { SITE_ENV: "production" }, project);
  });
  after(() => tmp.cleanup());

  it("publishes the image and its WebP copies with the article in a development build, and names it in the article's head", async () => {
    for (const file of FILES) assert.ok(await exists(path.join(dev, "blog", SLUG, file)), file);
    for (const page of [["blog", SLUG, "index.html"], ["sv", "blog", SLUG, "index.html"]]) {
      const doc = parse(await readFile(path.join(dev, ...page), "utf8"));
      assert.equal(doc.querySelector('meta[property="og:image"]').getAttribute("content"), `${SITE.url}/blog/${SLUG}/cover.png`, page.join("/"));
    }
  });

  it("leaves the image out of the production build, and every page's mention of it", async () => {
    for (const file of FILES) assert.equal(await exists(path.join(prod, "blog", SLUG, file)), false, file);
    const mentions = [];
    for (const file of await walk(prod, ".html")) {
      if ((await readFile(file, "utf8")).includes(`/blog/${SLUG}/cover`)) mentions.push(path.relative(prod, file));
    }
    assert.deepEqual(mentions, [], "no link preview, card or page names the draft's image");
  });
});

describe("which images load at once (si-awlu)", () => {
  // An image on the first screen loads at once: the article's image under its
  // summary, first of all, and the first row of cards on the blog index and
  // the category pages, three on a wide screen (si-9dw5), after the
  // stylesheets and fonts. Every other card's image waits until it is near.
  // On a phone a card shows the 600 px copy.
  let tmp;
  let out;
  before(async () => {
    tmp = await tempDir("images-loading-");
    out = buildSite(tmp.dir);
  });
  after(() => tmp.cleanup());

  /** How each card image of a page loads, in order: "lazy", "low" (at once, fetchpriority="low") or "" for neither. */
  async function cardLoading(...page) {
    const doc = parse(await readFile(path.join(out, ...page), "utf8"));
    return doc.querySelectorAll(".post img").map((img) => img.getAttribute("loading") ?? (img.getAttribute("fetchpriority") === "low" ? "low" : ""));
  }

  it("loads the first row of cards at once, after the stylesheets and fonts, on the blog index and the category pages, and the rest lazily", async () => {
    for (const page of [["blog", "index.html"], ["sv", "blog", "index.html"], ["blog", "ai-journey", "index.html"], ["sv", "blog", "app-development", "index.html"]]) {
      const loading = await cardLoading(...page);
      assert.ok(loading.length >= 2, `${page.join("/")} lists at least two articles`);
      assert.deepEqual(loading, loading.map((_, index) => (index < 3 ? "low" : "lazy")), page.join("/"));
    }
  });

  it("shows a card's 600 px copy on a phone and lets a wider screen pick its copy by width", async () => {
    const doc = parse(await readFile(path.join(out, "blog", "index.html"), "utf8"));
    for (const card of doc.querySelectorAll(".post")) {
      const slug = card.querySelector(".post-title a").getAttribute("href").split("/").at(-2);
      const source = card.querySelector("picture > source");
      assert.equal(source.getAttribute("media"), "(max-width: 47.99rem)", slug);
      assert.equal(source.getAttribute("srcset"), `/blog/${slug}/cover-600.webp`, slug);
      const img = card.querySelector("picture > img.post-image");
      assert.equal(img.getAttribute("srcset"), articleImage(slug, "cover.png").srcset, slug);
      // The card's width in base.css: three columns from 64rem in a container
      // of at most 76rem, two from 48rem (si-9dw5).
      assert.equal(img.getAttribute("sizes"), "(min-width: 76rem) calc((76rem - 8rem) / 3), (min-width: 64rem) calc((100vw - 8rem) / 3), calc(46vw - 0.75rem)", slug);
    }
  });

  it("loads every card lazily on the landing pages and under an article, where the cards are far down the page", async () => {
    for (const page of [["index.html"], ["sv", "index.html"], ["blog", SLUGS[0], "index.html"]]) {
      const loading = await cardLoading(...page);
      assert.ok(loading.length > 0, page.join("/"));
      assert.deepEqual([...new Set(loading)], ["lazy"], page.join("/"));
    }
  });

  it("loads the article's image at once and first", async () => {
    for (const lang of SITE.languages.codes) {
      for (const article of await readArticleSources(SRC, SITE, lang)) {
        const doc = parse(await readFile(path.join(out, article.path, "index.html"), "utf8"));
        const image = doc.querySelector(".article-header img.article-image");
        assert.equal(image.getAttribute("loading"), undefined, article.path);
        assert.equal(image.getAttribute("fetchpriority"), "high", article.path);
        assert.equal(image.getAttribute("alt"), article.imageAlt, article.path);
      }
    }
  });
});
