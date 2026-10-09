import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listTransactions } from '@/lib/repositories/cashflow';
import { listSubscriptions } from '@/lib/repositories/subscriptions';
import { getSettings } from '@/lib/repositories/settings';
import { CashflowScreen } from '@/components/features/cashflow/CashflowScreen';
import { toNumber } from '@/lib/utils/money';
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

  // "This month" is the user's local calendar month (PLAN.md §13.2).
  const now = new Date();
  const inThisMonth = (iso: string) => {
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const monthRows = transactions.filter((t) => inThisMonth(t.date));

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