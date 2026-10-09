import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_ASSIGNMENTS } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import { parseDateSafe } from '@/lib/utils/date';
import type { Assignment, AssignmentStatus } from '@/types/domain';
import type { TableInsert, TableUpdate } from '@/lib/supabase/types';

/**
 * Reads defensively: status, priority and due_date are all free text, so a
 * legacy or hand-edited row must still render somewhere sensible. The
 * normalisation itself lives in lib/utils/assignment so the client can reuse it.
 */
export { normalizePriority, normalizeStatus } from '@/lib/utils/assignment';

export async function listAssignments(userId: string): Promise<Assignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('assignments.list', error);

  // Sorted by a parsed due date, with unparseable rows last.
  return (data ?? []).sort((a, b) => {
    const da = parseDateSafe(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const db = parseDateSafe(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

export async function getAssignment(userId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new RepositoryError('assignments.get', error);
  return data;
}

export interface NewAssignment {
  title: string;
  course: string;
  description?: string | null;
  due_date?: string | null;
  priority: string;
  status: AssignmentStatus;
}

export async function createAssignment(userId: string, input: NewAssignment) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const row: TableInsert<'assignments'> = {
    id: createId(),
    user_id: userId,
    title: input.title,
    course: input.course,
    description: input.description ?? null,
    due_date: input.due_date ?? null,
    priority: input.priority,
    status: input.status,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const { data, error } = await supabase.from('assignments').insert(row).select().single();
  if (error) throw new RepositoryError('assignments.create', error);

  await revalidate(AFFECTS_ASSIGNMENTS);
  return data;
}

export async function updateAssignment(userId: string, id: string, input: Partial<NewAssignment>) {
  const supabase = await createClient();

  const patch: TableUpdate<'assignments'> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.course !== undefined) patch.course = input.course;
  if (input.description !== undefined) patch.description = input.description;
  if (input.due_date !== undefined) patch.due_date = input.due_date;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from('assignments')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('assignments.update', error);

  await revalidate(AFFECTS_ASSIGNMENTS);
  return data;
}

/** Called on drag & drop; the board moves the card optimistically first. */
export async function changeStatus(userId: string, id: string, status: AssignmentStatus) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assignments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('assignments.changeStatus', error);

  await revalidate(AFFECTS_ASSIGNMENTS);
  return data;
}

/** Soft delete: an update, so the row stays recoverable. */
export async function softDeleteAssignment(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('assignments.softDelete', error);

  await revalidate(AFFECTS_ASSIGNMENTS);
}

/** Re-issues the update with deleted_at null, which is what the toast's Undo does. */
export async function restoreAssignment(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('assignments')
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('assignments.restore', error);

  await revalidate(AFFECTS_ASSIGNMENTS);
}

/** Course options come from existing rows, so the filter never offers a blank. */
export async function listCourses(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('course')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('assignments.listCourses', error);

  return Array.from(new Set((data ?? []).map((r) => r.course).filter(Boolean))).sort();
}