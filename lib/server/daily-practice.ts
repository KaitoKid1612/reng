import "server-only";

import { z } from "zod";

import {
  DAILY_PRACTICE_HISTORY_DAYS,
  daysBefore,
  endOfVietnamDay,
  selectDailyQuestions,
  toVietnamDate,
} from "@/lib/daily-practice";
import { listAssignablePracticeQuestions } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import { callRpc, createServiceClient, selectOptional, selectRows } from "@/lib/server/supabase";

export type DailyPracticeOutcome =
  | { status: "created" | "exists"; assignmentId: string; questionCount: number }
  | { status: "disabled" | "no_lesson" | "no_questions" };

const classSchema = z.object({
  id: z.uuid(),
  active: z.boolean(),
  daily_practice_size: z.number().int().nullable(),
});

export async function setDailyPractice(teacherId: string, classId: string, size: number | null) {
  await callRpc(
    "set_daily_practice",
    { p_teacher_id: teacherId, p_class_id: classId, p_size: size },
    z.unknown(),
  );
}

// Shared by the morning job and the teacher's "today" button; the RPC makes both idempotent.
export async function createDailyPractice(
  classId: string,
  now: Date,
): Promise<DailyPracticeOutcome> {
  const service = createServiceClient();
  const practiceDate = toVietnamDate(now);
  const classRow = await selectOptional(
    service
      .from("classes")
      .select("id, active, daily_practice_size")
      .eq("id", classId)
      .maybeSingle(),
    classSchema,
  );
  if (!classRow?.active || !classRow.daily_practice_size) {
    return { status: "disabled" };
  }
  const lesson = await selectOptional(
    service
      .from("class_lessons")
      .select("lesson_id")
      .eq("class_id", classId)
      .lte("available_at", now.toISOString())
      .order("available_at", { ascending: false })
      .order("order_no", { ascending: false })
      .limit(1)
      .maybeSingle(),
    z.object({ lesson_id: z.string() }),
  );
  if (!lesson) {
    return { status: "no_lesson" };
  }
  // Listening items need recorded audio and a quiet room; daily sets stay choice and fill.
  const questions = (await listAssignablePracticeQuestions(classId, lesson.lesson_id)).filter(
    (question) => question.type === "choice" || question.type === "fill",
  );
  if (!questions.length) {
    return { status: "no_questions" };
  }
  const runs = await selectRows(
    service
      .from("daily_practice_runs")
      .select("assignment_id, practice_date")
      .eq("class_id", classId)
      .gte("practice_date", daysBefore(practiceDate, DAILY_PRACTICE_HISTORY_DAYS)),
    z.object({ assignment_id: z.uuid(), practice_date: z.string() }),
  );
  const existing = runs.find((run) => run.practice_date === practiceDate);
  const items = runs.length
    ? await selectRows(
        service
          .from("assignment_items")
          .select("assignment_id, question_id")
          .in(
            "assignment_id",
            runs.map((run) => run.assignment_id),
          ),
        z.object({ assignment_id: z.uuid(), question_id: z.string() }),
      )
    : [];
  if (existing) {
    return {
      status: "exists",
      assignmentId: existing.assignment_id,
      questionCount: items.filter((item) => item.assignment_id === existing.assignment_id).length,
    };
  }
  const uses = items.map((item) => ({
    questionId: item.question_id,
    practiceDate: runs.find((run) => run.assignment_id === item.assignment_id)?.practice_date ?? "",
  }));
  const questionIds = selectDailyQuestions(
    questions.map((question) => question.id),
    uses,
    classRow.daily_practice_size,
    `${classId}:${practiceDate}`,
  );
  const assignmentId = await callRpc(
    "publish_daily_practice",
    {
      p_class_id: classId,
      p_practice_date: practiceDate,
      p_lesson_id: lesson.lesson_id,
      p_question_ids: questionIds,
      p_due_at: endOfVietnamDay(practiceDate),
    },
    z.uuid(),
  );
  return { status: "created", assignmentId, questionCount: questionIds.length };
}

export async function createTodayPractice(teacherId: string, classId: string, now: Date) {
  await getTeacherClass(teacherId, classId);
  return createDailyPractice(classId, now);
}

// One failing class must not stop the others; the summary only counts outcomes.
export async function runDailyPractice(now: Date) {
  const classes = await selectRows(
    createServiceClient()
      .from("classes")
      .select("id")
      .eq("active", true)
      .not("daily_practice_size", "is", null),
    z.object({ id: z.uuid() }),
  );
  const summary = { created: 0, exists: 0, skipped: 0, failed: 0 };
  for (const item of classes) {
    try {
      const outcome = await createDailyPractice(item.id, now);
      if (outcome.status === "created" || outcome.status === "exists") {
        summary[outcome.status] += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error("Daily practice failed", error instanceof Error ? error.name : "unknown");
    }
  }
  return summary;
}
