-- Preserve existing assignments and grading; allow the pilot daily set of 60 questions.
begin;

alter table public.classes drop constraint classes_daily_practice_size_check;
alter table public.classes add constraint classes_daily_practice_size_check
  check (daily_practice_size between 3 and 60);

create or replace function public.set_daily_practice(p_teacher_id uuid, p_class_id uuid, p_size integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_size is not null and p_size not between 3 and 60 then
    raise exception 'reng:invalid_input';
  end if;
  update public.classes set daily_practice_size = p_size
    where id = p_class_id and teacher_id = p_teacher_id;
  if not found then
    raise exception 'reng:class_not_found';
  end if;
end;
$$;

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
    select jsonb_agg(question.value order by requested.position) into v_items
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

commit;
