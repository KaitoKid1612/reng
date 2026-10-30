import "server-only";

import { z } from "zod";

import { historyArchiveSchema } from "@/lib/learning-history";
import { createSessionClient } from "@/lib/supabase-session";
import { selectOptional, selectRows } from "@/lib/server/supabase";

const summarySchema = z.object({
  id: z.uuid(),
  learner_id: z.uuid().nullable(),
  learner_name: z.string(),
  course: z.string(),
  session_count: z.number().int(),
  answer_count: z.number().int(),
  imported_at: z.iso.datetime({ offset: true }),
});

// Reads use the caller's session and database RLS, including guessed archive IDs.
export async function listLearningHistory() {
  const client = await createSessionClient();
  if (!client) {
    return [];
  }
  return selectRows(
    client
      .from("learning_history_archives")
      .select("id, learner_id, learner_name, course, session_count, answer_count, imported_at")
      .order("learner_name"),
    summarySchema,
  );
}

export async function loadLearningHistory(id: string) {
  if (!z.uuid().safeParse(id).success) {
    return null;
  }
  const client = await createSessionClient();
  if (!client) {
    return null;
  }
  const archive = await selectOptional(
    client
      .from("learning_history_archives")
      .select("id, payload, imported_at, teacher_id, learner_id")
      .eq("id", id)
      .maybeSingle(),
    z.object({
      id: z.uuid(),
      payload: historyArchiveSchema,
      teacher_id: z.uuid(),
      learner_id: z.uuid().nullable(),
      imported_at: z.iso.datetime({ offset: true }),
    }),
  );
  return archive;
}
