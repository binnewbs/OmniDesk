'use server';

import { z } from 'zod';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES } from '@/lib/constants';
import {
  changeStatus as changeStatusRepo,
  createAssignment,
  restoreAssignment,
  softDeleteAssignment,
  updateAssignment,
} from '@/lib/repositories/assignments';
import type { AssignmentStatus } from '@/types/domain';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const assignmentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  course: z.string().trim().min(1, 'Course is required').max(100, 'Course is too long'),
  due_date: z.string().trim().optional(),
  priority: z.enum(ASSIGNMENT_PRIORITIES),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
});

function errors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = assignmentSchema.safeParse({
    title: formData.get('title'),
    course: formData.get('course'),
    due_date: formData.get('due_date') ?? '',
    priority: formData.get('priority'),
    description: formData.get('description') ?? '',
    status: formData.get('status') ?? ASSIGNMENT_STATUSES[0],
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  const user = await requireUserOrThrow();
  const input = parsed.data;

  try {
    await createAssignment(user.id, {
      title: input.title,
      course: input.course,
      // due_date is text; store the ISO date, and null rather than "".
      due_date: input.due_date || null,
      priority: input.priority,
      description: input.description || null,
      status: input.status as AssignmentStatus,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not save the assignment. Try again.' };
    }
    throw error;
  }
}

export async function updateAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Missing assignment id.' };

  const parsed = assignmentSchema.safeParse({
    title: formData.get('title'),
    course: formData.get('course'),
    due_date: formData.get('due_date') ?? '',
    priority: formData.get('priority'),
    description: formData.get('description') ?? '',
    status: formData.get('status') ?? ASSIGNMENT_STATUSES[0],
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  const user = await requireUserOrThrow();
  const input = parsed.data;

  try {
    await updateAssignment(user.id, id, {
      title: input.title,
      course: input.course,
      due_date: input.due_date || null,
      priority: input.priority,
      description: input.description || null,
      status: input.status as AssignmentStatus,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not update the assignment. Try again.' };
    }
    throw error;
  }
}

export async function changeAssignmentStatusAction(
  id: string,
  status: AssignmentStatus,
): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await changeStatusRepo(user.id, id, status);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not move the assignment.' };
    }
    throw error;
  }
}

export async function deleteAssignmentAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteAssignment(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not delete the assignment.' };
    }
    throw error;
  }
}

export async function undoDeleteAssignmentAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreAssignment(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not restore the assignment.' };
    }
    throw error;
  }
}