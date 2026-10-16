import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { getProfile, ensureProfile } from '@/lib/repositories/profiles';
import { isProfileSetupComplete } from '@/lib/profile-setup-state';
import { ProfileSetupForm } from '@/components/features/auth/ProfileSetupForm';

export const metadata: Metadata = { title: 'Set up your profile — OmniDesk' };

export default async function ProfileSetupPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // Already finished step 2: there is nothing to do here.
  if (isProfileSetupComplete(user)) redirect('/dashboard');

  // The signup trigger normally creates this row; upsert it if it is missing
  // so the form has a target either way (PLAN.md §7.3).
  const profile = (await getProfile(user.id)) ??
    (await ensureProfile(user.id, user.email?.split('@')[0] ?? 'student'));

  return <ProfileSetupForm initialBio={profile.bio ?? ''} />;
}