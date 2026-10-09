'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Plus, Receipt, StickyNote, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlobalSearch } from '@/components/shell/GlobalSearch';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { QuickAddModal, type QuickAddKind } from './QuickAddModal';
import { formatDate, normalizeDay } from '@/lib/utils/date';
import { formatAmount, formatMoney, toNumber } from '@/lib/utils/money';
import { relativeFromEpochMs } from '@/lib/utils/date';
import type {
  Assignment,
  DashboardStats,
  Note,
  ScheduleClass,
  Transaction,
} from '@/types/domain';
import s from './DashboardScreen.module.css';

interface DashboardScreenProps {
  username: string;
  stats: DashboardStats;
  transactions: Transaction[];
  assignments: Assignment[];
  classes: ScheduleClass[];
  notes: Note[];
  currency: string;
}

export function DashboardScreen({
  username,
  stats,
  transactions,
  assignments,
  classes,
  notes,
  currency,
}: DashboardScreenProps) {
  const router = useRouter();
  const [quickAdd, setQuickAdd] = useState<QuickAddKind | null>(null);

  const refresh = () => router.refresh();

  const previewLines = useMemo(
    () =>
      notes.map((note) => {
        const lines = note.content.split('\n');
        return {
          id: note.id,
          title: lines[0]?.trim() || 'Untitled note',
          body: lines.slice(1, 4),
        };
      }),
    [notes],
  );

  return (
    <main className="page">
      <PageHeader
        title={`Good day, ${username}`}
        subtitle="Overview of money, deadlines and classes"
        actions={
          <>
            <GlobalSearch />
            <Button variant="primary" iconLeft={Plus} onClick={() => setQuickAdd('chooser')}>
              + Quick add
            </Button>
          </>
        }
      />

      <div className="grid grid--4">
        <StatCard
          label={`Balance (${currency})`}
          value={formatMoney(stats.balance, currency)}
          hint="income − expenses"
        />
        <StatCard
          label="Income this month"
          value={formatMoney(stats.incomeThisMonth, currency)}
        />
        <StatCard
          label="Expenses this month"
          value={formatMoney(stats.expensesThisMonth, currency)}
        />
        <StatCard
          label="Subscriptions / month"
          value={formatMoney(stats.subscriptionsPerMonth, currency)}
          hint="from subscriptions"
        />
      </div>

      <div className={s.twoByTwo}>
        {/* 1. Upcoming assignments */}
        <Card action={{ href: '/assignments', label: 'View all' }} title="Upcoming assignments">
          {assignments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No assignments yet" />
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="rowItem">
                <span className="rowItem__text">
                  <span className="rowItem__title">{a.title}</span>
                  <span className="rowItem__meta">
                    {a.course} · {formatDate(a.due_date)}
                  </span>
                </span>
                <Pill>{a.priority ?? 'Medium'}</Pill>
              </div>
            ))
          )}
        </Card>

        {/* 2. Today's classes */}
        <Card action={{ href: '/schedule', label: 'Schedule' }} title="Today's classes">
          {classes.length === 0 ? (
            <EmptyState icon={Wallet} title="No classes today" hint="Enjoy the day off." />
          ) : (
            classes.map((c) => (
              <div key={c.id} className="rowItem">
                <span className="rowItem__text">
                  <span className="rowItem__title">{c.name}</span>
                  <span className="rowItem__meta">
                    {c.start_time} – {c.end_time}
                    {c.room ? ` · ${c.room}` : ''}
                  </span>
                </span>
                <Pill>{normalizeDay(c.day) ?? c.day}</Pill>
              </div>
            ))
          )}
        </Card>

        {/* 3. Recent transactions */}
        <Card action={{ href: '/cashflow', label: 'Cashflow' }} title="Recent transactions">
          {transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" />
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="rowItem">
                <span className="rowItem__text">
                  <span className="rowItem__title">{t.description || t.category}</span>
                  <span className="rowItem__meta">
                    {t.category} · {formatDate(t.date)}
                  </span>
                </span>
                <Pill tone={t.type === 'income' ? 'accent' : 'default'}>
                  {t.type === 'income' ? '+' : '−'} {formatAmount(toNumber(t.amount))}
                </Pill>
              </div>
            ))
          )}
        </Card>

        {/* 4. Pinned notes */}
        <Card action={{ href: '/notes', label: 'Notes' }} title="Pinned notes">
          {notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="Nothing pinned" hint="Pin a note to see it here." />
          ) : (
            notes.map((note, i) => {
              const preview = previewLines[i];
              return (
                <div key={note.id} className={s.notePreview}>
                  <span className={s.noteTitle}>{preview?.title}</span>
                  {preview?.body.length ? (
                    <span className={s.noteBody}>
                      {preview.body.map((line, j) => (
                        <span key={j} className={s.noteLine}>
                          {line}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <SkeletonLines />
                  )}
                  <span className="t-muted">
                    Last modified {relativeFromEpochMs(note.last_modified)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>

      <QuickAddModal kind={quickAdd} onKindChange={setQuickAdd} onDone={refresh} />
    </main>
  );
}