'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';

/**
 * Client-side context that most screens need. Server components render inside it
 * via the (app) layout, but cannot consume the hooks themselves.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}