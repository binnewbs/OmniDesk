'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { DEFAULT_TIMEZONE, isValidTimeZone, TZ_COOKIE } from '@/lib/timezone';

const TimezoneContext = createContext<string>(DEFAULT_TIMEZONE);

/**
 * Supplies the user's timezone to client components, and writes it to the `tz`
 * cookie so the server can render the same value during SSR.
 *
 * The cookie is written in an effect, which means the *first* render of a cold
 * session still uses the fallback. Every load after that is exact.
 */
export function TimezoneProvider({
  initialTimezone,
  children,
}: {
  initialTimezone: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(detected)) return;
    if (detected === initialTimezone) return;

    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(detected)}; path=/; max-age=31536000; samesite=lax`;
  }, [initialTimezone]);

  return <TimezoneContext.Provider value={initialTimezone}>{children}</TimezoneContext.Provider>;
}

/** The user's timezone. Falls back to UTC before the first effect runs. */
export function useUserTimezone(): string {
  return useContext(TimezoneContext);
}