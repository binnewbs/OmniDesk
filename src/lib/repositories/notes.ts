import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_NOTES } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import type { Note, NoteFolder } from '@/types/domain';
import type { TableInsert, TableUpdate } from '@/lib/supabase/types';

const NOTES = 'notes' as const;
const FOLDERS = 'note_folders' as const;

export interface ListNotesOptions {
  folderId?: string | null;
  pinned?: boolean;
  trashed?: boolean;
}

export async function listNotes(userId: string, opts: ListNotesOptions = {}): Promise<Note[]> {
  const supabase = await createClient();

  let query = supabase.from(NOTES).select('*').eq('user_id', userId);

  // Trash is the only view that asks for deleted rows (PLAN.md §5.4).
  query = opts.trashed ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null);

  if (opts.folderId) query = query.eq('folder_id', opts.folderId);
  if (typeof opts.pinned === 'boolean') query = query.eq('pinned', opts.pinned);

  const { data, error } = await query.order('last_modified', { ascending: false });
  if (error) throw new RepositoryError('notes.list', error);

  return (data ?? []).map((row) => ({
    ...row,
    // The int8 columns can come back null on a hand-written row.
    last_modified: row.last_modified ?? Date.now(),
    created_at: row.created_at ?? Date.now(),
  }));
}

export async function getNote(userId: string, id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(NOTES)
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new RepositoryError('notes.get', error);
  return data;
}

/** Creates a note with an empty content so the editor opens ready for typing. */
export async function createNote(userId: string, content: string, folderId: string | null) {
  const supabase = await createClient();
  const now = Date.now();
  const iso = new Date(now).toISOString();

  const row: TableInsert<'notes'> = {
    id: createId(),
    user_id: userId,
    content,
    // int8 epoch ms, not an ISO string
    last_modified: now,
    created_at: now,
    pinned: false,
    folder_id: folderId,
    updated_at: iso,
    deleted_at: null,
  };

  const { data, error } = await supabase.from(NOTES).insert(row).select().single();
  if (error) throw new RepositoryError('notes.create', error);

  await revalidate(AFFECTS_NOTES);
  return data;
}

export async function updateNote(
  userId: string,
  id: string,
  patch: { content?: string; pinned?: boolean; folder_id?: string | null },
) {
  const supabase = await createClient();

  const update: TableUpdate<'notes'> = {
    updated_at: new Date().toISOString(),
    last_modified: Date.now(),
  };
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.folder_id !== undefined) update.folder_id = patch.folder_id;

  const { data, error } = await supabase
    .from(NOTES)
    .update(update)
    .eq('user_id', userId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new RepositoryError('notes.update', error);

  await revalidate(AFFECTS_NOTES);
  return data;
}

export const setPinned = (userId: string, id: string, pinned: boolean) =>
  updateNote(userId, id, { pinned });

export const moveNote = (userId: string, id: string, folderId: string | null) =>
  updateNote(userId, id, { folder_id: folderId });

export async function softDeleteNote(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(NOTES)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('notes.softDelete', error);

  await revalidate(AFFECTS_NOTES);
}

export async function restoreNote(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(NOTES)
    .update({ deleted_at: null, last_modified: Date.now() })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('notes.restore', error);

  await revalidate(AFFECTS_NOTES);
}

/**
 * Real DELETE, and the only one in the app. Guarded on `deleted_at is not null`
 * so the data layer — not just the UI — enforces "hard delete only from Trash"
 * (PLAN.md §12): a call with a live note's id matches no row and deletes
 * nothing.
 */
export async function purgeNote(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(NOTES)
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
    .not('deleted_at', 'is', null);

  if (error) throw new RepositoryError('notes.purge', error);

  await revalidate(['/notes']);
}

/* -------------------------------------------------------------------------- */
/* Folders                                                                    */
/* -------------------------------------------------------------------------- */

export async function listFolders(userId: string): Promise<NoteFolder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(FOLDERS)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new RepositoryError('note_folders.list', error);

  return (data ?? []).map((row) => ({ ...row, created_at: row.created_at ?? Date.now() }));
}

export async function createFolder(userId: string, name: string) {
  const supabase = await createClient();
  const now = Date.now();

  const row: TableInsert<'note_folders'> = {
    id: createId(),
    user_id: userId,
    name,
    // note_folders.created_at is int8 epoch ms; updated_at is timestamptz
    created_at: now,
    updated_at: new Date(now).toISOString(),
    deleted_at: null,
  };

  const { data, error } = await supabase.from(FOLDERS).insert(row).select().single();
  if (error) throw new RepositoryError('note_folders.create', error);

  await revalidate(['/notes']);
  return data;
}

export async function updateFolder(userId: string, id: string, name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(FOLDERS)
    .update({ name, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('note_folders.update', error);

  await revalidate(['/notes']);
  return data;
}

/** Soft delete only: notes keep their folder_id, so nothing is lost. */
export async function softDeleteFolder(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(FOLDERS)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('note_folders.softDelete', error);

  await revalidate(['/notes']);
}

export async function restoreFolder(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(FOLDERS)
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('note_folders.restore', error);

  await revalidate(['/notes']);
}