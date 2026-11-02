import "server-only";

import { z } from "zod";

import { historyArchiveSchema, historySessionSchema } from "@/lib/learning-history";
import { createSessionClient } from "@/lib/supabase-session";
import {
  createServiceClient,
  selectOptional,
  selectRows,
  ServiceError,
} from "@/lib/server/supabase";

const summarySchema = z.object({
  id: z.uuid(),
  learner_id: z.uuid().nullable(),
  learner_name: z.string(),
  course: z.string(),
  session_count: z.number().int(),
  answer_count: z.number().int(),
  imported_at: z.iso.datetime({ offset: true }),
  // List statistics read only the small summary tab; an unreadable snapshot just shows none.
  sessions: z.array(historySessionSchema).nullable().catch(null),
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
      .select(
        "id, learner_id, learner_name, course, session_count, answer_count, imported_at, sessions:payload->sessions",
      )
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

export interface HistoryLinkCandidate {
  id: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
}

// Auth accounts are listed page by page; the pilot has far fewer than this many.
const ACCOUNT_PAGE_SIZE = 1000;
const MAX_ACCOUNT_PAGES = 10;

// The account a link would attach: the one registered with the archive's expected email. Sign-up
// does not confirm email ownership on production, so anyone who knew the address could have
// registered it first; the teacher checks this account with the learner before linking.
export async function findHistoryLinkCandidate(
  teacherId: string,
  archiveId: string,
): Promise<HistoryLinkCandidate | null> {
  const service = createServiceClient();
  const archive = await selectOptional(
    service
      .from("learning_history_archives")
      .select("learner_email, learner_id")
      .eq("id", archiveId)
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    z.object({ learner_email: z.string(), learner_id: z.uuid().nullable() }),
  );
  if (!archive || archive.learner_id) {
    throw new ServiceError("not_found");
  }
  for (let page = 1; page <= MAX_ACCOUNT_PAGES; page++) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage: ACCOUNT_PAGE_SIZE,
    });
    if (error) {
      throw new ServiceError("database_error");
    }
    const user = data.users.find((item) => item.email?.toLowerCase() === archive.learner_email);
    if (user) {
      const profile = await selectOptional(
        service.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        z.object({ full_name: z.string() }),
      );
      return {
        id: user.id,
        fullName: profile?.full_name ?? "",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      };
    }
    if (data.users.length < ACCOUNT_PAGE_SIZE) {
      return null;
    }
  }
  return null;
}
