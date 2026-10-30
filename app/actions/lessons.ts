"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentAccount } from "@/lib/server/account";
import {
  createLesson,
  createLessonFromStarter,
  importVocabulary,
  lessonIdSchema,
  loadLessonEditor,
  publishLessonDraft,
  saveLessonDraft,
  setLessonVisibility,
} from "@/lib/server/lessons";
import { ServiceError } from "@/lib/server/supabase";
import { findStarterLesson } from "@/lib/starter-lessons";
import { MAX_CSV_BYTES } from "@/lib/vocab-csv";

import type { LessonDraftState } from "@/lib/lesson-draft";
import type { PublishResult } from "@/lib/server/lessons";

export interface CreateLessonState {
  error?: string;
}

const FAILURE = "Chưa lưu được. Kiểm tra kết nối rồi thử lại.";
const NOT_FOUND = "Không tìm thấy bài này trong tài khoản giảng viên của bạn.";

async function requireTeacherId() {
  const account = await getCurrentAccount();
  return account?.role === "teacher" ? account.id : null;
}

const createSchema = z.object({
  id: lessonIdSchema,
  title: z.string().trim().min(1).max(160),
  order: z.coerce.number().int().min(1).max(999),
});

export async function createLessonAction(
  _state: CreateLessonState,
  formData: FormData,
): Promise<CreateLessonState> {
  const teacherId = await requireTeacherId();
  if (!teacherId) {
    return { error: NOT_FOUND };
  }
  const parsed = createSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    order: formData.get("order"),
  });
  if (!parsed.success) {
    return {
      error:
        "Mã bài gồm 3–64 ký tự chữ thường, số hoặc gạch nối (ví dụ lesson-06); tiêu đề và thứ tự là bắt buộc.",
    };
  }
  try {
    await createLesson(teacherId, parsed.data);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "duplicate") {
      return { error: "Mã bài này đã được dùng. Chọn mã khác." };
    }
    return { error: FAILURE };
  }
  redirect(`/teach/lessons/${parsed.data.id}/edit`);
}

const starterSchema = z.object({ starterId: z.string().max(64), requestId: z.uuid() });

export async function createStarterLessonAction(
  _state: CreateLessonState,
  formData: FormData,
): Promise<CreateLessonState> {
  const teacherId = await requireTeacherId();
  if (!teacherId) {
    return { error: NOT_FOUND };
  }
  const parsed = starterSchema.safeParse({
    starterId: formData.get("starterId"),
    requestId: formData.get("requestId"),
  });
  const starter = parsed.success ? findStarterLesson(parsed.data.starterId) : undefined;
  if (!parsed.success || !starter) {
    return { error: "Không tìm thấy bài mẫu này. Tải lại trang rồi thử lại." };
  }
  let lessonId: string;
  try {
    lessonId = await createLessonFromStarter(teacherId, starter, parsed.data.requestId);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "quota_exceeded") {
      return { error: "Tài khoản đã đạt giới hạn số bài. Lưu trữ bớt bài cũ rồi thử lại." };
    }
    return { error: FAILURE };
  }
  redirect(`/teach/lessons/${lessonId}/edit`);
}

const draftInputSchema = z.object({
  lessonId: z.string().max(64),
  revision: z.number().int().nonnegative(),
  draft: z.unknown(),
});

export type SaveDraftOutcome =
  | { status: "saved"; revision: number; savedAt: string }
  | { status: "conflict"; revision: number }
  | { status: "error"; message: string };

function describeFailure(error: unknown) {
  if (error instanceof ServiceError && error.code === "not_found") {
    return NOT_FOUND;
  }
  if (error instanceof ServiceError && error.code === "invalid_draft") {
    return "Bản nháp vượt giới hạn hoặc sai định dạng. Kiểm tra độ dài các trường.";
  }
  return FAILURE;
}

