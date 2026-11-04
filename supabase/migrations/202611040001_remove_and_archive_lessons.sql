-- Teachers can take a lesson out of a class it was put into by mistake, and archive lessons they no
-- longer use (the lesson quota already counts only lessons that are not archived).
begin;

-- Removing a lesson unlinks it from the class's session log; only those columns may change.
grant update (lesson_id, lesson_version_id, slide_reached) on public.class_sessions to service_role;

-- Assignments keep their lesson link, so a lesson with assignments in the class stays. The class's
-- session log keeps its notes without the lesson, and a daily practice pinned to the lesson goes
-- back to the automatic choice.
create function public.remove_class_lesson(p_teacher_id uuid, p_class_id uuid, p_lesson_id text)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.classes c
    where c.id = p_class_id and c.teacher_id = p_teacher_id
    for update;
  if not found then
    raise exception 'reng:class_not_found';
  end if;
  if not exists (
    select 1 from public.class_lessons cl where cl.class_id = p_class_id and cl.lesson_id = p_lesson_id
  ) then
    return 'not_in_class';
  end if;
  if exists (
    select 1 from public.assignments a where a.class_id = p_class_id and a.lesson_id = p_lesson_id
  ) then
    return 'has_assignments';
  end if;
  update public.classes set daily_practice_lesson_id = null
    where id = p_class_id and daily_practice_lesson_id = p_lesson_id;
  update public.class_sessions set lesson_id = null, lesson_version_id = null, slide_reached = null
    where class_id = p_class_id and lesson_id = p_lesson_id;
  delete from public.class_lessons where class_id = p_class_id and lesson_id = p_lesson_id;
  return 'removed';
end;
$$;
revoke all on function public.remove_class_lesson(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.remove_class_lesson(uuid, uuid, text) to service_role;

-- An archived lesson can no longer be read (read_lesson_version skips it), so a lesson still in
-- an active class is not archived. Restoring respects the same 2000-lesson cap as creating.
create function public.set_lesson_archived(p_teacher_id uuid, p_lesson_id text, p_archived boolean)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.lessons l
    join public.profiles p on p.id = l.owner_id and p.role = 'teacher'
    where l.id = p_lesson_id and l.owner_id = p_teacher_id
    for update of l;
  if not found then
    raise exception 'reng:lesson_not_found';
  end if;
  if p_archived then
    if exists (
      select 1 from public.class_lessons cl
        join public.classes c on c.id = cl.class_id and c.active
        where cl.lesson_id = p_lesson_id
    ) then
      return 'in_class';
    end if;
    update public.lessons set archived_at = now(), updated_at = now()
      where id = p_lesson_id and archived_at is null;
    return 'archived';
  end if;
  if exists (select 1 from public.lessons where id = p_lesson_id and archived_at is not null)
    and (select count(*) from public.lessons where owner_id = p_teacher_id and archived_at is null)
      >= 2000 then
    return 'quota_exceeded';
  end if;
  update public.lessons set archived_at = null, updated_at = now() where id = p_lesson_id;
  return 'restored';
end;
$$;
revoke all on function public.set_lesson_archived(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.set_lesson_archived(uuid, text, boolean) to service_role;

commit;
