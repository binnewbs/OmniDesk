# OmniDesk – UI Design Spec

A dark-mode, minimalist-but-not-bare, clean and modern web app for students. It manages **cashflow, assignments, schedule and notes**. This document describes the approved wireframes so you can implement the UI faithfully. Treat the wireframes as layout and style truth. Sample text in them is placeholder only.

Wireframe canvas: https://claude.ai/artifact/75zPCPst7aEL6BE3CugZqm (desktop, 1280px wide screens).

---

## 1. Design principles

- Dark theme only. Calm, low-contrast surfaces with one soft blue accent.
- Cards and whitespace do the organizing. Avoid heavy borders, shadows and gradients.
- Fully rounded (pill) shapes for buttons, chips and badges. Softly rounded (8–12px) for cards, inputs and nav items.
- Icons are **Lucide** only (stroke 2, 16–18px, `currentColor`). No emoji.
- No clutter: creating or editing items happens through a **"+ New" style button** (modal or drawer), never through permanent side forms.

## 2. Design tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| `bg` | `#0e0f12` | App background, input background |
| `surface` | `#14161b` | Cards, login left panel |
| `surface-alt` | `#16181d` | Note cards |
| `border` | `#22252c` | Card borders, dividers, sidebar edge |
| `border-input` | `#2c313a` | Inputs, outlined buttons, chips, pills |
| `row-divider` | `#1d2026` | List and table row separators |
| `nav-active` | `#1a1d24` | Active nav item / active chip background |
| `text` | `#e6e8ec` | Primary text |
| `muted` | `#8b919c` | Secondary text, labels, inactive nav |
| `pill-text` | `#aab0bb` | Text inside pills |
| `accent` | `#7c9cff` | Primary buttons, links, highlighted chart bar |
| `on-accent` | `#0e0f12` | Text on accent buttons |
| `chart-bar` | `#2a3550` | Default chart bars |
| `skeleton` | `#22252c` | Placeholder lines, avatar fill `#262a31` |

Schedule class block tints (fill = color at ~13% opacity, text = full color), cycled per class: `#7c9cff`, `#5fd0b0`, `#e8a76b`, `#c08cf0`. These map to `schedule_classes.color_theme`.

### Typography
- Font: **DM Sans** (400, 500, 600).
- Base 14px. Page title (`h1`) 24px / 600. Big stat numbers 26px / 600. Card title 14px / 600. Secondary/muted 13px. Small labels 12px. Auth hero heading 32px.

### Shape and size
- Cards: radius 12, padding 20, 1px `border`, background `surface`, internal gap 14.
- Inputs: radius 8, min-height 44, 1px `border-input`, background `bg`, 13px text.
- Buttons: radius full, height 40, horizontal padding 18. Primary = `accent` fill. Secondary = transparent with 1px `border-input`.
- Chips (filters/toggles): radius full, height 36, padding 0 16, 1px `border-input`. Active chip uses `nav-active` background and `text` color.
- Pills (badges such as priority, type, Pinned): radius full, height 24, padding 0 12, 1px `border-input`, 12px `pill-text`. All pills, chips and buttons must be **symmetrical**: fixed height, centered text, equal padding.
- Icon-only buttons (e.g. chevrons): 36×36 circle/rounded, outlined.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 40. Grid gaps are 16. Page padding is 32px vertical, 40px horizontal.

## 3. App shell (all logged-in screens)

- **Left sidebar**, 220px wide, 1px right border, padding 24/16.
  - Top: app name "OmniDesk" (16px / 600).
  - Nav items (in order): **Dashboard** (`layout-dashboard`), **Cashflow** (`wallet`), **Assignments** (`clipboard-list`), **Schedule** (`calendar`), **Notes** (`sticky-note`).
  - Nav item: 10px/12px padding, radius 8, icon + label, muted color. Active item has `nav-active` background and `text` color.
  - Bottom: profile link with 32px circular avatar (`profiles.avatar`) and `profiles.username`.
- **Main area**: flexible width, vertical stack with 24px gaps.
  - Page header row: title (24px) with muted subtitle on the left, action buttons on the right (secondary first, primary last).

## 4. Screens

### Dashboard
- Header: "Good day, {username}", subtitle "Overview of money, deadlines and classes". Buttons: **Search** (secondary), **+ Quick add** (primary).
- Row of 4 stat cards: Balance (in `cashflow_settings.currency`), Income this month, Expenses this month, Subscriptions per month.
- 2×2 grid of cards:
  1. Upcoming assignments (title, course · due date, priority pill), link "View all".
  2. Today's classes (name, start – end · room, day pill), link "Schedule".
  3. Recent transactions (description, category · date, signed amount pill), link "Cashflow".
  4. Pinned notes (skeleton lines), link "Notes".

### Cashflow
- Header: title "Cashflow", subtitle "Transactions and recurring subscriptions". Right side: small currency selector (`cashflow_settings.currency`) and **+ Transaction** primary button.
- 3 stat cards: Balance, Income (this month), Expenses (this month).
- **Spending chart card**:
  - Header left: month selector, `‹ October 2026 ▾ ›` (chevron icon buttons and a month dropdown).
  - Header right: period chips **Daily | Weekly | Monthly** (Daily default).
  - Three summary figures: Total spent, Average / day, Highest day.
  - Bar chart (about 180px tall) with y-axis labels (max, ½, 0) and x-axis day numbers. Bars use `chart-bar`, the highest bar uses `accent`.
  - Data: sum of `transactions.amount` where `type` is expense, within the selected month, grouped by day, week or month.
