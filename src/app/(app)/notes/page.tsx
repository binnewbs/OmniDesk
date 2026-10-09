import type { Metadata } from 'next';
import { requireUser } from '@/lib/supabase/auth';
import { listFolders, listNotes } from '@/lib/repositories/notes';
import { NotesScreen } from '@/components/features/notes/NotesScreen';

export const metadata: Metadata = { title: 'Notes — Productivity Manager' };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const term = (q ?? '').trim();

  const [notes, trashed, folders] = await Promise.all([
    listNotes(user.id, { search: term || undefined }),
    listNotes(user.id, { trashed: true }),
    listFolders(user.id),
  ]);

  return (
    <NotesScreen notes={notes} trashed={trashed} folders={folders} searchTerm={term} />
  );
}