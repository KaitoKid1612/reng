-- JLPT mock exams (09/11/2026): a test assignment drawn from a review bank by the exam's three
-- sections, with a time limit for each attempt counted from its start. The settings live in a
-- table of their own, so the web app keeps working before this migration is applied (it then
-- shows no mock exams) and the running app keeps working after it (assignments are unchanged).
--
-- An attempt of a timed exam closes one minute after its limit: the page hands it in at the limit
-- itself and the minute absorbs a slow connection. Saves and submits after that are refused like
-- a missed deadline, and the morning job, or the learner opening the exam again, hands in the
-- answers the server saved by then.
begin;

create table public.assignment_exams (
  assignment_id uuid primary key references public.assignments(id),
  level text not null check (level in ('N5', 'N4')),
  time_limit_minutes integer not null check (time_limit_minutes between 5 and 240),
  created_at timestamptz not null default now()
);
alter table public.assignment_exams enable row level security;
revoke all on public.assignment_exams from anon, authenticated;
grant select, insert on public.assignment_exams to service_role;

-- Written once, with its assignment, while that assignment is still a draft.
create function public.guard_assignment_exam() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.assignments a where a.id = new.assignment_id and a.status = 'draft'
  ) then
    raise exception 'reng:assignment_immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_assignment_exam() from public, anon, authenticated;
create trigger assignment_exam_guard before insert on public.assignment_exams
  for each row execute function public.guard_assignment_exam();

-- The test is built like a practice set (questions of the pinned version, accepted answer
-- variants included) but is a one-attempt test whose late work is refused.
create function public.publish_jlpt_mock_exam(
  p_teacher_id uuid, p_class_id uuid, p_lesson_id text, p_title text, p_level text,
  p_due_at timestamptz, p_time_limit_minutes integer, p_feedback_policy text,
  p_question_ids text[]
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_version_id uuid;
  v_questions jsonb;
  v_items jsonb;
  v_assignment_id uuid;
begin
  if not exists (
    select 1 from public.classes c join public.profiles p on p.id = c.teacher_id
    where c.id = p_class_id and c.teacher_id = p_teacher_id and p.role = 'teacher' and c.active
  ) then
    raise exception 'reng:class_not_found';
  end if;
  if p_level is null or p_level not in ('N5', 'N4')
    or p_time_limit_minutes is null or p_time_limit_minutes not between 5 and 240
    or p_feedback_policy is null or p_feedback_policy not in ('after_submit', 'after_due') then
    raise exception 'reng:invalid_input';
  end if;
  if p_due_at is null or p_due_at <= now() then
    raise exception 'reng:due_in_past';
  end if;
  select cl.lesson_version_id into v_version_id from public.class_lessons cl
    where cl.class_id = p_class_id and cl.lesson_id = p_lesson_id;
  if v_version_id is null then
    raise exception 'reng:lesson_not_in_class';
  end if;
  if coalesce(cardinality(p_question_ids), 0) not between 1 and 70
    or cardinality(p_question_ids) <> (select count(distinct id) from unnest(p_question_ids) id) then
    raise exception 'reng:invalid_items';
  end if;
  select v.content -> 'questions' into v_questions from public.lesson_versions v
    where v.id = v_version_id;
  select jsonb_agg(public.with_answer_variants(p_lesson_id, question.value) order by requested.position)
    into v_items
    from unnest(p_question_ids) with ordinality as requested(id, position)
    join jsonb_array_elements(v_questions) question on question.value ->> 'id' = requested.id;
  if coalesce(jsonb_array_length(v_items), 0) <> cardinality(p_question_ids) then
    raise exception 'reng:invalid_items';
  end if;
  -- The pass mark of the assignment is the exam's total pass mark out of 180 (80 for N5, 90 for
  -- N4); the section minimums are shown with the estimate on the results page.
  insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at,
      allow_late, pass_score, max_attempts, feedback_policy)
    values (p_class_id, p_lesson_id, v_version_id, btrim(p_title), 'test', p_due_at, false,
      case p_level when 'N5' then 45 else 50 end, 1, p_feedback_policy)
    returning id into v_assignment_id;
  insert into public.assignment_items(assignment_id, question_id, position, question_snapshot)
    select v_assignment_id, item.value ->> 'id', item.position::integer, item.value
    from jsonb_array_elements(v_items) with ordinality as item(value, position);
  insert into public.assignment_exams(assignment_id, level, time_limit_minutes)
    values (v_assignment_id, p_level, p_time_limit_minutes);
  update public.assignments a set status = 'published', published_at = now()
    where a.id = v_assignment_id;
  return v_assignment_id;
