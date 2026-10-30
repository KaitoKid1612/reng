import Link from "next/link";

import {
  HISTORY_OUTCOME_LABELS,
  historyDates,
  historyOutcomeSchema,
  historyScoreLabel,
} from "@/lib/learning-history";
import { formatStudyDateTime } from "@/lib/study-days";

import type { ReactNode } from "react";
import type { HistoryArchive } from "@/lib/learning-history";

interface HistoryArchiveViewProps {
  id: string;
  archive: HistoryArchive;
  importedAt: string;
  query: { date?: string; outcome?: string };
  children?: ReactNode;
}

export function HistoryArchiveView({
  id,
  archive,
  importedAt,
  query,
  children,
}: HistoryArchiveViewProps) {
  const dates = historyDates(archive);
  const selectedDate = query.date && dates.includes(query.date) ? query.date : dates[0];
  const outcome = historyOutcomeSchema.safeParse(query.outcome);
  const answers = archive.answers.filter((answer) => answer.date === selectedDate);
  const visibleAnswers = answers.filter(
    (answer) => !outcome.success || answer.outcome === outcome.data,
  );
  const sessions = archive.sessions.filter((session) => session.date === selectedDate);
  const displayDate = (value: string) => value.split("-").reverse().join("/");
  return (
    <>
      <div className="page-heading">
        <div>
          <p>
            <Link href="/history">Lịch sử học tập</Link>
          </p>
          <h1>
            {archive.learnerName} — {archive.course}
          </h1>
          <p>
            {archive.sourceLabel}. Nhập lúc {formatStudyDateTime(importedAt)}.
          </p>
        </div>
      </div>
      {children}
      <p className="notice-panel">
        Điểm và nhận xét bên dưới là bản lưu từ Sheet, chưa được Reng chấm lại. Ngày chưa có điểm
        giữ trống. Dòng trùng mã vẫn được giữ theo vị trí nguồn để đối chiếu.
      </p>
      <form
        key={`${selectedDate}:${query.outcome}`}
        action={`/history/${id}`}
        method="get"
        className="form-card"
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="history-date">Ngày học</label>
            <select id="history-date" name="date" defaultValue={selectedDate}>
              {dates.map((date) => (
                <option key={date} value={date}>
                  {displayDate(date)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="history-outcome">Kết quả câu</label>
            <select
              id="history-outcome"
              name="outcome"
              defaultValue={outcome.success ? outcome.data : "all"}
            >
              <option value="all">Tất cả kết quả</option>
              {Object.entries(HISTORY_OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="button button-outline">
          Xem ngày đã chọn
        </button>
      </form>
      <section className="section-block" aria-labelledby="history-summary">
        <h2 id="history-summary">Tổng hợp ngày {selectedDate ? displayDate(selectedDate) : "—"}</h2>
        {sessions.length ? (
          sessions.map((session) => (
            <article key={session.sourceRow} className="form-card">
              <h3>{session.title}</h3>
              <p>
                <strong>Điểm gốc: {historyScoreLabel(session)}</strong>
              </p>
              <p>
                Tổng câu: {session.total ?? "—"} · Đã làm: {session.completed ?? "—"} · Đúng:{" "}
                {session.correct ?? "—"} · Sai: {session.incorrect ?? "—"} · Chưa làm:{" "}
                {session.unanswered ?? "—"}
              </p>
              {session.gradedAtText && (
                <p className="small muted">Ghi nhận chấm: {session.gradedAtText}</p>
              )}
              <p className="small muted">
                Dòng tổng hợp gốc: {archive.sourceTabs.summaries} · {session.sourceRow}
              </p>
            </article>
          ))
        ) : (
          <p>Ngày này chưa có dòng tổng hợp trong Sheet.</p>
        )}
        <p className="small muted">
          Tổng hợp và câu chi tiết lấy từ hai tab khác nhau nên có thể chưa khớp; Reng giữ nguyên cả
          hai để đối chiếu.
        </p>
      </section>
      <section className="section-block" aria-labelledby="history-answers">
        <h2 id="history-answers">Câu đã giao và câu trả lời</h2>
        <p role="status">
          Hiển thị {visibleAnswers.length} / {answers.length} câu của ngày đã chọn.
        </p>
        {visibleAnswers.map((answer) => (
          <details key={answer.sourceRow} className="form-card history-answer">
            <summary>
              Câu {answer.number || "—"} · {answer.lesson} ·{" "}
              {HISTORY_OUTCOME_LABELS[answer.outcome]}
            </summary>
            <p className="small muted">
              {answer.kind}
              {answer.sourceId ? ` · Mã ${answer.sourceId}` : ""} · Dòng nguồn{" "}
              {archive.sourceTabs.answers} · {answer.sourceRow}
            </p>
            <p className="history-text">
              <strong>Đề bài: </strong>
              {answer.prompt}
            </p>
            <p className="history-text">
              <strong>Trả lời: </strong>
              {answer.response || "(để trống)"}
            </p>
            <p className="history-text">
              <strong>Kết quả gốc: </strong>
              {answer.resultText || "(chưa ghi kết quả)"}
            </p>
            {answer.note && (
              <p className="history-text">
                <strong>Nhận xét: </strong>
                {answer.note}
              </p>
            )}
            {answer.gradedAtText && <p className="small muted">Chấm lúc: {answer.gradedAtText}</p>}
          </details>
        ))}
        {!visibleAnswers.length && (
          <p className="muted">Không có câu phù hợp ngày và kết quả đã chọn.</p>
        )}
      </section>
    </>
  );
}
