import { toTodayRows } from "@/lib/learner-today";
import { authorizeRead, errorResponse, jsonResponse } from "@/lib/server/api";
import { getLearnerAgenda, getStudyActivity } from "@/lib/server/learner";
import { planLearnerToday } from "@/lib/server/learner-today";
import { getTeacherToday } from "@/lib/server/teacher-today";
import { countStudyStreak, toStudyDay } from "@/lib/study-days";
import { describeStreak } from "@/lib/study-streak";

export async function GET() {
  const auth = await authorizeRead();
  if (auth.response) {
    return jsonResponse({ agenda: null, teaching: null, streak: null });
  }
  try {
    const now = new Date();
    const { account } = auth;
    // A teacher's start page leads with today's teaching; their own study follows.
    const [agenda, teaching, activity] = await Promise.all([
      getLearnerAgenda(account.id, now),
      account.role === "teacher" ? getTeacherToday(account.id, now) : null,
      getStudyActivity(account.id, now),
    ]);
    const today = toStudyDay(now);
    const streak = describeStreak(
      countStudyStreak(activity, now),
      activity.some((instant) => toStudyDay(instant) === today),
    );
    const { plan } = await planLearnerToday(agenda, now);
    return jsonResponse({
      agenda: {
        rows: toTodayRows(plan.items, now, agenda.classes.length > 1),
        moreAssignmentCount: plan.moreAssignmentCount,
      },
      teaching,
      // Someone who studies in no class and has no streak gets no streak card.
      streak: agenda.classes.length > 0 || streak.days > 0 ? streak : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
