// Syntax highlighting for the fenced code blocks of articles (si-20k4).
//
// Done at build time: markdown-it's `highlight` option (eleventy.config.js)
// calls `highlight(code, lang)` for every fence that has a language, and the
// page carries <span class="tok-…"> elements, styled in base.css with the
// --color-code-* tokens of tokens.css. No script, no inline style, no request.
//
// A small tokenizer of our own instead of highlight.js: the articles need
// four languages (sh, markdown with a YAML front matter, yaml, json) and a
// handful of token kinds, a library's grammars would add a dependency and a
// supply-chain surface for a hundred lines of rules, and a tokenizer here
// cannot change a word of an article: every function below only COLOURS
// text it has consumed, and `highlight` refuses its own output unless the
// tokens read back as exactly the code it was given (tests/highlight.test.mjs
// also runs random input through every language).
//
// Five kinds of token, enough to read a script or a SKILL.md at a glance:
//   comment  # comments, the --- lines around a front matter, code fences
//   string   quoted strings, `inline code` in Markdown, YAML/JSON strings
//   param    $variables, ${…}, -flags and --flags, NAME= before a value
//   keyword  if/then/fi, exit, Markdown list markers, true/false/null, numbers
//   name     command names, YAML/JSON keys, Markdown headings
// Anything else is left as it is. A fence whose language is not listed in
// LANGUAGES (and `text`, which every existing article uses) is not touched:
// `highlight` returns "" and markdown-it writes the block as it always did.

/** The token kinds. Each has a class tok-<kind> and a colour token --color-code-<kind>. */
export const KINDS = ["comment", "string", "param", "keyword", "name"];

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** [kind | null, text] pairs; neighbours of one kind merge into one. */
class Tokens {
  list = [];
  add(kind, text) {
    if (!text) return;
    const last = this.list.at(-1);
    if (last && last[0] === kind) last[1] += text;
    else this.list.push([kind, text]);
  }
  append(other) {
    for (const [kind, text] of other.list) this.add(kind, text);
  }
}

// ---------------------------------------------------------------- sh

