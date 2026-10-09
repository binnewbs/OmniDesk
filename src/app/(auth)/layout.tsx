import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { isProfileSetupComplete } from '@/lib/profile-setup-state';
import { AuthSplit } from '@/components/features/auth/AuthSplit';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (user) {
    // Someone already signed in landing on /login: send them to the app, or
    // to step 2 if onboarding is unfinished.
    redirect(isProfileSetupComplete(user) ? '/dashboard' : '/profile-setup');
  }

  return <AuthSplit>{children}</AuthSplit>;
}