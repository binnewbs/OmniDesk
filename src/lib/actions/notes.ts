'use server';

import { z } from 'zod';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import {
  createFolder,
  createNote,
  moveNote,
  purgeNote,
  restoreFolder,
  restoreNote,
  setPinned,
  softDeleteFolder,
  softDeleteNote,
  updateFolder,
  updateNote,
} from '@/lib/repositories/notes';
import type { Note } from '@/types/domain';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function errors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const folderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name is required').max(60, 'Name is too long'),
});

const FAIL = 'Something went wrong. Try again.';

/* -------------------------------------------------------------------------- */
/* Folders                                                                    */
/* -------------------------------------------------------------------------- */

export async function createFolderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = folderSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    await createFolder(user.id, parsed.data.name);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function renameFolderAction(id: string, name: string): Promise<ActionState> {
  const parsed = folderSchema.safeParse({ name });
  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    await updateFolder(user.id, id, parsed.data.name);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/**
 * Folders are soft-deleted; their notes keep folder_id, so removing a folder
 * never destroys notes (PLAN.md §12).
 */
export async function deleteFolderAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteFolder(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function undoDeleteFolderAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreFolder(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Notes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates a note immediately with an empty title, so the editor opens ready for
 * typing without a second click, and returns its id to open it on.
 */
export async function createNoteAction(
  folderId: string | null,
): Promise<{ ok: boolean; note?: Note; message?: string }> {
  try {
    const user = await requireUserOrThrow();
    const note = await createNote(user.id, '', folderId);
    return { ok: true, note };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/** Autosave from the note editor; stamps last_modified (epoch ms) each time. */
export async function saveNoteAction(id: string, content: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await updateNote(user.id, id, { content });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function setNotePinnedAction(id: string, pinned: boolean): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await setPinned(user.id, id, pinned);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function moveNoteToFolderAction(id: string, folderId: string | null): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await moveNote(user.id, id, folderId);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function deleteNoteAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteNote(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function undoDeleteNoteAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreNote(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/** The only hard delete in the app, reachable solely from Notes → Trash. */
export async function purgeNoteAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await purgeNote(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}