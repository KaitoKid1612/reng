import { toPlainJapanese } from "@/lib/japanese-text";

import type { DraftContent, DraftSlide, SlideType } from "@/lib/lesson-draft";

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  title: "Tiêu đề",
  vocab: "Từ vựng",
  grammar: "Mẫu câu",
  example: "Câu ví dụ",
  dialogue: "Hội thoại",
  table: "Bảng / luyện thay thế",
  quiz: "Câu luyện",
  note: "Ghi chú",
  image: "Ảnh",
};

export const SLIDE_TYPES = Object.keys(SLIDE_TYPE_LABELS).filter(
  (type): type is SlideType => type in SLIDE_TYPE_LABELS,
);

export const FURIGANA_HINT = "Furigana: viết {漢字|かんじ}, ví dụ {郵便局|ゆうびんきょく}.";

// Short text shown in the slide list so teachers recognise each slide without opening it.
export function summarizeSlide(slide: DraftSlide, content: DraftContent) {
  switch (slide.type) {
    case "title":
      return toPlainJapanese(slide.jp) || slide.vi || "Chưa có nội dung";
    case "vocab":
      return slide.refs.length
        ? slide.refs
            .map((ref) => content.vocab.find((item) => item.id === ref)?.jp ?? "?")
            .join("、")
        : "Chưa chọn từ";
    case "grammar":
    case "example":
      return (
        toPlainJapanese(content.grammar.find((item) => item.id === slide.ref)?.pattern ?? "") ||
        "Chưa chọn mẫu câu"
      );
    case "dialogue":
      return toPlainJapanese(slide.title || slide.lines[0]?.jp || "") || "Chưa có lượt thoại";
    case "table":
      return toPlainJapanese(slide.title || slide.columns.join(" · ")) || "Chưa có bảng";
    case "quiz":
      return content.questions.find((item) => item.id === slide.ref)?.prompt || "Chưa chọn câu";
    case "note":
      return slide.title || "Chưa có tiêu đề";
    case "image":
      return slide.alt || slide.src || "Chưa có ảnh";
  }
}
