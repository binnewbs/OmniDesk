import { describe, expect, it } from 'vitest';
import {
  buildSeries,
  currentWeekday,
  daysInMonth,
  daysElapsedInMonth,
  formatDate,
  groupByDay,
  groupByMonth,
  groupByWeek,
  highlightMax,
  normalizeDay,
  parseDateSafe,
  relativeFromEpochMs,
  summarize,
} from './date';

const rows = (entries: [string, number][]) =>
  entries.map(([date, amount]) => ({ date: new Date(date).toISOString(), amount }));

describe('normalizeDay', () => {
  it('canonicalises the free-text day column', () => {
    expect(normalizeDay('Mon')).toBe('Mon');
    expect(normalizeDay('monday')).toBe('Mon');
    expect(normalizeDay('  MONDAY  ')).toBe('Mon');
    expect(normalizeDay('Wednesday')).toBe('Wed');
  });

  it('returns null for weekends, which have no column', () => {
    expect(normalizeDay('Sat')).toBeNull();
    expect(normalizeDay('Sunday')).toBeNull();
  });

  it('returns null for unparseable or missing values', () => {
    expect(normalizeDay('')).toBeNull();
    expect(normalizeDay(null)).toBeNull();
    expect(normalizeDay('nonsense')).toBeNull();
  });
});

describe('currentWeekday', () => {
  it('returns a Mon–Fri weekday or null at the weekend', () => {
    const value = currentWeekday();
    expect(value === null || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(value)).toBe(true);
  });
});

describe('parseDateSafe / formatDate', () => {
  it('renders an em dash for the free-text due_date column', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not a date')).toBe('—');
    expect(parseDateSafe('nonsense')).toBeNull();
  });

  it('formats a real ISO date', () => {
    expect(formatDate('2026-10-09')).toBe('9 Oct 2026');
  });
});

describe('groupByDay', () => {
  const anchor = new Date(2026, 9, 1); // October 2026

  it('emits one bucket per day, so the x-axis never shifts', () => {
    const buckets = groupByDay(rows([['2026-10-05', 20]]), anchor);
    expect(buckets).toHaveLength(31);
    expect(buckets[4].value).toBe(20);
  });

  it('leaves spending days at zero rather than omitting them', () => {
    const buckets = groupByDay([], anchor);
    expect(buckets.every((b) => b.value === 0)).toBe(true);
  });

  it('labels the days the reference shows: 1, 8, 15, 22, 29', () => {
    const buckets = groupByDay([], anchor);
    expect(buckets.filter((b) => b.showLabel).map((b) => b.label)).toEqual([
      '1',
      '8',
      '15',
      '22',
      '29',
    ]);
  });

  it('handles a 28-day February', () => {
    const buckets = groupByDay([], new Date(2026, 1, 1));
    expect(buckets).toHaveLength(28);
  });
});

describe('groupByWeek', () => {
  const anchor = new Date(2026, 9, 1);

  it('produces at most six ISO weeks', () => {
    const buckets = groupByWeek(rows([['2026-10-05', 50]]), anchor);
    expect(buckets.length).toBeLessThanOrEqual(6);
    expect(buckets.length).toBeGreaterThanOrEqual(4);
  });

  it('places a transaction in the week that contains it', () => {
    const total = groupByWeek(rows([['2026-10-05', 50]]), anchor).reduce((s, b) => s + b.value, 0);
    expect(total).toBe(50);
  });

  it('labels every bucket, since there are only a handful', () => {
    expect(groupByWeek([], anchor).every((b) => b.showLabel)).toBe(true);
  });
});

describe('groupByMonth', () => {
  it('is a trailing 12-month window ending at the selected month', () => {
    const buckets = groupByMonth(rows([['2026-08-15', 70]]), new Date(2026, 9, 1));
    expect(buckets).toHaveLength(12);
    expect(buckets.at(-1)?.label).toBe('Oct');
    expect(buckets.reduce((s, b) => s + b.value, 0)).toBe(70);
  });

  it('excludes months before the window', () => {
    const buckets = groupByMonth(rows([['2024-01-15', 999]]), new Date(2026, 9, 1));
    expect(buckets.reduce((s, b) => s + b.value, 0)).toBe(0);
  });
});

describe('highlightMax', () => {
  it('marks exactly one bar', () => {
    const marked = highlightMax([
      { label: '1', value: 5 },
      { label: '2', value: 10 },
      { label: '3', value: 5 },
    ]);
    expect(marked.filter((b) => b.highlight)).toHaveLength(1);
    expect(marked[1].highlight).toBe(true);
  });

  it('breaks a tie on the first bucket', () => {
    const marked = highlightMax([
      { label: 'a', value: 5 },
      { label: 'b', value: 5 },
    ]);
    expect(marked[0].highlight).toBe(true);
    expect(marked[1].highlight).toBe(false);
  });

  it('highlights nothing when there is no spending', () => {
    const marked = highlightMax([
      { label: 'a', value: 0 },
      { label: 'b', value: 0 },
    ]);
    expect(marked.every((b) => !b.highlight)).toBe(true);
  });
});

describe('buildSeries', () => {
  it('dispatches on the period', () => {
    const anchor = new Date(2026, 9, 1);
    expect(buildSeries('daily', [], anchor)).toHaveLength(31);
    expect(buildSeries('monthly', [], anchor)).toHaveLength(12);
    expect(buildSeries('weekly', [], anchor).length).toBeGreaterThan(0);
  });
});

describe('summarize', () => {
  const anchor = new Date(2026, 9, 1); // October 2026
  const buckets = [
    { label: '1', value: 10 },
    { label: '2', value: 30 },
    { label: '3', value: 20 },
  ];

  it('keeps the total constant across periods', () => {
    expect(summarize('daily', buckets, 60, anchor).total).toBe(60);
    expect(summarize('weekly', buckets, 60, anchor).total).toBe(60);
    expect(summarize('monthly', buckets, 60, anchor).total).toBe(60);
  });

  it('divides monthly by twelve', () => {
    expect(summarize('monthly', buckets, 120, anchor).average).toBe(10);
  });

  it('reports the highest bucket', () => {
    const summary = summarize('daily', buckets, 60, anchor);
    expect(summary.highestLabel).toBe('2');
    expect(summary.highestValue).toBe(30);
  });

  it('shows an em dash rather than a label when nothing was spent', () => {
    const summary = summarize('daily', [{ label: '1', value: 0 }], 0, anchor);
    expect(summary.highestLabel).toBe('—');
  });
});

describe('daysElapsedInMonth / daysInMonth', () => {
  it('divides the current month by the days elapsed, not the days in it', () => {
    const now = new Date();
    expect(daysElapsedInMonth(now)).toBe(now.getDate());
  });

  it('divides a month that is not the current one by its full length', () => {
    // Deliberately far from today, so this does not depend on the run date.
    expect(daysElapsedInMonth(new Date(2020, 9, 1))).toBe(31);
    expect(daysElapsedInMonth(new Date(2020, 1, 1))).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
  });
});

describe('relativeFromEpochMs', () => {
  it('formats the int8 notes timestamps', () => {
    expect(relativeFromEpochMs(Date.now())).toBe('Today');
    expect(relativeFromEpochMs(Date.now() - 86_400_000)).toBe('Yesterday');
    expect(relativeFromEpochMs(null)).toBe('—');
  });
});