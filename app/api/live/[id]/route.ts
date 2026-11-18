import { authorizeRead, errorResponse, jsonResponse } from "@/lib/server/api";
import { getLivePlayerState } from "@/lib/server/live-quiz";

interface PlayerRouteContext {
  params: Promise<{ id: string }>;
}

// A player's phone: the open question without its key, their own answer and, once revealed,
// whether it was right and where they stand.
export async function GET(_request: Request, { params }: PlayerRouteContext) {
  const auth = await authorizeRead();
  if (auth.response) {
    return auth.response;
  }
  try {
    const { id } = await params;
    return jsonResponse(await getLivePlayerState(auth.account.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}
