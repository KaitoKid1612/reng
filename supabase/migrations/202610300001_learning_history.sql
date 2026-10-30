begin;

create table public.learning_history_archives (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique check (length(source_key) between 1 and 200),
  learner_id uuid references public.profiles(id),
  learner_email text not null check (learner_email = lower(btrim(learner_email)) and position('@' in learner_email) > 1),
  teacher_id uuid not null references public.profiles(id),
  learner_name text not null check (length(learner_name) between 1 and 100),
  course text not null check (length(course) between 1 and 100),
  session_count integer not null check (session_count between 0 and 5000),
  answer_count integer not null check (answer_count between 0 and 30000),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  imported_at timestamptz not null default now()
);
create index learning_history_learner_idx on public.learning_history_archives(learner_id);
create index learning_history_teacher_idx on public.learning_history_archives(teacher_id);
alter table public.learning_history_archives enable row level security;
revoke all on public.learning_history_archives from public, anon, authenticated;
grant select on public.learning_history_archives to authenticated;
grant all on public.learning_history_archives to service_role;
create policy learning_history_read on public.learning_history_archives for select to authenticated using (
  learner_id = (select auth.uid()) or (
    teacher_id = (select auth.uid()) and exists (
      select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher'
    )
  )
);

-- Service-only, atomic and idempotent. Mapping/content changes need an explicit new import;
-- a retry cannot silently reassign private history or replace the original source snapshot.
create function public.import_learning_history(
  p_source_key text, p_learner_id uuid, p_learner_email text, p_teacher_id uuid, p_payload jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing public.learning_history_archives%rowtype;
  archive_id uuid;
begin
  if p_source_key is null or length(p_source_key) not between 1 and 200
    or p_payload is null or jsonb_typeof(p_payload) is distinct from 'object'
    or p_payload ->> 'schemaVersion' is distinct from '1'
    or jsonb_typeof(p_payload -> 'sessions') is distinct from 'array'
    or jsonb_typeof(p_payload -> 'answers') is distinct from 'array'
    or length(coalesce(p_payload ->> 'learnerName', '')) not between 1 and 100
    or length(coalesce(p_payload ->> 'course', '')) not between 1 and 100 then
    raise exception 'reng:invalid_history';
  end if;
  if jsonb_array_length(p_payload -> 'sessions') > 5000
    or jsonb_array_length(p_payload -> 'answers') > 30000 then
    raise exception 'reng:invalid_history';
  end if;
  if not exists (select 1 from public.profiles where id = p_teacher_id and role = 'teacher')
    or p_learner_email is null or p_learner_email <> lower(btrim(p_learner_email))
    or position('@' in p_learner_email) < 2
    or (p_learner_id is not null and not exists (
      select 1 from auth.users where id = p_learner_id and lower(email) = p_learner_email
    )) then
    raise exception 'reng:invalid_history_accounts';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('history:' || p_source_key, 0));
  select * into existing from public.learning_history_archives where source_key = p_source_key;
  if found then
    if (p_learner_id is not null and existing.learner_id is not null and existing.learner_id <> p_learner_id)
      or existing.learner_email <> p_learner_email or existing.teacher_id <> p_teacher_id or existing.payload <> p_payload then
      raise exception 'reng:history_conflict';
    end if;
    if existing.learner_id is null and p_learner_id is not null then
      update public.learning_history_archives set learner_id = p_learner_id where id = existing.id;
    end if;
    return existing.id;
  end if;
  insert into public.learning_history_archives(source_key, learner_id, learner_email, teacher_id, learner_name,
      course, session_count, answer_count, payload)
    values(p_source_key, p_learner_id, p_learner_email, p_teacher_id, p_payload ->> 'learnerName',
      p_payload ->> 'course', jsonb_array_length(p_payload -> 'sessions'),
      jsonb_array_length(p_payload -> 'answers'), p_payload)
    returning id into archive_id;
  return archive_id;
end;
$$;
revoke all on function public.import_learning_history(text,uuid,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.import_learning_history(text,uuid,text,uuid,jsonb) to service_role;

-- Linking is an explicit teacher action after the learner registers. A newly registered
-- matching email cannot claim private history automatically.
create function public.link_learning_history(p_teacher_id uuid, p_archive_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  archive public.learning_history_archives%rowtype;
  account_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_teacher_id and role = 'teacher') then
    raise exception 'reng:not_found';
  end if;
  select * into archive from public.learning_history_archives
    where id = p_archive_id and teacher_id = p_teacher_id for update;
  if not found then
    raise exception 'reng:not_found';
  end if;
  if archive.learner_id is not null then
    return 'already_linked';
  end if;
  select u.id into account_id from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = archive.learner_email and u.email_confirmed_at is not null;
  if account_id is null then
    return 'account_not_ready';
  end if;
  update public.learning_history_archives set learner_id = account_id where id = archive.id;
  return 'linked';
end;
$$;
revoke all on function public.link_learning_history(uuid,uuid) from public, anon, authenticated;
grant execute on function public.link_learning_history(uuid,uuid) to service_role;

commit;