export async function saveLessonDraftAction(input: unknown): Promise<SaveDraftOutcome> {
  const teacherId = await requireTeacherId();
  const parsed = draftInputSchema.safeParse(input);
  if (!teacherId || !parsed.success) {
    return { status: "error", message: NOT_FOUND };
  }
  try {
    return await saveLessonDraft(
      teacherId,
      parsed.data.lessonId,
      parsed.data.revision,
      parsed.data.draft,
    );
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
}

export type PublishOutcome = PublishResult | { status: "error"; message: string };

export async function publishLessonAction(input: unknown): Promise<PublishOutcome> {
  const teacherId = await requireTeacherId();
  const parsed = draftInputSchema.safeParse(input);
  if (!teacherId || !parsed.success) {
    return { status: "error", message: NOT_FOUND };
  }
  try {
    return await publishLessonDraft(
      teacherId,
      parsed.data.lessonId,
      parsed.data.revision,
      parsed.data.draft,
    );
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
}

const importSchema = z.object({
  lessonId: z.string().max(64),
  revision: z.number().int().nonnegative(),
  text: z.string().max(MAX_CSV_BYTES),
});

export type ImportOutcome =
  | { status: "saved"; added: number; revision: number }
  | { status: "conflict"; revision: number }
  | { status: "invalid" | "error"; message: string };

export async function importVocabularyAction(input: unknown): Promise<ImportOutcome> {
  const teacherId = await requireTeacherId();
  const parsed = importSchema.safeParse(input);
  if (!teacherId || !parsed.success) {
    return { status: "error", message: NOT_FOUND };
  }
  try {
    const result = await importVocabulary(
      teacherId,
      parsed.data.lessonId,
      parsed.data.revision,
      parsed.data.text,
    );
    if (result.status === "invalid") {
      return { status: "invalid", message: result.error };
    }
    if (result.status === "conflict") {
      return { status: "conflict", revision: result.revision };
    }
    return { status: "saved", added: result.added, revision: result.revision };
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
}

export type LoadDraftOutcome =
  | { status: "loaded"; draft: LessonDraftState; revision: number; savedAt: string }
  | { status: "error"; message: string };

// Used after a conflict when the teacher chooses the server copy over local edits.
export async function loadLessonDraftAction(lessonId: unknown): Promise<LoadDraftOutcome> {
  const teacherId = await requireTeacherId();
  if (!teacherId || typeof lessonId !== "string") {
    return { status: "error", message: NOT_FOUND };
  }
  try {
    const editor = await loadLessonEditor(teacherId, lessonId);
    return {
      status: "loaded",
      draft: editor.draft,
      revision: editor.revision,
      savedAt: editor.savedAt,
    };
  } catch (error) {
    return { status: "error", message: describeFailure(error) };
  }
}

export interface VisibilityState {
  error?: string;
  notice?: string;
}

export async function setLessonVisibilityAction(
  _state: VisibilityState,
  formData: FormData,
): Promise<VisibilityState> {
  const teacherId = await requireTeacherId();
  const parsed = z
    .object({ lessonId: lessonIdSchema, visibility: z.enum(["public", "class"]) })
    .safeParse({
      lessonId: formData.get("lessonId"),
      visibility: formData.get("visibility"),
    });
  if (!teacherId || !parsed.success) {
    return { error: NOT_FOUND };
  }
  if (parsed.data.visibility === "public" && formData.get("acknowledgePublic") !== "on") {
    return { error: "Xác nhận phạm vi công khai trước khi lưu quyền đọc." };
  }
  try {
    await setLessonVisibility(teacherId, parsed.data.lessonId, parsed.data.visibility);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "reshare_not_allowed") {
      return {
        error: "Bài sao chép từ giáo viên khác chỉ dùng cho lớp của bạn, không đặt công khai được.",
      };
    }
    return { error: NOT_FOUND };
  }
  revalidatePath("/lessons");
  revalidatePath("/grammar");
  return { notice: "Đã cập nhật quyền đọc. Lưu nháp hoặc xuất bản sẽ không tự đổi quyền này." };
}
