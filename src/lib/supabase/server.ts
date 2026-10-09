import { createServerClient } from '@supabase/ssr';
import { cache } from 'react';
import type { Database } from './types';

/**
 * RSC / server action client, bound to the request's cookies.
 *
 * Note on the dynamic imports: Next walks the module graph of a `'use server'`
 * file starting from the client components that import its actions. A static
 * import of `next/headers` or `server-only` on that path fails the build, so
 * both are resolved inside the function body instead. The behaviour is
 * unchanged on the server, and the explicit `window` check keeps a browser call
 * from silently returning a client with no cookies.
 *
 * Wrapped in React's `cache` so that several calls within one render (a page,
 * its layout, and a repository chain) share one cookie read and one client.
 */
export const createClient = cache(async () => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createClient() from lib/supabase/server was called in the browser. Use lib/supabase/client instead.',
    );
  }

  const { cookies } = await import('next/headers');
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