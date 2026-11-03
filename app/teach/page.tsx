import { randomUUID } from "node:crypto";

import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { UpcomingSession } from "@/components/classroom/upcoming-session";
import { StartChecklist } from "@/components/teach/start-checklist";
import { LessonCopyForm } from "@/components/teach/lesson-copy-form";
import { buttonVariants } from "@/components/ui/button";
import { filterManagedLessons, parseLessonFilters } from "@/lib/lesson-management";
import { TEACHING_LANGUAGE_LABELS, teachingLanguageLabel } from "@/lib/teaching-language";
import { formatJoinCode } from "@/lib/join-code";
import { requireTeacher } from "@/lib/server/account";
import { listClassSchedules } from "@/lib/server/class-schedule";
import { getClassProgressFlags } from "@/lib/server/lesson-usage";
import { buildStartSteps, showsStartSteps } from "@/lib/teaching-start";
import { listOwnedLessons, listTeacherClasses } from "@/lib/server/classes";
import { findStarterForLesson } from "@/lib/starter-lessons";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giảng dạy" };

// With a handful of lessons the filter form would fill the first screen, so it starts folded.
const OPEN_FILTER_LESSONS = 6;

interface TeachPageProps {
  searchParams: Promise<{ q?: string; language?: string; status?: string }>;
}

