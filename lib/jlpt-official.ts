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

// "Đề mẫu chính thức trên mạng" on the exam page: plain links to free official material, never
// embedded (content/jlpt/source-audit-2026-11-23.json lists what was checked and why).
export interface JlptOnlineSample {
  title: string;
  url: string;
  detail: string;
}

export const JLPT_ONLINE_SAMPLES: readonly JlptOnlineSample[] = [
  {
    title: "日本語能力試験 公式問題集 (jlpt.jp)",
    url: "https://www.jlpt.jp/samples/sampleindex.html",
    detail:
      "Hai tập đề chính thức miễn phí (2012 và 第二集 2018), mỗi cấp N1–N5 có PDF đề, đáp án, lời nghe và MP3. Reng đã đưa N5, N4 của cả hai tập vào Luyện đề.",
  },
  {
    title: "JLPT Official Practice Workbook (bản tiếng Anh)",
    url: "https://www.jlpt.jp/e/samples/sampleindex.html",
    detail: "Cùng hai tập đề, giao diện tiếng Anh.",
  },
  {
    title: "日本語能力試験 問題例 (jlpt.jp, 2009)",
    url: "https://www.jlpt.jp/samples/sample09.html",
    detail:
      "Câu hỏi mẫu công bố trước kỳ thi mới năm 2010, có đáp án: N5 29 câu, N4 34 câu, audio cho một phần câu nghe. Không phải trọn một đề, dạng đề cũ hơn đề hiện nay.",
  },
  {
    title: "問題例に挑戦しよう (jlpt.jp)",
    url: "https://www.jlpt.jp/samples/forlearners.html",
    detail: "Làm thử các câu mẫu trên ngay trên trang jlpt.jp.",
  },
];
