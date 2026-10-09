import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { ensureProfile, getProfile } from '@/lib/repositories/profiles';
import { isProfileSetupComplete } from '@/lib/profile-setup-state';

/**
 * After sign-in the user must land on /profile-setup when their profile row is
 * missing or has no username. Called by the (app) layout so the guard holds
 * for every protected route, including direct navigation.
 */
export async function requireProfileComplete(): Promise<void> {
  const user = await getUser();
  if (!user) redirect('/login');

  if (!isProfileSetupComplete(user)) redirect('/profile-setup');

  // A profile row should always exist by now, but the shell cannot render
  // without one; upsert rather than fail (PLAN.md §7.3).
  const profile = await getProfile(user.id);
  if (!profile) {
    await ensureProfile(user.id, user.email?.split('@')[0] ?? 'student');
  }
}