import Link from "next/link";

import { ResultRow } from "@/components/classroom/result-row";
import { DailyDayChips } from "@/components/daily-history/daily-day-chips";
import { DailyScoreChart } from "@/components/daily-history/daily-score-chart";
import { DailyStatTiles } from "@/components/daily-history/daily-stat-tiles";
import { buttonVariants } from "@/components/ui/button";
import { OutcomeFilter } from "@/components/ui/outcome-filter";
import {
  countOutcomes,
  matchesOutcome,
  numberAnswers,
  parseAnswerOutcome,
} from "@/lib/answer-outcome";
import { getDeadlineState } from "@/lib/assignment";
import { neighbourDays, pickDailyDay, scoreBand } from "@/lib/daily-history";
import { formatPercent, toPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getStudentResults } from "@/lib/server/assignments";
import { getLearnerDailyHistory } from "@/lib/server/daily-history";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime, formatStudyDay } from "@/lib/study-days";

import type { AnswerOutcome } from "@/lib/answer-outcome";
import type { DailyDay } from "@/lib/daily-history";
import type { StudentResultsView } from "@/lib/server/assignments";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Luyện tập hằng ngày" };

interface DailyPracticePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string | string[]; outcome?: string | string[] }>;
}

interface DayStepsProps {
  days: readonly DailyDay[];
  day: DailyDay;
  hrefForDay: (day: DailyDay) => string;
}

interface DayResultProps {
  day: DailyDay;
  view: StudentResultsView;
  path: string;
  outcome: AnswerOutcome | undefined;
  now: Date;
}

function shortDate(date: string) {
  return formatStudyDay(date).slice(0, 5);
}

// Step to the next day from the day itself, so a learner reading day by day stays here.
function DaySteps({ days, day, hrefForDay }: DayStepsProps) {
  const { older, newer } = neighbourDays(days, day.date);
  if (!older && !newer) {
    return null;
  }
  return (
    <nav className="day-steps" aria-label="Chuyển ngày">
      {older && (
        <Link href={hrefForDay(older)} prefetch={false}>
          ‹ Ngày trước ({shortDate(older.date)})
        </Link>
      )}
      {newer && (
        <Link href={hrefForDay(newer)} prefetch={false}>
          Ngày sau ({shortDate(newer.date)}) ›
        </Link>
      )}
    </nav>
  );
}

function DayResult({ day, view, path, outcome, now }: DayResultProps) {
  const { assignment, attempt } = view;
  const isOpen =
    assignment.status === "published" &&
    getDeadlineState(assignment.dueAt, assignment.allowLate, now) !== "past_due";
  const canStart = isOpen && !view.hasOpenAttempt && view.attemptsUsed < assignment.maxAttempts;
  const workHref = `/assignments/${assignment.id}`;
  if (!attempt) {
    return (
      <div className="form-card">
        <p>
          {view.hasOpenAttempt
            ? "Bạn đang làm dở bài của ngày này, chưa nộp."
            : "Bạn chưa làm bài của ngày này."}
        </p>
        {isOpen && (view.hasOpenAttempt || canStart) ? (
          <Link href={workHref} className={buttonVariants()}>
            {view.hasOpenAttempt ? "Làm tiếp" : "Làm bài"}
          </Link>
        ) : (
          <p className="muted">Bài đã đóng nên không nộp thêm được.</p>
        )}
      </div>
    );
  }
  const submittedAt = formatStudyDateTime(attempt.submittedAt ?? attempt.savedAt);
  if (!view.isFeedbackAvailable || attempt.score === null || !attempt.maxScore) {
    return (
      <div className="form-card" role="status">
        <p>
          Đã nộp lúc {submittedAt}
          {attempt.isLate ? " (nộp muộn)" : ""}. Điểm và đáp án sẽ công bố sau{" "}
          {assignment.dueAt ? formatStudyDateTime(assignment.dueAt) : "hạn nộp"}.
        </p>
      </div>
    );
  }
  const percent = toPercent(attempt.score, attempt.maxScore);
  const counts = countOutcomes(view.items);
  const blank = view.items.filter((item) => !item.answerText).length;
  const visible = numberAnswers(view.items).filter(({ item }) =>
    matchesOutcome(item.isCorrect, outcome),
  );
  return (
    <>
      <div className="form-card">
        <p className="day-score">
          <span className="score-band-dot" data-band={scoreBand(percent)} aria-hidden="true" />
          <strong>{formatPercent(percent)}</strong>
          <span className="muted">
            ({attempt.score}/{attempt.maxScore} điểm)
          </span>
          {attempt.passed ? (
            <span className="status-badge status-correct">Đạt</span>
          ) : (
            <span className="status-badge status-wrong">Chưa đạt</span>
          )}
        </p>
        <dl className="day-figures">
          <div>
            <dt>Tổng câu</dt>
            <dd>{counts.all}</dd>
          </div>
          <div>
            <dt>Đúng</dt>
            <dd>{counts.correct}</dd>
          </div>
          <div>
            <dt>Sai</dt>
            <dd>{counts.wrong}</dd>
            {blank > 0 && <dd className="day-figure-note">gồm {blank} câu bỏ trống</dd>}
          </div>
        </dl>
        <p className="small muted">
          Lượt {attempt.attemptNo}/{assignment.maxAttempts}, nộp lúc {submittedAt}
          {attempt.isLate ? " (nộp muộn)" : ""}.
        </p>
        {canStart && (
          <Link href={workHref} className={buttonVariants({ variant: "outline" })}>
            Làm lượt mới
          </Link>
        )}
      </div>
      <h3>Từng câu</h3>
      <OutcomeFilter path={`${path}?day=${day.date}`} outcome={outcome} counts={counts} />
      <p role="status" className="small muted">
        Hiển thị {visible.length} / {view.items.length} câu.
      </p>
      {visible.map(({ item, number }) => (
        <ResultRow key={item.view.id} item={item} number={number} />
      ))}
    </>
  );
}

