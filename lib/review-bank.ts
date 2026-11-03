import type { LessonContent } from "@/lib/lesson-schema";

export const BANK_LANGUAGES = ["ja-JP", "zh-Hans", "zh-Hant"] as const;
export type BankLanguage = (typeof BANK_LANGUAGES)[number];

const CHINESE_INPUT_MODES: readonly string[] = ["chinese", "pinyin"];

// A bank imported as JSON does not say which language it teaches, so the import names it. The
// exact Chinese grading profile is what gives a question Chinese grading and display; without
// it a Chinese bank would be graded and drawn as Japanese. Chinese words belong in lessons made
// with the Chinese editor, whose vocabulary has hanzi and pinyin fields; a Chinese bank carries
// questions only.
export function findBankLanguageProblems(content: LessonContent, language: BankLanguage) {
  const isChinese = language !== "ja-JP";
  const problems: string[] = [];
  for (const question of content.questions) {
    const hasChineseProfile = question.gradingProfile === "zh-exact-v1";
    const asksChineseInput =
      "inputMode" in question && CHINESE_INPUT_MODES.includes(question.inputMode);
    if (isChinese && !hasChineseProfile) {
      problems.push(`${question.id}: Chinese questions need gradingProfile "zh-exact-v1".`);
    }
    if (!isChinese && (hasChineseProfile || asksChineseInput)) {
      problems.push(`${question.id}: a Japanese bank cannot use Chinese grading or input.`);
    }
  }
  if (isChinese && content.vocab.length) {
    problems.push("A Chinese bank keeps vocab empty; teach its words in a Chinese lesson.");
  }
  return problems;
}
