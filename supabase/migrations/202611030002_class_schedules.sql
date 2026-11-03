-- A class's weekly timetable, shown to learners as the next session. Slots are Vietnam wall-clock
-- times: [{ "weekday": 1-7 (ISO, Monday = 1), "start": "HH:MM", "minutes": 15-300 }]. The app
-- validates each slot; the database keeps the shape and size bounded. Only the server reads or
-- writes it, after checking the class owner or member.
begin;

create table public.class_schedules (
  class_id uuid primary key references public.classes(id),
  slots jsonb not null default '[]'::jsonb
    check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) <= 14),
  note text not null default '' check (char_length(note) <= 300),
  updated_at timestamptz not null default now()
);
alter table public.class_schedules enable row level security;
revoke all on public.class_schedules from anon, authenticated;
grant select, insert, update on public.class_schedules to service_role;

commit;
