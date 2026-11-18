-- Live class quiz (18/11/2026): during an online lesson the teacher runs a timed multiple-choice
-- round over the shared slides; learners of the class answer on their phones and a faster right
-- answer scores more. The questions are a snapshot of the class's pinned lesson version taken
-- when the round opens, keys included, so only the server reads these tables. Deadlines and
-- points are decided here with the database clock, never with a phone's or the server's clock.
-- The running app keeps working before and after this migration (it only adds tables and
-- functions).
begin;

create table public.live_quizzes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  lesson_id text not null,
  lesson_version_id uuid not null,
  teacher_id uuid not null references public.profiles(id),
  -- [{ id, prompt, options, answer (index), explain }]
  questions jsonb not null check (
    jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 30
  ),
  seconds_per_question integer not null check (seconds_per_question between 5 and 120),
  phase text not null default 'lobby' check (phase in ('lobby', 'question', 'reveal', 'finished')),
  current_index integer not null default -1,
  question_started_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  foreign key (lesson_id, lesson_version_id) references public.lesson_versions(lesson_id, id),
  check (current_index between -1 and jsonb_array_length(questions) - 1),
  check (phase not in ('question', 'reveal') or (current_index >= 0 and question_started_at is not null)),
  check ((phase = 'finished') = (finished_at is not null))
);
-- One open round per class: opening a new one finishes the previous one.
create unique index live_quizzes_open_class_idx on public.live_quizzes(class_id)
  where phase <> 'finished';

create table public.live_quiz_players (
  quiz_id uuid not null references public.live_quizzes(id),
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  primary key (quiz_id, user_id)
);

create table public.live_quiz_answers (
  quiz_id uuid not null,
  user_id uuid not null,
  question_index integer not null check (question_index >= 0),
  choice integer not null check (choice between 0 and 9),
  is_correct boolean not null,
  points integer not null check (points between 0 and 1000),
  answered_at timestamptz not null default now(),
  primary key (quiz_id, user_id, question_index),
  foreign key (quiz_id, user_id) references public.live_quiz_players(quiz_id, user_id)
);

alter table public.live_quizzes enable row level security;
alter table public.live_quiz_players enable row level security;
alter table public.live_quiz_answers enable row level security;
revoke all on public.live_quizzes, public.live_quiz_players, public.live_quiz_answers
  from public, anon, authenticated;
grant all on public.live_quizzes, public.live_quiz_players, public.live_quiz_answers
  to service_role;

