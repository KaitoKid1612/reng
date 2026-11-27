import "server-only";

import { z } from "zod";

import { parseNextExamPrintId } from "@/lib/exam-library";
import { examSetKindOf, findJlptExamSet } from "@/lib/jlpt-exam-sets";
import { loadAssignment, loadAssignmentItems } from "@/lib/server/assignments";
import { loadNextLibraryExam } from "@/lib/server/exam-center";
import { ServiceError } from "@/lib/server/supabase";

import type { JlptExamSet } from "@/lib/jlpt-exam-sets";

/**
 * The exam a print link names: one of the printable sets, a mock exam a class opened (by its
 * assignment id), printed with the very questions of that exam, or the exam a class would open
 * next from a pinned lesson. Only the owner of that class prints the last two.
 */
export async function loadPrintableExam(
  examId: string,
  ownedClassIds: ReadonlySet<string>,
): Promise<JlptExamSet | null> {
  const set = findJlptExamSet(examId);
  const next = parseNextExamPrintId(examId);
  if (next) {
    return ownedClassIds.has(next.classId)
      ? loadNextLibraryExam(next.classId, next.lessonId, new Date())
      : null;
  }
  if (set || !z.uuid().safeParse(examId).success) {
    return set;
  }
  try {
    const assignment = await loadAssignment(examId);
    if (!assignment.exam || !ownedClassIds.has(assignment.classId)) {
      return null;
    }
    const questions = await loadAssignmentItems(examId);
    return {
      id: examId,
      kind: examSetKindOf(questions),
      level: assignment.exam.level,
      title: assignment.title,
      year: null,
      bankLessonId: null,
      questions,
    };
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") {
      return null;
    }
    throw error;
  }
}
