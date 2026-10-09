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