import { describe, expect, it } from 'vitest';
import {
  calendarDateInZone,
  formatInstantInZone,
  isInCurrentMonthInZone,
  isValidTimeZone,
  monthLabelInZone,
  normalizeTimeZone,
  relativeInZone,
  startOfMonthInZone,
  startOfNextMonthInZone,
  weekdayIndexInZone,
} from './timezone';

const UTC = 'UTC';
const JAKARTA = 'Asia/Jakarta'; // UTC+7, no DST
const NEW_YORK = 'America/New_York'; // UTC-5 / UTC-4, DST

describe('isValidTimeZone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimeZone(UTC)).toBe(true);
    expect(isValidTimeZone(JAKARTA)).toBe(true);
    expect(isValidTimeZone(NEW_YORK)).toBe(true);
  });

  it('accepts the legacy aliases that supportedValuesOf omits', () => {
    // Intl.supportedValuesOf('timeZone') excludes all of these, but they are
    // perfectly valid and browsers do report them.
    expect(isValidTimeZone('GMT')).toBe(true);
    expect(isValidTimeZone('Etc/UTC')).toBe(true);
    expect(isValidTimeZone('Etc/GMT+5')).toBe(true);
  });

  it('rejects anything Intl would throw on, so a tampered cookie is harmless', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

describe('normalizeTimeZone', () => {
  it('falls back to UTC rather than passing a bad zone to Intl', () => {
    expect(normalizeTimeZone('Not/AZone')).toBe(UTC);
    expect(normalizeTimeZone(undefined)).toBe(UTC);
    expect(normalizeTimeZone(JAKARTA)).toBe(JAKARTA);
  });
});

describe('calendarDateInZone', () => {
  // 2026-10-05T20:00:00Z is the 6th in Jakarta and the 5th in New York.
  const evening = new Date('2026-10-05T20:00:00Z');

  it('reports the date as seen in the given zone', () => {
    expect(calendarDateInZone(evening, JAKARTA).day).toBe(6);
    expect(calendarDateInZone(evening, NEW_YORK).day).toBe(5);
    expect(calendarDateInZone(evening, UTC).day).toBe(5);
  });
});

describe('relativeInZone', () => {
  const now = new Date('2026-10-09T12:00:00Z'); // midday UTC

  it('measures the day boundary in the user’s zone, not the server’s', () => {
    // 22:00 UTC is still the 9th in UTC, but already the 10th in Jakarta.
    const lateUtc = new Date('2026-10-09T22:00:00Z');

    expect(relativeInZone(lateUtc.getTime(), UTC, now)).toBe('Today');
    expect(relativeInZone(lateUtc.getTime(), JAKARTA, now)).toBe('Tomorrow');
  });

  it('handles the named days', () => {
    const day = 86_400_000;
    const at = (offsetDays: number) =>
      relativeInZone(now.getTime() + offsetDays * day, UTC, now);

    expect(at(0)).toBe('Today');
    expect(at(1)).toBe('Tomorrow');
    expect(at(-1)).toBe('Yesterday');
    expect(at(3)).toBe('In 3 days');
    expect(at(-5)).toBe('5 days ago');
  });

  it('returns an em dash for a missing timestamp', () => {
    expect(relativeInZone(null, UTC)).toBe('—');
  });
});

describe('weekdayIndexInZone', () => {
  // Monday 2026-10-05T23:00Z is already Tuesday in Jakarta.
  const mondayLateUtc = new Date('2026-10-05T23:00:00Z');

  it('returns the weekday for that zone', () => {
    expect(weekdayIndexInZone(mondayLateUtc, UTC)).toBe(1); // Monday
    expect(weekdayIndexInZone(mondayLateUtc, JAKARTA)).toBe(2); // Tuesday
  });
});

describe('month boundaries in a zone', () => {
  // 2026-09-30T18:00Z is still September in New York, already October in Jakarta.
  const edge = new Date('2026-09-30T18:00:00Z');

  it('starts the month where the user’s month starts', () => {
    expect(startOfMonthInZone(edge, UTC).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(startOfMonthInZone(edge, JAKARTA).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('returns the next month exclusively', () => {
    expect(startOfNextMonthInZone(edge, JAKARTA).toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('classifies an instant against the user’s current month', () => {
    const now = new Date('2026-09-30T18:00:00Z');
    const instant = '2026-09-30T20:00:00Z';

    expect(isInCurrentMonthInZone(instant, UTC, now)).toBe(true);
    expect(isInCurrentMonthInZone(instant, JAKARTA, now)).toBe(false);
  });
});

describe('formatInstantInZone', () => {
  it('formats in the given zone', () => {
    const iso = '2026-10-05T20:00:00Z';
    expect(formatInstantInZone(iso, UTC)).toBe('5 Oct 2026');
    expect(formatInstantInZone(iso, JAKARTA)).toBe('6 Oct 2026');
  });

  it('returns an em dash for missing or invalid input', () => {
    expect(formatInstantInZone(null, UTC)).toBe('—');
    expect(formatInstantInZone('nonsense', UTC)).toBe('—');
  });
});

describe('monthLabelInZone', () => {
  it('names the user’s month', () => {
    const edge = new Date('2026-09-30T18:00:00Z');
    expect(monthLabelInZone(edge, UTC)).toBe('September 2026');
    expect(monthLabelInZone(edge, JAKARTA)).toBe('October 2026');
  });
});