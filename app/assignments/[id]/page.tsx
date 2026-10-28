import Link from "next/link";

import { describeDue, MODE_LABELS } from "@/components/classroom/assignment-labels";
import { AttemptRunnerLoader } from "@/components/classroom/attempt-runner-loader";
import { StartAttemptButton } from "@/components/classroom/start-attempt-button";
import { getDeadlineState } from "@/lib/assignment";
import { requireStudent } from "@/lib/server/account";
import { getStudentAssignment } from "@/lib/server/assignments";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { StudentAssignmentView } from "@/lib/server/assignments";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Làm bài" };

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

function describeBlocker(view: StudentAssignmentView, now: Date) {
  const { assignment } = view;
  if (assignment.status === "closed" || !view.isClassActive) {
    return "Bài này đã đóng, không bắt đầu lượt mới được.";
  }
  if (Date.parse(view.availableAt) > now.getTime()) {
    return `Bài sẽ mở lúc ${formatStudyDateTime(view.availableAt)}.`;
  }
  if (getDeadlineState(assignment.dueAt, assignment.allowLate, now) === "past_due") {
    return "Đã quá hạn và bài không cho nộp muộn.";
  }
  if (view.attempts.length >= assignment.maxAttempts) {
    return "Bạn đã dùng hết số lượt làm bài.";
  }
  return null;
}

function describeFeedback(view: StudentAssignmentView) {
  if (view.assignment.feedbackPolicy === "after_submit") {
    return "Xem điểm và giải thích ngay sau khi nộp.";
  }
  return `Điểm và đáp án công bố sau hạn nộp (${describeDue(view.assignment.dueAt)}).`;
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const { id } = await params;
  const account = await requireStudent(`/assignments/${id}`);
  const view = await loadOrNotFound(getStudentAssignment(account.id, id));
  const now = new Date();
  const { assignment, openAttempt } = view;
  const blocker = describeBlocker(view, now);
  const hasSubmitted = view.attempts.some((attempt) => attempt.status === "submitted");
  const isLate = getDeadlineState(assignment.dueAt, assignment.allowLate, now) === "late";
  return (
    <div className="assignment-page">
      <div className="page-heading">
        <div>
          <h1>{assignment.title}</h1>
          <p>
            <Link href={`/classes/${assignment.classId}`}>{view.className}</Link>, bài “
            {view.lessonTitle}”
          </p>
        </div>
      </div>
      <ul className="item-meta assignment-facts">
        <li>
          {MODE_LABELS[assignment.mode]}: {view.questionCount} câu, {view.totalPoints} điểm, đạt từ{" "}
          {assignment.passScore}%
        </li>
        <li>{describeDue(assignment.dueAt)}</li>
        <li>
          Lượt làm: {view.attempts.length} / {assignment.maxAttempts}
        </li>
        <li>{describeFeedback(view)}</li>
      </ul>
      {isLate && (
        <p className="notice-panel">Đã quá hạn. Bài vẫn nhận nộp nhưng sẽ ghi là nộp muộn.</p>
      )}
      {openAttempt ? (
        <AttemptRunnerLoader
          key={`${openAttempt.submissionId}:${openAttempt.revision}`}
          userId={account.id}
          assignmentId={assignment.id}
          submissionId={openAttempt.submissionId}
          mode={assignment.mode}
          items={openAttempt.items}
          initialDraft={openAttempt.draft}
          initialRevision={openAttempt.revision}
          initialSavedAt={openAttempt.savedAt}
        />
      ) : (
        <div className="form-card">
          {blocker ? (
            <p>{blocker}</p>
          ) : (
            <StartAttemptButton
              assignmentId={assignment.id}
              label={hasSubmitted ? "Làm lại lượt mới" : "Bắt đầu làm bài"}
            />
          )}
          {hasSubmitted && (
            <p>
              <Link href={`/assignments/${assignment.id}/results`}>Xem lượt đã nộp</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
