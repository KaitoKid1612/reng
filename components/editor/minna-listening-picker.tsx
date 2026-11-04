"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_QUESTIONS } from "@/lib/lesson-draft";
import {
  guessMinnaLesson,
  MINNA_LISTENING_LESSONS,
  minnaListeningQuestions,
} from "@/lib/minna-listening";

import type { DraftContent } from "@/lib/lesson-draft";
import type { EditorAction } from "@/lib/lesson-editor";

interface MinnaListeningPickerProps {
  content: DraftContent;
  title: string;
  dispatch: (action: EditorAction) => void;
}

export function MinnaListeningPicker({ content, title, dispatch }: MinnaListeningPickerProps) {
  const [lesson, setLesson] = useState(() => guessMinnaLesson(title) ?? MINNA_LISTENING_LESSONS[0]);
  const [notice, setNotice] = useState("");
  const present = new Set(content.questions.map((question) => question.id));
  const missing = minnaListeningQuestions(lesson).filter((question) => !present.has(question.id));

  function handleAdd() {
    const added = missing.slice(0, Math.max(0, MAX_QUESTIONS - content.questions.length));
    added.forEach((question) => dispatch({ type: "addQuestion", question }));
    setNotice(
      added.length
        ? `Đã thêm ${added.length} câu nghe của Bài ${lesson} vào cuối danh sách câu luyện. Nghe thử ở từng câu, lưu nháp rồi xuất bản.`
        : `Chưa thêm được câu nào: bài đã có tối đa ${MAX_QUESTIONS} câu luyện.`,
    );
  }

  return (
    <div className="form-card">
      <h3>Câu nghe Minna có sẵn</h3>
      <p className="small muted">
        Mỗi bài 1–15 có 6 câu nghe Reng tự biên soạn (3 câu nghe chọn, 2 câu nghe điền, 1 câu chép
        chính tả), đã có audio. Thêm vào bài này rồi xuất bản: học viên gặp các câu ở bài giao, bài
        luyện tập hằng ngày và trang Luyện nghe của bài.
      </p>
      <div className="button-row">
        <label htmlFor="minna-listening-lesson">Câu nghe của</label>
        <select
          id="minna-listening-lesson"
          value={lesson}
          onChange={(event) => {
            setLesson(Number(event.target.value));
            setNotice("");
          }}
        >
          {MINNA_LISTENING_LESSONS.map((number) => (
            <option key={number} value={number}>
              Bài {number}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!missing.length}>
          {missing.length ? `Thêm ${missing.length} câu nghe` : "Bài đã có các câu nghe này"}
        </Button>
      </div>
      {notice && (
        <p className="small" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
