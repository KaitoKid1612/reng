"use client";

import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { importVocabularyAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";
import { CSV_TEMPLATE, decodeCsvFile, parseVocabularyCsv } from "@/lib/vocab-csv";

import type { ChangeEvent } from "react";

export interface ImportableLesson {
  id: string;
  title: string;
  revision: number;
  vocab: { jp: string; vi: string }[];
}

interface VocabularyImportProps {
  lessons: ImportableLesson[];
  initialLessonId: string;
}

const STATUS_LABELS = { valid: "Hợp lệ", invalid: "Lỗi", duplicate: "Bỏ qua" } as const;
const STATUS_TONES = {
  valid: "status-correct",
  invalid: "status-wrong",
  duplicate: "status-neutral",
} as const;

export function VocabularyImport({ lessons, initialLessonId }: VocabularyImportProps) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(
    lessons.some((lesson) => lesson.id === initialLessonId)
      ? initialLessonId
      : (lessons[0]?.id ?? ""),
  );
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState("");
  const [message, setMessage] = useState<{ tone: string; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const lesson = lessons.find((item) => item.id === lessonId);
  const preview = text.trim() ? parseVocabularyCsv(text, lesson?.vocab ?? []) : null;
  const validCount = preview?.rows.filter((row) => row.status === "valid").length ?? 0;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) {
      return;
    }
    try {
      setText(decodeCsvFile(await file.arrayBuffer()));
    } catch {
      setFileError(
        "Không đọc được file. Trong Excel chọn File → Save As → “CSV UTF-8 (Comma delimited)”, tối đa 200 KB.",
      );
    }
  }

  function handleImport() {
    if (!lesson) {
      return;
    }
    startTransition(async () => {
      let outcome;
      try {
        outcome = await importVocabularyAction({
          lessonId: lesson.id,
          revision: lesson.revision,
          text,
        });
      } catch (error) {
        unstable_rethrow(error);
        setMessage({
          tone: "error-text",
          text: "Chưa gửi được tới máy chủ (mất mạng hoặc trang vừa được cập nhật). Bảng từ vẫn còn, bạn thử lại.",
        });
        return;
      }
      if (outcome.status === "saved") {
        setMessage({ tone: "form-notice", text: `Đã thêm ${outcome.added} từ vào bản nháp.` });
        setText("");
        router.refresh();
        return;
      }
      if (outcome.status === "conflict") {
        setMessage({
          tone: "error-text",
          text: "Bài vừa được sửa ở nơi khác. Tải lại trang rồi nhập lại; dữ liệu dán vẫn ở đây.",
        });
        return;
      }
      setMessage({ tone: "error-text", text: outcome.message });
    });
  }

  if (!lessons.length) {
    return (
      <p>
        Chưa có bài nào thuộc tài khoản này. <Link href="/teach/lessons/new">Tạo bài mới</Link>{" "}
        trước.
      </p>
    );
  }

  return (
    <div>
      <div className="form-card">
        <div className="field">
          <label htmlFor="import-lesson">Thêm vào bài</label>
          <select
            id="import-lesson"
            value={lessonId}
            onChange={(event) => setLessonId(event.target.value)}
          >
            {lessons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.vocab.length} từ)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="import-file">File CSV UTF-8</label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            onChange={handleFile}
          />
          {fileError && (
            <p role="alert" className="error-text">
              {fileError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="import-text">
            Hoặc dán bảng từ Excel/Google Sheets (kèm dòng tiêu đề)
          </label>
          <textarea
            id="import-text"
            lang="ja"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <p className="small muted">
            Cột bắt buộc: jp (kana), romaji, vi; tùy chọn: kanji, note.{" "}
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`}
              download="reng-tu-vung.csv"
            >
              Tải file mẫu
            </a>
          </p>
        </div>
      </div>
      {preview?.error && (
        <p role="alert" className="error-text">
          {preview.error}
        </p>
      )}
      {preview && !preview.error && (
        <section className="section-block" aria-labelledby="import-preview">
          <h2 id="import-preview">
            Xem trước: {validCount} từ hợp lệ / {preview.rows.length} dòng
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Dòng</th>
                <th scope="col">jp</th>
                <th scope="col">kanji</th>
                <th scope="col">romaji</th>
                <th scope="col">vi</th>
                <th scope="col">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.line}>
                  <td data-label="Dòng">{row.line}</td>
                  <td data-label="jp" lang="ja">
                    {row.values.jp}
                  </td>
                  <td data-label="kanji" lang="ja">
                    {row.values.kanji}
                  </td>
                  <td data-label="romaji">{row.values.romaji}</td>
                  <td data-label="vi">{row.values.vi}</td>
                  <td>
                    <span className={`status-badge ${STATUS_TONES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>{" "}
                    <span className="small">{row.problems.join("; ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {message && (
        <p role="status" className={message.tone}>
          {message.text}{" "}
          {message.tone === "form-notice" && lesson && (
            <Link href={`/teach/lessons/${lesson.id}/edit`}>Mở editor để thêm vào slide</Link>
          )}
        </p>
      )}
      <Button disabled={isPending || validCount === 0} onClick={handleImport}>
        {isPending ? "Đang thêm…" : `Thêm ${validCount} từ vào bản nháp`}
      </Button>
    </div>
  );
}
