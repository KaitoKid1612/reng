-- Teacher-to-teacher sharing. A grant covers exactly one published version; copies are new
-- lessons owned by the recipient and never inherit read access to the source owner's data.
begin;

create table public.lesson_shares (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons(id),
  version_id uuid not null references public.lesson_versions(id),
  owner_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  recipient_email text not null,
  permission text not null check (permission in ('view', 'copy')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (owner_id <> recipient_id)
);
create unique index lesson_shares_active_idx on public.lesson_shares(version_id, recipient_id)
  where revoked_at is null;
create index lesson_shares_recipient_idx on public.lesson_shares(recipient_id, granted_at desc)
  where revoked_at is null;
create index lesson_shares_owner_idx on public.lesson_shares(owner_id, lesson_id);
alter table public.lesson_shares enable row level security;
revoke all on public.lesson_shares from anon, authenticated;
grant select, update on public.lesson_shares to service_role;

-- Provenance of a copy. The first release does not allow copies to be shared further.
alter table public.lessons
  add column copied_from_version_id uuid references public.lesson_versions(id),
  add column copy_attribution text;

-- Security definer only to match the recipient's email in auth.users. Failed lookups are
-- committed as audit rows so the hourly limit also slows down probing for teacher emails.
create function public.share_lesson_version(
  p_owner_id uuid, p_lesson_id text, p_version_id uuid, p_recipient_email text, p_permission text
) returns table(status text, share_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  normalized_email text := lower(trim(coalesce(p_recipient_email, '')));
  granted uuid;
begin
  if p_permission is null or p_permission not in ('view', 'copy') then
    raise exception 'reng:invalid_input';
  end if;
  if not exists (
    select 1 from public.lessons l join public.profiles p on p.id = l.owner_id
    where l.id = p_lesson_id and l.owner_id = p_owner_id and l.archived_at is null and p.role = 'teacher'
  ) then
    raise exception 'reng:not_found';
  end if;
  if exists (select 1 from public.lessons where id = p_lesson_id and copied_from_version_id is not null) then
    raise exception 'reng:reshare_not_allowed';
  end if;
  if not exists (select 1 from public.lesson_versions where id = p_version_id and lesson_id = p_lesson_id) then
    raise exception 'reng:version_not_found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('share:' || p_owner_id::text, 0));
  if (
    select count(*) from public.audit_events
    where actor_id = p_owner_id and action = 'lesson.share_attempt' and created_at > now() - interval '1 hour'
  ) >= 60 then
    return query select 'rate_limited'::text, null::uuid;
    return;
  end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_owner_id, 'lesson.share_attempt', p_lesson_id);
  select u.id into recipient from auth.users u
    join public.teacher_accounts t on t.user_id = u.id and t.status = 'active'
    where lower(u.email) = normalized_email and u.id <> p_owner_id;
  if recipient is null then
    return query select 'recipient_not_found'::text, null::uuid;
    return;
  end if;
  update public.lesson_shares s set permission = p_permission
    where s.version_id = p_version_id and s.recipient_id = recipient and s.revoked_at is null
    returning s.id into granted;
  if granted is null then
    insert into public.lesson_shares(lesson_id, version_id, owner_id, recipient_id, recipient_email, permission)
      values (p_lesson_id, p_version_id, p_owner_id, recipient, normalized_email, p_permission)
      returning id into granted;
  end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_owner_id, 'lesson.shared.' || p_permission, granted::text);
  return query select 'shared'::text, granted;
end;
$$;
revoke all on function public.share_lesson_version(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.share_lesson_version(uuid, text, uuid, text, text) to service_role;

-- Revoking blocks new reads and copies; copies already made stay with their new owner.
create function public.revoke_lesson_share(p_owner_id uuid, p_share_id uuid)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare
  revoked timestamptz;
begin
  update public.lesson_shares set revoked_at = coalesce(revoked_at, now())
    where id = p_share_id and owner_id = p_owner_id
    returning revoked_at into revoked;
  if revoked is null then
    raise exception 'reng:not_found';
  end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_owner_id, 'lesson.share_revoked', p_share_id::text);
  return revoked;
end;
$$;
revoke all on function public.revoke_lesson_share(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_lesson_share(uuid, uuid) to service_role;

-- Shared helper: insert a draft for a teacher, idempotent per request like create_teaching_lesson.
create function public.insert_lesson_copy(
  p_teacher_id uuid, p_request_id uuid, p_fingerprint text, p_title text, p_title_ja text,
  p_summary text, p_order integer, p_course_id text, p_content jsonb, p_authoring jsonb,
  p_source_version_id uuid, p_attribution text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  new_lesson_id text := 'lesson-' || replace(gen_random_uuid()::text, '-', '');
  existing public.lessons%rowtype;
begin
  if p_request_id is null then
    raise exception 'reng:invalid_input';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('create:' || p_teacher_id::text || ':' || p_request_id::text, 0));
  select * into existing from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id;
  if found then
    if existing.creation_fingerprint is distinct from p_fingerprint then
      raise exception 'reng:request_conflict';
    end if;
    return existing.id;
  end if;
  if (select count(*) from public.lessons where owner_id = p_teacher_id and archived_at is null) >= 2000 then
    raise exception 'reng:quota_exceeded';
  end if;
  insert into public.lessons(id, owner_id, title, title_ja, summary, order_no, course_id, draft_content,
      authoring_state, creation_request_id, creation_fingerprint, copied_from_version_id, copy_attribution)
    values (new_lesson_id, p_teacher_id, p_title, p_title_ja, p_summary, greatest(p_order, 1), p_course_id,
      p_content, p_authoring, p_request_id, p_fingerprint, p_source_version_id, p_attribution);
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_teacher_id, 'lesson.copied', new_lesson_id);
  return new_lesson_id;
