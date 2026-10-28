import { authorizeMutation, errorResponse, jsonResponse } from "@/lib/server/api";
import { startAttempt } from "@/lib/server/assignments";

interface AttemptsRouteContext {
  params: Promise<{ id: string }>;
}

// Starting is explicit: opening or reloading the assignment page never creates an attempt.
export async function POST(request: Request, { params }: AttemptsRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const result = await startAttempt(auth.account.id, id);
    if (result.status === "started" || result.status === "resumed") {
      return jsonResponse({ status: result.status, submissionId: result.submission_id });
    }
    return jsonResponse({ code: result.status }, result.status === "not_found" ? 404 : 409);
  } catch (error) {
    return errorResponse(error);
  }
}
