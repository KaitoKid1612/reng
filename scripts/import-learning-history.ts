import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { historyArchiveSchema } from "../lib/learning-history";

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      "learner-email": { type: "string" },
      "teacher-email": { type: "string" },
      "source-key": { type: "string" },
      apply: { type: "boolean", default: false },
      "allow-remote": { type: "boolean", default: false },
      "pending-learner": { type: "boolean", default: false },
    },
  });
  if (
    !values.file ||
    !values["learner-email"] ||
    !values["teacher-email"] ||
    !values["source-key"]
  ) {
    throw new Error("Provide --file, --source-key, --learner-email and --teacher-email.");
  }
  const archive = historyArchiveSchema.parse(JSON.parse(await readFile(values.file, "utf8")));
  console.log(
    `Validated: ${archive.sessions.length} summary rows, ${archive.answers.length} answer rows.`,
  );
  if (!values.apply) {
    console.log("Dry-run: no accounts read and no database changes.");
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Set server-side SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname) && !values["allow-remote"]) {
    throw new Error("Remote imports require an explicit --allow-remote.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const wanted = [values["learner-email"], values["teacher-email"]].map((email) =>
    email.toLowerCase(),
  );
  const ids = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new Error("Unable to resolve the requested accounts.");
    }
    for (const user of data.users) {
      const email = user.email?.toLowerCase();
      if (email && wanted.includes(email)) {
        if (ids.has(email) && ids.get(email) !== user.id) {
          throw new Error("The account mapping is ambiguous.");
        }
        ids.set(email, user.id);
      }
    }
    if (wanted.every((email) => ids.has(email)) || data.users.length < 100) {
      break;
    }
  }
  const learnerId = ids.get(wanted[0]);
  const teacherId = ids.get(wanted[1]);
  if ((!learnerId && !values["pending-learner"]) || !teacherId) {
    throw new Error(
      "A mapped account does not exist. Sign up first; the importer never creates users.",
    );
  }
  const { data, error } = await client.rpc("import_learning_history", {
    p_source_key: values["source-key"],
    p_learner_id: learnerId ?? null,
    p_learner_email: wanted[0],
    p_teacher_id: teacherId,
    p_payload: archive,
  });
  if (error) {
    const code = /reng:([a-z_]+)/.exec(error.message)?.[1] ?? "database_error";
    throw new Error(`Import failed: ${code}`);
  }
  const id = z.uuid().parse(data);
  const { data: saved, error: verifyError } = await client
    .from("learning_history_archives")
    .select("learner_id, learner_email, teacher_id, session_count, answer_count")
    .eq("id", id)
    .single();
  if (
    verifyError ||
    (learnerId && saved?.learner_id !== learnerId) ||
    saved?.learner_email !== wanted[0] ||
    saved?.teacher_id !== teacherId ||
    saved?.session_count !== archive.sessions.length ||
    saved?.answer_count !== archive.answers.length
  ) {
    throw new Error("Import readback did not match. Stop and review before retrying.");
  }
  console.log(`Verified archive: /history/${id}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "History import failed.");
  process.exit(1);
});
