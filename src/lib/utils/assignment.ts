import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES } from '@/lib/constants';
import type { PillTone } from '@/components/ui/Pill';
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
 * Splits assignments into the unfinished ones a dashboard should surface and
 * the count of everything, so the card can tell "you have nothing to do" apart
 * from "everything is finished" — two states that look identical once Done rows
 * are hidden.
 *
 * Filtering goes through `normalizeStatus` rather than `=== 'Done'`: status is
 * free text in the schema, so a hand-typed "DONE" has to count as finished and
 * stay out of a list of things still to do.
 */
export function splitByCompletion<T extends { status: string | null }>(
  assignments: readonly T[],
  limit = 3,
): { upcoming: T[]; total: number } {
  const rows = assignments as T[];

  const upcoming = rows
    .filter((a) => normalizeStatus(a.status) !== 'Done')
    .slice(0, Math.max(0, limit));

  return { upcoming, total: rows.length };
}

/**
 * Which pill tone a priority should wear. Shared by the kanban cards and the
 * dashboard's upcoming list so the two cannot disagree about what "High" looks
 * like.
 *
 * Routing through `normalizePriority` means a legacy or hand-typed "HIGH" is
 * still red, even though its *label* is rendered verbatim from the column — the
 * colour is then right for every row, not just the well-formed ones.
 *
 * "Low" deliberately maps to the default tone: no colour. Colouring all three
 * would make Medium shout as loudly as High and spend the signal on the common
 * case instead of the urgent one.
 */
export function priorityTone(raw: string | null | undefined): PillTone {
  switch (normalizePriority(raw)) {
    case 'High':
      return 'high';
    case 'Medium':
      return 'medium';
    default:
      return 'default';
  }
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