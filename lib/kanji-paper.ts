import n42012 from "@/content/jlpt/official/n4-2012.json";
import n42018 from "@/content/jlpt/official/n4-2018.json";
import n52012 from "@/content/jlpt/official/n5-2012.json";
import n52018 from "@/content/jlpt/official/n5-2018.json";
import { collectPaperKanji } from "@/lib/jlpt-kanji";

import type { KanjiLevel, PaperWord } from "@/lib/jlpt-kanji";

// The official sample papers of each level, oldest first. Only the maintenance script and the
// tests read them; pages read the marks already written into content/kanji.
const PAPERS: Record<KanjiLevel, { year: number; questions: unknown }[]> = {
  n5: [
    { year: 2012, questions: n52012.content.questions },
    { year: 2018, questions: n52018.content.questions },
  ],
  n4: [
    { year: 2012, questions: n42012.content.questions },
    { year: 2018, questions: n42018.content.questions },
  ],
};

/** Each kanji the papers of a level asked about, with the words that used it. */
export function paperWordsOf(level: KanjiLevel) {
  const result = new Map<string, PaperWord[]>();
  for (const paper of PAPERS[level]) {
    const questions = paper.questions as Parameters<typeof collectPaperKanji>[0];
    for (const [kanji, words] of collectPaperKanji(questions, paper.year)) {
      result.set(kanji, [...(result.get(kanji) ?? []), ...words]);
    }
  }
  return result;
}
