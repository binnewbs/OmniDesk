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