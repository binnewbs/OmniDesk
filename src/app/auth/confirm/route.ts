import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

/**
 * Target of the Supabase email links: `?token_hash=&type=email|recovery`.
 *
 * The middleware verifies the token for this path and redirects onward. This
 * route repeats the verification so the link also works if the request was not
 * matched by the middleware config, then always resolves to a real screen.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL('/login?error=verification', request.url));
  }

  // A response object the client below can set cookies on.
  const redirectTo = type === 'recovery' ? '/reset-password' : '/dashboard';
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as 'email' | 'recovery' | 'invite' | 'email_change',
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(new URL('/login?error=verification', origin));
  }

  return response;
}