end;
$$;
revoke all on function public.insert_lesson_copy(uuid, uuid, text, text, text, text, integer, text, jsonb, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.insert_lesson_copy(uuid, uuid, text, text, text, text, integer, text, jsonb, jsonb, uuid, text) to service_role;

-- A copy takes the shared version without teacher notes; answers must be reviewed again.
create function public.copy_shared_lesson(p_teacher_id uuid, p_share_id uuid, p_request_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  share public.lesson_shares%rowtype;
  source public.lesson_versions%rowtype;
  owner_name text;
  content jsonb;
begin
  if not exists (
    select 1 from public.teacher_accounts t join public.profiles p on p.id = t.user_id
    where t.user_id = p_teacher_id and t.status = 'active' and p.role = 'teacher'
  ) then
    raise exception 'reng:not_found';
  end if;
  -- A retried request returns its copy even if the grant was revoked in between.
  if exists (
    select 1 from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id
  ) then
    return public.insert_lesson_copy(p_teacher_id, p_request_id, md5('copy:' || p_share_id::text),
      null, null, null, 1, null, null, null, null, null);
  end if;
  select * into share from public.lesson_shares
    where id = p_share_id and recipient_id = p_teacher_id and revoked_at is null and permission = 'copy';
  if not found then
    raise exception 'reng:not_found';
  end if;
  select * into source from public.lesson_versions where id = share.version_id;
  select coalesce(nullif(full_name, ''), 'một giáo viên') into owner_name from public.profiles where id = share.owner_id;
  content := jsonb_set(source.content, '{slides}', coalesce((
    select jsonb_agg(slide - 'teacherNotes' order by position)
    from jsonb_array_elements(source.content -> 'slides') with ordinality as item(slide, position)
  ), '[]'::jsonb));
  return public.insert_lesson_copy(
    p_teacher_id, p_request_id, md5('copy:' || p_share_id::text), source.title, source.title_ja,
    source.summary, source.order_no, source.course_id, content,
    case when content ->> 'schemaVersion' = '2' then jsonb_build_object(
      'templateId', 'starter', 'templateVersion', 1, 'audience', '', 'prerequisites', '',
      'difficulty', 'beginner', 'step', 0, 'generatedSlides', '{}'::jsonb)
    else '{}'::jsonb end,
    source.id,
    format('Sao chép từ “%s” (phiên bản %s) của %s', source.title, source.version_no, owner_name));
end;
$$;
revoke all on function public.copy_shared_lesson(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.copy_shared_lesson(uuid, uuid, uuid) to service_role;

-- Reusing one's own lesson copies the current draft with notes and answer reviews, but no
-- class, assignment or score data. A duplicate of a copy keeps the copy's provenance.
create function public.duplicate_lesson(p_teacher_id uuid, p_lesson_id text, p_request_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  source public.lessons%rowtype;
begin
  -- A retried request returns its copy before the source is read again.
  if exists (
    select 1 from public.lessons where owner_id = p_teacher_id and creation_request_id = p_request_id
  ) then
    return public.insert_lesson_copy(p_teacher_id, p_request_id, md5('duplicate:' || p_lesson_id),
      null, null, null, 1, null, null, null, null, null);
  end if;
  select l.* into source from public.lessons l join public.profiles p on p.id = l.owner_id
    where l.id = p_lesson_id and l.owner_id = p_teacher_id and l.archived_at is null and p.role = 'teacher';
  if not found then
    raise exception 'reng:not_found';
  end if;
  return public.insert_lesson_copy(
    p_teacher_id, p_request_id, md5('duplicate:' || p_lesson_id),
    left(source.title, 148) || ' (bản sao)', source.title_ja, source.summary, source.order_no,
    source.course_id, source.draft_content, source.authoring_state, source.copied_from_version_id,
    source.copy_attribution);
end;
$$;
revoke all on function public.duplicate_lesson(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.duplicate_lesson(uuid, text, uuid) to service_role;

-- Adds the share branch: an active teacher reads exactly the version granted to them.
create or replace function public.read_lesson_version(p_user_id uuid, p_lesson_id text, p_version_id uuid default null)
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
  elsif p_version_id is not null and exists (
    select 1 from public.lesson_shares s
      join public.teacher_accounts t on t.user_id = s.recipient_id and t.status = 'active'
      where s.lesson_id = p_lesson_id and s.version_id = p_version_id and s.recipient_id = p_user_id
        and s.revoked_at is null
  ) then
    chosen := p_version_id;
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
revoke all on function public.read_lesson_version(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.read_lesson_version(uuid, text, uuid) to service_role;

commit;
