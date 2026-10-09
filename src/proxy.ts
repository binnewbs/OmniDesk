import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *   _next/static, _next/image  — build output
     *   favicon.ico, avatars/*    — static assets
     *   any file with an extension — public files
     */
    '/((?!_next/static|_next/image|favicon.ico|avatars/|.*\\.[\\w]+$).*)',
  ],
};