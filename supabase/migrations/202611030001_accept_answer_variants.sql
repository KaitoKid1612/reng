-- A teacher accepts an equivalent typed answer after grading, without SQL maintenance:
-- the assignment snapshot gains the answer, every submitted answer the server regrades as
-- correct gets its points, the scores and mistake cards follow, and later practice built from
-- the same lesson accepts the answer too. Graded history stays immutable otherwise: the guards
-- allow only these changes, and only while accept_answer_variant has set reng.regrade.
begin;

-- Answers accepted while grading practice, applied to every later practice snapshot of the
-- question. The prompt is kept so a rewritten question no longer inherits them.
create table public.answer_variants (
  lesson_id text not null references public.lessons(id),
  question_id text not null check (char_length(question_id) between 1 and 100),
  prompt text not null,
  variant text not null check (char_length(variant) between 1 and 200),
  accepted_by uuid not null references public.profiles(id),
  source_assignment_id uuid not null references public.assignments(id),
  accepted_at timestamptz not null default now(),
  primary key (lesson_id, question_id, variant)
);
alter table public.answer_variants enable row level security;
revoke all on public.answer_variants from anon, authenticated;
grant select, insert on public.answer_variants to service_role;

-- Regrading may only add accepted answers to a snapshot; everything else stays fixed.
create or replace function public.guard_assignment_items() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if coalesce(current_setting('reng.regrade', true), '') = 'on'
      and (new.assignment_id, new.question_id, new.position)
        = (old.assignment_id, old.question_id, old.position)
      and new.question_snapshot - 'answer' = old.question_snapshot - 'answer'
      and jsonb_typeof(new.question_snapshot -> 'answer') = 'array'
      and (new.question_snapshot -> 'answer') @> (old.question_snapshot -> 'answer') then
      return new;
    end if;
    raise exception 'reng:assignment_immutable';
  end if;
  if tg_op = 'DELETE' then
    if exists (select 1 from public.assignments a where a.id = old.assignment_id and a.status <> 'draft') then
      raise exception 'reng:assignment_immutable';
    end if;
    return old;
  end if;
  if exists (select 1 from public.assignments a where a.id = new.assignment_id and a.status <> 'draft') then
    raise exception 'reng:assignment_immutable';
  end if;
  return new;
end;
$$;

-- A submitted attempt only changes its score and pass result, and only while regrading.
create or replace function public.guard_submission_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.status = 'submitted'
    and coalesce(current_setting('reng.regrade', true), '') = 'on'
    and to_jsonb(new) - array['score', 'passed'] = to_jsonb(old) - array['score', 'passed'] then
    return new;
  end if;
  if tg_op = 'DELETE' or old.status = 'submitted' then
    raise exception 'reng:submission_immutable';
  end if;
  if (new.id, new.assignment_id, new.user_id, new.attempt_no, new.started_at)
    is distinct from (old.id, old.assignment_id, old.user_id, old.attempt_no, old.started_at) then
    raise exception 'reng:submission_immutable';
  end if;
  return new;
end;
$$;

-- An answer only turns from wrong to correct, keeping what the learner wrote, while regrading.
create function public.guard_answer_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('reng.regrade', true), '') = 'on'
    and to_jsonb(new) - array['is_correct', 'points_earned']
      = to_jsonb(old) - array['is_correct', 'points_earned']
    and new.is_correct and not old.is_correct then
    return new;
  end if;
  raise exception 'reng:history_immutable';
end;
$$;
revoke all on function public.guard_answer_change() from public;
drop trigger answers_immutable on public.answers;
create trigger answers_immutable before update or delete on public.answers
for each row execute function public.guard_answer_change();

