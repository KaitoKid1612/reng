begin;

alter table public.lessons add column summary text not null default '';
alter table public.lessons add column title_ja text not null default '';
alter table public.lesson_versions add column summary text not null default '';
alter table public.lesson_versions add column title_ja text not null default '';
alter table public.lesson_versions add column order_no integer not null default 1 check (order_no > 0);
alter table public.lesson_versions add column course_id text not null default 'n5';
alter table public.lesson_versions add column is_sample boolean not null default false;

-- Called only by the server-side import tool after validating the content contract.
create function public.publish_lesson(
  p_lesson_id text, p_owner_id uuid, p_expected_revision integer,
  p_title text, p_title_ja text, p_summary text, p_order_no integer,
  p_course_id text, p_content jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  current_lesson public.lessons%rowtype;
  next_version integer;
  version_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where id = p_owner_id and role = 'teacher') then
    raise exception 'Owner must be a teacher';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or jsonb_typeof(p_content) is distinct from 'object' or p_content ->> 'schemaVersion' is distinct from '1' then
    raise exception 'Invalid revision or content contract';
  end if;
  insert into public.lessons(id, owner_id, order_no, title, title_ja, summary, course_id)
    values(p_lesson_id, p_owner_id, p_order_no, p_title, p_title_ja, p_summary, p_course_id)
    on conflict (id) do nothing;
  select * into current_lesson from public.lessons where id = p_lesson_id for update;
  if current_lesson.owner_id <> p_owner_id or current_lesson.draft_revision <> p_expected_revision then
    raise exception 'Owner or revision conflict';
  end if;
  select coalesce(max(version_no), 0) + 1 into next_version from public.lesson_versions where lesson_id = p_lesson_id;
  update public.lessons set title = p_title, title_ja = p_title_ja, summary = p_summary,
    order_no = p_order_no, course_id = p_course_id, draft_content = p_content,
    draft_revision = draft_revision + 1, updated_at = now()
    where id = p_lesson_id;
  insert into public.lesson_versions(id, lesson_id, version_no, title, title_ja, summary, order_no, course_id, content)
    values(version_id, p_lesson_id, next_version, p_title, p_title_ja, p_summary, p_order_no, p_course_id, p_content);
  update public.lessons set published_version_id = version_id, visibility = 'public' where id = p_lesson_id;
  return version_id;
end;
$$;

revoke all on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb) to service_role;

commit;
