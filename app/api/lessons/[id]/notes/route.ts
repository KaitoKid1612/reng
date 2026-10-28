import { NextResponse } from "next/server";

import { lessonContentSchema } from "@/lib/lesson-schema";
import { createSessionClient } from "@/lib/supabase-session";

interface NotesRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: NotesRouteContext) {
  const headers = { "Cache-Control": "private, no-store" };
  const client = await createSessionClient();
  if (!client) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") {
    return NextResponse.json({ error: "Access denied." }, { status: 403, headers });
  }
  const { id } = await params;
  const { data: lesson } = await client
    .from("lessons")
    .select("published_version_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404, headers });
  }
  const version = new URL(request.url).searchParams.get("version") || lesson.published_version_id;
  const { data: row } = await client
    .from("lesson_versions")
    .select("content")
    .eq("lesson_id", id)
    .eq("id", version)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "Version not found." }, { status: 404, headers });
  }
  const content = lessonContentSchema.parse(row.content);
  return NextResponse.json(
    {
      notes: Object.fromEntries(
        content.slides
          .filter((slide) => slide.teacherNotes)
          .map((slide) => [slide.id, slide.teacherNotes]),
      ),
    },
    { headers },
  );
}
