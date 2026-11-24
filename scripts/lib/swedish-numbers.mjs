// Swedish numbers on one line (si-j1b7), shared by eleventy.config.js and the
// unit tests. Swedish writes a space inside a digit group, "25 387" and
// "1 500 000", and between a number and its per cent sign, "36 %", and that
// space is a fixed one: the number stays on one line, and so do a number and
// its "%" (Språkrådet, Svenska skrivregler). The articles are typed with
// ordinary spaces, at which a browser breaks a line, so a Swedish page could
// end one line with "25" and start the next with "387". The build turns each
// such space into a no-break space, U+00A0, once, in the pages it writes: the
// sources and the sentences of the source lists keep the spaces they were
// typed with, and every Swedish page gets the rule, the published ones too.
//
// Only the Swedish text of a Swedish page's body changes. The <head> (the
// title, the descriptions), every attribute, the comments, code (<code>,
// <pre>, <kbd>, <samp>), <script> (JSON-LD included), <style>, <textarea>,
// the figures (<svg>, whose text never wraps) and the parts of the page in
// another language (lang="en") keep their spaces. The English pages, which
// write "25,387" and "36%", the feeds, the sitemap and every file that is not
// an HTML page are written as they were.

/** U+00A0, the no-break space. */
export const NO_BREAK_SPACE = String.fromCharCode(0xa0);

// HTML's white space: space, tab, line feed, form feed and carriage return,
// all of which a browser shows as one space and may break a line at. The
// articles are hard-wrapped, so the space in a number can be a line break in
// its source.
const WHITE_SPACE = /[\t\n\f\r ]+/g;

// A digit group: one to three digits, then one or more groups of white space
// and exactly three digits, touching no other digit and no letter on either
// side. "2026" alone and "11 oktober 2026" hold none.
const DIGIT_GROUP = /(?<![\p{L}\p{N}])[0-9]{1,3}(?:[\t\n\f\r ]+[0-9]{3})+(?![\p{L}\p{N}])/gu;

// The white space between a number and its per cent sign.
const BEFORE_PERCENT = /(?<=[0-9])[\t\n\f\r ]+(?=%)/g;

// The elements whose text keeps its spaces, the page's <head> among them.
const KEPT = new Set(["head", "code", "pre", "kbd", "samp", "script", "style", "svg", "textarea"]);

/**
 * `text` with the white space inside each digit group, and the white space
 * between a number and its per cent sign, made one no-break space each:
 * "25 387 tokens" and "36 %" keep their spaces as U+00A0.
 */
export function numbersOnOneLine(text) {
  return text.replace(DIGIT_GROUP, (group) => group.replace(WHITE_SPACE, NO_BREAK_SPACE)).replace(BEFORE_PERCENT, NO_BREAK_SPACE);
}

/**
 * Every text in `content` (a posthtml node's), outside the elements of KEPT
 * and outside any element whose lang names another language, through
 * `numbersOnOneLine`. A Swedish page may hold English: an English article the
 * Swedish side shows in English (D206) is an <article lang="en">, and its card
 * in a Swedish list marks its title and description so. English writes
 * "25,387" and "36%", so its text keeps its spaces, and a part marked Swedish
 * again inside it (lang="sv") gets the rule.
 */
function keepNumbersTogether(content) {
  for (const [index, node] of content.entries()) {
    if (typeof node === "string") {
      // posthtml-parser keeps a comment as a string too, "<!--…-->"; no text
      // starts with "<!".
      if (!node.startsWith("<!")) content[index] = numbersOnOneLine(node);
    } else if (Array.isArray(node?.content) && !KEPT.has(String(node.tag).toLowerCase())) {
      if (isOtherLanguage(node)) keepSwedishParts(node.content);
      else keepNumbersTogether(node.content);
    }
  }
}

/** Does this element say its text is in a language other than Swedish (lang="en", lang="en-GB")? */
function isOtherLanguage(node) {
  const lang = node?.attrs?.lang;
  return typeof lang === "string" && lang !== "" && !/^sv(?:-|$)/i.test(lang);
}

/** Inside an element in another language: only the elements marked Swedish again get the rule. */
function keepSwedishParts(content) {
  for (const node of content) {
    if (!Array.isArray(node?.content) || KEPT.has(String(node.tag).toLowerCase())) continue;
    if (/^sv(?:-|$)/i.test(String(node.attrs?.lang ?? ""))) keepNumbersTogether(node.content);
    else keepSwedishParts(node.content);
  }
}

/**
 * A posthtml plugin for Eleventy's HTML transformer: on a page whose <html>
 * says lang="sv", every text outside the elements of KEPT goes through
 * `numbersOnOneLine`. posthtml-parser hands a text over as a string in its
 * element's content, as written in the page (a character reference is not
 * decoded), and the plugin changes nothing else. Any other page comes back
 * as it was.
 */
export function swedishNumbersOnOneLine(tree) {
  const html = tree.find((node) => typeof node === "object" && String(node?.tag).toLowerCase() === "html");
  if (html?.attrs?.lang === "sv" && Array.isArray(html.content)) keepNumbersTogether(html.content);
  return tree;
}