const SH_KEYWORDS = new Set(["if", "then", "elif", "else", "fi", "for", "select", "while", "until", "do", "done", "case", "esac", "in", "function", "time", "exit", "return", "break", "continue", "!", "{", "}"]);
// After these words a command comes next; after for/select/case comes `in`.
const SH_COMMAND_NEXT = new Set(["if", "then", "elif", "else", "while", "until", "do", "time", "!", "{"]);
const SH_LOOP = new Set(["for", "select", "case"]);
const SH_OPERATOR = /\d*(?:>>|<<<|<<-?|>&|<&|>\||<>|>|<)[\d-]*|;;&?|&&|\|\||\|&?|[;&()]/y;
const SH_ASSIGNMENT = /[A-Za-z_][A-Za-z0-9_]*\+?=/y;
const SH_VARIABLE = /\$(?:[A-Za-z_][A-Za-z0-9_]*|\d|[@*#?$!-])/y;
const SH_LITERAL = /[^ \t\r\n;|&()<>'"$`\\]+/y;
// A word ends at a blank, a line end or an operator character.
const SH_WORD_END = /[ \t\r\n;|&()<>]/;

// The index of the ")" that closes the "(" at `open`, skipping quotes and
// escapes; -1 when there is none.
function closingParen(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (c === "\\") i += 1;
    else if (c === "'") {
      i = src.indexOf("'", i + 1);
      if (i < 0) return -1;
    } else if (c === '"') {
      i += 1;
      while (i < src.length && src[i] !== '"') i += src[i] === "\\" ? 2 : 1;
      if (i >= src.length) return -1;
    } else if (c === "(") depth += 1;
    else if (c === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// The index of the "}" that closes the "{" at `open`; -1 when there is none.
function closingBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "\\") i += 1;
    else if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// "$…" at src[i]: a variable, ${…}, $(…) (its inside is read as sh again),
// $((…)). `base` is the kind of the text around it (null, or "string" inside
// double quotes), which the punctuation of the expansion keeps. Returns the
// index after what it consumed.
function shDollar(src, i, parts, base) {
  const next = src[i + 1];
  if (next === "(") {
    const close = closingParen(src, i + 1);
    if (close < 0) {
      parts.add(base, "$(");
      return i + 2;
    }
    if (src[i + 2] === "(") {
      parts.add("param", src.slice(i, close + 1));
    } else {
      parts.add(base, "$(");
      shScan(src.slice(i + 2, close), parts, true);
      parts.add(base, ")");
    }
    return close + 1;
  }
  if (next === "{") {
    const close = closingBrace(src, i + 1);
    if (close < 0) {
      parts.add(base, "${");
      return i + 2;
    }
    parts.add("param", src.slice(i, close + 1));
    return close + 1;
  }
  SH_VARIABLE.lastIndex = i;
  const variable = SH_VARIABLE.exec(src);
  if (variable) {
    parts.add("param", variable[0]);
    return i + variable[0].length;
  }
  parts.add(base, "$");
  return i + 1;
}

// `…` at src[i]: read as sh again when it closes.
function shBacktick(src, i, parts, base) {
  let close = i + 1;
  while (close < src.length && src[close] !== "`") close += src[close] === "\\" ? 2 : 1;
  if (close >= src.length) {
    parts.add(base, "`");
    return i + 1;
  }
  parts.add(base, "`");
  shScan(src.slice(i + 1, close), parts, true);
  parts.add(base, "`");
  return close + 1;
}

// "…" at src[i]: a string with its $variables and $(…) marked.
function shDoubleQuoted(src, i, parts) {
  let j = i + 1;
  let from = i;
  const flush = () => {
    parts.add("string", src.slice(from, j));
    from = j;
  };
  while (j < src.length && src[j] !== '"') {
    if (src[j] === "\\") j += 2;
    else if (src[j] === "$" || src[j] === "`") {
      flush();
      j = src[j] === "$" ? shDollar(src, j, parts, "string") : shBacktick(src, j, parts, "string");
      from = j;
    } else j += 1;
  }
  j = Math.min(j + 1, src.length);
  flush();
  return j;
}

function shScan(src, out, command = true) {
  const n = src.length;
  let i = 0;
  let loop = false; // after for/select/case, `in` is a keyword
  let redirected = false; // the word after a redirection is a file, not a command
  while (i < n) {
    const ch = src[i];
    if (ch === "\n") {
      out.add(null, ch);
      i += 1;
      command = true;
      loop = false;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      const start = i;
      while (i < n && (src[i] === " " || src[i] === "\t" || src[i] === "\r")) i += 1;
      out.add(null, src.slice(start, i));
      continue;
    }
    if (ch === "\\" && (src[i + 1] === "\n" || (src[i + 1] === "\r" && src[i + 2] === "\n"))) {
      const end = src[i + 1] === "\n" ? i + 2 : i + 3;
      out.add(null, src.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "#") {
      let end = src.indexOf("\n", i);
      if (end < 0) end = n;
      out.add("comment", src.slice(i, end));
      i = end;
      continue;
    }
    SH_OPERATOR.lastIndex = i;
    const operator = SH_OPERATOR.exec(src);
    if (operator) {
      out.add(null, operator[0]);
      i += operator[0].length;
      redirected = /[<>]/.test(operator[0]) && !/[\d-]$/.test(operator[0]);
      if (!redirected) {
        command = true;
        loop = false;
      }
      continue;
    }

    // A word: literal text, quotes and expansions, up to a blank or operator.
    const parts = new Tokens();
    const start = i;
    let literalOnly = true;
    let assignment = false;
    SH_ASSIGNMENT.lastIndex = i;
    const assigned = SH_ASSIGNMENT.exec(src);
    if (assigned) {
      parts.add("param", assigned[0].slice(0, -1));
      parts.add(null, "=");
      i += assigned[0].length;
      literalOnly = false;
      assignment = true;
    }
    const flag = !command && !assignment && src[i] === "-" && i + 1 < n && !SH_WORD_END.test(src[i + 1]);
    while (i < n && !SH_WORD_END.test(src[i])) {
      const c = src[i];
      if (c === "'") {
        const close = src.indexOf("'", i + 1);
        const end = close < 0 ? n : close + 1;
        parts.add("string", src.slice(i, end));
        i = end;
        literalOnly = false;
      } else if (c === '"') {
        i = shDoubleQuoted(src, i, parts);
        literalOnly = false;
      } else if (c === "$") {
        const end = shDollar(src, i, parts, null);
        // a "$" that expands nothing is one literal character
        if (end !== i + 1 || parts.list.at(-1)[0] !== null) literalOnly = false;
        i = end;
      } else if (c === "`") {
        i = shBacktick(src, i, parts, null);
        literalOnly = false;
      } else if (c === "\\") {
        parts.add(flag ? "param" : null, src.slice(i, i + 2));
        i += 2;
      } else {
        SH_LITERAL.lastIndex = i;
        const run = SH_LITERAL.exec(src)[0];
        parts.add(flag ? "param" : null, run);
        i += run.length;
      }
    }
    i = Math.min(i, n);
    if (i === start) {
      // not reachable for the characters above; never loop on a stranger
      out.add(null, src[i]);
      i += 1;
      continue;
    }
    const text = src.slice(start, i);

    if (literalOnly && !assignment) {
      if (redirected) {
        // a file name: left as it is
      } else if (command && text === "$") {
        // a prompt typed in front of a command: left as it is, the command follows
        out.append(parts);
        continue;
      } else if (command) {
        const keyword = SH_KEYWORDS.has(text);
        out.add(keyword ? "keyword" : "name", text);
        command = SH_COMMAND_NEXT.has(text);
        loop = SH_LOOP.has(text);
        redirected = false;
        continue;
      } else if (loop && text === "in") {
        out.add("keyword", text);
        loop = false;
        continue;
      }
    }
    out.append(parts);
    redirected = false;
    if (!(assignment && command)) command = false;
  }
}

function sh(src) {
  const out = new Tokens();
  shScan(src, out, true);
  return out;
}

// ---------------------------------------------------------------- yaml

const YAML_KEY = /^(\s*(?:-\s+)*)("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s#"'&*!|>%@`\-?:[\]{},][^#]*?|-[^\s#][^#]*?)(\s*:)(?=\s|$)/;
const YAML_LITERAL = /^(?:true|false|null|~|[-+]?(?:\d[\d_]*)(?:\.\d+)?(?:[eE][-+]?\d+)?|0x[0-9a-fA-F]+)$/;
const YAML_BLOCK = /^[|>][-+0-9]*\s*(?:#.*)?$/;

// The value after "key:" or "- ": a string, a literal, an anchor, a comment.
function yamlValue(text, out) {
  let i = text.match(/^\s*/)[0].length;
  out.add(null, text.slice(0, i));
  const first = text[i];
  if (first === "&" || first === "*" || first === "!") {
    const token = text.slice(i).match(/^\S+/)[0];
    out.add("param", token);
    i += token.length;
    return yamlValue(text.slice(i), out);
  }
  if (first === "|" || first === ">") {
    const header = text.slice(i).match(/^[|>][-+0-9]*/)[0];
    out.add(null, header);
    i += header.length;
  }
  const flow = first === "[" || first === "{";
  // Scalar, flow collection or comment: walk to the end, marking quoted
  // strings that start where a token could and comments after a blank.
  let plain = "";
  const flush = () => {
    const [, lead, word, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(plain);
    if (!flow && word && YAML_LITERAL.test(word)) {
      out.add(null, lead);
      out.add("keyword", word);
      out.add(null, tail);
    } else out.add(null, plain);
    plain = "";
  };
  while (i < text.length) {
    const c = text[i];
    const before = i === 0 ? " " : text[i - 1];
    if (c === "#" && /\s/.test(before)) {
      flush();
      out.add("comment", text.slice(i));
      return;
    }
    if ((c === '"' || c === "'") && !/[A-Za-z0-9_]/.test(before)) {
      let j = i + 1;
      while (j < text.length) {
        if (c === '"' && text[j] === "\\") j += 2;
        else if (text[j] === c) {
          if (c === "'" && text[j + 1] === "'") j += 2;
          else break;
        } else j += 1;
      }
      if (j < text.length) {
        flush();
        out.add("string", text.slice(i, j + 1));
        i = j + 1;
        continue;
      }
    }
    plain += c;
    i += 1;
  }
  flush();
}

function yamlLines(lines, out) {
  let blockColumn = null; // inside a | or > scalar: lines indented deeper than this belong to it
  for (const line of lines) {
    const body = line.replace(/\n$/, "");
    const newline = line.slice(body.length);
    const indent = body.match(/^\s*/)[0].length;
    if (blockColumn !== null) {
      if (body.trim() === "" || indent > blockColumn) {
        out.add(null, line);
        continue;
      }
      blockColumn = null;
    }
    if (/^\s*#/.test(body)) {
      out.add(null, body.slice(0, indent));
      out.add("comment", body.slice(indent));
    } else if (/^(?:---|\.\.\.)(?:\s|$)/.test(body)) {
      out.add("comment", body.slice(0, 3));
      yamlValue(body.slice(3), out);
    } else {
      const key = YAML_KEY.exec(body);
      if (key) {
        out.add(null, key[1]);
        out.add("name", key[2]);
        out.add(null, key[3]);
        const value = body.slice(key[0].length);
        yamlValue(value, out);
        if (YAML_BLOCK.test(value.trim())) blockColumn = key[1].length;
      } else {
        const item = /^(\s*-\s+)/.exec(body);
        if (item) {
          out.add(null, item[1]);
          yamlValue(body.slice(item[1].length), out);
        } else yamlValue(body, out);
      }
    }
    out.add(null, newline);
  }
}

const splitLines = (src) => src.match(/[^\n]*\n|[^\n]+/g) ?? [];

function yaml(src) {
  const out = new Tokens();
  yamlLines(splitLines(src), out);
  return out;
}

// ---------------------------------------------------------------- json

const JSON_TOKEN = /("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|true|false|null)(?![A-Za-z0-9_])|[^"\-\dtfn]+|[\s\S]/y;

function json(src) {
  const out = new Tokens();
  JSON_TOKEN.lastIndex = 0;
  let match;
  while (JSON_TOKEN.lastIndex < src.length && (match = JSON_TOKEN.exec(src))) {
    if (match[1]) {
      out.add(match[2] ? "name" : "string", match[1]);
      out.add(null, match[2] ?? "");
    } else if (match[3]) out.add("keyword", match[3]);
    else out.add(null, match[0]);
  }
  return out;
}

// ---------------------------------------------------------------- markdown

// Inline code spans of one line: `code`, ``code with ` in it``.
function markdownInline(text, out) {
  let i = 0;
  let from = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      i += 1;
      continue;
    }
    const ticks = text.slice(i).match(/^`+/)[0];
    const close = text.indexOf(ticks, i + ticks.length);
    if (close < 0 || text[close + ticks.length] === "`") {
      i += ticks.length;
      continue;
    }
    out.add(null, text.slice(from, i));
    out.add("string", text.slice(i, close + ticks.length));
    i = close + ticks.length;
    from = i;
  }
  out.add(null, text.slice(from));
}

function markdown(src) {
  const out = new Tokens();
  let lines = splitLines(src);
  // A YAML front matter: --- on the first line, the closing --- (or ...) later.
  if (lines.length > 0 && /^---[ \t]*\r?\n?$/.test(lines[0])) {
    const close = lines.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)[ \t]*\r?\n?$/.test(line));
    if (close > 0) {
      const delimiter = (line) => {
        const body = line.replace(/\n$/, "");
        out.add("comment", body.slice(0, 3));
        out.add(null, body.slice(3) + line.slice(body.length));
      };
      delimiter(lines[0]);
      yamlLines(lines.slice(1, close), out);
      delimiter(lines[close]);
      lines = lines.slice(close + 1);
    }
  }
  let fence = null; // the marker of the open code fence
  for (const line of lines) {
    const body = line.replace(/\n$/, "");
    const newline = line.slice(body.length);
    const fenced = /^(\s*)(`{3,}|~{3,})/.exec(body);
    if (fence) {
      if (fenced && fenced[2][0] === fence[0] && fenced[2].length >= fence.length) {
        fence = null;
        out.add("comment", body);
      } else out.add(null, body);
    } else if (fenced) {
      fence = fenced[2];
      out.add("comment", body);
    } else if (/^\s{0,3}#{1,6}(?:\s|$)/.test(body)) {
      out.add("name", body);
    } else if (/^\s{0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(body)) {
      out.add("comment", body);
    } else {
      const quote = /^(\s{0,3}(?:>\s?)+)/.exec(body);
      const rest = quote ? body.slice(quote[0].length) : body;
      if (quote) out.add("comment", quote[0]);
      const item = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)/.exec(rest);
      if (item) {
        out.add(null, item[1]);
        out.add("keyword", item[2]);
        out.add(null, item[3]);
        markdownInline(rest.slice(item[0].length), out);
      } else markdownInline(rest, out);
    }
    out.add(null, newline);
  }
  return out;
}

// ---------------------------------------------------------------- API

/** The fence languages that are highlighted, by the tag an author writes. */
export const LANGUAGES = {
  sh,
  bash: sh,
  shell: sh,
  zsh: sh,
  markdown,
  md: markdown,
  yaml,
  yml: yaml,
  json,
};

/**
 * The tokens of `code` in language `lang`, or null when the language is not
 * one of LANGUAGES. The texts of the tokens always join to exactly `code`.
 */
export function tokenize(code, lang) {
  const scan = Object.hasOwn(LANGUAGES, String(lang).toLowerCase()) ? LANGUAGES[String(lang).toLowerCase()] : null;
  if (!scan) return null;
  const tokens = scan(code).list;
  // The one promise of this module: the code is coloured, never changed. A
  // tokenizer that broke it would show here instead of in an article.
  return tokens.map(([, text]) => text).join("") === code ? tokens : null;
}

/**
 * The inside of <code> for a fenced block: the code escaped as markdown-it
 * escapes it, with a <span class="tok-…"> around each coloured token. "" for
 * a language that is not highlighted, which makes markdown-it write the block
 * as it does without this module (byte for byte).
 */
export function highlight(code, lang) {
  const tokens = tokenize(code, lang);
  if (!tokens) return "";
  return tokens.map(([kind, text]) => (kind ? `<span class="tok-${kind}">${escapeHtml(text)}</span>` : escapeHtml(text))).join("");
}
