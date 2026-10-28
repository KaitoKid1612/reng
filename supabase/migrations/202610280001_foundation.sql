-- Artifact giai đoạn 1. Áp dụng bằng Supabase CLI vào môi trường được chỉ định.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now()
);
create table public.lessons (
  id text primary key,
  owner_id uuid not null references public.profiles(id),
  course_id text not null default 'n5',
  order_no integer not null check (order_no > 0),
  title text not null,
  draft_content jsonb not null default '{"schemaVersion":1,"vocab":[],"grammar":[],"slides":[],"questions":[]}'::jsonb check (jsonb_typeof(draft_content) = 'object'),
  draft_revision integer not null default 0 check (draft_revision >= 0),
  published_version_id uuid,
  visibility text not null default 'class' check (visibility in ('public', 'class')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_owner_idx on public.lessons(owner_id);
create index lessons_course_order_idx on public.lessons(course_id, order_no);

create table public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons(id),
  version_no integer not null check (version_no > 0),
  title text not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published_at timestamptz not null default now(),
  unique (lesson_id, version_no), unique (lesson_id, id)
);
alter table public.lessons add constraint published_version_belongs_to_lesson
  foreign key (id, published_version_id) references public.lesson_versions(lesson_id, id)
  deferrable initially deferred;

create table public.audio_assets (
  hash text primary key check (hash ~ '^[a-f0-9]{32}$'),
  text text not null, voice text not null, url text not null,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  duration_ms integer check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

create function public.initialize_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, role)
    values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200), 'student');
  return new;
end;
$$;
revoke all on function public.initialize_profile() from public;
create trigger auth_user_profile after insert on auth.users
for each row execute function public.initialize_profile();

create function public.reject_published_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Published lesson versions are immutable';
end;
$$;
revoke all on function public.reject_published_change() from public;
create trigger immutable_lesson_version before update or delete on public.lesson_versions
for each row execute function public.reject_published_change();

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.audio_assets enable row level security;
revoke all on public.profiles, public.lessons, public.lesson_versions, public.audio_assets from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.lessons, public.lesson_versions to authenticated;
grant insert (id, owner_id, course_id, order_no, title, draft_content, visibility) on public.lessons to authenticated;
grant update (course_id, order_no, title, draft_content, draft_revision, visibility, archived_at, updated_at) on public.lessons to authenticated;
grant all on public.profiles, public.lessons, public.lesson_versions, public.audio_assets to service_role;

create policy profile_read_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy lesson_owner_read on public.lessons for select to authenticated using (
  owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
);
create policy lesson_owner_insert on public.lessons for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
);
create policy lesson_owner_update on public.lessons for update to authenticated using (
  owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
) with check (
  owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
);
create policy version_owner_read on public.lesson_versions for select to authenticated using (
  exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid()))
);
commit;
