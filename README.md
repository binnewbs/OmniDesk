# Productivity Manager

A dark-mode student productivity app covering **Cashflow, Assignments, Schedule and Notes**.

Next.js 16 (App Router) · TypeScript · vanilla CSS (CSS Modules) · Supabase (Postgres + Auth + Storage)

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

Open `supabase/apply_all.sql`, copy the whole file, and paste it into
**Supabase Dashboard → SQL Editor → New query → Run**.

It is a concatenation of the four migrations in `supabase/migrations/`, and every
statement is idempotent, so running it twice is harmless.

What it creates:

| File | Contents |
|---|---|
| `0001_schema.sql` | the 8 tables from `Database/scheme.md`, no extra columns |
| `0002_rls.sql` | RLS enabled on all 8 tables + 32 policies scoped to `auth.uid() = user_id` |
| `0003_functions.sql` | `handle_new_user` trigger (creates the profile + settings rows on signup) and the `updated_at` triggers |
| `0004_indexes_storage.sql` | `(user_id, deleted_at)` indexes and the `avatars` Storage bucket with its policies |

The schema change is the one addition to the plan: `notes.folder_id` is declared
`on delete set null`, and `profiles` / `cashflow_settings` reference
`auth.users` with `on delete cascade`. Both are referential safety, not new columns.

### 3. Configure the environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in development |

`SUPABASE_SERVICE_ROLE_KEY` is optional and unused by the application — the seed
runs in the SQL Editor, which has its own credentials.

### 4. Auth URL configuration

In **Supabase → Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/confirm`

Both signup confirmation and password recovery land on `/auth/confirm`, which
verifies the token and forwards to the dashboard or the reset form.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Demo data (optional)

1. Sign up through the app so `auth.users` has a row.
2. Open `supabase/seed.sql`, set `demo_email` at the top to the email you used.
3. Paste it into the SQL Editor and Run.

It seeds five assignments across all three statuses, six classes spanning Mon–Fri
with cycling tints, three subscriptions, two folders, four notes and ~20
transactions spread over two months, so the chart has a visible peak.

---

## Architecture notes

**Reads are server components, writes are server actions.** Pages fetch through
`src/lib/repositories/*` on the server, so there is no client-side waterfall on
first paint. Mutations go through `src/lib/actions/*` and end in `revalidate()`,
which refreshes the affected routes.

**Styling is two layers.** `src/styles/globals.css` holds the tokens, the reset,
element defaults and the design-system primitives (`.btn`, `.card`, `.chip`,
`.pill`, `.input`, `.table`); everything screen-specific lives in a colocated
`*.module.css`. Every color, radius and size is a `var(--token)` — no hex
appears outside `tokens.css`.

**Variants are CSS modifier classes**, never assembled strings:
`<Button variant="primary">` renders `class="btn btn--primary"`.

**Soft delete everywhere except Notes → Trash.** Normal reads filter
`deleted_at is null`; delete is an update; the toast's Undo re-issues it. The only
real `DELETE` is "Delete forever" in the Notes trash.

### Two decisions that differ from the plan

1. **`proxy.ts` instead of `middleware.ts`.** Next 16 renamed the convention.
   `src/proxy.ts` exports `proxy()` instead of `middleware()`; the logic is
   unchanged.

2. **Onboarding state lives in `user_metadata`, not in a column.** The plan has
   `/profile-setup` guarded on `profiles.username` being empty — but the signup
   trigger already fills `username` from the signup form, so that guard could
   never fire. The schema has no onboarding column and adding one is out of
   bounds, so the marker is `user_metadata.profile_setup_complete`
   (`src/lib/profile-setup-state.ts`). Sign-in self-heals the flag for accounts
   that predate it.

### The client/server boundary

`src/lib/actions/*.ts` must open with `'use server';`. That directive is what
turns each exported function into a server action; without it the file is an
ordinary module, and a client component importing one of its functions ships the
whole thing — including the Supabase server client — to the browser. The build
still passes; the breakage only appears when the form is submitted.

Everything that touches the database carries `import 'server-only';`:
`lib/supabase/*`, `lib/repositories/*` and `lib/revalidate.ts`. The pure modules
that client forms legitimately share — `lib/validation/`, `lib/utils/`,
`lib/constants.ts` — deliberately do not.

`src/lib/layering.test.ts` asserts both rules, so the mistake fails a test
instead of a form submission.

---

## Project layout

```
supabase/
  apply_all.sql                  one file to paste into the SQL Editor
  migrations/                    the four migrations, also usable via the CLI
  seed.sql                       demo data
src/
  app/
    (auth)/                      split-screen auth: login, signup, forgot, reset, profile-setup
    (app)/                       the shell: dashboard, cashflow, assignments, schedule, notes, profile
    auth/confirm, auth/callback  email link targets
    globals.css entry            -> imports src/styles/*
  components/
    shell/                       Sidebar, PageHeader, GlobalSearch
    ui/                          Button, Card, Field, Pill, Chip, Modal, Dropdown, Toast, …
    features/                    one folder per screen; forms live in modals
    charts/BarChart              hand-rolled SVG, no charting dependency
  lib/
    supabase/                    client, server, middleware, types, errors
    repositories/                all reads and writes, one module per table group
    actions/                     one server action per mutation
    validation/                  Zod schemas, shared by the form and the action
    utils/                       money, date, id, assignment normalisation
  styles/                        tokens, reset, base, primitives, responsive
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: money, date bucketing, status normalisation, layering |

---

## Deployment

Vercel is the natural host.

1. Apply `supabase/apply_all.sql` to the production Supabase project first.
2. Push the repository and import it into Vercel.
3. **Set the environment variables by hand** — Vercel does not read `.env.local`,
   which is gitignored. Add `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` under
   Project → Settings → Environment Variables.

   Without them the build fails with `Missing NEXT_PUBLIC_SUPABASE_URL`, which is
   a loud failure rather than a broken deploy.
4. Point auth back at the production domain: **Authentication → URL Configuration**
   → Site URL = your Vercel domain, and add `<your-domain>/auth/confirm` to
   Redirect URLs. Skipping this is the usual reason signup "works" but the
   confirmation link lands on localhost.

`NEXT_PUBLIC_SITE_URL` must be the production domain, not `localhost:3000`: the
confirmation and password-reset emails build their links from it.

Before shipping, confirm RLS is enabled on all 8 tables and that the Storage
policies exist.

---

## Manual test script

1. Sign up → confirm the profile row exists → complete step 2 → land on the dashboard with your username in the greeting.
2. Add 10+ transactions across two months; step the month selector and switch all three periods; totals should match a hand-computed sum.
3. Change the currency; every money value on Cashflow and the Dashboard updates.
4. Create assignments in all three statuses, drag between columns, reload, confirm the status persisted.
5. Filter by priority and by course.
6. Add classes on all five weekdays; confirm no weekend column and that the tints cycle.
7. Create folders and notes, pin one, delete another, restore it from Trash, then delete it forever.
8. Sign out and back in — the data is intact.
9. In a second browser profile, confirm RLS isolation.