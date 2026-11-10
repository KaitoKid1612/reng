-- Study reminders as browser notifications (Web Push, 10/11/2026), the channel the user chose
-- while production sends no email. A device that turns reminders on stores its push
-- subscription; the evening job sends at most one reminder per person and day (push_log), with
-- the same "only when there is work" rule and frequency as the reminder email. Only the server
-- reads or writes these tables. The running app keeps working before and after this migration.
begin;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- One browser has one endpoint; signing in as someone else there moves it to that person.
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) between 1 and 200),
  auth text not null check (length(auth) between 1 and 100),
  user_agent text not null default '' check (length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0)
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create table public.push_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('daily_reminder')),
  for_date date not null,
  sent_count integer not null default 0 check (sent_count >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, for_date)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_log enable row level security;
revoke all on public.push_subscriptions, public.push_log from public, anon, authenticated;
grant all on public.push_subscriptions, public.push_log to service_role;

-- 20261110111047 plus the learner's devices and push records.
create or replace function public.anonymize_learner(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'reng:not_found';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and deleted_at is not null) then
    -- Already done; the server may retry the auth step after a failure.
    return;
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'teacher')
    or exists (select 1 from public.platform_admins where user_id = p_user_id)
    or exists (select 1 from public.lessons where owner_id = p_user_id)
    or exists (select 1 from public.classes where teacher_id = p_user_id) then
    raise exception 'reng:teaching_account';
  end if;
  update public.profiles set full_name = 'Học viên đã xóa', deleted_at = now()
    where id = p_user_id;
  update public.enrollments set left_at = now() where user_id = p_user_id and left_at is null;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.email_log where user_id = p_user_id;
  delete from public.push_subscriptions where user_id = p_user_id;
  delete from public.push_log where user_id = p_user_id;
  delete from public.join_attempts where user_id = p_user_id;
  delete from public.learning_history_archives where learner_id = p_user_id;
  delete from public.lesson_shares where recipient_id = p_user_id;
  -- A teaching application that was never approved, or a paused one without lessons or classes.
  delete from public.teacher_accounts where user_id = p_user_id;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_user_id, 'account.anonymized', p_user_id::text);
end;
$$;

commit;
