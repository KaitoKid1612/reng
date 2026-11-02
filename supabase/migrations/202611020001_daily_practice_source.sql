-- A class can pin the lesson its daily practice draws from, such as a review bank, so adding the
-- next lesson to the class no longer replaces it. Null keeps the previous rule: the newest open
-- lesson that has choice or fill questions.
begin;

alter table public.classes add column daily_practice_lesson_id text;
alter table public.classes add constraint classes_daily_practice_lesson_fkey
  foreign key (id, daily_practice_lesson_id) references public.class_lessons(class_id, lesson_id);

-- Existing classes keep drawing from the lesson their latest daily set used.
update public.classes c set daily_practice_lesson_id = latest.lesson_id
from (
  select distinct on (r.class_id) r.class_id, a.lesson_id
  from public.daily_practice_runs r
  join public.assignments a on a.id = r.assignment_id
  order by r.class_id, r.practice_date desc
) latest
where latest.class_id = c.id and c.daily_practice_size is not null;

drop function public.set_daily_practice(uuid, uuid, integer);
create function public.set_daily_practice(
  p_teacher_id uuid, p_class_id uuid, p_size integer, p_lesson_id text default null
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_size is not null and p_size not between 3 and 60 then
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
  update public.classes set daily_practice_size = p_size, daily_practice_lesson_id = p_lesson_id
    where id = p_class_id and teacher_id = p_teacher_id;
end;
$$;
revoke all on function public.set_daily_practice(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.set_daily_practice(uuid, uuid, integer, text) to service_role;

commit;
