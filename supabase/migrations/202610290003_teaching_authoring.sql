-- Template-based authoring for schema v2 lessons. Answer reviews are server-owned hashes of the
-- saved question, so any later edit of a question invalidates its review.
begin;

alter table public.lessons
  add column authoring_state jsonb not null default '{}'::jsonb check (jsonb_typeof(authoring_state) = 'object'),
  add column creation_request_id uuid,
  add column creation_fingerprint text;
create unique index lesson_creation_request_idx on public.lessons(owner_id, creation_request_id)
  where creation_request_id is not null;

create function public.create_teaching_lesson(
  p_teacher_id uuid, p_request_id uuid, p_title text, p_order integer, p_content jsonb, p_authoring jsonb
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  new_lesson_id text := 'lesson-' || replace(gen_random_uuid()::text, '-', '');
  fingerprint text := md5(jsonb_build_object('title', p_title, 'order', p_order, 'content', p_content, 'authoring', p_authoring)::text);
  existing public.lessons%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_teacher_id and role = 'teacher') then
    raise exception 'masu:not_found';
  end if;
  if p_request_id is null or p_content ->> 'schemaVersion' is distinct from '2'
    or length(coalesce(p_title, '')) > 160 or p_order is null or p_order not between 1 and 999 then
    raise exception 'masu:invalid_draft';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('create:' || p_teacher_id::text || ':' || p_request_id::text, 0));
  select * into existing from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id;
  if found then
    if existing.creation_fingerprint is distinct from fingerprint then
      raise exception 'masu:request_conflict';
    end if;
    return existing.id;
  end if;
  if (select count(*) from public.lessons where owner_id = p_teacher_id and archived_at is null) >= 2000 then
    raise exception 'masu:quota_exceeded';
  end if;
  insert into public.lessons(id, owner_id, title, title_ja, summary, order_no, course_id, draft_content,
      authoring_state, creation_request_id, creation_fingerprint)
    values (new_lesson_id, p_teacher_id, p_title, '', '', p_order, 'chinese', p_content,
      p_authoring - 'reviewedQuestions', p_request_id, fingerprint);
  return new_lesson_id;
