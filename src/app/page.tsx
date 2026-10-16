import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getUser } from '@/lib/supabase/server';
import { isProfileSetupComplete } from '@/lib/profile-setup-state';

/** The app's entry point: send signed-in users to the dashboard. */
export default async function RootPage() {
  const user = await getUser();

  if (!user) redirect('/login');
  redirect(isProfileSetupComplete(user) ? '/dashboard' : '/profile-setup');
}

export const metadata: Metadata = { title: 'OmniDesk' };