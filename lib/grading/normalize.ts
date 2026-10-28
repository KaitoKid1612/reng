// Contract from docs/07: width/compatibility folding, no whitespace and one optional final full stop.
// Kana/kanji equivalence is never inferred; teachers declare every accepted form.
export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[。．.]$/, "");
}
