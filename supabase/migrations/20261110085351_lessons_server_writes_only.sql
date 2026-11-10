-- Lessons change only through the server (10/11/2026). The first migration let a signed-in
-- teacher INSERT and UPDATE their own lessons with the Data API, but the app never writes
-- lessons that way: it uses the service role and RPCs that check sharing rules, size, revisions
-- and audit. With the direct grants a teacher could skip those checks, for example make a copy
-- of another teacher's shared lesson public (blocked in set_lesson_visibility since 02/11),
-- un-archive a lesson, or store a draft the editor would refuse. Reading their own lessons stays
-- allowed. The running app keeps working before and after this migration.
begin;

-- Revoking at table level also removes the column grants (id, owner_id, … visibility).
revoke insert, update, delete on public.lessons from authenticated, anon;
drop policy if exists lesson_owner_insert on public.lessons;
drop policy if exists lesson_owner_update on public.lessons;

commit;
