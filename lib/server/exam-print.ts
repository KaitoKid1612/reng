import "server-only";

import { z } from "zod";

import { examSetKindOf, findJlptExamSet } from "@/lib/jlpt-exam-sets";
import { loadAssignment, loadAssignmentItems } from "@/lib/server/assignments";
import { ServiceError } from "@/lib/server/supabase";

import type { JlptExamSet } from "@/lib/jlpt-exam-sets";

/**
 * The exam a print link names: one of the printable sets, or a mock exam a class opened (by its
 * assignment id), printed with the very questions of that exam. Only the owner of that class
 * prints an opened exam.
 */
export async function loadPrintableExam(
  examId: string,
  ownedClassIds: ReadonlySet<string>,
): Promise<JlptExamSet | null> {
  const set = findJlptExamSet(examId);
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
