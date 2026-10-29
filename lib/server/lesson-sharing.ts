import "server-only";

import { z } from "zod";

import { lessonIdSchema } from "@/lib/server/lessons";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

const timestamp = z.iso.datetime({ offset: true });

export const SHARE_PERMISSIONS = ["view", "copy"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

const shareRowSchema = z.object({
  id: z.uuid(),
  lesson_id: z.string(),
  version_id: z.uuid(),
  owner_id: z.uuid(),
  recipient_id: z.uuid(),
  recipient_email: z.string(),
  permission: z.enum(SHARE_PERMISSIONS),
  granted_at: timestamp,
  revoked_at: timestamp.nullable(),
});

const SHARE_COLUMNS =
  "id, lesson_id, version_id, owner_id, recipient_id, recipient_email, permission, granted_at, revoked_at";

const versionRowSchema = z.object({
  id: z.uuid(),
  lesson_id: z.string(),
  version_no: z.number().int(),
  title: z.string(),
  course_id: z.string(),
  published_at: timestamp,
});

async function loadDisplayNames(ids: readonly string[]) {
  if (!ids.length) {
    return new Map<string, string>();
  }
  const rows = await selectRows(
    createServiceClient()
      .from("profiles")
      .select("id, full_name")
      .in("id", [...new Set(ids)]),
    z.object({ id: z.uuid(), full_name: z.string() }),
  );
  return new Map(rows.map((row) => [row.id, row.full_name]));
}

export interface LessonShareEntry {
  id: string;
  versionNo: number;
  recipientEmail: string;
  recipientName: string;
  permission: SharePermission;
  grantedAt: string;
  revokedAt: string | null;
}

export interface SharingOverview {
  lessonId: string;
  title: string;
  isCopy: boolean;
  versions: { id: string; versionNo: number; publishedAt: string }[];
  shares: LessonShareEntry[];
}

export async function loadSharingOverview(
  ownerId: string,
  lessonId: string,
): Promise<SharingOverview> {
  if (!lessonIdSchema.safeParse(lessonId).success) {
    throw new ServiceError("not_found");
  }
  const service = createServiceClient();
  const lesson = await selectOptional(
    service
      .from("lessons")
      .select("id, title, copied_from_version_id")
      .eq("id", lessonId)
      .eq("owner_id", ownerId)
      .is("archived_at", null)
      .maybeSingle(),
    z.object({ id: z.string(), title: z.string(), copied_from_version_id: z.uuid().nullable() }),
  );
  if (!lesson) {
    throw new ServiceError("not_found");
  }
  const [versions, shares] = await Promise.all([
    selectRows(
      service
        .from("lesson_versions")
        .select("id, lesson_id, version_no, title, course_id, published_at")
        .eq("lesson_id", lessonId)
        .order("version_no", { ascending: false }),
      versionRowSchema,
    ),
    selectRows(
      service
        .from("lesson_shares")
        .select(SHARE_COLUMNS)
        .eq("lesson_id", lessonId)
        .eq("owner_id", ownerId)
        .order("granted_at", { ascending: false }),
      shareRowSchema,
    ),
  ]);
  const names = await loadDisplayNames(shares.map((share) => share.recipient_id));
  return {
    lessonId: lesson.id,
    title: lesson.title,
    isCopy: lesson.copied_from_version_id !== null,
    versions: versions.map((version) => ({
      id: version.id,
      versionNo: version.version_no,
      publishedAt: version.published_at,
    })),
    shares: shares.map((share) => ({
      id: share.id,
      versionNo: versions.find((version) => version.id === share.version_id)?.version_no ?? 0,
      recipientEmail: share.recipient_email,
      recipientName: names.get(share.recipient_id) ?? "",
      permission: share.permission,
      grantedAt: share.granted_at,
      revokedAt: share.revoked_at,
    })),
  };
}

const shareResultSchema = z
  .array(
    z.object({
      status: z.enum(["shared", "recipient_not_found", "rate_limited"]),
      share_id: z.uuid().nullable(),
    }),
  )
  .length(1);

export async function shareLessonVersion(
  ownerId: string,
  lessonId: string,
  versionId: string,
  recipientEmail: string,
  permission: SharePermission,
) {
  const [result] = await callRpc(
    "share_lesson_version",
    {
      p_owner_id: ownerId,
      p_lesson_id: lessonId,
      p_version_id: versionId,
      p_recipient_email: recipientEmail,
      p_permission: permission,
    },
    shareResultSchema,
  );
  return result.status;
}

export async function revokeLessonShare(ownerId: string, shareId: string) {
  await callRpc("revoke_lesson_share", { p_owner_id: ownerId, p_share_id: shareId }, z.string());
}

export interface SharedLesson {
  shareId: string;
  lessonId: string;
  versionId: string;
  versionNo: number;
  title: string;
  courseId: string;
  ownerName: string;
  permission: SharePermission;
  grantedAt: string;
}

// Only active grants are listed; reading the version still re-checks the grant server-side.
export async function listSharedWithMe(teacherId: string): Promise<SharedLesson[]> {
  const service = createServiceClient();
  const shares = await selectRows(
    service
      .from("lesson_shares")
      .select(SHARE_COLUMNS)
      .eq("recipient_id", teacherId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false }),
    shareRowSchema,
  );
  if (!shares.length) {
    return [];
  }
  const [versions, names] = await Promise.all([
    selectRows(
      service
        .from("lesson_versions")
        .select("id, lesson_id, version_no, title, course_id, published_at")
        .in(
          "id",
          shares.map((share) => share.version_id),
        ),
      versionRowSchema,
    ),
    loadDisplayNames(shares.map((share) => share.owner_id)),
  ]);
  return shares.flatMap((share) => {
    const version = versions.find((item) => item.id === share.version_id);
    if (!version) {
      return [];
    }
    return [
      {
        shareId: share.id,
        lessonId: share.lesson_id,
        versionId: share.version_id,
        versionNo: version.version_no,
        title: version.title,
        courseId: version.course_id,
        ownerName: names.get(share.owner_id) ?? "",
        permission: share.permission,
        grantedAt: share.granted_at,
      },
    ];
  });
}

export async function copySharedLesson(teacherId: string, shareId: string, requestId: string) {
  return callRpc(
    "copy_shared_lesson",
    { p_teacher_id: teacherId, p_share_id: shareId, p_request_id: requestId },
    lessonIdSchema,
  );
}

export async function duplicateLesson(teacherId: string, lessonId: string, requestId: string) {
  return callRpc(
    "duplicate_lesson",
    { p_teacher_id: teacherId, p_lesson_id: lessonId, p_request_id: requestId },
    lessonIdSchema,
  );
}
