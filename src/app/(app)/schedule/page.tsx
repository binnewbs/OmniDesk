import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listClasses } from '@/lib/repositories/schedule';
import { ScheduleScreen } from '@/components/features/schedule/ScheduleScreen';

export const metadata: Metadata = { title: 'Schedule — Productivity Manager' };

export default async function SchedulePage() {
  const user = await requireUser();
  const classes = await listClasses(user.id);

  return <ScheduleScreen classes={classes} />;
}