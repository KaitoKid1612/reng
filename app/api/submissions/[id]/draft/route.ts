import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { saveAttemptDraft } from "@/lib/server/assignments";

interface DraftRouteContext {
  params: Promise<{ id: string }>;
}

const bodySchema = z.object({ revision: z.number().int().nonnegative(), draft: z.unknown() });

export async function PUT(request: Request, { params }: DraftRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    const body = bodySchema.parse(await readJsonBody(request));
    const result = await saveAttemptDraft(auth.account.id, id, body.revision, body.draft);
    if (result.status === "saved") {
      return jsonResponse({ revision: result.revision, savedAt: result.saved_at });
    }
    if (result.status === "not_found") {
      return jsonResponse({ code: "not_found" }, 404);
    }
    return jsonResponse(
      {
        code: result.status,
        revision: result.revision,
        savedAt: result.saved_at,
        draft: result.draft,
      },
      409,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
