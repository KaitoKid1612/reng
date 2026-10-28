import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { markLessonRead } from "@/lib/server/learner";

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
