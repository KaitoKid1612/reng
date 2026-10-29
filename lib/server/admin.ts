import "server-only";

import { notFound } from "next/navigation";
import { z } from "zod";

import { requireAccount } from "@/lib/server/account";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

const timestamp = z.iso.datetime({ offset: true });

export async function isPlatformAdmin(userId: string) {
  const row = await selectOptional(
    createServiceClient()
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),
    z.object({ user_id: z.uuid() }),
  );
  return row !== null;
}

// Non-admins get the same 404 as a missing page, so the console is not advertised.
export async function requireAdmin(nextPath: string) {
  const account = await requireAccount(nextPath);
  if (!(await isPlatformAdmin(account.id))) {
    notFound();
  }
  return account;
}

async function countRows(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) {
  const { count, error } = await query;
  if (error) {
    throw new ServiceError("database_error");
  }
  return count ?? 0;
}

export async function loadPlatformSettings() {
  const row = await selectOptional(
    createServiceClient()
      .from("platform_settings")
      .select("teacher_approval_required, updated_at")
      .maybeSingle(),
    z.object({ teacher_approval_required: z.boolean(), updated_at: timestamp }),
  );
  return { teacherApprovalRequired: row?.teacher_approval_required ?? true };
}

const teacherRowSchema = z.object({
  user_id: z.uuid(),
  status: z.enum(["pending", "active", "suspended"]),
  requested_at: timestamp.nullable(),
  activated_at: timestamp.nullable(),
  access_until: z.iso.date().nullable(),
  admin_note: z.string(),
});

export interface TeacherEntry {
  userId: string;
  fullName: string;
  email: string;
  status: "pending" | "active" | "suspended";
  requestedAt: string | null;
  activatedAt: string | null;
  accessUntil: string | null;
  note: string;
  classCount: number;
  studentCount: number;
  lessonCount: number;
}

// Pilot scale (tens of accounts): one page of Auth users is enough to show emails to operators.
async function loadEmails() {
  const { data, error } = await createServiceClient().auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    throw new ServiceError("database_error");
  }
  return new Map(data.users.map((user) => [user.id, user.email ?? ""]));
}

export async function listTeacherAccounts(): Promise<TeacherEntry[]> {
  const service = createServiceClient();
  const teachers = await selectRows(
    service
      .from("teacher_accounts")
      .select("user_id, status, requested_at, activated_at, access_until, admin_note"),
    teacherRowSchema,
  );
  if (!teachers.length) {
    return [];
  }
  const ids = teachers.map((teacher) => teacher.user_id);
  const [profiles, classes, lessons, emails] = await Promise.all([
    selectRows(
      service.from("profiles").select("id, full_name").in("id", ids),
      z.object({ id: z.uuid(), full_name: z.string() }),
    ),
    selectRows(
      service.from("classes").select("id, teacher_id").in("teacher_id", ids),
      z.object({ id: z.uuid(), teacher_id: z.uuid() }),
    ),
    selectRows(
      service.from("lessons").select("owner_id").in("owner_id", ids).is("archived_at", null),
      z.object({ owner_id: z.uuid() }),
    ),
    loadEmails(),
  ]);
  const enrollments = classes.length
    ? await selectRows(
        service
          .from("enrollments")
          .select("class_id, user_id")
          .in(
            "class_id",
            classes.map((item) => item.id),
          )
          .is("left_at", null),
        z.object({ class_id: z.uuid(), user_id: z.uuid() }),
      )
    : [];
  const statusOrder = { pending: 0, active: 1, suspended: 2 } as const;
  return teachers
    .map((teacher) => {
      const classIds = new Set(
        classes.filter((item) => item.teacher_id === teacher.user_id).map((item) => item.id),
      );
      const students = new Set(
        enrollments.filter((item) => classIds.has(item.class_id)).map((item) => item.user_id),
      );
      return {
        userId: teacher.user_id,
        fullName: profiles.find((profile) => profile.id === teacher.user_id)?.full_name ?? "",
        email: emails.get(teacher.user_id) ?? "",
        status: teacher.status,
        requestedAt: teacher.requested_at,
        activatedAt: teacher.activated_at,
        accessUntil: teacher.access_until,
        note: teacher.admin_note,
        classCount: classIds.size,
        studentCount: students.size,
        lessonCount: lessons.filter((lesson) => lesson.owner_id === teacher.user_id).length,
      };
    })
    .sort(
      (first, second) =>
        statusOrder[first.status] - statusOrder[second.status] ||
        first.fullName.localeCompare(second.fullName, "vi"),
    );
}

