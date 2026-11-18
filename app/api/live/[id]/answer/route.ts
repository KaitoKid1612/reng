import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { submitLiveAnswer } from "@/lib/server/live-quiz";

interface AnswerRouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({
  index: z.number().int().nonnegative(),
  choice: z.number().int().nonnegative(),
});

// The first answer counts; right or wrong is told to everyone together when it is revealed.
export async function POST(request: Request, { params }: AnswerRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJsonBody(request));
    await submitLiveAnswer(auth.account.id, id, body.index, body.choice);
    return jsonResponse({ saved: true });
  } catch (error) {
    return errorResponse(error);
  }
}
