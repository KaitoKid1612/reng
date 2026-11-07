import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { markLessonRead, saveLessonSlidePosition } from "@/lib/server/learner";

interface ProgressRouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({ versionId: z.uuid() });

export async function POST(request: Request, { params }: ProgressRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJsonBody(request));
    await markLessonRead(auth.account.id, id, body.versionId);
    return jsonResponse({ status: "completed" });
  } catch (error) {
    return errorResponse(error);
  }
}

const slideSchema = z.object({
  versionId: z.uuid(),
  slideId: z.string().min(1).max(128),
});

// Saving a slide position is separate from explicitly completing the lesson.
export async function PATCH(request: Request, { params }: ProgressRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const body = slideSchema.parse(await readJsonBody(request));
    await saveLessonSlidePosition(auth.account.id, id, body.versionId, body.slideId);
    return jsonResponse({ status: "saved" });
  } catch (error) {
    return errorResponse(error);
  }
}