export interface AdminOverview {
  teachers: Record<TeacherEntry["status"], number>;
  expiredTeachers: number;
  accounts: number;
  activeLearners: number;
  activeClasses: number;
  lessons: number;
  publishedVersions: number;
  submissionsLastWeek: number;
}

export async function loadAdminOverview(today: string, weekAgo: string): Promise<AdminOverview> {
  const service = createServiceClient();
  const [teachers, accounts, enrollments, activeClasses, lessons, versions, submissions] =
    await Promise.all([
      selectRows(
        service.from("teacher_accounts").select("status, access_until"),
        teacherRowSchema.pick({ status: true, access_until: true }),
      ),
      countRows(service.from("profiles").select("id", { count: "exact", head: true })),
      selectRows(
        service.from("enrollments").select("user_id").is("left_at", null),
        z.object({ user_id: z.uuid() }),
      ),
      countRows(
        service.from("classes").select("id", { count: "exact", head: true }).eq("active", true),
      ),
      countRows(
        service
          .from("lessons")
          .select("id", { count: "exact", head: true })
          .is("archived_at", null),
      ),
      countRows(service.from("lesson_versions").select("id", { count: "exact", head: true })),
      countRows(
        service
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "submitted")
          .gte("submitted_at", weekAgo),
      ),
    ]);
  return {
    teachers: {
      pending: teachers.filter((teacher) => teacher.status === "pending").length,
      active: teachers.filter((teacher) => teacher.status === "active").length,
      suspended: teachers.filter((teacher) => teacher.status === "suspended").length,
    },
    expiredTeachers: teachers.filter(
      (teacher) =>
        teacher.status === "active" &&
        teacher.access_until !== null &&
        teacher.access_until < today,
    ).length,
    accounts,
    activeLearners: new Set(enrollments.map((item) => item.user_id)).size,
    activeClasses,
    lessons,
    publishedVersions: versions,
    submissionsLastWeek: submissions,
  };
}

export interface ActivityEntry {
  id: string;
  actorName: string;
  action: string;
  resourceId: string;
  createdAt: string;
}

export async function listRecentActivity(limit = 100): Promise<ActivityEntry[]> {
  const service = createServiceClient();
  const events = await selectRows(
    service
      .from("audit_events")
      .select("id, actor_id, action, resource_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    z.object({
      id: z.uuid(),
      actor_id: z.uuid().nullable(),
      action: z.string(),
      resource_id: z.string(),
      created_at: timestamp,
    }),
  );
  const actorIds = [
    ...new Set(events.flatMap((event) => (event.actor_id ? [event.actor_id] : []))),
  ];
  const profiles = actorIds.length
    ? await selectRows(
        service.from("profiles").select("id, full_name").in("id", actorIds),
        z.object({ id: z.uuid(), full_name: z.string() }),
      )
    : [];
  return events.map((event) => ({
    id: event.id,
    actorName: profiles.find((profile) => profile.id === event.actor_id)?.full_name ?? "",
    action: event.action,
    resourceId: event.resource_id,
    createdAt: event.created_at,
  }));
}

export async function setTeacherStatus(
  adminId: string,
  userId: string,
  status: "active" | "suspended",
) {
  await callRpc(
    "admin_set_teacher_status",
    { p_admin_id: adminId, p_user_id: userId, p_status: status },
    z.string(),
  );
}

export async function updateTeacherPlan(
  adminId: string,
  userId: string,
  accessUntil: string | null,
  note: string,
) {
  await callRpc(
    "admin_update_teacher_plan",
    { p_admin_id: adminId, p_user_id: userId, p_access_until: accessUntil, p_note: note },
    z.unknown(),
  );
}

export async function setTeacherApproval(adminId: string, isRequired: boolean) {
  await callRpc(
    "admin_set_teacher_approval",
    { p_admin_id: adminId, p_required: isRequired },
    z.unknown(),
  );
}

export async function getTeacherRequestStatus(userId: string) {
  const row = await selectOptional(
    createServiceClient()
      .from("teacher_accounts")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle(),
    z.object({ status: z.enum(["pending", "active", "suspended"]) }),
  );
  return row?.status ?? null;
}
