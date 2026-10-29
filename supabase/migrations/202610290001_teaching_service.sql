-- Upgrade existing projects without rewriting historical lesson snapshots.
begin;

create table public.teacher_accounts (
  user_id uuid primary key references public.profiles(id),
  status text not null check (status in ('pending', 'active', 'suspended')),
  terms_version text,
  accepted_terms_at timestamptz,
  email_verified_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_id text not null,
  created_at timestamptz not null default now()
);
create index audit_events_actor_time_idx on public.audit_events(actor_id, created_at);
insert into public.teacher_accounts(user_id, status, activated_at)
  select id, 'active', now() from public.profiles where role = 'teacher';
alter table public.teacher_accounts enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.teacher_accounts, public.audit_events from anon, authenticated;
grant select on public.teacher_accounts to authenticated;
grant all on public.teacher_accounts to service_role;
grant select, insert on public.audit_events to service_role;
create policy teacher_account_own_read on public.teacher_accounts for select to authenticated
  using (user_id = (select auth.uid()));

-- profiles.role remains a server-controlled compatibility capability for existing RPCs/RLS.
-- It no longer determines whether someone can be a learner.
create function public.sync_teacher_capability() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set role = case when new.status = 'active' then 'teacher' else 'student' end
    where id = new.user_id and role is distinct from case when new.status = 'active' then 'teacher' else 'student' end;
  return new;
end;
$$;
revoke all on function public.sync_teacher_capability() from public;
create trigger teacher_account_capability after insert or update of status on public.teacher_accounts
  for each row execute function public.sync_teacher_capability();

-- Keep existing trusted administrative provisioning scripts compatible after the backfill.
create function public.sync_legacy_teacher_grant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'teacher' and old.role is distinct from new.role then
    insert into public.teacher_accounts(user_id, status, activated_at) values(new.id, 'active', now())
      on conflict (user_id) do update set status = 'active', activated_at = coalesce(public.teacher_accounts.activated_at, now());
  elsif new.role = 'student' and old.role = 'teacher' then
    update public.teacher_accounts set status = 'suspended' where user_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;
revoke all on function public.sync_legacy_teacher_grant() from public;
create trigger legacy_teacher_grant after update of role on public.profiles
  for each row execute function public.sync_legacy_teacher_grant();

create function public.activate_teacher(p_user_id uuid, p_terms_version text)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  verified_at timestamptz;
  current_status text;
begin
  if p_terms_version is distinct from '2026-10-29' then raise exception 'masu:invalid_terms'; end if;
  select email_confirmed_at into verified_at from auth.users where id = p_user_id;
  if verified_at is null then raise exception 'masu:email_unverified'; end if;
  perform pg_advisory_xact_lock(hashtextextended('teacher:' || p_user_id::text, 0));
  select status into current_status from public.teacher_accounts where user_id = p_user_id for update;
  if current_status = 'suspended' then raise exception 'masu:teacher_suspended'; end if;
  if current_status = 'active' then return 'active'; end if;
  insert into public.teacher_accounts(user_id, status, terms_version, accepted_terms_at, email_verified_at, activated_at)
    values(p_user_id, 'active', p_terms_version, now(), verified_at, now())
    on conflict(user_id) do update set status = 'active', terms_version = p_terms_version,
      accepted_terms_at = now(), email_verified_at = verified_at, activated_at = now();
  insert into public.audit_events(actor_id, action, resource_id) values(p_user_id, 'teacher.activated', p_user_id::text);
  return 'active';
end;
$$;
revoke all on function public.activate_teacher(uuid, text) from public, anon, authenticated;
grant execute on function public.activate_teacher(uuid, text) to service_role;

