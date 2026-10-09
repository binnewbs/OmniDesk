'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Receipt, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Chip, Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils/date';
import { formatAmount, toNumber } from '@/lib/utils/money';
import type { Transaction, TransactionType } from '@/types/domain';
import s from './TransactionsTable.module.css';

type Filter = 'all' | TransactionType;
type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

interface TransactionsTableProps {
  transactions: Transaction[];
  onOpen: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionsTable({
  transactions,
  onOpen,
  onDelete,
}: TransactionsTableProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'amount') return (toNumber(a.amount) - toNumber(b.amount)) * dir;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });
  }, [transactions, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <Card
      header={
        <>
          <h2 className="card__title">Transactions</h2>
          <div className={s.filters}>
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </Chip>
            <Chip active={filter === 'income'} onClick={() => setFilter('income')}>
              Income
            </Chip>
            <Chip active={filter === 'expense'} onClick={() => setFilter('expense')}>
              Expense
            </Chip>
          </div>
        </>
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === 'all' ? 'No transactions yet' : `No ${filter} transactions`}
          hint={filter === 'all' ? 'Add your first one with + Transaction.' : undefined}
        />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>
                <button type="button" className="table__sort" onClick={() => toggleSort('date')}>
                  Date
                  {sortKey === 'date' && <SortIcon size={14} strokeWidth={2} aria-hidden />}
                </button>
              </th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th className="is-numeric">
                <button type="button" className="table__sort" onClick={() => toggleSort('amount')}>
                  Amount
                  {sortKey === 'amount' && <SortIcon size={14} strokeWidth={2} aria-hidden />}
                </button>
              </th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => {
              const amount = toNumber(t.amount);
              return (
                <tr key={t.id} className="table__row">
                  <td>
                    <button
                      type="button"
                      className={s.open}
                      onClick={() => onOpen(t)}
                      aria-label={`Edit ${t.description || t.category}`}
                    >
                      {formatDate(t.date)}
                    </button>
                  </td>
                  <td className={s.description}>{t.description || '—'}</td>
                  <td className="t-muted">{t.category}</td>
                  <td>
                    <Pill tone={t.type === 'income' ? 'accent' : 'default'}>{t.type}</Pill>
                  </td>
                  <td className="is-numeric">
                    {t.type === 'income' ? '+' : '−'}
                    {formatAmount(amount)}
                  </td>
                  <td>
                    <div className="table__actions">
                      <button
                        type="button"
                        className="icon-btn icon-btn--plain"
                        onClick={() => onDelete(t)}
                        aria-label={`Delete ${t.description || t.category}`}
                      >
                        <Trash2 size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}