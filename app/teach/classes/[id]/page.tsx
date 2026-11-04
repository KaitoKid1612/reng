import Link from "next/link";

import { describeDue, MODE_LABELS } from "@/components/classroom/assignment-labels";
import { ClassScheduleForm } from "@/components/teach/class-schedule-form";
import { ClassSessionForm } from "@/components/teach/class-session-form";
import { ClassSessionList } from "@/components/teach/class-session-list";
import { ClassSettingsForm } from "@/components/teach/class-settings-form";
import { CloseAssignmentButton } from "@/components/teach/close-assignment-button";
import { DailyPracticeForm } from "@/components/teach/daily-practice-form";
import { DailyPracticeStatus } from "@/components/teach/daily-practice-status";
import { HardQuestionList } from "@/components/teach/hard-question-list";
import { JoinCodeControls } from "@/components/teach/join-code-controls";
import { StartChecklist } from "@/components/teach/start-checklist";
import { TeachingPanel } from "@/components/teach/teaching-panel";
import { buttonVariants } from "@/components/ui/button";
import { classQuestionLang } from "@/lib/assignment";
import { LEARNER_LABELS } from "@/lib/class-report";
import { parseSessionPrefill, slidePresenterPath } from "@/lib/class-sessions";
import { toVietnamDate } from "@/lib/daily-practice";
import { formatDecimal, formatPercent } from "@/lib/grading/grade";
import { requireTeacher } from "@/lib/server/account";
import { describeUpcomingSession } from "@/lib/class-schedule";
import { getClassSchedule } from "@/lib/server/class-schedule";
import { listClassSessions } from "@/lib/server/class-sessions";
import { findDailyPracticeSource } from "@/lib/server/daily-practice";
import { loadOrNotFound } from "@/lib/server/pages";
import { getClassReport, HARD_QUESTION_ASSIGNMENTS } from "@/lib/server/reports";
import { absoluteUrl } from "@/lib/site";
import { formatStudyDateTime, formatStudyDay } from "@/lib/study-days";

import type { AssignmentResult, LearnerLabel } from "@/lib/class-report";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Theo dõi lớp" };

interface ClassReportPageProps {
  params: Promise<{ id: string }>;
  // Set by the "Ghi buổi dạy" link on the slides.
  searchParams: Promise<{ lesson?: string; slide?: string; assigned?: string }>;
}

const LABEL_TONES: Record<LearnerLabel, string> = {
  abandoned: "status-wrong",
  failing: "status-wrong",
  weak_listening: "status-attention",
  passing: "status-correct",
  no_data: "status-neutral",
};

interface AssignmentResultLineProps {
  result: AssignmentResult;
}

// Current members only, latest attempt each, so it can differ from the raw submission count.
function AssignmentResultLine({ result }: AssignmentResultLineProps) {
  const submitted = `${result.submittedCount}/${result.assignedCount} học viên đã nộp`;
  if (result.averagePercent === null) {
    return <p className="item-meta">Chưa có điểm · {submitted}</p>;
  }
  return (
    <div className="score-meter-row">
      <span className="score-meter" aria-hidden="true">
        <span style={{ width: `${result.averagePercent}%` }} />
      </span>
      <span className="item-meta">
        Điểm TB {formatPercent(result.averagePercent)} · {submitted}
      </span>
    </div>
  );
}

type ReportAssignment = Awaited<ReturnType<typeof getClassReport>>["assignments"][number];

// A daily set arrives every morning; the newest stay in view and older ones fold away.
const RECENT_ASSIGNMENTS = 5;

interface AssignmentItemProps {
  classId: string;
  assignment: ReportAssignment;
}

interface MissingLearnersProps {
  classId: string;
  learners: ReportAssignment["missing"];
}

// A few names are enough to message the learners; the rest are counted.
const MISSING_NAMES = 5;

