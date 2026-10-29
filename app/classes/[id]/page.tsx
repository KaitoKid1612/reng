import Link from "next/link";

import {
  AssignmentStatusBadge,
  describeDue,
  MODE_LABELS,
} from "@/components/classroom/assignment-labels";
import { formatPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getStudentClassView } from "@/lib/server/learner";
import { loadOrNotFound } from "@/lib/server/pages";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lớp học" };

interface ClassPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassPage({ params }: ClassPageProps) {
  const { id } = await params;
  const account = await requireStudent(`/classes/${id}`);
  const view = await loadOrNotFound(getStudentClassView(account.id, id, new Date()));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{view.classRow.name}</h1>
          <p>
            <Link href="/classes">Lớp của tôi</Link>
          </p>
        </div>
      </div>
      {view.classRow.meeting_url && (
        <section className="section-block">
          <h2>Buổi học online</h2>
          <a href={view.classRow.meeting_url} target="_blank" rel="noopener noreferrer">
            Vào Google Meet
          </a>
        </section>
      )}
      <section className="section-block" aria-labelledby="class-lessons">
        <h2 id="class-lessons">Bài học đã mở</h2>
        {view.lessons.length ? (
          <ul className="item-list">
            {view.lessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <div>
                  <h3>
                    {lesson.orderNo}. {lesson.title}
                  </h3>
                  <p className="item-meta">Phiên bản {lesson.versionNo}</p>
                </div>
                <div className="button-row">
                  <Link href={`/lessons/${lesson.lessonId}?version=${lesson.versionId}`}>
                    Đọc bài
                  </Link>
                  <Link href={`/vocabulary/${lesson.lessonId}`}>Flashcard</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Giảng viên chưa mở bài học nào cho lớp.</p>
        )}
        {view.upcomingLessonCount > 0 && (
          <p className="small muted">{view.upcomingLessonCount} bài sẽ mở theo lịch của lớp.</p>
        )}
      </section>
      <section className="section-block" aria-labelledby="class-assignments">
        <h2 id="class-assignments">Bài tập</h2>
        {view.assignments.length ? (
          <ul className="item-list">
            {view.assignments.map((item) => (
              <li key={item.assignment.id}>
                <div>
                  <h3>
                    <Link href={`/assignments/${item.assignment.id}`}>{item.assignment.title}</Link>
                  </h3>
                  <p className="item-meta">
                    {MODE_LABELS[item.assignment.mode]}, {describeDue(item.assignment.dueAt)}
                    {item.latestPercent !== null && `, điểm ${formatPercent(item.latestPercent)}`}
                  </p>
                </div>
                <AssignmentStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Chưa có bài tập nào được giao.</p>
        )}
      </section>
    </>
  );
}
