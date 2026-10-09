import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { WEEKDAYS } from '@/lib/constants';
import type { ChartBucket, ChartPeriod, Weekday } from '@/types/domain';

/**
 * Timezone rule (PLAN.md §13.2): timestamps are stored as UTC ISO strings, but
 * "this month" and "today" are computed in the local calendar, so the dashboard
 * is correct for users east and west of UTC on the first of a month.
 * These bounds are therefore local midnight, serialised to UTC.
 */
export function monthBounds(date: Date): { start: string; end: string } {
  return {
    start: startOfMonth(date).toISOString(),
    end: endOfMonth(date).toISOString(),
  };
}

/** First instant of the month *after* `date`, as a UTC ISO string. */
export function nextMonthStartISO(date: Date): string {
  return startOfMonth(new Date(date.getFullYear(), date.getMonth() + 1, 1)).toISOString();
}

export function startOfMonthISO(date: Date): string {
  return startOfMonth(date).toISOString();
}

/**
 * `month` is 0-indexed, matching the Date constructor. Day 0 of month + 1 is
 * the last day of `month`, so "October" (9) is new Date(year, 10, 0).
 */
export function daysInMonth(year: number, month: number): number {
  return endOfMonth(new Date(year, month + 1, 0)).getDate();
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return isSameDay(a, b);
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** Parses defensively: due_date is free text, so it may not be a real date. */
export function parseDateSafe(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

/** Renders an em dash when the value is missing or unparseable. */
export function formatDate(
  iso: string | null | undefined,
  style: 'short' | 'long' | 'relative' | 'day' = 'short',
): string {
  const d = parseDateSafe(iso);
  if (!d) return '—';

  switch (style) {
    case 'long':
      return format(d, 'd MMMM yyyy');
    case 'day':
      return format(d, 'd');
    case 'relative': {
      // Positive = in the future, negative = in the past.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfThat = new Date(d);
      startOfThat.setHours(0, 0, 0, 0);

      const days = Math.round((startOfThat.getTime() - startOfToday.getTime()) / 86_400_000);

      if (days === 0) return 'Today';
      if (days === 1) return 'Tomorrow';
      if (days === -1) return 'Yesterday';
      if (days > 0) return `In ${days} days`;
      return `${Math.abs(days)} days ago`;
    }
    default:
      return format(d, 'd MMM yyyy');
  }
}

/** notes.last_modified / notes.created_at are epoch milliseconds. */
export function relativeFromEpochMs(ms: number | null | undefined): string {
  if (!ms) return '—';
  return formatDate(new Date(ms).toISOString(), 'relative');
}

/* -------------------------------------------------------------------------- */
/* Weekdays                                                                   */
/* -------------------------------------------------------------------------- */

const SUNDAY_INDEXED = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * `schedule_classes.day` is free text, so normalise defensively: a value like
 * "Monday", "monday " or "MONDAY" all resolve to 'Mon'.
 * Weekend values have no column to render into, so they return null.
 */
export function normalizeDay(raw: string | null | undefined): Weekday | null {
  if (!raw) return null;
  const short = raw.trim().slice(0, 3).toLowerCase();
  const idx = SUNDAY_INDEXED.findIndex((d) => d.toLowerCase() === short);
  if (idx < 0) return null;
  const day = WEEKDAYS.find((d) => d === SUNDAY_INDEXED[idx]);
  return day ?? null;
}

export function currentWeekday(): Weekday | null {
  const today = SUNDAY_INDEXED[new Date().getDay()];
  return WEEKDAYS.find((d) => d === today) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Chart series builders                                                      */
/* -------------------------------------------------------------------------- */

type SpendingRow = { date: string; amount: number };

function sum(rows: SpendingRow[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

/** Daily buckets: one per day of the selected month, days without spending stay at 0. */
export function groupByDay(rows: SpendingRow[], anchor: Date): ChartBucket[] {
  const days = eachDayOfInterval({
    start: startOfMonth(anchor),
    end: endOfMonth(anchor),
  });

  return days.map((day) => {
    const dayRows = rows.filter((r) => isSameDay(new Date(r.date), day));
    return {
      label: String(day.getDate()),
      fullLabel: format(day, 'd MMMM yyyy'),
      value: sum(dayRows),
      // The reference labels 1, 8, 15, 22, 29 — every 7th day
      showLabel: day.getDate() === 1 || day.getDate() % 7 === 1,
    };
  });
}

/** Weekly buckets: ISO weeks (Mon–Sun) that overlap the selected month, up to 6. */
export function groupByWeek(rows: SpendingRow[], anchor: Date): ChartBucket[] {
  const from = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const to = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });

  const buckets: { start: Date; end: Date }[] = [];
  const cursor = new Date(from);
  while (cursor <= to && buckets.length < 6) {
    // A copy, not a reference: `cursor` is mutated at the end of each pass, and
    // storing it directly would make every bucket point at the same date.
    const start = new Date(cursor);
    buckets.push({ start, end: endOfWeek(start, { weekStartsOn: 1 }) });
    cursor.setDate(cursor.getDate() + 7);
  }

  return buckets.map((b, i) => ({
    label: `W${i + 1}`,
    fullLabel: `${format(b.start, 'd MMM')} – ${format(b.end, 'd MMM yyyy')}`,
    value: sum(
      rows.filter((r) => {
        const d = new Date(r.date);
        return d >= b.start && d <= b.end;
      }),
    ),
    showLabel: true,
  }));
}

/**
 * Monthly buckets: a trailing 12-month window ending at the selected month.
 * The selected month is always the last bucket, so the chevrons shift the
 * window (PLAN.md §15, decision 22).
 */
export function groupByMonth(rows: SpendingRow[], anchor: Date): ChartBucket[] {
  const end = startOfMonth(anchor);
  const months: ChartBucket[] = [];

  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const mEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 1);
    const value = sum(rows.filter((r) => {
      const d = new Date(r.date);
      return d >= mStart && d < mEnd;
    }));
    months.push({
      label: format(mStart, 'MMM'),
      fullLabel: format(mStart, 'MMMM yyyy'),
      value,
      showLabel: true,
    });
  }

  return months;
}

export function buildSeries(
  period: ChartPeriod,
  rows: SpendingRow[],
  anchor: Date,
): ChartBucket[] {
  const buckets =
    period === 'daily'
      ? groupByDay(rows, anchor)
      : period === 'weekly'
        ? groupByWeek(rows, anchor)
        : groupByMonth(rows, anchor);

  return highlightMax(buckets);
}

/** Exactly one bar gets the accent fill; ties resolve to the first bucket. */
export function highlightMax(buckets: ChartBucket[]): ChartBucket[] {
  const max = buckets.reduce((m, b) => (b.value > m ? b.value : m), 0);
  if (max <= 0) return buckets.map((b) => ({ ...b, highlight: false }));

  let claimed = false;
  return buckets.map((b) => {
    if (b.value === max && !claimed) {
      claimed = true;
      return { ...b, highlight: true };
    }
    return { ...b, highlight: false };
  });
}

export interface ChartSummary {
  total: number;
  average: number;
  /** Label of the biggest bucket, e.g. "17" or "W3". */
  highestLabel: string;
  highestValue: number;
  /** Days elapsed in the month, so "Average / day" is not divided by 31 mid-month. */
  divisor: number;
}

/**
 * "Total spent" is constant across periods. The average divides by days
 * elapsed for Daily, by bucket count for Weekly, and by 12 for Monthly.
 */
export function summarize(
  period: ChartPeriod,
  buckets: ChartBucket[],
  total: number,
  anchor?: Date,
): ChartSummary {
  const highest = buckets.reduce<ChartBucket | null>(
    (m, b) => (m === null || b.value > m.value ? b : m),
    null,
  );

  // Daily divides by days elapsed in the month; the other periods divide by
  // their bucket count (12 for the trailing monthly window).
  const divisor =
    period === 'daily' && anchor
      ? daysElapsedInMonth(anchor)
      : Math.max(1, period === 'monthly' ? 12 : buckets.length);

  return {
    total,
    average: total / divisor,
    highestLabel: highest && highest.value > 0 ? highest.label : '—',
    highestValue: highest ? highest.value : 0,
    divisor,
  };
}

/** For the Daily period, average over days elapsed rather than days in month. */
export function daysElapsedInMonth(anchor: Date): number {
  const now = new Date();
  const sameMonth =
    now.getFullYear() === anchor.getFullYear() && now.getMonth() === anchor.getMonth();
  return sameMonth ? now.getDate() : daysInMonth(anchor.getFullYear(), anchor.getMonth());
}

export function formatMonthLabel(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function stepMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}