begin;

-- Sample lessons loaded into a local project keep their review notice. The import script's
-- nine named arguments still resolve because the new flag has a default.
drop function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb);

create function public.publish_lesson(
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
  insert into public.lesson_versions(id, lesson_id, version_no, title, title_ja, summary, order_no, course_id, is_sample, content)
    values(version_id, p_lesson_id, next_version, p_title, p_title_ja, p_summary, p_order_no, p_course_id, coalesce(p_is_sample, false), p_content);
  update public.lessons set published_version_id = version_id, visibility = 'public' where id = p_lesson_id;
  return version_id;
end;
$$;

revoke all on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) to service_role;

commit;
