import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseAssignableQuestion } from "../lib/assignment";
import { lessonDraftSchema } from "../lib/lesson-schema";
import { BANK_LANGUAGES, findBankLanguageProblems } from "../lib/review-bank";

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
      language: { type: "string", default: "ja-JP" },
      // The lesson on the server may have another ID than the bank file, such as one created
      // by hand before the file existed.
      lesson: { type: "string" },
    },
  });
  if (!values.file || !values.out) {
    throw new Error("Provide --file path/to/bank.json and --out path/to/file.sql.");
  }
  const language = BANK_LANGUAGES.find((item) => item === values.language);
  if (!language) {
    throw new Error(`--language must be one of ${BANK_LANGUAGES.join(", ")}.`);
  }
  const bank = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  // The draft schema allows a bank without slides, but the published version must also open in
  // the lesson reader; before 05/11/2026 such a version also broke the assignment page.
  if (!bank.content.slides.length) {
    throw new Error(
      "The bank needs at least one slide (for example an intro note) before it can be published.",
    );
  }
  const problems = findBankLanguageProblems(bank.content, language);
  if (problems.length) {
    throw new Error(`The bank does not fit ${language}:\n${problems.slice(0, 10).join("\n")}`);
  }
  // A question the classroom cannot assign would stay out of every daily set.
  bank.content.questions.forEach((question) => parseAssignableQuestion(question));
  const lessonId = values.lesson ?? bank.id;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(lessonId)) {
    throw new Error("--lesson must be a lesson ID such as n4-comprehensive-review-bank.");
  }
  const content = JSON.stringify(bank.content);
  const sql = `-- ${lessonId}: publish ${bank.content.questions.length} questions and move the owner's classes.
begin;
do $publish$
declare
  bank public.lessons%rowtype;
  new_content jsonb := ${quote(content)}::jsonb;
  new_version uuid;
  item record;
  moved integer := 0;
begin
  select * into bank from public.lessons where id = ${quote(lessonId)} for update;
  if not found then
    raise exception 'Lesson % does not exist; publish it once from the app first.', ${quote(lessonId)};
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
  where l.id = ${quote(lessonId)};
select c.name, cl.lesson_version_id = l.published_version_id as uses_newest,
    c.daily_practice_size, c.daily_practice_lesson_id = l.id as is_daily_source
  from public.class_lessons cl
  join public.classes c on c.id = cl.class_id
  join public.lessons l on l.id = cl.lesson_id
  where cl.lesson_id = ${quote(lessonId)};
${values.commit ? "commit;" : "rollback;"}
`;
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out} (${values.commit ? "COMMIT" : "dry run, ends in ROLLBACK"}) for ${lessonId}: ${bank.content.questions.length} questions.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Could not write the bank SQL.");
  process.exitCode = 1;
});
