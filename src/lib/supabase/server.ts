import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Database } from './types';

/**
 * RSC / server action client, bound to the request's cookies.
 *
 * `server-only` is the guard that keeps this out of the browser. It works
 * because every module that imports it — the repositories, and the `'use server'`
 * action files — is itself server-only. If that ever stops being true, a client
 * component importing one of those modules fails the build loudly instead of
 * shipping this to the browser.
 *
 * Wrapped in React's `cache` so that several calls within one render (a page,
 * its layout, and a repository chain) share one cookie read and one client.
 */
export const createClient = cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The middleware already refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
});

/**
 * Returns the signed-in user, or null. Does not redirect — use for pages that
 * render differently when signed out.
 */
export async function getUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}