end;
$$;
revoke all on function public.create_teaching_lesson(uuid, uuid, text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_teaching_lesson(uuid, uuid, text, integer, jsonb, jsonb) to service_role;

create function public.get_teaching_editor(p_teacher_id uuid, p_lesson_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  lesson public.lessons%rowtype;
begin
  select l.* into lesson from public.lessons l join public.profiles p on p.id = l.owner_id
    where l.id = p_lesson_id and l.owner_id = p_teacher_id and l.archived_at is null and p.role = 'teacher';
  if not found or lesson.draft_content ->> 'schemaVersion' is distinct from '2' then
    return null;
  end if;
  return jsonb_build_object(
    'lessonId', lesson.id, 'title', lesson.title, 'order', lesson.order_no,
    'revision', lesson.draft_revision, 'savedAt', lesson.updated_at,
    'publishedVersionId', lesson.published_version_id, 'visibility', lesson.visibility,
    'versionCount', (select count(*) from public.lesson_versions v where v.lesson_id = lesson.id),
    'content', lesson.draft_content, 'authoring', lesson.authoring_state - 'reviewedQuestions',
    'reviewedIds', coalesce((
      select jsonb_agg(q ->> 'id') from jsonb_array_elements(lesson.draft_content -> 'questions') q
      where lesson.authoring_state -> 'reviewedQuestions' ->> (q ->> 'id') = md5(q::text)
    ), '[]'::jsonb));
end;
$$;
revoke all on function public.get_teaching_editor(uuid, text) from public, anon, authenticated;
grant execute on function public.get_teaching_editor(uuid, text) to service_role;

create function public.save_teaching_draft(
  p_teacher_id uuid, p_lesson_id text, p_expected_revision integer, p_title text, p_order integer,
  p_content jsonb, p_authoring jsonb, p_confirmed_ids text[] default '{}'
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  lesson public.lessons%rowtype;
  reviews jsonb;
  question_id text;
  question jsonb;
begin
  select l.* into lesson from public.lessons l join public.profiles p on p.id = l.owner_id
    where l.id = p_lesson_id and l.owner_id = p_teacher_id and l.archived_at is null and p.role = 'teacher'
    for update of l;
  if not found then
    raise exception 'masu:not_found';
  end if;
  if lesson.draft_content ->> 'schemaVersion' is distinct from '2' or p_content ->> 'schemaVersion' is distinct from '2'
    or jsonb_typeof(p_content -> 'questions') is distinct from 'array'
    or length(coalesce(p_title, '')) > 160 or p_order is null or p_order not between 1 and 999 then
    raise exception 'masu:invalid_draft';
  end if;
  if lesson.draft_revision is distinct from p_expected_revision then
    raise exception 'masu:revision_conflict';
  end if;
  -- Keep reviews only for questions that still exist; stale hashes simply stop matching.
  select coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb) into reviews
    from jsonb_each(coalesce(lesson.authoring_state -> 'reviewedQuestions', '{}'::jsonb)) entry
    where exists (select 1 from jsonb_array_elements(p_content -> 'questions') q where q ->> 'id' = entry.key);
  foreach question_id in array coalesce(p_confirmed_ids, '{}') loop
    select q into question from jsonb_array_elements(p_content -> 'questions') q where q ->> 'id' = question_id;
    if not found then
      raise exception 'masu:invalid_items';
    end if;
    reviews := jsonb_set(reviews, array[question_id], to_jsonb(md5(question::text)));
  end loop;
  update public.lessons set title = p_title, order_no = p_order, draft_content = p_content,
    authoring_state = (p_authoring - 'reviewedQuestions') || jsonb_build_object('reviewedQuestions', reviews),
    draft_revision = draft_revision + 1, updated_at = now()
    where id = p_lesson_id;
  if cardinality(p_confirmed_ids) > 0 then
    insert into public.audit_events(actor_id, action, resource_id)
      values (p_teacher_id, 'lesson.questions_reviewed', p_lesson_id);
  end if;
  return public.get_teaching_editor(p_teacher_id, p_lesson_id);
end;
$$;
revoke all on function public.save_teaching_draft(uuid, text, integer, text, integer, jsonb, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.save_teaching_draft(uuid, text, integer, text, integer, jsonb, jsonb, text[]) to service_role;

-- Schema v2 publishes exactly the saved draft and only when every question's current content
-- has a server-side review. Visibility stays an explicit owner choice, as in 202610290001.
create or replace function public.publish_lesson(
  p_lesson_id text, p_owner_id uuid, p_expected_revision integer,
  p_title text, p_title_ja text, p_summary text, p_order_no integer,
  p_course_id text, p_content jsonb, p_is_sample boolean default false
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  current_lesson public.lessons%rowtype;
  next_version integer;
  version_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where id = p_owner_id and role = 'teacher') then
    raise exception 'Owner must be a teacher';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or jsonb_typeof(p_content) is distinct from 'object' or coalesce(p_content ->> 'schemaVersion', '') not in ('1', '2') then
    raise exception 'Invalid revision or content contract';
  end if;
  insert into public.lessons(id, owner_id, order_no, title, title_ja, summary, course_id)
    values(p_lesson_id, p_owner_id, p_order_no, p_title, p_title_ja, p_summary, p_course_id)
    on conflict (id) do nothing;
  select * into current_lesson from public.lessons where id = p_lesson_id for update;
  if current_lesson.owner_id <> p_owner_id or current_lesson.draft_revision <> p_expected_revision then
    raise exception 'Owner or revision conflict';
  end if;
  if p_content ->> 'schemaVersion' = '2' then
    if p_content is distinct from current_lesson.draft_content then
      raise exception 'masu:save_before_publish';
    end if;
    if exists (select 1 from jsonb_array_elements(p_content -> 'questions') q
      where current_lesson.authoring_state -> 'reviewedQuestions' ->> (q ->> 'id') is distinct from md5(q::text)) then
      raise exception 'masu:review_required';
    end if;
  end if;
  select coalesce(max(version_no), 0) + 1 into next_version from public.lesson_versions where lesson_id = p_lesson_id;
  update public.lessons set title = p_title, title_ja = p_title_ja, summary = p_summary,
    order_no = p_order_no, course_id = p_course_id, draft_content = p_content,
    draft_revision = draft_revision + 1, updated_at = now()
    where id = p_lesson_id;
  insert into public.lesson_versions(id, lesson_id, version_no, title, title_ja, summary, order_no, course_id, is_sample, content)
    values(version_id, p_lesson_id, next_version, p_title, p_title_ja, p_summary, p_order_no, p_course_id, coalesce(p_is_sample, false), p_content);
  update public.lessons set published_version_id = version_id where id = p_lesson_id;
  return version_id;
end;
$$;
revoke all on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) to service_role;

commit;
