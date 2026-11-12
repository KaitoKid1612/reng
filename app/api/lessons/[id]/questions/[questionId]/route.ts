import { NextResponse } from "next/server";

import { describeCorrectAnswer } from "@/lib/assignment";
import { loadAccessibleLessonVersion } from "@/lib/server/lesson-access";

// Slides show choice, fill, sentence-order and matching questions; listening needs its own page.
const SLIDE_TYPES: readonly string[] = ["choice", "fill", "order", "match"];

interface QuestionRouteContext {
  params: Promise<{ id: string; questionId: string }>;
}

export async function GET(request: Request, { params }: QuestionRouteContext) {
  const { id, questionId } = await params;
  const version = await loadAccessibleLessonVersion(
    id,
    new URL(request.url).searchParams.get("version") || undefined,
  );
  const question = version?.content.questions.find((item) => item.id === questionId);
  if (!question || !SLIDE_TYPES.includes(question.type)) {
    return NextResponse.json({ error: "Practice question not found." }, { status: 404 });
  }
  return NextResponse.json(
    { answer: describeCorrectAnswer(question), explain: question.explain },
    { headers: { "Cache-Control": "no-store" } },
  );
}
