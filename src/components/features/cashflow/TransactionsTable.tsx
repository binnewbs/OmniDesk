'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Receipt, Trash2 } from 'lucide-react';
import { Card, CardHeading } from '@/components/ui/Card';
import { Chip, Pill } from '@/components/ui/Pill';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCalendarDate } from '@/lib/utils/date';
import { formatAmount, toNumber } from '@/lib/utils/money';
import type { Transaction, TransactionType } from '@/types/domain';
import s from './TransactionsTable.module.css';

type Filter = 'all' | TransactionType;
type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

/** The desktop table sorts from its headers; on phones those headers are hidden,
    so the same four states live in one compact menu instead. */
const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
];

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
  const [page, setPage] = useState(1);
  // Desktop first so the server and client agree, then the real value lands
  // once the viewport can be measured.
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => {
      setPageSize(mq.matches ? 5 : 10);
      setPage(1);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'amount') return (toNumber(a.amount) - toNumber(b.amount)) * dir;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });
  }, [transactions, filter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  // Clamp instead of syncing state: deleting the last row of the final page
  // must not leave the table pointing at a page that no longer exists.
  const current = Math.min(page, pageCount);
  const paged = visible.slice((current - 1) * pageSize, current * pageSize);

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setPage(1);
  };

  const toggleSort = (key: SortKey) => {
    setPage(1);
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const setSort = (value: string) => {
    const [key, dir] = value.split(':') as [SortKey, SortDir];
    setSortKey(key);
    setSortDir(dir);
    setPage(1);
  };

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <Card
      header={
        <>
          {/* Same icon the dashboard's "Recent transactions" card uses, so the
              two screens read as the same subject. */}
          <CardHeading icon={Receipt} title="Transactions" />
          <div className={s.filters}>
            <Chip active={filter === 'all'} onClick={() => changeFilter('all')}>
              All
            </Chip>
            <Chip active={filter === 'income'} onClick={() => changeFilter('income')}>
              Income
            </Chip>
            <Chip active={filter === 'expense'} onClick={() => changeFilter('expense')}>
              Expense
            </Chip>

            <div className={s.mobileSort}>
              <Dropdown
                value={`${sortKey}:${sortDir}`}
                onChange={setSort}
                align="end"
                width={180}
                items={SORT_OPTIONS}
                trigger={(props) => (
                  <button {...props} type="button" className="chip">
                    Sort
                    <ChevronDown size={16} strokeWidth={2} aria-hidden />
                  </button>
                )}
              />
            </div>
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
        <>
          <table className={`table ${s.table}`}>
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
              {paged.map((t) => {
                const amount = toNumber(t.amount);
                return (
                  <tr
                    key={t.id}
                    className="table__row"
                    onClick={(e) => {
                      // On phones the whole card is the edit target. The date
                      // button stays the accessible control; delete keeps its
                      // own click.
                      if (!window.matchMedia('(max-width: 768px)').matches) return;
                      if ((e.target as HTMLElement).closest('button')) return;
                      onOpen(t);
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        className={s.open}
                        onClick={() => onOpen(t)}
                        aria-label={`Edit ${t.description || t.category}`}
                      >
                        {formatCalendarDate(t.date)}
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

          {pageCount > 1 && (
            <nav className={s.pagination} aria-label="Transactions pages">
              <Chip onClick={() => setPage(current - 1)} disabled={current === 1}>
                Previous
              </Chip>
              <span className={s.pageLabel}>
                Page {current} of {pageCount}
              </span>
              <Chip
                onClick={() => setPage(current + 1)}
                disabled={current === pageCount}
              >
                Next
              </Chip>
            </nav>
          )}
        </>
      )}
    </Card>
  );
}