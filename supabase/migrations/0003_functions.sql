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