import Link from "next/link";

import {
  AssignmentStatusBadge,
  describeDue,
  MODE_LABELS,
} from "@/components/classroom/assignment-labels";
import { buttonVariants } from "@/components/ui/button";
import { formatPercent } from "@/lib/grading/grade";
import { requireStudent } from "@/lib/server/account";
import { getStudentClassView } from "@/lib/server/learner";
import { loadOrNotFound } from "@/lib/server/pages";

import type { LearnerAssignment } from "@/lib/server/learner";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lớp học" };

interface ClassPageProps {
  params: Promise<{ id: string }>;
}

// A daily set arrives every morning, so finished work folds away after the newest few.
const RECENT_DONE_ASSIGNMENTS = 5;

function isOpenWork(item: LearnerAssignment) {
  return item.status === "not_started" || item.status === "in_progress";
}

interface LearnerAssignmentItemProps {
  item: LearnerAssignment;
  isFirst?: boolean;
}

function LearnerAssignmentItem({ item, isFirst = false }: LearnerAssignmentItemProps) {
  const path = `/assignments/${item.assignment.id}`;
  return (
    <li>
      <div>
        <h3>
          <Link href={path}>{item.assignment.title}</Link>
        </h3>
        <p className="item-meta">
          {MODE_LABELS[item.assignment.mode]}, {describeDue(item.assignment.dueAt)}
          {item.latestPercent !== null && `, điểm ${formatPercent(item.latestPercent)}`}
        </p>
      </div>
      <div className="button-row item-actions">
        <AssignmentStatusBadge status={item.status} />
        {isOpenWork(item) && (
          <Link
            href={path}
            className={buttonVariants({ variant: isFirst ? "default" : "outline" })}
          >
            {item.status === "in_progress" ? "Làm tiếp" : "Làm bài"}
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function ClassPage({ params }: ClassPageProps) {
  const { id } = await params;
  const account = await requireStudent(`/classes/${id}`);
  const view = await loadOrNotFound(getStudentClassView(account.id, id, new Date()));
  const openWork = view.assignments.filter(isOpenWork);
  const otherWork = view.assignments.filter((item) => !isOpenWork(item));
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
          <a
            href={view.classRow.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            Vào Google Meet
          </a>
        </section>
      )}
      <section className="section-block" aria-labelledby="class-assignments">
        <h2 id="class-assignments">Bài tập cần làm</h2>
        {openWork.length ? (
          <ul className="item-list">
            {openWork.map((item, index) => (
              <LearnerAssignmentItem key={item.assignment.id} item={item} isFirst={index === 0} />
            ))}
          </ul>
        ) : (
          <p className="muted">
            {view.assignments.length
              ? "Bạn đã làm hết bài đang mở. Ôn lại câu sai trong sổ lỗi nhé."
              : "Chưa có bài tập nào được giao."}
          </p>
        )}
      </section>
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
                </div>
                <div className="button-row">
                  <Link href={`/lessons/${lesson.lessonId}?version=${lesson.versionId}`}>
                    Đọc bài
                  </Link>
                  <Link href={`/vocabulary/${lesson.lessonId}`}>Flashcard</Link>
                  {view.classRow.language_tag === "ja-JP" && (
                    <Link href={`/kanji/${lesson.lessonId}?version=${lesson.versionId}`}>
                      Luyện kanji
                    </Link>
                  )}
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
      {otherWork.length > 0 && (
        <section className="section-block" aria-labelledby="done-assignments">
          <h2 id="done-assignments">Bài đã làm và bài khác</h2>
          <ul className="item-list">
            {otherWork.slice(0, RECENT_DONE_ASSIGNMENTS).map((item) => (
              <LearnerAssignmentItem key={item.assignment.id} item={item} />
            ))}
          </ul>
          {otherWork.length > RECENT_DONE_ASSIGNMENTS && (
            <details className="older-assignments">
              <summary>Bài cũ hơn ({otherWork.length - RECENT_DONE_ASSIGNMENTS})</summary>
              <ul className="item-list">
                {otherWork.slice(RECENT_DONE_ASSIGNMENTS).map((item) => (
                  <LearnerAssignmentItem key={item.assignment.id} item={item} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </>
  );
}
