-- Phase 3 artifact: classes, assignments, attempts, reviews and reading progress.
-- Clients only read through RLS; every write goes through server code or the RPCs below.
begin;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  join_code text not null unique check (join_code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  join_enabled boolean not null default true,
  active boolean not null default true,
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes(teacher_id);

create table public.enrollments (
  class_id uuid not null references public.classes(id),
  user_id uuid not null references public.profiles(id),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (class_id, user_id),
  check (left_at is null or left_at >= joined_at)
);
create index enrollments_user_idx on public.enrollments(user_id);

create table public.class_lessons (
  class_id uuid not null references public.classes(id),
  lesson_id text not null references public.lessons(id),
  lesson_version_id uuid not null,
  order_no integer not null check (order_no > 0),
  available_at timestamptz not null,
  primary key (class_id, lesson_id),
  unique (class_id, order_no),
  foreign key (lesson_id, lesson_version_id) references public.lesson_versions(lesson_id, id)
);
create index class_lessons_version_idx on public.class_lessons(lesson_id, lesson_version_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  lesson_id text not null references public.lessons(id),
  lesson_version_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  mode text not null check (mode in ('practice', 'test')),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  due_at timestamptz,
  allow_late boolean not null default false,
  pass_score integer not null default 70 check (pass_score between 0 and 100),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  feedback_policy text not null check (feedback_policy in ('after_submit', 'after_due')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (lesson_id, lesson_version_id) references public.lesson_versions(lesson_id, id),
  foreign key (class_id, lesson_id) references public.class_lessons(class_id, lesson_id),
  check (mode = 'test' or feedback_policy = 'after_submit'),
  check (mode = 'practice' or max_attempts = 1),
  check (feedback_policy = 'after_submit' or due_at is not null),
  check ((status = 'draft') = (published_at is null))
);
create index assignments_class_due_idx on public.assignments(class_id, due_at);
create index assignments_version_idx on public.assignments(lesson_id, lesson_version_id);

create table public.assignment_items (
  assignment_id uuid not null references public.assignments(id),
  question_id text not null check (question_id ~ '^[a-z0-9][a-z0-9-]*$'),
  position integer not null check (position > 0),
  question_snapshot jsonb not null check (
    jsonb_typeof(question_snapshot) = 'object'
    and question_snapshot ->> 'id' = question_id
    and question_snapshot ->> 'type' in ('choice', 'fill', 'match', 'order', 'listen', 'dictation')
    and jsonb_typeof(question_snapshot -> 'points') = 'number'
    and (question_snapshot ->> 'points')::numeric > 0
  ),
  primary key (assignment_id, question_id),
  unique (assignment_id, position)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id),
  user_id uuid not null references public.profiles(id),
  attempt_no integer not null check (attempt_no > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  draft_answers jsonb not null default '{"answers":{},"checked":[]}'::jsonb check (jsonb_typeof(draft_answers) = 'object'),
  draft_revision integer not null default 0 check (draft_revision >= 0),
  score integer check (score >= 0),
  max_score integer check (max_score > 0),
  passed boolean,
  is_late boolean,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (assignment_id, user_id, attempt_no),
  check (score is null or score <= max_score),
  check (
    (status = 'submitted') = (
      submitted_at is not null and score is not null and max_score is not null
      and passed is not null and is_late is not null
    )
  )
);
create index submissions_assignment_user_idx on public.submissions(assignment_id, user_id, submitted_at);
create index submissions_user_idx on public.submissions(user_id);
-- At most one open attempt per learner and assignment, even under concurrent starts.
create unique index submissions_one_open_attempt on public.submissions(assignment_id, user_id)
  where status = 'in_progress';

create table public.answers (
  submission_id uuid not null references public.submissions(id),
  question_id text not null,
  raw jsonb not null,
  is_correct boolean not null,
  points_earned integer not null check (points_earned >= 0),
  listen_count integer not null default 0 check (listen_count >= 0),
  time_ms integer not null default 0 check (time_ms >= 0),
  primary key (submission_id, question_id)
);

create table public.srs_cards (
  user_id uuid not null references public.profiles(id),
  item_type text not null check (item_type in ('vocab', 'kanji', 'mistake')),
  source_id text not null check (char_length(source_id) between 1 and 100),
  item_id text not null check (char_length(item_id) between 1 and 100),
  scheduler_version text not null,
  scheduler_state jsonb not null check (jsonb_typeof(scheduler_state) = 'object'),
  due timestamptz not null,
  correct_streak integer not null default 0 check (correct_streak >= 0),
  resolved_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, source_id, item_id)
);
create index srs_cards_user_due_idx on public.srs_cards(user_id, due);

create table public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_type text not null,
  source_id text not null,
  item_id text not null,
  rating integer not null check (rating between 1 and 4),
  is_correct boolean,
  reviewed_at timestamptz not null default now(),
  request_id uuid not null unique,
  foreign key (user_id, item_type, source_id, item_id)
    references public.srs_cards(user_id, item_type, source_id, item_id)
);
create index review_events_user_time_idx on public.review_events(user_id, reviewed_at);

