import Link from "next/link";

import { HistoryDayNav } from "@/components/history/history-day-nav";
import { HistoryOverview } from "@/components/history/history-overview";
import {
  HISTORY_OUTCOME_LABELS,
  historyDates,
  historyOutcomeSchema,
  historyScoreLabel,
} from "@/lib/learning-history";
import {
  countHistoryOutcomes,
  formatPercentValue,
  historyDayScores,
  scoreBand,
  sessionScorePercent,
} from "@/lib/learning-history-stats";
import { formatStudyDateTime, formatStudyDay } from "@/lib/study-days";

import type { ReactNode } from "react";
import type { HistoryArchive, HistoryOutcome, HistorySession } from "@/lib/learning-history";

interface HistoryArchiveViewProps {
  id: string;
  archive: HistoryArchive;
  importedAt: string;
  query: { date?: string; outcome?: string };
  children?: ReactNode;
}

interface HistorySessionCardProps {
  session: HistorySession;
  summariesTab: string;
}

const OUTCOME_TONES: Record<HistoryOutcome, string> = {
  correct: "status-correct",
  incorrect: "status-wrong",
  ungraded: "status-attention",
  unknown: "status-attention",
  unanswered: "status-neutral",
  excluded: "status-neutral",
};

function historyHref(id: string, date?: string, outcome?: HistoryOutcome) {
  const params = new URLSearchParams();
  if (date) {
    params.set("date", date);
  }
  if (outcome) {
    params.set("outcome", outcome);
  }
  const search = params.toString();
  return search ? `/history/${id}?${search}` : `/history/${id}`;
}

function HistorySessionCard({ session, summariesTab }: HistorySessionCardProps) {
  const percent = sessionScorePercent(session);
  // Blank source cells are left out instead of being shown as zero.
  const figures = [
    ["Tổng câu", session.total],
    ["Đã làm", session.completed],
    ["Đúng", session.correct],
    ["Sai", session.incorrect],
    ["Chưa làm", session.unanswered],
  ].filter((figure): figure is [string, number] => figure[1] !== null);
  return (
    <article className="form-card history-session">
      <h3>{session.title}</h3>
      <p className="history-session-score">
        <span className="history-band-dot" data-band={scoreBand(percent)} aria-hidden="true" />
        <strong>Điểm gốc: {historyScoreLabel(session)}</strong>
        {percent !== null && session.scoreScale !== 100 && (
          <span className="muted"> ({formatPercentValue(percent)})</span>
        )}
      </p>
      {figures.length > 0 && (
        <dl className="history-session-figures">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {session.gradedAtText && <p className="small muted">Ghi nhận chấm: {session.gradedAtText}</p>}
      <p className="small muted">
        Dòng tổng hợp gốc: {summariesTab} · {session.sourceRow}
      </p>
    </article>
  );
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
  const parsedOutcome = historyOutcomeSchema.safeParse(query.outcome);
  const outcome = parsedOutcome.success ? parsedOutcome.data : undefined;
  const answers = archive.answers.filter((answer) => answer.date === selectedDate);
  const visibleAnswers = answers.filter((answer) => !outcome || answer.outcome === outcome);
  const sessions = archive.sessions.filter((session) => session.date === selectedDate);
  const outcomeCounts = countHistoryOutcomes(answers);
  // The active filter stays visible even when the chosen day has no such answers.
  const filterOutcomes = historyOutcomeSchema.options.filter(
    (item) => outcomeCounts[item] > 0 || item === outcome,
  );
  const days = historyDayScores(archive);
  const hrefForDate = (date: string) => historyHref(id, date, outcome);
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
      <HistoryOverview
        archive={archive}
        days={days}
        selectedDate={selectedDate}
        hrefForDate={hrefForDate}
      />
      <p className="notice-panel">
        Điểm và nhận xét bên dưới là bản lưu từ Sheet, chưa được Reng chấm lại. Ngày chưa có điểm
        giữ trống. Dòng trùng mã vẫn được giữ theo vị trí nguồn để đối chiếu.
      </p>
      <HistoryDayNav days={days} selectedDate={selectedDate} hrefForDate={hrefForDate} />
      <section id="history-day" className="section-block" aria-labelledby="history-summary">
        <h2 id="history-summary">
          Tổng hợp ngày {selectedDate ? formatStudyDay(selectedDate) : "—"}
        </h2>
        {sessions.length ? (
          sessions.map((session) => (
            <HistorySessionCard
              key={session.sourceRow}
              session={session}
              summariesTab={archive.sourceTabs.summaries}
            />
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
        {/* Filters keep the scroll position: they sit directly above the answers they change. */}
        <nav className="history-filter" aria-label="Lọc câu theo kết quả">
          <Link
            href={historyHref(id, selectedDate)}
            aria-current={outcome ? undefined : "true"}
            prefetch={false}
            scroll={false}
          >
            Tất cả <span className="history-filter-count">{answers.length}</span>
          </Link>
          {filterOutcomes.map((item) => (
            <Link
              key={item}
              href={historyHref(id, selectedDate, item)}
              aria-current={item === outcome ? "true" : undefined}
              prefetch={false}
              scroll={false}
            >
              {HISTORY_OUTCOME_LABELS[item]}{" "}
              <span className="history-filter-count">{outcomeCounts[item]}</span>
            </Link>
          ))}
        </nav>
        <p role="status">
          Hiển thị {visibleAnswers.length} / {answers.length} câu của ngày đã chọn.
        </p>
        {visibleAnswers.map((answer) => (
          <details key={answer.sourceRow} className="form-card history-answer">
            <summary>
              <span className={`status-badge ${OUTCOME_TONES[answer.outcome]}`}>
                {HISTORY_OUTCOME_LABELS[answer.outcome]}
              </span>{" "}
              Câu {answer.number || "—"} · {answer.lesson}
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
