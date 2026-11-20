-- New lessons get a readable ID such as minna-1-18-a8e144 (course, order, six random hex
-- characters) instead of lesson-<32 hex>. Lesson IDs are shared by every teacher and appear in
-- links, so the suffix keeps them unique; existing lessons keep their IDs.
begin;

create function public.new_lesson_id(p_course_id text, p_order integer)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  course text := trim(both '-' from regexp_replace(lower(coalesce(p_course_id, '')), '[^a-z0-9]+', '-', 'g'));
  candidate text;
begin
  if course = '' then
    course := 'lesson';
  end if;
  loop
    candidate := left(course, 40) || '-' || greatest(coalesce(p_order, 1), 1)::text || '-'
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    exit when not exists (select 1 from public.lessons where id = candidate);
  end loop;
  return candidate;
end;
$$;
revoke all on function public.new_lesson_id(text, integer) from public, anon, authenticated;
grant execute on function public.new_lesson_id(text, integer) to service_role;

create or replace function public.create_teaching_lesson(
  p_teacher_id uuid, p_request_id uuid, p_title text, p_order integer, p_content jsonb, p_authoring jsonb
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  new_lesson_id text;
  fingerprint text := md5(jsonb_build_object('title', p_title, 'order', p_order, 'content', p_content, 'authoring', p_authoring)::text);
  existing public.lessons%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_teacher_id and role = 'teacher') then
    raise exception 'reng:not_found';
  end if;
  if p_request_id is null or p_content ->> 'schemaVersion' is distinct from '2'
    or length(coalesce(p_title, '')) > 160 or p_order is null or p_order not between 1 and 999 then
    raise exception 'reng:invalid_draft';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('create:' || p_teacher_id::text || ':' || p_request_id::text, 0));
  select * into existing from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id;
  if found then
    if existing.creation_fingerprint is distinct from fingerprint then
      raise exception 'reng:request_conflict';
    end if;
    return existing.id;
  end if;
  if (select count(*) from public.lessons where owner_id = p_teacher_id and archived_at is null) >= 2000 then
    raise exception 'reng:quota_exceeded';
  end if;
  new_lesson_id := public.new_lesson_id('chinese', p_order);
  insert into public.lessons(id, owner_id, title, title_ja, summary, order_no, course_id, draft_content,
      authoring_state, creation_request_id, creation_fingerprint)
    values (new_lesson_id, p_teacher_id, p_title, '', '', p_order, 'chinese', p_content,
      p_authoring - 'reviewedQuestions', p_request_id, fingerprint);
  return new_lesson_id;
end;
$$;

create or replace function public.insert_lesson_copy(
  p_teacher_id uuid, p_request_id uuid, p_fingerprint text, p_title text, p_title_ja text,
  p_summary text, p_order integer, p_course_id text, p_content jsonb, p_authoring jsonb,
  p_source_version_id uuid, p_attribution text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  new_lesson_id text;
  existing public.lessons%rowtype;
begin
  if p_request_id is null then
    raise exception 'reng:invalid_input';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('create:' || p_teacher_id::text || ':' || p_request_id::text, 0));
  select * into existing from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id;
  if found then
    if existing.creation_fingerprint is distinct from p_fingerprint then
      raise exception 'reng:request_conflict';
    end if;
    return existing.id;
  end if;
  if (select count(*) from public.lessons where owner_id = p_teacher_id and archived_at is null) >= 2000 then
    raise exception 'reng:quota_exceeded';
  end if;
  new_lesson_id := public.new_lesson_id(p_course_id, p_order);
  insert into public.lessons(id, owner_id, title, title_ja, summary, order_no, course_id, draft_content,
      authoring_state, creation_request_id, creation_fingerprint, copied_from_version_id, copy_attribution)
    values (new_lesson_id, p_teacher_id, p_title, p_title_ja, p_summary, greatest(p_order, 1), p_course_id,
      p_content, p_authoring, p_request_id, p_fingerprint, p_source_version_id, p_attribution);
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_teacher_id, 'lesson.copied', new_lesson_id);
  return new_lesson_id;
end;
$$;

commit;
