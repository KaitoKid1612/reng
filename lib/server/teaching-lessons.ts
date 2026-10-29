import "server-only";

import { z } from "zod";

import {
  reviewTeachingDraft,
  teachingDraftSchema,
  teachingPublishedContentSchema,
} from "@/lib/teaching-content";
import { lessonIdSchema } from "@/lib/server/lessons";
import { callRpc, ServiceError } from "@/lib/server/supabase";

import type { TeachingDraft } from "@/lib/teaching-content";

const editorSchema = teachingDraftSchema
  .extend({
    lessonId: z.string(),
    revision: z.number().int().nonnegative(),
    savedAt: z.iso.datetime({ offset: true }),
    publishedVersionId: z.uuid().nullable(),
    visibility: z.enum(["public", "class"]),
    versionCount: z.number().int().nonnegative(),
    reviewedIds: z.array(z.string()),
  })
  .strict();

export type TeachingEditorData = z.infer<typeof editorSchema>;

export function toTeachingDraft(editor: TeachingEditorData): TeachingDraft {
  return {
    title: editor.title,
    order: editor.order,
    content: editor.content,
    authoring: editor.authoring,
  };
}

// Returns null for missing, foreign or schema v1 lessons so the caller can choose the v1 editor.
export async function loadTeachingEditor(teacherId: string, lessonId: string) {
  if (!lessonIdSchema.safeParse(lessonId).success) {
    return null;
  }
  return callRpc(
    "get_teaching_editor",
    { p_teacher_id: teacherId, p_lesson_id: lessonId },
    editorSchema.nullable(),
  );
}

export async function createTeachingLesson(
  teacherId: string,
  requestId: string,
  draft: TeachingDraft,
) {
  return callRpc(
    "create_teaching_lesson",
    {
      p_teacher_id: teacherId,
      p_request_id: requestId,
      p_title: draft.title,
      p_order: draft.order,
      p_content: draft.content,
      p_authoring: draft.authoring,
    },
    lessonIdSchema,
  );
}

function parseDraft(value: unknown) {
  const parsed = teachingDraftSchema.safeParse(value);
  if (!parsed.success) {
    throw new ServiceError("invalid_draft");
  }
  return parsed.data;
}

export type TeachingSaveResult =
  { status: "saved"; editor: TeachingEditorData } | { status: "conflict"; revision: number };

// Confirming answers saves the draft and records a review of exactly that saved content.
export async function saveTeachingDraft(
  teacherId: string,
  lessonId: string,
  revision: number,
  value: unknown,
  confirmedIds: readonly string[] = [],
): Promise<TeachingSaveResult> {
  const draft = parseDraft(value);
  for (const id of confirmedIds) {
    const question = draft.content.questions.find((item) => item.id === id);
    const isComplete =
      question &&
      question.prompt &&
      question.explain &&
      question.answer.length > 0 &&
      (question.type === "choice"
        ? question.options.every(Boolean) &&
          question.answer.every((answer) => answer < question.options.length)
        : question.answer.every(Boolean));
    if (!isComplete) {
      throw new ServiceError("review_invalid");
    }
  }
  try {
    const editor = await callRpc(
      "save_teaching_draft",
      {
        p_teacher_id: teacherId,
        p_lesson_id: lessonId,
        p_expected_revision: revision,
        p_title: draft.title,
        p_order: draft.order,
        p_content: draft.content,
        p_authoring: draft.authoring,
        p_confirmed_ids: confirmedIds,
      },
      editorSchema,
    );
    return { status: "saved", editor };
  } catch (error) {
    if (error instanceof ServiceError && error.code === "revision_conflict") {
      const current = await loadTeachingEditor(teacherId, lessonId);
      if (current) {
        return { status: "conflict", revision: current.revision };
      }
    }
    throw error;
  }
}

export type TeachingPublishResult =
  | { status: "published"; versionId: string; revision: number }
  | { status: "invalid"; problems: string[] }
  | { status: "conflict"; revision: number };

// Publishes the saved draft only. Visibility, class assignment and email stay separate steps.
export async function publishTeachingLesson(
  teacherId: string,
  lessonId: string,
  revision: number,
): Promise<TeachingPublishResult> {
  const editor = await loadTeachingEditor(teacherId, lessonId);
  if (!editor) {
    throw new ServiceError("not_found");
  }
  if (editor.revision !== revision) {
    return { status: "conflict", revision: editor.revision };
  }
  const { problems } = reviewTeachingDraft(toTeachingDraft(editor));
  const unreviewed = editor.content.questions.filter(
    (question) => !editor.reviewedIds.includes(question.id),
  );
  if (unreviewed.length) {
    problems.push(
      `Xác nhận đáp án sau lần sửa cuối cho ${unreviewed.length} câu luyện trước khi xuất bản.`,
    );
  }
  const content = teachingPublishedContentSchema.safeParse(editor.content);
  if (!problems.length && !content.success) {
    problems.push("Nội dung chưa đúng cấu trúc bài học. Kiểm tra lại từng bước.");
  }
  if (problems.length || !content.success) {
    return { status: "invalid", problems };
  }
  try {
    const versionId = await callRpc(
      "publish_lesson",
      {
        p_lesson_id: lessonId,
        p_owner_id: teacherId,
        p_expected_revision: revision,
        p_title: editor.title,
        p_title_ja: "",
        p_summary: content.data.objectives.join("; "),
        p_order_no: editor.order,
        p_course_id: "chinese",
        p_content: content.data,
      },
      z.uuid(),
    );
    return { status: "published", versionId, revision: revision + 1 };
  } catch (error) {
    const current = await loadTeachingEditor(teacherId, lessonId);
    if (current && current.revision !== revision) {
      return { status: "conflict", revision: current.revision };
    }
    if (error instanceof ServiceError && error.code === "review_required") {
      return { status: "invalid", problems: ["Xác nhận lại đáp án các câu luyện rồi xuất bản."] };
    }
    throw error;
  }
}
