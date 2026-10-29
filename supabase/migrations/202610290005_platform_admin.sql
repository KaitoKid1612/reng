-- Platform administration for the pilot: operators approve, suspend and track rented teacher
-- accounts. Admin rights are granted only by SQL or the local script, never by the client.
begin;

create table public.platform_admins (
  user_id uuid primary key references public.profiles(id),
  granted_at timestamptz not null default now(),
  note text not null default ''
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;
grant select on public.platform_admins to service_role;

create table public.platform_settings (
  id boolean primary key default true check (id),
  teacher_approval_required boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.platform_settings(id) values (true);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select, update on public.platform_settings to service_role;

-- access_until is the paid period shown to operators; it does not suspend anyone by itself.
alter table public.teacher_accounts
  add column requested_at timestamptz,
  add column access_until date,
  add column admin_note text not null default '' check (length(admin_note) <= 500);

create function public.is_platform_admin(p_user_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = p_user_id);
$$;
revoke all on function public.is_platform_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_platform_admin(uuid) to service_role;

-- With approval required, a verified user's request stays pending until an admin approves it.
create or replace function public.activate_teacher(p_user_id uuid, p_terms_version text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  verified_at timestamptz;
  current_status text;
  needs_approval boolean;
begin
  if p_terms_version is distinct from '2026-10-29' then raise exception 'reng:invalid_terms'; end if;
  select email_confirmed_at into verified_at from auth.users where id = p_user_id;
  if verified_at is null then raise exception 'reng:email_unverified'; end if;
  perform pg_advisory_xact_lock(hashtextextended('teacher:' || p_user_id::text, 0));
  select teacher_approval_required into needs_approval from public.platform_settings where id;
  select status into current_status from public.teacher_accounts where user_id = p_user_id for update;
  if current_status = 'suspended' then raise exception 'reng:teacher_suspended'; end if;
  if current_status = 'active' or (current_status = 'pending' and needs_approval) then
    return current_status;
  end if;
  if current_status = 'pending' then
    update public.teacher_accounts set status = 'active', activated_at = now() where user_id = p_user_id;
  else
    insert into public.teacher_accounts(user_id, status, terms_version, accepted_terms_at,
        email_verified_at, activated_at, requested_at)
      values (p_user_id, case when needs_approval then 'pending' else 'active' end, p_terms_version,
        now(), verified_at, case when needs_approval then null else now() end, now());
  end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_user_id, case when needs_approval then 'teacher.requested' else 'teacher.activated' end, p_user_id::text);
  return case when needs_approval then 'pending' else 'active' end;
end;
$$;
revoke all on function public.activate_teacher(uuid, text) from public, anon, authenticated;
grant execute on function public.activate_teacher(uuid, text) to service_role;

create function public.admin_set_teacher_status(p_admin_id uuid, p_user_id uuid, p_status text)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_platform_admin(p_admin_id) then raise exception 'reng:not_found'; end if;
  if p_status is null or p_status not in ('active', 'suspended') then raise exception 'reng:invalid_input'; end if;
  update public.teacher_accounts
    set status = p_status, activated_at = case when p_status = 'active' then coalesce(activated_at, now()) else activated_at end
    where user_id = p_user_id;
  if not found then raise exception 'reng:not_found'; end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_admin_id, 'admin.teacher.' || p_status, p_user_id::text);
  return p_status;
end;
$$;
revoke all on function public.admin_set_teacher_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_teacher_status(uuid, uuid, text) to service_role;

create function public.admin_update_teacher_plan(p_admin_id uuid, p_user_id uuid, p_access_until date, p_note text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_platform_admin(p_admin_id) then raise exception 'reng:not_found'; end if;
  update public.teacher_accounts set access_until = p_access_until, admin_note = coalesce(p_note, '')
    where user_id = p_user_id;
  if not found then raise exception 'reng:not_found'; end if;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_admin_id, 'admin.teacher.plan', p_user_id::text);
end;
$$;
revoke all on function public.admin_update_teacher_plan(uuid, uuid, date, text) from public, anon, authenticated;
grant execute on function public.admin_update_teacher_plan(uuid, uuid, date, text) to service_role;

create function public.admin_set_teacher_approval(p_admin_id uuid, p_required boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_platform_admin(p_admin_id) then raise exception 'reng:not_found'; end if;
  update public.platform_settings set teacher_approval_required = coalesce(p_required, true),
    updated_at = now(), updated_by = p_admin_id where id;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_admin_id, case when p_required then 'admin.approval.on' else 'admin.approval.off' end, 'platform');
end;
$$;
revoke all on function public.admin_set_teacher_approval(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_teacher_approval(uuid, boolean) to service_role;

commit;
