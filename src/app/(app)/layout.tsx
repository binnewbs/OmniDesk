import type { Metadata } from 'next';
import { requireProfileComplete } from '@/lib/auth-guard';
import { getUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/repositories/profiles';
import { Sidebar } from '@/components/shell/Sidebar';
import { AppProviders } from '@/hooks/useProviders';
import s from './layout.module.css';

export const metadata: Metadata = { title: 'Productivity Manager' };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Every protected route sits behind this, so /dashboard and /cashflow both
  // get the onboarding check for free.
  await requireProfileComplete();

  const user = await getUser();
  const profile = await getProfile(user!.id);

  // Only the sidebar's data is read here; each page loads its own.
  return (
    <AppProviders>
      <div className={s.shell}>
        <Sidebar username={profile?.username ?? null} avatar={profile?.avatar ?? null} />
        <div className={s.main}>{children}</div>
      </div>
    </AppProviders>
  );
}