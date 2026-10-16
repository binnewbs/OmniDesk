import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listAssignments } from '@/lib/repositories/assignments';
import { AssignmentsScreen } from '@/components/features/assignments/AssignmentsScreen';

export const metadata: Metadata = { title: 'Assignments — OmniDesk' };

export default async function AssignmentsPage() {
  const user = await requireUser();
  const assignments = await listAssignments(user.id);

  return <AssignmentsScreen initial={assignments} />;
}

