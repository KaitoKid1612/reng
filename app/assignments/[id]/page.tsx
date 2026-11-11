import { cache } from "react";
import Link from "next/link";

import { describeAssignmentKind, describeDue } from "@/components/classroom/assignment-labels";
import { AttemptRunnerLoader } from "@/components/classroom/attempt-runner-loader";
import { StartAttemptButton } from "@/components/classroom/start-attempt-button";
import { buttonVariants } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { getDeadlineState } from "@/lib/assignment";
import {
  describeExamPacing,
  describeJlptCountdown,
  examHandInAt,
  planExamPacing,
} from "@/lib/jlpt";
import { getCurrentAccount, requireStudent } from "@/lib/server/account";
import { getStudentAssignment } from "@/lib/server/assignments";
import { loadOrNotFound } from "@/lib/server/pages";
import { formatStudyDateTime } from "@/lib/study-days";

import type { StudentAssignmentView } from "@/lib/server/assignments";
import type { Metadata } from "next";

// Request-scoped, so the tab title and the page share one read.
const loadView = cache((userId: string, id: string) => getStudentAssignment(userId, id));

// The tab names the assignment, so several open tabs (or Meet's tab picker) tell them apart.
export async function generateMetadata({ params }: AssignmentPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (account) {
    try {
      return { title: (await loadView(account.id, id)).assignment.title };
    } catch {
      // Not a member, or no such assignment: the generic title reveals nothing.
    }
  }
  return { title: "Làm bài" };
}

interface AssignmentPageProps {
  params: Promise<{ id: string }>;
}

function describeBlocker(view: StudentAssignmentView, now: Date) {
  const { assignment } = view;
  if (assignment.status === "closed" || !view.isClassActive) {
    return "Bài này đã đóng, không bắt đầu lượt mới được.";
  }
  // A mock exam opens when it is given; its source lesson may stay closed to keep the test unseen.
  if (!assignment.exam && Date.parse(view.availableAt) > now.getTime()) {
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
  const view = await loadOrNotFound(loadView(account.id, id));
  const now = new Date();
  const { assignment, openAttempt } = view;
  const blocker = describeBlocker(view, now);
  const hasSubmitted = view.attempts.some((attempt) => attempt.status === "submitted");
  const isLate = getDeadlineState(assignment.dueAt, assignment.allowLate, now) === "late";
  const { exam } = assignment;
  // A learner starting close to the deadline gets only the time left until it.
  const minutesToDue = assignment.dueAt
    ? Math.floor((Date.parse(assignment.dueAt) - now.getTime()) / 60_000)
    : null;
  const isShortened =
    exam !== null && minutesToDue !== null && minutesToDue < exam.timeLimitMinutes;
  let startLabel = hasSubmitted ? "Làm lại lượt mới" : "Bắt đầu làm bài";
  if (exam) {
    startLabel = "Bắt đầu thi";
  }
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
          {describeAssignmentKind(assignment)}: {view.questionCount} câu, {view.totalPoints} điểm
          {exam ? ", tính giờ từ lúc bắt đầu" : `, đạt từ ${assignment.passScore}%`}
        </li>
        <li>{describeDue(assignment.dueAt)}</li>
        {exam && describeJlptCountdown(now) && <li>{describeJlptCountdown(now)}</li>}
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
          dueAt={assignment.dueAt}
          allowLate={assignment.allowLate}
          exam={
            exam
              ? {
                  handInAt: examHandInAt(
                    openAttempt.startedAt,
                    exam.timeLimitMinutes,
                    assignment.dueAt,
                    assignment.allowLate,
                  ),
                  serverNow: now.toISOString(),
                  pacing: planExamPacing(
                    exam.level,
                    exam.timeLimitMinutes,
                    openAttempt.sections ?? [],
                    openAttempt.startedAt,
                  ),
                }
              : null
          }
        />
      ) : (
        <div className="form-card">
          {blocker && <p>{blocker}</p>}
          {exam && !blocker && (
            <div className="notice-panel">
              <p>
                Đồng hồ {exam.timeLimitMinutes} phút bắt đầu ngay khi bạn bấm Bắt đầu thi và vẫn
                chạy khi đóng trang hay mất mạng. Hết giờ, Reng tự nộp các câu đã lưu. Bài chỉ có
                một lượt làm.
              </p>
              <p className="small">
                Dưới đồng hồ có giờ gợi ý cho từng phần như đề thật (
                {describeExamPacing(exam.level, exam.timeLimitMinutes)}); hết giờ của phần nào thì
                nên chuyển sang phần sau.
              </p>
              <p className="small">
                Như đề thật, mỗi câu nghe chỉ phát một lần, không dừng, tua hay nghe chậm: đọc câu
                hỏi và các lựa chọn trước khi bấm Nghe. Nên làm ở nơi yên tĩnh, có tai nghe, máy đã
                sạc pin.
              </p>
              {isShortened && minutesToDue !== null && (
                <p>
                  <strong>
                    Chỉ còn {Math.max(minutesToDue, 0)} phút tới hạn, nên lượt của bạn sẽ ngắn hơn{" "}
                    {exam.timeLimitMinutes} phút.
                  </strong>
                </p>
              )}
            </div>
          )}
          {/* A finished assignment opens on its results; a new attempt is the second choice, since
              it cannot be cancelled and its score replaces the one shown everywhere. */}
          <div className="button-row">
            {hasSubmitted && (
              <Link href={`/assignments/${assignment.id}/results`} className={buttonVariants()}>
                Xem kết quả
                <LinkPending />
              </Link>
            )}
            {!blocker && (
              <StartAttemptButton
                assignmentId={assignment.id}
                label={startLabel}
                variant={hasSubmitted ? "outline" : "default"}
              />
            )}
          </div>
          {hasSubmitted && !blocker && (
            <p className="small muted">Lượt mới sẽ thay điểm của lượt trước khi bạn nộp.</p>
          )}
        </div>
      )}
    </div>
  );
}
