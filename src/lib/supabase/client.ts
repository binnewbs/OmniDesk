'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * The URL and anon key are required at build time, so fail loudly here rather
 * than letting a confusing "undefined is not a valid URL" surface later.
 */
function required(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project keys.`,
    );
  }
  return value;
}

let singleton: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser client. Next's dev server re-evaluates modules on every hot reload,
 * so the client is cached on globalThis to avoid opening a new connection
 * (and losing auth state) on each render.
 */
export function createClient() {
  if (singleton) return singleton;

  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (typeof window === 'undefined') {
    // Server render: a fresh client per call, since it cannot share cookies here.
    return createBrowserClient<Database>(url, anonKey);
  }

  singleton = createBrowserClient<Database>(url, anonKey);
  return singleton;
}