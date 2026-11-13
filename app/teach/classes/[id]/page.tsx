import { cache } from "react";
import Link from "next/link";

import { ClassAssignmentList } from "@/components/teach/class-assignment-list";
import { ClassLessonList } from "@/components/teach/class-lesson-list";
import { ClassScheduleForm } from "@/components/teach/class-schedule-form";
import { ClassSectionNav } from "@/components/teach/class-section-nav";
import { ClassSessionForm } from "@/components/teach/class-session-form";
import { ClassSessionList } from "@/components/teach/class-session-list";
import { ClassSettingsForm } from "@/components/teach/class-settings-form";
import { ClassStatTiles } from "@/components/teach/class-stat-tiles";
import { ClassStudentTable } from "@/components/teach/class-student-table";
import { CopyMessageButton } from "@/components/teach/copy-message-button";
import { DailyJlptCoverage } from "@/components/teach/daily-jlpt-coverage";
import { DailyPracticeForm } from "@/components/teach/daily-practice-form";
import { DailyPracticeStatus } from "@/components/teach/daily-practice-status";
import { HardQuestionList } from "@/components/teach/hard-question-list";
import { JoinCodeControls } from "@/components/teach/join-code-controls";
import { StartChecklist } from "@/components/teach/start-checklist";
import { TeachingPanel } from "@/components/teach/teaching-panel";
import { buttonVariants } from "@/components/ui/button";
import { classQuestionLang } from "@/lib/assignment";
import { buildAssignmentMessage } from "@/lib/assignment-message";
import { describeUpcomingSession } from "@/lib/class-schedule";
import { parseSessionPrefill } from "@/lib/class-sessions";
import { toVietnamDate } from "@/lib/daily-practice";
import { dailyFormatLevel, describeJlptDailyCoverage } from "@/lib/jlpt-parts";
import { getCurrentAccount, requireTeacher } from "@/lib/server/account";
import { getClassSchedule } from "@/lib/server/class-schedule";
import { listClassSessions } from "@/lib/server/class-sessions";
import { findDailyPracticeSource } from "@/lib/server/daily-practice";
import { loadOrNotFound } from "@/lib/server/pages";
import { getClassReport, HARD_QUESTION_ASSIGNMENTS } from "@/lib/server/reports";
import { absoluteUrl } from "@/lib/site";

import type { ClassReportAssignment } from "@/lib/server/reports";
import type { Metadata } from "next";

// Request-scoped, so the tab title and the page share one read of the report.
const loadReport = cache((teacherId: string, id: string) =>
  getClassReport(teacherId, id, new Date()),
);

export async function generateMetadata({ params }: ClassReportPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (account?.role === "teacher") {
    try {
      return { title: `${(await loadReport(account.id, id)).classRow.name} · Theo dõi lớp` };
    } catch {
      // Not the class owner: the generic title reveals nothing.
    }
  }
  return { title: "Theo dõi lớp" };
}

interface ClassReportPageProps {
  params: Promise<{ id: string }>;
  // Set by the "Ghi buổi dạy" link on the slides.
  searchParams: Promise<{ lesson?: string; slide?: string; assigned?: string }>;
}

interface ClassSectionOptions {
  hasJoinCode: boolean;
  hasLearners: boolean;
  isSelfStudy: boolean;
}

// The sections in page order; the join code sits at the top until the first learner joins.
function listClassSections({ hasJoinCode, hasLearners, isSelfStudy }: ClassSectionOptions) {
  const joinCode = { id: "join-code", label: "Mã lớp" };
  return [
    ...(hasJoinCode && !hasLearners ? [joinCode] : []),
    { id: "students-title", label: "Học viên" },
    { id: "hard-questions", label: "Câu sai nhiều" },
    { id: "daily-practice-title", label: "Luyện hằng ngày" },
    { id: "assignments-title", label: "Bài đã giao" },
    { id: "class-schedule", label: "Lịch học" },
    ...(isSelfStudy ? [] : [{ id: "class-sessions", label: "Nhật ký buổi dạy" }]),
    { id: "class-content", label: "Nội dung lớp" },
    ...(hasJoinCode && hasLearners ? [joinCode] : []),
    { id: "class-settings", label: "Cài đặt lớp" },
  ];
}

