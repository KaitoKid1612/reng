// FNV-1a over code points: the same text always gives the same number, on the server and in the
// browser, so fixed shuffles of exercise items stay the same between page loads and publishes.
export function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619) >>> 0;
  }
  return hash;
}
