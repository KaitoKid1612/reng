import "server-only";

import { z } from "zod";

import { BUNDLED_LISTENING_AUDIO } from "@/lib/bundled-listening";
import {
  createItemId,
  draftContentSchema,
  EMPTY_DRAFT_CONTENT,
  findPublishProblems,
  listAudioHashes,
  parseLessonDraftState,
  toPublishableContent,
} from "@/lib/lesson-draft";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { findStarterForLesson, summarizeLessonContent } from "@/lib/starter-lessons";
import { parseVocabularyCsv } from "@/lib/vocab-csv";

import type { LessonDraftState, PublishProblem } from "@/lib/lesson-draft";
import type { StarterLesson } from "@/lib/starter-lessons";

const timestamp = z.iso.datetime({ offset: true });

const lessonRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  title_ja: z.string(),
  visibility: z.enum(["public", "class"]),
  summary: z.string(),
  order_no: z.number().int(),
  course_id: z.string(),
  draft_content: z.unknown(),
  draft_revision: z.number().int(),
  published_version_id: z.uuid().nullable(),
  updated_at: timestamp,
  creation_fingerprint: z.string().nullable(),
});

const LESSON_COLUMNS =
  "id, title, title_ja, summary, order_no, course_id, draft_content, draft_revision, published_version_id, updated_at, visibility, creation_fingerprint";

export const lessonIdSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

