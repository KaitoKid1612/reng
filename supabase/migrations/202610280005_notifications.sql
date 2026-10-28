-- Phase 4 artifact: opt-in reminder preferences and an email job log with leases.
begin;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reminder_frequency text not null default 'off'
    check (reminder_frequency in ('daily', 'due_only', 'off')),
  weekly_enabled boolean not null default false,
  teacher_digest_enabled boolean not null default false,
  push_enabled boolean not null default false,
  consented_at timestamptz,
  -- Set from verified provider webhooks; sending stays paused until the user re-enables it.
  delivery_paused_at timestamptz,
  delivery_pause_reason text check (delivery_pause_reason in ('bounced', 'complained')),
  updated_at timestamptz not null default now(),
  check ((delivery_paused_at is null) = (delivery_pause_reason is null))
);

create table public.email_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  email_type text not null check (email_type in ('daily_reminder', 'weekly_summary', 'teacher_digest')),
  for_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  idempotency_key text not null unique,
  provider_message_id text,
  attempts integer not null default 0 check (attempts >= 0),
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  opened_at timestamptz,
  last_error text check (char_length(last_error) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, email_type, for_date),
  check ((status = 'sent') = (sent_at is not null)),
  check (status <> 'sending' or lease_until is not null)
);
create index email_log_due_idx on public.email_log(status, next_attempt_at);
create index email_log_provider_message_idx on public.email_log(provider_message_id);

alter table public.notification_preferences enable row level security;
alter table public.email_log enable row level security;
revoke all on public.notification_preferences, public.email_log from anon, authenticated;
grant select on public.notification_preferences to authenticated;
grant all on public.notification_preferences, public.email_log to service_role;
create policy notification_preferences_owner_read on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));

-- Claims due jobs for one worker. SKIP LOCKED keeps concurrent cron runs from taking the
-- same job; an expired lease hands an interrupted job to the next run.
create function public.claim_email_jobs(
  p_limit integer, p_lease_seconds integer, p_max_attempts integer
) returns setof public.email_log
language plpgsql security invoker set search_path = '' as $$
begin
  update public.email_log l
    set status = 'failed', lease_until = null, last_error = 'lease_expired', updated_at = now()
    where l.status = 'sending' and l.lease_until < now() and l.attempts >= p_max_attempts;
  return query
  update public.email_log l
    set status = 'sending', attempts = l.attempts + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds), updated_at = now()
    where (l.user_id, l.email_type, l.for_date) in (
      select c.user_id, c.email_type, c.for_date from public.email_log c
      where c.attempts < p_max_attempts and (
        (c.status in ('pending', 'failed') and c.next_attempt_at <= now())
        or (c.status = 'sending' and c.lease_until < now())
      )
      order by c.next_attempt_at
      limit p_limit
      for update skip locked
    )
    returning l.*;
end;
$$;

-- Account emails live in auth.users; only the server reads them to address reminders.
create function public.email_recipients(p_user_ids uuid[])
returns table(user_id uuid, email text, full_name text, role text)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(u.email, ''), p.full_name, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = any(p_user_ids);
$$;

revoke all on function public.claim_email_jobs(integer, integer, integer) from public, anon, authenticated;
revoke all on function public.email_recipients(uuid[]) from public, anon, authenticated;
grant execute on function public.claim_email_jobs(integer, integer, integer) to service_role;
grant execute on function public.email_recipients(uuid[]) to service_role;

commit;