- Below: two cards side by side (flex 2 : 1).
  - **Transactions** (wide): filter chips All / Income / Expense. Table columns: Date, Description, Category, Type (pill), Amount (right-aligned).
  - **Subscriptions**: list rows with name, category · date, amount pill. "+ Add" link in the header.

### Assignments
- Header: title "Assignments", subtitle "Track deadlines by course and priority". Right: chips (All, Priority ▾, Course ▾) and **+ New** primary button.
- **Kanban board**, 3 equal columns inside cards: **To do**, **In progress**, **Done** (these are assumed values for the free-text `status` field).
- Assignment card (darker `bg` background inside the column): title, course (muted), due date (muted, left) and priority pill (right).
- No permanent form. **+ New** opens a modal or drawer with Title, Course, Due date, Priority, Description.

### Schedule
- Header: title "Schedule", subtitle "Weekly class timetable". Right: chips **Week | Day** and **+ Add class** primary button.
- Weekly grid with **5 columns, Mon–Fri only** (no weekend). Each day is a card with its title and stacked class blocks.
- Class block: radius 8, tinted fill from `color_theme`, name (bold), start – end, room.
- No permanent details panel. **+ Add class** opens a modal with Name, Start, End, Room, Day, Color theme.

### Notes
- Header: title "Notes", subtitle "Pinned and recent notes". Right: **Search** (secondary), **+ Note** (primary).
- Two-part layout:
  - **Left folders card** (200px wide, top-aligned, shorter than the grid is fine): title "Folders", vertical list of **All notes** (active by default), folder names (`note_folders.name`), **Trash** (soft-deleted notes), and a dashed **+ Folder** item.
  - **Right**: section labels "Pinned" then "Recent", each followed by a **3-column grid of sticky-note-style cards**.
- Note card: radius 8, `surface-alt` background, 1px `border`, min-height 170, padding 16. Contains bold title (first line of content), 3 preview lines, and "Last modified" at the bottom. Pinned notes show a "Pinned" pill at the top right.
- **No per-note colors** (the schema has no color column). All cards share the same dark surface.
- Clicking a note opens it in an editor (modal or full page, not yet wireframed).

### Auth screens (Login, Sign up, Profile setup)
Shared **split layout** (no sidebar):
- **Left half**: `surface` background with right border. App name at the top; centered block with a 32px headline ("Everything you need to stay on top of student life.") and four feature rows (Cashflow, Assignments, Schedule, Notes), each with a 40px outlined icon tile, name and one-line description; footer "© OmniDesk".
- **Right half**: vertically and horizontally centered form, max width 380, gap 24.

**Login**: heading "Welcome back", fields Email and Password, "Forgot password?" link (accent, right-aligned), full-width **Sign in** button, "Create account" link.

**Sign up**: heading "Create your account", fields Username, Email, Password, Confirm password, full-width **Create account**, "Sign in" link.

**Profile setup (step 2 of 2)**: 72px circular avatar with **Upload photo** (optional), **Bio** text area, full-width **Continue to dashboard**, and a "Skip for now" link. `bio` is not nullable, so skipping should store an empty string.

## 5. Data mapping (Supabase / Postgres)

All tables are scoped by `user_id` with RLS (`auth.uid() = user_id`). Soft-deleted rows have `deleted_at` set: always filter `deleted_at IS NULL` in normal views and use `deleted_at IS NOT NULL` for Trash.

| Table | Used by | Notes |
|---|---|---|
| `profiles` (`user_id`, `username`, `bio`, `avatar`) | Sidebar profile, greeting, profile setup | `avatar` nullable |
| `assignments` (`title`, `course`, `description`, `due_date`, `priority`, `status`) | Assignments board, dashboard | `due_date` is text; `status`/`priority` free text |
| `transactions` (`type`, `amount`, `category`, `description`, `date`) | Cashflow table, chart, dashboard stats | `type` income or expense |
| `subscriptions` (`name`, `amount`, `category`, `start_date`, `last_processed`) | Subscriptions card, monthly total | |
| `schedule_classes` (`name`, `room`, `day`, `start_time`, `end_time`, `color_theme`) | Schedule grid, today's classes | `day`/times are text |
| `note_folders` (`name`) | Notes folders list | |
| `notes` (`content`, `pinned`, `folder_id`, `last_modified`) | Notes grid | `last_modified`, `created_at` are int8 (epoch) |
| `cashflow_settings` (`currency`) | Currency display everywhere money appears | |

IDs on most tables are `text` (client-generated).

## 6. Interactive behavior to implement

- Sidebar nav switches screens; the active item is highlighted.
- Cashflow chart: month selector (chevrons plus dropdown) and Daily / Weekly / Monthly toggle re-aggregate the chart and the three summary figures.
- Cashflow transaction chips filter the table by `type`.
- Assignments filters (priority, course) filter the board. Dragging cards between columns changes `status`.
- Notes: selecting a folder filters the grid; Pinned section shows `pinned = true`; Trash shows soft-deleted notes.
- "+ New / + Add / + Transaction / + Note / + Folder" open create flows (modal or drawer).

## 7. Do and don't

- Do keep every pill, chip and button the same height with centered text.
- Do use Lucide icons, DM Sans, and the token palette above.
- Do keep forms out of the main screens; use modals or drawers.
- Don't add weekend columns to the schedule, per-note colors, emoji, gradients or heavy shadows.
- Don't invent extra database fields; stay within the schema above.
- Don't add social login; auth is email and password.
