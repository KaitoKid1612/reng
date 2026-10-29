-- Daily practice: a class can receive one practice assignment per Vietnam calendar day, drawn
-- from its newest open lesson. The run table keeps the morning job and the teacher's manual
-- button from creating two assignments for the same day.
begin;

alter table public.classes
  add column daily_practice_size integer check (daily_practice_size between 3 and 20);

create table public.daily_practice_runs (
  class_id uuid not null references public.classes(id),
  practice_date date not null,
  assignment_id uuid not null unique references public.assignments(id),
  created_at timestamptz not null default now(),
  primary key (class_id, practice_date)
);
alter table public.daily_practice_runs enable row level security;
revoke all on public.daily_practice_runs from anon, authenticated;
grant select, insert on public.daily_practice_runs to service_role;

create function public.set_daily_practice(p_teacher_id uuid, p_class_id uuid, p_size integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_size is not null and p_size not between 3 and 20 then
    raise exception 'reng:invalid_input';
  end if;
  update public.classes set daily_practice_size = p_size
    where id = p_class_id and teacher_id = p_teacher_id;
  if not found then
    raise exception 'reng:class_not_found';
  end if;
end;
$$;
revoke all on function public.set_daily_practice(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.set_daily_practice(uuid, uuid, integer) to service_role;

-- A retry for the same class and day returns the assignment created first. Questions are chosen
-- by the server from the pinned version; publish_assignment re-checks them and the due time.
create function public.publish_daily_practice(
  p_class_id uuid, p_practice_date date, p_lesson_id text, p_question_ids text[], p_due_at timestamptz
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  existing_assignment uuid;
  class_row public.classes%rowtype;
  new_assignment uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('daily:' || p_class_id::text || ':' || p_practice_date::text, 0));
  select assignment_id into existing_assignment from public.daily_practice_runs
    where class_id = p_class_id and practice_date = p_practice_date;
  if found then
    return existing_assignment;
  end if;
  select * into class_row from public.classes
    where id = p_class_id and active and daily_practice_size is not null;
  if not found then
    raise exception 'reng:class_not_found';
  end if;
  new_assignment := public.publish_assignment(
    class_row.teacher_id, p_class_id, p_lesson_id,
    'Luyện tập hằng ngày ' || to_char(p_practice_date, 'DD/MM'),
    'practice', p_due_at, true, class_row.pass_score, 3, 'after_submit', p_question_ids, null);
  insert into public.daily_practice_runs(class_id, practice_date, assignment_id)
    values (p_class_id, p_practice_date, new_assignment);
  return new_assignment;
end;
$$;
revoke all on function public.publish_daily_practice(uuid, date, text, text[], timestamptz) from public, anon, authenticated;
grant execute on function public.publish_daily_practice(uuid, date, text, text[], timestamptz) to service_role;

commit;
