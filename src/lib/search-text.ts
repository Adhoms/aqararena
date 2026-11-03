/**
 * Loose form of text for "type to find" matching: case, extra spaces, diacritics and the
 * common Arabic spelling variants (أ/إ/آ → ا, ة → ه, ى → ي) are ignored.
 */
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when every word of the query appears somewhere in the haystack (already normalized). */
export function matchesQuery(haystack: string, query: string) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return words.every((w) => haystack.includes(w));
}
