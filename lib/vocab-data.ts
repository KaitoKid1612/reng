import n4 from "@/content/vocab/n4.json";
import { KANJI_LEVEL_DATA } from "@/lib/kanji-data";
import { parseVocabLevel } from "@/lib/jlpt-vocab";

import type { JlptVocabLevelData, VocabLevel } from "@/lib/jlpt-vocab";

// Example sentences may use the kanji of Reng's N5 and N4 lists, nothing else.
const ALLOWED_KANJI = new Set(
  [...KANJI_LEVEL_DATA.n5.items, ...KANJI_LEVEL_DATA.n4.items].map((item) => item.kanji),
);

export const VOCAB_LEVEL_DATA: Record<VocabLevel, JlptVocabLevelData> = {
  n4: parseVocabLevel(n4, ALLOWED_KANJI),
};
