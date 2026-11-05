-- An attempt still open when its deadline passes (the learner closed the page or lost the
-- connection) used to stay read-only and was never graded. The morning job now hands it in with
-- the answers the server saved before the deadline. Grading stays in TypeScript, as for every
-- submit: list_expired_attempts names the attempts, the job grades their saved drafts and
-- submit_expired_attempt checks and stores the results the way submit_attempt does.
--
-- Only attempts the learner can no longer submit qualify: the assignment has a deadline, refuses
-- late work, is still published in an active class, and the learner is still enrolled. A retake
-- left open after an earlier submitted attempt is left alone: the latest submitted attempt is
-- the one that counts, and the learner never chose to hand this one in.
begin;

create function public.list_expired_attempts(p_limit integer)
returns table(submission_id uuid, assignment_id uuid, draft_revision integer, draft_answers jsonb)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.assignment_id, s.draft_revision, s.draft_answers
  from public.submissions s
  join public.assignments a on a.id = s.assignment_id
  where s.status = 'in_progress'
    and a.status = 'published'
    and a.due_at is not null and a.due_at < now() and not a.allow_late
    and exists (select 1 from public.classes c where c.id = a.class_id and c.active)
    and exists (
      select 1 from public.enrollments e
      where e.class_id = a.class_id and e.user_id = s.user_id and e.left_at is null
    )
    and not exists (
      select 1 from public.submissions earlier
      where earlier.assignment_id = s.assignment_id and earlier.user_id = s.user_id
        and earlier.status = 'submitted'
    )
  order by a.due_at, s.id
  limit greatest(least(p_limit, 500), 1);
$$;

create function public.submit_expired_attempt(
  p_submission_id uuid, p_expected_revision integer, p_results jsonb, p_score integer,
  p_max_score integer, p_mistake_state jsonb, p_scheduler_version text
) returns table(status text)
language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_item_count integer;
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
  -- The conditions of list_expired_attempts, checked again under the row lock.
  if v_assignment.status <> 'published'
    or v_assignment.due_at is null or now() <= v_assignment.due_at or v_assignment.allow_late
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
  -- Handed in at the deadline with what was saved by then: not late, and the saved draft stays.
  update public.submissions s set status = 'submitted',
      score = p_score, max_score = p_max_score,
      passed = p_score * 100 >= v_assignment.pass_score * p_max_score,
      is_late = false, submitted_at = v_assignment.due_at
    where s.id = p_submission_id;
  -- The deadline has passed, so even an after_due test may show its mistakes now.
  insert into public.srs_cards(user_id, item_type, source_id, item_id, scheduler_version,
      scheduler_state, due)
    select v_submission.user_id, 'mistake', v_assignment.id::text, r.value ->> 'question_id',
      p_scheduler_version, p_mistake_state, now()
    from jsonb_array_elements(p_results) r
    where not (r.value ->> 'is_correct')::boolean
    on conflict (user_id, item_type, source_id, item_id) do update
      set correct_streak = 0, resolved_at = null, due = excluded.due,
        revision = public.srs_cards.revision + 1, updated_at = now();
  return query select 'submitted'::text;
end;
$$;

revoke all on function public.list_expired_attempts(integer) from public, anon, authenticated;
revoke all on function public.submit_expired_attempt(uuid, integer, jsonb, integer, integer, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.list_expired_attempts(integer) to service_role;
grant execute on function public.submit_expired_attempt(uuid, integer, jsonb, integer, integer, jsonb, text)
  to service_role;

commit;
