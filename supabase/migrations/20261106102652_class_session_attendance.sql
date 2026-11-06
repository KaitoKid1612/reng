-- Attendance in the teaching log: for a recorded session, which learners took part and which did
-- not. A row exists for each learner the teacher marked, so a session with rows has attendance
-- taken (even when everyone was absent), and a learner who joined later has no row for earlier
-- sessions. Only the server writes it, through save_session_attendance after checking the class
-- owner; learners never read it. class_sessions itself is unchanged, so the web app keeps working
-- before this migration is applied.
begin;

create table public.class_session_attendance (
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  is_present boolean not null,
  marked_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index class_session_attendance_user_idx on public.class_session_attendance(user_id);
alter table public.class_session_attendance enable row level security;
revoke all on public.class_session_attendance from anon, authenticated;
grant select, insert, update on public.class_session_attendance to service_role;

-- Marks the listed learners present or absent for one session of the teacher's own class. Every
-- listed learner must be (or have been) a member of the class; learners not listed keep their
-- earlier mark, so a learner who has left the class keeps the sessions they attended.
create function public.save_session_attendance(
  p_teacher_id uuid, p_class_id uuid, p_session_id uuid, p_present_ids uuid[], p_absent_ids uuid[]
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  perform 1 from public.classes c
    join public.profiles p on p.id = c.teacher_id and p.role = 'teacher'
    where c.id = p_class_id and c.teacher_id = p_teacher_id
    for update of c;
  if not found then
    raise exception 'reng:class_not_found';
  end if;
  if not exists (
    select 1 from public.class_sessions s where s.id = p_session_id and s.class_id = p_class_id
  ) then
    raise exception 'reng:not_found';
  end if;
  if p_present_ids is null or p_absent_ids is null
    or cardinality(p_present_ids) + cardinality(p_absent_ids) > 1000
    or p_present_ids && p_absent_ids
    or exists (
      select 1 from unnest(p_present_ids || p_absent_ids) as listed(user_id)
      where not exists (
        select 1 from public.enrollments e
        where e.class_id = p_class_id and e.user_id = listed.user_id
      )
    ) then
    raise exception 'reng:invalid_request';
  end if;
  insert into public.class_session_attendance(session_id, user_id, is_present)
    select p_session_id, listed.user_id, listed.is_present
    from (
      select distinct unnest(p_present_ids) as user_id, true as is_present
      union all
      select distinct unnest(p_absent_ids), false
    ) listed
    on conflict (session_id, user_id) do update
      set is_present = excluded.is_present, marked_at = now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.save_session_attendance(uuid, uuid, uuid, uuid[], uuid[])
  from public, anon, authenticated;
grant execute on function public.save_session_attendance(uuid, uuid, uuid, uuid[], uuid[])
  to service_role;

commit;
