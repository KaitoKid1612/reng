import "server-only";

import { z } from "zod";

import { findRegradedSubmissions, isTypedQuestion, toAcceptedVariant } from "@/lib/answer-variants";
import { listUserAttempts, loadAssignment, loadAssignmentItems } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  selectRowsIn,
  ServiceError,
} from "@/lib/server/supabase";

export interface AcceptAnswerInput {
  classId: string;
  studentId: string;
  assignmentId: string;
  questionId: string;
}

// The accepted text is the learner's own latest answer, read here rather than sent by the page.
// Every submitted answer of the assignment that now grades correct is regraded with it.
export async function acceptAnswerVariant(teacherId: string, input: AcceptAnswerInput) {
  await getTeacherClass(teacherId, input.classId);
  const assignment = await loadAssignment(input.assignmentId);
  if (assignment.classId !== input.classId) {
    throw new ServiceError("not_found");
  }
  const question = (await loadAssignmentItems(assignment.id)).find(
    (item) => item.id === input.questionId,
  );
  if (!question || !isTypedQuestion(question)) {
    throw new ServiceError("not_typed");
  }
  const latest = (await listUserAttempts(input.studentId, [assignment.id]))
    .filter((attempt) => attempt.status === "submitted")
    .sort((first, second) => second.attemptNo - first.attemptNo)[0];
  if (!latest) {
    throw new ServiceError("not_found");
  }
  const service = createServiceClient();
  const answer = await selectOptional(
    service
      .from("answers")
      .select("raw, is_correct")
      .eq("submission_id", latest.id)
      .eq("question_id", question.id)
      .maybeSingle(),
    z.object({ raw: z.unknown(), is_correct: z.boolean() }),
  );
  if (!answer || answer.is_correct) {
    throw new ServiceError("already_correct");
  }
  const variant = toAcceptedVariant(answer.raw);
  if (!variant) {
    throw new ServiceError("invalid_answer");
  }
  const submissions = await selectRows(
    service
      .from("submissions")
      .select("id")
      .eq("assignment_id", assignment.id)
      .eq("status", "submitted"),
    z.object({ id: z.uuid() }),
  );
  const wrong = await selectRowsIn(
    submissions.map((row) => row.id),
    (chunk) =>
      service
        .from("answers")
        .select("submission_id, raw")
        .in("submission_id", chunk)
        .eq("question_id", question.id)
        .eq("is_correct", false),
    z.object({ submission_id: z.uuid(), raw: z.unknown() }),
  );
  let submissionIds: string[];
  try {
    submissionIds = findRegradedSubmissions(question, variant, wrong);
  } catch {
    throw new ServiceError("kanji_required");
  }
  const regraded = await callRpc(
    "accept_answer_variant",
    {
      p_teacher_id: teacherId,
      p_assignment_id: assignment.id,
      p_question_id: question.id,
      p_variant: variant,
      p_submission_ids: submissionIds,
    },
    z.number().int(),
  );
  return { variant, regraded, isPractice: assignment.mode === "practice" };
}
