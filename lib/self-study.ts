export interface SelfStudyTool {
  href: string;
  label: string;
  description: string;
}

export type SelfStudySubjectId = "japanese" | "chinese";

export interface SelfStudySubject {
  id: SelfStudySubjectId;
  name: string;
  summary: string;
  tools: readonly SelfStudyTool[];
}

// Free practice that needs no account, grouped by subject. Reng itself is not tied to a subject:
// a new subject adds an entry here and appears on /self-study and in its own sub-navigation.
export const SELF_STUDY_SUBJECTS: readonly SelfStudySubject[] = [
  {
    id: "japanese",
    name: "Tiếng Nhật",
    summary: "Cho người mới bắt đầu: làm quen chữ viết và tra mẫu câu trong các bài công khai.",
    tools: [
      {
        href: "/kana",
        label: "Bảng chữ cái",
        description: "Hiragana và Katakana đầy đủ; bấm từng chữ để nghe cách đọc.",
      },
      {
        // "Luyện tập" names class practice sets, so the drill names its script instead.
        href: "/kana/practice",
        label: "Luyện kana",
        description: "Nhìn chữ, gõ cách đọc bằng romaji, luyện lại những chữ còn nhầm.",
      },
      {
        href: "/grammar",
        label: "Tra ngữ pháp",
        description: "Tìm mẫu câu bằng tiếng Nhật hoặc nghĩa tiếng Việt, kèm ví dụ.",
      },
    ],
  },
  {
    id: "chinese",
    name: "Tiếng Trung",
    summary: "Cho người mới bắt đầu: làm quen pinyin, thanh điệu và cách gõ pinyin có dấu.",
    tools: [
      {
        href: "/pinyin",
        label: "Bảng pinyin",
        description: "Bốn thanh điệu và thanh nhẹ, thanh mẫu, vận mẫu, cách đặt dấu thanh.",
      },
      {
        href: "/pinyin/practice",
        label: "Luyện gõ pinyin",
        description: "Nhìn chữ Hán và nghĩa, gõ pinyin có dấu (gõ được số thanh: ni3 → nǐ).",
      },
    ],
  },
];

export function getSelfStudySubject(subjectId: SelfStudySubjectId) {
  const subject = SELF_STUDY_SUBJECTS.find((item) => item.id === subjectId);
  if (!subject) {
    throw new Error(`Unknown self-study subject: ${subjectId}`);
  }
  return subject;
}

// Pages that belong to the self-study area, so the header can mark it on each of them.
export const SELF_STUDY_PATHS: readonly string[] = [
  "/self-study",
  "/lessons",
  ...SELF_STUDY_SUBJECTS.flatMap((subject) => subject.tools.map((tool) => tool.href)),
];
