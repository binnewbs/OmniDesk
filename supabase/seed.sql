-- ============================================================================
-- seed.sql — demo data for local development.
--
-- Run it from the Supabase SQL Editor AFTER creating a test account through
-- the app's own sign-up form, so that auth.users has a row for the trigger to
-- hang the profile off.
--
-- 1. Sign up at http://localhost:3000/signup with any email and password.
-- 2. Come back here and paste your email below.
-- 3. Run this script.
--
-- Re-running it deletes only the demo rows for that user, so it is safe.
-- ============================================================================

\set demo_email 'you@example.com'   -- TODO: replace with your test account

-- Resolve the account, and make sure the trigger's rows exist.
do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = :'demo_email';

  if v_user is null then
    raise exception 'No auth.users row for % — sign up through the app first.', :'demo_email';
  end if;

  -- The handle_new_user trigger normally creates both of these; upsert so this
  -- script also works if the trigger was not created.
  insert into public.profiles (user_id, username, bio, created_at, updated_at)
  values (v_user, 'demo', 'Third-year student. Coffee first, then deadlines.', now(), now())
  on conflict (user_id) do update
    set username = excluded.username, bio = excluded.bio;

  insert into public.cashflow_settings (user_id, currency, updated_at)
  values (v_user, 'IDR', now())
  on conflict (user_id) do nothing;

  -- Clear any previous demo rows so a re-run does not double up.
  delete from public.transactions    where user_id = v_user and category = 'Demo';
  delete from public.subscriptions   where user_id = v_user and category = 'Demo';
  delete from public.assignments     where user_id = v_user and course like 'Demo%';
  delete from public.schedule_classes where user_id = v_user and room like 'Demo%';
  delete from public.notes           where user_id = v_user and content like 'Demo%';
  delete from public.note_folders    where user_id = v_user and name like 'Demo%';

  -- ---- Note folders (created_at is epoch ms) -------------------------------
  insert into public.note_folders (id, user_id, name, created_at, updated_at) values
    ('demo-folder-lectures', v_user, 'Lectures',  extract(epoch from now() - interval '9 days')  * 1000, now()),
    ('demo-folder-ideas',    v_user, 'Ideas',     extract(epoch from now() - interval '4 days')  * 1000, now());

  -- ---- Notes (created_at / last_modified are epoch ms) ---------------------
  insert into public.notes (id, user_id, content, last_modified, pinned, folder_id, created_at, updated_at) values
    ('demo-note-1', v_user,
     'Demo lecture plan\nWeek 1: normal distributions\nWeek 2: hypothesis testing\nBring the calculator',
     extract(epoch from now() - interval '2 hours') * 1000, true,  'demo-folder-lectures',
     extract(epoch from now() - interval '9 days') * 1000, now()),
    ('demo-note-2', v_user,
     'Demo thesis outline\nProblem statement\nLiterature review\nMethodology',
     extract(epoch from now() - interval '1 day') * 1000, true,  'demo-folder-ideas',
     extract(epoch from now() - interval '4 days') * 1000, now()),
    ('demo-note-3', v_user,
     'Demo grocery list\nRice\nEggs\nInstant noodles',
     extract(epoch from now() - interval '3 days') * 1000, false, 'demo-folder-ideas',
     extract(epoch from now() - interval '3 days') * 1000, now()),
    ('demo-note-4', v_user,
     'Demo library hours\nMon–Thu 08:00–20:00\nFri 08:00–16:00\nClosed on public holidays',
     extract(epoch from now() - interval '5 days') * 1000, false, null,
     extract(epoch from now() - interval '6 days') * 1000, now());

  -- ---- Assignments: all three statuses, two courses ------------------------
  insert into public.assignments (id, user_id, title, course, description, due_date, priority, status) values
    ('demo-as-1', v_user, 'Problem set 3',   'Demo Calculus',  'Chapters 5–7, show all working.', to_char(current_date + 2,  'YYYY-MM-DD'), 'High',   'To do'),
    ('demo-as-2', v_user, 'Lab report',      'Demo Physics',   'Include the error analysis table.',to_char(current_date + 5,  'YYYY-MM-DD'), 'Medium', 'In progress'),
    ('demo-as-3', v_user, 'Reading response', 'Demo Sociology', 'Two pages on Weber.',            to_char(current_date + 9,  'YYYY-MM-DD'), 'Low',    'To do'),
    ('demo-as-4', v_user, 'Group presentation','Demo Statistics','Slides due the night before.', to_char(current_date - 1,  'YYYY-MM-DD'), 'High',   'Done'),
    ('demo-as-5', v_user, 'Midterm review',  'Demo Calculus',  'Focus on integration by parts.',  to_char(current_date + 12, 'YYYY-MM-DD'), 'Medium', 'To do');

  -- ---- Schedule: Mon–Fri, cycling the four tints ---------------------------
  insert into public.schedule_classes (id, user_id, name, room, day, start_time, end_time, color_theme) values
    ('demo-cl-1', v_user, 'Demo Calculus',  'Demo Room 201', 'Mon', '08:00', '10:00', '#7c9cff'),
    ('demo-cl-2', v_user, 'Demo Physics',   'Demo Lab 2',    'Mon', '13:00', '15:00', '#5fd0b0'),
    ('demo-cl-3', v_user, 'Demo Sociology', 'Demo Room 105', 'Tue', '09:00', '11:00', '#e8a76b'),
    ('demo-cl-4', v_user, 'Demo Statistics','Demo Room 301', 'Wed', '10:00', '12:00', '#c08cf0'),
    ('demo-cl-5', v_user, 'Demo Calculus',  'Demo Room 201', 'Thu', '08:00', '10:00', '#7c9cff'),
    ('demo-cl-6', v_user, 'Demo Studio',    'Demo Studio A', 'Fri', '14:00', '17:00', '#5fd0b0');

  -- ---- Subscriptions ------------------------------------------------------
  insert into public.subscriptions (id, user_id, name, amount, category, start_date) values
    ('demo-sub-1', v_user, 'Demo streaming',     54_000,  'Demo', now() - interval '4 months'),
    ('demo-sub-2', v_user, 'Demo cloud storage', 12_000,  'Demo', now() - interval '2 months'),
    ('demo-sub-3', v_user, 'Demo transit pass',  75_000,  'Demo', now() - interval '1 month');

  -- ---- Transactions: this month and last, enough to fill the chart ---------
  insert into public.transactions (id, user_id, type, amount, category, description, date) values
    -- income
    ('demo-tx-01',  v_user, 'income',  1_500_000, 'Demo', 'Monthly allowance',      now() - interval '25 days'),
    ('demo-tx-02',  v_user, 'income',  2_000_000, 'Demo', 'Part-time tutoring',     now() - interval '11 days'),
    ('demo-tx-03',  v_user, 'income',  1_500_000, 'Demo', 'Monthly allowance',      now() - interval '55 days'),

    -- this month's expenses, deliberately uneven so the chart has a clear peak
    ('demo-tx-10',  v_user, 'expense',    35_000, 'Demo', 'Groceries',              now() - interval '1 day'),
    ('demo-tx-11',  v_user, 'expense',    12_500, 'Demo', 'Bus pass',               now() - interval '2 days'),
    ('demo-tx-12',  v_user, 'expense',   120_000, 'Demo', 'Textbooks',               now() - interval '5 days'),
    ('demo-tx-13',  v_user, 'expense',    18_000, 'Demo', 'Coffee and snacks',      now() - interval '7 days'),
    ('demo-tx-14',  v_user, 'expense',    45_000, 'Demo', 'Electricity bill',       now() - interval '9 days'),
    ('demo-tx-15',  v_user, 'expense',   380_000, 'Demo', 'Rent contribution',       now() - interval '10 days'),
    ('demo-tx-16',  v_user, 'expense',    27_000, 'Demo', 'Laundry',                now() - interval '12 days'),
    ('demo-tx-17',  v_user, 'expense',    64_000, 'Demo', 'Phone plan',             now() - interval '14 days'),
    ('demo-tx-18',  v_user, 'expense',    22_000, 'Demo', 'Lunch out',              now() - interval '16 days'),
    ('demo-tx-19',  v_user, 'expense',    31_000, 'Demo', 'Stationery',             now() - interval '18 days'),
    ('demo-tx-20',  v_user, 'expense',     9_500, 'Demo', 'Bus fare',               now() - interval '20 days'),
    ('demo-tx-21',  v_user, 'expense',    55_000, 'Demo', 'Meal prep',              now() - interval '22 days'),

    -- last month, so switching the month selector shows something
    ('demo-tx-30',  v_user, 'expense',   380_000, 'Demo', 'Rent contribution',       now() - interval '40 days'),
    ('demo-tx-31',  v_user, 'expense',    88_000, 'Demo', 'Books and stationery',    now() - interval '44 days'),
    ('demo-tx-32',  v_user, 'expense',    46_000, 'Demo', 'Groceries',              now() - interval '48 days'),
    ('demo-tx-33',  v_user, 'income',  1_500_000, 'Demo', 'Monthly allowance',      now() - interval '55 days');

  raise notice 'Seeded demo data for %', :'demo_email';
end $$;