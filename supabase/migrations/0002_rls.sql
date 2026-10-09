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