function MissingLearners({ classId, learners }: MissingLearnersProps) {
  const shown = learners.slice(0, MISSING_NAMES);
  return (
    <p className="small missing-learners">
      Chưa nộp:{" "}
      {shown.map((learner, index) => (
        <span key={learner.userId}>
          {index > 0 && ", "}
          <Link href={`/teach/classes/${classId}/students/${learner.userId}`}>{learner.name}</Link>
        </span>
      ))}
      {learners.length > shown.length && ` và ${learners.length - shown.length} học viên khác`}
    </p>
  );
}

function AssignmentItem({ classId, assignment }: AssignmentItemProps) {
  return (
    <li>
      <div>
        <h3>{assignment.title}</h3>
        <p className="item-meta">
          {MODE_LABELS[assignment.mode]}, {describeDue(assignment.dueAt)},{" "}
          {assignment.submittedCount} bài nộp, {assignment.openAttemptCount} đang làm
          {assignment.status === "closed" ? ", đã đóng" : ""}
        </p>
        {assignment.result && assignment.result.assignedCount > 0 && (
          <AssignmentResultLine result={assignment.result} />
        )}
        {assignment.missing.length > 0 && (
          <MissingLearners classId={classId} learners={assignment.missing} />
        )}
      </div>
      {assignment.status === "published" && (
        <CloseAssignmentButton
          assignmentId={assignment.id}
          openAttemptCount={assignment.openAttemptCount}
        />
      )}
    </li>
  );
}

