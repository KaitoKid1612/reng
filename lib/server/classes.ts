import "server-only";

import { randomInt } from "node:crypto";

import { z } from "zod";

import { subjectForLanguage } from "@/lib/class-settings";
import { createJoinCode } from "@/lib/join-code";
import {
  callRpc,
  createServiceClient,
  runMutation,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";
import { lessonLanguage } from "@/lib/teaching-language";

import type { ClassSettings } from "@/lib/class-settings";

const timestamp = z.iso.datetime({ offset: true });

const classRowSchema = z.object({
  id: z.uuid(),
  teacher_id: z.uuid(),
  name: z.string(),
  join_code: z.string(),
  join_enabled: z.boolean(),
  active: z.boolean(),
  pass_score: z.number().int(),
  capacity: z.number().int().nullable(),
  meeting_url: z.string().nullable(),
  subject: z.enum(["japanese", "chinese"]),
  language_tag: z.enum(["ja-JP", "zh-Hans", "zh-Hant"]),
  revision: z.number().int(),
  daily_practice_size: z.number().int().nullable(),
  created_at: timestamp,
});

export type ClassRow = z.infer<typeof classRowSchema>;

const CLASS_COLUMNS =
  "id, teacher_id, name, join_code, join_enabled, active, pass_score, capacity, meeting_url, subject, language_tag, revision, daily_practice_size, created_at";

export async function listTeacherClasses(teacherId: string) {
  const service = createServiceClient();
  const classes = await selectRows(
    service
      .from("classes")
      .select(CLASS_COLUMNS)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false }),
    classRowSchema,
  );
  if (!classes.length) {
    return [];
  }
  const members = await selectRows(
    service
      .from("enrollments")
      .select("class_id")
      .in(
        "class_id",
        classes.map((item) => item.id),
      )
      .is("left_at", null),
    z.object({ class_id: z.uuid() }),
  );
  return classes.map((item) => ({
    ...item,
    memberCount: members.filter((member) => member.class_id === item.id).length,
  }));
}

export async function getTeacherClass(teacherId: string, classId: string) {
  if (!z.uuid().safeParse(classId).success) {
    throw new ServiceError("not_found");
  }
  const row = await selectOptional(
    createServiceClient()
      .from("classes")
      .select(CLASS_COLUMNS)
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    classRowSchema,
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return row;
}

async function insertWithFreshCode<T>(write: (code: string) => Promise<T>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await write(createJoinCode(randomInt));
    } catch (error) {
      if (!(error instanceof ServiceError) || error.code !== "duplicate") {
        throw error;
      }
    }
  }
  throw new ServiceError("join_code_exhausted");
}

export async function createClass(teacherId: string, settings: ClassSettings) {
  return insertWithFreshCode(async (code) => {
    const row = await selectOptional(
      createServiceClient()
        .from("classes")
        .insert({
          teacher_id: teacherId,
          name: settings.name,
          pass_score: settings.passScore,
          join_code: code,
          capacity: settings.capacity,
          meeting_url: settings.meetingUrl || null,
          language_tag: settings.languageTag,
          subject: subjectForLanguage(settings.languageTag),
        })
        .select("id")
        .single(),
      z.object({ id: z.uuid() }),
    );
    if (!row) {
      throw new ServiceError("database_error");
    }
    return row.id;
  });
}

export async function updateClassSettings(
  teacherId: string,
  classId: string,
  settings: ClassSettings & { active: boolean; revision: number },
) {
  await getTeacherClass(teacherId, classId);
  await callRpc(
    "update_class_settings",
    {
      p_teacher_id: teacherId,
      p_class_id: classId,
      p_expected_revision: settings.revision,
      p_name: settings.name,
      p_pass_score: settings.passScore,
      p_active: settings.active,
      p_capacity: settings.capacity,
      p_meeting_url: settings.meetingUrl || null,
      p_subject: subjectForLanguage(settings.languageTag),
      p_language_tag: settings.languageTag,
    },
    z.number().int(),
  );
}

export async function rotateJoinCode(teacherId: string, classId: string) {
  await getTeacherClass(teacherId, classId);
  await insertWithFreshCode((code) =>
    runMutation(
      createServiceClient()
        .from("classes")
        .update({ join_code: code, join_enabled: true })
        .eq("id", classId)
        .eq("teacher_id", teacherId),
    ),
  );
}

export async function setJoinEnabled(teacherId: string, classId: string, isEnabled: boolean) {
  await getTeacherClass(teacherId, classId);
  await runMutation(
    createServiceClient()
      .from("classes")
      .update({ join_enabled: isEnabled })
      .eq("id", classId)
      .eq("teacher_id", teacherId),
  );
}

const versionSummarySchema = z.object({
  id: z.uuid(),
  lesson_id: z.string(),
  version_no: z.number().int(),
  title: z.string(),
  published_at: timestamp,
  schema_version: z.string().nullable(),
  language_tag: z.string().nullable(),
});

export interface OwnedLesson {
  id: string;
  title: string;
  publishedVersionId: string | null;
  copyAttribution: string | null;
  languageTag: ReturnType<typeof lessonLanguage>;
  versions: z.infer<typeof versionSummarySchema>[];
}