create table public.lesson_progress (
  user_id uuid not null references public.profiles(id),
  lesson_id text not null references public.lessons(id),
  lesson_version_id uuid not null,
  last_slide_id text,
  read_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  foreign key (lesson_id, lesson_version_id) references public.lesson_versions(lesson_id, id)
);

create table public.join_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index join_attempts_user_time_idx on public.join_attempts(user_id, attempted_at);

-- Published conditions are immutable; only the display title and closing may change.
create function public.guard_assignment_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'masu:assignment_immutable';
    end if;
    return old;
  end if;
  if old.status <> 'draft' and (
    (new.id, new.class_id, new.lesson_id, new.lesson_version_id, new.mode, new.due_at,
      new.allow_late, new.pass_score, new.max_attempts, new.feedback_policy, new.published_at,
      new.created_at)
    is distinct from
    (old.id, old.class_id, old.lesson_id, old.lesson_version_id, old.mode, old.due_at,
      old.allow_late, old.pass_score, old.max_attempts, old.feedback_policy, old.published_at,
      old.created_at)
    or (new.status <> old.status and not (old.status = 'published' and new.status = 'closed'))
  ) then
    raise exception 'masu:assignment_immutable';
  end if;
  return new;
end;
$$;
create trigger assignment_guard before update or delete on public.assignments
for each row execute function public.guard_assignment_change();

create function public.guard_assignment_items() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'masu:assignment_immutable';
  end if;
  if tg_op = 'DELETE' then
    if exists (select 1 from public.assignments a where a.id = old.assignment_id and a.status <> 'draft') then
      raise exception 'masu:assignment_immutable';
    end if;
    return old;
  end if;
  if exists (select 1 from public.assignments a where a.id = new.assignment_id and a.status <> 'draft') then
    raise exception 'masu:assignment_immutable';
  end if;
  return new;
end;
$$;
create trigger assignment_items_guard before insert or update or delete on public.assignment_items
for each row execute function public.guard_assignment_items();

create function public.guard_submission_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' or old.status = 'submitted' then
    raise exception 'masu:submission_immutable';
  end if;
  if (new.id, new.assignment_id, new.user_id, new.attempt_no, new.started_at)
    is distinct from (old.id, old.assignment_id, old.user_id, old.attempt_no, old.started_at) then
    raise exception 'masu:submission_immutable';
  end if;
  return new;
end;
$$;
create trigger submission_guard before update or delete on public.submissions
for each row execute function public.guard_submission_change();

create function public.reject_history_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'masu:history_immutable';
end;
$$;
create trigger answers_immutable before update or delete on public.answers
for each row execute function public.reject_history_change();
create trigger review_events_immutable before update or delete on public.review_events
for each row execute function public.reject_history_change();

revoke all on function public.guard_assignment_change() from public;
revoke all on function public.guard_assignment_items() from public;
revoke all on function public.guard_submission_change() from public;
revoke all on function public.reject_history_change() from public;

-- Definer helpers keep policies free of recursive RLS lookups on profiles.
create function public.teaches_class(p_class_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c
    join public.profiles p on p.id = c.teacher_id
    where c.id = p_class_id and c.teacher_id = (select auth.uid()) and p.role = 'teacher'
  );
$$;
create function public.teaches_assignment(p_assignment_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and public.teaches_class(a.class_id)
  );
$$;
revoke all on function public.teaches_class(uuid) from public, anon;
revoke all on function public.teaches_assignment(uuid) from public, anon;
grant execute on function public.teaches_class(uuid) to authenticated, service_role;
grant execute on function public.teaches_assignment(uuid) to authenticated, service_role;

alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_lessons enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_items enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.srs_cards enable row level security;
alter table public.review_events enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.join_attempts enable row level security;

revoke all on public.classes, public.enrollments, public.class_lessons, public.assignments,
  public.assignment_items, public.submissions, public.answers, public.srs_cards,
  public.review_events, public.lesson_progress, public.join_attempts from anon, authenticated;
