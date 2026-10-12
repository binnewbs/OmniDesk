'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ClipboardList, Receipt, Repeat, StickyNote, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlobalSearch } from '@/components/shell/GlobalSearch';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuickAddModal, type QuickAddKind } from './QuickAddModal';
import { formatCalendarDate, normalizeDay } from '@/lib/utils/date';
import { classTheme } from '@/lib/utils/schedule';
import { normalizeStatus, priorityTone } from '@/lib/utils/assignment';
import { formatAmount, formatMoney, toNumber } from '@/lib/utils/money';
import { relativeInZone } from '@/lib/timezone';
import { useUserTimezone } from '@/hooks/useUserTimezone';
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
  /** Already filtered to the unfinished ones; Done is not included. */
  assignments: Assignment[];
  /**
   * Every non-deleted assignment, finished ones included. Only used to choose
   * between the card's two empty states, which look identical otherwise.
   */
  assignmentTotal: number;
  classes: ScheduleClass[];
  notes: Note[];
  currency: string;
}

export function DashboardScreen({
  username,
  stats,
  transactions,
  assignments,
  assignmentTotal,
  classes,
  notes,
  currency,
}: DashboardScreenProps) {
  const router = useRouter();
  const timezone = useUserTimezone();
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
            <Button variant="primary" onClick={() => setQuickAdd('chooser')}>
              + Quick add
            </Button>
          </>
        }
      />

      <div className="grid grid--4">
        <StatCard
          icon={Wallet}
          label={`Balance (${currency})`}
          value={formatMoney(stats.balance, currency)}
          hint="income − expenses"
        />
        <StatCard
          icon={TrendingUp}
          label="Income this month"
          value={formatMoney(stats.incomeThisMonth, currency)}
        />
        <StatCard
          icon={TrendingDown}
          label="Expenses this month"
          value={formatMoney(stats.expensesThisMonth, currency)}
        />
        <StatCard
          icon={Repeat}
          label="Subscriptions / month"
          value={formatMoney(stats.subscriptionsPerMonth, currency)}
          hint="from subscriptions"
        />
      </div>

      <div className={s.twoByTwo}>
        {/* 1. Upcoming assignments */}
        <Card
          icon={ClipboardList}
          action={{ href: '/assignments', label: 'View all' }}
          title="Upcoming assignments"
        >
          {assignments.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={assignmentTotal === 0 ? 'No assignments yet' : 'All assignments done'}
              hint={
                assignmentTotal === 0
                  ? undefined
                  : `Nothing left — all ${assignmentTotal} finished.`
              }
            />
          ) : (
            assignments.map((a) => {
              const status = normalizeStatus(a.status);
              return (
                <div key={a.id} className="rowItem">
                  <span className="rowItem__text">
                    <span className="rowItem__title">{a.title}</span>
                    <span className="rowItem__meta">
                      {a.course} · {formatCalendarDate(a.due_date)}
                    </span>
                  </span>
                  <span className={s.rowPills}>
                    <Pill tone="default">{status}</Pill>
                    <Pill tone={priorityTone(a.priority)}>{a.priority ?? 'Medium'}</Pill>
                  </span>
                </div>
              );
            })
          )}
        </Card>

        {/* 2. Today's classes */}
        <Card icon={Calendar} action={{ href: '/schedule', label: 'Schedule' }} title="Today's classes">
          {classes.length === 0 ? (
            <EmptyState icon={Calendar} title="No classes today" hint="Enjoy the day off." />
          ) : (
            classes.map((c) => (
              <div key={c.id} className={`${s.classBlock} ${classTheme(c.color_theme)}`}>
                <span className={s.classBlockTop}>
                  <span className={s.classBlockName}>{c.name}</span>
                  <Pill>{normalizeDay(c.day) ?? c.day}</Pill>
                </span>
                <span className={s.classBlockMeta}>
                  {c.start_time} – {c.end_time}
                  {c.room ? ` · ${c.room}` : ''}
                </span>
              </div>
            ))
          )}
        </Card>

        {/* 3. Recent transactions */}
        <Card icon={Receipt} action={{ href: '/cashflow', label: 'Cashflow' }} title="Recent transactions">
          {transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions yet" />
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="rowItem">
                <span className="rowItem__text">
                  <span className="rowItem__title">{t.description || t.category}</span>
                  <span className="rowItem__meta">
                    {t.category} · {formatCalendarDate(t.date)}
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
        <Card icon={StickyNote} action={{ href: '/notes', label: 'Notes' }} title="Pinned notes">
          {notes.length === 0 ? (
            <EmptyState icon={StickyNote} title="Nothing pinned" hint="Pin a note to see it here." />
          ) : (
            notes.map((note, i) => {
              const preview = previewLines[i];
              return (
                <div key={note.id} className={s.notePreview}>
                  <span className={s.noteTitle}>{preview?.title}</span>

                  {/* Body lines are real text. A note that is only a title has
                      none, and showing skeleton bars for it made every
                      dashboard look permanently loading. */}
                  {preview && preview.body.length > 0 && (
                    <span className={s.noteBody}>
                      {preview.body.map((line, j) => (
                        <span key={j} className={s.noteLine}>
                          {line}
                        </span>
                      ))}
                    </span>
                  )}

                  <span className="t-muted">
                    Last modified {relativeInZone(note.last_modified, timezone)}
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