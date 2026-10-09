'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { TimezoneProvider } from '@/hooks/useUserTimezone';

/**
 * Client-side context the shell needs. Server components render inside it via
 * the (app) layout, but cannot consume the hooks themselves.
 *
 * `timezone` is read from the `tz` cookie by the server layout, so the first
 * paint already uses the user's zone rather than the server's.
 */
export function AppProviders({
  timezone,
  children,
}: {
  timezone: string;
  children: ReactNode;
}) {
  return (
    <TimezoneProvider initialTimezone={timezone}>
      <ToastProvider>{children}</ToastProvider>
    </TimezoneProvider>
  );
}