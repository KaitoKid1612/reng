import { toTodayRows } from "@/lib/learner-today";
import { authorizeRead, errorResponse, jsonResponse } from "@/lib/server/api";
import { getLearnerAgenda } from "@/lib/server/learner";
import { planLearnerToday } from "@/lib/server/learner-today";

export async function GET() {
  const auth = await authorizeRead();
  if (auth.response) {
    return jsonResponse({ agenda: null });
  }
  try {
    const now = new Date();
    const agenda = await getLearnerAgenda(auth.account.id, now);
    const { plan } = await planLearnerToday(agenda, now);
    return jsonResponse({
      agenda: {
        rows: toTodayRows(plan.items, now, agenda.classes.length > 1),
        moreAssignmentCount: plan.moreAssignmentCount,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
