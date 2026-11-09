import Link from "next/link";

import { AssignmentForm } from "@/components/teach/assignment-form";
import { ClassLessonForm } from "@/components/teach/class-lesson-form";
import { JlptExamForm } from "@/components/teach/jlpt-exam-form";
import { PinVersionButton } from "@/components/teach/pin-version-button";
import { countJlptSections, examTitle } from "@/lib/jlpt";
import { requireTeacher } from "@/lib/server/account";
import { listAssignablePracticeQuestions } from "@/lib/server/assignments";
import { getTeacherClass, listClassLessons, listOwnedLessons } from "@/lib/server/classes";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime, shiftStudyDay, toStudyDay } from "@/lib/study-days";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Giao bài" };

interface AssignPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssignPage({ params }: AssignPageProps) {
  const { id } = await params;
  const account = await requireTeacher(`/teach/classes/${id}/assign`);
  const classRow = await loadOrNotFound(getTeacherClass(account.id, id));
  const [ownedLessons, classLessons] = await Promise.all([
    listOwnedLessons(account.id),
    listClassLessons(classRow.id),
  ]);
  // A lesson published again (for example with listening questions added) only offers its new
  // questions once the class uses that version, so the newer version is pointed out here.
  const latestVersionNo = new Map(
    ownedLessons.map((lesson) => [
      lesson.id,
      lesson.versions.find((version) => version.id === lesson.publishedVersionId)?.version_no ??
        null,
    ]),
  );
  const newerVersion = (lesson: { lessonId: string; versionNo: number }) => {
    const latest = latestVersionNo.get(lesson.lessonId) ?? null;
    return latest !== null && latest > lesson.versionNo ? latest : null;
  };
  const assignableLessons = await Promise.all(
    classLessons.map(async (lesson) => {
      const questions = await listAssignablePracticeQuestions(classRow.id, lesson.lessonId);
      return {
        lessonId: lesson.lessonId,
        title: lesson.title,
        versionNo: lesson.versionNo,
        newerVersionNo: newerVersion(lesson),
        questions: questions.map((question) => ({
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          points: question.points,
        })),
        jlptSections: countJlptSections(questions),
      };
    }),
  );
  const now = new Date();
  // A mock exam stays open a week by default, until 23:59 Vietnam time.
  const examDueAt = new Date(`${shiftStudyDay(toStudyDay(now), 7)}T23:59:00+07:00`).toISOString();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giao bài: {classRow.name}</h1>
          <p>
            <Link href={`/teach/classes/${classRow.id}`}>Theo dõi lớp</Link>
            {classRow.language_tag === "ja-JP" && (
              <>
                {" · "}
                <a href="#jlpt-exam-title">Tạo đề thi thử JLPT</a>
              </>
            )}
          </p>
        </div>
      </div>
      <section className="section-block" aria-labelledby="class-content-title">
        <h2 id="class-content-title">Nội dung lớp</h2>
        {classLessons.length > 0 && (
          <ul className="item-list">
            {classLessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <div>
                  <span>
                    {lesson.orderNo}. {lesson.title} (phiên bản {lesson.versionNo})
                  </span>
                  <span className="item-meta">
                    {" "}
                    Mở từ {formatStudyDateTime(lesson.availableAt)}
                    {newerVersion(lesson) !== null &&
                      ` · đã có phiên bản ${newerVersion(lesson)}, lớp chưa dùng`}
                  </span>
                </div>
                {newerVersion(lesson) !== null && (
                  <PinVersionButton
                    classId={classRow.id}
                    className={classRow.name}
                    lessonId={lesson.lessonId}
                    label={`Cập nhật lớp lên phiên bản ${newerVersion(lesson)}`}
                    isPrimary
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <ClassLessonForm
          classId={classRow.id}
          lessons={ownedLessons}
          classLessons={classLessons}
          classLanguageTag={classRow.language_tag}
          nextOrderNo={Math.max(0, ...classLessons.map((lesson) => lesson.orderNo)) + 1}
          defaultAvailableAt={new Date().toISOString()}
        />
      </section>
      <section className="section-block" aria-labelledby="new-assignment-title">
        <h2 id="new-assignment-title">Giao bài tập</h2>
        <AssignmentForm
          classId={classRow.id}
          classPassScore={classRow.pass_score}
          languageTag={classRow.language_tag}
          lessons={assignableLessons}
        />
      </section>
      {classRow.language_tag === "ja-JP" && (
        <section className="section-block" aria-labelledby="jlpt-exam-title">
          <h2 id="jlpt-exam-title">Thi thử JLPT</h2>
          <p className="small muted">
            Reng lấy câu từ ngân hàng ôn của lớp theo ba phần như đề thật (chữ Hán – từ vựng, ngữ
            pháp – đọc hiểu, nghe hiểu), một lượt làm có giới hạn thời gian; kết quả có điểm từng
            phần và ước tính đỗ/trượt trên thang 180.
          </p>
          <JlptExamForm
            classId={classRow.id}
            lessons={assignableLessons
              .filter((lesson) => lesson.questions.length > 0)
              .map((lesson) => ({
                lessonId: lesson.lessonId,
                title: lesson.title,
                sections: lesson.jlptSections,
              }))}
            defaultDueAt={examDueAt}
            defaultTitles={{ N5: examTitle("N5", now), N4: examTitle("N4", now) }}
          />
        </section>
      )}
    </>
  );
}
