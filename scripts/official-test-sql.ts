import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { parseAssignableQuestion } from "../lib/assignment";
import { BUNDLED_LISTENING_AUDIO } from "../lib/bundled-listening";
import { countJlptSections, isOfficialTest, officialTestLevel } from "../lib/jlpt";
import { JLPT_OFFICIAL_CREDIT, OFFICIAL_TEST_OPENS_AT } from "../lib/jlpt-official";
import { findFuriganaProblems } from "../lib/lesson-draft";
import { lessonDraftSchema } from "../lib/lesson-schema";

// Writes one SQL transaction that gives a teacher a JLPT official workbook test as a lesson of
// their own (created once, credited to jlpt.jp), publishes it and adds it to one of their classes.
// The class keeps it closed to learners until --opens-at (default: the day after the real
// test), so they meet the questions only in the mock exam the teacher gives from it. Nothing is
// sent to a database here; without --commit the file ends in ROLLBACK, so running it is a dry run.
// Rerunning publishes nothing new while the content is unchanged.
const DOLLAR_TAG = "$reng_official$";

function quote(value: string) {
  if (value.includes(DOLLAR_TAG)) {
    throw new Error("The test text contains the SQL quoting tag; choose another tag.");
  }
  return `${DOLLAR_TAG}${value}${DOLLAR_TAG}`;
}

