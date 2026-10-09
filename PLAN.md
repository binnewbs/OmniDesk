# Productivity Manager — Implementation Plan

A dark-mode student productivity web app covering **Cashflow, Assignments, Schedule, and Notes**.

**Tech stack:** Next.js (App Router) · TypeScript · Vanilla CSS (CSS Modules) · Supabase (Postgres + Auth + Storage)

---

## Table of contents

1. [Sources of truth](#1-sources-of-truth)
2. [Scope & feature list](#2-scope--feature-list)
3. [Tech stack & rationale](#3-tech-stack--rationale)
4. [Project structure](#4-project-structure)
5. [Database plan (Supabase)](#5-database-plan-supabase)
6. [Data access layer](#6-data-access-layer)
7. [Auth & session flow](#7-auth--session-flow)
8. [Design system implementation](#8-design-system-implementation)
9. [Shared component inventory](#9-shared-component-inventory)
10. [Feature specs](#10-feature-specs)
11. [Charts spec](#11-charts-spec)
12. [Soft delete & Trash spec](#12-soft-delete--trash-spec)
13. [Utilities & conventions](#13-utilities--conventions)
14. [Cross-cutting behaviors](#14-cross-cutting-behaviors)
15. [Edge cases & decisions log](#15-edge-cases--decisions-log)
16. [Implementation phases](#16-implementation-phases)
17. [Testing & verification](#17-testing--verification)
18. [Deployment](#18-deployment)
19. [Out of scope](#19-out-of-scope)

---

## 1. Sources of truth

| Artifact | Path | Authority |
|---|---|---|
| Database schema + RLS | `Database/scheme.md` | Data model. **Do not add columns.** |
| UI spec | `UI_DESIGN/UI_DESIGN.md` | Layout, tokens, interaction rules. |
| Wireframes | `UI_DESIGN/*.png` (8 screens) | Visual truth for spacing, proportions, density. |

**Precedence:** if the `.md` and the `.png` disagree, the `.png` wins for visual layout and the `.md` wins for token values and behavior rules.

**Hard constraints inherited from these files**

- Schema is fixed: 8 tables, no extra fields, no social login, email + password only.
- IDs on most tables are `text`, generated client-side.
- Dark theme only, Lucide icons only, no emoji / gradients / heavy shadows.
- Forms never live in the main screens — modals or drawers only.
- Schedule is **Mon–Fri only**, 5 columns.
- Notes have **no per-note color** (schema has no column for it).
- Every soft-deletable table has `deleted_at`; normal views filter `IS NULL`, Trash uses `IS NOT NULL`.
- All tables are RLS-scoped to `auth.uid() = user_id`.

---

## 2. Scope & feature list

| Area | Feature | Priority |
|---|---|---|
| Auth | Sign up (username, email, password, confirm) | P0 |
| Auth | Sign in, sign out, forgot password (reset email) | P0 |
| Auth | Two-step onboarding: sign up → profile setup → dashboard | P0 |
| Auth | Session persistence, route protection, auto-redirect | P0 |
| Shell | 220px sidebar, 5 nav items, active state, profile footer | P0 |
| Dashboard | 4 stat cards, 2×2 summary cards, Quick add, Search | P1 |
| Cashflow | Balance/income/expense stats, spending chart w/ 3 periods | P0 |
| Cashflow | Transactions table + type filter chips, subscriptions list | P0 |
| Cashflow | Create/edit/delete transaction, add subscription, currency selector | P0 |
| Assignments | Kanban (3 columns), drag & drop to change status | P0 |
| Assignments | Priority + course filters, create/edit/delete | P0 |
| Schedule | Weekly Mon–Fri grid, day/week toggle, add/edit/delete class | P0 |
| Notes | Folders sidebar, Pinned + Recent grids, Trash, note editor | P0 |
| Notes | Create/edit/delete/pin/unpin note, create/delete folder | P0 |
| Profile | View/edit username, bio, avatar upload | P1 |
| Global | Empty states, loading skeletons, toasts, error handling | P0 |
| Global | Command-style global search | P2 |

---

## 3. Tech stack & rationale

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, RSC) | File-based routing matches the 8 screens; server components for reads, client components for interaction. |
| Language | **TypeScript**, `strict: true` | The generated DB types flow directly into components. |
| Styling | **Vanilla CSS** — one `globals.css` of tokens + base classes, plus `*.module.css` per component | No build step, no preflight surprises, and every pixel in `UI_DESIGN.md` maps to a named CSS rule you can read. Next.js ships CSS Modules and global CSS support natively, so zero extra tooling. |
| Icons | **lucide-react** | Spec mandates Lucide, stroke 2, 16–18px. |
| Font | **DM Sans** via `next/font/google` | Self-hosted, no layout shift, no external request. |
| Database | **Supabase** Postgres + GoTrue Auth + Storage | RLS already defined; BaaS auth + storage covers avatar upload. |
| Charts | **Hand-rolled SVG** | The bar chart is ~30 lines of SVG. Avoids a charting dependency and matches the token palette exactly. (Recharts acceptable if already preferred.) |
| Drag & drop | **@dnd-kit/core** | Small, accessible, keyboard-capable. Native HTML5 DnD is acceptable for a course project if deps must be minimal. |
| Validation | **Zod** | One schema per form; shared between client and server actions. |
| Runtime dates | **date-fns** + `date-fns-tz` | Needed for "this month" / "today" bucketing and `timestamptz` → local. |
| State | React Server Components + `useState`/URL search params | No global store needed. Filters go in the URL so views are shareable and back-button safe. |
| IDs | `crypto.randomUUID()` | Matches `text` primary keys. |

**Deliberately excluded:** no Tailwind, no CSS-in-JS, no CSS framework. No Redux/Zustand, no component library (MUI/Chakra) — they would fight the token spec. No ORM — Supabase's typed client is sufficient and keeps the SQL visible.

### 3.1 Styling architecture

Two layers, no build step, no `className` string assembly beyond a single variant helper:

| Layer | File | Contains | Scope |
|---|---|---|---|
| **Tokens** | `app/globals.css` | `:root` custom properties (colors, spacing, radii, type scale), the reset, base element styles | global |
| **Design system** | `app/globals.css` | The reusable primitives from §8.2 — `.btn`, `.btn--primary`, `.card`, `.pill`, `.chip`, `.input`, `.table`, `.page`, `.page-header` | global |
| **Features** | `*.module.css` colocated with the component | Anything screen-specific — `.sidebar`, `.kanban`, `.weekGrid`, `.noteGrid`, `.chart`, `.splitAuth` | CSS Modules (hashed, local) |

Rules:
- **All colors, radii, and spacing reference a `var(--token)`.** Never hardcode a hex outside `:root`.
- **Variants are CSS modifier classes**, not `cn()` string merging: `<button class="btn btn--primary">`. This keeps the symmetry rule enforceable in one place.
- Feature CSS Modules import nothing; they just use the global classes as normal class selectors.
- `globals.css` holds no feature-specific rules — that is what the modules are for.

---

## 4. Project structure

```
/
├── Database/
│   └── scheme.md                      # source of truth (read-only)
├── UI_DESIGN/                         # source of truth (read-only)
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql           # tables, types, indexes, FKs
│   │   ├── 0002_rls.sql              # RLS policies (mirrors scheme.md)
│   │   ├── 0003_functions.sql        # handle_new_user, updated_at triggers
│   │   └── 0004_seed_categories.sql  # optional reference data
│   └── seed.sql                      # demo data for local dev
│
├── public/
│   └── avatars/                      # local fallback only
│
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── layout.tsx            # split layout (left panel + right form)
    │   │   ├── login/page.tsx
    │   │   ├── signup/page.tsx
    │   │   └── profile-setup/page.tsx
    │   ├── (app)/
    │   │   ├── layout.tsx            # sidebar shell, requires session
    │   │   ├── dashboard/page.tsx
    │   │   ├── cashflow/page.tsx
    │   │   ├── assignments/page.tsx
    │   │   ├── schedule/page.tsx
    │   │   ├── notes/page.tsx
    │   │   └── profile/page.tsx
    │   ├── auth/
    │   │   ├── confirm/route.ts      # ?token_hash=&type=  (verify OTP / recovery)
    │   │   └── callback/route.ts
    │   ├── globals.css               # tokens, reset, base, design-system primitives
    │   ├── layout.tsx                # html, DM Sans, metadata
    │   └── not-found.tsx
    │
    ├── components/
    │   ├── shell/       Sidebar, NavItem, AppHeader, PageHeader
    │   │                (+ Sidebar.module.css, PageHeader.module.css)
    │   ├── ui/          Button, Card, Input, Select, Textarea, Pill, Chip,
    │   │                Modal, Drawer, Table, Tabs, Skeleton, EmptyState,
    │   │                Dropdown, Toast, Avatar, IconTile
    │   │                — styled by the globals in §8.2, no module needed
    │   │                except Modal.module.css and Dropdown.module.css
    │   ├── features/
    │   │   ├── cashflow/    StatCard, SpendingChart, TransactionsTable,
    │   │   │                SubscriptionsList, TransactionModal,
    │   │   │                SubscriptionModal, CurrencySelect, PeriodChips
    │   │   ├── assignments/ KanbanBoard, KanbanColumn, AssignmentCard,
    │   │   │                AssignmentModal, PrioritySelect, FilterMenus
    │   │   ├── schedule/    WeekGrid, DayColumn, ClassBlock, ClassModal
    │   │   ├── notes/       FolderList, NoteCard, NoteGrid, NoteEditor
    │   │   ├── dashboard/   StatGrid, UpcomingAssignments, TodaysClasses,
    │   │   │                RecentTransactions, PinnedNotes, QuickAddModal
    │   │   └── auth/        AuthSplit, AuthFeatureList, TextField
    │   └── charts/     BarChart.tsx + BarChart.module.css
    │
    ├── styles/
    │   ├── globals.css               # imported once in app/layout.tsx
    │   ├── tokens.css                # :root custom properties only
    │   ├── reset.css                 # normalize + dark scrollbars
    │   ├── base.css                  # element defaults, typography roles
    │   └── primitives.css            # .btn .card .pill .chip .input .table …
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts             # browser singleton
    │   │   ├── server.ts             # RSC: cookies() bound client
    │   │   ├── middleware.ts        # session refresh on every request
    │   │   └── types.ts              # generated Database type
    │   ├── repositories/
    │   │   ├── profiles.ts
    │   │   ├── assignments.ts
    │   │   ├── cashflow.ts          # transactions + subscriptions + settings
    │   │   ├── schedule.ts
    │   │   ├── notes.ts             # notes + note_folders
    │   │   └── stats.ts             # dashboard aggregations
    │   ├── constants.ts              # STATUSES, PRIORITIES, DAYS, THEMES,
    │   │                             # CURRENCIES, TYPE values
    │   ├── validation/               # zod schemas, one per form
    │   └── utils/
    │       ├── money.ts              # formatMoney, parseAmount, compact
    │       ├── date.ts               # month bucketing, formatting, relative
    │       └── id.ts                 # createId()
    │
    ├── hooks/
    │   ├── useProfile.ts
    │   ├── useMoney.ts               # currency from cashflow_settings
    │   ├── useModal.ts
    │   └── useToast.ts
    │
    └── types/
        └── domain.ts                 # Assignment, Transaction, Note, ... UI types
```

---

## 5. Database plan (Supabase)

The schema in `Database/scheme.md` is already applied or ready to apply. The migrations below must reproduce it **exactly**, plus the safe additions listed in §15.

### 5.1 Tables to create

| Table | PK | Notes |
|---|---|---|
| `profiles` | `user_id uuid` FK → `auth.users(id)` ON DELETE CASCADE | `avatar text` nullable, `bio text` not-null but effectively free text |
| `assignments` | `id text` | client UUID; `status`, `priority`, `due_date` are free text |
| `note_folders` | `id text` | note `created_at` is **int8 epoch ms**, `updated_at` is `timestamptz` |
| `notes` | `id text` | `created_at` **int8 epoch ms**, `last_modified` **int8 epoch ms** |
| `transactions` | `id text` | `amount numeric`, `date timestamptz` |
| `subscriptions` | `id text` | `amount numeric`, `last_processed` = last month materialization |
| `schedule_classes` | `id text` | `day`, `start_time`, `end_time`, `color_theme` are text |
| `cashflow_settings` | `user_id uuid` | one row per user, `currency` e.g. `IDR` |

### 5.2 Migration 0001 — additions worth making

These do **not** change the logical schema, they make the app correct and fast:

```sql
-- 1. Foreign keys (the exported scheme.md lists no FK constraints, but the
--    app relies on them for cascade deletes and referential safety).
alter table profiles
  add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table notes
  add constraint notes_folder_id_fkey
  foreign key (folder_id) references note_folders(id) on delete set null;

-- 2. Query indexes. Every list view filters on (user_id, deleted_at).
create index idx_assignments_user_deleted     on assignments (user_id, deleted_at);
create index idx_note_folders_user_deleted    on note_folders (user_id, deleted_at);
create index idx_notes_user_deleted           on notes (user_id, deleted_at);
create index idx_notes_folder                 on notes (folder_id) where deleted_at is null;
create index idx_notes_pinned                 on notes (user_id, pinned) where deleted_at is null;
create index idx_transactions_user_deleted    on transactions (user_id, deleted_at);
create index idx_transactions_date            on transactions (date desc);
create index idx_subscriptions_user_deleted   on subscriptions (user_id, deleted_at);
create index idx_schedule_user_deleted        on schedule_classes (user_id, deleted_at);

-- 3. Convenience view for "live" rows. Optional; the app also filters in
--    queries. Pick one approach and stay consistent — prefer explicit
--    .is('deleted_at', null) in repositories for clarity in the Supabase client.
create view live_transactions as
  select * from transactions where deleted_at is null;
```

**Keep RLS enabled on every table.** Add read/write policies for the Storage bucket too (see §5.5).

### 5.3 Migration 0003 — triggers and functions

```sql
-- A. Auto-create a profile row when a user signs up.
--    The username comes from the signup form via user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, bio, avatar, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '',                       -- bio is NOT NULL; skip stores ''
    null,
    now(),
    now()
  );
  on conflict (user_id) do nothing;

  -- Seed the one cashflow setting row the schema expects (user_id is PK).
  insert into public.cashflow_settings (user_id, currency, updated_at)
  values (new.id, 'IDR', now())
  on conflict (user_id) do nothing;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- B. Maintain updated_at on the tables that use timestamptz.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_updated_at      before update on profiles      for each row execute function set_updated_at();
create trigger trg_assignments_updated_at   before update on assignments   for each row execute function set_updated_at();
create trigger trg_note_folders_updated_at  before update on note_folders  for each row execute function set_updated_at();
create trigger trg_notes_updated_at         before update on notes         for each row execute function set_updated_at();
create trigger trg_transactions_updated_at   before update on transactions  for each row execute function set_updated_at();
create trigger trg_subscriptions_updated_at  before update on subscriptions for each row execute function set_updated_at();
create trigger trg_schedule_classes_updated on schedule_classes for each row execute function set_updated_at();
create trigger trg_cashflow_settings_updated on before update on cashflow_settings for each row execute function set_updated_at();
```

> **Important:** the `handle_new_user` trigger requires ownership of the `auth` schema trigger — available on hosted Supabase projects and on Supabase CLI local stacks. If triggers cannot be created, fall back to creating the profile row client-side in the sign-up server action (documented in §7.3).

### 5.4 Soft-delete rules

All six content tables use soft delete. Repository helpers centralize it:

| Action | Query |
|---|---|
| Normal list | `.is('deleted_at', null)` |
| Trash list | `.not('deleted_at', 'is', null)` |
| Delete | `.update({ deleted_at: new Date().toISOString() })` |
| Restore (Notes Trash) | `.update({ deleted_at: null })` |
| Purge (Notes Trash, optional) | `.delete()` — real DELETE, allowed by RLS |

**Never** call a hard delete from a normal screen. Hard delete appears only in Notes → Trash → "Delete forever".

### 5.5 Storage bucket for avatars

```sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
```

Upload path: `avatars/<user_id>/<uuid>.png`. Store the public URL in `profiles.avatar`.
Client-side validate: image mime only, ≤ 2 MB, then compress with a canvas to 256×256 before upload.

---

## 6. Data access layer

### 6.1 Three Supabase clients

| File | Use | Binding |
|---|---|---|
| `lib/supabase/client.ts` | Client components, browser handlers | `createBrowserClient` singleton |
| `lib/supabase/server.ts` | RSC, route handlers, server actions | `createServerClient` with `cookies()` |
| `lib/supabase/middleware.ts` | Every request | refreshes the session, redirects |

**Server components do the reads** (no client-side waterfall on first paint). **Mutations go through server actions** so `revalidatePath` refreshes the affected screen. Client components stay presentational and receive data as props.

### 6.2 Middleware

```ts
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const { user } = await getUser();          // refreshes session cookie
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Email confirmation / password recovery callback (PKCE)
  if (tokenHash && type) {
    const next = pathname === '/auth/confirm' ? new URL('/dashboard', request.url) : request.nextUrl.clone();
    const { error } = await supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(next);
  }

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  if (!user && !isAuthRoute && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}
```

Add a `profileComplete` check: after sign-in, if `profiles.username` is empty → redirect to `/profile-setup`.

### 6.3 Repository contract

Every repository function follows the same shape and always scopes by the authenticated user:

```ts
// src/lib/repositories/assignments.ts
import 'server-only';

export async function listAssignments(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true });
  if (error) throw new RepositoryError('assignments.list', error);
  return data;
}

export async function createAssignment(input: NewAssignment) {
  const supabase = await createClient();
  const user = await requireUser();
  const row = {
    id: createId(),
    user_id: user.id,
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const { data, error } = await supabase.from('assignments').insert(row).select().single();
  if (error) throw new RepositoryError('assignments.create', error);
  revalidatePath('/assignments');
  revalidatePath('/dashboard');
  return data;
}
```

`requireUser()` is a shared helper that calls `supabase.auth.getUser()` and redirects to `/login` if absent. RLS is the real security boundary — the explicit `.eq('user_id', user.id)` is belt-and-braces and makes queries index-friendly.

### 6.4 Repository surface (what each screen needs)

| Repository | Functions |
|---|---|
| `profiles` | `getProfile`, `updateProfile`, `uploadAvatar` |
| `assignments` | `list`, `get`, `create`, `update`, `changeStatus`, `softDelete`, `listCourses`, `listPriorities` |
| `cashflow` | `listTransactions`, `createTransaction`, `updateTransaction`, `softDeleteTransaction`, `listSubscriptions`, `createSubscription`, `updateSubscription`, `softDeleteSubscription`, `materializeSubscription`, `getSettings`, `updateCurrency` |
| `schedule` | `listClasses`, `createClass`, `updateClass`, `softDeleteClass`, `nextColorTheme` |
| `notes` | `listNotes({ folderId, pinned, trashed })`, `getNote`, `createNote`, `updateNote`, `setPinned`, `softDeleteNote`, `restoreNote`, `purgeNote`, `listFolders`, `createFolder`, `renameFolder`, `softDeleteFolder` |
| `stats` | `getDashboardStats`, `getMonthTotals`, `getSpendingSeries` |

### 6.5 Aggregations

Prefer PostgREST filters over shipping rows to the client:

```ts
// Income/expense totals for the selected month
const { data } = await supabase
  .from('transactions')
  .select('type, amount')
  .eq('user_id', userId)
  .is('deleted_at', null)
  .gte('date', monthStartISO)
  .lt('date', nextMonthStartISO);

// Chart series: fetch the month's expense rows, group in JS (≤31 rows)
const { data: expenses } = await supabase
  .from('transactions')
  .select('date, amount')
  .eq('user_id', userId)
  .eq('type', 'expense')
  .is('deleted_at', null)
  .gte('date', monthStartISO)
  .lt('date', nextMonthStartISO);
```

Money is `numeric` → Supabase returns it as a **string**. Parse with `Number()` before arithmetic; never use float equality on money comparisons.

---

## 7. Auth & session flow

### 7.1 Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | public | Email + password |
| `/signup` | public | Username, email, password, confirm |
| `/profile-setup` | authed, `username` empty | Step 2 of 2: avatar, bio |
| `/forgot-password` | public | Sends reset email |
| `/auth/confirm` | public | `token_hash` + `type` verification (middleware handles redirect) |
| `/reset-password` | public, recovery session | Set new password |
| `/dashboard`, `/cashflow`, `/assignments`, `/schedule`, `/notes`, `/profile` | authed | App shell |

### 7.2 Sign-up sequence

1. Server action validates with Zod: username 3–24 chars, valid email, password ≥ 8 chars, `password === confirmPassword`.
2. `supabase.auth.signUp({ email, password, options: { data: { username }, emailRedirectTo: `${origin}/auth/confirm` } })`.
3. If email confirmation is **enabled**: show "Check your inbox", stop here.
4. If confirmation is **disabled** (dev): session exists → profile row created by the trigger → `revalidate` → redirect to `/profile-setup`.
5. `/profile-setup` shows "Step 2 of 2" + avatar upload + bio textarea + **Continue to dashboard** + **Skip for now**.
6. Continue → `updateProfile({ avatar, bio })` → redirect `/dashboard`.
7. Skip → `updateProfile({ bio: '' })` (bio is NOT NULL) → redirect `/dashboard`.

### 7.3 Fallback when triggers are unavailable

```ts
// profiles.ts — upsert instead of insert, safe in both worlds
export async function ensureProfile(userId: string, username: string) {
  const supabase = await createClient();
  await supabase.from('profiles').upsert({ user_id: userId, username, bio: '' });
}
```

Call it at the top of the profile-setup page if the profile row is missing.

### 7.4 Session handling

- Cookie-based (`@supabase/ssr`). Cookies: `sb-<ref>-auth-token`, httpOnly, `sameSite: lax`, `secure` in production.
- Middleware refreshes the token on every navigation so long sessions don't expire mid-use.
- Sign-out: server action → `supabase.auth.signOut()` → `revalidate` → redirect `/login`.

---

## 8. Design system implementation

The whole design system is plain CSS in `src/styles/`. Five files, imported in order by `globals.css`.

### 8.1 `styles/tokens.css` — the single source of color and scale

Every hex in the app comes from here. Nothing else declares a raw color.

```css
:root {
  color-scheme: dark;              /* native selects, checkboxes and scrollbars go dark */

  /* ---- Color tokens (verbatim from UI_DESIGN.md §2) ---- */
  --bg:            #0e0f12;
  --surface:       #14161b;
  --surface-alt:   #16181d;
  --border:        #22252c;
  --border-input:  #2c313a;
  --row-divider:   #1d2026;
  --nav-active:    #1a1d24;
  --text:          #e6e8ec;
  --muted:         #8b919c;
  --pill-text:     #aab0bb;
  --accent:        #7c9cff;
  --on-accent:     #0e0f12;
  --chart-bar:     #2a3550;
  --skeleton:      #22252c;
  --avatar-fill:   #262a31;

  /* Schedule class tints, cycled per class. Backdrop = tint + alpha suffix. */
  --theme-1: #7c9cff;
  --theme-2: #5fd0b0;
  --theme-3: #e8a76b;
  --theme-4: #c08cf0;
  --theme-1-bg: #7c9cff21;         /* ~13% alpha, the block fill */
  --theme-1-br: #7c9cff33;         /* ~20% alpha, the block border */
  --theme-2-bg: #5fd0b021;   --theme-2-br: #5fd0b033;
  --theme-3-bg: #e8a76b21;   --theme-3-br: #e8a76b33;
  --theme-4-bg: #c08cf021;   --theme-4-br: #c08cf033;

  /* ---- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 40 ---- */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;                  /* card padding, per spec — not on the base scale */
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* ---- Shape ---- */
  --radius-card:  12px;
  --radius-input:  8px;
  --radius-full:  9999px;

  /* ---- Fixed control heights (the symmetry rule lives here) ---- */
  --h-button: 40px;
  --h-chip:   36px;
  --h-pill:   24px;
  --h-icon:   36px;
  --h-input:  44px;

  /* ---- Type ---- */
  --font-sans: var(--font-dm-sans), ui-sans-serif, system-ui, -apple-system, sans-serif;
  --text-hero:  32px;
  --text-title: 24px;
  --text-stat:  26px;
  --text-base:  14px;
  --text-muted: 13px;
  --text-label: 12px;

  /* ---- Layout constants ---- */
  --sidebar-w:    220px;
  --page-pad-y:   var(--space-8);
  --page-pad-x:   var(--space-10);
  --grid-gap:     var(--space-4);
  --stack-gap:    var(--space-6);
  --btn-pad-x:    18px;
  --chip-pad-x:   var(--space-4);
  --pill-pad-x:   var(--space-3);

  --transition: 140ms ease;
}
```

The `--theme-N-bg` / `--theme-N-br` pairs exist so tinted class blocks stay readable: `background: var(--theme-1-bg); color: var(--theme-1); border: 1px solid var(--theme-1-br)`.

### 8.2 `styles/reset.css` and `styles/base.css`

Minimal normalize, then element defaults that the spec implies:

```css
/* reset.css */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; background: none; border: none; padding: 0; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; padding: 0; }
svg { flex-shrink: 0; }              /* icons never get squashed by flex */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border-input); border-radius: var(--radius-full); }
```

Typography roles as classes (no utility soup, each role is one named rule):

```css
/* base.css */
.t-title { font-size: var(--text-title); font-weight: 600; letter-spacing: -0.01em; }
.t-stat  { font-size: var(--text-stat);  font-weight: 600; }
.t-hero  { font-size: var(--text-hero);  font-weight: 600; line-height: 1.2; }
.t-card  { font-size: var(--text-base);  font-weight: 600; }
.t-body  { font-size: var(--text-base); }
.t-muted { font-size: var(--text-muted); color: var(--muted); }
.t-label { font-size: var(--text-label); color: var(--muted); }
.t-link  { font-size: var(--text-base); font-weight: 500; color: var(--text); }
.t-link:hover { color: var(--accent); }
```

### 8.3 `styles/primitives.css` — the shape rules

These are the invariants from `UI_DESIGN.md` §2, written once. Variants are modifier classes, so a component never assembles strings.

```css
/* ---- Card ---- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card__header {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--row-divider);
}
.card__title { font-size: var(--text-base); font-weight: 600; }

/* ---- Buttons: height 40, radius full, equal padding, centered text ---- */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  height: var(--h-button);
  padding-inline: var(--btn-pad-x);
  border-radius: var(--radius-full);
  font-size: var(--text-base); font-weight: 500; white-space: nowrap;
  transition: background var(--transition), border-color var(--transition), color var(--transition);
}
.btn--primary   { background: var(--accent); color: var(--on-accent); }
.btn--primary:hover   { background: #6b8dff; }
.btn--secondary { background: transparent; border: 1px solid var(--border-input); color: var(--text); }
.btn--secondary:hover { background: var(--nav-active); }
.btn--ghost     { color: var(--muted); }
.btn--ghost:hover { color: var(--text); }
.btn--full      { width: 100%; }
.btn:disabled   { opacity: 0.5; cursor: not-allowed; }

/* ---- Inputs: radius 8, min-height 44 ---- */
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.field__label { font-size: var(--text-muted); color: var(--muted); }
.input, .select, .textarea {
  min-height: var(--h-input);
  padding: var(--space-3) var(--space-4);
  background: var(--bg);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-input);
  font-size: var(--text-muted);
  width: 100%;
}
.textarea { min-height: 110px; resize: vertical; }
.input::placeholder, .textarea::placeholder { color: var(--muted); }
.input:focus, .select:focus, .textarea:focus { border-color: var(--accent); outline: none; }
.field__error { font-size: var(--text-label); color: #ff8080; }

/* ---- Chips: height 36 ---- */
.chip {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: var(--h-chip); padding-inline: var(--chip-pad-x);
  border: 1px solid var(--border-input); border-radius: var(--radius-full);
  font-size: var(--text-base); color: var(--text); white-space: nowrap;
  transition: background var(--transition), color var(--transition);
}
.chip:hover { background: var(--nav-active); }
.chip[aria-pressed="true"], .chip--active { background: var(--nav-active); color: var(--text); }
.chip--ghost { color: var(--muted); }

/* ---- Pills: height 24 ---- */
.pill {
  display: inline-flex; align-items: center; justify-content: center;
  height: var(--h-pill); padding-inline: var(--pill-pad-x);
  border: 1px solid var(--border-input); border-radius: var(--radius-full);
  font-size: var(--text-label); color: var(--pill-text); white-space: nowrap;
}
.pill--accent { color: var(--accent); border-color: var(--accent); }

/* ---- Icon-only button: 36x36 ---- */
.icon-btn {
  display: inline-grid; place-items: center;
  width: var(--h-icon); height: var(--h-icon);
  border: 1px solid var(--border-input); border-radius: var(--radius-input);
  color: var(--muted); transition: color var(--transition), background var(--transition);
}
.icon-btn:hover { color: var(--text); background: var(--nav-active); }

/* ---- Page scaffolding ---- */
.page { display: flex; flex-direction: column; gap: var(--stack-gap);
        padding: var(--page-pad-y) var(--page-pad-x); min-height: 100%; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4); }
.page-header__actions { display: flex; align-items: center; gap: var(--space-2); }
.subtitle { font-size: var(--text-muted); color: var(--muted); }

/* ---- Grid helpers (only the ones the wireframes actually use) ---- */
.grid { display: grid; gap: var(--grid-gap); }
.grid--4 { grid-template-columns: repeat(4, 1fr); }
.grid--3 { grid-template-columns: repeat(3, 1fr); }
.grid--5 { grid-template-columns: repeat(5, 1fr); }
.grid--split { grid-template-columns: 1.4fr 1fr; }
.row { display: flex; gap: var(--grid-gap); }
.row--2-1 > *:first-child { flex: 2; }
.row--2-1 > *:last-child  { flex: 1; }

/* ---- Table ---- */
.table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
.table th { font-size: var(--text-muted); font-weight: 400; color: var(--muted);
            text-align: left; padding: var(--space-3) var(--space-4); }
.table td { padding: var(--space-3) var(--space-4);
            border-top: 1px solid var(--row-divider); }
.table .is-numeric { text-align: right; }

/* ---- Misc ---- */
.skeleton { background: var(--skeleton); border-radius: var(--radius-input); animation: pulse 1.6s infinite; }
.dash-border { border: 1px dashed var(--border-input); }
.avatar { border-radius: var(--radius-full); background: var(--avatar-fill);
          object-fit: cover; flex-shrink: 0; }
.icon-tile { width: 40px; height: 40px; display: grid; place-items: center;
             border: 1px solid var(--border-input); border-radius: var(--radius-input); }
.truncate-1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
```

> **Symmetry rule:** `height` + `align-items: center` + equal `padding-inline` on `.btn`, `.chip`, and `.pill` is what guarantees the spec's "all pills, chips and buttons must be symmetrical" requirement. Because it lives in three rules instead of forty `className` strings, it cannot drift between screens.

### 8.4 Responsive behavior

Since there is no utility framework, responsive rules live next to the layout they affect — in the feature module that owns it.

```css
/* styles/responsive.css — the only global breakpoints */
@media (max-width: 1024px) {
  :root { --sidebar-w: 64px; }
  .grid--4, .grid--split { grid-template-columns: repeat(2, 1fr); }
  .grid--5 { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  :root { --page-pad-x: var(--space-6); }
  .grid--4, .grid--3, .grid--5, .grid--split, .row--2-1 { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: stretch; }
}
```

Sidebar collapse-to-icons lives in `Sidebar.module.css` (hide `.navItem__label` below 1024px). Notes switches the folder list to a dropdown below 768px, in `FolderList.module.css`.

### 8.5 Icon rules

```ts
// components/ui/Icon.tsx
import { type LucideIcon } from 'lucide-react';

export function Icon({ icon: IconCmp, size = 18 }: { icon: LucideIcon; size?: 16 | 18 }) {
  return <IconCmp size={size} strokeWidth={2} aria-hidden />;
}
```

Size and color come from CSS (`svg { flex-shrink: 0 }` in the reset; `.chip`, `.btn` set `color` and the icon inherits via `currentColor`), so the JSX carries no styling props.

Icons in use (from the spec, no substitutes without checking the wireframe):

| Screen | Icons |
|---|---|
| Sidebar | `LayoutDashboard`, `Wallet`, `ClipboardList`, `Calendar`, `StickyNote` |
| Cashflow chart | `ChevronLeft`, `ChevronDown`, `ChevronRight` |
| Filter menus | `ChevronDown` |
| Auth features | `Wallet`, `ClipboardList`, `Calendar`, `FileText`/`StickyNote` |
| Actions | `Plus`, `Search`, `Trash2`, `Upload`, `Pin`, `Pencil`, `X` |

All icons `stroke-width={2}`, 16–18px, `color: currentColor`. No emoji anywhere.

### 8.6 Typography scale

Covered by the `.t-*` role classes in `base.css` (§8.2). Reference table:

| Role | Class | Size / weight |
|---|---|---|
| Page title | `.t-title` | 24px / 600 |
| Stat number | `.t-stat` | 26px / 600 |
| Card title | `.card__title` | 14px / 600 |
| Body | `.t-body` | 14px |
| Secondary / muted | `.t-muted` | 13px / `--muted` |
| Small label | `.t-label` | 12px / `--muted` |
| Auth hero | `.t-hero` | 32px / 600, line-height 1.2 |

### 8.7 Spacing scale

`--space-1..--space-10` = 4 / 8 / 12 / 16 / 24 / 32 / 40 (§8.1). Grid gap 16px. Page padding 32px vertical, 40px horizontal. Main area is a vertical stack with 24px gaps.

---

## 9. Shared component inventory

| Component | API sketch | Notes |
|---|---|---|
| `Button` | `variant="primary\|secondary\|ghost"`, `full`, `iconLeft`, `loading` | Renders `class="btn btn--primary"`; no styles in JSX. Loading swaps in a spinner and sets `disabled` |
| `Card` | `title`, `action`, `children` | `class="card"`; padding 20, gap 14, optional header divider |
| `StatCard` | `label`, `value`, `hint?` | `.t-label` + `.t-stat` + `.t-muted` |
| `Input`, `Select`, `Textarea` | standard | Wrapped in `.field` with `.field__label` and `.field__error` |
| `Pill` | `tone="default\|income\|expense\|accent"` | `class="pill pill--accent"`; height 24 |
| `Chip` | `active`, `onClick`, `iconRight` | `class="chip"`, active via `aria-pressed="true"`; height 36 |
| `Modal` | `open`, `onClose`, `title`, `footer` | Portal, `Modal.module.css`, `Esc` closes, focus trapped, body scroll locked |
| `Drawer` | same as Modal, `side="right"` | Same primitives, used for the note editor on narrow viewports |
| `Table` | `columns`, `rows` | `.table`, row divider `--row-divider` |
| `Dropdown` | `trigger`, `items`, `align` | `Dropdown.module.css`; used for Priority ▾, Course ▾, currency, month selector |
| `EmptyState` | `icon`, `title`, `hint`, `action` | Every list needs one |
| `Skeleton` | `variant="line\|card\|avatar\|table"` | `.skeleton`, fill `--skeleton`, subtle pulse |
| `Toast` | `useToast()` | Bottom-right, auto-dismiss 4s, `success\|error\|info` |
| `Avatar` | `src?`, `name`, `size` | `.avatar`, falls back to initials on `--avatar-fill` |
| `IconTile` | `icon` | `.icon-tile` — 40px outlined tile, auth feature rows |

---

## 10. Feature specs

### 10.1 Auth screens

**Shared split layout** (`(auth)/layout.tsx`, `AuthSplit.module.css`):
- `display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh`.
- **Left**: `background: var(--surface); border-right: 1px solid var(--border); padding: var(--space-10)`. App name top-left (16px/600). Centered block: 32px headline *"Everything you need to stay on top of student life."* then four feature rows (`gap: 24px`), each = 40px `.icon-tile` + name (14px) + one-line description (13px muted):
  - Cashflow — "Track income, expenses and subscriptions"
  - Assignments — "Keep deadlines by course and priority"
  - Schedule — "See your weekly classes at a glance"
  - Notes — "Capture ideas in folders and pinned notes"
  Footer bottom-left: "© Productivity Manager", 12px muted.
- **Right**: form centered both axes, `max-width: 380px`, `gap: var(--space-6)`.

**Login** — heading "Welcome back", muted subtitle "Sign in to your account to continue". Fields Email, Password (with `Eye`/`EyeOff` toggle). "Forgot password?" right-aligned accent link below password. Full-width **Sign in**. Footer: "Don't have an account? **Create account**" centered.

**Sign up** — heading "Create your account", subtitle "Start organizing money, classes and notes". Fields Username, Email, Password, Confirm password. Full-width **Create account**. Footer: "Already have an account? **Sign in**".

**Profile setup** — "Step 2 of 2" (13px muted) above heading "Set up your profile", subtitle "Add a photo and a short bio. You can change these later." 72px circular avatar + **Upload photo** secondary button + "Optional" muted label. Bio textarea. Full-width **Continue to dashboard**. Centered "Skip for now" accent link.

**Validation & errors:** inline messages under the offending field. Auth errors (invalid credentials, email taken) render in a small bordered alert above the button. Buttons show a spinner and disable during submit.

### 10.2 App shell

```
┌──────────────┬──────────────────────────────────────────┐
│ Sidebar 220  │ Page header: title + subtitle | actions  │
│              ├──────────────────────────────────────────┤
│ Productivity │                                          │
│ ▸ Dashboard  │  Main content (vertical stack, gap 24)  │
│   Cashflow   │                                          │
│   Assignments│                                          │
│   Schedule   │                                          │
│   Notes      │                                          │
│              │                                          │
│ (avatar) user│                                          │
└──────────────┴──────────────────────────────────────────┘
```

Sidebar shell (`Sidebar.module.css`):

```css
.shell { display: flex; min-height: 100vh; }
.sidebar {
  width: var(--sidebar-w); flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: var(--space-6) var(--space-4);
  display: flex; flex-direction: column;
}
.brand { font-size: var(--text-base); font-weight: 600; margin-bottom: var(--space-8); }
.nav { display: flex; flex-direction: column; gap: var(--space-1); }
.navItem {
  display: flex; align-items: center; gap: 10px;
  padding: 10px var(--space-3);
  border-radius: var(--radius-input);
  font-size: var(--text-base); color: var(--muted);
  transition: background var(--transition), color var(--transition);
}
.navItem:hover { color: var(--text); }
.navItem[aria-current="page"] { background: var(--nav-active); color: var(--text); }
.sidebar__footer { margin-top: auto; display: flex; align-items: center; gap: var(--space-3); }
.sidebar__username { font-size: var(--text-muted); color: var(--muted); }

.main { flex: 1; min-width: 0; }        /* min-width:0 stops wide tables breaking the grid */
```

- Brand "Productivity" at top, 16px/600.
- Nav icons 18px, inherited color.
- Footer: `margin-top: auto`, 32px circular avatar + `profiles.username` (13px muted). Links to `/profile`.
- Active detection: `usePathname()`, exact match, set as `aria-current="page"` (drives the CSS above and screen-reader state at once).
- `PageHeader` uses the global `.page-header` / `.page-header__actions`; right side is **secondary buttons first, primary last**.

### 10.3 Dashboard

Header: title "Good day, {username}", subtitle "Overview of money, deadlines and classes". Right: **Search** (secondary), **+ Quick add** (primary).

**Stat row** — 4 equal cards in `.grid.grid--4`:
| Card | Label | Value | Hint |
|---|---|---|---|
| Balance | "Balance (IDR)" | income − expenses, all time | "income − expenses" |
| Income this month | "Income this month" | Σ income, current month | — |
| Expenses this month | "Expenses this month" | Σ expense, current month | — |
| Subscriptions / month | "Subscriptions / month" | Σ subscription amounts | "from subscriptions" |

Card internals match the wireframe exactly: label 13px muted, big 26px number, hint 13px muted at the bottom, generous vertical padding (the cards are tall in the reference).

**2×2 grid** (`.grid.grid--split`, top row slightly wider on the left per the reference — `grid-template-columns: 1.4fr 1fr`):

1. **Upcoming assignments** — header title + "View all" link → `/assignments`. Rows: title (14px), `course · due date` (13px muted) on the left, priority `Pill` right. Up to 3 rows, divided by `row-divider`.
2. **Today's classes** — title + "Schedule" link. Rows: name, `start – end · room` muted, day `Pill` right.
3. **Recent transactions** — title + "Cashflow" link. Rows: description, `category · date` muted, signed amount `Pill` right (`+` accent for income, `−` default for expense).
4. **Pinned notes** — title + "Notes" link. Cards show skeleton lines (the reference uses placeholder lines); render real note previews with a title + 3 muted lines, matching the skeleton shape.

Empty states replace the rows when there is no data.

**Quick add** opens a modal with a type chooser (Transaction / Assignment / Class / Note) then the corresponding form — reuses the exact modal components from each feature, so there is one form implementation, not two.

**Search** opens a command-style modal (`⌘K`) searching across assignments, transactions, classes and notes.

### 10.4 Cashflow

Header: title "Cashflow", subtitle "Transactions and recurring subscriptions". Right: **currency selector** (small select, 12px label "Currency" above, e.g. `IDR ▾`) then **+ Transaction** primary.

**Stats** — 3 cards: Balance (all time), Income (this month), Expenses (this month).

**Spending chart card**
- Header row, `justify-content: space-between`: left = `‹` (`.icon-btn`) + month dropdown ("October 2026 ▾") + `›` (`.icon-btn`); right = period chips **Daily | Weekly | Monthly** with Daily active.
- Summary row: three inline figures — **Total spent**, **Average / day**, **Highest day**. Label 13px muted, value 26px/600.
- Bar chart, ~180px tall:
  - Plot area with a left y-axis gutter (~48px) showing `max`, `½`, `0` (12px muted).
  - Bottom x-axis with day numbers, labeled at 1, 8, 15, 22, 29 (not every day).
  - Bars: fill `var(--chart-bar)`, radius 4 on top, gap between bars, width computed by flex.
  - The single highest bar in the series uses `var(--accent)`.
  - Baseline is a 1px `var(--border)` line.
- Data: `transactions` where `type = 'expense'` and `date` within the selected month, summed by day / ISO week / month.
- Weekdays with no spending render as zero-height bars (still visible as a 2px stub) so the x-axis stays aligned.

**Bottom row** — `.row.row--2-1`: transactions card `flex: 2`, subscriptions card `flex: 1`.

**Transactions card**
- Header: title + filter chips **All | Income | Expense** (single-select, active chip = `nav-active`).
- Table columns: Date, Description, Category, Type (`Pill`), Amount (right-aligned). Row dividers in `row-divider`. Header row 13px muted.
- Sortable by clicking the Date or Amount header (default: date desc). Row click opens the edit modal; a hover trash icon soft-deletes with confirmation.

**Subscriptions card**
- Header: title + "**+ Add**" link (not a full button).
- Rows: name, `category · started date` (first row) / `category · last processed` (subsequent), amount `Pill` right.
- "+ Add" opens the subscription modal: Name, Amount, Category, Start date.
- Optional: a "Process this month" action that inserts `transactions` rows for every due subscription and stamps `last_processed`. This is what the schema's `last_processed` field is for; without it the dashboard "Subscriptions / month" figure is a simple sum of `subscriptions.amount`.

**Currency change** upserts the single `cashflow_settings` row and re-renders every money value on the dashboard and cashflow screens via `useMoney()`.

### 10.5 Assignments

Header: title "Assignments", subtitle "Track deadlines by course and priority". Right: **All** chip, **Priority ▾** dropdown chip, **Course ▾** dropdown chip, then **+ New** primary.

**Kanban board** (`Kanban.module.css`) — `.grid.grid--3`. Each column is a `.card` with a title at the top (**To do**, **In progress**, **Done**) and a stack of cards. Columns are equal width; do not stretch them to equal height — in the reference they end where their content ends, so use `align-items: start` on the grid.

**Assignment card** — `.assignmentCard`: `background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-input); padding: var(--space-4)`, contents:
- Title 14px
- Course 13px muted
- Footer row `display: flex; justify-content: space-between; margin-top: var(--space-2)`: due date (13px muted) left, priority `.pill` right
- `cursor: grab`, drag handle is the whole card.

**Status values** — canonical strings `'To do' | 'In progress' | 'Done'`, matching the column headers. Stored exactly so grouping is trivial. Reads should be case-insensitive and tolerant: group by normalized status and push unrecognized values into **To do**.

**Drag & drop** — @dnd-kit. On drop, optimistically move the card, call `changeStatus(id, status)`, `revalidatePath('/assignments')` and `/dashboard`. On failure, revert and toast. Keyboard support: focus a card, use arrow keys / space to pick up and drop.

**Filters** — priority and course dropdowns are single-select with an "All" option, implemented as client state passed to the query (or URL search params). Course options are derived from existing rows (`distinct course`).

**+ New modal** — Title (required), Course (required), Due date (`<input type="date">`), Priority (select High/Medium/Low), Description (textarea). Clicking a card opens the same modal in edit mode with a Delete action (soft delete).

### 10.6 Schedule

Header: title "Schedule", subtitle "Weekly class timetable". Right: chips **Week | Day** (Week active by default) and **+ Add class** primary.

**Week view** (`WeekGrid.module.css`) — `.grid.grid--5`. Five day cards in order **Mon, Tue, Wed, Thu, Fri**. No weekend columns. Each card: day title (14px/600) then stacked class blocks with `gap: var(--space-3)`.

**Class block** — `.classBlock`: `border-radius: var(--radius-input); padding: var(--space-3)`, fill and text from `color_theme`:
```css
.classBlock { border-radius: var(--radius-input); padding: var(--space-3); }
.classBlock--theme1 { background: var(--theme-1-bg); border: 1px solid var(--theme-1-br); color: var(--theme-1); }
.classBlock--theme2 { background: var(--theme-2-bg); border: 1px solid var(--theme-2-br); color: var(--theme-2); }
.classBlock--theme3 { background: var(--theme-3-bg); border: 1px solid var(--theme-3-br); color: var(--theme-3); }
.classBlock--theme4 { background: var(--theme-4-bg); border: 1px solid var(--theme-4-br); color: var(--theme-4); }
.classBlock__name { font-weight: 600; font-size: var(--text-base); }
.classBlock__time, .classBlock__room { font-size: var(--text-muted); }
```
```tsx
// The theme index maps to a modifier class, so the colors stay in CSS.
const idx = Math.max(0, THEMES.findIndex((t) => t.hex === klass.color_theme));
<div className={`classBlock classBlock--theme${idx + 1}`} />
```
- Name bold 14px in the tint color
- `start – end` 13px
- Room 13px

**Day view** — single column for the currently selected weekday, with the same block styling and a date picker above it.

**Day matching** — `schedule_classes.day` is free text. Normalize to `'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'` on read (`d.trim().slice(0,3)`), and store canonical values on write. "Today's classes" on the dashboard uses `new Date().getDay()` mapped through a Sunday-indexed array.

**+ Add class modal** — Name, Start time, End time (`type="time"`), Room, Day (select Mon–Fri), Color theme (4 swatch radio buttons using the four tint hexes; auto-assign the next unused color when the user does not pick).

### 10.7 Notes

Header: title "Notes", subtitle "Pinned and recent notes". Right: **Search** (secondary), **+ Note** (primary).

**Layout** (`NotesLayout.module.css`) — `display: flex; gap: var(--space-6); align-items: flex-start`.
- **Left folders card**, `width: 200px; flex-shrink: 0; align-self: start` (it does not stretch to match the grid). Title "Folders" (14px/600). Vertical list of items, radius 8, `padding: var(--space-2) var(--space-3)`, font-size 14px:
  - **All notes** — active by default
  - each `note_folders.name`
  - **Trash**
  - dashed **+ Folder** item (`.dash-border`, radius 8, height 40)
- **Right**, `flex: 1; min-width: 0`:
  - Section label "Pinned" (13px muted) → `.grid.grid--3` of note cards
  - Section label "Recent" → `.grid.grid--3`
  - Sections are omitted when they have no notes.

**Note card** (`NoteCard.module.css`) — `border-radius: var(--radius-input); border: 1px solid var(--border); background: var(--surface-alt); padding: var(--space-4); min-height: 170px; display: flex; flex-direction: column`:
- Top row: bold title (first line of `content`, `.truncate-1`) + "Pinned" `.pill` top-right when `pinned = true`
- Three preview lines (muted, varying widths like the reference skeleton) derived from lines 2–4 of `content`
- Bottom, `margin-top: auto`: "Last modified" (13px muted) formatted from `last_modified` epoch ms
- No per-note colors — all cards share the same surface.

**Selecting a folder** filters the grid by `folder_id`. **Trash** lists `deleted_at IS NOT NULL` notes with **Restore** and **Delete forever** actions instead of the normal footer.

**+ Note** creates an empty note immediately and opens the editor, so the user types without a second click. **+ Folder** shows an inline input (or a tiny modal) for the folder name.

**Note editor** — full-screen modal (desktop) / right drawer (narrow). Plain `content` textarea (`.textarea`, DM Sans, `background: var(--bg)`), no toolbar and no markdown rendering (the schema has no format column). Footer: folder selector, **Pin/Unpin** toggle, **Delete** (soft), **Save**. Autosave on a 800ms debounce, and update `last_modified` on every save.

### 10.8 Profile

`/profile` (reachable from the sidebar footer): avatar with upload, username (read-only after signup, or editable with a uniqueness caveat — the schema has no unique constraint, so treat it as display-only), bio textarea, Save button. After save, `revalidatePath` the sidebar and dashboard greeting.

---

## 11. Charts spec

`components/charts/BarChart.tsx` — pure SVG, no dependency.

**Props**

```ts
type BarChartProps = {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;         // default 180
  formatValue: (n: number) => string;
};
```

Colors come from CSS, not props — `BarChart.module.css` styles the SVG parts by class:

```css
.chart__bar    { fill: var(--chart-bar); }
.chart__bar--max { fill: var(--accent); }
.chart__axis   { stroke: var(--border); stroke-width: 1; }
.chart__label  { fill: var(--muted); font-size: 12px; font-family: var(--font-sans); }
.chart__label--x { text-anchor: middle; }
.chart__label--y { text-anchor: end; dominant-baseline: middle; }
```

**Rendering**

1. `max = Math.max(...values, 1)`; round up to a "nice" number for the axis top.
2. SVG `width="100%" height={height}` with a `viewBox`; do **not** use `preserveAspectRatio="none"` (it would skew the text).
3. Left gutter 48px for labels `max`, `½`, `0`, `text-anchor="end"`, 12px `var(--muted)`.
4. Bars as `<rect>` with `rx="4"`, flex-distributed x positions, 6px gap.
5. Bar height = `(value / maxAxis) * plotHeight`. Zero values → 2px stub at the baseline.
6. The highest bar gets `chart__bar chart__bar--max`.
7. Baseline `<line class="chart__axis">`.
8. X labels below the plot, only for the indices the reference shows (1, 8, 15, 22, 29 for daily; each bucket for weekly/monthly).
9. Bar `rect` gets a `<title>` with the full date and formatted amount for hover.

**Series builders** (`lib/utils/date.ts`)

| Period | Buckets | Label | Re-aggregates on |
|---|---|---|---|
| `daily` | 1…daysInMonth | day number | month change |
| `weekly` | ISO weeks of the month (up to 6) | "W1"…"W6" | month change |
| `monthly` | trailing 12 months, selected month centered | "Jan"…"Dec" | period toggle only |

Summary figures:
- **Total spent** = Σ expenses in the selected month (constant across periods).
- **Average / day** = total ÷ days elapsed in the month (Daily) / ÷ number of buckets (Weekly) / ÷ 12 (Monthly).
- **Highest day** = the label and amount of the max bucket.

---

## 12. Soft delete & Trash spec

| Table | Delete UX | Restore UX |
|---|---|---|
| `assignments` | trash icon on card/modal → soft delete + toast with Undo | n/a |
| `transactions` | trash icon on table row → soft delete | n/a |
| `subscriptions` | trash icon on row → soft delete | n/a |
| `schedule_classes` | trash icon on block/modal → soft delete | n/a |
| `notes` | trash icon in editor / card menu → soft delete | **Trash** folder: Restore / Delete forever |
| `note_folders` | trash icon in folder list → soft delete; its notes keep existing with `folder_id` intact | n/a |

Implementation notes:
- Soft delete is an `update`, so the row stays visible to RLS-scoped owners; always add `.is('deleted_at', null)` to reads.
- Undo in the toast re-issues the update with `deleted_at: null` within the toast's lifetime.
- Hard delete is only reachable from Notes → Trash, where the user explicitly chose "Delete forever".
- `profiles` and `cashflow_settings` have no `deleted_at`; they are removed by deleting the auth user (cascade) or by the delete-account flow.

---

## 13. Utilities & conventions

### 13.1 Money (`lib/utils/money.ts`)

```ts
export const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'JPY', 'AUD'] as const;

export function formatMoney(amount: number, currency: string, opts?: { compact?: boolean; signed?: boolean }) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: 0,        // IDR and friends have no minor unit in the UI
    signDisplay: opts?.signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

export const toNumber = (v: string | number | null) => Number(v ?? 0);   // numeric comes back as a string
```

Amounts in the wireframes display as `0.00`, so use 2 fraction digits on stat cards and 0 on table rows — pick one and apply it everywhere. Recommended: **0 decimals everywhere, `IDR 1.250.000`**, with 2 decimals only in the chart summary figures.

### 13.2 Dates (`lib/utils/date.ts`)

```ts
export function monthBounds(date: Date) { /* { start, end } UTC ISO */ }
export function daysInMonth(y: number, m: number) {}
export function groupByDay(rows)     {}
export function groupByWeek(rows)    {}
export function groupByMonth(rows)   {}
export function formatDate(iso, style: 'short' | 'long' | 'relative') {}
export function relativeFromEpochMs(ms: number) {}   // for notes.last_modified
export function currentWeekday(): 'Mon' | ... | 'Fri' {}
export function isSameLocalDay(a: Date, b: Date) {}
```

**Timezone rule:** `transactions.date` is `timestamptz`; store UTC ISO strings, convert to local only for display and bucketing. "This month" is computed from the **user's local** calendar month, not UTC — otherwise the dashboard is wrong for users east/west of UTC on the 1st of a month.

### 13.3 Constants (`lib/constants.ts`)

```ts
export const ASSIGNMENT_STATUSES = ['To do', 'In progress', 'Done'] as const;
export const ASSIGNMENT_PRIORITIES = ['High', 'Medium', 'Low'] as const;
export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export const SUBSCRIPTION_TYPES = ['income', 'expense'] as const;  // value stored in transactions.type
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export const CLASS_THEMES = ['#7c9cff', '#5fd0b0', '#e8a76b', '#c08cf0'] as const;
export const CHART_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
```

### 13.4 Domain types (`types/domain.ts`)

```ts
export interface Assignment {
  id: string; user_id: string; title: string; course: string;
  description: string | null; due_date: string; priority: string; status: string;
  created_at: string; updated_at: string; deleted_at: string | null;
}
export interface Note {
  id: string; user_id: string; content: string; last_modified: number;
  pinned: boolean; folder_id: string | null;
  created_at: number; updated_at: string; deleted_at: string | null;
}
export interface Transaction {
  id: string; user_id: string; type: 'income' | 'expense'; amount: number;
  category: string; description: string; date: string;
  created_at: string; updated_at: string; deleted_at: string | null;
}
// etc.
```

The `notes` int8 fields are typed as `number` (epoch ms). Add a runtime guard in the repository: `last_modified ?? Date.now()`.

### 13.5 Conventions

- Server actions in `src/lib/actions/*.ts` with `'use server'`, one action per mutation, each ending in `revalidatePath`.
- Zod schema per form in `lib/validation`, shared by the client form and the server action so both reject the same input.
- Loading: `loading.tsx` per route with skeletons matching the real layout; mutations get a button spinner rather than a page skeleton.
- Errors: a `RepositoryError` wrapper; server actions return `{ ok: false, message }` and forms render inline messages. Never throw raw Supabase errors into the UI.
- Toast for success and for delete/undo.

### 13.6 Styling conventions

- **JSX carries class names, never style objects.** The only inline `style` allowed is a dynamic value CSS cannot know (e.g. a computed bar height in `%`, or an avatar preview URL).
- **Class naming:** `.block` for elements, `.block__element` for children, `.block--modifier` for variants (`.btn--primary`). Feature classes are PascalCase-free and match the file: `WeekGrid.module.css` → `.weekGrid`, `.weekGrid__day`.
- **Variants come from props, not composition.** `<Button variant="primary">` renders `class="btn btn--primary"`. Never `class={"btn " + extra}`.
- **A component that needs its own module** gets one; a component that is pure design-system markup uses the global primitives. Do not move a global primitive into a module — that breaks the "one definition" guarantee.
- **Every color and size is a `var(--token)`.** If you need a value that is not in `tokens.css`, add the token first, then use it. This is what makes the palette swappable in one file.
- **No `!important`.** If specificity fights you, restructure the selector.
- CSS Modules are imported as `import s from './X.module.css'`; global classes and module classes coexist freely in one `className`.

---

## 14. Cross-cutting behaviors

| Behavior | Implementation |
|---|---|
| Active nav | `usePathname()` in `Sidebar`; exact match, with `/` prefix safety |
| Month selector | Client state → chart + summaries re-derive; chevrons step months, dropdown jumps |
| Period toggle | Client state → `groupByDay/Week/Month` |
| Transaction chips | Client filter on the already-fetched month rows, or a server query re-run |
| Assignment filters | Client state applied to the fetched list (data volume is small); priority and course dropdowns |
| Drag to change status | @dnd-kit, optimistic update, `changeStatus` action, revert on error |
| Folder selection | Local state; refetches notes for the selected folder |
| Trash | `deleted_at IS NOT NULL` query, separate repository functions |
| Forms in modals | One `Modal` primitive; each feature owns its form component and reuses it for create and edit |
| Currency change | Upsert `cashflow_settings`; `useMoney()` reads it in every money component |
| Keyboard | `⌘K` / `Ctrl+K` opens global search; `Esc` closes modals; focus trapped while open |
| Responsiveness | Wireframes are 1280px. Below 1024px collapse the sidebar to icons; below 768px stack grids to one column and turn the notes folder list into a dropdown |

---

## 15. Edge cases & decisions log

| # | Issue | Decision |
|---|---|---|
| 1 | No profile row is created by the schema itself | Add the `handle_new_user` trigger; keep a client-side `ensureProfile` fallback (§5.3, §7.3) |
| 2 | `profiles.bio` is NOT NULL but "Skip for now" writes nothing | Store `''` on skip |
| 3 | `assignments.due_date` is `text` | Write ISO `YYYY-MM-DD`; parse defensively on read and render an em dash when unparseable. Sorting uses a parsed timestamp, with unparseable rows last |
| 4 | `assignments.status` / `priority` are free text | Store the canonical strings from `constants.ts`; group defensively so legacy rows still render |
| 5 | `notes.created_at` and `last_modified` are `int8`, while `updated_at` is `timestamptz` | Write `Date.now()` (ms) to the int8 fields and ISO strings to the timestamptz field. Never swap them |
| 6 | `note_folders.created_at` is int8 but `updated_at` is timestamptz | Same rule: epoch ms for `created_at`, ISO for `updated_at` |
| 7 | `transactions.amount` is `numeric` → returned as a string | `toNumber()` at the repository boundary; format only at render time |
| 8 | No FKs listed in `scheme.md` | Add them in migration 0001 (logic unchanged, behavior improved) |
| 9 | `notes.folder_id` has no on-delete behavior in the schema | `ON DELETE SET NULL` so removing a folder never destroys notes |
| 10 | `notes.content` holds both title and body | First line = title, remaining lines = body preview. Consistent everywhere |
| 11 | `subscriptions` has no `type` | Assume expense. Document it in the modal ("Subscriptions count as monthly expenses") |
| 12 | `subscriptions.last_processed` implies recurring materialization | Implement an explicit "Process this month" action rather than a background job; the dashboard total is a plain sum |
| 13 | `schedule_classes` has no date, only `day` + times | It is a repeating weekly timetable. Week/Day toggle is a view filter, not a date navigator |
| 14 | "Subscriptions per month" vs a real balance | Dashboard balance = income − expenses from `transactions` only. Subscriptions affect their own card until materialized |
| 15 | `notes` Trash needs a hard delete | Allowed only from Trash ("Delete forever"); everywhere else is a soft delete |
| 16 | `cashflow_settings` is one row per user, PK on `user_id` | Seed in the signup trigger; the currency selector upserts on conflict |
| 17 | Email confirmation flow | Support both; the confirm route handles `token_hash` + `type` for signup and recovery |
| 18 | Soft delete on `assignments` and no "Trash" screen for them | Fine — no trash UI exists for anything except notes |
| 19 | "Today" and "this month" across timezones | Compute in the browser's local zone; store UTC |
| 20 | `username` uniqueness | The schema has no unique constraint, so usernames are display-only and duplicates are allowed. Do not add a constraint (would change the schema) |
| 21 | Global search needs cross-table reads | Query each table with `ilike` limited to 10 rows each and render grouped results |
| 22 | Chart "Monthly" period vs the month selector | In Monthly mode the chart shows a trailing 12-month window; the chevrons shift the window, the dropdown still picks the end month |

---

## 16. Implementation phases

Each phase ends with something you can click and verify.

### Phase 0 — Setup (0.5 day)
- [ ] `create-next-app` with TypeScript, App Router, ESLint, `src/` dir — **answer "No" to Tailwind, "No" to any CSS-in-JS option**
- [ ] Delete the generated `app/globals.css`; create `src/styles/{tokens,reset,base,primitives,responsive}.css` and have `globals.css` import them in that order
- [ ] Install `@supabase/supabase-js @supabase/ssr zod date-fns lucide-react @dnd-kit/core`
- [ ] `app/layout.tsx` imports `globals.css` and wires DM Sans via `next/font/google` as `--font-dm-sans`
- [ ] `lib/constants.ts`, `lib/utils/*`, `types/domain.ts`
- [ ] `.env.local` with the three Supabase keys; `middleware.ts` no-op stub

**Verify:** `npm run dev` renders a page with the dark background, DM Sans, and no console errors about missing CSS.

### Phase 1 — Database (0.5 day)
- [ ] Write `0001_schema.sql` reproducing `scheme.md` exactly
- [ ] `0002_rls.sql` with the 32 policies from `scheme.md`, RLS enabled everywhere
- [ ] `0003_functions.sql` — `handle_new_user` + `set_updated_at` triggers
- [ ] `0004` indexes, FKs, Storage bucket + avatar policies
- [ ] Apply to Supabase (hosted or local CLI), verify with `select * from profiles`
- [ ] Write `seed.sql` with demo rows for a test user

### Phase 2 — Supabase plumbing (0.5 day)
- [ ] `lib/supabase/{client,server,middleware,types}.ts`
- [ ] Working `middleware.ts` with session refresh and redirects
- [ ] `lib/supabase` typed against the generated `Database` type
- [ ] Verify: sign in with a seeded user, land on `/dashboard`, no console errors

### Phase 3 — UI primitives (1 day)
- [ ] `primitives.css`: `.btn` (+ 4 variants), `.card`, `.field`/`.input`/`.select`/`.textarea`, `.chip`, `.pill`, `.icon-btn`, `.page`/`.page-header`, `.grid--*`, `.table`, `.skeleton`, `.avatar`, `.icon-tile`
- [ ] `base.css`: the `.t-*` typography roles
- [ ] `Button`, `Card`, `StatCard`, `Input`, `Select`, `Textarea`, `Pill`, `Chip`, `IconTile`, `Avatar`
- [ ] `Modal` (+ `Modal.module.css`), `Dropdown` (+ `Dropdown.module.css`), `Toast`, `EmptyState`, `Skeleton`, `Table`
- [ ] `useToast`, `useModal` hooks
- [ ] **Verify against the wireframes:** heights, radii, colors and font sizes match the spec exactly. Get this right now — everything else inherits it. Measure a button in DevTools: it must be 40px tall.

### Phase 4 — Auth (1 day)
- [ ] `(auth)/layout.tsx` split screen with the feature list
- [ ] `/login`, `/signup`, `/forgot-password`, `/reset-password`
- [ ] `/profile-setup` (step 2 of 2) with avatar upload and bio
- [ ] `/auth/confirm` route + middleware verification
- [ ] Sign out, session persistence, redirect guards
- [ ] **Verify:** sign up → confirm → profile setup → dashboard → sign out → sign in

### Phase 5 — App shell + Dashboard (1 day)
- [ ] `(app)/layout.tsx` with the 220px sidebar and profile footer
- [ ] `PageHeader`
- [ ] Dashboard: 4 stat cards + 2×2 summary cards with real data
- [ ] `stats.ts` repository, `useMoney()`
- [ ] `loading.tsx` skeletons that match the layout
- [ ] **Verify:** sidebar nav switches screens, active item highlights, greeting uses `profiles.username`

### Phase 6 — Cashflow (1.5 days)
- [ ] Stats row, currency selector wired to `cashflow_settings`
- [ ] `BarChart` component + the three series builders
- [ ] Month selector + Daily/Weekly/Monthly chips + the three summary figures
- [ ] Transactions table, type filter chips, sorting
- [ ] Subscriptions card, "+ Add", optional "Process this month"
- [ ] Transaction and Subscription modals, delete with undo
- [ ] **Verify:** add 20+ transactions across a month; chart, summaries, table and dashboard stats all agree

### Phase 7 — Assignments (1 day)
- [ ] Kanban board, 3 columns, assignment cards
- [ ] Drag & drop with optimistic status update and keyboard support
- [ ] Priority and course filters
- [ ] Create/edit/delete modal
- [ ] **Verify:** drag a card across all three columns and reload — the status persists

### Phase 8 — Schedule (1 day)
- [ ] Week grid, 5 columns, tinted class blocks from `color_theme`
- [ ] Week/Day toggle
- [ ] Add/edit/delete class modal with the 4 color swatches
- [ ] Dashboard "Today's classes" wired to the real weekday
- [ ] **Verify:** no weekend columns; colors cycle correctly; today's classes match the current weekday

### Phase 9 — Notes (1.5 days)
- [ ] Folders sidebar with All notes / Trash / dashed "+ Folder"
- [ ] Pinned + Recent 3-column grids, note cards with previews and "Last modified"
- [ ] Note editor modal with autosave, folder assignment, pin toggle
- [ ] Trash view with Restore and Delete forever
- [ ] `+ Note` creates-and-opens; search filters notes
- [ ] **Verify:** create, pin, move to folder, delete, restore from Trash, delete forever

### Phase 10 — Polish and hardening (1 day)
- [ ] Global search modal (`⌘K`)
- [ ] Quick add modal on the dashboard
- [ ] Empty states for every list
- [ ] Responsive pass (sidebar collapse, single-column grids)
- [ ] Accessibility pass: focus trap, labels, `aria-*` on modals and menus, contrast check
- [ ] Final visual diff against all 8 wireframes

**Total estimate: ~11 days** of focused work.

---

## 17. Testing & verification

**Manual test script** (run through before submission):

1. Sign up with a new account → profile row exists → profile setup → dashboard greets by username.
2. Add 10+ transactions across 2 months; switch months and all three periods; totals match hand-computed sums.
3. Change currency; every money value on Cashflow and Dashboard updates.
4. Create assignments in all three statuses, drag between columns, reload, confirm persistence.
5. Filter by priority and by course.
6. Add classes on all five weekdays with different colors; verify no weekend column.
7. Create folders and notes, pin one, delete another, restore it from Trash.
8. Sign out and sign in — data is intact.
9. Open a second browser profile and confirm RLS isolation: user B cannot see user A's rows (try a direct API call with user A's session).
10. Compare every screen against its wireframe.

**Automated checks (worth the time):**
- Unit tests (Vitest) for `money.ts`, `date.ts` grouping, `BarChart` aggregation, `assignment` status normalization.
- One Supabase RLS integration test that signs in as two users and asserts isolation.

---

## 18. Deployment

- **Hosting:** Vercel (Next.js native).
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, if used), `NEXT_PUBLIC_SITE_URL`.
- **Supabase:** create a separate project per environment; apply migrations through the CLI or the SQL editor; add the production URL to Auth → URL configuration.
- **SEO/metadata:** title "Productivity Manager", dark `theme-color` `#0e0f12`, `viewport` export with `themeColor`.
- **Before shipping:** confirm RLS is enabled on all 8 tables and the Storage policies exist.

---

## 19. Out of scope

Explicitly excluded, per the UI spec's "don'ts" and to protect the schema:

- Social/OAuth login
- Any column not present in `Database/scheme.md`
- Per-note colors, note sharing, note attachments, rich text / markdown
- Weekend columns on the schedule
- Recurring transactions other than `subscriptions`
- Automated background jobs or scheduled subscription processing
- Light theme, gradients, emoji, heavy shadows
- Mobile-native layouts beyond basic responsiveness
- Multi-user sharing, comments, notifications