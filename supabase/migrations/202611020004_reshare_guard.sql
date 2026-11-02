-- A copy of another teacher's shared lesson stays out of public pages (CR-07). The rule now lives
-- in the database like the re-share check in share_lesson, and copies made public before the
-- application checked it return to class visibility.
begin;

create or replace function public.set_lesson_visibility(p_owner_id uuid, p_lesson_id text, p_visibility text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_visibility not in ('public', 'class') then raise exception 'reng:invalid_visibility'; end if;
  if p_visibility = 'public' and exists (
    select 1 from public.lessons
    where id = p_lesson_id and owner_id = p_owner_id and copied_from_version_id is not null
  ) then
    raise exception 'reng:reshare_not_allowed';
  end if;
  update public.lessons set visibility = p_visibility where id = p_lesson_id and owner_id = p_owner_id
    and exists(select 1 from public.profiles where id = p_owner_id and role = 'teacher');
  if not found then raise exception 'reng:lesson_not_found'; end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values(p_owner_id, 'lesson.visibility.' || p_visibility, p_lesson_id);
end;
$$;

update public.lessons set visibility = 'class'
  where copied_from_version_id is not null and visibility = 'public';

commit;
