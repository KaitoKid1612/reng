import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { lessonDraftSchema } from "../lib/lesson-schema";

const SAMPLE_LESSONS = [1, 2, 3, 4, 5].map((number) => `content/lessons/lesson-0${number}.json`);

// Development only: creates a confirmed teacher and publishes the sample lessons with their
// review notice. It refuses any Supabase URL that is not on this machine.
async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string", default: "teacher@reng.local" },
      name: { type: "string", default: "Giảng viên mẫu" },
      password: { type: "string" },
    },
  });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const password = values.password ?? process.env.SEED_TEACHER_PASSWORD;
  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY from `npx supabase status -o env`.");
  }
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("seed:local only writes to a Supabase stack running on this machine.");
  }
  if (!password || password.length < 8) {
    throw new Error("Provide --password or SEED_TEACHER_PASSWORD with at least 8 characters.");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: listed, error: listError } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    throw new Error("Unable to list local users. Check that the local stack is running.");
  }
  let teacherId = listed.users.find((user) => user.email === values.email)?.id;
  if (teacherId) {
    const { error } = await client.auth.admin.updateUserById(teacherId, { password });
    if (error) {
      throw new Error("Unable to reset the local teacher password.");
    }
  } else {
    const { data, error } = await client.auth.admin.createUser({
      email: values.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: values.name },
    });
    if (error || !data.user) {
      throw new Error("Unable to create the local teacher account.");
    }
    teacherId = data.user.id;
  }
  // Roles are granted server-side only; sign-up always creates students.
  const { error: roleError } = await client
    .from("profiles")
    .update({ role: "teacher", full_name: values.name })
    .eq("id", teacherId);
  if (roleError) {
    throw new Error("Unable to grant the teacher role. Apply the migrations first.");
  }
  for (const file of SAMPLE_LESSONS) {
    const draft = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(file), "utf8")));
    const { data: existing } = await client
      .from("lessons")
      .select("owner_id")
      .eq("id", draft.id)
      .maybeSingle();
    if (existing) {
      continue;
    }
    const { error } = await client.rpc("publish_lesson", {
      p_lesson_id: draft.id,
      p_owner_id: teacherId,
      p_expected_revision: 0,
      p_title: draft.title,
      p_title_ja: draft.titleJa,
      p_summary: draft.summary,
      p_order_no: draft.order,
      p_course_id: draft.courseId,
      p_content: draft.content,
      p_is_sample: draft.isSample,
    });
    if (error) {
      throw new Error(`Unable to publish ${draft.id} locally.`);
    }
    const { error: visibilityError } = await client.rpc("set_lesson_visibility", {
      p_owner_id: teacherId,
      p_lesson_id: draft.id,
      p_visibility: "public",
    });
    if (visibilityError) {
      throw new Error("Unable to expose the reviewed local sample catalog.");
    }
  }
  console.log(`Local teacher ${values.email} (${teacherId}) is ready with the sample lessons.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Local seed failed.");
  process.exitCode = 1;
});
