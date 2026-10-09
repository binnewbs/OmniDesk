import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { AuthRequiredError } from '@/lib/supabase/errors';

/**
 * The authenticated user, or a redirect to /login.
 *
 * `supabase.auth.getUser()` revalidates the token against the Auth server on
 * every call rather than trusting the cookie, so this is the safe way to get
 * an identity inside a repository.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Same as requireUser, but for server actions that must not redirect — they
 * return `{ ok: false }` to the form instead.
 */
export async function requireUserOrThrow() {
  const user = await getUser();
  if (!user) throw new AuthRequiredError();
  return user;
}

/** The user id plus a bound client, which is the pair every repository needs. */
export async function requireContext() {
  const supabase = await createClient();
  const user = await requireUserOrThrow();
  return { supabase, user, userId: user.id };
}