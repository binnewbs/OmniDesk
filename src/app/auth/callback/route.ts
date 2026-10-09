import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

/**
 * PKCE callback. With `flowType: 'pkce'` Supabase redirects here with a `code`
 * query param, which @supabase/ssr exchanges for a session when the client is
 * constructed with the exchangeCodeForSession option.
 *
 * The middleware verifies the token-hash variant of the link; this covers the
 * code variant so either email template works.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) redirect('/login');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) redirect('/login');

  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(`${origin}/login?error=verification`);
  }

  redirect('/dashboard');
}

export const metadata: Metadata = { title: 'Signing in…' };