-- A learner deletes their own account (10/11/2026). The person behind it disappears: the name
-- becomes "Học viên đã xóa", the auth user is soft-deleted by the server right after this
-- function (email and sign-in removed), reminders, sent-email records, join attempts, imported
-- history (it carries name and email) and lesson shares go, and the learner leaves every class.
-- What they did stays, no longer tied to a person: submissions, answers, review history and
-- attendance are immutable and feed the teacher's class statistics, which must not shift.
-- Teaching and admin accounts are refused; an operator handles those. The running app keeps
-- working before and after this migration (it only adds a column and two functions).
begin;

alter table public.profiles add column deleted_at timestamptz;

create function public.anonymize_learner(p_user_id uuid) returns void
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
  delete from public.join_attempts where user_id = p_user_id;
  delete from public.learning_history_archives where learner_id = p_user_id;
  delete from public.lesson_shares where recipient_id = p_user_id;
  -- A teaching application that was never approved, or a paused one without lessons or classes.
  delete from public.teacher_accounts where user_id = p_user_id;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_user_id, 'account.anonymized', p_user_id::text);
end;
$$;
revoke all on function public.anonymize_learner(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_learner(uuid) to service_role;

-- A deleted learner keeps no email in the teacher's roster, whatever the auth row still holds.
create or replace function public.class_roster(p_class_id uuid)
returns table(user_id uuid, full_name text, email text, joined_at timestamptz, left_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.user_id, p.full_name,
    case when p.deleted_at is null then coalesce(u.email, '') else '' end,
    e.joined_at, e.left_at
  from public.enrollments e
  join public.profiles p on p.id = e.user_id
  left join auth.users u on u.id = e.user_id
  where e.class_id = p_class_id
  order by p.full_name, e.user_id;
$$;

commit;
