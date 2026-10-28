import { NextResponse } from "next/server";

import { loadLessonVersion } from "@/lib/lesson-repository";

interface QuestionRouteContext {
  params: Promise<{ id: string; questionId: string }>;
}

export async function GET(request: Request, { params }: QuestionRouteContext) {
  const { id, questionId } = await params;
  const version = await loadLessonVersion(
    id,
    new URL(request.url).searchParams.get("version") || undefined,
  );
  const question = version?.content.questions.find((item) => item.id === questionId);
  if (!question || (question.type !== "choice" && question.type !== "fill")) {
    return NextResponse.json({ error: "Practice question not found." }, { status: 404 });
  }
  const answer =
    question.type === "choice"
      ? question.answer.map((index) => question.options[index]).join(" / ")
      : question.answer.join(" / ");
  return NextResponse.json(
    { answer, explain: question.explain },
    { headers: { "Cache-Control": "no-store" } },
  );
}
