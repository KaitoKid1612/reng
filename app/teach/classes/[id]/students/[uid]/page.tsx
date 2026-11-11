import { cache } from "react";
import Link from "next/link";

import { describeAssignmentKind, describeDue } from "@/components/classroom/assignment-labels";
import { PassageDetails } from "@/components/classroom/passage-details";
import { JlptHistory } from "@/components/classroom/jlpt-history";
import { DailyDayChips } from "@/components/daily-history/daily-day-chips";
import { DailyScoreChart } from "@/components/daily-history/daily-score-chart";
import { DailyStatTiles } from "@/components/daily-history/daily-stat-tiles";
import { FuriganaText } from "@/components/lessons/japanese-text";
import { AcceptAnswerForm, AcceptNoticeArea } from "@/components/teach/accept-answer-form";
import { RemoveStudentButton } from "@/components/teach/remove-student-button";
import { OutcomeFilter } from "@/components/ui/outcome-filter";
import {
  ANSWER_OUTCOME_LABELS,
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  parseAnswerOutcome,
} from "@/lib/answer-outcome";
import { isTypedQuestion } from "@/lib/answer-variants";
import { answerLang, isHandedInAtDeadline } from "@/lib/assignment";
import { LEARNER_LABELS } from "@/lib/class-report";
import { formatDecimal, formatPercent } from "@/lib/grading/grade";
import { summarizeJlptHistory } from "@/lib/jlpt-history";
import { getCurrentAccount, requireTeacher } from "@/lib/server/account";
import { loadOrNotFound } from "@/lib/server/pages";
import { getStudentDetail } from "@/lib/server/reports";
import { formatStudyDateTime, toStudyDay } from "@/lib/study-days";

import type { DailyDay } from "@/lib/daily-history";
import type { Metadata } from "next";

// Request-scoped, so the tab title and the page share one read.
const loadDetail = cache((teacherId: string, id: string, uid: string) =>
  getStudentDetail(teacherId, id, uid, new Date()),
);

export async function generateMetadata({ params }: StudentDetailPageProps): Promise<Metadata> {
  const { id, uid } = await params;
  const account = await getCurrentAccount();
  if (account?.role === "teacher") {
    try {
      const detail = await loadDetail(account.id, id, uid);
      return {
        title: `${detail.member.full_name || detail.member.email} · ${detail.classRow.name}`,
      };
    } catch {
      // Not the class owner: the generic title reveals nothing.
    }
  }
  return { title: "Chi tiết học viên" };
}

// An attempt the morning job handed in at the deadline says so, so the teacher does not read
// a half-finished attempt as the learner's own submission.
function describeSubmittedAt(submittedAt: string, isLate: boolean | null, dueAt: string | null) {
  if (isHandedInAtDeadline(submittedAt, dueAt)) {
    return `, Reng tự nộp lúc hết hạn ${formatStudyDateTime(submittedAt)} (học viên chưa bấm Nộp)`;
  }
  return `, nộp lúc ${formatStudyDateTime(submittedAt)}${isLate ? " (muộn)" : ""}`;
}

interface StudentDetailPageProps {
  params: Promise<{ id: string; uid: string }>;
  searchParams: Promise<{ outcome?: string; day?: string | string[] }>;
}

