import { z } from "zod";

import { LIVE_QUESTION_COUNTS, LIVE_SECONDS } from "@/lib/live-quiz";
import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { createLiveQuiz } from "@/lib/server/live-quiz";

const bodySchema = z.object({
  classId: z.uuid(),
  lessonId: z.string().min(1).max(200),
  count: z.union(LIVE_QUESTION_COUNTS.map((count) => z.literal(count))),
  seconds: z.union(LIVE_SECONDS.map((seconds) => z.literal(seconds))),
});

// The class owner opens a round on a lesson of the class; a round still open there is finished.
export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const body = bodySchema.parse(await readJsonBody(request));
    return jsonResponse({ id: await createLiveQuiz(auth.account.id, body) }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
