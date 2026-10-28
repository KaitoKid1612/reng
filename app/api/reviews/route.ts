import { z } from "zod";

import { authorizeMutation, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";
import { recordMistakeReview, recordVocabReview } from "@/lib/server/reviews";
import { REVIEW_RATINGS } from "@/lib/review-ratings";

const identifier = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/)
  .max(100);
const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("vocab"),
    requestId: z.uuid(),
    lessonId: identifier,
    vocabId: identifier,
    rating: z.union(REVIEW_RATINGS.map((rating) => z.literal(rating))),
    revision: z.number().int().positive().nullable(),
  }),
  z.object({
    kind: z.literal("mistake"),
    requestId: z.uuid(),
    assignmentId: z.uuid(),
    questionId: identifier,
    answer: z.unknown(),
    revision: z.number().int().positive(),
  }),
]);

export async function POST(request: Request) {
  const auth = await authorizeMutation(request);
  if (auth.response) {
    return auth.response;
  }
  try {
    const body = bodySchema.parse(await readJsonBody(request));
    const now = new Date();
    if (body.kind === "vocab") {
      return jsonResponse(await recordVocabReview(auth.account.id, body, now));
    }
    return jsonResponse(await recordMistakeReview(auth.account.id, body, now));
  } catch (error) {
    return errorResponse(error);
  }
}
