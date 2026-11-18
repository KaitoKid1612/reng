import { authorizeMutation, errorResponse, jsonResponse } from "@/lib/server/api";
import { joinLiveQuiz } from "@/lib/server/live-quiz";

interface JoinRouteContext {
  params: Promise<{ id: string }>;
}

// Joining is explicit, like starting an attempt: reading the state never adds a player.
export async function POST(request: Request, { params }: JoinRouteContext) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    await joinLiveQuiz(auth.account.id, id);
    return jsonResponse({ joined: true });
  } catch (error) {
    return errorResponse(error);
  }
}
