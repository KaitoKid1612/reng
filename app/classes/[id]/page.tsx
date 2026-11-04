import Link from "next/link";

import {
  AssignmentStatusBadge,
  describeDue,
  describeOpenDue,
  MODE_LABELS,
} from "@/components/classroom/assignment-labels";
import { LeaveClassButton } from "@/components/classroom/leave-class-button";
import { buttonVariants } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { compareDueUrgency } from "@/lib/assignment";
import { describeSlot, describeUpcomingSession } from "@/lib/class-schedule";
import { formatPercent } from "@/lib/grading/grade";
import { foldMissedDailySets } from "@/lib/learner-today";
import { requireStudent } from "@/lib/server/account";
import { getClassSchedule } from "@/lib/server/class-schedule";
import { hasDailyRuns } from "@/lib/server/daily-history";
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
  now: Date;
  isFirst?: boolean;
}

function LearnerAssignmentItem({ item, now, isFirst = false }: LearnerAssignmentItemProps) {
  // Submitted work opens on its results; a new attempt is one more deliberate tap from there.
  const path =
    item.status === "submitted"
      ? `/assignments/${item.assignment.id}/results`
      : `/assignments/${item.assignment.id}`;
  return (
    <li>
      <div>
        <h3>
          <Link href={path}>{item.assignment.title}</Link>
        </h3>
        <p className="item-meta">
          {MODE_LABELS[item.assignment.mode]},{" "}
          {isOpenWork(item)
            ? describeOpenDue(item.assignment.dueAt, now)
            : describeDue(item.assignment.dueAt)}
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
            <LinkPending />
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function ClassPage({ params }: ClassPageProps) {
  const { id } = await params;
  const account = await requireStudent(`/classes/${id}`);
  const now = new Date();
  const view = await loadOrNotFound(getStudentClassView(account.id, id, now));
  // Membership was checked above, so the timetable is read only for a member.
  const [schedule, hasDaily] = await Promise.all([
    getClassSchedule(view.classRow.id),
    hasDailyRuns(view.classRow.id),
  ]);
  const nextSession = describeUpcomingSession(schedule.slots, now);
  const hasSessionInfo = Boolean(view.classRow.meeting_url || nextSession || schedule.note);
  // Same order as Lớp của tôi: on-time work by deadline, then late work, missed daily sets folded.
  const { listed: openWork, missed: missedDaily } = foldMissedDailySets(
    view.assignments
      .filter(isOpenWork)
      .toSorted((first, second) =>
        compareDueUrgency(first.assignment.dueAt, second.assignment.dueAt, now),
      ),
    view.dailyAssignmentIds,
    now,
  );
  const missedDailyCount = missedDaily.get(view.classRow.id) ?? 0;
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
        {hasDaily && (
          <Link
            href={`/classes/${view.classRow.id}/daily-practice`}
            className={buttonVariants({ variant: "outline" })}
          >
            Điểm luyện tập hằng ngày
          </Link>
        )}
      </div>
      {hasSessionInfo && (
        <section className="section-block" aria-labelledby="class-session-title">
          <h2 id="class-session-title">Buổi học online</h2>
          {nextSession && (
            <p>
              Buổi tới: <strong>{nextSession}</strong>
            </p>
          )}
          {schedule.slots.length > 0 && (
            <p className="small muted">
              Lịch hằng tuần: {schedule.slots.map(describeSlot).join(", ")}.
            </p>
          )}
          {schedule.note && <p className="small">{schedule.note}</p>}
          {view.classRow.meeting_url && (
            <a
              href={view.classRow.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants()}
            >
              Vào Google Meet
            </a>
          )}
        </section>
      )}
      <section className="section-block" aria-labelledby="class-assignments">
        <h2 id="class-assignments">Bài tập cần làm</h2>
        {openWork.length || missedDailyCount ? (
          <ul className="item-list">
            {openWork.map((item, index) => (
              <LearnerAssignmentItem
                key={item.assignment.id}
                item={item}
                now={now}
                isFirst={index === 0}
              />
            ))}
            {missedDailyCount > 0 && (
              <li>
                <div>
                  <h3>
                    <Link href={`/classes/${view.classRow.id}/daily-practice`}>
                      Luyện tập hằng ngày đã lỡ
                    </Link>
                  </h3>
                  <p className="item-meta">{missedDailyCount} ngày chưa làm, vẫn nộp muộn được</p>
                </div>
                <div className="button-row item-actions">
                  <Link
                    href={`/classes/${view.classRow.id}/daily-practice`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Xem các ngày
                  </Link>
                </div>
              </li>
            )}
          </ul>
        ) : (
          <p className="muted">
            {view.assignments.length ? (
              <>
                Bạn đã làm hết bài đang mở. Ôn lại câu sai trong{" "}
                <Link href="/mistakes">sổ lỗi</Link> nhé.
              </>
            ) : (
              "Chưa có bài tập nào được giao."
            )}
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
                  {lesson.hasVocab && (
                    <>
                      <Link href={`/vocabulary/${lesson.lessonId}?version=${lesson.versionId}`}>
                        Flashcard
                      </Link>
                      <Link href={`/kanji/${lesson.lessonId}?version=${lesson.versionId}`}>
                        {view.classRow.language_tag === "ja-JP" ? "Luyện kanji" : "Luyện chữ Hán"}
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Giáo viên chưa mở bài học nào cho lớp.</p>
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
              <LearnerAssignmentItem key={item.assignment.id} item={item} now={now} />
            ))}
          </ul>
          {otherWork.length > RECENT_DONE_ASSIGNMENTS && (
            <details className="older-assignments">
              <summary>Bài cũ hơn ({otherWork.length - RECENT_DONE_ASSIGNMENTS})</summary>
              <ul className="item-list">
                {otherWork.slice(RECENT_DONE_ASSIGNMENTS).map((item) => (
                  <LearnerAssignmentItem key={item.assignment.id} item={item} now={now} />
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
      {!view.classRow.self_study && (
        <section className="section-block" aria-label="Rời lớp">
          <LeaveClassButton classId={view.classRow.id} />
        </section>
      )}
    </>
  );
}
