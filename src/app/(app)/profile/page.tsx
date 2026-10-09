import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/repositories/profiles';
import { ProfileScreen } from '@/components/features/profile/ProfileScreen';

export const metadata: Metadata = { title: 'Profile — Productivity Manager' };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <ProfileScreen
      username={profile?.username ?? ''}
      bio={profile?.bio ?? ''}
      avatar={profile?.avatar ?? null}
    />
  );
}