grant select on public.classes, public.enrollments, public.class_lessons, public.assignments,
  public.assignment_items, public.submissions, public.answers, public.srs_cards,
  public.review_events, public.lesson_progress to authenticated;
grant all on public.classes, public.enrollments, public.class_lessons, public.assignments,
  public.assignment_items, public.submissions, public.answers, public.srs_cards,
  public.review_events, public.lesson_progress, public.join_attempts to service_role;

create policy class_teacher_read on public.classes for select to authenticated
  using (public.teaches_class(id));
create policy enrollment_teacher_read on public.enrollments for select to authenticated
  using (public.teaches_class(class_id));
create policy class_lesson_teacher_read on public.class_lessons for select to authenticated
  using (public.teaches_class(class_id));
create policy assignment_teacher_read on public.assignments for select to authenticated
  using (public.teaches_class(class_id));
create policy assignment_item_teacher_read on public.assignment_items for select to authenticated
  using (public.teaches_assignment(assignment_id));
create policy submission_teacher_read on public.submissions for select to authenticated
  using (public.teaches_assignment(assignment_id));
create policy answer_teacher_read on public.answers for select to authenticated using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.teaches_assignment(s.assignment_id)
  )
);
create policy profile_teacher_read_members on public.profiles for select to authenticated using (
  exists (
    select 1 from public.enrollments e
    where e.user_id = profiles.id and public.teaches_class(e.class_id)
  )
);
create policy srs_card_owner_read on public.srs_cards for select to authenticated
  using (user_id = (select auth.uid()));
create policy review_event_owner_read on public.review_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy lesson_progress_owner_read on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));

-- Business outcomes are returned as status codes so recorded attempts are not rolled back.
create function public.join_class(p_user_id uuid, p_code text)
returns table(status text, class_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  v_class_id uuid;
  v_left_at timestamptz;
  v_is_member boolean;
begin
  if not exists (select 1 from public.profiles p where p.id = p_user_id and p.role = 'student') then
    return query select 'not_student'::text, null::uuid;
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
  select c.id into v_class_id from public.classes c
    where c.join_code = p_code and c.join_enabled and c.active;
  insert into public.join_attempts(user_id, succeeded) values (p_user_id, v_class_id is not null);
  if v_class_id is null then
    return query select 'invalid_code'::text, null::uuid;
    return;
  end if;
  select true, e.left_at into v_is_member, v_left_at from public.enrollments e
    where e.class_id = v_class_id and e.user_id = p_user_id for update;
  if v_is_member and v_left_at is null then
    return query select 'already_member'::text, v_class_id;
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

create function public.upsert_class_lesson(
  p_teacher_id uuid, p_class_id uuid, p_lesson_id text, p_version_id uuid,
  p_order_no integer, p_available_at timestamptz
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.classes c join public.profiles p on p.id = c.teacher_id
    where c.id = p_class_id and c.teacher_id = p_teacher_id and p.role = 'teacher'
  ) then
    raise exception 'masu:class_not_found';
  end if;
  if not exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id and l.owner_id = p_teacher_id and l.archived_at is null
  ) then
    raise exception 'masu:lesson_not_found';
  end if;
  if not exists (
    select 1 from public.lesson_versions v where v.id = p_version_id and v.lesson_id = p_lesson_id
  ) then
    raise exception 'masu:version_not_found';
  end if;
  if exists (
    select 1 from public.class_lessons cl
    where cl.class_id = p_class_id and cl.order_no = p_order_no and cl.lesson_id <> p_lesson_id
  ) then
    raise exception 'masu:order_taken';
  end if;
  insert into public.class_lessons(class_id, lesson_id, lesson_version_id, order_no, available_at)
    values (p_class_id, p_lesson_id, p_version_id, p_order_no, p_available_at)
    on conflict on constraint class_lessons_pkey do update
      set lesson_version_id = excluded.lesson_version_id,
        order_no = excluded.order_no,
        available_at = excluded.available_at;
end;
$$;

