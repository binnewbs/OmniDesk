import { Trash2 } from 'lucide-react';
import s from './NoteCard.module.css';
import { Pill } from '@/components/ui/Pill';
import { relativeInZone } from '@/lib/timezone';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import type { Note } from '@/types/domain';

/**
 * `notes.content` holds both the title and the body (PLAN.md §15, decision 10):
 * the first line is the title, the next three lines are the preview.
 */
export function splitNote(content: string): { title: string; preview: string[] } {
  const lines = content.split('\n');
  return {
    title: lines[0]?.trim() || 'Untitled note',
    preview: lines.slice(1, 4),
  };
}

/**
 * No per-note colors: the schema has no color column, so every card shares the
 * same surface-alt background. The trash button is a sibling rather than a
 * child of the open button, so the two are separate tab stops.
 */
export function NoteCard({
  note,
  onOpen,
  onDelete,
}: {
  note: Note;
  onOpen: (note: Note) => void;
  onDelete: (note: Note) => void;
}) {
  const timezone = useUserTimezone();
  const { title, preview } = splitNote(note.content);

  return (
    <div className={s.card}>
      <button type="button" className={s.open} onClick={() => onOpen(note)}>
        <span className={s.header}>
          <span className={s.title}>{title}</span>
          {note.pinned && <Pill tone="accent">Pinned</Pill>}
        </span>

        <span className={s.preview}>
          {preview.length === 0 ? (
            <span className={s.linePlaceholder} />
          ) : (
            preview.map((line, i) => (
              <span key={i} className={s.line}>
                {line}
              </span>
            ))
          )}
        </span>

        <span className={s.footer}>
          Last modified {relativeInZone(note.last_modified, timezone)}
        </span>
      </button>

      <button
        type="button"
        className={s.delete}
        onClick={() => onDelete(note)}
        aria-label={`Delete ${title}`}
      >
        <Trash2 size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** Trash rows get Restore / Delete forever instead of the normal footer. */
export function TrashNoteCard({
  note,
  onRestore,
  onPurge,
}: {
  note: Note;
  onRestore: (note: Note) => void;
  onPurge: (note: Note) => void;
}) {
  const timezone = useUserTimezone();
  // Only the title: a trashed note's body is deliberately not shown.
  const { title } = splitNote(note.content);

  return (
    <div className={s.card}>
      <span className={s.header}>
        <span className={s.title}>{title}</span>
      </span>

      {/* Placeholders, not the content: a trashed note's body is deliberately
          not shown. Two lines rather than three to leave room for the footer. */}
      <span className={s.preview}>
        {[0, 1].map((i) => (
          <span key={i} className={s.linePlaceholder} />
        ))}
      </span>

      <span className={s.trashFooter}>
        <span className={s.trashDate}>
          Deleted {relativeInZone(note.deleted_at ? new Date(note.deleted_at).getTime() : null, timezone)}
        </span>
        <span className={s.trashActions}>
          <button type="button" className={s.trashButton} onClick={() => onRestore(note)}>
            Restore
          </button>
          <button
            type="button"
            className={`${s.trashButton} ${s.trashDanger}`}
            onClick={() => onPurge(note)}
          >
            Delete forever
          </button>
        </span>
      </span>
    </div>
  );
}