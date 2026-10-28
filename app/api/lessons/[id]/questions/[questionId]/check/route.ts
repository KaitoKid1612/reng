import { z } from "zod";

import {
  describeCorrectAnswer,
  isAssignableQuestion,
  isListeningQuestion,
  parseViewAnswer,
  toQuestionView,
} from "@/lib/assignment";
import { gradeQuestion } from "@/lib/grading/grade";
import { loadLessonVersion } from "@/lib/lesson-repository";
import { errorResponse, jsonResponse, readJsonBody } from "@/lib/server/api";

interface CheckRouteContext {
  params: Promise<{ id: string; questionId: string }>;
}

const checkSchema = z
  .object({ answer: z.unknown(), version: z.string().max(64).optional() })
  .strict();

// Public practice feedback is graded here so S15 can keep answers and transcripts out of the
// page until the learner has answered. Nothing is stored.
export async function POST(request: Request, { params }: CheckRouteContext) {
  try {
    const { id, questionId } = await params;
    const body = checkSchema.parse(await readJsonBody(request));
    const version = await loadLessonVersion(id, body.version);
    const question = version?.content.questions.find((item) => item.id === questionId);
    if (!question || !isAssignableQuestion(question)) {
      return jsonResponse({ code: "not_found" }, 404);
    }
    const raw = parseViewAnswer(toQuestionView(question), body.answer);
    return jsonResponse({
      isCorrect: gradeQuestion(question, raw).isCorrect,
      correctText: describeCorrectAnswer(question),
      explain: question.explain,
      transcript: isListeningQuestion(question) ? question.transcript : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
