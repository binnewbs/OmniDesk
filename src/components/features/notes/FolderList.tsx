'use client';

import { useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dropdown, Chevron } from '@/components/ui/Dropdown';
import { IconButton } from '@/components/ui/Pill';
import s from './NotesLayout.module.css';
import type { NoteFolder } from '@/types/domain';

/** 'all' | 'trash' | a folder id. */
export type NotesView = string;

interface FolderListProps {
  folders: NoteFolder[];
  view: NotesView;
  onSelect: (view: NotesView) => void;
  onDelete: (folder: NoteFolder) => void;
  /** Inline create form, shown inside the desktop card. */
  creating: boolean;
  onCreate: () => void;
  newFolderForm: React.ReactNode;
}

/**
 * The Folders card from the wireframe: All notes, each folder, Trash, and the
 * dashed "+ Folder" row.
 *
 * It renders twice. Above 768px this is the 200px card; below it the card is
 * hidden and only the select is shown, because a 200px column of items beside a
 * single-column grid of notes leaves no room for the notes themselves.
 */
export function FolderList({
  folders,
  view,
  onSelect,
  onDelete,
  creating,
  onCreate,
  newFolderForm,
}: FolderListProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentLabel =
    view === 'all'
      ? 'All notes'
      : view === 'trash'
        ? 'Trash'
        : (folders.find((f) => f.id === view)?.name ?? 'All notes');

  return (
    <>
      {/* Narrow-viewport fallback: the same choices as the card, in a select. */}
      <div className={s.folderPicker}>
        <Dropdown
          align="start"
          width={240}
          value={view}
          onChange={(value) => {
            onSelect(value);
            setPickerOpen(false);
          }}
          trigger={(props) => (
            <button {...props} type="button" className="chip">
              <span className="truncate-1">{currentLabel}</span>
              <Chevron />
            </button>
          )}
          items={[
            { value: 'all', label: 'All notes' },
            ...folders.map((f) => ({ value: f.id, label: f.name })),
            { value: 'trash', label: 'Trash' },
          ]}
        />

        <IconButton
          plain
          icon={FolderPlus}
          label="New folder"
          onClick={onCreate}
          aria-expanded={pickerOpen}
        />
      </div>

      <Card className={s.folders}>
        <h2 className={s.folders__title}>Folders</h2>

        <button
          type="button"
          className={`${s.folderItem} ${view === 'all' ? s.folderItemActive : ''}`}
          onClick={() => onSelect('all')}
          aria-current={view === 'all' ? 'true' : undefined}
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
              onClick={() => onSelect(folder.id)}
              aria-current={view === folder.id ? 'true' : undefined}
            >
              <span className={s.folderLabel}>{folder.name}</span>
            </button>
            <span className={s.folderActions}>
              <IconButton
                plain
                icon={Trash2}
                label={`Delete folder ${folder.name}`}
                onClick={() => onDelete(folder)}
              />
            </span>
          </span>
        ))}

        <button
          type="button"
          className={`${s.folderItem} ${view === 'trash' ? s.folderItemActive : ''}`}
          onClick={() => onSelect('trash')}
          aria-current={view === 'trash' ? 'true' : undefined}
        >
          <span className={s.folderLabel}>Trash</span>
        </button>

        {creating ? (
          newFolderForm
        ) : (
          <button type="button" className={`${s.newFolder} dash-border`} onClick={onCreate}>
            <FolderPlus size={16} strokeWidth={2} aria-hidden />
            Folder
          </button>
        )}
      </Card>
    </>
  );
}

/** The inline "+ Folder" form, kept here so the card and the picker share it. */
export function NewFolderForm({
  action,
  pending,
  error,
}: {
  /** The dispatch from `useActionState`, which React accepts as a form action. */
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  return (
    <form action={action} className={s.newFolderForm}>
      <input
        className={s.newFolderInput}
        name="name"
        autoFocus
        placeholder="Folder name"
        aria-label="New folder name"
        aria-invalid={error ? true : undefined}
      />
      <span className={s.newFolderActions}>
        <Button type="submit" variant="secondary" loading={pending}>
          Add
        </Button>
      </span>
      {error && <span className="field__error">{error}</span>}
    </form>
  );
}