async function loadOwnedRow(teacherId: string, lessonId: string) {
  if (!lessonIdSchema.safeParse(lessonId).success) {
    throw new ServiceError("not_found");
  }
  const row = await selectOptional(
    createServiceClient()
      .from("lessons")
      .select(LESSON_COLUMNS)
      .eq("id", lessonId)
      .eq("owner_id", teacherId)
      .is("archived_at", null)
      .maybeSingle(),
    lessonRowSchema,
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return row;
}

function toDraftState(row: z.infer<typeof lessonRowSchema>): LessonDraftState {
  return parseLessonDraftState({ metadata: metadataOf(row), content: row.draft_content });
}

export async function loadLessonEditor(teacherId: string, lessonId: string) {
  const row = await loadOwnedRow(teacherId, lessonId);
  const versions = await selectRows(
    createServiceClient()
      .from("lesson_versions")
      .select("id, version_no, published_at")
      .eq("lesson_id", lessonId)
      .order("version_no", { ascending: false }),
    z.object({ id: z.uuid(), version_no: z.number().int(), published_at: timestamp }),
  );
  let draft: LessonDraftState;
  try {
    draft = toDraftState(row);
  } catch {
    throw new ServiceError("invalid_draft");
  }
  return {
    lessonId: row.id,
    visibility: row.visibility,
    revision: row.draft_revision,
    draft,
    savedAt: row.updated_at,
    publishedVersionId: row.published_version_id,
    versions,
    hasStarter: findStarterForLesson(row.creation_fingerprint) !== undefined,
  };
}

function metadataOf(row: z.infer<typeof lessonRowSchema>): LessonDraftState["metadata"] {
  return {
    title: row.title,
    titleJa: row.title_ja,
    summary: row.summary,
    order: row.order_no,
    courseId: row.course_id,
  };
}

function requireStarter(row: z.infer<typeof lessonRowSchema>) {
  const starter = findStarterForLesson(row.creation_fingerprint);
  if (!starter) {
    throw new ServiceError("not_found");
  }
  return starter;
}

export async function loadStarterRefresh(teacherId: string, lessonId: string) {
  const row = await loadOwnedRow(teacherId, lessonId);
  const starter = requireStarter(row);
  let current: ReturnType<typeof summarizeLessonContent> | null = null;
  try {
    current = summarizeLessonContent(toDraftState(row).content);
  } catch {
    // An unreadable draft is exactly what a refresh replaces; there is just nothing to count.
  }
  return {
    lessonId: row.id,
    title: row.title,
    revision: row.draft_revision,
    starter,
    current,
    latest: summarizeLessonContent(starter.draft.content),
  };
}

// The teacher's title, order and course stay; the content becomes the latest starter's. Published
// versions, class pins and assignments keep their own snapshots.
export async function replaceDraftWithStarter(
  teacherId: string,
  lessonId: string,
  expectedRevision: number,
) {
  const row = await loadOwnedRow(teacherId, lessonId);
  const starter = requireStarter(row);
  const draft = parseIncomingDraft({ metadata: metadataOf(row), content: starter.draft.content });
  return writeDraft(teacherId, lessonId, expectedRevision, draft);
}

export async function createLesson(
  teacherId: string,
  input: { id: string; title: string; order: number },
) {
  const service = createServiceClient();
  const existing = await selectOptional(
    service.from("lessons").select("id").eq("id", input.id).maybeSingle(),
    z.object({ id: z.string() }),
  );
  if (existing) {
    throw new ServiceError("duplicate");
  }
  const { error } = await service.from("lessons").insert({
    id: input.id,
    owner_id: teacherId,
    title: input.title,
    order_no: input.order,
    draft_content: EMPTY_DRAFT_CONTENT,
  });
  if (error) {
    throw new ServiceError(error.code === "23505" ? "duplicate" : "database_error");
  }
}

// The shared insert is idempotent per request and enforces the lesson quota; a starter lesson
// is the teacher's own draft, so it carries no copy source or attribution.
export async function createLessonFromStarter(
  teacherId: string,
  starter: StarterLesson,
  requestId: string,
) {
  const { draft } = starter;
  return callRpc(
    "insert_lesson_copy",
    {
      p_teacher_id: teacherId,
      p_request_id: requestId,
      p_fingerprint: `starter:${starter.id}`,
      p_title: draft.title,
      p_title_ja: draft.titleJa,
      p_summary: draft.summary,
      p_order: draft.order,
      p_course_id: draft.courseId,
      p_content: draft.content,
      p_authoring: {},
      p_source_version_id: null,
      p_attribution: null,
    },
    z.string(),
  );
}

export type DraftWriteResult =
  { status: "saved"; revision: number; savedAt: string } | { status: "conflict"; revision: number };

// One conditional UPDATE: a stale revision from another tab never overwrites newer work.
async function writeDraft(
  teacherId: string,
  lessonId: string,
  expectedRevision: number,
  draft: LessonDraftState,
): Promise<DraftWriteResult> {
  const service = createServiceClient();
  const rows = await selectRows(
    service
      .from("lessons")
      .update({
        title: draft.metadata.title,
        title_ja: draft.metadata.titleJa,
        summary: draft.metadata.summary,
        order_no: draft.metadata.order,
        course_id: draft.metadata.courseId,
        draft_content: draft.content,
        draft_revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .eq("owner_id", teacherId)
      .eq("draft_revision", expectedRevision)
      .is("archived_at", null)
      .select("draft_revision, updated_at"),
    z.object({ draft_revision: z.number().int(), updated_at: timestamp }),
  );
  if (rows[0]) {
    return { status: "saved", revision: rows[0].draft_revision, savedAt: rows[0].updated_at };
  }
  const current = await loadOwnedRow(teacherId, lessonId);
  return { status: "conflict", revision: current.draft_revision };
}

function parseIncomingDraft(value: unknown) {
  try {
    return parseLessonDraftState(value);
  } catch {
    throw new ServiceError("invalid_draft");
  }
}

export async function saveLessonDraft(
  teacherId: string,
  lessonId: string,
  expectedRevision: number,
  value: unknown,
) {
  await loadOwnedRow(teacherId, lessonId);
  return writeDraft(teacherId, lessonId, expectedRevision, parseIncomingDraft(value));
}

export type PublishResult =
  | { status: "published"; revision: number; versionId: string }
  | { status: "invalid"; problems: PublishProblem[] }
  | { status: "conflict"; revision: number };

export async function publishLessonDraft(
  teacherId: string,
  lessonId: string,
  expectedRevision: number,
  value: unknown,
): Promise<PublishResult> {
  const row = await loadOwnedRow(teacherId, lessonId);
  if (row.draft_revision !== expectedRevision) {
    return { status: "conflict", revision: row.draft_revision };
  }
  const draft = parseIncomingDraft(value);
  const problems = findPublishProblems(draft);
  const hashes = listAudioHashes(draft.content);
  if (hashes.length) {
    const assets = await selectRows(
      createServiceClient().from("audio_assets").select("hash").in("hash", hashes),
      z.object({ hash: z.string() }),
    );
    const registered = new Set(assets.map((asset) => asset.hash));
    // Listening questions added from a bundled set bring audio that ships with the web; it is
    // registered here, so the teacher never runs a script for it.
    const bundled = hashes.flatMap((hash) =>
      registered.has(hash) ? [] : (BUNDLED_LISTENING_AUDIO.get(hash) ?? []),
    );
    if (bundled.length) {
      const { error } = await createServiceClient()
        .from("audio_assets")
        .upsert(bundled, { onConflict: "hash", ignoreDuplicates: true });
      if (error) {
        throw new ServiceError("database_error");
      }
    }
    if (registered.size + bundled.length !== hashes.length) {
      problems.push({
        section: "info",
        message: "Một số mã audio chưa được đăng ký. Chạy lại script sinh audio hoặc xóa mã đó.",
      });
    }
  }
  if (problems.length) {
    return { status: "invalid", problems };
  }
  try {
    const versionId = await callRpc(
      "publish_lesson",
      {
        p_lesson_id: lessonId,
        p_owner_id: teacherId,
        p_expected_revision: expectedRevision,
        p_title: draft.metadata.title.trim(),
        p_title_ja: draft.metadata.titleJa.trim(),
        p_summary: draft.metadata.summary.trim(),
        p_order_no: draft.metadata.order,
        p_course_id: draft.metadata.courseId,
        p_content: toPublishableContent(draft.content),
      },
      z.uuid(),
    );
    return { status: "published", revision: expectedRevision + 1, versionId };
  } catch (error) {
    // The RPC rejects a revision that changed after our check; report it as a conflict.
    const current = await loadOwnedRow(teacherId, lessonId);
    if (current.draft_revision !== expectedRevision) {
      return { status: "conflict", revision: current.draft_revision };
    }
    throw error;
  }
}

// Public reading is a deliberate owner choice; saving or publishing never changes it.
export async function setLessonVisibility(
  teacherId: string,
  lessonId: string,
  visibility: "public" | "class",
) {
  if (visibility === "public") {
    const lesson = await selectOptional(
      createServiceClient()
        .from("lessons")
        .select("copied_from_version_id")
        .eq("id", lessonId)
        .eq("owner_id", teacherId)
        .maybeSingle(),
      z.object({ copied_from_version_id: z.uuid().nullable() }),
    );
    // A copy of another teacher's shared lesson is for the copier's classes; like re-sharing,
    // publishing it to everyone is not part of what the share allowed.
    if (lesson?.copied_from_version_id) {
      throw new ServiceError("reshare_not_allowed");
    }
  }
  await callRpc(
    "set_lesson_visibility",
    { p_owner_id: teacherId, p_lesson_id: lessonId, p_visibility: visibility },
    z.unknown(),
  );
}

export async function importVocabulary(
  teacherId: string,
  lessonId: string,
  expectedRevision: number,
  text: string,
) {
  const row = await loadOwnedRow(teacherId, lessonId);
  const draft = toDraftState(row);
  const parsed = parseVocabularyCsv(text, draft.content.vocab);
  if (parsed.error) {
    return { status: "invalid" as const, error: parsed.error };
  }
  const content = structuredClone(draft.content);
  for (const csvRow of parsed.rows.filter((item) => item.status === "valid")) {
    content.vocab.push({
      id: createItemId("vocab", content),
      jp: csvRow.values.jp,
      romaji: csvRow.values.romaji,
      vi: csvRow.values.vi,
      audio: null,
      ...(csvRow.values.kanji ? { kanji: csvRow.values.kanji } : {}),
      ...(csvRow.values.note ? { note: csvRow.values.note } : {}),
    });
  }
  if (!draftContentSchema.safeParse(content).success) {
    return { status: "invalid" as const, error: "Bài đã có quá nhiều từ vựng (tối đa 300)." };
  }
  const added = content.vocab.length - draft.content.vocab.length;
  const result = await writeDraft(teacherId, lessonId, expectedRevision, { ...draft, content });
  return { ...result, added, rows: parsed.rows };
}
