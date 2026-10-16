import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listFolders, listNotes } from '@/lib/repositories/notes';
import { NotesScreen } from '@/components/features/notes/NotesScreen';

export const metadata: Metadata = { title: 'Notes — OmniDesk' };

export default async function NotesPage() {
  const user = await requireUser();

  // Search runs through the header's Search modal, not a URL filter, so this
  // fetches the full working set.
  const [notes, trashed, folders] = await Promise.all([
    listNotes(user.id),
    listNotes(user.id, { trashed: true }),
    listFolders(user.id),
  ]);

  return <NotesScreen notes={notes} trashed={trashed} folders={folders} />;
}