"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { buildKanjiQuestions, findWordsWithoutKanjiQuestions } from "@/lib/kanji-practice";

import type { DraftContent } from "@/lib/lesson-draft";
import type { EditorAction } from "@/lib/lesson-editor";

interface KanjiQuestionGeneratorProps {
  content: DraftContent;
  dispatch: (action: EditorAction) => void;
}

export function KanjiQuestionGenerator({ content, dispatch }: KanjiQuestionGeneratorProps) {
  const [notice, setNotice] = useState("");
  const pendingCount = findWordsWithoutKanjiQuestions(content).length;

  function handleGenerate() {
    const questions = buildKanjiQuestions(content);
    questions.forEach((question) => dispatch({ type: "addQuestion", question }));
    setNotice(
      questions.length
        ? `Đã thêm ${questions.length} câu kanji vào cuối danh sách câu luyện. Xem lại rồi lưu nháp.`
        : "Chưa thêm được câu nào: bài đã có tối đa 200 câu luyện.",
    );
  }

  return (
    <div className="form-card">
      <h3>Câu luyện kanji</h3>
      <p className="small muted">
        Tạo câu đọc (gõ hiragana) và câu chọn chữ Hán từ các từ có cột kanji. Đáp án lấy từ cột kana
        bạn đã ghi, không tự suy cách đọc. Câu được gắn thẻ kanji và dùng như câu luyện thường khi
        giao bài, luyện hằng ngày và vào sổ lỗi.
      </p>
      <Button type="button" variant="outline" onClick={handleGenerate} disabled={!pendingCount}>
        {pendingCount ? `Tạo câu kanji cho ${pendingCount} từ` : "Mọi từ có kanji đã có câu"}
      </Button>
      {notice && (
        <p className="small" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