export default async function StudentDetailPage({ params, searchParams }: StudentDetailPageProps) {
  const { id, uid } = await params;
  const query = await searchParams;
  const outcome = parseAnswerOutcome(query.outcome);
  const path = `/teach/classes/${id}/students/${uid}`;
  const account = await requireTeacher(path);
  const now = new Date();
  const detail = await loadOrNotFound(loadDetail(account.id, id, uid));
  const selectedDay = detail.dailyDays.find((day) => day.date === query.day);
  // Without a filter only the chosen day's assignment, or else the newest graded one, is open;
  // with a filter every assignment that has matching answers opens so they read in one pass.
  const openIndex = selectedDay
    ? detail.rows.findIndex((row) => row.assignment.id === selectedDay.assignmentId)
    : detail.rows.findIndex((row) => row.items.length > 0);
  // A day opens its assignment below, where the answers already are.
  const hrefForDay = (day: DailyDay) => `${path}?day=${day.date}#assignment-${day.assignmentId}`;
  // The teacher sees each handed-in mock exam at once, like the answers below.
  const jlptHistory = summarizeJlptHistory(
    detail.rows.flatMap(({ assignment, latest, items }) =>
      assignment.exam && latest?.submittedAt && items.length
        ? [
            {
              assignmentId: assignment.id,
              title: assignment.title,
              level: assignment.exam.level,
              submittedAt: latest.submittedAt,
              items,
            },
          ]
        : [],
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{detail.member.full_name || detail.member.email}</h1>
          <p>
            <Link href={`/teach/classes/${detail.classRow.id}`}>{detail.classRow.name}</Link>,{" "}
            {detail.member.email}
            {detail.hasLeft ? ", đã rời lớp" : ""}
          </p>
        </div>
        <span className="status-badge status-neutral">{LEARNER_LABELS[detail.report.label]}</span>
      </div>
      <p>
        Đã nộp {detail.report.submittedCount}/{detail.report.assignedCount} bài, điểm trung bình{" "}
        {detail.report.averagePercent === null ? "—" : formatPercent(detail.report.averagePercent)}
        {detail.report.averageListens !== null &&
          `, nghe trung bình ${formatDecimal(detail.report.averageListens)} lần mỗi câu nghe`}
        .
      </p>
      {detail.dailyDays.length > 0 && (
        <section className="section-block" aria-labelledby="student-daily">
          <h2 id="student-daily">Luyện tập hằng ngày</h2>
          <DailyStatTiles days={detail.dailyDays} today={toStudyDay(now)} />
          <section className="chart-panel" aria-labelledby="student-daily-chart">
            <h3 id="student-daily-chart">Điểm theo ngày</h3>
            <p className="small muted">Bấm vào cột hoặc ô ngày để mở câu trả lời của ngày đó.</p>
            <DailyScoreChart
              days={detail.dailyDays}
              selectedDate={selectedDay?.date}
              hrefForDay={hrefForDay}
            />
          </section>
          <DailyDayChips
            days={detail.dailyDays}
            selectedDate={selectedDay?.date}
            hrefForDay={hrefForDay}
            monthHeadingLevel={3}
          />
        </section>
      )}
      {jlptHistory.length > 0 && (
        <JlptHistory
          entries={jlptHistory}
          hrefFor={(entry) => `#assignment-${entry.assignmentId}`}
          now={now}
        />
      )}
      <section className="section-block" aria-labelledby="student-answers">
        <h2 id="student-answers">Bài đã giao và câu trả lời</h2>
        <AcceptNoticeArea>
          <OutcomeFilter
            path={path}
            outcome={outcome}
            counts={countOutcomes(detail.rows.flatMap((row) => row.items))}
          />
          <p className="small muted">
            Bộ lọc áp dụng cho mọi bài, chỉ tính lượt nộp mới nhất. Bấm tên bài để mở hoặc thu gọn.
          </p>
          {detail.rows.map((row, rowIndex) => {
            const counts = countOutcomes(row.items);
            const visible = numberAnswers(row.items).filter(({ item }) =>
              matchesOutcome(item.isCorrect, outcome),
            );
            return (
              <details
                key={row.assignment.id}
                id={`assignment-${row.assignment.id}`}
                className="collapse-card student-assignment"
                open={outcome ? visible.length > 0 : rowIndex === openIndex}
              >
                <summary>
                  <span>{row.assignment.title}</span>
                  <span className="item-meta">
                    {row.items.length ? `${counts.wrong} sai / ${counts.all} câu` : "chưa nộp"}
                  </span>
                </summary>
                <div className="student-assignment-body">
                  <p className="item-meta">
                    {describeAssignmentKind(row.assignment)}, {describeDue(row.assignment.dueAt)},{" "}
                    {row.attemptCount} lượt
                    {row.latest?.submittedAt
                      ? describeSubmittedAt(
                          row.latest.submittedAt,
                          row.latest.isLate,
                          row.assignment.dueAt,
                        )
                      : ", chưa nộp"}
                    {row.percent !== null ? `, ${formatPercent(row.percent)}` : ""}
                  </p>
                  <p className="small">
                    <Link href={`/teach/assignments/${row.assignment.id}`}>
                      Đề sai hoặc khó đọc? Sửa lỗi hiển thị bài này
                    </Link>
                  </p>
                  {outcome && row.items.length > 0 && !visible.length && (
                    <p className="muted">
                      Không có câu {ANSWER_OUTCOME_LABELS[outcome].toLowerCase()} trong bài này.
                    </p>
                  )}
                  {visible.map(({ item, number }) => (
                    <div key={item.view.id} className="result-row" data-correct={item.isCorrect}>
                      <p className="result-row-meta">
                        <span
                          className={`status-badge ${item.isCorrect ? "status-correct" : "status-wrong"}`}
                        >
                          {item.isCorrect ? "Đúng" : "Sai"}
                        </span>{" "}
                        Câu {number}
                        {item.listenCount !== null && ` · nghe ${item.listenCount} lần`}
                      </p>
                      <PassageDetails passage={item.view.passage} lang={item.view.lang} />
                      <p lang={item.view.lang} className="result-row-prompt">
                        <FuriganaText text={item.view.prompt} />
                      </p>
                      <p>
                        Trả lời:{" "}
                        <strong lang={answerLang(item.view)}>
                          {item.answerText ? <FuriganaText text={item.answerText} /> : "(bỏ trống)"}
                        </strong>
                      </p>
                      {!item.isCorrect && (
                        <p>
                          Đáp án:{" "}
                          <strong lang={answerLang(item.view)}>
                            <FuriganaText text={item.correctText} />
                          </strong>
                        </p>
                      )}
                      {!item.isCorrect && item.answerText && isTypedQuestion(item.view) && (
                        <AcceptAnswerForm
                          classId={detail.classRow.id}
                          studentId={uid}
                          assignmentId={row.assignment.id}
                          questionId={item.view.id}
                          questionNumber={number}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </AcceptNoticeArea>
      </section>
      {!detail.classRow.self_study && (
        <section className="section-block" aria-labelledby="student-membership">
          <h2 id="student-membership">Thành viên lớp</h2>
          {detail.hasLeft ? (
            <p className="muted">
              Học viên đã rời lớp. Điểm và bài đã nộp vẫn giữ ở đây; nếu còn mã lớp, học viên vào
              lại được. Muốn chặn thì đổi mã lớp ở trang lớp.
            </p>
          ) : (
            <RemoveStudentButton classId={detail.classRow.id} studentId={uid} />
          )}
        </section>
      )}
    </>
  );
}
