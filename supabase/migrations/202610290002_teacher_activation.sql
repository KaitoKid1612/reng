-- Supabase's service_role cannot SELECT auth.users directly. Expose only this narrow,
-- service-only verification operation instead of granting access to the Auth table.
begin;
alter function public.activate_teacher(uuid, text) security definer;
revoke all on function public.activate_teacher(uuid, text) from public, anon, authenticated;
grant execute on function public.activate_teacher(uuid, text) to service_role;
commit;
