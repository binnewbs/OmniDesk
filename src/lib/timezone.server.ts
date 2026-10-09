import 'server-only';

import { cookies } from 'next/headers';
import { normalizeTimeZone, TZ_COOKIE } from '@/lib/timezone';

/**
 * The user's timezone, read from the cookie the client writes on mount.
 *
 * Falls back to UTC on the very first load of a session — the client has not had
 * a chance to write the cookie yet — and for any value `Intl` would reject.
 */
export async function getUserTimezone(): Promise<string> {
  const store = await cookies();
  return normalizeTimeZone(store.get(TZ_COOKIE)?.value);
}