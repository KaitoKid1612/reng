// JLPT official workbooks (公式問題集 2012 and 第二集 2018), published free on jlpt.jp. The site
// policy §1(4) lets them be copied as free Japanese teaching material when the source is credited
// next to it. The listening recordings contain third-party works, so Reng re-records the official
// script with synthetic voices and links the original recording instead of copying it.
export const JLPT_OFFICIAL_CREDIT = "出典　日本語能力試験公式ウェブサイト（https://www.jlpt.jp/）";

export type JlptWorkbookYear = 2012 | 2018;

// The original recording of one listening part (もんだい1–4) of a workbook test.
export function officialAudioUrl(year: JlptWorkbookYear, level: "N4" | "N5", part: number) {
  return `https://www.jlpt.jp/samples/sample${year}/mp3/${level}Q${part}.mp3`;
}

// Learners keep the questions unseen until the exam: the test's lesson opens to them the day
// after the real JLPT, while the mock exam given from it opens at once.
export const OFFICIAL_TEST_OPENS_AT = "2026-12-07T00:00:00+07:00";
