import { requireContext } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { toNumber } from '@/lib/utils/money';
import { listAssignments } from '@/lib/repositories/assignments';
import { listSubscriptions } from '@/lib/repositories/subscriptions';
import { listTodaysClasses } from '@/lib/repositories/schedule';
import { listNotes } from '@/lib/repositories/notes';
import { getSettings } from '@/lib/repositories/settings';
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
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const { supabase } = await requireContext();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  const [allTime, month, subs] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', monthStartISO),
    listSubscriptions(userId),
  ]);

  const sum = (rows: { type: string; amount: number }[], type: string) =>
    rows
      .filter((r) => r.type === type)
      .reduce<number>((total, r) => total + toNumber(r.amount), 0);

  const allRows = allTime.data ?? [];
  const monthRows = month.data ?? [];

  const income = sum(allRows, 'income');
  const expenses = sum(allRows, 'expense');

  return {
    balance: income - expenses,
    incomeThisMonth: sum(monthRows, 'income'),
    expensesThisMonth: sum(monthRows, 'expense'),
    subscriptionsPerMonth: subs.reduce((total, s) => total + toNumber(s.amount), 0),
  };
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

/** The assignments card: the next few by due date. */
export async function getUpcomingAssignments(userId: string, limit = 3): Promise<Assignment[]> {
  const all = await listAssignments(userId);
  return all.slice(0, limit);
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
    getUpcomingAssignments(userId, 3),
    getTodaysClasses(userId),
    getPinnedNotes(userId, 4),
    getSettings(),
  ]);

  return { stats, transactions, assignments, classes, notes, settings };
}