-- Weekly board: a teacher puts a class on the board shared by all of their classes that joined it,
-- and any learner can stay off every board. Both are written by the server (service role) only.
begin;

alter table public.classes add column weekly_board boolean not null default false;
alter table public.profiles add column hide_from_board boolean not null default false;

commit;