export default async function DailyPracticePage({ params, searchParams }: DailyPracticePageProps) {
  const { id } = await params;
  const query = await searchParams;
  const path = `/classes/${id}/daily-practice`;
  const account = await requireStudent(path);
  const now = new Date();
  const history = await loadOrNotFound(getLearnerDailyHistory(account.id, id, now));
  const { days } = history;
  const day = pickDailyDay(days, typeof query.day === "string" ? query.day : undefined);
  const outcome = parseAnswerOutcome(query.outcome);
  const view = day
    ? await loadOrNotFound(getStudentResults(account.id, day.assignmentId, now))
    : null;
  const hrefForDay = (item: DailyDay) => `${path}?day=${item.date}#daily-day`;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Luyện tập hằng ngày</h1>
          <p>
            <Link href={`/classes/${history.classRow.id}`}>{history.classRow.name}</Link>, điểm từng
            ngày từ khi bạn vào lớp
          </p>
        </div>
      </div>
      {!day || !view ? (
        <p className="muted">
          Lớp chưa có bài luyện tập hằng ngày nào. Khi giáo viên bật luyện tập hằng ngày, mỗi sáng
          lớp nhận một bài và điểm của từng ngày sẽ hiện ở đây.
        </p>
      ) : (
        <>
          <section className="section-block" aria-labelledby="daily-overview">
            <h2 id="daily-overview">Tổng quan</h2>
            <DailyStatTiles days={days} today={history.today} />
            <section className="chart-panel" aria-labelledby="daily-chart">
              <h3 id="daily-chart">Điểm theo ngày</h3>
              <p className="small muted">Bấm vào cột để mở ngày đó.</p>
              <DailyScoreChart days={days} selectedDate={day.date} hrefForDay={hrefForDay} />
            </section>
          </section>
          <nav className="section-block" aria-labelledby="daily-day-nav">
            <h2 id="daily-day-nav">Chọn ngày</h2>
            <DailyDayChips
              days={days}
              selectedDate={day.date}
              hrefForDay={hrefForDay}
              monthHeadingLevel={3}
            />
          </nav>
          <section id="daily-day" className="section-block" aria-labelledby="daily-day-title">
            <div className="day-heading">
              <h2 id="daily-day-title">Ngày {formatStudyDay(day.date)}</h2>
              <DaySteps days={days} day={day} hrefForDay={hrefForDay} />
            </div>
            <p className="item-meta day-assignment">
              <Link href={`/assignments/${day.assignmentId}${day.submitted ? "/results" : ""}`}>
                {day.title}
              </Link>
            </p>
            <DayResult day={day} view={view} path={path} outcome={outcome} now={now} />
          </section>
        </>
      )}
    </>
  );
}
