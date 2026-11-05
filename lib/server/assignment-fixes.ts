import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { parseSnapshotQuestion } from "@/lib/assignment";
import {
  applyDisplayFix,
  canonical,
  describeDisplayFixProblem,
  sameJson,
  toDisplayFix,
} from "@/lib/assignment-fix";
import { loadAssignment } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  describeServiceFailure,
  selectOptional,
  selectRows,
} from "@/lib/server/supabase";

import type { AssignableQuestion } from "@/lib/assignment";
import type { DisplayFix } from "@/lib/assignment-fix";

const snapshotSchema = z.record(z.string(), z.unknown());

const itemSchema = z.object({
  question_id: z.string(),
  position: z.number().int(),
  question_snapshot: snapshotSchema,
});

const editSchema = z.object({
  question_id: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  before_snapshot: snapshotSchema,
  after_snapshot: snapshotSchema,
});

// The form carries this instead of the whole snapshot; a different hash means someone else
// saved the question since the page was drawn.
export function snapshotHash(snapshot: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(snapshot)))
    .digest("base64url");
}

export interface QuestionEdit {
  at: string;
  beforePrompt: string;
  afterPrompt: string;
}

export interface FixableQuestion {
  questionId: string;
  position: number;
  hash: string;
  question: AssignableQuestion;
  fix: DisplayFix;
  edits: QuestionEdit[];
}

// Before migration 20261105044634 is applied the history table is missing; the page still opens.
async function listEdits(assignmentId: string) {
  try {
    return await selectRows(
      createServiceClient()
        .from("assignment_item_edits")
        .select("question_id, created_at, before_snapshot, after_snapshot")
        .eq("assignment_id", assignmentId)
        .order("created_at"),
      editSchema,
    );
  } catch (error) {
    console.error("Assignment edit history unavailable", describeServiceFailure(error));
    return [];
  }
}

const promptOf = (snapshot: Record<string, unknown>) =>
  typeof snapshot.prompt === "string" ? snapshot.prompt : "";

/** A given assignment of the teacher's own class, with what each question may have fixed. */
export async function getFixableAssignment(teacherId: string, assignmentId: string) {
  const assignment = await loadAssignment(assignmentId);
  const classRow = await getTeacherClass(teacherId, assignment.classId);
  const [items, edits] = await Promise.all([
    selectRows(
      createServiceClient()
        .from("assignment_items")
        .select("question_id, position, question_snapshot")
        .eq("assignment_id", assignmentId)
        .order("position"),
      itemSchema,
    ),
    listEdits(assignmentId),
  ]);
  const questions: FixableQuestion[] = items.map((item) => ({
    questionId: item.question_id,
    position: item.position,
    hash: snapshotHash(item.question_snapshot),
    question: parseSnapshotQuestion(item.question_snapshot),
    fix: toDisplayFix(item.question_snapshot),
    edits: edits
      .filter((edit) => edit.question_id === item.question_id)
      .map((edit) => ({
        at: edit.created_at,
        beforePrompt: promptOf(edit.before_snapshot),
        afterPrompt: promptOf(edit.after_snapshot),
      })),
  }));
  return { assignment, className: classRow.name, questions };
}

const fixStatusSchema = z.enum(["fixed", "unchanged", "conflict", "not_found", "invalid_change"]);

export type FixResult =
  | { status: "fixed" | "unchanged" | "conflict" | "not_found" }
  | { status: "invalid"; message: string };

/**
 * Saves a teacher's display fix. The database checks the class owner and the allowed change
 * again under a row lock, keeps the snapshot before and after, and leaves answers untouched.
 */
export async function fixAssignmentQuestion(
  teacherId: string,
  assignmentId: string,
  questionId: string,
  expectedHash: string,
  fix: DisplayFix,
): Promise<FixResult> {
  if (!z.uuid().safeParse(assignmentId).success) {
    return { status: "not_found" };
  }
  const row = await selectOptional(
    createServiceClient()
      .from("assignment_items")
      .select("question_snapshot")
      .eq("assignment_id", assignmentId)
      .eq("question_id", questionId)
      .maybeSingle(),
    z.object({ question_snapshot: snapshotSchema }),
  );
  if (!row) {
    return { status: "not_found" };
  }
  if (snapshotHash(row.question_snapshot) !== expectedHash) {
    return { status: "conflict" };
  }
  const next = applyDisplayFix(row.question_snapshot, fix);
  if (sameJson(next, row.question_snapshot)) {
    return { status: "unchanged" };
  }
  const problem = describeDisplayFixProblem(row.question_snapshot, next);
  if (problem) {
    return { status: "invalid", message: problem };
  }
  const status = await callRpc(
    "fix_assignment_question",
    {
      p_teacher_id: teacherId,
      p_assignment_id: assignmentId,
      p_question_id: questionId,
      p_expected_snapshot: row.question_snapshot,
      p_snapshot: next,
    },
    fixStatusSchema,
  );
  return status === "invalid_change"
    ? { status: "invalid", message: "Chỉ sửa được đề bài, giải thích và furigana." }
    : { status };
}