export default async function ClassReportPage({ params, searchParams }: ClassReportPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/classes/${id}`);
  const now = new Date();
  const report = await loadOrNotFound(getClassReport(account.id, id, now));
  const { classRow, summary, week } = report;
  const query = await searchParams;
  const prefill = parseSessionPrefill(
    query,
    report.lessons.map((lesson) => lesson.lessonId),
  );
  const justAssigned = report.assignments.find((assignment) => assignment.id === query.assigned);
  // The source lookup reads question lists, so it only runs while daily practice is on.
  const [sessions, dailySource, schedule] = await Promise.all([
    classRow.self_study ? [] : listClassSessions(classRow.id),
    classRow.daily_practice_size
      ? findDailyPracticeSource(classRow.id, classRow.daily_practice_lesson_id, now)
      : null,
    getClassSchedule(classRow.id),
  ]);
  const nextSessionText = describeUpcomingSession(schedule.slots, now);
  const lessonTitle = (lessonId: string) =>
    report.lessons.find((lesson) => lesson.lessonId === lessonId)?.title ?? null;
  const openLessons = report.lessons
    .filter((lesson) => new Date(lesson.availableAt) <= now)
    .sort((first, second) => second.availableAt.localeCompare(first.availableAt));
  const latestSession = sessions[0];
  // A self-study class takes no codes, so it has no join controls.
  const joinCodeControls = classRow.self_study ? null : (
    <JoinCodeControls
      classId={classRow.id}
      joinCode={classRow.join_code}
      isEnabled={classRow.join_enabled}
      inviteUrl={absoluteUrl(`/join-class?code=${classRow.join_code}`)}
    />
  );
  // A class without learners needs its code first; afterwards the report comes first.
  const hasLearners = report.reports.length > 0;
  // A new class says what to set up next, in order, until everything is done.
  const setupSteps = [
    {
      label: "Đưa bài vào lớp",
      href: `/teach/classes/${classRow.id}/assign#class-content-title`,
      isDone: report.lessons.length > 0,
      hint: "Chọn bài đã xuất bản; học viên thấy bài từ giờ mở bạn đặt.",
    },
    {
      label: "Mời học viên",
      href: "#join-code",
      isDone: hasLearners,
      hint: "Sao chép link mời và gửi qua Zalo hoặc Messenger.",
    },
    {
      label: "Thêm link Google Meet",
      href: "#class-settings",
      isDone: Boolean(classRow.meeting_url),
      hint: "Học viên vào buổi học bằng một nút ở Hôm nay học gì.",
    },
    {
      label: "Đặt lịch học hằng tuần",
      href: "#class-schedule",
      isDone: schedule.slots.length > 0,
      hint: "Học viên thấy buổi tới ở trang lớp và ở Hôm nay học gì.",
    },
    {
      label: "Giao bài tập đầu tiên",
      href: `/teach/classes/${classRow.id}/assign#new-assignment-title`,
      isDone: report.assignments.length > 0,
      hint: "Bài luyện tập chấm ngay; câu sai vào sổ lỗi của học viên.",
    },
  ];
  // Meet and the timetable are optional, so a class already teaching is not nagged about them.
  const showsSetup =
    !classRow.self_study && (!report.lessons.length || !hasLearners || !report.assignments.length);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{classRow.name}</h1>
          <p>
            <Link href="/teach">Giảng dạy</Link>, điểm đạt của lớp {classRow.pass_score}%
            {classRow.active ? "" : ", lớp đã lưu trữ"}
          </p>
          {classRow.self_study && (
            <p>
              Lớp tự học: bạn là học viên duy nhất. Làm bài ở{" "}
              <Link href={`/classes/${classRow.id}`}>trang lớp dành cho học viên</Link>.
            </p>
          )}
        </div>
        <div className="button-row">
          <Link
            href={`/teach/classes/${classRow.id}/assign#new-assignment-title`}
            className={buttonVariants()}
          >
            Giao bài
          </Link>
          <a
            href={`/api/teach/classes/${classRow.id}/report`}
            className={buttonVariants({ variant: "outline" })}
            download
          >
            Xuất CSV
          </a>
          {hasLearners && joinCodeControls && (
            <Link href="#join-code" className={buttonVariants({ variant: "ghost" })}>
              Mời thêm học viên
            </Link>
          )}
        </div>
      </div>
      {showsSetup && <StartChecklist steps={setupSteps} title="Các bước tiếp theo cho lớp" />}
      {!hasLearners && joinCodeControls}
      {!classRow.self_study && (
        <TeachingPanel
          classId={classRow.id}
          meetingUrl={classRow.meeting_url}
          latestSession={latestSession}
          currentVersionId={
            report.lessons.find((lesson) => lesson.lessonId === latestSession?.lesson?.id)
              ?.versionId
          }
          nextSession={nextSessionText}
        />
      )}
      <div className="stat-tiles">
        <div className="stat-tile">
          <strong>{week.percent === null ? "—" : formatPercent(week.percent)}</strong>
          <span>nộp bài tuần này</span>
          <span className="stat-tile-detail">
            {week.expectedCount
              ? `${week.submittedCount}/${week.expectedCount} bài đến hạn từ thứ Hai`
              : "Chưa có bài đến hạn tuần này"}
          </span>
          <span className="stat-tile-detail">Tổng {summary.submittedCount} bài đã nộp</span>
        </div>
        <div className="stat-tile">
          <strong>
            {summary.averagePercent === null ? "—" : formatPercent(summary.averagePercent)}
          </strong>
          <span>điểm trung bình</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.passingCount}</strong>
          <span>học viên đạt</span>
        </div>
        <div className="stat-tile">
          <strong>{summary.attentionCount}</strong>
          <span>cần chú ý</span>
        </div>
      </div>
      <section className="section-block" aria-labelledby="students-title">
        <h2 id="students-title">Học viên</h2>
        {report.reports.length ? (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Học viên</th>
                <th scope="col" className="numeric">
                  Đã nộp
                </th>
                <th scope="col" className="numeric">
                  Điểm TB
                </th>
                <th scope="col" className="numeric">
                  Nghe lại TB
                </th>
                <th scope="col">Học gần nhất</th>
                <th scope="col">Nhãn</th>
              </tr>
            </thead>
            <tbody>
              {report.reports.map((row) => (
                <tr key={row.member.userId}>
                  <td>
                    <Link href={`/teach/classes/${classRow.id}/students/${row.member.userId}`}>
                      {row.member.fullName || row.member.email}
                    </Link>
                  </td>
                  <td className="numeric" data-label="Đã nộp">
                    {row.submittedCount}/{row.assignedCount}
                  </td>
                  <td className="numeric" data-label="Điểm TB">
                    {row.averagePercent === null ? "—" : formatPercent(row.averagePercent)}
                  </td>
                  <td className="numeric" data-label="Nghe lại TB">
                    {row.averageListens === null ? "—" : formatDecimal(row.averageListens)}
                  </td>
                  <td data-label="Học gần nhất">
                    {row.lastStudyDay ? formatStudyDay(row.lastStudyDay) : "—"}
                  </td>
                  <td>
                    <span className={`status-badge ${LABEL_TONES[row.label]}`}>
                      {LEARNER_LABELS[row.label]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Chưa có học viên. Gửi link mời hoặc mã lớp ở đầu trang để học viên tự vào lớp.</p>
        )}
        {report.formerMemberCount > 0 && (
          <p className="small muted">
            {report.formerMemberCount} học viên đã rời lớp không hiện ở đây.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="hard-questions">
        <h2 id="hard-questions">Câu cả lớp sai nhiều</h2>
        <p className="small muted">
          Từ 50% học viên trở lên sai, chỉ tính lượt nộp mới nhất của mỗi người; số bên phải là số
          học viên sai trên số học viên đã nộp. Bấm tên bài để mở hoặc thu gọn. Đây là tín hiệu để
          xem lại cách giảng, không phải kết luận nguyên nhân.
        </p>
        {report.questionStats.length ? (
          <HardQuestionList
            groups={report.questionStats}
            lang={classQuestionLang(classRow.language_tag)}
          />
        ) : (
          <p className="muted">Chưa có câu nào bị sai từ 50% trở lên.</p>
        )}
        {report.olderStatsCount > 0 && (
          <p className="small muted">
            Tính trên {HARD_QUESTION_ASSIGNMENTS} bài giao gần nhất có bài nộp;{" "}
            {report.olderStatsCount} bài cũ hơn xem ở trang từng học viên.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="daily-practice-title">
        <h2 id="daily-practice-title">Bài luyện hằng ngày</h2>
        <p className="small muted">
          Mỗi sáng từ 6:00 (giờ Việt Nam) Reng tự giao một bài luyện tập, hạn 23:59 cùng ngày.
        </p>
        {dailySource && (
          <div className="daily-practice-status">
            <DailyPracticeStatus
              size={classRow.daily_practice_size}
              pinnedLessonId={classRow.daily_practice_lesson_id}
              pinnedTitle={
                classRow.daily_practice_lesson_id
                  ? lessonTitle(classRow.daily_practice_lesson_id)
                  : null
              }
              source={
                dailySource.status === "found"
                  ? {
                      lessonId: dailySource.lessonId,
                      title: lessonTitle(dailySource.lessonId) ?? dailySource.lessonId,
                      questionCount: dailySource.questions.length,
                    }
                  : null
              }
            />
          </div>
        )}
        <DailyPracticeForm
          classId={classRow.id}
          size={classRow.daily_practice_size}
          lessonId={classRow.daily_practice_lesson_id}
          lessons={report.lessons.map((lesson) => ({
            lessonId: lesson.lessonId,
            title: lesson.title,
            isOpen: new Date(lesson.availableAt) <= now,
          }))}
        />
        <details className="help-disclosure">
          <summary>Cách Reng chọn câu mỗi ngày</summary>
          <ul>
            <li>
              Câu lấy từ bài bạn chọn, ví dụ ngân hàng ôn của lớp. Để Tự động thì Reng lấy bài mới
              nhất đã mở có câu chọn, điền hoặc sắp xếp.
            </li>
            <li>
              Câu đổi mỗi ngày, ưu tiên câu chưa giao trong 14 ngày gần đây (kể cả bài giao tay).
            </li>
            <li>
              Mỗi dạng câu giữ tỉ lệ như trong bài: theo tag của câu (ví dụ ngữ pháp, từ vựng, chữ
              Hán) và loại câu (chọn, điền, sắp xếp).
            </li>
            <li>Nộp muộn vẫn được, tối đa 3 lượt; học viên xem giải thích ngay sau khi nộp.</li>
            <li>Câu sai vào sổ lỗi và lịch ôn tập của học viên.</li>
          </ul>
        </details>
      </section>
      <section className="section-block" aria-labelledby="assignments-title">
        <h2 id="assignments-title">Bài đã giao</h2>
        {justAssigned && (
          <p className="notice-panel" role="status">
            Đã giao «{justAssigned.title}». Học viên thấy bài ở mục Hôm nay học gì và trang lớp.
          </p>
        )}
        {report.assignments.length ? (
          <>
            <ul className="item-list">
              {report.assignments.slice(0, RECENT_ASSIGNMENTS).map((assignment) => (
                <AssignmentItem key={assignment.id} classId={classRow.id} assignment={assignment} />
              ))}
            </ul>
            {report.assignments.length > RECENT_ASSIGNMENTS && (
              <details className="older-assignments">
                <summary>Bài cũ hơn ({report.assignments.length - RECENT_ASSIGNMENTS})</summary>
                <ul className="item-list">
                  {report.assignments.slice(RECENT_ASSIGNMENTS).map((assignment) => (
                    <AssignmentItem
                      key={assignment.id}
                      classId={classRow.id}
                      assignment={assignment}
                    />
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p>
            Chưa có bài tập nào.{" "}
            <Link href={`/teach/classes/${classRow.id}/assign#new-assignment-title`}>
              Giao bài đầu tiên
            </Link>
            .
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="class-schedule">
        <h2 id="class-schedule">Lịch học</h2>
        <p className="small muted">
          Giờ Việt Nam, lặp lại hằng tuần. Học viên thấy buổi tới ở trang lớp và ở Lớp của tôi.
        </p>
        <ClassScheduleForm classId={classRow.id} schedule={schedule} />
      </section>
      {!classRow.self_study && (
        <section className="section-block" aria-labelledby="class-sessions">
          <h2 id="class-sessions">Nhật ký buổi dạy</h2>
          <ClassSessionForm
            // A new prefill from the slides must replace the defaults of a form already shown.
            key={`${prefill?.lessonId ?? ""}:${prefill?.slide ?? ""}`}
            classId={classRow.id}
            languageTag={classRow.language_tag}
            today={toVietnamDate(now)}
            lessons={report.lessons.map((lesson) => ({
              lessonId: lesson.lessonId,
              title: lesson.title,
            }))}
            defaultLessonId={
              prefill?.lessonId ?? latestSession?.lesson?.id ?? openLessons[0]?.lessonId ?? ""
            }
            defaultSlide={prefill?.slide}
          />
          <ClassSessionList classId={classRow.id} sessions={sessions} />
        </section>
      )}
      <section className="section-block" aria-labelledby="class-content">
        <h2 id="class-content">Nội dung lớp</h2>
        <p className="small">
          <Link href={`/teach/classes/${classRow.id}/assign#class-content-title`}>
            Thêm bài hoặc đổi phiên bản, lịch mở
          </Link>
        </p>
        {report.lessons.length ? (
          <ul className="item-list">
            {report.lessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <div>
                  <span>
                    {lesson.orderNo}. {lesson.title} (phiên bản {lesson.versionNo})
                  </span>
                  <p className="item-meta">Mở từ {formatStudyDateTime(lesson.availableAt)}</p>
                </div>
                {/* The class's own version, which can differ from the newest published one. */}
                <div className="button-row">
                  <Link
                    href={slidePresenterPath(lesson.lessonId, lesson.versionId, 1, classRow.id)}
                  >
                    Trình chiếu
                  </Link>
                  <Link href={`/lessons/${lesson.lessonId}?version=${lesson.versionId}`}>
                    Đọc bài
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Chưa có bài học nào trong lớp; học viên chỉ thấy bài sau khi bạn thêm bài vào lớp.
          </p>
        )}
      </section>
      {hasLearners && joinCodeControls}
      <section className="section-block" aria-labelledby="class-settings">
        <h2 id="class-settings">Cài đặt lớp</h2>
        <ClassSettingsForm classRow={classRow} />
      </section>
    </>
  );
}