alter table public.classes
  add column capacity integer check (capacity > 0 and capacity <= 1000),
  add column meeting_url text check (meeting_url is null or meeting_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  add column subject text not null default 'japanese' check(subject in ('japanese', 'chinese')),
  add column language_tag text not null default 'ja-JP' check(language_tag in ('ja-JP', 'zh-Hans', 'zh-Hant')),
  add column instruction_language_tag text not null default 'vi-VN' check(instruction_language_tag = 'vi-VN'),
  add column revision integer not null default 0 check(revision >= 0);

create function public.guard_class_capacity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.capacity is not null and (select count(*) from public.enrollments e where e.class_id = new.id and e.left_at is null) > new.capacity then
    raise exception 'masu:capacity_below_members';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_class_capacity() from public;
create trigger class_capacity_guard before update of capacity on public.classes
  for each row execute function public.guard_class_capacity();

create function public.update_class_settings(
  p_teacher_id uuid, p_class_id uuid, p_expected_revision integer,
  p_name text, p_pass_score integer, p_active boolean, p_capacity integer,
  p_meeting_url text, p_subject text, p_language_tag text
) returns integer language plpgsql security invoker set search_path = '' as $$
declare current_class public.classes%rowtype;
begin
  select c.* into current_class from public.classes c join public.profiles p on p.id = c.teacher_id
    where c.id = p_class_id and c.teacher_id = p_teacher_id and p.role = 'teacher' for update of c;
  if not found then raise exception 'masu:class_not_found'; end if;
  if current_class.revision is distinct from p_expected_revision then raise exception 'masu:revision_conflict'; end if;
  update public.classes set name = p_name, pass_score = p_pass_score, active = p_active,
    capacity = p_capacity, meeting_url = p_meeting_url, subject = p_subject, language_tag = p_language_tag,
    revision = revision + 1 where id = p_class_id;
  return current_class.revision + 1;
end;
$$;
revoke all on function public.update_class_settings(uuid,uuid,integer,text,integer,boolean,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.update_class_settings(uuid,uuid,integer,text,integer,boolean,integer,text,text,text) to service_role;

create or replace function public.publish_lesson(
  p_lesson_id text, p_owner_id uuid, p_expected_revision integer,
  p_title text, p_title_ja text, p_summary text, p_order_no integer,
  p_course_id text, p_content jsonb, p_is_sample boolean default false
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  current_lesson public.lessons%rowtype;
  next_version integer;
  version_id uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where id = p_owner_id and role = 'teacher') then
    raise exception 'Owner must be a teacher';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or jsonb_typeof(p_content) is distinct from 'object' or coalesce(p_content ->> 'schemaVersion', '') not in ('1', '2') then
    raise exception 'Invalid revision or content contract';
  end if;
  insert into public.lessons(id, owner_id, order_no, title, title_ja, summary, course_id)
    values(p_lesson_id, p_owner_id, p_order_no, p_title, p_title_ja, p_summary, p_course_id)
    on conflict (id) do nothing;
  select * into current_lesson from public.lessons where id = p_lesson_id for update;
  if current_lesson.owner_id <> p_owner_id or current_lesson.draft_revision <> p_expected_revision then
    raise exception 'Owner or revision conflict';
  end if;
  select coalesce(max(version_no), 0) + 1 into next_version from public.lesson_versions where lesson_id = p_lesson_id;
  update public.lessons set title = p_title, title_ja = p_title_ja, summary = p_summary,
    order_no = p_order_no, course_id = p_course_id, draft_content = p_content,
    draft_revision = draft_revision + 1, updated_at = now()
    where id = p_lesson_id;
  insert into public.lesson_versions(id, lesson_id, version_no, title, title_ja, summary, order_no, course_id, is_sample, content)
    values(version_id, p_lesson_id, next_version, p_title, p_title_ja, p_summary, p_order_no, p_course_id, coalesce(p_is_sample, false), p_content);
  update public.lessons set published_version_id = version_id where id = p_lesson_id;
  return version_id;
end;
$$;

revoke all on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.publish_lesson(text, uuid, integer, text, text, text, integer, text, jsonb, boolean) to service_role;


create or replace function public.join_class(p_user_id uuid, p_code text)
returns table(status text, class_id uuid)
language plpgsql security invoker set search_path = '' as $$
declare
  v_class_id uuid;
  v_left_at timestamptz;
  v_is_member boolean;
  v_capacity integer;
begin
  if not exists (select 1 from public.profiles p where p.id = p_user_id ) then
    return query select 'not_found'::text, null::uuid;
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
  select c.id, c.capacity into v_class_id, v_capacity from public.classes c
    where c.join_code = p_code and c.join_enabled and c.active for update;
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
  if v_capacity is not null and (select count(*) from public.enrollments e where e.class_id = v_class_id and e.left_at is null) >= v_capacity then
    return query select 'class_full'::text, null::uuid;
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


-- Only the application server can supply the verified actor. Learners receive a filtered DTO.
create function public.read_lesson_version(p_user_id uuid, p_lesson_id text, p_version_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  lesson public.lessons%rowtype;
  chosen uuid;
  member_version uuid;
begin
  select * into lesson from public.lessons where id = p_lesson_id and archived_at is null;
  if not found or lesson.published_version_id is null then return null; end if;
  if lesson.visibility = 'public' or (lesson.owner_id = p_user_id and exists(select 1 from public.profiles where id = p_user_id and role = 'teacher')) then
    chosen := coalesce(p_version_id, lesson.published_version_id);
  else
    select cl.lesson_version_id into member_version from public.class_lessons cl
      join public.classes c on c.id = cl.class_id and c.active
      join public.enrollments e on e.class_id = c.id and e.user_id = p_user_id and e.left_at is null
      where cl.lesson_id = p_lesson_id and cl.available_at <= now()
        and (p_version_id is null or cl.lesson_version_id = p_version_id)
      order by cl.available_at desc, c.id limit 1;
    chosen := member_version;
  end if;
  return (select to_jsonb(v) from public.lesson_versions v where v.id = chosen and v.lesson_id = p_lesson_id);
end;
$$;
revoke all on function public.read_lesson_version(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.read_lesson_version(uuid,text,uuid) to service_role;

-- Public visibility is a separate, deliberate owner operation, never a side effect of publish.
create function public.set_lesson_visibility(p_owner_id uuid, p_lesson_id text, p_visibility text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_visibility not in ('public', 'class') then raise exception 'masu:invalid_visibility'; end if;
  update public.lessons set visibility = p_visibility where id = p_lesson_id and owner_id = p_owner_id
    and exists(select 1 from public.profiles where id = p_owner_id and role = 'teacher');
  if not found then raise exception 'masu:lesson_not_found'; end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values(p_owner_id, 'lesson.visibility.' || p_visibility, p_lesson_id);
end;
$$;
revoke all on function public.set_lesson_visibility(uuid,text,text) from public, anon, authenticated;
grant execute on function public.set_lesson_visibility(uuid,text,text) to service_role;
commit;
