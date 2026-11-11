-- JLPT official workbook tests (jlpt.jp 公式問題集) as mock exams.
--
-- 1. A test is given whole: N5 has 91 questions and N4 98, more than the 70 a practice set may
--    hold. Mock exams may now hold up to 100; regular assignments and daily practice keep their
--    limits. Only the size check of publish_jlpt_mock_exam changes.
create or replace function public.publish_jlpt_mock_exam(
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
  if coalesce(cardinality(p_question_ids), 0) not between 1 and 100
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

-- 2. A mock exam opens when the teacher gives it. Its source lesson may stay closed to learners
--    (available_at after the real test), so they cannot read the questions beforehand; other
--    assignments still wait for their lesson. Only the availability check of start_attempt
--    changes.
create or replace function public.start_attempt(p_user_id uuid, p_assignment_id uuid)
returns table(status text, submission_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  v_assignment public.assignments%rowtype;
  v_submission_id uuid;
  v_used integer;
begin
  select a.* into v_assignment from public.assignments a
    where a.id = p_assignment_id and a.status in ('published', 'closed')
      and exists (
        select 1 from public.enrollments e
        where e.class_id = a.class_id and e.user_id = p_user_id and e.left_at is null
      );
  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;
  -- Serializes concurrent starts from several tabs for the same learner and assignment.
  perform pg_advisory_xact_lock(hashtextextended('attempt:' || p_assignment_id::text || ':' || p_user_id::text, 0));
  select s.id into v_submission_id from public.submissions s
    where s.assignment_id = p_assignment_id and s.user_id = p_user_id and s.status = 'in_progress';
  if v_submission_id is not null then
    return query select 'resumed'::text, v_submission_id;
    return;
  end if;
  if v_assignment.status = 'closed'
    or not exists (select 1 from public.classes c where c.id = v_assignment.class_id and c.active) then
    return query select 'closed'::text, null::uuid;
    return;
  end if;
  if not exists (
    select 1 from public.class_lessons cl
    where cl.class_id = v_assignment.class_id and cl.lesson_id = v_assignment.lesson_id
      and (cl.available_at <= now()
        or exists (select 1 from public.assignment_exams x where x.assignment_id = p_assignment_id))
  ) then
    return query select 'not_available'::text, null::uuid;
    return;
  end if;
  if v_assignment.due_at is not null and now() > v_assignment.due_at and not v_assignment.allow_late then
    return query select 'past_due'::text, null::uuid;
    return;
  end if;
  select count(*) into v_used from public.submissions s
    where s.assignment_id = p_assignment_id and s.user_id = p_user_id;
  if v_used >= v_assignment.max_attempts then
    return query select 'no_attempts_left'::text, null::uuid;
    return;
  end if;
  insert into public.submissions(assignment_id, user_id, attempt_no)
    values (p_assignment_id, p_user_id, v_used + 1)
    returning id into v_submission_id;
  return query select 'started'::text, v_submission_id;
end;
$$;
revoke all on function public.start_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_attempt(uuid, uuid) to service_role;
