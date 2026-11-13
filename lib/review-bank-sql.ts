import { randomBytes } from "node:crypto";

import type { LessonDraft } from "@/lib/lesson-schema";

// The SQL of npm run bank:sql: one transaction that publishes a review bank as the next version of
// its lesson and moves the owner's classes that use it to that version. With a class, a bank that
// is not on the server yet is created for the class's teacher and added to the class, and it can
// become the class's daily source. Nothing here talks to a database.

export interface BankAudioRow {
  hash: string;
  text: string;
  voice: string;
  url: string;
  config: unknown;
}

export interface BankSqlOptions {
  lessonId: string;
  bank: LessonDraft;
  audio: readonly BankAudioRow[];
  commit: boolean;
  // A class to add the bank to (creating the lesson for its teacher when it does not exist yet).
  classId?: string;
  // Make the bank the class's daily source, keeping its size, listening count and layout.
  dailySource?: boolean;
}

// Dollar quoting with a tag that does not occur in the text keeps every value literal.
function createQuote(texts: readonly string[]) {
  let tag = "$reng_bank$";
  while (texts.some((text) => text.includes(tag))) {
    tag = `$reng_${randomBytes(4).toString("hex")}$`;
  }
  return (value: string) => `${tag}${value}${tag}`;
}

export function buildBankPublishSql({
  lessonId,
  bank,
  audio,
  commit,
  classId,
  dailySource = false,
}: BankSqlOptions) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(lessonId)) {
    throw new Error("The lesson ID must be like n4-comprehensive-review-bank.");
  }
  if (classId !== undefined && !/^[0-9a-f-]{36}$/.test(classId)) {
    throw new Error("The class must be a class UUID.");
  }
  if (dailySource && !classId) {
    throw new Error("Making the bank a daily source needs the class.");
  }
  const content = JSON.stringify(bank.content);
  const audioTexts = audio.flatMap((row) => [
    row.hash,
    row.text,
    row.voice,
    row.url,
    JSON.stringify(row.config),
  ]);
  const quote = createQuote([content, bank.title, bank.titleJa, bank.summary, ...audioTexts]);
  const registerAudio = audio.length
    ? `insert into public.audio_assets(hash, text, voice, url, config) values
${audio
  .map(
    (row) =>
      `  (${quote(row.hash)}, ${quote(row.text)}, ${quote(row.voice)}, ${quote(row.url)}, ${quote(JSON.stringify(row.config))}::jsonb)`,
  )
  .join(",\n")}
on conflict (hash) do nothing;
`
    : "";
  const classValue = classId ? `${quote(classId)}::uuid` : "null::uuid";
  return `-- ${lessonId}: publish ${bank.content.questions.length} questions and move the owner's classes.
begin;
${registerAudio}do $publish$
declare
  bank public.lessons%rowtype;
  new_content jsonb := ${quote(content)}::jsonb;
  target_class uuid := ${classValue};
  class_teacher uuid;
  new_version uuid;
  item record;
  moved integer := 0;
begin
  select * into bank from public.lessons where id = ${quote(lessonId)} for update;
  if not found then
    if target_class is null then
      raise exception 'Lesson % does not exist; publish it once from the app first, or pass --class.', ${quote(lessonId)};
    end if;
    select teacher_id into class_teacher from public.classes where id = target_class;
    if class_teacher is null then
      raise exception 'Class % does not exist.', target_class;
    end if;
    new_version := public.publish_lesson(${quote(lessonId)}, class_teacher, 0,
      ${quote(bank.title)}, ${quote(bank.titleJa)}, ${quote(bank.summary)}, ${bank.order},
      ${quote(bank.courseId)}, new_content);
    select * into bank from public.lessons where id = ${quote(lessonId)};
    raise notice 'Created lesson % for the class teacher.', bank.id;
  elsif exists (select 1 from public.lesson_versions v
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
  if target_class is not null then
    -- Only the bank's owner may add it to a class; a class of another teacher stops here.
    if not exists (select 1 from public.classes where id = target_class and teacher_id = bank.owner_id) then
      raise exception 'Class % does not belong to the bank owner.', target_class;
    end if;
    if not exists (select 1 from public.class_lessons
        where class_id = target_class and lesson_id = bank.id) then
      perform public.upsert_class_lesson(bank.owner_id, target_class, bank.id, new_version,
        (select coalesce(max(order_no), 0) + 1 from public.class_lessons where class_id = target_class),
        now());
      raise notice 'Added % to the class.', bank.id;
    end if;
  end if;
${
  dailySource
    ? `  perform public.set_daily_practice(bank.owner_id, target_class, c.daily_practice_size, bank.id,
      c.daily_listening_count, c.daily_practice_format)
    from public.classes c where c.id = target_class and c.daily_practice_size is not null;
  if not found then
    raise exception 'Turn daily practice on for the class before making the bank its source.';
  end if;
`
    : ""
}end
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
${commit ? "commit;" : "rollback;"}
`;
}
