-- A display name is at most 80 characters in the app and sign-up keeps the first 200 characters of
-- the name Auth provides (Google sign-in included). A signed-in user may still update their own
-- full_name through the Data API (grant update (full_name)), which had no limit at all.
-- 200 matches the sign-up cut, so no existing sign-up path can break; the migration fails, and
-- changes nothing, if a longer name was already written that way.
alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 200);
