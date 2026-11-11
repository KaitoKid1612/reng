import "server-only";

import { isFeedbackAvailable } from "@/lib/assignment";
import { summarizeJlptHistory } from "@/lib/jlpt-history";
import {
  listClassAssignments,
  listUserAttempts,
  loadAttemptResultItems,
} from "@/lib/server/assignments";
import { listStudentClasses } from "@/lib/server/classes";

import type { JlptExamResult } from "@/lib/jlpt-history";

/**
 * The learner's own mock exams across their classes, once each exam's results may be seen: the
 * same latest attempt and items as the result page, so both show the same numbers.
 */
export async function listLearnerJlptHistory(userId: string, now: Date) {
  const classes = await listStudentClasses(userId);
  const exams = (await listClassAssignments(classes.map((item) => item.id))).filter(
    (assignment) => assignment.exam !== null,
  );
  if (!exams.length) {
    return [];
  }
  const attempts = await listUserAttempts(
    userId,
    exams.map((assignment) => assignment.id),
  );
  const results = await Promise.all(
    exams.map(async (assignment): Promise<JlptExamResult[]> => {
      const latest = attempts
        .filter((attempt) => attempt.assignmentId === assignment.id)
        .filter((attempt) => attempt.status === "submitted")
        .sort((first, second) => second.attemptNo - first.attemptNo)[0];
      if (
        !assignment.exam ||
        !latest?.submittedAt ||
        !isFeedbackAvailable(assignment, latest.submittedAt, now)
      ) {
        return [];
      }
      return [
        {
          assignmentId: assignment.id,
          title: assignment.title,
          level: assignment.exam.level,
          submittedAt: latest.submittedAt,
          items: await loadAttemptResultItems(latest.id, assignment.id),
        },
      ];
    }),
  );
  return summarizeJlptHistory(results.flat());
}
