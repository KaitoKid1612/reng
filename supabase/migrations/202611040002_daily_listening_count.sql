-- A class chooses how many listening questions its daily set takes from a source lesson that has
-- some: null keeps them in proportion to the lesson (the rule so far), 0 leaves them out, and n
-- takes up to n, the rest of the set coming from the lesson's other questions.
begin;

alter table public.classes add column daily_listening_count integer
  check (daily_listening_count between 0 and 10);

-- The new argument has a default, so a caller that still passes four arguments keeps working
-- (and leaves the class on the proportional rule).
drop function public.set_daily_practice(uuid, uuid, integer, text);
create function public.set_daily_practice(
  p_teacher_id uuid, p_class_id uuid, p_size integer, p_lesson_id text default null,
  p_listening_count integer default null
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_size is not null and p_size not between 3 and 60 then
    raise exception 'reng:invalid_input';
  end if;
  if p_listening_count is not null and p_listening_count not between 0 and 10 then
    raise exception 'reng:invalid_input';
  end if;
  if not exists (select 1 from public.classes where id = p_class_id and teacher_id = p_teacher_id) then
    raise exception 'reng:class_not_found';
  end if;
  if p_lesson_id is not null and not exists (
    select 1 from public.class_lessons where class_id = p_class_id and lesson_id = p_lesson_id
  ) then
    raise exception 'reng:lesson_not_in_class';
  end if;
  update public.classes
    set daily_practice_size = p_size, daily_practice_lesson_id = p_lesson_id,
      daily_listening_count = p_listening_count
    where id = p_class_id and teacher_id = p_teacher_id;
end;
$$;
revoke all on function public.set_daily_practice(uuid, uuid, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.set_daily_practice(uuid, uuid, integer, text, integer)
  to service_role;

commit;
