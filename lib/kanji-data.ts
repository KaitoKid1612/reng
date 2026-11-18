import n4 from "@/content/kanji/n4.json";
import n5 from "@/content/kanji/n5.json";
import { parseKanjiLevel } from "@/lib/jlpt-kanji";

import type { JlptKanjiLevelData, KanjiLevel } from "@/lib/jlpt-kanji";

// N4 words may use N5 kanji; N4 lists none of them again.
const n5Level = parseKanjiLevel(n5);
const n4Level = parseKanjiLevel(n4, new Set(n5Level.items.map((item) => item.kanji)));

export const KANJI_LEVEL_DATA: Record<KanjiLevel, JlptKanjiLevelData> = {
  n5: n5Level,
  n4: n4Level,
};

/** The kanji of the levels below this one, which its words may also use. */
export function lowerLevelKanji(level: KanjiLevel) {
  return level === "n4" ? new Set(n5Level.items.map((item) => item.kanji)) : new Set<string>();
}
