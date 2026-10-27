'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/utils/money';
import { nextMonthStartISO, startOfMonthISO } from '@/lib/utils/date';
import {
  deleteSubscriptionAction,
  deleteTransactionAction,
  processSubscriptionsAction,
  setCurrencyAction,
  undoDeleteSubscriptionAction,
  undoDeleteTransactionAction,
} from '@/lib/actions/cashflow';
import { SpendingChart } from './SpendingChart';
import { TransactionsTable } from './TransactionsTable';
import { SubscriptionsList } from './SubscriptionsList';
import { TransactionModal } from './TransactionModal';
import { SubscriptionModal } from './SubscriptionModal';
import { CurrencySelect } from './CurrencySelect';
import s from './CashflowScreen.module.css';
import type { Subscription, Transaction } from '@/types/domain';

interface CashflowScreenProps {
  transactions: Transaction[];
  subscriptions: Subscription[];
  currency: string;
  /** server-computed so the stat cards agree with the chart */
  balance: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
}

export function CashflowScreen({
  transactions: initialTransactions,
  subscriptions: initialSubscriptions,
  currency: initialCurrency,
  balance,
  incomeThisMonth,
  expensesThisMonth,
}: CashflowScreenProps) {
  const router = useRouter();
  const { show } = useToast();

  const [currency, setCurrency] = useState(initialCurrency);
  const [anchor, setAnchor] = useState(() => new Date());
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  // The chart's selected month is client state; the table shows the same month.
  const monthTransactions = useMemo(() => {
    const from = new Date(startOfMonthISO(anchor)).getTime();
    const to = new Date(nextMonthStartISO(anchor)).getTime();

    return initialTransactions.filter((t) => {
      const ts = new Date(t.date).getTime();
      return ts >= from && ts < to;
    });
  }, [initialTransactions, anchor]);

  const allExpenses = useMemo(
    () => initialTransactions.filter((t) => t.type === 'expense'),
    [initialTransactions],
  );

  const onCurrencyChange = async (next: string) => {
    setCurrency(next);
    const result = await setCurrencyAction(next);
    if (!result.ok) {
      setCurrency(initialCurrency);
      show({ tone: 'error', message: result.message ?? 'Could not change the currency.' });
      return;
    }
    router.refresh();
  };

  const onDeleteTransaction = async (t: Transaction) => {
    const result = await deleteTransactionAction(t.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete it.' });
      return;
    }
    show({
      tone: 'success',
      message: 'Transaction deleted.',
      action: { label: 'Undo', run: () => undoDeleteTransactionAction(t.id) },
    });
    router.refresh();
  };

  const onDeleteSubscription = async (sub: Subscription) => {
    const result = await deleteSubscriptionAction(sub.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete it.' });
      return;
    }
    show({
      tone: 'success',
      message: 'Subscription deleted.',
      action: { label: 'Undo', run: () => undoDeleteSubscriptionAction(sub.id) },
    });
    router.refresh();
  };

  const onProcess = async () => {
    const result = await processSubscriptionsAction();
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not process subscriptions.' });
      return;
    }
    show({
      tone: 'success',
      message:
        result.count && result.count > 0
          ? `Added ${result.count} transaction${result.count === 1 ? '' : 's'}.`
          : 'Nothing was due this month.',
    });
    router.refresh();
  };

  const closeModals = () => {
    setModalOpen(false);
    setSubOpen(false);
    router.refresh();
  };

  return (
    <main className="page">
      <PageHeader
        title="Cashflow"
        subtitle="Transactions and recurring subscriptions"
        actions={
          <div className={s.headerControls}>
            <CurrencySelect value={currency} onChange={onCurrencyChange} />
            <Button
              variant="primary"
              onClick={() => {
                setTransaction(null);
                setModalOpen(true);
              }}
            >
              + Transaction
            </Button>
          </div>
        }
      />

      {/* Icons match the dashboard's equivalent stat cards exactly, so the same
          three figures carry the same visual identity on both screens. */}
      <div className={s.stats}>
        <StatCard
          icon={Wallet}
          label="Balance"
          value={formatMoney(balance, currency)}
        />
        <StatCard
          icon={TrendingUp}
          label="Income"
          value={formatMoney(incomeThisMonth, currency)}
          hint="this month"
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses"
          value={formatMoney(expensesThisMonth, currency)}
          hint="this month"
        />
      </div>

      <SpendingChart
        currency={currency}
        allExpenses={allExpenses}
        empty={monthTransactions.length === 0}
        anchor={anchor}
        onAnchorChange={setAnchor}
      />

      <div className="row row--2-1">
        <TransactionsTable
          transactions={monthTransactions}
          onOpen={(t) => {
            setTransaction(t);
            setModalOpen(true);
          }}
          onDelete={onDeleteTransaction}
        />

        <SubscriptionsList
          subscriptions={initialSubscriptions}
          currency={currency}
          onAdd={() => {
            setSubscription(null);
            setSubOpen(true);
          }}
          onEdit={(sub) => {
            setSubscription(sub);
            setSubOpen(true);
          }}
          onDelete={onDeleteSubscription}
          onProcess={onProcess}
        />
      </div>

      {/* Rendered only while open so a previous success cannot re-fire on reopen. */}
      {modalOpen && (
        <TransactionModal open onClose={closeModals} transaction={transaction} />
      )}

      {subOpen && (
        <SubscriptionModal open onClose={closeModals} subscription={subscription} />
      )}
    </main>
  );
}