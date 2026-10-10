import { z } from 'zod';

import { ASSIGNMENT_STATUSES, CURRENCIES } from '@/lib/constants';

/**
 * Schemas for values that reach a server action as plain arguments rather than
 * through a `<form>`.
 *
 * A server action is a public HTTP endpoint: its TypeScript types are erased at
 * the wire, so anything the browser sends is `unknown` in practice. Every id,
 * enum and free-text blob that a client passes positionally gets checked here,
 * otherwise a crafted request writes a status the UI never renders or an
 * unbounded string into a column.
 */

/** `text` primary keys are client-generated UUIDs (PLAN.md §13.3). */
export const idSchema = z.string().trim().min(1, 'Missing id').max(64, 'Invalid id');

export const optionalIdSchema = idSchema.nullable();

export const currencySchema = z.enum(CURRENCIES);

/** `assignments.status` and `.priority` are free text; only these are written. */
export const assignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);

/**
 * The editor autosaves on a debounce, so `content` is written repeatedly
 * without a form. 100k is far past anything a note realistically holds and
 * keeps one abusive request from writing a megabyte per keystroke.
 */
export const noteContentSchema = z.string().max(100_000, 'Note is too long');

/** Folder names come from an inline input rather than a validated form. */
export const folderNameSchema = z
  .string()
  .trim()
  .min(1, 'Folder name is required')
  .max(60, 'Folder name must be at most 60 characters');

export const idParam = (value: unknown): string => idSchema.parse(String(value ?? ''));
export const optionalIdParam = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : idSchema.parse(String(value));