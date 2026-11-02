-- A teacher who also studies practises in a self-study class, whose only learner is its owner.
-- A teaching class never takes its owner as a learner (CR-20): joining it with its own code is
-- refused, and an owner who joined before this check does not count for seats or wrong-answer
-- statistics.
begin;

alter table public.classes add column self_study boolean not null default false;

create function public.enroll_self_study_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.enrollments(class_id, user_id) values (new.id, new.teacher_id);
  return new;
end;
$$;
create trigger self_study_owner_enrollment after insert on public.classes
  for each row when (new.self_study) execute function public.enroll_self_study_owner();

create or replace function public.join_class(p_user_id uuid, p_code text)
returns table(status text, class_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  v_class_id uuid;
  v_teacher_id uuid;
  v_self_study boolean;
  v_left_at timestamptz;
  v_is_member boolean;
  v_capacity integer;
begin
  if not exists (select 1 from public.profiles p where p.id = p_user_id ) then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('join:' || p_user_id::text, 0));
  if (
    select count(*) from public.join_attempts a
    where a.user_id = p_user_id and not a.succeeded and a.attempted_at > now() - interval '15 minutes'
  ) >= 8 then
    return query select 'rate_limited'::text, null::uuid;
    return;
  end if;
  select c.id, c.capacity, c.teacher_id, c.self_study
    into v_class_id, v_capacity, v_teacher_id, v_self_study
    from public.classes c
    where c.join_code = p_code and c.join_enabled and c.active for update;
  -- A self-study class takes nobody else, so its code counts as unknown for anyone but the owner.
  if v_self_study and v_teacher_id <> p_user_id then
    v_class_id := null;
  end if;
  insert into public.join_attempts(user_id, succeeded) values (p_user_id, v_class_id is not null);
  if v_class_id is null then
    return query select 'invalid_code'::text, null::uuid;
    return;
  end if;
  if v_teacher_id = p_user_id and not v_self_study then
    return query select 'own_class'::text, v_class_id;
    return;
  end if;
  select true, e.left_at into v_is_member, v_left_at from public.enrollments e
    where e.class_id = v_class_id and e.user_id = p_user_id for update;
  if v_is_member and v_left_at is null then
    return query select 'already_member'::text, v_class_id;
    return;
  end if;
  if v_capacity is not null and (
    select count(*) from public.enrollments e
    where e.class_id = v_class_id and e.left_at is null and e.user_id <> v_teacher_id
  ) >= v_capacity then
    return query select 'class_full'::text, null::uuid;
    return;
  end if;
  if v_is_member then
    update public.enrollments e set joined_at = now(), left_at = null
      where e.class_id = v_class_id and e.user_id = p_user_id;
  else
    insert into public.enrollments(class_id, user_id) values (v_class_id, p_user_id);
  end if;
  return query select 'joined'::text, v_class_id;
end;
$$;

create or replace function public.guard_class_capacity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.capacity is not null and (
    select count(*) from public.enrollments e
    where e.class_id = new.id and e.left_at is null and (new.self_study or e.user_id <> new.teacher_id)
  ) > new.capacity then
    raise exception 'reng:capacity_below_members';
  end if;
  return new;
end;
$$;

create or replace function public.assignment_question_stats(p_assignment_id uuid)
returns table(question_id text, prompt text, wrong_count bigint, total_count bigint)
language sql stable security invoker set search_path = '' as $$
  with latest as (
    select distinct on (s.user_id) s.id, s.assignment_id, s.user_id
    from public.submissions s
    join public.assignments x on x.id = s.assignment_id
    join public.classes c on c.id = x.class_id
    where s.assignment_id = p_assignment_id and s.status = 'submitted'
      and (c.self_study or s.user_id <> c.teacher_id)
    order by s.user_id, s.submitted_at desc, s.attempt_no desc
  )
  select i.question_id, i.question_snapshot ->> 'prompt',
    count(*) filter (where not a.is_correct), count(*)
  from latest s
  join public.answers a on a.submission_id = s.id
  join public.assignment_items i on i.assignment_id = s.assignment_id and i.question_id = a.question_id
  group by i.question_id, i.question_snapshot ->> 'prompt', i.position
  having count(*) filter (where not a.is_correct) >= count(*) * 0.5
  order by count(*) filter (where not a.is_correct) desc, i.position;
$$;

commit;
