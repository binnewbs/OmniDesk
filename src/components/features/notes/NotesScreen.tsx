'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote, Trash } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlobalSearch } from '@/components/shell/GlobalSearch';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback';
import {
  createFolderAction,
  getNoteForEditorAction,
  createNoteAction,
  deleteFolderAction,
  deleteNoteAction,
  purgeNoteAction,
  undoDeleteFolderAction,
  undoDeleteNoteAction,
} from '@/lib/actions/notes';
import { FolderList, NewFolderForm } from './FolderList';
import { NoteCard, TrashNoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import s from './NotesLayout.module.css';
import type { Note, NoteFolder } from '@/types/domain';

/** 'all' | 'trash' | a folder id */
type View = string;

const without = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

interface NotesScreenProps {
  /** Live notes for the default view; Trash notes arrive separately. */
  notes: Note[];
  trashed: Note[];
  folders: NoteFolder[];
}

export function NotesScreen({
  notes: initialNotes,
  trashed,
  folders: initialFolders,
}: NotesScreenProps) {
  const router = useRouter();
  const { show } = useToast();

  /**
   * The lists are *not* mirrored into state. Server actions revalidate, so the
   * props are always the authoritative rows — a restore, a pin or an editor
   * autosave shows up on the next `router.refresh()` without a remount.
   *
   * `hiddenIds` covers only the gap between a soft delete and the refresh
   * landing: the row leaves the grid immediately instead of lingering until the
   * round trip finishes. It is cleared by the Undo in the toast, so a restored
   * row is not filtered out of the fresh props.
   */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());

  const [view, setView] = useState<View>('all');
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [folderState, folderAction, creating] = useActionState(createFolderAction, { ok: false });

  /** Mutations revalidate on the server, so pull the authoritative rows back. */
  const refresh = () => router.refresh();

  // Close the inline form once the folder is actually created, and pull the new
  // list back. Checking `folderState.ok` in a submit handler would read the
  // previous result instead (see useSubmitFeedback).
  useSubmitFeedback(folderState, creating, () => {
    setCreatingFolder(false);
    show({ tone: 'success', message: 'Folder created.' });
    refresh();
  });

  const isTrash = view === 'trash';

  const notes = initialNotes;
  const folders = initialFolders;

  // Rows shown, filtered client-side by the selected folder.
  const visible = useMemo(() => {
    const base = (isTrash ? trashed : notes).filter((n) => !hiddenIds.has(n.id));
    if (view === 'all' || isTrash) return base;
    return base.filter((n) => n.folder_id === view);
  }, [notes, trashed, view, isTrash, hiddenIds]);

  const pinned = visible.filter((n) => n.pinned);
  const recent = visible.filter((n) => !n.pinned);

  const onNewNote = async () => {
    const result = await createNoteAction(view === 'all' || isTrash ? null : view);
    if (!result.ok || !result.note) {
      show({ tone: 'error', message: result.message ?? 'Could not create a note.' });
      return;
    }

    // Create-and-open: the user lands in the editor without a second click.
    setOpenNote(result.note);
    refresh();
  };

  /** A search result carries only an id, so the note is fetched for the editor. */
  const openNoteById = async (id: string) => {
    const result = await getNoteForEditorAction(id);
    if (!result.ok || !result.note) {
      show({ tone: 'error', message: result.message ?? 'Could not open that note.' });
      return;
    }
    setOpenNote(result.note);
  };

  const onDeleteNote = async (note: Note) => {
    const result = await deleteNoteAction(note.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete this note.' });
      return;
    }
    setHiddenIds((prev) => new Set(prev).add(note.id));
    show({
      tone: 'success',
      message: 'Note moved to Trash.',
      action: {
        label: 'Undo',
        run: async () => {
          const result = await undoDeleteNoteAction(note.id);
          if (result.ok) setHiddenIds((prev) => without(prev, note.id));
        },
      },
    });
    refresh();
  };

  const onRestoreNote = async (note: Note) => {
    const result = await undoDeleteNoteAction(note.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not restore this note.' });
      return;
    }
    show({ tone: 'success', message: 'Note restored.' });
    refresh();
  };

  const onPurgeNote = async (note: Note) => {
    const result = await purgeNoteAction(note.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete this note.' });
      return;
    }
    show({ tone: 'success', message: 'Note deleted forever.' });
    refresh();
  };

  const onDeleteFolder = async (folder: NoteFolder) => {
    const result = await deleteFolderAction(folder.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete this folder.' });
      return;
    }
    setHiddenIds((prev) => new Set(prev).add(folder.id));
    if (view === folder.id) setView('all');
    show({
      tone: 'success',
      message: `Folder "${folder.name}" removed. Its notes are kept.`,
      action: {
        label: 'Undo',
        run: async () => {
          const result = await undoDeleteFolderAction(folder.id);
          if (result.ok) setHiddenIds((prev) => without(prev, folder.id));
        },
      },
    });
    refresh();
  };

  return (
    <main className="page">
      <PageHeader
        title="Notes"
        subtitle="Pinned and recent notes"
        actions={
          <>
            <GlobalSearch scope="notes" onSelectNote={openNoteById} />
            <Button variant="primary" onClick={onNewNote}>
              + Note
            </Button>
          </>
        }
      />

      <div className={s.layout}>
        <FolderList
          folders={folders}
          view={view}
          onSelect={setView}
          onDelete={onDeleteFolder}
          creating={creatingFolder}
          onCreate={() => setCreatingFolder(true)}
          newFolderForm={
            <NewFolderForm
              action={folderAction}
              pending={creating}
              error={folderState.errors?.name}
            />
          }
        />

        <div className={s.gridArea}>
          {isTrash ? (
            <>
              <p className={s.sectionLabel}>Trash</p>
              {visible.length === 0 ? (
                <EmptyState icon={Trash} title="Trash is empty" hint="Deleted notes land here." />
              ) : (
                <div className="grid grid--3">
                  {visible.map((note) => (
                    <TrashNoteCard
                      key={note.id}
                      note={note}
                      onRestore={onRestoreNote}
                      onPurge={onPurgeNote}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {pinned.length > 0 && (
                <section>
                  <p className={s.sectionLabel}>Pinned</p>
                  <div className="grid grid--3">
                    {pinned.map((note) => (
                      <NoteCard key={note.id} note={note} onOpen={setOpenNote} onDelete={onDeleteNote} />
                    ))}
                  </div>
                </section>
              )}

              {recent.length > 0 && (
                <section>
                  <p className={s.sectionLabel}>Recent</p>
                  <div className="grid grid--3">
                    {recent.map((note) => (
                      <NoteCard key={note.id} note={note} onOpen={setOpenNote} onDelete={onDeleteNote} />
                    ))}
                  </div>
                </section>
              )}

              {visible.length === 0 && (
                <EmptyState
                  icon={StickyNote}
                  title="No notes yet"
                  hint="Create your first note with + Note, or use Search to find one."

                />
              )}
            </>
          )}
        </div>
      </div>

      {openNote && (
        <NoteEditor note={openNote} folders={folders} onClose={() => setOpenNote(null)} />
      )}
    </main>
  );
}