export default async function TeachPage({ searchParams }: TeachPageProps) {
  const filters = parseLessonFilters(await searchParams);
  const account = await requireTeacher("/teach");
  const now = new Date();
  const [classes, lessons] = await Promise.all([
    listTeacherClasses(account.id),
    listOwnedLessons(account.id),
  ]);
  // A self-study class never takes learners, so the start steps look at teaching classes only.
  const teachingClasses = classes.filter((item) => !item.self_study && item.active);
  const [schedules, flags] = await Promise.all([
    listClassSchedules(classes.map((item) => item.id)),
    getClassProgressFlags(teachingClasses.map((item) => item.id)),
  ]);
  const firstClass = teachingClasses[0];
  const firstLesson = lessons[0];
  const firstPublished = lessons.find((lesson) => lesson.publishedVersionId) ?? firstLesson;
  const classPath = firstClass ? `/teach/classes/${firstClass.id}` : "/teach/classes";
  const progress = {
    classCount: teachingClasses.length,
    lessonCount: lessons.length,
    publishedLessonCount: lessons.filter((lesson) => lesson.publishedVersionId).length,
    hasClassLesson: flags.hasClassLesson,
    hasLearner: teachingClasses.some((item) => item.memberCount > 0),
    hasSchedule: teachingClasses.some((item) => (schedules.get(item.id)?.slots.length ?? 0) > 0),
    hasAssignment: flags.hasAssignment,
  };
  const startSteps = buildStartSteps(progress, {
    newClass: "/teach/classes",
    newLesson: "/teach/lessons/new",
    lesson: firstLesson ? `/teach/lessons/${firstLesson.id}/edit` : "/teach/lessons/new",
    classContent: firstPublished
      ? `/teach/lessons/${firstPublished.id}/edit`
      : "/teach/lessons/new",
    invite: firstClass ? `${classPath}#join-code` : classPath,
    schedule: firstClass ? `${classPath}#class-schedule` : classPath,
    assign: firstClass ? `${classPath}/assign` : classPath,
  });
  const visibleLessons = filterManagedLessons(lessons, filters);
  const hasActiveFilter =
    filters.query !== "" || filters.language !== "all" || filters.status !== "all";
  const isFilterOpen = hasActiveFilter || lessons.length > OPEN_FILTER_LESSONS;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giảng dạy</h1>
          <p>Xin chào {account.fullName || account.email}.</p>
        </div>
        <div className="button-row">
          <Link href="/teach/classes" className={buttonVariants()}>
            Tạo lớp
          </Link>
          <Link href="/teach/lessons/new" className={buttonVariants({ variant: "outline" })}>
            Tạo bài mới
          </Link>
          <Link href="/teach/library" className={buttonVariants({ variant: "outline" })}>
            Bài được chia sẻ
          </Link>
        </div>
      </div>
      {showsStartSteps(progress, startSteps) && <StartChecklist steps={startSteps} />}
      <section className="section-block" aria-labelledby="teacher-classes">
        <h2 id="teacher-classes">Lớp của tôi</h2>
        {classes.length ? (
          <ul className="item-list">
            {classes.map((item) => (
              <li key={item.id}>
                <div>
                  <h3>
                    <Link href={`/teach/classes/${item.id}`}>{item.name}</Link>
                  </h3>
                  <p className="item-meta">
                    {teachingLanguageLabel(item.language_tag)},{" "}
                    {item.self_study ? "lớp tự học của bạn" : `${item.memberCount} học viên`}
                    {!item.self_study &&
                      (item.join_enabled
                        ? `, mã ${formatJoinCode(item.join_code)}`
                        : ", ngừng nhận")}
                    {item.active ? "" : ", đã lưu trữ"}
                  </p>
                  <UpcomingSession slots={schedules.get(item.id)?.slots ?? []} now={now} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Chưa có lớp nào. <Link href="/teach/classes">Tạo lớp đầu tiên</Link> rồi gửi mã cho học
            viên.
          </p>
        )}
      </section>
      <section className="section-block" aria-labelledby="teacher-lessons">
        <h2 id="teacher-lessons">Bài học tôi sở hữu</h2>
        <p className="small">
          <Link href="/teach/import-csv">Nhập từ vựng tiếng Nhật từ CSV/Excel</Link>
        </p>
        {lessons.length > 0 && (
          <details className="help-disclosure lesson-filter" open={isFilterOpen}>
            <summary>Lọc bài học</summary>
            <form
              key={`${filters.query}:${filters.language}:${filters.status}`}
              action="/teach"
              method="get"
              className="form-card"
            >
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="lesson-search">Tìm bài học theo tên</label>
                  <input
                    id="lesson-search"
                    name="q"
                    type="search"
                    maxLength={160}
                    defaultValue={filters.query}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lesson-language-filter">Ngôn ngữ bài học</label>
                  <select
                    id="lesson-language-filter"
                    name="language"
                    defaultValue={filters.language}
                  >
                    <option value="all">Tất cả ngôn ngữ</option>
                    {Object.entries(TEACHING_LANGUAGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="lesson-status-filter">Trạng thái bài học</label>
                  <select id="lesson-status-filter" name="status" defaultValue={filters.status}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="draft">Chỉ có bản nháp</option>
                    <option value="published">Đã có bản xuất bản</option>
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button type="submit" className={buttonVariants({ variant: "outline" })}>
                  Lọc bài học
                </button>
                <Link href="/teach">Xóa bộ lọc</Link>
              </div>
            </form>
            <p className="small muted">
              Lọc ngôn ngữ theo bản soạn hiện tại. Bản xuất bản và bài đã giao giữ nguyên nội dung
              của phiên bản đã chọn; xuất bản lại không tự cập nhật lớp.
            </p>
          </details>
        )}
        {isFilterOpen && (
          <p role="status" className="small muted">
            Hiển thị {visibleLessons.length} / {lessons.length} bài học.
          </p>
        )}
        {visibleLessons.length ? (
          <ul className="item-list">
            {visibleLessons.map((lesson) => (
              <li key={lesson.id}>
                <div>
                  <h3>{lesson.title}</h3>
                  <p className="item-meta">
                    Bản soạn: {teachingLanguageLabel(lesson.languageTag)} ·{" "}
                    {lesson.publishedVersionId ? "Đã có bản xuất bản" : "Chỉ có bản nháp"} ·{" "}
                    {lesson.versions.length} phiên bản, mới nhất số{" "}
                    {lesson.versions[0]?.version_no ?? "—"}
                  </p>
                  {lesson.copyAttribution && <p className="item-meta">{lesson.copyAttribution}</p>}
                </div>
                <div className="button-row">
                  <Link href={`/teach/lessons/${lesson.id}/edit`}>Soạn bài</Link>
                  {lesson.publishedVersionId && (
                    <Link
                      href={`/lessons/${lesson.id}/slide?version=${lesson.publishedVersionId}#1`}
                    >
                      Trình chiếu
                    </Link>
                  )}
                  {!lesson.copyAttribution && (
                    <Link href={`/teach/lessons/${lesson.id}/sharing`}>Chia sẻ</Link>
                  )}
                  {findStarterForLesson(lesson.creationFingerprint) && (
                    <Link href={`/teach/lessons/${lesson.id}/starter`}>Cập nhật từ mẫu</Link>
                  )}
                  <LessonCopyForm
                    source={{ kind: "own", lessonId: lesson.id }}
                    requestId={randomUUID()}
                    label="Tạo bản sao"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {lessons.length
              ? "Không có bài phù hợp bộ lọc. Thử đổi điều kiện hoặc xóa bộ lọc."
              : "Chưa có bài nào. Chọn Tạo bài mới để soạn bài của bạn."}
          </p>
        )}
      </section>
      <div className="button-row">
        <Link href="/history" className={buttonVariants({ variant: "ghost" })}>
          Lịch sử học tập của tôi và học viên
        </Link>
        <Link href="/settings/notifications" className={buttonVariants({ variant: "ghost" })}>
          Email tóm tắt lớp
        </Link>
        <Link href="/classes" className={buttonVariants({ variant: "ghost" })}>
          Lớp tôi đang học
        </Link>
        <Link href="/guide#teacher-title" className={buttonVariants({ variant: "ghost" })}>
          Hướng dẫn sử dụng
        </Link>
        <Link href="/settings/account" className={buttonVariants({ variant: "ghost" })}>
          Tài khoản
        </Link>
        <SignOutButton />
      </div>
    </>
  );
}
