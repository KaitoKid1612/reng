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

/** "Mở đề" in the exam library: the class owner opens an official test or the next Reng exam. */
export async function openLibraryExamAction(formData: FormData) {
  const account = await getCurrentAccount();
  const classId = String(formData.get("classId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (account?.role !== "teacher") {
    redirect("/exams?error=not_found");
  }
  let assignmentId: string;
  try {
    ({ assignmentId } = await openExamFromLibrary(account.id, classId, lessonId, new Date()));
  } catch (error) {
    const code =
      error instanceof ServiceError && KNOWN_ERRORS.has(error.code) ? error.code : "failed";
    redirect(`/exams?error=${code}`);
  }
  redirect(`/exams?opened=${assignmentId}#exam-${assignmentId}`);
}