export default async function ClassReportPage({ params, searchParams }: ClassReportPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/classes/${id}`);
  const now = new Date();
  const report = await loadOrNotFound(loadReport(account.id, id));
  const { classRow, summary, week } = report;
  const query = await searchParams;
  const prefill = parseSessionPrefill(
    query,
    report.lessons.map((lesson) => lesson.lessonId),
  );
  const justAssigned = report.assignments.find((assignment) => assignment.id === query.assigned);
  const messageFor = (assignment: ClassReportAssignment) =>
    classRow.self_study
      ? null
      : buildAssignmentMessage({
          className: classRow.name,
          title: assignment.title,
          mode: assignment.mode,
          dueAt: assignment.dueAt,
          allowLate: assignment.allowLate,
          url: absoluteUrl(`/assignments/${assignment.id}`),
          exam: assignment.exam,
        });
  const justAssignedMessage = justAssigned ? messageFor(justAssigned) : null;
  const assignmentItems = report.assignments.map((assignment) => ({
    assignment,
    message: messageFor(assignment),
  }));
  // The source lookup reads question lists, so it only runs while daily practice is on.
  const [sessions, dailySource, schedule] = await Promise.all([
    classRow.self_study ? [] : listClassSessions(classRow.id),
    classRow.daily_practice_size
      ? findDailyPracticeSource(classRow.id, classRow.daily_practice_lesson_id, now)
      : null,
    getClassSchedule(classRow.id),
  ]);
  const nextSessionText = describeUpcomingSession(schedule.slots, now);
  const dailyLevel = dailyFormatLevel(classRow.daily_practice_format);
  const jlptCoverage =
    dailyLevel && classRow.daily_practice_size && dailySource?.status === "found"
      ? describeJlptDailyCoverage(
          dailyLevel,
          classRow.daily_practice_size,
          classRow.daily_listening_count,
          dailySource.questions,
        )
      : null;
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
      <ClassSectionNav
        sections={listClassSections({
          hasJoinCode: joinCodeControls !== null,
          hasLearners,
          isSelfStudy: classRow.self_study,
        })}
      />
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
      <ClassStatTiles week={week} summary={summary} />
      <section className="section-block" aria-labelledby="students-title">
        <h2 id="students-title">Học viên</h2>
        <ClassStudentTable
          classId={classRow.id}
          reports={report.reports}
          formerMemberCount={report.formerMemberCount}
        />
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
            {dailyLevel && jlptCoverage && (
              <DailyJlptCoverage level={dailyLevel} rows={jlptCoverage} />
            )}
          </div>
        )}
        <DailyPracticeForm
          classId={classRow.id}
          size={classRow.daily_practice_size}
          format={classRow.daily_practice_format}
          listeningCount={classRow.daily_listening_count}
          availableListeningCount={
            dailySource?.status === "found"
              ? dailySource.questions.filter(
                  (question) => question.type === "listen" || question.type === "dictation",
                ).length
              : null
          }
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
            <li>
              Chọn “Theo cấu trúc đề JLPT” thì mỗi もんだい lấy đúng số câu của đề thật theo thứ tự
              đề, phần nghe ở cuối. Chọn 67 câu (N4) hoặc 53 câu (N5) để có đủ phần chữ, ngữ pháp,
              đọc của một đề cùng 10 câu nghe.
            </li>
            <li>Nộp muộn vẫn được, tối đa 3 lượt; học viên xem giải thích ngay sau khi nộp.</li>
            <li>Câu sai vào sổ lỗi và lịch ôn tập của học viên.</li>
          </ul>
        </details>
      </section>
      <section className="section-block" aria-labelledby="assignments-title">
        <h2 id="assignments-title">Bài đã giao</h2>
        {justAssigned && (
          <div className="notice-panel">
            <p role="status">
              Đã giao «{justAssigned.title}». Học viên thấy bài ở mục Hôm nay học gì và trang lớp.
            </p>
            {justAssignedMessage && <CopyMessageButton message={justAssignedMessage} />}
          </div>
        )}
        <ClassAssignmentList classId={classRow.id} items={assignmentItems} />
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
          <ClassSessionList
            classId={classRow.id}
            sessions={sessions}
            members={report.reports.map(({ member }) => ({
              userId: member.userId,
              fullName: member.fullName,
              joinedAt: member.joinedAt,
            }))}
          />
        </section>
      )}
      <section className="section-block" aria-labelledby="class-content">
        <h2 id="class-content">Nội dung lớp</h2>
        <p className="small">
          <Link href={`/teach/classes/${classRow.id}/assign#class-content-title`}>
            Thêm bài hoặc đổi phiên bản, lịch mở
          </Link>
        </p>
        <ClassLessonList classId={classRow.id} lessons={report.lessons} />
      </section>
      {hasLearners && joinCodeControls}
      <section className="section-block" aria-labelledby="class-settings">
        <h2 id="class-settings">Cài đặt lớp</h2>
        <ClassSettingsForm classRow={classRow} />
      </section>
    </>
  );
}
