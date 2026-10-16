import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listTransactions } from '@/lib/repositories/cashflow';
import { listSubscriptions } from '@/lib/repositories/subscriptions';
import { getSettings } from '@/lib/repositories/settings';
import { getMonthTotals } from '@/lib/repositories/stats';
import { CashflowScreen } from '@/components/features/cashflow/CashflowScreen';
import { toNumber } from '@/lib/utils/money';
import type { Transaction, TransactionType } from '@/types/domain';

export const metadata: Metadata = { title: 'Cashflow — OmniDesk' };

function totalFor(rows: Transaction[], type: TransactionType): number {
  return rows.filter((t) => t.type === type).reduce((sum, t) => sum + toNumber(t.amount), 0);
}

export default async function CashflowPage() {
  const user = await requireUser();

  // The table and the chart both re-aggregate client-side on month and period
  // change (PLAN.md §14), so the rows travel once; only the two "this month"
  // figures are summed in Postgres, since nothing on the client needs the
  // per-row breakdown for them (PLAN.md §6.5).
  const [transactions, subscriptions, settings, totals] = await Promise.all([
    listTransactions(user.id),
    listSubscriptions(user.id),
    getSettings(),
    getMonthTotals(user.id),
  ]);

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
      incomeThisMonth={totals.income}
      expensesThisMonth={totals.expenses}
    />
  );
}