/**
 * Timezone helpers, pure and safe to import from client or server.
 *
 * The app renders two very different kinds of time value:
 *
 *   - **Calendar dates** — `transactions.date`, `subscriptions.start_date`,
 *     `assignments.due_date`. These mean "a day", are stored as `YYYY-MM-DD` or
 *     UTC midnight of that day, and must never be shifted. Use
 *     `formatCalendarDate` in utils/date.ts for those.
 *
 *   - **Instants** — `notes.last_modified`, "today's classes", "this month".
 *     These are real moments, so they need the user's timezone. That lives in
 *     the `tz` cookie, written by the client on mount and read by the server.
 *
 * Without this, a server rendering in UTC and a browser in Asia/Jakarta
 * disagree, which React reports as a hydration mismatch — and even once it does
 * hydrate, "today" can be the wrong day for most of the world.
 */

export const TZ_COOKIE = 'tz';

/** Used until the client reports its real zone, and whenever it is unusable. */
export const DEFAULT_TIMEZONE = 'UTC';

const knownZones = new Set<string>();

/**
 * Validates a zone by asking `Intl` to use it, rather than by matching
 * `Intl.supportedValuesOf('timeZone')`.
 *
 * That list omits the legacy aliases `Intl` still accepts — 'UTC', 'GMT' and
 * every 'Etc/*' entry — so a user whose browser reports `UTC` (common in
 * containers and for anyone who set it explicitly) would be rejected and never
 * get their cookie written. Constructing a formatter throws RangeError on a
 * genuinely bad zone, which is the authoritative check.
 */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz) return false;
  if (knownZones.has(tz)) return true;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    knownZones.add(tz);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? (tz as string) : DEFAULT_TIMEZONE;
}

/** The calendar date `date` falls on, as seen in `timeZone`. */
export function calendarDateInZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  // en-CA formats as YYYY-MM-DD, which parses unambiguously.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Day number for a date in a zone, used by the kanban and the chart. */
export function dayOfMonthInZone(date: Date, timeZone: string): number {
  return calendarDateInZone(date, timeZone).day;
}

/** Weekday index (0 = Sunday) for a date in a zone. */
export function weekdayIndexInZone(date: Date, timeZone: string): number {
  const { year, month, day } = calendarDateInZone(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Midnight UTC of the zone's day, which makes day maths DST-proof. */
function zoneDayNumber(date: Date, timeZone: string): number {
  const { year, month, day } = calendarDateInZone(date, timeZone);
  return Date.UTC(year, month - 1, day);
}

/** Formats an instant in the user's zone. */
export function formatInstantInZone(
  iso: string | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date);
}

/**
 * "Today" / "Yesterday" / "In 3 days", measured in the user's zone so the answer
 * matches the day they are looking at.
 */
export function relativeInZone(ms: number | null | undefined, timeZone: string, now = new Date()): string {
  if (!ms) return '—';

  const that = zoneDayNumber(new Date(ms), timeZone);
  const today = zoneDayNumber(now, timeZone);
  const days = Math.round((that - today) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Start of the user's current month, as a UTC ISO string, so a
 * `date >= start` PostgREST filter matches the month the user is looking at
 * rather than the server's.
 */
export function startOfMonthInZone(now: Date, timeZone: string): Date {
  const { year, month } = calendarDateInZone(now, timeZone);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Exclusive start of the next month in the user's zone. */
export function startOfNextMonthInZone(now: Date, timeZone: string): Date {
  const { year, month } = calendarDateInZone(now, timeZone);
  return new Date(Date.UTC(year, month, 1));
}

/** Whether an instant falls inside the user's current calendar month. */
export function isInCurrentMonthInZone(iso: string, timeZone: string, now = new Date()): boolean {
  const start = startOfMonthInZone(now, timeZone).getTime();
  const end = startOfNextMonthInZone(now, timeZone).getTime();
  const t = new Date(iso).getTime();
  return t >= start && t < end;
}

/** Month label in the user's zone, e.g. "October 2026". */
export function monthLabelInZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone }).format(now);
}