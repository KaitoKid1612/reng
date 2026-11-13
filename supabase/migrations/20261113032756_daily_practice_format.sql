-- A class chooses how its daily set is laid out: 'balanced' keeps each kind of question in
-- proportion to the source lesson (the rule so far); 'jlpt-n4' and 'jlpt-n5' take each part of
-- the JLPT test in its count and order. Existing classes stay balanced.
begin;

alter table public.classes add column daily_practice_format text not null default 'balanced'
  check (daily_practice_format in ('balanced', 'jlpt-n4', 'jlpt-n5'));

-- The format argument has a default and null keeps the class's format, so a caller that still
-- passes five arguments (the web before this change, the sheet import) leaves it as it is.
drop function public.set_daily_practice(uuid, uuid, integer, text, integer);
create function public.set_daily_practice(
  p_teacher_id uuid, p_class_id uuid, p_size integer, p_lesson_id text default null,
  p_listening_count integer default null, p_format text default null
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_size is not null and p_size not between 3 and 70 then
    raise exception 'reng:invalid_input';
  end if;
  if p_listening_count is not null and p_listening_count not between 0 and 10 then
    raise exception 'reng:invalid_input';
  end if;
  if p_format is not null and p_format not in ('balanced', 'jlpt-n4', 'jlpt-n5') then
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
      daily_listening_count = p_listening_count,
      daily_practice_format = coalesce(p_format, daily_practice_format)
    where id = p_class_id and teacher_id = p_teacher_id;
end;
$$;
revoke all on function public.set_daily_practice(uuid, uuid, integer, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.set_daily_practice(uuid, uuid, integer, text, integer, text)
  to service_role;

commit;