export async function listOwnedLessons(teacherId: string): Promise<OwnedLesson[]> {
  const service = createServiceClient();
  const lessons = await selectRows(
    service
      .from("lessons")
      .select(
        "id, title, order_no, published_version_id, copy_attribution, schema_version:draft_content->>schemaVersion, language_tag:draft_content->context->>languageTag",
      )
      .eq("owner_id", teacherId)
      .is("archived_at", null)
      .order("order_no"),
    z.object({
      id: z.string(),
      title: z.string(),
      order_no: z.number().int(),
      published_version_id: z.uuid().nullable(),
      copy_attribution: z.string().nullable(),
      schema_version: z.string().nullable(),
      language_tag: z.string().nullable(),
    }),
  );
  if (!lessons.length) {
    return [];
  }
  const versions = await selectRows(
    service
      .from("lesson_versions")
      .select(
        "id, lesson_id, version_no, title, published_at, schema_version:content->>schemaVersion, language_tag:content->context->>languageTag",
      )
      .in(
        "lesson_id",
        lessons.map((lesson) => lesson.id),
      )
      .order("version_no", { ascending: false }),
    versionSummarySchema,
  );
  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    publishedVersionId: lesson.published_version_id,
    copyAttribution: lesson.copy_attribution,
    languageTag: lessonLanguage(lesson.schema_version, lesson.language_tag),
    versions: versions.filter((version) => version.lesson_id === lesson.id),
  }));
}

const classLessonSchema = z.object({
  lesson_id: z.string(),
  lesson_version_id: z.uuid(),
  order_no: z.number().int(),
  available_at: timestamp,
});

export interface ClassLesson {
  lessonId: string;
  versionId: string;
  versionNo: number;
  title: string;
  orderNo: number;
  availableAt: string;
}

export async function listClassLessons(classId: string): Promise<ClassLesson[]> {
  const service = createServiceClient();
  const rows = await selectRows(
    service
      .from("class_lessons")
      .select("lesson_id, lesson_version_id, order_no, available_at")
      .eq("class_id", classId)
      .order("order_no"),
    classLessonSchema,
  );
  if (!rows.length) {
    return [];
  }
  const versions = await selectRows(
    service
      .from("lesson_versions")
      .select(
        "id, lesson_id, version_no, title, published_at, schema_version:content->>schemaVersion, language_tag:content->context->>languageTag",
      )
      .in(
        "id",
        rows.map((row) => row.lesson_version_id),
      ),
    versionSummarySchema,
  );
  return rows.map((row) => {
    const version = versions.find((item) => item.id === row.lesson_version_id);
    if (!version) {
      throw new ServiceError("database_error");
    }
    return {
      lessonId: row.lesson_id,
      versionId: row.lesson_version_id,
      versionNo: version.version_no,
      title: version.title,
      orderNo: row.order_no,
      availableAt: row.available_at,
    };
  });
}

export async function setClassLesson(
  teacherId: string,
  input: {
    classId: string;
    lessonId: string;
    versionId: string;
    orderNo: number;
    availableAt: string;
  },
) {
  await callRpc(
    "upsert_class_lesson",
    {
      p_teacher_id: teacherId,
      p_class_id: input.classId,
      p_lesson_id: input.lessonId,
      p_version_id: input.versionId,
      p_order_no: input.orderNo,
      p_available_at: input.availableAt,
    },
    z.unknown(),
  );
}

const joinResultSchema = z
  .array(
    z.object({
      status: z.enum([
        "joined",
        "already_member",
        "invalid_code",
        "rate_limited",
        "not_found",
        "class_full",
      ]),
      class_id: z.uuid().nullable(),
    }),
  )
  .length(1)
  .transform((rows) => rows[0]);

export async function joinClass(userId: string, code: string) {
  return callRpc("join_class", { p_user_id: userId, p_code: code }, joinResultSchema);
}

export interface StudentClassSummary {
  id: string;
  name: string;
  teacherName: string;
  joinedAt: string;
}

export async function listStudentClasses(userId: string): Promise<StudentClassSummary[]> {
  const service = createServiceClient();
  const enrollments = await selectRows(
    service
      .from("enrollments")
      .select("class_id, joined_at")
      .eq("user_id", userId)
      .is("left_at", null)
      .order("joined_at", { ascending: false }),
    z.object({ class_id: z.uuid(), joined_at: timestamp }),
  );
  if (!enrollments.length) {
    return [];
  }
  const classes = await selectRows(
    service
      .from("classes")
      .select(CLASS_COLUMNS)
      .in(
        "id",
        enrollments.map((item) => item.class_id),
      )
      .eq("active", true),
    classRowSchema,
  );
  const teachers = await selectRows(
    service
      .from("profiles")
      .select("id, full_name")
      .in("id", [...new Set(classes.map((item) => item.teacher_id))]),
    z.object({ id: z.uuid(), full_name: z.string() }),
  );
  return enrollments.flatMap((enrollment) => {
    const row = classes.find((item) => item.id === enrollment.class_id);
    if (!row) {
      return [];
    }
    return [
      {
        id: row.id,
        name: row.name,
        teacherName: teachers.find((teacher) => teacher.id === row.teacher_id)?.full_name ?? "",
        joinedAt: enrollment.joined_at,
      },
    ];
  });
}

// Membership gate for every learner-facing class read.
export async function requireMembership(userId: string, classId: string) {
  if (!z.uuid().safeParse(classId).success) {
    throw new ServiceError("not_found");
  }
  const service = createServiceClient();
  const enrollment = await selectOptional(
    service
      .from("enrollments")
      .select("joined_at")
      .eq("class_id", classId)
      .eq("user_id", userId)
      .is("left_at", null)
      .maybeSingle(),
    z.object({ joined_at: timestamp }),
  );
  if (!enrollment) {
    throw new ServiceError("not_found");
  }
  const row = await selectOptional(
    service.from("classes").select(CLASS_COLUMNS).eq("id", classId).maybeSingle(),
    classRowSchema,
  );
  if (!row) {
    throw new ServiceError("not_found");
  }
  return { classRow: row, joinedAt: enrollment.joined_at };
}
