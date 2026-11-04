import "server-only";

import { buildTodayPlan } from "@/lib/learner-today";
import { listClassSchedules } from "@/lib/server/class-schedule";

import type { getLearnerAgenda } from "@/lib/server/learner";

type LearnerAgenda = Awaited<ReturnType<typeof getLearnerAgenda>>;

// The learner's day from an agenda already read, with the class timetables it needs. Lớp của tôi
// and the home page both use it, so they never disagree about what is due.
export async function planLearnerToday(agenda: LearnerAgenda, now: Date) {
  const schedules = await listClassSchedules(agenda.classes.map((item) => item.id));
  const plan = buildTodayPlan(
    {
      classes: agenda.classes.map((item) => ({
        ...item,
        slots: schedules.get(item.id)?.slots ?? [],
      })),
      openAssignments: agenda.openAssignments.map((item) => ({
        id: item.assignment.id,
        classId: item.assignment.classId,
        title: item.assignment.title,
        dueAt: item.assignment.dueAt,
        inProgress: item.status === "in_progress",
        isDaily: agenda.dailyAssignmentIds.has(item.assignment.id),
      })),
      lessons: agenda.openLessons,
      readLessonIds: agenda.readLessonIds,
      dueCardCount: agenda.dueCardCount,
      dueMistakeCount: agenda.dueMistakeCount,
      hasMoreDueCards: agenda.hasMoreDueCards,
    },
    now,
  );
  return { schedules, plan };
}
