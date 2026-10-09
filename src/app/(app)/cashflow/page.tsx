import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listTransactions } from '@/lib/repositories/cashflow';
import { listSubscriptions } from '@/lib/repositories/subscriptions';
import { getSettings } from '@/lib/repositories/settings';
import { CashflowScreen } from '@/components/features/cashflow/CashflowScreen';
import { toNumber } from '@/lib/utils/money';
import { isInCurrentMonthInZone } from '@/lib/timezone';
import { getUserTimezone } from '@/lib/timezone.server';
import type { Transaction, TransactionType } from '@/types/domain';

export const metadata: Metadata = { title: 'Cashflow — Productivity Manager' };

function totalFor(rows: Transaction[], type: TransactionType): number {
  return rows.filter((t) => t.type === type).reduce((sum, t) => sum + toNumber(t.amount), 0);
}

export default async function CashflowPage() {
  const user = await requireUser();

  const [transactions, subscriptions, settings] = await Promise.all([
    listTransactions(user.id),
    listSubscriptions(user.id),
    getSettings(),
  ]);

  // "This month" is the user's calendar month (PLAN.md §13.2). The server may
  // run in UTC, so the zone comes from the `tz` cookie rather than from here.
  const timezone = await getUserTimezone();
  const monthRows = transactions.filter((t) => isInCurrentMonthInZone(t.date, timezone));

  const income = totalFor(transactions, 'income');
  const expenses = totalFor(transactions, 'expense');

  return (
    <CashflowScreen
      transactions={transactions}
      subscriptions={subscriptions}
      currency={settings.currency}
      // Balance is all-time from transactions only; subscriptions stay in their
      // own card until materialised (PLAN.md §15, decision 14).
      balance={income - expenses}
      incomeThisMonth={totalFor(monthRows, 'income')}
      expensesThisMonth={totalFor(monthRows, 'expense')}
    />
  );
}