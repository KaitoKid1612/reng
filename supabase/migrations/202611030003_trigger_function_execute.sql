-- Trigger functions only ever run as triggers, yet new functions are executable by PUBLIC, and
-- Supabase also grants anon and authenticated. The database advisor flags the security definer
-- ones (initialize_profile, sync_legacy_teacher_grant, sync_teacher_capability). Calling a trigger
-- function directly fails anyway; this removes the grant itself. Postgres checks EXECUTE on a
-- trigger function only when a trigger is created, so every trigger keeps firing. Helpers that RLS
-- policies call (teaches_class, teaches_assignment) are not trigger functions and keep their grant.
begin;

do $$
declare
  trigger_function regprocedure;
begin
  for trigger_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      trigger_function
    );
  end loop;
end;
$$;

commit;
