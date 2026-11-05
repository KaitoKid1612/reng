-- A teacher fixes how a question reads in an assignment already given (a typo, an unclear
-- prompt, missing furigana) without touching what is graded. Learners see the fix the next time
-- they open the assignment; their answers, attempts and scores stay as they are.
--
-- The prompt and explanation may be rewritten. The reading passage, options, order pieces and
-- listening transcript may only gain or lose furigana ({漢字|かんじ}), because learners chose and
-- answered against their wording. Type, id, answer, points, tags, input rules, audio and position
-- never change. Every fix is kept with the snapshot before and after it. The snapshot guard lets
-- exactly this change through while fix_assignment_question has set reng.display_fix, so the
-- guard itself is never switched off.
begin;

create table public.assignment_item_edits (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  question_id text not null,
  editor_id uuid not null references public.profiles(id),
  before_snapshot jsonb not null,
  after_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (assignment_id, question_id)
    references public.assignment_items(assignment_id, question_id)
);
create index assignment_item_edits_by_assignment
  on public.assignment_item_edits(assignment_id, created_at);
alter table public.assignment_item_edits enable row level security;
revoke all on public.assignment_item_edits from anon, authenticated;
grant select, insert on public.assignment_item_edits to service_role;

-- {漢字|かんじ} → 漢字, like toPlainJapanese in lib/japanese-text.ts (the server trims marks first).
create function public.strip_furigana(p_value text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(p_value, '\{([^{}|]+)\|([^{}|]+)\}', '\1', 'g');
$$;

-- True when p_new differs from p_old only in what a display fix may change.
create function public.is_display_fix(p_old jsonb, p_new jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_new) = 'object'
    and p_new - array['prompt', 'explain', 'passage', 'options', 'tokens', 'transcript']
      = p_old - array['prompt', 'explain', 'passage', 'options', 'tokens', 'transcript']
    and jsonb_typeof(p_new -> 'prompt') = 'string'
    and char_length(btrim(p_new ->> 'prompt')) between 1 and 1000
    and jsonb_typeof(p_new -> 'explain') = 'string'
    and char_length(btrim(p_new ->> 'explain')) between 1 and 2000
    and (p_new ? 'passage') = (p_old ? 'passage')
    and public.strip_furigana(p_new ->> 'passage')
      is not distinct from public.strip_furigana(p_old ->> 'passage')
    and (p_new ? 'transcript') = (p_old ? 'transcript')
    and public.strip_furigana(p_new ->> 'transcript')
      is not distinct from public.strip_furigana(p_old ->> 'transcript')
    and (p_new ? 'options') = (p_old ? 'options')
    and (not (p_old ? 'options') or (
      jsonb_typeof(p_new -> 'options') = 'array'
      and jsonb_array_length(p_new -> 'options') = jsonb_array_length(p_old -> 'options')
      and not exists (
        select 1 from jsonb_array_elements_text(p_old -> 'options') with ordinality o(value, n)
        where public.strip_furigana(o.value)
          is distinct from public.strip_furigana(p_new -> 'options' ->> (o.n::integer - 1))
      )))
    and (p_new ? 'tokens') = (p_old ? 'tokens')
    and (not (p_old ? 'tokens') or (
      jsonb_typeof(p_new -> 'tokens') = 'array'
      and jsonb_array_length(p_new -> 'tokens') = jsonb_array_length(p_old -> 'tokens')
      and not exists (
        select 1 from jsonb_array_elements(p_old -> 'tokens') with ordinality t(value, n)
        where (t.value - 'text') is distinct from ((p_new -> 'tokens' -> (t.n::integer - 1)) - 'text')
          or public.strip_furigana(t.value ->> 'text')
            is distinct from public.strip_furigana(p_new -> 'tokens' -> (t.n::integer - 1) ->> 'text')
      ))),
    false);
$$;

-- Regrading may only add accepted answers; a display fix may only change what is_display_fix
-- allows. Everything else in a given assignment stays fixed.
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
    if coalesce(current_setting('reng.display_fix', true), '') = 'on'
      and (new.assignment_id, new.question_id, new.position)
        = (old.assignment_id, old.question_id, old.position)
      and public.is_display_fix(old.question_snapshot, new.question_snapshot) then
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

-- The server checks the teacher's session, parses the new snapshot with the lesson schema and
-- refuses furigana that breaks or gives away an answer before calling this.
create function public.fix_assignment_question(
  p_teacher_id uuid, p_assignment_id uuid, p_question_id text,
  p_expected_snapshot jsonb, p_snapshot jsonb
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_current jsonb;
begin
  if not exists (
    select 1 from public.assignments a join public.classes c on c.id = a.class_id
    where a.id = p_assignment_id and c.teacher_id = p_teacher_id and a.status <> 'draft'
  ) then
    return 'not_found';
  end if;
  select i.question_snapshot into v_current from public.assignment_items i
    where i.assignment_id = p_assignment_id and i.question_id = p_question_id
    for update;
  if not found then
    return 'not_found';
  end if;
  if v_current is distinct from p_expected_snapshot then
    return 'conflict';
  end if;
  if p_snapshot = v_current then
    return 'unchanged';
  end if;
  if not public.is_display_fix(v_current, p_snapshot) then
    return 'invalid_change';
  end if;
  perform set_config('reng.display_fix', 'on', true);
  update public.assignment_items i set question_snapshot = p_snapshot
    where i.assignment_id = p_assignment_id and i.question_id = p_question_id;
  perform set_config('reng.display_fix', '', true);
  insert into public.assignment_item_edits(assignment_id, question_id, editor_id,
      before_snapshot, after_snapshot)
    values (p_assignment_id, p_question_id, p_teacher_id, v_current, p_snapshot);
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_teacher_id, 'assignment.question_fixed', p_assignment_id::text || ':' || p_question_id);
  return 'fixed';
end;
$$;

revoke all on function public.strip_furigana(text) from public, anon, authenticated;
revoke all on function public.is_display_fix(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.fix_assignment_question(uuid, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.strip_furigana(text) to service_role;
grant execute on function public.is_display_fix(jsonb, jsonb) to service_role;
grant execute on function public.fix_assignment_question(uuid, uuid, text, jsonb, jsonb)
  to service_role;

commit;
