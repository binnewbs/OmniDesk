-- ============================================================================
-- Productivity Manager — full schema.
-- Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- Idempotent: safe to run more than once.
-- ============================================================================


-- ---------- supabase/migrations/0001_schema.sql ----------

-- 0001_schema.sql
-- Reproduces Database/scheme.md exactly. No extra columns.
-- Foreign keys, indexes, the avatar bucket and the RLS policies live in 0004.

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text,
  bio        text not null default '',
  avatar     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id          text primary key,
  user_id     uuid not null,
  title       text not null,
  course      text not null,
  description text,
  due_date    text,
  priority    text,
  status      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- note_folders.created_at is epoch ms, not timestamptz (see scheme.md)
create table if not exists public.note_folders (
  id         text primary key,
  user_id    uuid not null,
  name       text not null,
  created_at bigint not null default extract(epoch from now()) * 1000,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- notes.created_at / last_modified are epoch ms (see scheme.md)
create table if not exists public.notes (
  id            text primary key,
  user_id       uuid not null,
  content       text not null default '',
  last_modified bigint not null default extract(epoch from now()) * 1000,
  pinned        boolean not null default false,
  folder_id     text references public.note_folders (id) on delete set null,
  created_at    bigint not null default extract(epoch from now()) * 1000,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table if not exists public.transactions (
  id          text primary key,
  user_id     uuid not null,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric not null check (amount >= 0),
  category    text not null default '',
  description text not null default '',
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- subscriptions has no type column; it is materialised as an expense (see PLAN.md §15)
create table if not exists public.subscriptions (
  id             text primary key,
  user_id        uuid not null,
  name           text not null,
  amount         numeric not null check (amount >= 0),
  category       text not null default '',
  start_date     timestamptz,
  last_processed timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table if not exists public.schedule_classes (
  id          text primary key,
  user_id     uuid not null,
  name        text not null,
  room        text not null default '',
  day         text not null,
  start_time  text not null default '',
  end_time    text not null default '',
  color_theme text not null default '#7c9cff',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists public.cashflow_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  currency   text not null default 'IDR',
  updated_at timestamptz not null default now()
);

-- ---------- supabase/migrations/0002_rls.sql ----------

-- 0002_rls.sql
-- 32 policies: four per table (select, insert, update, delete), all scoped to
-- auth.uid() = user_id. Mirrors the RLS table in Database/scheme.md.
--
-- Each policy is dropped first so the file can be re-applied without erroring
-- on "policy already exists".

alter table public.profiles           enable row level security;
alter table public.assignments        enable row level security;
alter table public.note_folders       enable row level security;
alter table public.notes              enable row level security;
alter table public.transactions       enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.schedule_classes   enable row level security;
alter table public.cashflow_settings  enable row level security;

-- profiles
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_insert" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "profiles_own_delete" on public.profiles;
create policy "profiles_own_select" on public.profiles for select to public using (auth.uid() = user_id);
create policy "profiles_own_insert" on public.profiles for insert to public with check (auth.uid() = user_id);
create policy "profiles_own_update" on public.profiles for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_own_delete" on public.profiles for delete to public using (auth.uid() = user_id);

-- assignments
drop policy if exists "assignments_own_select" on public.assignments;
drop policy if exists "assignments_own_insert" on public.assignments;
drop policy if exists "assignments_own_update" on public.assignments;
drop policy if exists "assignments_own_delete" on public.assignments;
create policy "assignments_own_select" on public.assignments for select to public using (auth.uid() = user_id);
create policy "assignments_own_insert" on public.assignments for insert to public with check (auth.uid() = user_id);
create policy "assignments_own_update" on public.assignments for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assignments_own_delete" on public.assignments for delete to public using (auth.uid() = user_id);

-- note_folders
drop policy if exists "note_folders_own_select" on public.note_folders;
drop policy if exists "note_folders_own_insert" on public.note_folders;
drop policy if exists "note_folders_own_update" on public.note_folders;
drop policy if exists "note_folders_own_delete" on public.note_folders;
create policy "note_folders_own_select" on public.note_folders for select to public using (auth.uid() = user_id);
create policy "note_folders_own_insert" on public.note_folders for insert to public with check (auth.uid() = user_id);
create policy "note_folders_own_update" on public.note_folders for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "note_folders_own_delete" on public.note_folders for delete to public using (auth.uid() = user_id);

-- notes
drop policy if exists "notes_own_select" on public.notes;
drop policy if exists "notes_own_insert" on public.notes;
drop policy if exists "notes_own_update" on public.notes;
drop policy if exists "notes_own_delete" on public.notes;
create policy "notes_own_select" on public.notes for select to public using (auth.uid() = user_id);
create policy "notes_own_insert" on public.notes for insert to public with check (auth.uid() = user_id);
create policy "notes_own_update" on public.notes for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_own_delete" on public.notes for delete to public using (auth.uid() = user_id);

-- transactions
drop policy if exists "transactions_own_select" on public.transactions;
drop policy if exists "transactions_own_insert" on public.transactions;
drop policy if exists "transactions_own_update" on public.transactions;
drop policy if exists "transactions_own_delete" on public.transactions;
create policy "transactions_own_select" on public.transactions for select to public using (auth.uid() = user_id);
create policy "transactions_own_insert" on public.transactions for insert to public with check (auth.uid() = user_id);
create policy "transactions_own_update" on public.transactions for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_own_delete" on public.transactions for delete to public using (auth.uid() = user_id);

-- subscriptions
drop policy if exists "subscriptions_own_select" on public.subscriptions;
drop policy if exists "subscriptions_own_insert" on public.subscriptions;
drop policy if exists "subscriptions_own_update" on public.subscriptions;
drop policy if exists "subscriptions_own_delete" on public.subscriptions;
create policy "subscriptions_own_select" on public.subscriptions for select to public using (auth.uid() = user_id);
create policy "subscriptions_own_insert" on public.subscriptions for insert to public with check (auth.uid() = user_id);
create policy "subscriptions_own_update" on public.subscriptions for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_own_delete" on public.subscriptions for delete to public using (auth.uid() = user_id);

-- schedule_classes
drop policy if exists "schedule_classes_own_select" on public.schedule_classes;
drop policy if exists "schedule_classes_own_insert" on public.schedule_classes;
drop policy if exists "schedule_classes_own_update" on public.schedule_classes;
drop policy if exists "schedule_classes_own_delete" on public.schedule_classes;
create policy "schedule_classes_own_select" on public.schedule_classes for select to public using (auth.uid() = user_id);
create policy "schedule_classes_own_insert" on public.schedule_classes for insert to public with check (auth.uid() = user_id);
create policy "schedule_classes_own_update" on public.schedule_classes for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "schedule_classes_own_delete" on public.schedule_classes for delete to public using (auth.uid() = user_id);

-- cashflow_settings
drop policy if exists "cashflow_settings_own_select" on public.cashflow_settings;
drop policy if exists "cashflow_settings_own_insert" on public.cashflow_settings;
drop policy if exists "cashflow_settings_own_update" on public.cashflow_settings;
drop policy if exists "cashflow_settings_own_delete" on public.cashflow_settings;
create policy "cashflow_settings_own_select" on public.cashflow_settings for select to public using (auth.uid() = user_id);
create policy "cashflow_settings_own_insert" on public.cashflow_settings for insert to public with check (auth.uid() = user_id);
create policy "cashflow_settings_own_update" on public.cashflow_settings for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cashflow_settings_own_delete" on public.cashflow_settings for delete to public using (auth.uid() = user_id);

-- ---------- supabase/migrations/0003_functions.sql ----------

-- 0003_functions.sql
-- handle_new_user creates the profile row (and the cashflow_settings row the
-- schema expects) on signup, so the app never has to guess about missing rows.
-- set_updated_at maintains the timestamptz columns on every table that has one.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, bio, avatar, created_at, updated_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    '',            -- bio is NOT NULL, so a blank string is the "unset" value
    null,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  insert into public.cashflow_settings (user_id, currency, updated_at)
  values (new.id, 'IDR', now())
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at        on public.profiles;
drop trigger if exists trg_assignments_updated_at     on public.assignments;
drop trigger if exists trg_note_folders_updated_at    on public.note_folders;
drop trigger if exists trg_notes_updated_at           on public.notes;
drop trigger if exists trg_transactions_updated_at    on public.transactions;
drop trigger if exists trg_subscriptions_updated_at   on public.subscriptions;
drop trigger if exists trg_schedule_classes_updated   on public.schedule_classes;
drop trigger if exists trg_cashflow_settings_updated  on public.cashflow_settings;

create trigger trg_profiles_updated_at       before update on public.profiles       for each row execute function public.set_updated_at();
create trigger trg_assignments_updated_at    before update on public.assignments    for each row execute function public.set_updated_at();
create trigger trg_note_folders_updated_at   before update on public.note_folders   for each row execute function public.set_updated_at();
create trigger trg_notes_updated_at          before update on public.notes          for each row execute function public.set_updated_at();
create trigger trg_transactions_updated_at   before update on public.transactions   for each row execute function public.set_updated_at();
create trigger trg_subscriptions_updated_at  before update on public.subscriptions  for each row execute function public.set_updated_at();
create trigger trg_schedule_classes_updated  before update on public.schedule_classes for each row execute function public.set_updated_at();
create trigger trg_cashflow_settings_updated before update on public.cashflow_settings for each row execute function public.set_updated_at();

-- ---------- supabase/migrations/0004_indexes_storage.sql ----------

-- 0004_indexes_storage.sql
-- Query indexes for the (user_id, deleted_at) access pattern every list view uses,
-- plus the avatar Storage bucket and its policies.
-- No extra columns: only indexes, a bucket and a view.

-- Every list view filters on (user_id, deleted_at).
create index if not exists idx_assignments_user_deleted   on public.assignments (user_id, deleted_at);
create index if not exists idx_note_folders_user_deleted  on public.note_folders (user_id, deleted_at);
create index if not exists idx_notes_user_deleted         on public.notes (user_id, deleted_at);
create index if not exists idx_transactions_user_deleted  on public.transactions (user_id, deleted_at);
create index if not exists idx_subscriptions_user_deleted on public.subscriptions (user_id, deleted_at);
create index if not exists idx_schedule_user_deleted      on public.schedule_classes (user_id, deleted_at);

-- Partial indexes for the hot paths (trash is rare, live rows are not).
create index if not exists idx_notes_folder  on public.notes (folder_id) where deleted_at is null;
create index if not exists idx_notes_pinned  on public.notes (user_id, pinned) where deleted_at is null;
create index if not exists idx_transactions_date on public.transactions (date desc);

-- Storage bucket for avatars. Upload path: avatars/<user_id>/<uuid>.png
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );