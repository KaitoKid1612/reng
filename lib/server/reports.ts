import "server-only";

import { z } from "zod";

import {
  buildMemberReport,
  buildReportCsv,
  selectLatestSubmissions,
  summarizeClass,
} from "@/lib/class-report";
import { toPercent } from "@/lib/grading/grade";
import {
  listClassAssignments,
  listUserAttempts,
  loadAttemptResultItems,
} from "@/lib/server/assignments";
import { getTeacherClass, listClassLessons } from "@/lib/server/classes";
import { callRpc, createServiceClient, selectRows, ServiceError } from "@/lib/server/supabase";
import { latestStudyDay } from "@/lib/study-days";

import type { ReportMember } from "@/lib/class-report";

const timestamp = z.iso.datetime({ offset: true });

const rosterSchema = z.array(
  z.object({
    user_id: z.uuid(),
    full_name: z.string(),
    email: z.string(),
    joined_at: timestamp,
    left_at: timestamp.nullable(),
  }),
);

async function loadRoster(classId: string) {
  return callRpc("class_roster", { p_class_id: classId }, rosterSchema);
}

async function loadLastStudyDays(userIds: readonly string[]) {
  const service = createServiceClient();
  const days = await Promise.all(
    userIds.map(async (userId) => {
      const [reviews, submissions] = await Promise.all([
        selectRows(
          service
            .from("review_events")
            .select("reviewed_at")
            .eq("user_id", userId)
            .order("reviewed_at", { ascending: false })
            .limit(1),
          z.object({ reviewed_at: timestamp }),
        ),
        selectRows(
          service
            .from("submissions")
            .select("submitted_at")
            .eq("user_id", userId)
            .eq("status", "submitted")
            .order("submitted_at", { ascending: false })
            .limit(1),
          z.object({ submitted_at: timestamp }),
        ),
      ]);
      const activity = [
        ...reviews.map((row) => row.reviewed_at),
        ...submissions.map((row) => row.submitted_at),
      ];
      return [userId, latestStudyDay(activity)] as const;
    }),
  );
  return new Map(days);
}

const submittedRowSchema = z.object({
  assignment_id: z.uuid(),
  user_id: z.uuid(),
  attempt_no: z.number().int(),
  score: z.number().int(),
  max_score: z.number().int(),
  submitted_at: timestamp,
});

const statsSchema = z.array(
  z.object({
    question_id: z.string(),
    prompt: z.string(),
    wrong_count: z.coerce.number().int(),
    total_count: z.coerce.number().int(),
  }),
);

export async function getClassReport(teacherId: string, classId: string, now: Date) {
  const classRow = await getTeacherClass(teacherId, classId);
  const [roster, assignments, lessons] = await Promise.all([
    loadRoster(classId),
    listClassAssignments([classId]),
    listClassLessons(classId),
  ]);
  const assignmentIds = assignments.map((assignment) => assignment.id);
  const service = createServiceClient();
  const [submitted, open] = assignmentIds.length
    ? await Promise.all([
        selectRows(
          service
            .from("submissions")
            .select("assignment_id, user_id, attempt_no, score, max_score, submitted_at")
            .in("assignment_id", assignmentIds)
            .eq("status", "submitted"),
          submittedRowSchema,
        ),
        selectRows(
          service
            .from("submissions")
            .select("assignment_id")
            .in("assignment_id", assignmentIds)
            .eq("status", "in_progress"),
          z.object({ assignment_id: z.uuid() }),
        ),
      ])
    : [[], []];
  const latest = selectLatestSubmissions(
    submitted.map((row) => ({
      assignmentId: row.assignment_id,
      userId: row.user_id,
      attemptNo: row.attempt_no,
      score: row.score,
      maxScore: row.max_score,
      submittedAt: row.submitted_at,
    })),
  );
  const members: ReportMember[] = roster
    .filter((row) => row.left_at === null)
    .map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      email: row.email,
      joinedAt: row.joined_at,
    }));
  const lastStudyDays = await loadLastStudyDays(members.map((member) => member.userId));
  const reportAssignments = assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueAt: assignment.dueAt,
    publishedAt: assignment.publishedAt,
  }));
  // Phase 3 assignments contain no listening items, so listening summaries stay empty.
  const reports = members.map((member) =>
    buildMemberReport({
      member,
      assignments: reportAssignments,
      latest,
      passScore: classRow.pass_score,
      now,
      lastStudyDay: lastStudyDays.get(member.userId) ?? null,
    }),
  );
  const questionStats = await Promise.all(
    assignments.map(async (assignment) => ({
      assignment,
      questions: await callRpc(
        "assignment_question_stats",
        { p_assignment_id: assignment.id },
        statsSchema,
      ),
    })),
  );
  return {
    classRow,
    lessons,
    assignments: assignments.map((assignment) => ({
      ...assignment,
      submittedCount: [...latest.values()].filter((item) => item.assignmentId === assignment.id)
        .length,
      openAttemptCount: open.filter((item) => item.assignment_id === assignment.id).length,
    })),
    reportAssignments,
    reports,
    summary: summarizeClass(reports),
    questionStats: questionStats.filter((entry) => entry.questions.length > 0),
    formerMemberCount: roster.length - members.length,
  };
}

export async function getClassCsv(teacherId: string, classId: string, now: Date) {
  const report = await getClassReport(teacherId, classId, now);
  return {
    className: report.classRow.name,
    csv: buildReportCsv(report.reportAssignments, report.reports),
  };
}

export async function getStudentDetail(
  teacherId: string,
  classId: string,
  studentId: string,
  now: Date,
) {
  const classRow = await getTeacherClass(teacherId, classId);
  const roster = await loadRoster(classId);
  const member = roster.find((row) => row.user_id === studentId);
  if (!member) {
    throw new ServiceError("not_found");
  }
  const assignments = await listClassAssignments([classId]);
  const attempts = await listUserAttempts(
    studentId,
    assignments.map((assignment) => assignment.id),
  );
  const rows = await Promise.all(
    assignments.map(async (assignment) => {
      const submitted = attempts
        .filter((attempt) => attempt.assignmentId === assignment.id)
        .filter((attempt) => attempt.status === "submitted")
        .sort((first, second) => second.attemptNo - first.attemptNo);
      const latestAttempt = submitted[0] ?? null;
      return {
        assignment,
        attemptCount: attempts.filter((attempt) => attempt.assignmentId === assignment.id).length,
        latest: latestAttempt,
        percent:
          latestAttempt && latestAttempt.score !== null && latestAttempt.maxScore
            ? toPercent(latestAttempt.score, latestAttempt.maxScore)
            : null,
        items: latestAttempt ? await loadAttemptResultItems(latestAttempt.id, assignment.id) : [],
      };
    }),
  );
  const latest = selectLatestSubmissions(
    attempts.flatMap((attempt) =>
      attempt.status === "submitted" &&
      attempt.score !== null &&
      attempt.maxScore !== null &&
      attempt.submittedAt
        ? [
            {
              assignmentId: attempt.assignmentId,
              userId: studentId,
              attemptNo: attempt.attemptNo,
              score: attempt.score,
              maxScore: attempt.maxScore,
              submittedAt: attempt.submittedAt,
            },
          ]
        : [],
    ),
  );
  const report = buildMemberReport({
    member: {
      userId: member.user_id,
      fullName: member.full_name,
      email: member.email,
      joinedAt: member.joined_at,
    },
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      publishedAt: assignment.publishedAt,
    })),
    latest,
    passScore: classRow.pass_score,
    now,
  });
  return { classRow, member, hasLeft: member.left_at !== null, report, rows };
}
