import Link from "next/link";

import { describeAssignmentKind, describeDue } from "@/components/classroom/assignment-labels";
import { CloseAssignmentButton } from "@/components/teach/close-assignment-button";
import { CopyMessageButton } from "@/components/teach/copy-message-button";
import { formatPercent } from "@/lib/grading/grade";

import type { AssignmentResult } from "@/lib/class-report";
import type { ClassReportAssignment } from "@/lib/server/reports";

// A daily set arrives every morning; the newest stay in view and older ones fold away.
const RECENT_ASSIGNMENTS = 5;
// A few names are enough to message the learners; the rest are counted.
const MISSING_NAMES = 5;

interface AssignmentResultLineProps {
  result: AssignmentResult;
}

// Current members only, latest attempt each, so it can differ from the raw submission count.
function AssignmentResultLine({ result }: AssignmentResultLineProps) {
  const submitted = `${result.submittedCount}/${result.assignedCount} học viên đã nộp`;
  if (result.averagePercent === null) {
    return <p className="item-meta">Chưa có điểm · {submitted}</p>;
  }
  return (
    <div className="score-meter-row">
      <span className="score-meter" aria-hidden="true">
        <span style={{ width: `${result.averagePercent}%` }} />
      </span>
      <span className="item-meta">
        Điểm TB {formatPercent(result.averagePercent)} · {submitted}
      </span>
    </div>
  );
}

interface MissingLearnersProps {
  classId: string;
  learners: ClassReportAssignment["missing"];
}

function MissingLearners({ classId, learners }: MissingLearnersProps) {
  const shown = learners.slice(0, MISSING_NAMES);
  return (
    <p className="small missing-learners">
      Chưa nộp:{" "}
      {shown.map((learner, index) => (
        <span key={learner.userId}>
          {index > 0 && ", "}
          <Link href={`/teach/classes/${classId}/students/${learner.userId}`}>{learner.name}</Link>
        </span>
      ))}
      {learners.length > shown.length && ` và ${learners.length - shown.length} học viên khác`}
    </p>
  );
}

export interface ClassAssignmentItem {
  assignment: ClassReportAssignment;
  /** The class chat message; null for a self-study class, which has no one to tell. */
  message: string | null;
}

interface AssignmentItemProps extends ClassAssignmentItem {
  classId: string;
}

function AssignmentItem({ classId, assignment, message }: AssignmentItemProps) {
  return (
    <li>
      <div>
        <h3>{assignment.title}</h3>
        <p className="item-meta">
          {describeAssignmentKind(assignment)}, {describeDue(assignment.dueAt)},{" "}
          {assignment.submittedCount} bài nộp, {assignment.openAttemptCount} đang làm
          {assignment.status === "closed" ? ", đã đóng" : ""}
        </p>
        <p className="small">
          <Link href={`/teach/assignments/${assignment.id}`}>Xem câu hỏi, sửa lỗi hiển thị</Link>
        </p>
        {message && assignment.status === "published" && (
          <CopyMessageButton message={message} isCompact />
        )}
        {assignment.result && assignment.result.assignedCount > 0 && (
          <AssignmentResultLine result={assignment.result} />
        )}
        {assignment.missing.length > 0 && (
          <MissingLearners classId={classId} learners={assignment.missing} />
        )}
      </div>
      {assignment.status === "published" && (
        <CloseAssignmentButton
          assignmentId={assignment.id}
          openAttemptCount={assignment.openAttemptCount}
        />
      )}
    </li>
  );
}

interface ClassAssignmentListProps {
  classId: string;
  items: readonly ClassAssignmentItem[];
}

/** The class's assignments, newest first: the latest few open, older ones folded away. */
export function ClassAssignmentList({ classId, items }: ClassAssignmentListProps) {
  if (!items.length) {
    return (
      <p>
        Chưa có bài tập nào.{" "}
        <Link href={`/teach/classes/${classId}/assign#new-assignment-title`}>
          Giao bài đầu tiên
        </Link>
        .
      </p>
    );
  }
  return (
    <>
      <ul className="item-list">
        {items.slice(0, RECENT_ASSIGNMENTS).map((item) => (
          <AssignmentItem key={item.assignment.id} classId={classId} {...item} />
        ))}
      </ul>
      {items.length > RECENT_ASSIGNMENTS && (
        <details className="older-assignments">
          <summary>Bài cũ hơn ({items.length - RECENT_ASSIGNMENTS})</summary>
          <ul className="item-list">
            {items.slice(RECENT_ASSIGNMENTS).map((item) => (
              <AssignmentItem key={item.assignment.id} classId={classId} {...item} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