-- Typed answers accepted while grading earlier practice of this lesson join a new snapshot, as
-- long as the question still has the prompt they were accepted for.
create function public.with_answer_variants(p_lesson_id text, p_question jsonb) returns jsonb
language sql stable set search_path = '' as $$
  select case
    when (p_question ->> 'type' in ('fill', 'dictation')
        or (p_question ->> 'type' = 'listen' and p_question ->> 'responseType' = 'fill'))
      and jsonb_typeof(p_question -> 'answer') = 'array'
    then jsonb_set(p_question, '{answer}', (p_question -> 'answer') || coalesce((
      select jsonb_agg(v.variant order by v.accepted_at, v.variant)
      from public.answer_variants v
      where v.lesson_id = p_lesson_id and v.question_id = p_question ->> 'id'
        and v.prompt = p_question ->> 'prompt'
        and not ((p_question -> 'answer') ? v.variant)
    ), '[]'::jsonb))
    else p_question
  end;
$$;
revoke all on function public.with_answer_variants(text, jsonb) from public, anon, authenticated;
grant execute on function public.with_answer_variants(text, jsonb) to service_role;

-- As in 202610300002, with accepted answers merged into practice snapshots.
create or replace function public.publish_assignment(
  p_teacher_id uuid, p_class_id uuid, p_lesson_id text, p_title text, p_mode text,
  p_due_at timestamptz, p_allow_late boolean, p_pass_score integer, p_max_attempts integer,
  p_feedback_policy text, p_practice_question_ids text[], p_test_questions jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_version_id uuid;
  v_questions jsonb;
  v_assignment_id uuid;
  v_items jsonb;
begin
  if not exists (
    select 1 from public.classes c join public.profiles p on p.id = c.teacher_id
    where c.id = p_class_id and c.teacher_id = p_teacher_id and p.role = 'teacher' and c.active
  ) then
    raise exception 'reng:class_not_found';
  end if;
  select cl.lesson_version_id into v_version_id from public.class_lessons cl
    where cl.class_id = p_class_id and cl.lesson_id = p_lesson_id;
  if v_version_id is null then
    raise exception 'reng:lesson_not_in_class';
  end if;
  if p_due_at is not null and p_due_at <= now() then
    raise exception 'reng:due_in_past';
  end if;
  if p_mode = 'practice' then
    if p_test_questions is not null or coalesce(cardinality(p_practice_question_ids), 0) not between 1 and 60
      or cardinality(p_practice_question_ids) <> (select count(distinct id) from unnest(p_practice_question_ids) id) then
      raise exception 'reng:invalid_items';
    end if;
    select v.content -> 'questions' into v_questions from public.lesson_versions v where v.id = v_version_id;
    select jsonb_agg(public.with_answer_variants(p_lesson_id, question.value) order by requested.position)
      into v_items
      from unnest(p_practice_question_ids) with ordinality as requested(id, position)
      join jsonb_array_elements(v_questions) question on question.value ->> 'id' = requested.id;
    if coalesce(jsonb_array_length(v_items), 0) <> cardinality(p_practice_question_ids) then
      raise exception 'reng:invalid_items';
    end if;
  elsif p_mode = 'test' then
    if coalesce(cardinality(p_practice_question_ids), 0) <> 0 or jsonb_typeof(p_test_questions) is distinct from 'array'
      or jsonb_array_length(p_test_questions) not between 1 and 60 then
      raise exception 'reng:invalid_items';
    end if;
    v_items := p_test_questions;
  else
    raise exception 'reng:invalid_mode';
  end if;
  insert into public.assignments(class_id, lesson_id, lesson_version_id, title, mode, due_at,
      allow_late, pass_score, max_attempts, feedback_policy)
    values (p_class_id, p_lesson_id, v_version_id, btrim(p_title), p_mode, p_due_at,
      p_allow_late, p_pass_score, p_max_attempts, p_feedback_policy)
    returning id into v_assignment_id;
  insert into public.assignment_items(assignment_id, question_id, position, question_snapshot)
    select v_assignment_id, item.value ->> 'id', item.position::integer, item.value
    from jsonb_array_elements(v_items) with ordinality as item(value, position);
  update public.assignments a set status = 'published', published_at = now()
    where a.id = v_assignment_id;
  return v_assignment_id;
end;
$$;

-- The server grades with lib/grading and passes the submissions whose answer now counts; this
-- function checks ownership and the question, then applies everything in one transaction.
create function public.accept_answer_variant(
  p_teacher_id uuid, p_assignment_id uuid, p_question_id text, p_variant text,
  p_submission_ids uuid[]
) returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_assignment public.assignments%rowtype;
  v_snapshot jsonb;
  v_variant text := btrim(coalesce(p_variant, ''));
  v_submissions uuid[];
  v_regraded integer;
begin
  select a.* into v_assignment from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = p_assignment_id and c.teacher_id = p_teacher_id and a.status <> 'draft';
  if not found then
    raise exception 'reng:not_found';
  end if;
  select i.question_snapshot into v_snapshot from public.assignment_items i
    where i.assignment_id = p_assignment_id and i.question_id = p_question_id
    for update;
  if not found then
    raise exception 'reng:not_found';
  end if;
  if not (v_snapshot ->> 'type' in ('fill', 'dictation')
      or (v_snapshot ->> 'type' = 'listen' and v_snapshot ->> 'responseType' = 'fill'))
    or char_length(v_variant) not between 1 and 200 then
    raise exception 'reng:invalid_input';
  end if;
  perform set_config('reng.regrade', 'on', true);
  if not ((v_snapshot -> 'answer') ? v_variant) then
    v_snapshot := jsonb_set(v_snapshot, '{answer}', (v_snapshot -> 'answer') || to_jsonb(v_variant));
    update public.assignment_items i set question_snapshot = v_snapshot
      where i.assignment_id = p_assignment_id and i.question_id = p_question_id;
  end if;
  -- Practice questions come from the lesson; test questions are private to their assignment.
  if v_assignment.mode = 'practice' then
    insert into public.answer_variants(lesson_id, question_id, prompt, variant, accepted_by,
        source_assignment_id)
      values (v_assignment.lesson_id, p_question_id, v_snapshot ->> 'prompt', v_variant,
        p_teacher_id, p_assignment_id)
      on conflict do nothing;
  end if;
  select coalesce(array_agg(s.id), '{}') into v_submissions from public.submissions s
    where s.id = any(coalesce(p_submission_ids, '{}')) and s.assignment_id = p_assignment_id
      and s.status = 'submitted';
  update public.answers an set is_correct = true,
      points_earned = (v_snapshot ->> 'points')::integer
    where an.submission_id = any(v_submissions) and an.question_id = p_question_id
      and not an.is_correct;
  get diagnostics v_regraded = row_count;
  update public.submissions s set
      score = totals.score,
      passed = totals.score * 100 >= v_assignment.pass_score * s.max_score
    from (
      select an.submission_id, sum(an.points_earned)::integer as score
      from public.answers an where an.submission_id = any(v_submissions)
      group by an.submission_id
    ) totals
    where s.id = totals.submission_id and s.score is distinct from totals.score;
  -- A mistake card closes once none of the learner's attempts still has this question wrong.
  update public.srs_cards c set resolved_at = now(), revision = c.revision + 1, updated_at = now()
    where c.item_type = 'mistake' and c.source_id = p_assignment_id::text
      and c.item_id = p_question_id and c.resolved_at is null
      and c.user_id in (select s.user_id from public.submissions s where s.id = any(v_submissions))
      and not exists (
        select 1 from public.answers an
        join public.submissions s on s.id = an.submission_id
        where s.assignment_id = p_assignment_id and s.user_id = c.user_id
          and s.status = 'submitted' and an.question_id = p_question_id and not an.is_correct
      );
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_teacher_id, 'answer.variant_accepted', p_assignment_id::text || ':' || p_question_id);
  return v_regraded;
end;
$$;
revoke all on function public.accept_answer_variant(uuid, uuid, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.accept_answer_variant(uuid, uuid, text, text, uuid[]) to service_role;

commit;
