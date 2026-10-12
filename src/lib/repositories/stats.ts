import 'server-only';

import { requireContext } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { toNumber } from '@/lib/utils/money';
import { listAssignments } from '@/lib/repositories/assignments';
import { splitByCompletion } from '@/lib/utils/assignment';
import { listSubscriptions } from '@/lib/repositories/subscriptions';
import { listTodaysClasses } from '@/lib/repositories/schedule';
import { listNotes } from '@/lib/repositories/notes';
import { getSettings } from '@/lib/repositories/settings';
import { startOfMonthInZone, startOfNextMonthInZone } from '@/lib/timezone';
import { getUserTimezone } from '@/lib/timezone.server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type {
  Assignment,
  DashboardStats,
  Note,
  ScheduleClass,
  Transaction,
} from '@/types/domain';

/**
 * Aggregations run in PostgREST filters where possible rather than shipping
 * every row to the browser; only the small slices the dashboard renders come
 * back (PLAN.md §6.5).
 */
export async function getDashboardStats(userId: string, now = new Date()): Promise<DashboardStats> {
  const { supabase } = await requireContext();

  // "This month" is the user's calendar month, not the server's: a UTC server
  // would otherwise disagree with the user's browser about where the month
  // starts, which matters on the 1st and across year boundaries. The upper
  // bound is exclusive, otherwise a transaction dated in a future month would
  // be counted as "this month" forever.
  const timezone = await getUserTimezone();
  const month = await monthTotalsQuery(
    supabase,
    userId,
    startOfMonthInZone(now, timezone).toISOString(),
    startOfNextMonthInZone(now, timezone).toISOString(),
  );

  const [allTime, subs] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .is('deleted_at', null),
    listSubscriptions(userId),
  ]);

  const allRows = allTime.data ?? [];
  const monthRows = month.data ?? [];

  return {
    balance: sumByType(allRows, 'income') - sumByType(allRows, 'expense'),
    incomeThisMonth: sumByType(monthRows, 'income'),
    expensesThisMonth: sumByType(monthRows, 'expense'),
    subscriptionsPerMonth: subs.reduce((total, s) => total + s.amount, 0),
  };
}

/** Income and expenses inside a half-open window. */
export interface MonthTotals {
  income: number;
  expenses: number;
}

/**
 * The two "this month" figures the Cashflow stat cards show, aggregated in
 * Postgres rather than by shipping the whole table to the browser.
 */
export async function getMonthTotals(userId: string, now = new Date()): Promise<MonthTotals> {
  const { supabase } = await requireContext();
  const timezone = await getUserTimezone();

  const { data, error } = await monthTotalsQuery(
    supabase,
    userId,
    startOfMonthInZone(now, timezone).toISOString(),
    startOfNextMonthInZone(now, timezone).toISOString(),
  );
  if (error) throw new RepositoryError('stats.monthTotals', error);

  const rows = data ?? [];
  return { income: sumByType(rows, 'income'), expenses: sumByType(rows, 'expense') };
}

/**
 * `date >= from AND date < to`. `to` is exclusive on purpose: a transaction on
 * the 1st must land in exactly one month, never both (PLAN.md §6.5).
 */
function monthTotalsQuery(
  supabase: SupabaseClient<Database>,
  userId: string,
  from: string,
  to: string,
) {
  return supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', from)
    .lt('date', to);
}

function sumByType(rows: { type: string; amount: number }[], type: string): number {
  return rows
    .filter((r) => r.type === type)
    .reduce<number>((total, r) => total + toNumber(r.amount), 0);
}

/** The recent-transactions card: a few rows, newest first. */
export async function getRecentTransactions(userId: string, limit = 3): Promise<Transaction[]> {
  const { supabase } = await requireContext();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) throw new RepositoryError('stats.recentTransactions', error);

  // transactions.type is free text; the schema constrains it to the two values
  // this app writes, so anything else is read as an expense.
  return (data ?? []).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
    type: row.type === 'income' ? ('income' as const) : ('expense' as const),
  }));
}

/**
 * The assignments card: the next few *unfinished* assignments, plus the total
 * count the card uses to tell "nothing to do" from "all finished".
 *
 * The Done filter lives here rather than in `listAssignments` because the
 * Assignments page needs finished rows too — they are its third kanban column.
 * Filtering at the repository's only caller would empty that column.
 */
export async function getDashboardAssignments(
  userId: string,
  limit = 3,
): Promise<{ upcoming: Assignment[]; total: number }> {
  const all = await listAssignments(userId);
  return splitByCompletion(all, limit);
}

/** Empty on the weekend, which is correct: the timetable is Mon–Fri only. */
export async function getTodaysClasses(userId: string): Promise<ScheduleClass[]> {
  return listTodaysClasses(userId);
}

/** Pinned notes for the dashboard card; preview lines are rendered client-side. */
export async function getPinnedNotes(userId: string, limit = 4): Promise<Note[]> {
  const notes = await listNotes(userId, { pinned: true });
  return notes.slice(0, limit);
}

/** Everything the dashboard needs, fetched concurrently. */
export async function getDashboardData(userId: string) {
  const [stats, transactions, assignments, classes, notes, settings] = await Promise.all([
    getDashboardStats(userId),
    getRecentTransactions(userId, 2),
    getDashboardAssignments(userId, 3),
    getTodaysClasses(userId),
    getPinnedNotes(userId, 4),
    getSettings(),
  ]);

  return {
    stats,
    transactions,
    assignments: assignments.upcoming,
    assignmentTotal: assignments.total,
    classes,
    notes,
    settings,
  };
}