-- The owner of a running class opens a round on a lesson of that class, on its pinned version.
create function public.create_live_quiz(
  p_teacher_id uuid,
  p_class_id uuid,
  p_lesson_id text,
  p_version_id uuid,
  p_questions jsonb,
  p_seconds integer
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  quiz_id uuid;
begin
  if not exists (
    select 1 from public.classes
    where id = p_class_id and teacher_id = p_teacher_id and active and not self_study
  ) then
    raise exception 'reng:not_found';
  end if;
  if not exists (
    select 1 from public.class_lessons
    where class_id = p_class_id and lesson_id = p_lesson_id and lesson_version_id = p_version_id
  ) then
    raise exception 'reng:not_found';
  end if;
  if p_seconds is null or p_seconds not between 5 and 120
    or jsonb_typeof(p_questions) is distinct from 'array'
    or jsonb_array_length(p_questions) not between 1 and 30 then
    raise exception 'reng:invalid_request';
  end if;
  update public.live_quizzes
    set phase = 'finished', finished_at = now(), revision = revision + 1
    where class_id = p_class_id and phase <> 'finished';
  insert into public.live_quizzes(
    class_id, lesson_id, lesson_version_id, teacher_id, questions, seconds_per_question
  ) values (p_class_id, p_lesson_id, p_version_id, p_teacher_id, p_questions, p_seconds)
  returning id into quiz_id;
  return quiz_id;
end;
$$;

-- A current member of the class joins an open round, also after it has started.
create function public.join_live_quiz(p_user_id uuid, p_quiz_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.live_quizzes q
    join public.enrollments e on e.class_id = q.class_id
    where q.id = p_quiz_id and q.phase <> 'finished' and q.teacher_id <> p_user_id
      and e.user_id = p_user_id and e.left_at is null
  ) then
    raise exception 'reng:not_found';
  end if;
  insert into public.live_quiz_players(quiz_id, user_id) values (p_quiz_id, p_user_id)
    on conflict do nothing;
end;
$$;

-- The teacher moves the round on. The revision makes a double click (or two tabs) move once.
create function public.advance_live_quiz(
  p_teacher_id uuid,
  p_quiz_id uuid,
  p_revision integer,
  p_action text
) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  quiz public.live_quizzes%rowtype;
begin
  select * into quiz from public.live_quizzes
    where id = p_quiz_id and teacher_id = p_teacher_id for update;
  if not found then
    raise exception 'reng:not_found';
  end if;
  if quiz.revision <> p_revision then
    raise exception 'reng:conflict';
  end if;
  if p_action = 'start' and quiz.phase = 'lobby' then
    update public.live_quizzes
      set phase = 'question', current_index = 0, question_started_at = now()
      where id = p_quiz_id;
  elsif p_action = 'reveal' and quiz.phase = 'question' then
    update public.live_quizzes set phase = 'reveal' where id = p_quiz_id;
  elsif p_action = 'next' and quiz.phase = 'reveal'
    and quiz.current_index < jsonb_array_length(quiz.questions) - 1 then
    update public.live_quizzes
      set phase = 'question', current_index = quiz.current_index + 1, question_started_at = now()
      where id = p_quiz_id;
  elsif (p_action = 'finish' or (p_action = 'next' and quiz.phase = 'reveal'))
    and quiz.phase <> 'finished' then
    update public.live_quizzes set phase = 'finished', finished_at = now() where id = p_quiz_id;
  else
    raise exception 'reng:invalid_state';
  end if;
  update public.live_quizzes set revision = revision + 1 where id = p_quiz_id;
  return quiz.revision + 1;
end;
$$;

-- One answer per learner and question while the question is open (one second of grace for the
-- trip from the phone). A right answer earns 500 points plus up to 500 for speed.
create function public.submit_live_answer(
  p_user_id uuid,
  p_quiz_id uuid,
  p_index integer,
  p_choice integer
) returns table(is_correct boolean, points integer)
language plpgsql security invoker set search_path = '' as $$
declare
  quiz public.live_quizzes%rowtype;
  question jsonb;
  elapsed double precision;
  correct boolean;
  earned integer;
begin
  select * into quiz from public.live_quizzes where id = p_quiz_id;
  if not found or not exists (
    select 1 from public.live_quiz_players where quiz_id = p_quiz_id and user_id = p_user_id
  ) then
    raise exception 'reng:not_found';
  end if;
  if quiz.phase <> 'question' or quiz.current_index <> p_index then
    raise exception 'reng:closed';
  end if;
  elapsed := extract(epoch from clock_timestamp() - quiz.question_started_at);
  if elapsed > quiz.seconds_per_question + 1 then
    raise exception 'reng:closed';
  end if;
  question := quiz.questions -> p_index;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(question -> 'options') then
    raise exception 'reng:invalid_answer';
  end if;
  correct := (question ->> 'answer')::integer = p_choice;
  earned := case when correct
    then 500 + round(500 * greatest(0, 1 - elapsed / quiz.seconds_per_question))::integer
    else 0 end;
  insert into public.live_quiz_answers(quiz_id, user_id, question_index, choice, is_correct, points)
    values (p_quiz_id, p_user_id, p_index, p_choice, correct, earned)
    on conflict do nothing;
  -- A second tap returns the first answer; it is never replaced.
  return query select a.is_correct, a.points from public.live_quiz_answers a
    where a.quiz_id = p_quiz_id and a.user_id = p_user_id and a.question_index = p_index;
end;
$$;

revoke all on function public.create_live_quiz(uuid, uuid, text, uuid, jsonb, integer),
  public.join_live_quiz(uuid, uuid),
  public.advance_live_quiz(uuid, uuid, integer, text),
  public.submit_live_answer(uuid, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_live_quiz(uuid, uuid, text, uuid, jsonb, integer),
  public.join_live_quiz(uuid, uuid),
  public.advance_live_quiz(uuid, uuid, integer, text),
  public.submit_live_answer(uuid, uuid, integer, integer)
  to service_role;

commit;
