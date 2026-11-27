import { cache } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, Eye, ListChecks, Repeat } from "lucide-react";

import { describeAssignmentKind, describeDue } from "@/components/classroom/assignment-labels";
import { AttemptRunnerLoader } from "@/components/classroom/attempt-runner-loader";
import { StartAttemptButton } from "@/components/classroom/start-attempt-button";
import { buttonVariants } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-pending";
import { getDeadlineState } from "@/lib/assignment";
import { grammarRefs } from "@/lib/grammar-links";
import { examHandInAt, planExamPacing, planStudyPacing } from "@/lib/jlpt";
import { getCurrentAccount, requireStudent } from "@/lib/server/account";
import { getStudentAssignment } from "@/lib/server/assignments";
import { findClassGrammarLinks, hasClassGrammar } from "@/lib/server/class-grammar";
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
  const { dueAt } = view.assignment;
  return dueAt
    ? `Điểm và đáp án công bố sau hạn nộp, lúc ${formatStudyDateTime(dueAt)}.`
    : "Điểm và đáp án công bố sau hạn nộp.";
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
  // Outside a timed mock exam, a learner who forgets a pattern can look it up in the class's
  // lessons; checked practice answers also link the point they test.
  const hasGrammarLessons = !exam && (await hasClassGrammar(account.id, assignment.classId, now));
  const grammarLinks =
    hasGrammarLessons &&
    openAttempt?.items.some((item) => item.answerKey && grammarRefs(item.answerKey.tags).length)
      ? await findClassGrammarLinks(account.id, assignment.classId, now)
      : undefined;
  // Practice in a JLPT-format class, in test order: a study clock against the real test's time.
  const studyPacing =
    openAttempt?.studyLevel && openAttempt.sections
      ? planStudyPacing(openAttempt.studyLevel, openAttempt.sections, openAttempt.startedAt)
      : [];
  let startLabel = hasSubmitted ? "Làm lại" : "Bắt đầu làm bài";
  if (exam) {
    startLabel = "Bắt đầu thi";
  }
  return (
    <div className="assignment-page">
      <div className="page-heading">
        <div>
          <h1>{assignment.title}</h1>
          <p>
            <Link href={`/classes/${assignment.classId}`}>{view.className}</Link> ·{" "}
            {view.lessonTitle}
          </p>
        </div>
      </div>
      <ul className="item-meta assignment-facts">
        <li>
          <ListChecks size={18} aria-hidden="true" />
          <span>
            {describeAssignmentKind(assignment)}: {view.questionCount} câu, {view.totalPoints} điểm
            {exam ? "" : `, đạt từ ${assignment.passScore}%`}
          </span>
        </li>
        <li>
          <CalendarClock size={18} aria-hidden="true" />
          <span>{describeDue(assignment.dueAt)}</span>
        </li>
        <li>
          <Repeat size={18} aria-hidden="true" />
          <span>
            Lượt làm: {view.attempts.length} / {assignment.maxAttempts}
          </span>
        </li>
        <li>
          <Eye size={18} aria-hidden="true" />
          <span>{describeFeedback(view)}</span>
        </li>
      </ul>
      {isLate && (
        <p className="notice-panel">Đã quá hạn. Bài vẫn nhận nộp nhưng sẽ ghi là nộp muộn.</p>
      )}
      {hasGrammarLessons && (
        <p className="small grammar-lookup">
          <BookOpen size={16} aria-hidden="true" />
          Quên mẫu ngữ pháp?{" "}
          <Link href={`/grammar?class=${assignment.classId}`} target="_blank" rel="noopener">
            Tra ngữ pháp của lớp
          </Link>{" "}
          (mở tab mới, bài đang làm vẫn được lưu).
        </p>
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
          serverNow={now.toISOString()}
          grammarLinks={grammarLinks}
          study={
            studyPacing.length
              ? {
                  startedAt: openAttempt.startedAt,
                  serverNow: now.toISOString(),
                  pacing: studyPacing,
                }
              : null
          }
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
                {exam.timeLimitMinutes} phút, tính từ lúc bấm Bắt đầu thi; hết giờ tự nộp. Mỗi câu
                nghe chỉ phát một lần.
              </p>
              {isShortened && minutesToDue !== null && (
                <p>
                  <strong>Chỉ còn {Math.max(minutesToDue, 0)} phút tới hạn.</strong>
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
            <p className="small muted">
              Khi bạn nộp lượt mới, điểm lượt mới sẽ thay điểm cũ, kể cả khi thấp hơn.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
