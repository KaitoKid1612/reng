"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import { ServiceError } from "@/lib/server/supabase";
import {
  createTeachingLesson,
  publishTeachingLesson,
  saveTeachingDraft,
} from "@/lib/server/teaching-lessons";
import { createTeachingDraft, LANGUAGE_TAGS, TEMPLATE_IDS } from "@/lib/teaching-content";
import { MAX_DRAFT_JSON_LENGTH } from "@/lib/teaching-draft";

import type { TeachingEditorData, TeachingPublishResult } from "@/lib/server/teaching-lessons";

const FAILURE = "Chưa lưu được. Kiểm tra kết nối rồi thử lại.";
const NOT_FOUND = "Không tìm thấy bài này trong tài khoản giảng dạy của bạn.";

async function requireTeacherId() {
  const account = await getCurrentAccount();
  return account?.role === "teacher" ? account.id : null;
}

export interface CreateTeachingLessonState {
  error?: string;
}

const createSchema = z.object({
  requestId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  templateId: z.enum(TEMPLATE_IDS),
  languageTag: z.enum(LANGUAGE_TAGS),
  objective: z.string().trim().max(200),
  order: z.coerce.number().int().min(1).max(999),
});

export async function createTeachingLessonAction(
  _state: CreateTeachingLessonState,
  formData: FormData,
): Promise<CreateTeachingLessonState> {
  const teacherId = await requireTeacherId();
  if (!teacherId) {
    return { error: NOT_FOUND };
  }
  const parsed = createSchema.safeParse({
    requestId: formData.get("requestId"),
    title: formData.get("title"),
    templateId: formData.get("templateId"),
    languageTag: formData.get("languageTag"),
    objective: formData.get("objective") ?? "",
    order: formData.get("order"),
  });
  if (!parsed.success) {
    return { error: "Nhập tên bài (tối đa 160 ký tự), chọn một mẫu và thứ tự bài." };
  }
  const { requestId, title, templateId, languageTag, objective, order } = parsed.data;
  let lessonId: string;
  try {
    const draft = { ...createTeachingDraft(title, templateId, languageTag, objective), order };
    lessonId = await createTeachingLesson(teacherId, requestId, draft);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "quota_exceeded") {
      return { error: "Tài khoản đã đạt giới hạn số bài. Lưu trữ bớt bài cũ rồi thử lại." };
    }
    if (error instanceof ServiceError && error.code === "request_conflict") {
      return { error: "Biểu mẫu này đã được gửi với nội dung khác. Tải lại trang rồi tạo lại." };
    }
    return { error: FAILURE };
  }
  redirect(`/teach/lessons/${lessonId}/edit`);
}

const saveSchema = z.object({
  lessonId: z.string().max(64),
  revision: z.number().int().nonnegative(),
  draft: z.unknown(),
  confirmedIds: z.array(z.string().max(100)).max(100).default([]),
});

export type TeachingSaveOutcome =
  | { status: "saved"; editor: TeachingEditorData }
  | { status: "conflict"; revision: number }
  | { status: "error"; message: string };

function describeSaveError(error: unknown) {
  if (error instanceof ServiceError) {
    if (error.code === "invalid_draft") {
      return "Nội dung nháp có trường quá dài hoặc sai định dạng. Kiểm tra lại các bước.";
    }
    if (error.code === "review_invalid") {
      return "Câu này còn thiếu đề, giải thích, lựa chọn hoặc đáp án nên chưa xác nhận được.";
    }
    if (error.code === "not_found") {
      return NOT_FOUND;
    }
  }
  return FAILURE;
}

export async function saveTeachingDraftAction(input: unknown): Promise<TeachingSaveOutcome> {
  const teacherId = await requireTeacherId();
  const parsed = saveSchema.safeParse(input);
  if (!teacherId || !parsed.success) {
    return { status: "error", message: NOT_FOUND };
  }
  if (JSON.stringify(parsed.data.draft).length > MAX_DRAFT_JSON_LENGTH) {
    return { status: "error", message: "Bài quá dài để lưu một lần. Tách thành hai bài nhỏ hơn." };
  }
  try {
    return await saveTeachingDraft(
      teacherId,
      parsed.data.lessonId,
      parsed.data.revision,
      parsed.data.draft,
      parsed.data.confirmedIds,
    );
  } catch (error) {
    return { status: "error", message: describeSaveError(error) };
  }
}

const publishSchema = z.object({
  lessonId: z.string().max(64),
  revision: z.number().int().nonnegative(),
});

export async function publishTeachingLessonAction(
  input: unknown,
): Promise<TeachingPublishResult | { status: "error"; message: string }> {
  const teacherId = await requireTeacherId();
  const parsed = publishSchema.safeParse(input);
  if (!teacherId || !parsed.success) {
    return { status: "error", message: NOT_FOUND };
  }
  try {
    return await publishTeachingLesson(teacherId, parsed.data.lessonId, parsed.data.revision);
  } catch (error) {
    return { status: "error", message: describeSaveError(error) };
  }
}
