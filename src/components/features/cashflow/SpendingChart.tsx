'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Chip, IconButton } from '@/components/ui/Pill';
import { Dropdown } from '@/components/ui/Dropdown';
import { BarChart } from '@/components/charts/BarChart';
import { CHART_PERIODS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMounted } from '@/hooks/useMounted';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { monthLabelInZone } from '@/lib/timezone';
import { buildSeries, stepMonth, summarize } from '@/lib/utils/date';
import { formatMoney } from '@/lib/utils/money';
import type { ChartPeriod, Transaction } from '@/types/domain';
import s from './SpendingChart.module.css';

interface SpendingChartProps {
  currency: string;
  /**
   * Every expense the user has, not just the selected month. Daily and Weekly
   * narrow it to the selected month, but Monthly needs the trailing 12 months to
   * fill its buckets (PLAN.md §15, decision 22).
   */
  allExpenses: Transaction[];
  /** True when the selected month has no spending at all. */
  empty: boolean;
  anchor: Date;
  onAnchorChange: (date: Date) => void;
}

const MONTH_OPTIONS_COUNT = 24;

export function SpendingChart({
  currency,
  allExpenses,
  empty,
  anchor,
  onAnchorChange,
}: SpendingChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>('daily');
  const mounted = useMounted();
  const timezone = useUserTimezone();

  // "This month" is the local calendar month, not the UTC one.
  const anchorKey = `${anchor.getFullYear()}-${anchor.getMonth()}`;

  const rows = useMemo(() => {
    const inAnchorMonth = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}` === anchorKey;
    };

    const relevant =
      period === 'monthly'
        ? allExpenses // the 12-month window does its own bucketing
        : allExpenses.filter((t) => inAnchorMonth(t.date));

    return relevant.map((t) => ({ date: t.date, amount: Number(t.amount) }));
  }, [allExpenses, period, anchorKey]);

  const buckets = useMemo(() => buildSeries(period, rows, anchor), [period, rows, anchor]);

  // "Total spent" is the selected month, and stays constant across periods.
  const total = useMemo(
    () =>
      rows
        .filter((r) => {
          const d = new Date(r.date);
          return `${d.getFullYear()}-${d.getMonth()}` === anchorKey;
        })
        .reduce((sum, r) => sum + r.amount, 0),
    [rows, anchorKey],
  );

  const summary = useMemo(
    () => summarize(period, buckets, total, anchor),
    [period, buckets, total, anchor],
  );

  // The month dropdown offers this month and 23 before it.
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < MONTH_OPTIONS_COUNT; i++) {
      const d = stepMonth(anchor, -i);
      options.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: monthLabelInZone(d, timezone),
      });
    }
    return options;
  }, [anchor, timezone]);

  const compact = (n: number) => formatMoney(n, currency, { compact: true });
  const precise = (n: number) => formatMoney(n, currency);

  return (
    <Card
      header={
        <>
          <div className={s.monthRow}>
            <IconButton
              icon={ChevronLeft}
              label="Previous month"
              onClick={() => onAnchorChange(stepMonth(anchor, -1))}
            />

            <Dropdown
              value={`${anchor.getFullYear()}-${anchor.getMonth()}`}
              onChange={(v) => {
                const [y, m] = v.split('-').map(Number);
                onAnchorChange(new Date(y, m, 1));
              }}
              items={monthOptions}
              width={200}
              trigger={({ ref, onClick, expanded }) => (
                <button
                  ref={ref}
                  type="button"
                  className={`chip ${s.monthChip}`}
                  aria-expanded={expanded}
                  aria-haspopup="listbox"
                  onClick={onClick}
                >
                  {mounted ? monthLabelInZone(anchor, timezone) : '—'}
                  <ChevronDown size={16} strokeWidth={2} aria-hidden />
                </button>
              )}
            />

            <IconButton
              icon={ChevronRight}
              label="Next month"
              onClick={() => onAnchorChange(stepMonth(anchor, 1))}
            />
          </div>

          <div className={s.periodChips}>
            {CHART_PERIODS.map((p) => (
              <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
                {p[0].toUpperCase() + p.slice(1)}
              </Chip>
            ))}
          </div>
        </>
      }
    >
      {!mounted ? (
        <Skeleton variant="block" height={180} />
      ) : (
      <>
      <div className={s.summary}>
        <div className={s.summaryItem}>
          <span className="t-muted">Total spent</span>
          <span className="t-stat">{precise(summary.total)}</span>
        </div>
        <div className={s.summaryItem}>
          <span className="t-muted">Average / {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}</span>
          <span className="t-stat">{precise(summary.average)}</span>
        </div>
        <div className={s.summaryItem}>
          <span className="t-muted">
            Highest {period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month'}
          </span>
          <span className={s.summaryAmount}>
            {precise(summary.highestValue)}
            {summary.highestLabel !== '—' && (
              <span className="t-muted"> ({summary.highestLabel})</span>
            )}
          </span>
        </div>
      </div>

      {empty && total === 0 ? (
        <p className="t-muted" style={{ padding: 'var(--space-6) 0' }}>
          No spending recorded in {mounted ? monthLabelInZone(anchor, timezone) : '—'}.
        </p>
      ) : (
        <BarChart data={buckets} height={180} formatValue={compact} />
      )}
      </>
      )}
    </Card>
  );
}