import type { Metadata } from 'next';
import { requireProfileComplete } from '@/lib/auth-guard';
import { getUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/repositories/profiles';
import { getDashboardData } from '@/lib/repositories/stats';
import { DashboardScreen } from '@/components/features/dashboard/DashboardScreen';

export const metadata: Metadata = { title: 'Dashboard — Productivity Manager' };

export default async function DashboardPage() {
  await requireProfileComplete();

  const user = await getUser();
  const [profile, data] = await Promise.all([
    getProfile(user!.id),
    getDashboardData(user!.id),
  ]);

  return (
    <DashboardScreen
      username={profile?.username ?? 'student'}
      stats={data.stats}
      transactions={data.transactions}
      assignments={data.assignments}
      classes={data.classes}
      notes={data.notes}
      currency={data.settings.currency}
    />
  );
}