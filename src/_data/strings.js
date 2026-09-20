import { readFileSync } from "node:fs";

// All UI strings live in one JSON file per language; the two files must keep
// identical key sets (REQ-011). Templates read `strings[lang].<path>` and
// never contain literal UI text. Read synchronously so `eleventy --serve`
// picks up edits without a cached module import.
function load(code) {
  return JSON.parse(readFileSync(new URL(`./strings/${code}.json`, import.meta.url), "utf8"));
}

export default {
  en: load("en"),
  sv: load("sv"),
};
