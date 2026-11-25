-- A deleted account also loses the learning history a teacher imported for its email but that was
-- never linked to the account (the sheet import links by email only when it can). The privacy page
-- promises imported history goes at once; before this, only linked rows were deleted. The email is
-- read before the server's auth step removes it. Everything else is as in 20261110112415_web_push.
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
  delete from public.learning_history_archives
    where learner_id = p_user_id
      or (learner_id is null and learner_email = (
        select lower(btrim(email)) from auth.users where id = p_user_id
      ));
  delete from public.lesson_shares where recipient_id = p_user_id;
  -- A teaching application that was never approved, or a paused one without lessons or classes.
  delete from public.teacher_accounts where user_id = p_user_id;
  insert into public.audit_events(actor_id, action, resource_id)
    values (p_user_id, 'account.anonymized', p_user_id::text);
end;
$$;

revoke all on function public.anonymize_learner(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_learner(uuid) to service_role;
