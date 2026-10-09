/**
 * Domain types mirroring Database/scheme.md.
 *
 * Two column types do not match the ISO-string convention and are easy to mix
 * up, so they are called out here:
 *   - notes.created_at / notes.last_modified / note_folders.created_at are
 *     int8 epoch MILLISECONDS (number)
 *   - everything else that is a timestamp is timestamptz (ISO string)
 */

export interface Profile {
  user_id: string;
  username: string | null;
  bio: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  course: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  /** epoch ms */
  created_at: number;
  updated_at: string;
  deleted_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  /** epoch ms */
  last_modified: number;
  pinned: boolean;
  folder_id: string | null;
  /** epoch ms */
  created_at: number;
  updated_at: string;
  deleted_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  /** PostgREST returns numeric as a string; parse with toNumber() at the boundary. */
  amount: number | string;
  category: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number | string;
  category: string;
  start_date: string | null;
  last_processed: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ScheduleClass {
  id: string;
  user_id: string;
  name: string;
  room: string;
  day: string;
  start_time: string;
  end_time: string;
  color_theme: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CashflowSettings {
  user_id: string;
  currency: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense';
export type AssignmentStatus = 'To do' | 'In progress' | 'Done';
export type AssignmentPriority = 'High' | 'Medium' | 'Low';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export type ChartPeriod = 'daily' | 'weekly' | 'monthly';

/** One bucket of the spending chart. */
export interface ChartBucket {
  label: string;
  value: number;
  /** Set on the single highest bar so CSS can highlight it. */
  highlight?: boolean;
  /** Full label used for the bar's <title> tooltip. */
  fullLabel?: string;
  /** Whether to print the x-axis label under this bar. */
  showLabel?: boolean;
}

export interface DashboardStats {
  balance: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  subscriptionsPerMonth: number;
}