async function fileExists(path: string) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      owner: { type: "string" },
      class: { type: "string" },
      "opens-at": { type: "string", default: OFFICIAL_TEST_OPENS_AT },
      out: { type: "string" },
      commit: { type: "boolean", default: false },
    },
  });
  if (!values.file || !values.owner || !values.class || !values.out) {
    throw new Error(
      'Provide --file content/jlpt/official/<test>.json --owner <teacher email> --class "<class name>" --out <file.sql>.',
    );
  }
  const owner = values.owner.trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(owner)) {
    throw new Error("--owner must be the teacher's email address.");
  }
  const opensAt = values["opens-at"];
  if (Number.isNaN(Date.parse(opensAt)) || !/[+-]\d\d:\d\d$|Z$/.test(opensAt)) {
    throw new Error(
      "--opens-at must be an ISO time with its offset, such as 2026-12-07T00:00:00+07:00.",
    );
  }
  const test = lessonDraftSchema.parse(JSON.parse(await readFile(resolve(values.file), "utf8")));
  const questions = test.content.questions;
  questions.forEach((question) => parseAssignableQuestion(question));
  if (!isOfficialTest(questions) || !officialTestLevel(questions)) {
    throw new Error("Every question needs an official:… tag and the test a jlpt:n5/jlpt:n4 tag.");
  }
  const uncredited = questions.filter(
    (question) => question.source?.credit !== JLPT_OFFICIAL_CREDIT,
  );
  if (uncredited.length) {
    throw new Error(
      `Credit jlpt.jp on every question: ${uncredited
        .slice(0, 5)
        .map((q) => q.id)
        .join(", ")}.`,
    );
  }
  const furiganaProblems = findFuriganaProblems(questions);
  if (furiganaProblems.length) {
    throw new Error(
      `Furigana needs fixing:\n${furiganaProblems
        .slice(0, 10)
        .map((problem) => problem.message)
        .join("\n")}`,
    );
  }
  const missingImages = [];
  for (const question of questions) {
    if (
      question.image?.startsWith("/") &&
      !(await fileExists(resolve(`public${question.image}`)))
    ) {
      missingImages.push(question.id);
    }
  }
  if (missingImages.length) {
    throw new Error(`public/ has no image for ${missingImages.slice(0, 5).join(", ")}.`);
  }
  // Publishing checks that every audio hash is registered; the files ship with the web.
  const audioHashes = [
    ...new Set(
      questions.flatMap((question) =>
        (question.type === "listen" || question.type === "dictation") && question.audio
          ? [question.audio]
          : [],
      ),
    ),
  ];
  const audioRows = audioHashes.map((hash) => {
    const row = BUNDLED_LISTENING_AUDIO.get(hash);
    if (!row) {
      throw new Error(
        `Audio ${hash} is not from a bundled listening set; generate and bundle it first.`,
      );
    }
    return row;
  });
  for (const row of audioRows) {
    if (!(await fileExists(resolve(`public${row.url}`)))) {
      throw new Error(`public${row.url} is missing; generate the audio first.`);
    }
  }
  const registerAudio = audioRows.length
    ? `insert into public.audio_assets(hash, text, voice, url, config) values
${audioRows
  .map(
    (row) =>
      `  (${quote(row.hash)}, ${quote(row.text)}, ${quote(row.voice)}, ${quote(row.url)}, ${quote(JSON.stringify(row.config))}::jsonb)`,
  )
  .join(",\n")}
on conflict (hash) do nothing;
`
    : "";
  const sections = countJlptSections(questions);
  const fingerprint = `jlpt-official:${test.id}`;
  const content = JSON.stringify(test.content);
  const sql = `-- ${test.id}: ${questions.length} questions (${sections.vocabulary} 文字・語彙, ${sections.grammarReading} 文法・読解, ${sections.listening} 聴解) for ${owner}, class "${values.class}", open to learners from ${opensAt}.
begin;
${registerAudio}do $official$
declare
  teacher uuid;
  target_class uuid;
  test_id text;
  test_row public.lessons%rowtype;
  new_content jsonb := ${quote(content)}::jsonb;
  new_version uuid;
  place integer;
  opens timestamptz := ${quote(opensAt)}::timestamptz;
begin
  select u.id into teacher
    from auth.users u
    join public.profiles p on p.id = u.id and p.role = 'teacher'
    join public.teacher_accounts t on t.user_id = u.id and t.status = 'active'
    where lower(u.email) = lower(${quote(owner)});
  if teacher is null then
    raise exception 'No active teacher has the email %', ${quote(owner)};
  end if;
  select c.id into target_class from public.classes c
    where c.teacher_id = teacher and c.active and c.name = ${quote(values.class)};
  if target_class is null then
    raise exception 'The teacher has no active class named %', ${quote(values.class)};
  end if;
  test_id := public.insert_lesson_copy(
    teacher,
    md5(${quote(fingerprint)} || ':' || teacher::text)::uuid,
    ${quote(fingerprint)},
    ${quote(test.title)},
    ${quote(test.titleJa)},
    ${quote(test.summary)},
    ${test.order},
    ${quote(test.courseId)},
    new_content,
    '{}'::jsonb,
    null,
    ${quote(JLPT_OFFICIAL_CREDIT)}
  );
  select * into test_row from public.lessons where id = test_id for update;
  if exists (select 1 from public.lesson_versions v
      where v.id = test_row.published_version_id and v.content = new_content) then
    new_version := test_row.published_version_id;
    raise notice 'The newest version already has this content; nothing new is published.';
  else
    new_version := public.publish_lesson(test_id, teacher, test_row.draft_revision,
      ${quote(test.title)}, ${quote(test.titleJa)}, ${quote(test.summary)}, ${test.order},
      ${quote(test.courseId)}, new_content);
  end if;
  -- An attached test keeps its place; a new one goes last. Either way it opens at --opens-at.
  select cl.order_no into place from public.class_lessons cl
    where cl.class_id = target_class and cl.lesson_id = test_id;
  if place is null then
    select coalesce(max(cl.order_no), 0) + 1 into place from public.class_lessons cl
      where cl.class_id = target_class;
  end if;
  perform public.upsert_class_lesson(teacher, target_class, test_id, new_version, place, opens);
  raise notice 'Test % (version %) is in the class at place %, open to learners from %.',
    test_id, new_version, place, opens;
end
$official$;
select l.id, l.title, v.version_no, jsonb_array_length(v.content -> 'questions') as questions,
    c.name as class, cl.available_at as opens_to_learners
  from public.lessons l
  join auth.users u on u.id = l.owner_id
  join public.lesson_versions v on v.id = l.published_version_id
  join public.class_lessons cl on cl.lesson_id = l.id
  join public.classes c on c.id = cl.class_id
  where l.creation_fingerprint = ${quote(fingerprint)} and lower(u.email) = lower(${quote(owner)});
${values.commit ? "commit;" : "rollback;"}
`;
  await writeFile(resolve(values.out), sql);
  console.log(
    `Wrote ${values.out} (${values.commit ? "COMMIT" : "dry run, ends in ROLLBACK"}) for ${test.id}: ${questions.length} questions, ${audioRows.length} audio clips, class "${values.class}".`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Could not write the official test SQL.");
  process.exitCode = 1;
});
