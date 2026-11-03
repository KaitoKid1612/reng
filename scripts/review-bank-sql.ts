import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseAssignableQuestion } from "../lib/assignment";
import { lessonDraftSchema } from "../lib/lesson-schema";

// Writes one SQL transaction that publishes a review bank as the next version of its existing
// lesson and moves the owner's classes that use the bank to that version. Nothing is sent to a
// database here. Without --commit the file ends in ROLLBACK, so running it is a dry run.
// Rerunning after a commit publishes nothing new: the newest version already has the content.
const DOLLAR_TAG = "$reng_bank$";

function quote(value: string) {
  if (value.includes(DOLLAR_TAG)) {
    throw new Error("The bank text contains the SQL quoting tag; choose another tag.");
  }
  return `${DOLLAR_TAG}${value}${DOLLAR_TAG}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.out) {
    throw new Error("Provide --file path/to/bank.json and --out path/to/file.sql.");
  }
  const bank = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  // A question the classroom cannot assign would stay out of every daily set.
  bank.content.questions.forEach((question) => parseAssignableQuestion(question));
  const content = JSON.stringify(bank.content);
  const sql = `-- ${bank.id}: publish ${bank.content.questions.length} questions and move the owner's classes.
begin;
do $publish$
declare
  bank public.lessons%rowtype;
  new_content jsonb := ${quote(content)}::jsonb;
  new_version uuid;
  item record;
  moved integer := 0;
begin
  select * into bank from public.lessons where id = ${quote(bank.id)} for update;
  if not found then
    raise exception 'Lesson % does not exist; publish it once from the app first.', ${quote(bank.id)};
  end if;
  if exists (select 1 from public.lesson_versions v
      where v.id = bank.published_version_id and v.content = new_content) then
    new_version := bank.published_version_id;
    raise notice 'The newest version already has this content; nothing new is published.';
  else
    new_version := public.publish_lesson(bank.id, bank.owner_id, bank.draft_revision,
      ${quote(bank.title)}, ${quote(bank.titleJa)}, ${quote(bank.summary)}, bank.order_no,
      ${quote(bank.courseId)}, new_content);
  end if;
  for item in
    select cl.class_id, cl.order_no, cl.available_at
    from public.class_lessons cl
    join public.classes c on c.id = cl.class_id
    where cl.lesson_id = bank.id and c.teacher_id = bank.owner_id
      and cl.lesson_version_id <> new_version
  loop
    perform public.upsert_class_lesson(bank.owner_id, item.class_id, bank.id, new_version,
      item.order_no, item.available_at);
    moved := moved + 1;
  end loop;
  raise notice 'Version % is current; % class(es) moved to it.', new_version, moved;
end
$publish$;
select v.version_no, jsonb_array_length(v.content -> 'questions') as questions
  from public.lessons l join public.lesson_versions v on v.id = l.published_version_id
  where l.id = ${quote(bank.id)};
select c.name, cl.lesson_version_id = l.published_version_id as uses_newest,
    c.daily_practice_size, c.daily_practice_lesson_id = l.id as is_daily_source
  from public.class_lessons cl
  join public.classes c on c.id = cl.class_id
  join public.lessons l on l.id = cl.lesson_id
  where cl.lesson_id = ${quote(bank.id)};
${values.commit ? "commit;" : "rollback;"}
`;
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out} (${values.commit ? "COMMIT" : "dry run, ends in ROLLBACK"}) for ${bank.id}: ${bank.content.questions.length} questions.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not write the bank SQL.");
  process.exitCode = 1;
});