end;
$$;
revoke all on function public.publish_jlpt_mock_exam(uuid, uuid, text, text, text, timestamptz, integer, text, text[])
  from public, anon, authenticated;
grant execute on function public.publish_jlpt_mock_exam(uuid, uuid, text, text, text, timestamptz, integer, text, text[])
  to service_role;

-- 202610280004 plus the time limit of a mock exam.
create or replace function public.check_open_attempt(p_user_id uuid, p_submission_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_limit integer;
begin
  select s.* into v_submission from public.submissions s
    where s.id = p_submission_id and s.user_id = p_user_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_submission.status = 'submitted' then
    return 'submitted';
  end if;
  select a.* into v_assignment from public.assignments a where a.id = v_submission.assignment_id;
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = v_assignment.class_id and e.user_id = p_user_id and e.left_at is null
  ) then
    return 'not_found';
  end if;
  if v_assignment.status <> 'published'
    or not exists (select 1 from public.classes c where c.id = v_assignment.class_id and c.active) then
    return 'closed';
  end if;
  if v_assignment.due_at is not null and now() > v_assignment.due_at and not v_assignment.allow_late then
    return 'past_due';
  end if;
  select e.time_limit_minutes into v_limit from public.assignment_exams e
    where e.assignment_id = v_assignment.id;
  if v_limit is not null
    and now() > v_submission.started_at + make_interval(mins => v_limit) + interval '1 minute' then
    return 'past_due';
  end if;
  return 'open';
end;
$$;

-- 20261105012503 plus attempts of a mock exam whose time is up.
create or replace function public.list_expired_attempts(p_limit integer)
returns table(submission_id uuid, assignment_id uuid, draft_revision integer, draft_answers jsonb)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.assignment_id, s.draft_revision, s.draft_answers
  from public.submissions s
  join public.assignments a on a.id = s.assignment_id
  left join public.assignment_exams e on e.assignment_id = a.id
  where s.status = 'in_progress'
    and a.status = 'published'
    and (
      (a.due_at is not null and a.due_at < now() and not a.allow_late)
      or s.started_at + make_interval(mins => e.time_limit_minutes) + interval '1 minute' < now()
    )
    and exists (select 1 from public.classes c where c.id = a.class_id and c.active)
    and exists (
      select 1 from public.enrollments e2
      where e2.class_id = a.class_id and e2.user_id = s.user_id and e2.left_at is null
    )
    and not exists (
      select 1 from public.submissions earlier
      where earlier.assignment_id = s.assignment_id and earlier.user_id = s.user_id
        and earlier.status = 'submitted'
    )
  order by least(
      case when not a.allow_late then a.due_at end,
      s.started_at + make_interval(mins => e.time_limit_minutes)
    ), s.id
  limit greatest(least(p_limit, 500), 1);
$$;

-- 20261105012503 plus attempts of a mock exam whose time is up: handed in at the end of the time
-- limit (or the deadline, if that came first), and an after_due test keeps its mistakes hidden
-- until the deadline, as submit_attempt does.
create or replace function public.submit_expired_attempt(
  p_submission_id uuid, p_expected_revision integer, p_results jsonb, p_score integer,
  p_max_score integer, p_mistake_state jsonb, p_scheduler_version text
) returns table(status text)
language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_item_count integer;
  v_limit integer;
  v_handed_in_at timestamptz;
  v_closes_at timestamptz;
