-- Phase 5A artifact: listening answers keep the client-observed listen count of the attempt.
-- submit_attempt keeps the 202610280004 signature, so its grants to service_role remain.
begin;

create or replace function public.submit_attempt(
  p_user_id uuid, p_submission_id uuid, p_expected_revision integer, p_draft jsonb,
  p_results jsonb, p_score integer, p_max_score integer, p_mistake_state jsonb,
  p_scheduler_version text
) returns table(status text)
language plpgsql security invoker set search_path = '' as $$
declare
  v_status text := public.check_open_attempt(p_user_id, p_submission_id);
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
  v_item_count integer;
  v_mistake_due timestamptz;
begin
  if v_status = 'submitted' then
    return query select 'already_submitted'::text;
    return;
  end if;
  if v_status <> 'open' then
    return query select v_status;
    return;
  end if;
  select s.* into v_submission from public.submissions s where s.id = p_submission_id;
  select a.* into v_assignment from public.assignments a where a.id = v_submission.assignment_id;
  if v_submission.draft_revision <> p_expected_revision then
    return query select 'conflict'::text;
    return;
  end if;
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
        -- Listens are client observations (docs/07): bounded, whole and only for audio questions.
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
  update public.submissions s set status = 'submitted', draft_answers = p_draft,
      score = p_score, max_score = p_max_score,
      passed = p_score * 100 >= v_assignment.pass_score * p_max_score,
      is_late = v_assignment.due_at is not null and now() > v_assignment.due_at,
      submitted_at = now(), last_saved_at = now()
    where s.id = p_submission_id;
  -- Test mistakes stay hidden until answers may be shown.
  v_mistake_due := case
    when v_assignment.feedback_policy = 'after_due' then greatest(now(), v_assignment.due_at)
    else now()
  end;
  insert into public.srs_cards(user_id, item_type, source_id, item_id, scheduler_version,
      scheduler_state, due)
    select p_user_id, 'mistake', v_assignment.id::text, r.value ->> 'question_id',
      p_scheduler_version, p_mistake_state, v_mistake_due
    from jsonb_array_elements(p_results) r
    where not (r.value ->> 'is_correct')::boolean
    on conflict (user_id, item_type, source_id, item_id) do update
      set correct_streak = 0, resolved_at = null, due = excluded.due,
        revision = public.srs_cards.revision + 1, updated_at = now();
  return query select 'submitted'::text;
end;
$$;

-- Listening results per learner from the latest submitted attempt of each class assignment,
-- matching the report rule that the latest attempt counts, not the best one.
create function public.class_listening_summary(p_class_id uuid)
returns table(user_id uuid, points_earned bigint, max_points bigint, listen_total bigint,
  answer_count bigint)
language sql stable security invoker set search_path = '' as $$
  with latest as (
    select distinct on (s.assignment_id, s.user_id) s.id, s.assignment_id, s.user_id
    from public.submissions s
    join public.assignments a on a.id = s.assignment_id
    where a.class_id = p_class_id and s.status = 'submitted'
    order by s.assignment_id, s.user_id, s.submitted_at desc, s.attempt_no desc
  )
  select l.user_id, sum(an.points_earned), sum((i.question_snapshot ->> 'points')::integer),
    sum(an.listen_count), count(*)
  from latest l
  join public.answers an on an.submission_id = l.id
  join public.assignment_items i
    on i.assignment_id = l.assignment_id and i.question_id = an.question_id
  where i.question_snapshot ->> 'type' in ('listen', 'dictation')
  group by l.user_id;
$$;

revoke all on function public.class_listening_summary(uuid) from public, anon, authenticated;
grant execute on function public.class_listening_summary(uuid) to service_role;

commit;
