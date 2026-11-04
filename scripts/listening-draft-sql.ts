import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { draftContentSchema, draftMetadataSchema } from "../lib/lesson-draft";

// Writes one SQL transaction that gives a teacher a draft lesson made from a listening set such
// as content/listening/minna-1-15.json. Nothing is sent to a database here. Without --commit the
// file ends in ROLLBACK, so running it is a dry run. The draft has no audio yet: generate it
// (npm run audio:generate -- --r2 --db --sync-db), then the teacher listens, publishes and assigns.
// Rerunning returns the same draft instead of making another one.

const DOLLAR_TAG = "$reng_listening$";

function quote(value: string) {
  if (value.includes(DOLLAR_TAG)) {
    throw new Error("The listening text contains the SQL quoting tag; choose another tag.");
  }
  return `${DOLLAR_TAG}${value}${DOLLAR_TAG}`;
}

const listeningSetSchema = draftMetadataSchema.extend({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  content: draftContentSchema,
});

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      owner: { type: "string" },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.owner || !values.out) {
    throw new Error(
      "Provide --file content/listening/<set>.json --owner <teacher email> --out <file.sql>.",
    );
  }
  const set = listeningSetSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  const questions = set.content.questions;
  if (!questions.length || questions.some((q) => q.type !== "listen" && q.type !== "dictation")) {
    throw new Error("A listening set holds listening and dictation questions only.");
  }
  const owner = values.owner.trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(owner)) {
    throw new Error("--owner must be the teacher's email address.");
  }
  const fingerprint = `listening:${set.id}`;
  const sql = `-- ${set.id}: a draft with ${questions.length} listening questions for ${owner}.
-- Audio is generated afterwards; the teacher publishes after listening to it.
begin;
do $import$
declare
  teacher uuid;
  draft_id text;
begin
  select u.id into teacher
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'teacher'
    join public.teacher_accounts t on t.user_id = u.id and t.status = 'active'
    where lower(u.email) = lower(${quote(owner)});
  if teacher is null then
    raise exception 'No active teacher has the email %', ${quote(owner)};
  end if;
  draft_id := public.insert_lesson_copy(
    teacher,
    md5(${quote(fingerprint)} || ':' || teacher::text)::uuid,
    ${quote(fingerprint)},
    ${quote(set.title)},
    ${quote(set.titleJa)},
    ${quote(set.summary)},
    ${set.order},
    ${quote(set.courseId)},
    ${quote(JSON.stringify(set.content))}::jsonb,
    '{}'::jsonb,
    null,
    null
  );
  raise notice 'Listening draft: %', draft_id;
end
$import$;
select l.id, l.title, jsonb_array_length(l.draft_content -> 'questions') as questions
  from public.lessons l
  join auth.users u on u.id = l.owner_id
  where l.creation_fingerprint = ${quote(fingerprint)} and lower(u.email) = lower(${quote(owner)});
${values.commit ? "commit" : "rollback"};
`;
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out}: ${questions.length} questions for ${owner} (${values.commit ? "commit" : "dry run, rollback"}).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to write the listening SQL.");
  process.exit(1);
});
