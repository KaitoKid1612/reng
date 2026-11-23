"use server";

import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/server/account";
import { openExamFromLibrary } from "@/lib/server/exam-center";
import { ServiceError } from "@/lib/server/supabase";

const KNOWN_ERRORS = new Set([
  "already_open",
  "no_exam_questions",
  "not_found",
  "not_japanese",
  "invalid_items",
]);

/**
 * "Mở đề" in the exam library: the class owner opens an official test, a fixed Reng exam or the
 * next exam composed from a bank.
 */
export async function openLibraryExamAction(formData: FormData) {
  const account = await getCurrentAccount();
  const classId = String(formData.get("classId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const examSetId = String(formData.get("examSetId") ?? "") || null;
  if (account?.role !== "teacher") {
    redirect("/exams?error=not_found");
  }
  let assignmentId: string;
  try {
    ({ assignmentId } = await openExamFromLibrary(
      account.id,
      classId,
      lessonId,
      new Date(),
      examSetId,
    ));
  } catch (error) {
    const code =
      error instanceof ServiceError && KNOWN_ERRORS.has(error.code) ? error.code : "failed";
    redirect(`/exams?error=${code}`);
  }
  // Land on the class heading: its notice and the new, highlighted row sit right below it.
  redirect(`/exams?opened=${assignmentId}#exams-${classId}`);
}
