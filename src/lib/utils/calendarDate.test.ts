import { describe, expect, it } from 'vitest';
import { formatCalendarDate, toCalendarInput } from './date';

/**
 * These values are calendar dates, not instants. A transaction picked as the
 * 5th is stored as `2026-10-05T00:00:00Z`, which is *still the 4th* anywhere
 * west of UTC — so formatting it through `new Date()` shifted the label back a
 * day for those users. `formatCalendarDate` reads the stored components and is
 * immune to the host timezone.
 */

const ORIGINAL_TZ = process.env.TZ;

function inTimezone(tz: string, run: () => void) {
  process.env.TZ = tz;
  try {
    run();
  } finally {
    process.env.TZ = ORIGINAL_TZ;
  }
}

describe('formatCalendarDate', () => {
  it('formats the stored day, not the host timezone’s day', () => {
    // UTC midnight of the 5th. In New York this instant is the 4th at 20:00.
    inTimezone('America/New_York', () => {
      expect(formatCalendarDate('2026-10-05T00:00:00.000Z')).toBe('5 Oct 2026');
    });
  });

  it('is identical in every timezone', () => {
    const iso = '2026-01-01T00:00:00.000Z';

    inTimezone('UTC', () => {
      expect(formatCalendarDate(iso, 'short')).toBe('1 Jan 2026');
    });
    inTimezone('America/New_York', () => {
      expect(formatCalendarDate(iso, 'short')).toBe('1 Jan 2026');
    });
    inTimezone('Asia/Jakarta', () => {
      expect(formatCalendarDate(iso, 'short')).toBe('1 Jan 2026');
    });
  });

  it('accepts a bare YYYY-MM-DD, as assignments.due_date is stored', () => {
    expect(formatCalendarDate('2026-10-09')).toBe('9 Oct 2026');
    expect(formatCalendarDate('2026-10-09', 'long')).toBe('9 October 2026');
  });

  it('supports the styles the UI uses', () => {
    expect(formatCalendarDate('2026-10-09', 'day')).toBe('9');
    // 2026-10-09 is a Friday.
    expect(formatCalendarDate('2026-10-09', 'weekday')).toBe('Fri');
  });

  it('handles a leap day', () => {
    expect(formatCalendarDate('2024-02-29', 'long')).toBe('29 February 2024');
  });

  it('renders an em dash for missing or unparseable values', () => {
    expect(formatCalendarDate(null)).toBe('—');
    expect(formatCalendarDate(undefined)).toBe('—');
    expect(formatCalendarDate('')).toBe('—');
    expect(formatCalendarDate('tomorrow')).toBe('—');
  });

  it('rejects an out-of-range month', () => {
    expect(formatCalendarDate('2026-13-01')).toBe('—');
    expect(formatCalendarDate('2026-00-10')).toBe('—');
  });
});

describe('toCalendarInput', () => {
  it('slices a timestamp down to the value an input[type=date] wants', () => {
    expect(toCalendarInput('2026-10-09T00:00:00.000Z')).toBe('2026-10-09');
    expect(toCalendarInput('2026-10-09')).toBe('2026-10-09');
    expect(toCalendarInput(null)).toBe('');
  });
});