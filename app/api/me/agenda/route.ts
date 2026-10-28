import { authorizeRead, errorResponse, jsonResponse } from "@/lib/server/api";
import { getLearnerAgenda } from "@/lib/server/learner";

export async function GET() {
  const auth = await authorizeRead();
  if (auth.response || auth.account.role !== "student") {
    return jsonResponse({ agenda: null });
  }
  try {
    const agenda = await getLearnerAgenda(auth.account.id, new Date());
    return jsonResponse({
      agenda: {
        dueCardCount: agenda.dueCardCount,
        assignments: agenda.openAssignments.slice(0, 3).map((item) => ({
          id: item.assignment.id,
          title: item.assignment.title,
          dueAt: item.assignment.dueAt,
        })),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
