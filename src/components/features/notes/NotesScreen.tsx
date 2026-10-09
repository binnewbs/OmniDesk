'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, StickyNote, Trash, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { GlobalSearch } from '@/components/shell/GlobalSearch';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/Pill';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
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
import { NoteCard, TrashNoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import s from './NotesLayout.module.css';
import type { Note, NoteFolder } from '@/types/domain';

/** 'all' | 'trash' | a folder id */
type View = string;

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

  const [notes, setNotes] = useState(initialNotes);
  const [folders, setFolders] = useState(initialFolders);
  const [view, setView] = useState<View>('all');
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [folderState, folderAction, creating] = useActionState(createFolderAction, { ok: false });

  const isTrash = view === 'trash';

  // Rows shown, filtered client-side by the selected folder.
  const visible = useMemo(() => {
    const base = isTrash ? trashed : notes;
    if (view === 'all' || isTrash) return base;
    return base.filter((n) => n.folder_id === view);
  }, [notes, trashed, view, isTrash]);

  const pinned = visible.filter((n) => n.pinned);
  const recent = visible.filter((n) => !n.pinned);

  /** Mutations revalidate on the server, so pull the authoritative rows back. */
  const refresh = () => router.refresh();

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
    setNotes((list) => list.filter((n) => n.id !== note.id));
    show({
      tone: 'success',
      message: 'Note moved to Trash.',
      action: { label: 'Undo', run: () => undoDeleteNoteAction(note.id) },
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
    setFolders((list) => list.filter((f) => f.id !== folder.id));
    if (view === folder.id) setView('all');
    show({
      tone: 'success',
      message: `Folder "${folder.name}" removed. Its notes are kept.`,
      action: { label: 'Undo', run: () => undoDeleteFolderAction(folder.id) },
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
        <Card className={s.folders}>
          <h2 className={s.folders__title}>Folders</h2>

          <button
            type="button"
            className={`${s.folderItem} ${view === 'all' ? s.folderItemActive : ''}`}
            onClick={() => setView('all')}
          >
            <span className={s.folderLabel}>All notes</span>
          </button>

          {folders.map((folder) => (
            <span
              key={folder.id}
              className={`${s.folderItem} ${view === folder.id ? s.folderItemActive : ''}`}
            >
              <button
                type="button"
                className={s.folderSelect}
                onClick={() => setView(folder.id)}
              >
                <span className={s.folderLabel}>{folder.name}</span>
              </button>
              <span className={s.folderActions}>
                <IconButton
                  plain
                  icon={Trash2}
                  label={`Delete folder ${folder.name}`}
                  onClick={() => onDeleteFolder(folder)}
                />
              </span>
            </span>
          ))}

          <button
            type="button"
            className={`${s.folderItem} ${isTrash ? s.folderItemActive : ''}`}
            onClick={() => setView('trash')}
          >
            <span className={s.folderLabel}>Trash</span>
          </button>

          {creatingFolder ? (
            <form action={folderAction} className={s.newFolderForm}>
              <input
                className={s.newFolderInput}
                name="name"
                autoFocus
                placeholder="Folder name"
                aria-label="New folder name"
              />
              <span className={s.newFolderActions}>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={creating}
                  onClick={() => {
                    if (folderState.ok) setCreatingFolder(false);
                  }}
                >
                  Add
                </Button>
              </span>
            </form>
          ) : (
            <button
              type="button"
              className={`${s.newFolder} dash-border`}
              onClick={() => setCreatingFolder(true)}
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Folder
            </button>
          )}
        </Card>

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