'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { NOTE_AUTOSAVE_MS } from '@/lib/constants';
import {
  deleteNoteAction,
  moveNoteToFolderAction,
  saveNoteAction,
  setNotePinnedAction,
  undoDeleteNoteAction,
} from '@/lib/actions/notes';
import type { Note, NoteFolder } from '@/types/domain';

/**
 * Plain textarea editor: the schema has no format column, so there is no
 * toolbar and no markdown rendering. Autosaves 800ms after typing stops.
 */
export function NoteEditor({
  note,
  folders,
  onClose,
}: {
  note: Note;
  folders: NoteFolder[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [content, setContent] = useState(note.content);
  const [pinned, setPinned] = useState(note.pinned);
  const [folderId, setFolderId] = useState<string>(note.folder_id ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // Debounced autosave: only the latest value is sent, and the timer is cleared
  // on unmount so closing mid-edit still flushes.
  useEffect(() => {
    if (!dirty.current) return;

    setStatus('saving');
    timer.current = setTimeout(async () => {
      const result = await saveNoteAction(note.id, content);
      dirty.current = false;
      setStatus(result.ok ? 'saved' : 'idle');
      if (!result.ok) show({ tone: 'error', message: 'Could not save this note.' });
      router.refresh();
    }, NOTE_AUTOSAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, note.id, router, show]);

  const onDelete = async () => {
    const result = await deleteNoteAction(note.id);
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete this note.' });
      return;
    }
    onClose();
    // Undo here too, matching every other soft-delete path in the app.
    show({
      tone: 'success',
      message: 'Note moved to Trash.',
      action: { label: 'Undo', run: () => undoDeleteNoteAction(note.id) },
    });
    router.refresh();
  };

  const togglePinned = async () => {
    const next = !pinned;
    setPinned(next);
    const result = await setNotePinnedAction(note.id, next);
    if (!result.ok) {
      setPinned(!next);
      show({ tone: 'error', message: 'Could not update the pin.' });
      return;
    }
    router.refresh();
  };

  const onChangeFolder = async (next: string) => {
    setFolderId(next);
    const result = await moveNoteToFolderAction(note.id, next || null);
    if (!result.ok) {
      show({ tone: 'error', message: 'Could not move this note.' });
      return;
    }
    router.refresh();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Note"
      variant="drawer"
      footer={
        <>
          <Button variant="danger" iconLeft={Trash2} onClick={onDelete}>
            Delete
          </Button>
          <span style={{ flex: 1 }} />
          <span className="t-muted" aria-live="polite">
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <textarea
        className="textarea"
        style={{ flex: 1, minHeight: '50vh' }}
        value={content}
        placeholder="First line is the title"
        aria-label="Note content"
        onChange={(e) => {
          dirty.current = true;
          setContent(e.target.value);
        }}
      />

      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        <label className="field__label" htmlFor="note-folder">
          Folder
        </label>
        <select
          id="note-folder"
          className="select"
          value={folderId}
          onChange={(e) => onChangeFolder(e.target.value)}
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <Button variant={pinned ? 'secondary' : 'ghost'} iconLeft={Pin} onClick={togglePinned} full>
        {pinned ? 'Unpin' : 'Pin to top'}
      </Button>
    </Modal>
  );
}