-- Practice items are copied from the version pinned for the class; test items are private.
create function public.publish_assignment(
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
    raise exception 'masu:class_not_found';
  end if;
  select cl.lesson_version_id into v_version_id from public.class_lessons cl
    where cl.class_id = p_class_id and cl.lesson_id = p_lesson_id;
  if v_version_id is null then
    raise exception 'masu:lesson_not_in_class';
  end if;
  if p_due_at is not null and p_due_at <= now() then
    raise exception 'masu:due_in_past';
  end if;
  if p_mode = 'practice' then
    if p_test_questions is not null or coalesce(cardinality(p_practice_question_ids), 0) not between 1 and 50
      or cardinality(p_practice_question_ids) <> (select count(distinct id) from unnest(p_practice_question_ids) id) then
      raise exception 'masu:invalid_items';
    end if;
    select v.content -> 'questions' into v_questions from public.lesson_versions v where v.id = v_version_id;
    select jsonb_agg(question.value order by requested.position) into v_items
      from unnest(p_practice_question_ids) with ordinality as requested(id, position)
      join jsonb_array_elements(v_questions) question on question.value ->> 'id' = requested.id;
    if coalesce(jsonb_array_length(v_items), 0) <> cardinality(p_practice_question_ids) then
      raise exception 'masu:invalid_items';
    end if;
  elsif p_mode = 'test' then
    if coalesce(cardinality(p_practice_question_ids), 0) <> 0 or jsonb_typeof(p_test_questions) is distinct from 'array'
      or jsonb_array_length(p_test_questions) not between 1 and 50 then
      raise exception 'masu:invalid_items';
    end if;
    v_items := p_test_questions;
  else
    raise exception 'masu:invalid_mode';
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

create function public.close_assignment(p_teacher_id uuid, p_assignment_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.assignments a set status = 'closed'
    where a.id = p_assignment_id and a.status = 'published'
      and exists (
        select 1 from public.classes c
        where c.id = a.class_id and c.teacher_id = p_teacher_id
      );
  if not found then
    raise exception 'masu:assignment_not_found';
  end if;
end;
$$;

create function public.start_attempt(p_user_id uuid, p_assignment_id uuid)
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
      and cl.available_at <= now()
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

-- Shared gate for saving and submitting an open attempt.
create function public.check_open_attempt(p_user_id uuid, p_submission_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_submission public.submissions%rowtype;
  v_assignment public.assignments%rowtype;
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
  return 'open';
end;
$$;

create function public.save_attempt_draft(
  p_user_id uuid, p_submission_id uuid, p_expected_revision integer, p_draft jsonb
) returns table(status text, revision integer, saved_at timestamptz)
language plpgsql security invoker set search_path = '' as $$
declare
  v_status text := public.check_open_attempt(p_user_id, p_submission_id);
  v_revision integer;
  v_saved_at timestamptz;
begin
  select s.draft_revision, s.last_saved_at into v_revision, v_saved_at
    from public.submissions s where s.id = p_submission_id and s.user_id = p_user_id;
  if v_status <> 'open' then
    return query select v_status, v_revision, v_saved_at;
    return;
  end if;
  if v_revision <> p_expected_revision then
    return query select 'conflict'::text, v_revision, v_saved_at;
    return;
  end if;
  update public.submissions s
    set draft_answers = p_draft, draft_revision = s.draft_revision + 1, last_saved_at = now()
    where s.id = p_submission_id
    returning s.draft_revision, s.last_saved_at into v_revision, v_saved_at;
  return query select 'saved'::text, v_revision, v_saved_at;
end;
$$;

-- Grading happens in lib/grading; this transaction verifies totals against the snapshot,
-- records the result once and opens mistake cards.
create function public.submit_attempt(
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
  insert into public.answers(submission_id, question_id, raw, is_correct, points_earned)
    select p_submission_id, r.value ->> 'question_id', coalesce(r.value -> 'raw', 'null'::jsonb),
      (r.value ->> 'is_correct')::boolean, (r.value ->> 'points_earned')::integer
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

create function public.record_review(
  p_user_id uuid, p_item_type text, p_source_id text, p_item_id text, p_request_id uuid,
  p_expected_revision integer, p_rating integer, p_is_correct boolean, p_state jsonb,
  p_due timestamptz, p_correct_streak integer, p_resolved boolean, p_scheduler_version text
) returns table(status text, revision integer)
language plpgsql security invoker set search_path = '' as $$
declare
  v_event_user uuid;
  v_revision integer;
  v_exists boolean := false;
begin
  -- A learner's reviews are applied one at a time so retries are recognized reliably.
  perform pg_advisory_xact_lock(hashtextextended('review:' || p_user_id::text, 0));
  select e.user_id into v_event_user from public.review_events e where e.request_id = p_request_id;
  if v_event_user is not null then
    if v_event_user <> p_user_id then
      raise exception 'masu:request_conflict';
    end if;
    select c.revision into v_revision from public.srs_cards c
      where c.user_id = p_user_id and c.item_type = p_item_type
        and c.source_id = p_source_id and c.item_id = p_item_id;
    return query select 'duplicate'::text, v_revision;
    return;
  end if;
  select true, c.revision into v_exists, v_revision from public.srs_cards c
    where c.user_id = p_user_id and c.item_type = p_item_type
      and c.source_id = p_source_id and c.item_id = p_item_id
    for update;
  if not coalesce(v_exists, false) then
    if p_expected_revision is not null or p_item_type <> 'vocab' then
      return query select 'not_found'::text, null::integer;
      return;
    end if;
    insert into public.srs_cards(user_id, item_type, source_id, item_id, scheduler_version,
        scheduler_state, due, correct_streak)
      values (p_user_id, p_item_type, p_source_id, p_item_id, p_scheduler_version, p_state,
        p_due, p_correct_streak)
      returning srs_cards.revision into v_revision;
  else
    if p_expected_revision is distinct from v_revision then
      return query select 'conflict'::text, v_revision;
      return;
    end if;
    update public.srs_cards c set scheduler_version = p_scheduler_version,
        scheduler_state = p_state, due = p_due, correct_streak = p_correct_streak,
        resolved_at = case when p_resolved then coalesce(c.resolved_at, now()) else null end,
        revision = c.revision + 1, updated_at = now()
      where c.user_id = p_user_id and c.item_type = p_item_type
        and c.source_id = p_source_id and c.item_id = p_item_id
      returning c.revision into v_revision;
  end if;
  insert into public.review_events(user_id, item_type, source_id, item_id, rating, is_correct, request_id)
    values (p_user_id, p_item_type, p_source_id, p_item_id, p_rating, p_is_correct, p_request_id);
  return query select 'recorded'::text, v_revision;
end;
$$;

-- docs/07: one latest submitted attempt per learner, questions missed by at least half.
create function public.assignment_question_stats(p_assignment_id uuid)
returns table(question_id text, prompt text, wrong_count bigint, total_count bigint)
language sql stable security invoker set search_path = '' as $$
  with latest as (
    select distinct on (s.user_id) s.id, s.assignment_id, s.user_id
    from public.submissions s
    where s.assignment_id = p_assignment_id and s.status = 'submitted'
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

-- Reads account emails for the class owner's report; callable only by the server.
create function public.class_roster(p_class_id uuid)
returns table(user_id uuid, full_name text, email text, joined_at timestamptz, left_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.user_id, p.full_name, coalesce(u.email, ''), e.joined_at, e.left_at
  from public.enrollments e
  join public.profiles p on p.id = e.user_id
  join auth.users u on u.id = e.user_id
  where e.class_id = p_class_id
  order by p.full_name, e.user_id;
$$;

revoke all on function public.join_class(uuid, text) from public, anon, authenticated;
revoke all on function public.upsert_class_lesson(uuid, uuid, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.publish_assignment(uuid, uuid, text, text, text, timestamptz, boolean, integer, integer, text, text[], jsonb) from public, anon, authenticated;
revoke all on function public.close_assignment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function public.check_open_attempt(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_attempt_draft(uuid, uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.submit_attempt(uuid, uuid, integer, jsonb, jsonb, integer, integer, jsonb, text) from public, anon, authenticated;
revoke all on function public.record_review(uuid, text, text, text, uuid, integer, integer, boolean, jsonb, timestamptz, integer, boolean, text) from public, anon, authenticated;
revoke all on function public.assignment_question_stats(uuid) from public, anon, authenticated;
revoke all on function public.class_roster(uuid) from public, anon, authenticated;
grant execute on function public.join_class(uuid, text) to service_role;
grant execute on function public.upsert_class_lesson(uuid, uuid, text, uuid, integer, timestamptz) to service_role;
grant execute on function public.publish_assignment(uuid, uuid, text, text, text, timestamptz, boolean, integer, integer, text, text[], jsonb) to service_role;
grant execute on function public.close_assignment(uuid, uuid) to service_role;
grant execute on function public.start_attempt(uuid, uuid) to service_role;
grant execute on function public.check_open_attempt(uuid, uuid) to service_role;
grant execute on function public.save_attempt_draft(uuid, uuid, integer, jsonb) to service_role;
grant execute on function public.submit_attempt(uuid, uuid, integer, jsonb, jsonb, integer, integer, jsonb, text) to service_role;
grant execute on function public.record_review(uuid, text, text, text, uuid, integer, integer, boolean, jsonb, timestamptz, integer, boolean, text) to service_role;
grant execute on function public.assignment_question_stats(uuid) to service_role;
grant execute on function public.class_roster(uuid) to service_role;

commit;
