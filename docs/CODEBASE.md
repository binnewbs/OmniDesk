# OmniDesk Codebase Guide

**Who owns what, how a request travels, and where to make changes.**

This document explains the *code* in this repository. For installation, Supabase
setup, demo data and deployment, read [`README.md`](../README.md). For the visual
spec, read [`UI_DESIGN/UI_DESIGN.md`](../UI_DESIGN/UI_DESIGN.md).

The goal here is simple: after reading this, you should be able to open any file
in `src/` and know **why it exists, what it is allowed to do, and what will break
if you move that job somewhere else.**

---

## Contents

1. [The 30-second version](#1-the-30-second-version)
2. [Tech stack: what each piece is responsible for](#2-tech-stack-what-each-piece-is-responsible-for)
3. [The architecture in one picture](#3-the-architecture-in-one-picture)
4. [Folder map: who owns what](#4-folder-map-who-owns-what)
5. [Layer-by-layer tour](#5-layer-by-layer-tour)
6. [Feature ownership matrix](#6-feature-ownership-matrix)
7. [End-to-end trace: adding a transaction](#7-end-to-end-trace-adding-a-transaction)
8. [The data model in plain English](#8-the-data-model-in-plain-english)
9. [Authentication, onboarding and security](#9-authentication-onboarding-and-security)
10. [Rules of the house](#10-rules-of-the-house)
11. [Recipes: where do I change X?](#11-recipes-where-do-i-change-x)
12. [Tests, scripts and environment](#12-tests-scripts-and-environment)
13. [Glossary](#13-glossary)

---

## 1. The 30-second version

OmniDesk is a **student productivity app** with five main screens, plus the
account and authentication screens:

| Screen | Job |
|---|---|
| **Dashboard** | One overview: money stats, upcoming work, today's classes, recent spending, pinned notes |
| **Cashflow** | Income/expense transactions, a spending chart, recurring subscriptions, receipt scanning |
| **Assignments** | A three-column kanban board: To do, In progress, Done |
| **Schedule** | A Monday–Friday class timetable |
| **Notes** | Folders, pinned notes, a trash bin, and a debounced autosave editor |
| **Profile / Auth** | Signup, login, password reset, avatar + bio |

Under the hood it is a **Next.js App Router** application backed by **Supabase**
(Postgres + Auth + Storage). The single most important architectural rule is:

> **The browser never talks to the database directly.**
> Server Components read through repositories. Forms write through Server Actions.
> Both run on the server, where the Supabase client and the user's session live.

Everything else in this guide is a consequence of that rule.

---

## 2. Tech stack: what each piece is responsible for

| Technology | Version | Responsibility in this project | Who uses it |
|---|---|---|---|
| **Next.js** | 16 (App Router) | Routing, Server Components, Server Actions, caching/revalidation | Everything |
| **React** | 19 | UI, client-side state in screen components | `components/`, `hooks/` |
| **TypeScript** | 5 | Types across the whole app, including database row types | Everywhere |
| **Supabase Postgres** | — | Stores all user data; **RLS** isolates each user's rows | `lib/repositories/` |
| **Supabase Auth** | — | Email/password accounts, email confirmation, password reset | `lib/supabase/*`, `lib/actions/auth.ts` |
| **Supabase Storage** | — | Avatar images in the `avatars` bucket | `lib/repositories/profiles.ts` |
| **Zod** | 4 | Validates everything entering a Server Action | `lib/validation/`, `lib/actions/` |
| **CSS Modules + tokens** | — | Styling; one token layer, one module per component/screen | `src/styles/`, `*.module.css` |
| **`@dnd-kit`** | 6/10 | Drag-and-drop for the assignments kanban | `components/features/assignments/` |
| **`date-fns`** | 4 | Date arithmetic and formatting | `lib/utils/date.ts` |
| **`lucide-react`** | — | Icons only (no emoji, no icon font) | `components/ui/Icon.tsx` |
| **Vitest** | 3 | Unit tests for pure logic **and** architecture rules | `src/**/*.test.ts` |
| **Gemini API** | optional | Reads a receipt photo and returns amount/merchant/date/category | `lib/actions/receipt.ts` |

No component library. No CSS framework. No chart library (the bar chart is
hand-rolled SVG). That is deliberate: the project keeps its dependency surface
small and its visual rules in one place.

---

## 3. The architecture in one picture

### 3.1 Reading data (page load)

```
Browser
  │  GET /cashflow
  ▼
src/proxy.ts                         ← Next 16's renamed "middleware"
  │  • refreshes the Supabase auth cookie
  │  • redirects signed-out users to /login
  ▼
src/app/(app)/layout.tsx             ← protected shell
  │  • requireProfileComplete()
  │  • loads profile + timezone once
  │  • renders Sidebar, BottomNav, Toast/Timezone providers
  ▼
src/app/(app)/cashflow/page.tsx      ← Server Component (async)
  │  • requireUser()
  │  • calls repositories in parallel with Promise.all
  ▼
src/lib/repositories/cashflow.ts     ← "server-only"
  │  • creates a Supabase client bound to the request cookies
  │  • SELECT ... WHERE user_id = ... AND deleted_at IS NULL
  ▼
Supabase Postgres                    ← Row-Level Security checks auth.uid()
  │
  ▼
plain typed objects (Transaction[], Subscription[], …)
  │
  ▼
CashflowScreen (client component)    ← receives data as props
  │  renders UI; keeps local state (selected month, filters, modals)
  ▼
HTML + JavaScript
```

Key points:

- The page is **async** and does the fetching. The screen component is usually
  `'use client'` and does **not** fetch its initial data.
- The repository is the **only** layer that knows SQL/PostgREST.
- The page passes only the data that screen needs, already shaped and parsed.

### 3.2 Writing data (form submission)

```
Client form / button
  │  calls an imported function from src/lib/actions/*
  ▼
src/lib/actions/cashflow.ts          ← starts with 'use server'
  │  1. Zod validates the FormData or plain arguments
  │  2. requireUserOrThrow() gets the authenticated user
  ▼
src/lib/repositories/cashflow.ts
  │  • INSERT / UPDATE / soft DELETE
  │  • revalidate(['/cashflow', '/dashboard'])
  ▼
Supabase Postgres (RLS applies)
  │
  ▼
{ ok: true } or { ok: false, message / errors }
  │
  ▼
Client shows a toast, closes a modal, calls router.refresh()
or the action redirects to another route
```

Why this split matters:

- **Server Actions are public HTTP endpoints.** Their TypeScript types are erased
  over the wire, so every input must be validated again on the server. That is
  why Zod schemas exist in `lib/validation/` and inside the action files.
- **Repositories contain no UI decisions.** They never call `redirect()`, never
  show a toast, and never know which screen called them.
- **`revalidate()` is how the screen updates.** After a mutation, Next discards
  the cached server render for the affected routes. The client then calls
  `router.refresh()` (or a redirect happens) and the page re-fetches.

---

## 4. Folder map: who owns what

```
OmniDesk/
├── Database/
│   └── scheme.md                  Human-readable schema + RLS reference
├── UI_DESIGN/
│   ├── *.png                      Approved wireframes
│   └── UI_DESIGN.md               Visual spec (colors, sizes, layout)
├── docs/
│   └── CODEBASE.md                ← you are here
├── public/                        Static files, PWA worker, icons
├── supabase/
│   ├── migrations/                Numbered SQL migrations (source of truth)
│   ├── apply_all.sql              All migrations concatenated, idempotent
│   └── seed.sql                   Optional demo data
└── src/
    ├── app/                       Routes, layouts, loading states
    ├── components/                UI, grouped by responsibility
    ├── hooks/                     Reusable client-side React hooks
    ├── lib/                       Server logic, data access, pure helpers
    ├── styles/                    Global CSS layers and design tokens
    └── types/                     Domain types mirroring the database
```

### Responsibility table

| Path | Responsible for | Must **not** do |
|---|---|---|
| `src/app/` | Routing, page-level data loading, metadata, redirects | Contain feature UI logic or raw SQL |
| `src/app/(auth)/` | Split-screen auth pages | Render the app shell |
| `src/app/(app)/` | The protected app shell and feature routes | Be reachable when signed out |
| `src/app/auth/` | Email-link landing routes (`confirm`, `callback`) | Render normal pages |
| `src/components/shell/` | Sidebar, bottom nav, page header, global search, sign-out | Own feature data |
| `src/components/ui/` | Generic, reusable primitives (Button, Card, Modal, Pill, …) | Import repositories or actions |
| `src/components/features/` | One folder per screen; screen + its modals/parts | Fetch initial data from Supabase directly |
| `src/components/charts/` | Reusable SVG chart rendering | Know about money/transactions specifically |
| `src/hooks/` | Client-only reusable behaviour/state | Access the database |
| `src/lib/supabase/` | Supabase clients, auth helpers, error types, DB types | Contain feature business rules |
| `src/lib/repositories/` | **All** reads and writes, one module per table group | Redirect, show UI, or format display strings |
| `src/lib/actions/` | Server Actions: validate input, call repository, return state | Talk to Supabase directly (call a repository) |
| `src/lib/validation/` | Zod schemas shared by forms and actions | Import server-only modules |
| `src/lib/utils/` | Pure helpers (money, dates, ids, assignment normalization) | Touch the network or database |
| `src/lib/timezone.ts` | Pure timezone/calendar helpers (client **and** server safe) | Read cookies |
| `src/lib/timezone.server.ts` | Reads the user's `tz` cookie on the server | Be imported by a client component |
| `src/lib/receipt.ts` | Pure receipt parsing/limits, unit-testable | Call Gemini or Supabase |
| `src/lib/revalidate.ts` | Cache invalidation and the route groups each feature affects | Be imported by client code |
| `src/styles/` | Global layers: tokens → reset → base → primitives → responsive | Contain feature-specific rules |
| `src/types/` | Domain interfaces shared by pages, repositories and screens (plus UI-only shapes like `ChartBucket`) | Define database row types (those live in `lib/supabase/types.ts`) |
| `supabase/` | Database schema, RLS policies, triggers, indexes, storage, seed | Be edited ad hoc without a migration |

The two "forbidden" columns are the ones worth memorising. When code starts
drifting across those lines, the codebase stops being predictable.

---

## 5. Layer-by-layer tour

### 5.1 `src/app/` — routing and page-level data loading

This is Next.js **App Router**. A folder is a URL segment; a `page.tsx` is the
page; a `layout.tsx` wraps everything below it.

#### Route groups

Parentheses make a folder **organisational only** — it does not appear in the URL.

```
src/app/
├── layout.tsx                  Root: <html>, font, theme script, globals.css
├── page.tsx                    "/" → redirect to /dashboard, /login or /profile-setup
├── not-found.tsx               404 page
├── manifest.ts                 PWA manifest at /manifest.webmanifest
│
├── (auth)/                     No app shell; split-screen layout
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── profile-setup/page.tsx
│
├── (app)/                      Signed-in shell (sidebar + bottom nav)
│   ├── layout.tsx              Guard + providers + navigation
│   ├── dashboard/page.tsx
│   ├── cashflow/page.tsx
│   ├── assignments/page.tsx
│   ├── schedule/page.tsx
│   ├── notes/page.tsx
│   └── profile/page.tsx
│
└── auth/
    ├── confirm/route.ts        Handles ?token_hash=&type=email|recovery
    └── callback/route.ts       Handles the PKCE ?code= variant
```

#### What a page does

Feature pages follow the same recipe. `src/app/(app)/cashflow/page.tsx` is the
clearest example:

1. Export `metadata` (the tab title).
2. Call `requireUser()` — redirect to `/login` if there is no session.
3. Call repositories **in parallel** with `Promise.all`.
4. Pass the results as props to a client screen component.

That is the whole job. Pages are data loaders plus a little composition. They do
not contain business logic, and they do not render complicated UI directly.

#### Loading states

Each feature route has a `loading.tsx` (for example
`src/app/(app)/notes/loading.tsx`). Next shows it automatically while the page's
server work is in flight. They render the same skeleton primitives
(`components/ui/Skeleton.tsx`) so navigation never feels empty.

#### Layouts

- **Root layout** (`src/app/layout.tsx`) sets the DM Sans font, metadata, the
  per-theme favicon, and injects `preferencesScript` **before first paint** so
  the saved theme/sidebar state does not flash. It also registers the service
  worker.
- **App layout** (`src/app/(app)/layout.tsx`) is the security + shell boundary:
  - `requireProfileComplete()` redirects incomplete accounts to `/profile-setup`.
  - It loads the profile and timezone **once**, then renders `Sidebar`,
    `BottomNav`, `AppProviders` and the page.
  - Feature pages load their own data; the layout does not pre-fetch features.

#### Auth routes

`auth/confirm` and `auth/callback` are **Route Handlers** (plain HTTP GET), not
pages. They exist because Supabase emails link back to the app and the token must
be exchanged for a session before any React renders. Both variants are supported
so either email template works.

---

### 5.2 `src/components/` — the UI, sorted by responsibility

The folder names are the contract:

#### `components/shell/` — the persistent frame

| File | Responsibility |
|---|---|
| `Sidebar.tsx` | Desktop navigation, active state, profile link, theme toggle |
| `BottomNav.tsx` | Mobile navigation (same items, shorter labels) |
| `PageHeader.tsx` | Standard title + subtitle + action buttons |
| `GlobalSearch.tsx` | ⌘K / Ctrl+K search modal, grouped results, debounced |
| `ProfileMenu.tsx` | Avatar menu (profile, sign out) |
| `SignOutDialog.tsx` | Confirmation before signing out |
| `navIcons.ts` | Maps nav item names to Lucide components |
| `ServiceWorkerRegistrar.tsx` | Registers `public/sw.js` in production only |

Shell components receive the little data they need (username, avatar) as props
from `(app)/layout.tsx`. They do not query the database.

#### `components/ui/` — generic primitives

`Button`, `Card`, `Field`, `Pill`, `Modal`, `Dropdown`, `Toast`, `StatCard`,
`Avatar`, `Skeleton`, `EmptyState`, `Icon`, `IconTile`, `Logo`, `BrandLockup`,
`ThemeToggle`.

Rules:

- These components are **feature-agnostic**. `Button` must not know what a
  transaction is.
- Variants are **CSS modifier classes**, never assembled strings:
  `<Button variant="primary">` renders `class="btn btn--primary"`. The symmetry
  rules (height, padding, centring) live in `styles/primitives.css`, once.
- `Modal` and `Dropdown` handle focus, escape and outside-click. `Dropdown`'s
  trigger hands out ready-made accessibility props (`aria-expanded`, etc.), and
  `Dropdown.test.ts` is a regression test for that contract.

#### `components/features/` — one folder per screen

```
features/
├── auth/           LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm,
│                   ProfileSetupForm, AuthSplit
├── dashboard/      DashboardScreen, QuickAddModal
├── cashflow/       CashflowScreen, TransactionsTable, SpendingChart,
│                   TransactionModal, SubscriptionModal, SubscriptionsList,
│                   ReceiptCamera, CurrencySelect
├── assignments/    AssignmentsScreen, KanbanBoard, KanbanColumn, AssignmentModal
├── schedule/       ScheduleScreen, WeekGrid, ClassModal
├── notes/          NotesScreen, FolderList, NoteCard, NoteEditor
└── profile/        ProfileScreen
```

The pattern inside a feature:

- **`XxxScreen.tsx`** — `'use client'`, receives initial data, owns local UI state
  (filters, selected month, open modal), calls Server Actions, shows toasts.
- **`XxxModal.tsx`** — a form in a modal; calls one create/update action.
- **Small parts** — tables, cards, boards, charts; mostly presentational.

Screens are client components because they are interactive. They do **not** fetch
their initial data; the page already did that on the server. This avoids a
client-side request waterfall on first paint.

#### `components/charts/`

`BarChart.tsx` is a generic SVG bar chart: it takes buckets and renders bars,
axis labels and a tooltip. It does not know about transactions or money.
`SpendingChart.tsx` (in the cashflow feature) is what aggregates transactions
into buckets and feeds `BarChart`.

---

### 5.3 `src/hooks/` — reusable client behaviour

| Hook | Responsibility |
|---|---|
| `useProviders.tsx` | Composes `TimezoneProvider` + `ToastProvider` around the app |
| `useUserTimezone.tsx` | Detects the browser timezone, writes the `tz` cookie, exposes it via context |
| `useModal.ts` | Open/close state for a modal |
| `useSubmitFeedback.ts` | Runs a success callback exactly once per completed submission |
| `useGlobalSearchHotkey.ts` | Binds ⌘K / Ctrl+K |
| `useSidebarState.ts` | Reads/writes the collapsed-sidebar preference |
| `useMounted.ts` | Avoids hydration mismatches for client-only rendering |

Hooks never import a repository or a Supabase client. They are UI behaviour, not
data access.

---

### 5.4 `src/lib/supabase/` — the database door

This folder is the only place that constructs a Supabase client.

| File | Responsibility |
|---|---|
| `server.ts` | Server client bound to request cookies. Wrapped in React `cache()` so one render shares one client. Also exports `getUser()`. |
| `client.ts` | Browser client (singleton in the browser, fresh per call during SSR). Used only by `'use client'` code that genuinely needs it. |
| `middleware.ts` | `updateSession()`: refreshes the auth cookie, verifies email tokens, route-guards. Called by `src/proxy.ts`. |
| `auth.ts` | `requireUser()` (redirect), `requireUserOrThrow()` (for actions), `requireContext()` (user + client). |
| `errors.ts` | `RepositoryError` and `AuthRequiredError`. Raw driver errors never reach the UI. |
| `types.ts` | Hand-maintained `Database` type matching the SQL schema, plus `TableInsert` / `TableUpdate` helpers. |

Why `import 'server-only'` matters: it is a build-time tripwire. If a client
component ever imports `server.ts` (directly or through a repository), the build
fails instead of silently shipping the service-side client to the browser.

The server client reads cookies per request, which is what makes Supabase Auth
work: the session token *is* a cookie.

---

### 5.5 `src/lib/repositories/` — all reads and writes

**One module per table group.** This is the data-access layer. If it touches the
database, it belongs here.

| Module | Tables / responsibility |
|---|---|
| `cashflow.ts` | `transactions`: list, create, update, soft delete, restore |
| `subscriptions.ts` | `subscriptions`: CRUD + `materializeSubscriptions()` (turn due subscriptions into expense transactions) |
| `assignments.ts` | `assignments`: list, create, update, status change, bulk soft delete, bulk restore, course list |
| `schedule.ts` | `schedule_classes`: CRUD, next colour theme, today's classes |
| `notes.ts` | `notes` + `note_folders`: CRUD, pin, move, trash, restore, purge |
| `stats.ts` | Aggregations for dashboard/cashflow: month totals, recent rows, dashboard bundle |
| `settings.ts` | `cashflow_settings`: get/update currency |
| `profiles.ts` | `profiles` + avatar Storage upload |

#### Repository conventions (these are consistent on purpose)

1. **They start with `import 'server-only';`.**
2. **The user id is always an explicit argument** (or comes from
   `requireContext()`), and every query filters on it. RLS is the real
   enforcement; the filter is also a clear, cheap first line.
3. **Normal reads filter `deleted_at is null`.** Trash reads explicitly ask for
   `deleted_at is not null`.
4. **Delete means "set `deleted_at`".** Only `purgeNote()` performs a real
   `DELETE`, and it is guarded so it can only remove an already-trashed note.
5. **Numbers are parsed at the boundary.** PostgREST returns `numeric` as a
   string; repositories call `toNumber()` before returning, so components always
   receive real numbers.
6. **Errors are wrapped** in `RepositoryError(operation, cause)`. The UI gets a
   friendly message, logs keep the detail.
7. **Mutations end with `revalidate(...)`**, using the constants in
   `lib/revalidate.ts` (`AFFECTS_CASHFLOW`, etc.).

A repository function should read like a small, named database operation. If a
function starts formatting currency or deciding which toast to show, that logic
belongs somewhere else.

---

### 5.6 `src/lib/actions/` — Server Actions

Every file starts with the directive:

```ts
'use server';
```

That single line is what turns each exported async function into a **Server
Action** — a function the browser can call over HTTP, which executes on the
server. Without it, the file is an ordinary module, and a client component
importing it ships the module (including server-only dependencies) to the
browser. The build can still pass; the breakage shows up when a form is
submitted.

| File | Actions |
|---|---|
| `auth.ts` | sign up, sign in, forgot password, reset password, skip profile setup, sign out |
| `profile-setup.ts` | complete onboarding (bio + avatar) |
| `profile.ts` | save profile changes |
| `cashflow.ts` | transactions, subscriptions, classes, currency, subscription processing |
| `assignments.ts` | create/update, drag-status change, delete/undo, bulk clear/undo |
| `notes.ts` | folders, notes, autosave, pin, move, delete/undo, purge |
| `search.ts` | cross-table ⌘K search |
| `receipt.ts` | receipt photo → Gemini → new expense transaction |

#### Two shapes of action

1. **Form actions** — used with React's form state:
   ```ts
   export async function createTransactionAction(
     _prev: ActionState,
     formData: FormData,
   ): Promise<ActionState>
   ```
   They validate `FormData`, return `{ ok, message?, errors? }`, and the form
   displays field errors.

2. **Argument actions** — called directly from a click handler:
   ```ts
   export async function deleteTransactionAction(id: string): Promise<ActionState>
   ```
   Arguments are `unknown` at runtime, so ids/enums go through
   `lib/validation/wire.ts` first.

#### The action recipe

```
validate input with Zod
  → get the user (requireUserOrThrow)
  → call ONE repository function
  → return { ok: true } or a friendly { ok: false, ... }
```

Actions may `redirect()` (auth flows do) but repositories never do. Actions
catch `RepositoryError` and turn it into user-facing copy; anything else is
re-thrown so real bugs are not swallowed.

---

### 5.7 `src/lib/validation/` — Zod schemas

| File | Used by | Purpose |
|---|---|---|
| `auth.ts` | Auth forms + `actions/auth.ts`, `actions/profile.ts`, `actions/profile-setup.ts` | Signup/login/reset/profile field rules and `fieldErrors()` |
| `wire.ts` | Actions that receive plain arguments | Ids, id lists, currency codes, assignment status, note content, folder names |

Validation is duplicated by design: the form gives fast feedback, the server is
the actual gate. A Server Action must assume the browser sent anything.

---

### 5.8 `src/lib/` — the rest of the brain

| File | Responsibility |
|---|---|
| `constants.ts` | Shared enums/lists: statuses, priorities, weekdays, class tints, currencies, avatar limits, nav items |
| `revalidate.ts` | `revalidate()`, `revalidateAll()`, and the `AFFECTS_*` route groups |
| `timezone.ts` | Pure timezone/calendar maths: validate a zone, get "today", month boundaries, relative labels |
| `timezone.server.ts` | Reads the `tz` cookie and normalizes it (server only) |
| `preferences.ts` | Theme + sidebar persistence in `localStorage` and the pre-paint inline script |
| `profile-setup-state.ts` | Onboarding flag in `user_metadata` |
| `receipt.ts` | Receipt prompt, response schema, limits, pure response parser |
| `utils/money.ts` | `toNumber`, `formatMoney`, `formatAmount`, `parseAmount`, `round2` |
| `utils/date.ts` | Calendar-date formatting vs instant formatting, chart bucketing helpers, weekday helpers |
| `utils/assignment.ts` | Normalize free-text status/priority, split finished work, resolve drag drops |
| `utils/id.ts` | Client-style unique id generation for text primary keys |

#### Why there are two timezone modules

The app renders two different kinds of time value:

- **Calendar dates** — a transaction date, an assignment due date. These mean "a
  day" and must never shift. They are formatted by parsing the date components
  directly (`formatCalendarDate`), with no timezone involved.
- **Instants** — "today's classes", month boundaries, "last modified". These are
  real moments and depend on the viewer's zone.

The browser detects its zone, writes it to the `tz` cookie, and the server reads
it through `timezone.server.ts`. That is why SSR and the client agree about what
"today" or "this month" means. Without it, a UTC server and a Jakarta browser
disagree — which React reports as a hydration mismatch.

---

### 5.9 `src/styles/` — styling in five layers

`globals.css` is imported **once**, by the root layout. It imports, in order:

```
tokens.css        CSS variables: colors, spacing, radii, typography, shadows
reset.css         Browser normalization
base.css          Element defaults (body, headings, links, focus)
primitives.css    Design-system classes: .btn, .card, .chip, .pill, .input, .table
responsive.css    Global breakpoints
```

Then every component/screen has a colocated `*.module.css` (CSS Modules). Class
names are scoped automatically, so `.card` in one module cannot collide with
another.

Rules:

- **Every color, radius and size is a `var(--token)`.** No raw hex outside
  `tokens.css`.
- Themes work by swapping token values under `[data-theme='dark']`; components
  never branch on the theme.
- Destructive and priority colors deliberately opt out of theme inversion,
  because hue carries meaning (red = dangerous/urgent) in both themes.
- Variants are CSS modifier classes, not string concatenation.

---

### 5.10 `supabase/` and `Database/`

| Path | Responsibility |
|---|---|
| `supabase/migrations/0001_schema.sql` | Creates the 8 tables |
| `supabase/migrations/0002_rls.sql` | Enables RLS and creates 32 policies (`auth.uid() = user_id`) |
| `supabase/migrations/0003_functions.sql` | New-user trigger (profile + settings) and `updated_at` triggers |
| `supabase/migrations/0004_indexes_storage.sql` | `(user_id, deleted_at)` indexes + `avatars` Storage bucket and policies |
| `supabase/apply_all.sql` | All four concatenated for the Supabase SQL Editor; idempotent |
| `supabase/seed.sql` | Optional demo data for one email address |
| `Database/scheme.md` | Human-readable table/column/policy reference |

The migrations are the **source of truth**. `Database/scheme.md` documents them;
`src/lib/supabase/types.ts` mirrors them for TypeScript. If you change the
schema, update all three (and regenerate the Supabase types).

Notable database behaviour:

- **RLS is the security model.** Every table has four policies (select, insert,
  update, delete), all requiring `auth.uid() = user_id`. Even if application code
  forgot a filter, the database would not return another user's rows.
- **`handle_new_user`** runs on signup and creates both the `profiles` row and
  the `cashflow_settings` row. The app can therefore assume they exist.
- **`set_updated_at`** maintains `updated_at` on every table that has the column.
- **Storage policies** only allow writes under `avatars/<your-user-id>/`.

---

### 5.11 `public/` — static assets and PWA

| File | Purpose |
|---|---|
| `sw.js` | Minimal service worker for installability (registered in production only) |
| `icons/` | PWA icons (192, 512, maskable) and Apple touch icon |
| `favicon.ico`, `favicon-light.svg`, `favicon-dark.svg` | Per-theme favicons |
| `logo.svg` | Brand mark |

The service worker is intentionally minimal: it makes the app installable without
introducing a caching layer that could serve stale data. It is skipped in
development so it cannot interfere with hot reload.

---

## 6. Feature ownership matrix

Use this when you need to find every file a feature touches.

| Feature | Route | Server page | Client screen | Main parts | Actions | Repository | Tables |
|---|---|---|---|---|---|---|---|
| **Dashboard** | `/dashboard` | `(app)/dashboard/page.tsx` | `features/dashboard/DashboardScreen.tsx` | `QuickAddModal`, `StatCard`, `BarChart` | `search`, all feature actions via quick-add | `stats.ts` + the feature repos | reads all |
| **Cashflow** | `/cashflow` | `(app)/cashflow/page.tsx` | `features/cashflow/CashflowScreen.tsx` | `TransactionsTable`, `SpendingChart`, `SubscriptionsList`, `TransactionModal`, `SubscriptionModal`, `ReceiptCamera`, `CurrencySelect` | `actions/cashflow.ts`, `actions/receipt.ts` | `cashflow.ts`, `subscriptions.ts`, `settings.ts`, `stats.ts` | `transactions`, `subscriptions`, `cashflow_settings` |
| **Assignments** | `/assignments` | `(app)/assignments/page.tsx` | `features/assignments/AssignmentsScreen.tsx` | `KanbanBoard`, `KanbanColumn`, `AssignmentModal` | `actions/assignments.ts` | `assignments.ts` | `assignments` |
| **Schedule** | `/schedule` | `(app)/schedule/page.tsx` | `features/schedule/ScheduleScreen.tsx` | `WeekGrid`, `ClassModal` | `actions/cashflow.ts` (class actions live here) | `schedule.ts` | `schedule_classes` |
| **Notes** | `/notes` | `(app)/notes/page.tsx` | `features/notes/NotesScreen.tsx` | `FolderList`, `NoteCard`, `NoteEditor` | `actions/notes.ts` | `notes.ts` | `notes`, `note_folders` |
| **Profile** | `/profile` | `(app)/profile/page.tsx` | `features/profile/ProfileScreen.tsx` | `Avatar`, `Field` | `actions/profile.ts` | `profiles.ts` | `profiles` + Storage |
| **Auth** | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/profile-setup` | `(auth)/*/page.tsx` | `features/auth/*Form.tsx` | `AuthSplit` | `actions/auth.ts`, `actions/profile-setup.ts` | `profiles.ts` | `profiles`, `auth.users` |
| **Global frame** | every `(app)` route | `(app)/layout.tsx` | `shell/*` | `Sidebar`, `BottomNav`, `PageHeader`, `GlobalSearch`, `ProfileMenu`, `SignOutDialog` | `actions/auth.ts`, `actions/search.ts` | `profiles.ts`, `stats.ts` | — |

One quirk worth knowing: **schedule class actions live in `actions/cashflow.ts`.**
They were grouped there because the Cashflow screen and the Schedule screen share
the same action module for their respective resources; the repository is still
correctly separated (`schedule.ts`). If you refactor, moving class actions to
their own file is safe and would make this table cleaner.

---

## 7. End-to-end trace: adding a transaction

This is the best way to internalise the layering. Follow one click through every
file.

### Step 1 — the user opens the form

`CashflowScreen.tsx` renders a **+ Transaction** button. Clicking it sets local
state `modalOpen = true`, which renders `TransactionModal.tsx`.

The modal is a client component with a normal HTML `<form>`. It imports the
Server Action and uses it as the form's `action` / submit handler:

```ts
import { createTransactionAction } from '@/lib/actions/cashflow';
```

### Step 2 — the browser submits to the server

The form posts `type`, `amount`, `category`, `description`, `date` as
`FormData`. Even though the action was imported like a normal function, Next
sends it over HTTP. **The browser cannot see the function body.**

### Step 3 — `createTransactionAction` validates

`src/lib/actions/cashflow.ts`:

1. `transactionSchema.safeParse({...})` checks:
   - `type` is `income` or `expense`
   - `amount` is a non-empty, parseable, positive string
   - `category` is non-empty and ≤ 60 characters
   - `description` is ≤ 200 characters
   - `date` is present
2. On failure it returns `{ ok: false, errors: {...} }` and the modal shows field
   errors. Nothing touches the database.

### Step 4 — the action authenticates

```ts
const user = await requireUserOrThrow();
```

`requireUserOrThrow()` calls `supabase.auth.getUser()` — which revalidates the
token with Supabase Auth, rather than trusting the cookie blindly. No user means
an `AuthRequiredError`, which the action turns into `{ ok: false }` (actions
must not redirect).

### Step 5 — the action calls one repository function

```ts
await createTransaction(user.id, {
  ...rest,
  date: new Date(rest.date).toISOString(),
  amount: parseAmount(amount)!,
});
```

The action's job here is narrow: convert the wire format (`YYYY-MM-DD` from the
date input, formatted amount text) into the shape the repository expects.

### Step 6 — the repository writes

`src/lib/repositories/cashflow.ts`:

1. Gets a Supabase client bound to the request cookies.
2. Builds the row: client-generated id, `user_id`, rounded amount, timestamps,
   `deleted_at: null`.
3. `INSERT` into `transactions`.
4. Wraps any driver error in `RepositoryError('transactions.create', error)`.
5. Calls `revalidate(AFFECTS_CASHFLOW)` → invalidates `/cashflow` and
   `/dashboard`.

### Step 7 — the database enforces ownership

Postgres RLS checks the insert policy:

```
auth.uid() = user_id
```

A crafted request with someone else's `user_id` would be rejected by the
database, not merely by application code.

### Step 8 — the UI updates

- If the action returns `{ ok: true }`, the modal closes and the screen calls
  `router.refresh()`.
- Next re-renders `/cashflow` on the server: a new `page.tsx` run, new repository
  reads, new props.
- The table and chart show the new row. The toast may offer **Undo**, which calls
  `undoDeleteTransactionAction(id)` — a soft-delete restore, not a second insert.

### The receipt variant

`scanReceiptAction` follows the same path with two differences:

1. It accepts a `File` from `FormData`, checks the MIME type and size (max 4 MB),
   base64-encodes it, and asks Gemini (trying `GEMINI_MODEL`, then two
   fallbacks) for JSON matching a response schema.
2. It calls the same `createTransaction` repository function. The image is never
   stored.

The Gemini call is optional: without `GEMINI_API_KEY`, the action returns
"Receipt scanning is not configured" and the manual form still works.

---

## 8. The data model in plain English

Eight tables. Every user-owned row has a `user_id` and a nullable `deleted_at`.

```
auth.users (Supabase)
   │ 1
   │
   ├── profiles (user_id PK)               username, bio, avatar
   ├── cashflow_settings (user_id PK)      currency
   │
   ├── transactions                        type, amount, category, description, date
   ├── subscriptions                       name, amount, category, start_date, last_processed
   ├── assignments                         title, course, description, due_date, priority, status
   ├── schedule_classes                    name, room, day, start_time, end_time, color_theme
   ├── note_folders                        name
   └── notes                               content, last_modified, pinned, folder_id → note_folders
```

### The three things that surprise people

1. **`deleted_at` is the delete switch.**
   Normal queries use `deleted_at is null`. "Delete" sets a timestamp. "Undo"
   sets it back to null. The only real `DELETE` is Notes → Trash → Delete forever
   (`purgeNote`), which is guarded so it cannot purge a live note.

2. **Notes use `int8` epoch milliseconds.**
   `notes.created_at`, `notes.last_modified` and `note_folders.created_at` are
   **numbers** (milliseconds since 1970), not ISO strings. Everything else that
   is a timestamp is `timestamptz` (ISO string). `types/domain.ts` comments both
   cases, and `lib/supabase/types.ts` marks the epoch-ms fields.

3. **`numeric` arrives as a string.**
   PostgREST returns `amount` as text to avoid precision loss. Repositories parse
   it with `toNumber()` at the boundary, so domain types can safely declare
   `amount: number`. If you ever see "12.5" concatenated instead of added, a
   boundary parse was skipped.

### Free-text columns need normalization

The schema stores `assignments.status`, `assignments.priority`,
`schedule_classes.day` and `transactions.type` as `text`. The app writes only
canonical values, but reads are defensive:

- `normalizeStatus` / `normalizePriority` (`lib/utils/assignment.ts`) map
  unexpected casing to a sensible value instead of dropping the row.
- `normalizeDay` (`lib/utils/date.ts`) does the same for weekdays.
- `transactions.type` anything other than `'income'` reads as `'expense'`.

### Subscriptions are not transactions… until you say so

A subscription is a template (`amount`, `category`, `start_date`,
`last_processed`). It does not silently create expenses in the background.
`materializeSubscriptions()` — triggered by the user — inserts one expense
transaction per due subscription for the current month and stamps
`last_processed`. That is why the dashboard shows "subscriptions per month"
separately from the spending chart.

---

## 9. Authentication, onboarding and security

### 9.1 The request gate: `src/proxy.ts`

Next.js 16 renamed the middleware convention: the file exports `proxy()` instead
of `middleware()`. The logic is the same and lives in
`lib/supabase/middleware.ts`.

On every matched request it:

1. Creates a Supabase server client using the request cookies.
2. Calls `auth.getUser()` — **not** `getSession()`. `getUser()` revalidates the
   token with the Auth server; `getSession()` trusts the cookie without checking.
3. Handles `/auth/confirm` token verification and redirects onward.
4. Redirects signed-out users away from private routes to `/login`.
5. Redirects signed-in users away from `/login` and `/signup` to `/dashboard`.

Public paths: `/login`, `/signup`, `/forgot-password`, `/reset-password`,
`/profile-setup`. Everything under `/auth` is allowed through so callbacks work.

### 9.2 The onboarding gate: `lib/auth-guard.ts`

`requireProfileComplete()` runs in the `(app)` layout, so it protects every
feature route, including direct URL navigation:

```
no user           → /login
setup incomplete  → /profile-setup
profile row missing → create it (self-heal), then continue
```

The "setup complete" marker is **not** a database column. It is
`user_metadata.profile_setup_complete` (`lib/profile-setup-state.ts`). Why?
Because the signup trigger already fills `profiles.username` from the signup
form, so "username is empty" could never distinguish a half-finished account.
Adding a column was out of scope, so user metadata was the available slot.
Sign-in self-heals accounts that predate the flag.

### 9.3 The data gate: Row-Level Security

Even with a valid session, the anon key, and a crafted query, a user can only
read/write rows where `auth.uid() = user_id`. All 8 tables have RLS enabled with
four policies each (32 total). The Storage bucket has equivalent folder policies.

**Defence in depth:**

| Layer | Stops |
|---|---|
| `proxy.ts` + layout guard | Signed-out or half-onboarded navigation |
| `requireUserOrThrow()` in actions | Unauthenticated action calls |
| Explicit `user_id` filters | Accidental cross-user queries in app code |
| RLS | Anything that bypasses the app code entirely |

### 9.4 Session handling

- The server Supabase client is request-scoped and cookie-bound.
- `createClient()` is wrapped in React's `cache()`, so a page, its layout and
  nested repository calls share one cookie read and one client per render.
- The browser client is a module-level singleton, so normal re-renders do not
  open new connections or lose auth state.
- The proxy refreshes the cookie on each request, keeping long sessions alive.

### 9.5 The theme and timezone "before first paint" tricks

Both exist to avoid a visible flash or a hydration mismatch:

- **Theme/sidebar:** an inline script in the root layout reads `localStorage`
  and sets `data-theme` / `data-sidebar` on `<html>` while the HTML is still
  parsing. The server already renders `data-theme="light"`, so the script only
  overrides for a returning dark-mode user.
- **Timezone:** `useUserTimezone` detects the browser zone and writes the `tz`
  cookie on mount. The server reads it on the next request. The very first load
  of a brand-new session falls back to UTC; after that, both sides agree.

---

## 10. Rules of the house

These are the invariants that keep the app coherent. The comments in the code
explain *why*; this list is the quick reference.

### Architecture

1. **Repositories are the only database door.** No page, component, hook or
   action calls `supabase.from(...)` directly. If you need a new query, add a
   repository function.
2. **Every action file starts with `'use server';`.** `lib/layering.test.ts`
   fails the suite if one is missing, and also checks that action modules export
   only async functions.
3. **Every database module is `server-only`.** That includes `lib/supabase/*`,
   `lib/repositories/*` and `lib/revalidate.ts`. Shared pure modules
   (`validation/`, `utils/`, `constants.ts`) deliberately are not.
4. **Pages load data; screens render it.** A screen component should not fetch
   its own initial data. Pass it from the page as props.
5. **Actions validate, then delegate.** Zod first, `requireUserOrThrow()` second,
   one repository call third, a return value last.

### Data

6. **Filter `deleted_at is null` on normal reads.** Use the Trash query only for
   the Notes trash view.
7. **Delete means soft delete.** Use `deleted_at`. The only hard delete is
   `purgeNote`, from Trash.
8. **Parse `numeric` at the repository boundary** with `toNumber()`. Never do
   arithmetic on a value typed `string`.
9. **Let RLS do the security work, but still pass `user_id` explicitly.** The
   filter documents intent and catches mistakes early.
10. **Invalidate after every mutation.** Use `AFFECTS_*` from
    `lib/revalidate.ts`; add a new constant if a mutation affects new routes.

### UI and styling

11. **No raw hex outside `tokens.css`.** Use `var(--token)`.
12. **Variants are modifier classes**, e.g. `btn btn--primary`. Do not build
    Tailwind-style class strings.
13. **Feature-specific CSS lives in a colocated `*.module.css`.** Global layers
    are only for tokens, resets, element defaults, primitives and breakpoints.
14. **Icons are Lucide only.** No emoji, no icon fonts.
15. **UI primitives stay feature-agnostic.** `Button` should not know what a
    transaction is.

### Time and money

16. **Calendar dates are not instants.** Use `formatCalendarDate` for
    transaction/assignment dates; use the timezone helpers for "today" and
    month boundaries.
17. **Money is formatted through `formatMoney` / `formatAmount`.** The currency
    comes from `cashflow_settings`, never hard-coded per component.
18. **A user's month is their month.** Use `startOfMonthInZone` /
    `startOfNextMonthInZone`; end bounds are exclusive so a boundary row lands
    in exactly one month.

---

## 11. Recipes: where do I change X?

### "Add a field to an existing feature"

Example: add `notes.color`.

1. Add the column in a **new migration** (`supabase/migrations/0005_...sql`) and
   update `supabase/apply_all.sql`.
2. Update `Database/scheme.md` and `src/lib/supabase/types.ts`.
3. Add it to `src/types/domain.ts`.
4. Include it in the repository's insert/update/select (usually `select('*')`,
   so mostly the write paths).
5. Add it to the action's Zod schema and the form input.
6. Render it in the screen/part component.
7. If it affects other routes, extend the `AFFECTS_*` constant in
   `lib/revalidate.ts`.

### "Add a new screen"

1. Create the route folder: `src/app/(app)/new-thing/page.tsx`.
2. In the page: `metadata`, `requireUser()`, repository reads, render a screen.
3. Create `src/components/features/new-thing/NewThingScreen.tsx` with
   `'use client'` and props for the initial data.
4. Add `loading.tsx` using the skeleton primitives.
5. Add the nav entry in `lib/constants.ts` (`NAV_ITEMS`) and an icon in
   `components/shell/navIcons.ts`.
6. If mutations are needed: repository functions → actions → form/modal.

### "Change how a screen looks"

- **Colors, spacing, radii, type:** edit `src/styles/tokens.css` (and only
  there).
- **Shared button/card/chip/input behaviour:** `src/styles/primitives.css`.
- **One screen or component:** its colocated `*.module.css`.
- **Responsive behaviour:** the component module first; global breakpoints in
  `responsive.css` only if it applies app-wide.

### "Add a database table"

1. New migration + `apply_all.sql`.
2. RLS policies in a migration (four policies, `auth.uid() = user_id`).
3. Index on `(user_id, deleted_at)` if the table will be listed.
4. `Database/scheme.md`, `src/lib/supabase/types.ts`, `src/types/domain.ts`.
5. A repository module, then actions, then UI.

### "The form does nothing when I submit"

Check, in order:

1. Does the action file start with `'use server';`?
2. Is the client importing the action from `lib/actions/`, not calling Supabase
   itself?
3. Did the action return `{ ok: false }` with a field error the form is not
   rendering?
4. Is the user signed in (`requireUserOrThrow` would throw otherwise)?
5. Did the repository call `revalidate()`? Without it, the write succeeds but
   the page keeps showing cached data.

### "Dates are off by one day"

You are probably formatting a **calendar date** through `new Date(iso)` in a
non-UTC zone. Use `formatCalendarDate` (`lib/utils/date.ts`), which parses the
`YYYY-MM-DD` components directly. If the value is genuinely an instant, use the
timezone helpers instead.

### "Money shows as a string or concatenates"

A `numeric` value crossed the repository boundary without `toNumber()`. Fix it
in the repository, not in the component.

---

## 12. Tests, scripts and environment

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |

### What is tested

The suite focuses on **pure logic** and **architecture rules**, not rendered
components:

| Test | What it guards |
|---|---|
| `lib/layering.test.ts` | `'use server'` in every action file; `server-only` in the data layer; no `server-only` in shared pure modules; action modules export only async functions |
| `lib/timezone.test.ts` | Zone validation, month boundaries, relative labels |
| `lib/utils/money.test.ts` | Amount parsing (`1.250.000` vs `1,250.50`), rounding, formatting |
| `lib/utils/date.test.ts` | Calendar-date vs instant formatting, chart bucketing |
| `lib/utils/calendarDate.test.ts` | Day-shift edge cases |
| `lib/utils/assignment.test.ts` | Status/priority normalization, drag-drop resolution |
| `lib/receipt.test.ts` | Receipt JSON parsing, fallbacks, rejection cases |
| `components/ui/Dropdown.test.ts` | Dropdown's trigger hands out valid DOM/a11y props |
| `components/shell/ProfileMenu.test.ts` | Profile menu trigger markup and disclosure attributes |

Run `npm test` before shipping. The layering test is the one that catches the
most dangerous mistake in this codebase (a missing `'use server'`).

### Environment variables

| Variable | Required | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Server and browser Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Server and browser Supabase clients |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Email confirmation/reset links |
| `GEMINI_API_KEY` | Optional | Receipt scanning only |
| `GEMINI_MODEL` | Optional | Preferred vision model, with fallbacks |

`SUPABASE_SERVICE_ROLE_KEY` is intentionally unused by the app. The seed script
runs in the Supabase SQL Editor, which already has admin credentials.

---

## 13. Glossary

| Term | Meaning here |
|---|---|
| **App Router** | Next.js's file-based router (`src/app/`). Folders are URL segments. |
| **Server Component** | A React component that runs only on the server. Pages and layouts are Server Components by default. |
| **Client Component** | A component marked `'use client'`; it can use state, effects and browser APIs. Feature screens and modals are client components. |
| **Server Action** | A function in a `'use server'` module that the browser can call over HTTP. Used for all writes. |
| **Route Handler** | A plain HTTP handler (`route.ts`), used for auth callbacks. |
| **Repository** | The data-access layer (`lib/repositories/`). The only code that queries Supabase. |
| **RLS** | Row-Level Security. Postgres policies that restrict rows to `auth.uid() = user_id`. |
| **Soft delete** | Marking a row deleted with `deleted_at` instead of removing it. |
| **Revalidation** | Telling Next.js to discard a cached server render so the next request re-fetches. |
| **Hydration** | React attaching to server-rendered HTML. Mismatches happen when server and client render different content (often dates/timezones). |
| **PostgREST** | The HTTP API Supabase exposes over Postgres. It returns `numeric` values as strings. |
| **PKCE** | The OAuth flow Supabase uses for email links; the `code` is exchanged for a session in `auth/callback`. |
| **Optimistic update** | Updating the UI before the server confirms. The kanban does this on drag, then persists the status. |

---

## Final mental model

If you remember only five sentences:

1. **Pages fetch, screens render.**
2. **Repositories own the database; actions own validation and orchestration.**
3. **The browser never holds a database client.**
4. **Deletes are timestamps; reads filter them out.**
5. **RLS is the security boundary — application code is the convenience layer on top.**

Everything else in `src/` is an implementation of those five ideas.
