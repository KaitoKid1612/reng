import { getDeadlineState } from "@/lib/assignment";
import { formatJoinCode } from "@/lib/join-code";
import { formatStudyDateTime } from "@/lib/study-days";

// What a QR code on the shared slides can open on a learner's phone. Paths are relative; the page
// makes them absolute with the site URL so a phone camera gets the production address.
export interface SlideQrTarget {
  id: string;
  kind: "assignment" | "lesson" | "invite";
  label: string;
  // One line under the code: a deadline, the class code to type by hand, and so on.
  detail: string;
  path: string;
}

export interface SlideQrAssignment {
  id: string;
  title: string;
  dueAt: string | null;
  allowLate: boolean;
}

export interface SlideQrInput {
  lessonId: string;
  // The class still takes new learners: a code, joining switched on, not a self-study class.
  joinCode: string | null;
  lessonInClass: boolean;
  // Published assignments of this lesson in this class, newest first, daily sets left out.
  assignments: readonly SlideQrAssignment[];
}

// The most useful code comes first: work the class can still hand in, then the lesson itself,
// then the invitation for a learner who has not joined yet.
export function buildSlideQrTargets(input: SlideQrInput, now: Date): SlideQrTarget[] {
  const assignments = input.assignments
    .filter(
      (assignment) => getDeadlineState(assignment.dueAt, assignment.allowLate, now) !== "past_due",
    )
    .map((assignment): SlideQrTarget => ({
      id: `assignment:${assignment.id}`,
      kind: "assignment",
      label: assignment.title,
      detail: assignment.dueAt
        ? `Bài tập · hạn ${formatStudyDateTime(assignment.dueAt)}`
        : "Bài tập · không có hạn nộp",
      path: `/assignments/${assignment.id}`,
    }));
  const lesson: SlideQrTarget[] = input.lessonInClass
    ? [
        {
          id: "lesson",
          kind: "lesson",
          label: "Mở bài này trên điện thoại",
          detail: "Học viên của lớp đọc lại bài và slide",
          path: `/lessons/${encodeURIComponent(input.lessonId)}`,
        },
      ]
    : [];
  const invite: SlideQrTarget[] = input.joinCode
    ? [
        {
          id: "invite",
          kind: "invite",
          label: "Vào lớp",
          detail: `Mã lớp ${formatJoinCode(input.joinCode)}`,
          path: `/join-class?code=${encodeURIComponent(input.joinCode)}`,
        },
      ]
    : [];
  return [...assignments, ...lesson, ...invite];
}
