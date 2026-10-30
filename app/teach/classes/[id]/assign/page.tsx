import Link from "next/link";

import { AssignmentForm } from "@/components/teach/assignment-form";
import { ClassLessonForm } from "@/components/teach/class-lesson-form";
import { requireTeacher } from "@/lib/server/account";
import { listAssignablePracticeQuestions } from "@/lib/server/assignments";
import { getTeacherClass, listClassLessons, listOwnedLessons } from "@/lib/server/classes";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

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
  const assignableLessons = await Promise.all(
    classLessons.map(async (lesson) => ({
      lessonId: lesson.lessonId,
      title: lesson.title,
      versionNo: lesson.versionNo,
      questions: (await listAssignablePracticeQuestions(classRow.id, lesson.lessonId)).map(
        (question) => ({
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          points: question.points,
        }),
      ),
    })),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Giao bài: {classRow.name}</h1>
          <p>
            <Link href={`/teach/classes/${classRow.id}`}>Theo dõi lớp</Link>
          </p>
        </div>
      </div>
      <section className="section-block" aria-labelledby="class-content-title">
        <h2 id="class-content-title">Nội dung lớp</h2>
        {classLessons.length > 0 && (
          <ul className="item-list">
            {classLessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <span>
                  {lesson.orderNo}. {lesson.title} (phiên bản {lesson.versionNo})
                </span>
                <span className="item-meta">Mở từ {formatStudyDateTime(lesson.availableAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <ClassLessonForm
          classId={classRow.id}
          lessons={ownedLessons}
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
    </>
  );
}
