-- The teacher's log of what each class session covered: date, lesson version, last slide shown
-- and notes. Only the server reads or writes it, after checking the class owner; learners never
-- see these notes.
begin;

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id),
  taught_on date not null,
  lesson_id text,
  lesson_version_id uuid,
  slide_reached integer check (slide_reached between 1 and 500),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (class_id, lesson_id) references public.class_lessons(class_id, lesson_id),
  foreign key (lesson_id, lesson_version_id) references public.lesson_versions(lesson_id, id),
  check ((lesson_id is null) = (lesson_version_id is null)),
  check (slide_reached is null or lesson_id is not null)
);
create index class_sessions_class_idx on public.class_sessions(class_id, taught_on desc, created_at desc);
alter table public.class_sessions enable row level security;
revoke all on public.class_sessions from anon, authenticated;
grant select, insert, delete on public.class_sessions to service_role;

commit;
