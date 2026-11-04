-- Canonical v1 vocabulary: absent kanji means no written form; JSON null is invalid.
-- Repair only that optional key, including already-pinned versions, without republishing.
begin;
set local lock_timeout = '5s';
lock table public.lessons, public.lesson_versions in access exclusive mode;

do $repair$
declare
  lesson record;
  version record;
  normalized jsonb;
begin
  if not exists (select 1 from pg_trigger
      where tgrelid = 'public.lesson_versions'::regclass
        and tgname = 'immutable_lesson_version' and tgenabled = 'O') then
    raise exception 'Kanji normalization requires the enabled version guard';
  end if;

  for lesson in select * from public.lessons
      where draft_content ->> 'schemaVersion' = '1'
        and jsonb_path_exists(draft_content, '$.vocab[*].kanji ? (@ == null)')
  loop
    select jsonb_set(lesson.draft_content, '{vocab}', jsonb_agg(
      case when word.value -> 'kanji' = 'null'::jsonb
        then word.value - 'kanji' else word.value end order by word.ordinality))
      into normalized
      from jsonb_array_elements(lesson.draft_content -> 'vocab')
        with ordinality word(value, ordinality);
    update public.lessons set draft_content = normalized,
      draft_revision = draft_revision + 1, updated_at = now() where id = lesson.id;
    insert into public.audit_events(actor_id, action, resource_id)
      values (lesson.owner_id, 'lesson.kanji_normalized', lesson.id);
  end loop;

  -- Owner-authorized representation repair. The table lock prevents concurrent writers
  -- while this guard is open; any failure rolls back both the data and trigger state.
  alter table public.lesson_versions disable trigger immutable_lesson_version;
  for version in select v.*, l.owner_id from public.lesson_versions v
      join public.lessons l on l.id = v.lesson_id
      where v.content ->> 'schemaVersion' = '1'
        and jsonb_path_exists(v.content, '$.vocab[*].kanji ? (@ == null)')
  loop
    select jsonb_set(version.content, '{vocab}', jsonb_agg(
      case when word.value -> 'kanji' = 'null'::jsonb
        then word.value - 'kanji' else word.value end order by word.ordinality))
      into normalized
      from jsonb_array_elements(version.content -> 'vocab')
        with ordinality word(value, ordinality);
    update public.lesson_versions set content = normalized where id = version.id;
    insert into public.audit_events(actor_id, action, resource_id)
      values (version.owner_id, 'lesson_version.kanji_normalized', version.id::text);
  end loop;
  alter table public.lesson_versions enable trigger immutable_lesson_version;
end;
$repair$;

-- Keep the strict application contract at direct SQL, RPC and copy boundaries too.
alter table public.lessons add constraint lessons_v1_kanji_string check (
  draft_content ->> 'schemaVersion' <> '1' or not jsonb_path_exists(
    draft_content, '$.vocab[*] ? (exists(@.kanji) && @.kanji.type() != "string")')
);
alter table public.lesson_versions add constraint lesson_versions_v1_kanji_string check (
  content ->> 'schemaVersion' <> '1' or not jsonb_path_exists(
    content, '$.vocab[*] ? (exists(@.kanji) && @.kanji.type() != "string")')
);
commit;
