import "server-only";

import { z } from "zod";

import {
  DAILY_PRACTICE_HISTORY_DAYS,
  daysBefore,
  endOfVietnamDay,
  selectBalancedDailyQuestions,
  toVietnamDate,
} from "@/lib/daily-practice";
import { listAssignablePracticeQuestions } from "@/lib/server/assignments";
import { getTeacherClass } from "@/lib/server/classes";
import {
  callRpc,
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

// How far back the morning job looks for an open lesson that has choice or fill questions.
const MAX_SOURCE_LESSONS = 20;

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
  const lessons = await selectRows(
    service
      .from("class_lessons")
      .select("lesson_id")
      .eq("class_id", classId)
      .lte("available_at", now.toISOString())
      .order("available_at", { ascending: false })
      .order("order_no", { ascending: false })
      .limit(MAX_SOURCE_LESSONS),
    z.object({ lesson_id: z.string() }),
  );
  if (!lessons.length) {
    return { status: "no_lesson" };
  }
  // The newest open lesson may still be slides only; the most recent lesson with choice or
  // fill questions keeps the daily habit going. Listening items need recorded audio and a
  // quiet room, so daily sets stay choice and fill.
  let lessonId = "";
  let questions: Awaited<ReturnType<typeof listAssignablePracticeQuestions>> = [];
  for (const lesson of lessons) {
    questions = (await listAssignablePracticeQuestions(classId, lesson.lesson_id)).filter(
      (question) => question.type === "choice" || question.type === "fill",
    );
    if (questions.length) {
      lessonId = lesson.lesson_id;
      break;
    }
  }
  if (!questions.length) {
    return { status: "no_questions" };
  }
  const existing = await selectOptional(
    service
      .from("daily_practice_runs")
      .select("assignment_id")
      .eq("class_id", classId)
      .eq("practice_date", practiceDate)
      .maybeSingle(),
    z.object({ assignment_id: z.uuid() }),
  );
  if (existing) {
    const existingItems = await selectRows(
      service
        .from("assignment_items")
        .select("question_id")
        .eq("assignment_id", existing.assignment_id),
      z.object({ question_id: z.string() }),
    );
    return {
      status: "exists",
      assignmentId: existing.assignment_id,
      questionCount: existingItems.length,
    };
  }
  // Every recent assignment of this lesson counts as use, so a set the teacher assigned by hand
  // (such as a day imported from a sheet) is not repeated the next morning.
  const since = `${daysBefore(practiceDate, DAILY_PRACTICE_HISTORY_DAYS)}T00:00:00+07:00`;
  const recent = await selectRows(
    service
      .from("assignments")
      .select("id, published_at")
      .eq("class_id", classId)
      .eq("lesson_id", lessonId)
      .gte("published_at", new Date(since).toISOString()),
    z.object({ id: z.uuid(), published_at: z.iso.datetime({ offset: true }) }),
  );
  const items = recent.length
    ? await selectRows(
        service
          .from("assignment_items")
          .select("assignment_id, question_id")
          .in(
            "assignment_id",
            recent.map((row) => row.id),
          ),
        z.object({ assignment_id: z.uuid(), question_id: z.string() }),
      )
    : [];
  const publishedDays = new Map(
    recent.map((row) => [row.id, toVietnamDate(new Date(row.published_at))]),
  );
  const uses = items.map((item) => ({
    questionId: item.question_id,
    practiceDate: publishedDays.get(item.assignment_id) ?? "",
  }));
  // Kinds (the sheet's "Dạng bài", kanji, choice or fill) keep their share of each day's set.
  const questionIds = selectBalancedDailyQuestions(
    questions.map((question) => ({ id: question.id, type: question.type, tags: question.tags })),
    uses,
    classRow.daily_practice_size,
    `${classId}:${practiceDate}`,
  );
  const assignmentId = await callRpc(
    "publish_daily_practice",
    {
      p_class_id: classId,
      p_practice_date: practiceDate,
      p_lesson_id: lessonId,
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

// The service error code (for example class_not_found for a suspended teacher) says what to fix.
function describeFailure(error: unknown) {
  if (error instanceof ServiceError) {
    return error.code;
  }
  return error instanceof Error ? error.name : "unknown";
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
      console.error("Daily practice failed", item.id, describeFailure(error));
    }
  }
  return summary;
}