begin
  select s.* into v_submission from public.submissions s where s.id = p_submission_id for update;
  if not found then
    return query select 'not_found'::text;
    return;
  end if;
  if v_submission.status = 'submitted' then
    return query select 'already_submitted'::text;
    return;
  end if;
  select a.* into v_assignment from public.assignments a where a.id = v_submission.assignment_id;
  select e.time_limit_minutes into v_limit from public.assignment_exams e
    where e.assignment_id = v_assignment.id;
  v_handed_in_at := least(
    case when v_assignment.due_at is not null and not v_assignment.allow_late
      then v_assignment.due_at end,
    case when v_limit is not null
      then v_submission.started_at + make_interval(mins => v_limit) end
  );
  v_closes_at := least(
    case when v_assignment.due_at is not null and not v_assignment.allow_late
      then v_assignment.due_at end,
    case when v_limit is not null
      then v_submission.started_at + make_interval(mins => v_limit) + interval '1 minute' end
  );
  -- The conditions of list_expired_attempts, checked again under the row lock.
  if v_assignment.status <> 'published'
    or v_closes_at is null or now() <= v_closes_at
    or not exists (
      select 1 from public.classes c where c.id = v_assignment.class_id and c.active
    )
    or not exists (
      select 1 from public.enrollments e
      where e.class_id = v_assignment.class_id and e.user_id = v_submission.user_id
        and e.left_at is null
    )
    or exists (
      select 1 from public.submissions earlier
      where earlier.assignment_id = v_submission.assignment_id
        and earlier.user_id = v_submission.user_id and earlier.status = 'submitted'
    ) then
    return query select 'not_expired'::text;
    return;
  end if;
  if v_submission.draft_revision <> p_expected_revision then
    return query select 'conflict'::text;
    return;
  end if;
  -- The same result checks as submit_attempt (202610280006).
  select count(*) into v_item_count from public.assignment_items i
    where i.assignment_id = v_assignment.id;
  if jsonb_typeof(p_results) is distinct from 'array'
    or jsonb_array_length(p_results) <> v_item_count
    or (select count(distinct r.value ->> 'question_id') from jsonb_array_elements(p_results) r) <> v_item_count
    or exists (
      select 1 from jsonb_array_elements(p_results) r
      left join public.assignment_items i
        on i.assignment_id = v_assignment.id and i.question_id = r.value ->> 'question_id'
      where i.question_id is null
        or jsonb_typeof(r.value -> 'is_correct') is distinct from 'boolean'
        or jsonb_typeof(r.value -> 'points_earned') is distinct from 'number'
        or (r.value ->> 'points_earned')::numeric is distinct from (
          case when (r.value ->> 'is_correct')::boolean
            then (i.question_snapshot ->> 'points')::numeric else 0 end
        )
        or case
          when not (r.value ? 'listen_count') then false
          when jsonb_typeof(r.value -> 'listen_count') is distinct from 'number' then true
          else (r.value ->> 'listen_count')::numeric not between 0 and 100
            or (r.value ->> 'listen_count')::numeric % 1 <> 0
            or ((r.value ->> 'listen_count')::numeric > 0
              and i.question_snapshot ->> 'type' not in ('listen', 'dictation'))
        end
    )
    or p_score is distinct from (
      select sum((r.value ->> 'points_earned')::integer) from jsonb_array_elements(p_results) r
    )
    or p_max_score is distinct from (
      select sum((i.question_snapshot ->> 'points')::integer) from public.assignment_items i
      where i.assignment_id = v_assignment.id
    ) then
    return query select 'invalid_results'::text;
    return;
  end if;
  insert into public.answers(submission_id, question_id, raw, is_correct, points_earned,
      listen_count)
    select p_submission_id, r.value ->> 'question_id', coalesce(r.value -> 'raw', 'null'::jsonb),
      (r.value ->> 'is_correct')::boolean, (r.value ->> 'points_earned')::integer,
      coalesce((r.value ->> 'listen_count')::integer, 0)
    from jsonb_array_elements(p_results) r;
  -- Handed in when time ran out with what was saved by then: not late, and the draft stays.
  update public.submissions s set status = 'submitted',
      score = p_score, max_score = p_max_score,
      passed = p_score * 100 >= v_assignment.pass_score * p_max_score,
      is_late = false, submitted_at = v_handed_in_at
    where s.id = p_submission_id;
  insert into public.srs_cards(user_id, item_type, source_id, item_id, scheduler_version,
      scheduler_state, due)
    select v_submission.user_id, 'mistake', v_assignment.id::text, r.value ->> 'question_id',
      p_scheduler_version, p_mistake_state,
      case when v_assignment.feedback_policy = 'after_due'
        then greatest(now(), v_assignment.due_at) else now() end
    from jsonb_array_elements(p_results) r
    where not (r.value ->> 'is_correct')::boolean
    on conflict (user_id, item_type, source_id, item_id) do update
      set correct_streak = 0, resolved_at = null, due = excluded.due,
        revision = public.srs_cards.revision + 1, updated_at = now();
  return query select 'submitted'::text;
end;
$$;

commit;
