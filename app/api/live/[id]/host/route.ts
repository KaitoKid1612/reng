import { z } from "zod";

import { LIVE_ACTIONS } from "@/lib/live-quiz";
import {
  authorizeMutation,
  authorizeRead,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "@/lib/server/api";
import { advanceLiveQuiz, getLiveHostState } from "@/lib/server/live-quiz";

interface HostRouteContext {
  params: Promise<{ id: string }>;
}

// The shared screen: everything the teacher shows, keys only once the answer is revealed.
export async function GET(_request: Request, { params }: HostRouteContext) {
  const auth = await authorizeRead();
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    return jsonResponse(await getLiveHostState(auth.account.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}

const bodySchema = z.object({
  revision: z.number().int().nonnegative(),
  action: z.enum(LIVE_ACTIONS),
});

export async function POST(request: Request, { params }: HostRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  // A paused teacher (role back to student) keeps their classes but no longer runs them.
  if (auth.account.role !== "teacher") {
    return jsonResponse({ code: "not_found" }, 404);
  }
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJsonBody(request));
    const revision = await advanceLiveQuiz(auth.account.id, id, body.revision, body.action);
    return jsonResponse({ revision });
  } catch (error) {
    return errorResponse(error);
  }
}
