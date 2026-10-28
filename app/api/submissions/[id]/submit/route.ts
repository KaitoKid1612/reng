import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { submitAttempt } from "@/lib/server/assignments";

interface SubmitRouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({ revision: z.number().int().nonnegative(), draft: z.unknown() });

// Repeated submits (double click, timeout retry) return the original outcome.
export async function POST(request: Request, { params }: SubmitRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJsonBody(request));
    const result = await submitAttempt(auth.account.id, id, body.revision, body.draft);
    if (result.status === "submitted" || result.status === "already_submitted") {
      return jsonResponse({
        status: result.status,
        resultsUrl: `/assignments/${result.assignmentId}/results`,
      });
    }
    return jsonResponse({ code: result.status }, result.status === "not_found" ? 404 : 409);
  } catch (error) {
    return errorResponse(error);
  }
}
