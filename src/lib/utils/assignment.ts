import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES } from '@/lib/constants';
import type { AssignmentStatus } from '@/types/domain';

/**
 * `assignments.status` and `assignments.priority` are free text in the schema,
 * so both are normalised on read: legacy rows still render in a sensible place
 * instead of disappearing.
 *
 * This module has no `server-only` marker because the kanban board needs the
 * same normalisation on the client.
 */

export function normalizeStatus(raw: string | null | undefined): AssignmentStatus {
  const match = ASSIGNMENT_STATUSES.find(
    (s) => s.toLowerCase() === (raw ?? '').trim().toLowerCase(),
  );
  // Anything unrecognised falls into To do rather than vanishing.
  return match ?? ASSIGNMENT_STATUSES[0];
}

export function normalizePriority(raw: string | null | undefined): string {
  const match = ASSIGNMENT_PRIORITIES.find(
    (p) => p.toLowerCase() === (raw ?? '').trim().toLowerCase(),
  );
  return match ?? ASSIGNMENT_PRIORITIES[1]; // Medium
}

/**
 * Works out which column a drop should land in.
 *
 * dnd-kit reports whatever is under the pointer: either a column's own droppable
 * (whose id is a status) or a card inside one (whose id is an assignment id).
 * Both have to resolve, or dropping onto an empty column — the common case —
 * silently does nothing.
 *
 * This uses `.includes`, deliberately: `overId in ASSIGNMENT_STATUSES` would
 * test for array *indices*, so it is false for every status string.
 */
export function resolveDropStatus(
  overId: string | number,
  statusOf: (assignmentId: string) => AssignmentStatus | null,
): AssignmentStatus | null {
  const asStatus = String(overId);

  if ((ASSIGNMENT_STATUSES as readonly string[]).includes(asStatus)) {
    return asStatus as AssignmentStatus;
  }

  return statusOf(asStatus);
}