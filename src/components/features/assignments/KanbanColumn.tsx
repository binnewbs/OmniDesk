'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pill } from '@/components/ui/Pill';
import { formatCalendarDate, parseDateSafe } from '@/lib/utils/date';
import s from './Kanban.module.css';
import type { Assignment, AssignmentStatus } from '@/types/domain';

export function AssignmentCard({
  assignment,
  overlay = false,
  onOpen,
  draggable = true,
}: {
  assignment: Assignment;
  overlay?: boolean;
  onOpen?: (assignment: Assignment) => void;
  draggable?: boolean;
}) {
  const sortable = useSortable({ id: assignment.id, disabled: !draggable });
  const due = parseDateSafe(assignment.due_date);
  const overdue =
    assignment.status !== 'Done' && due !== null && due.getTime() < startOfTodayMs();

  const className = [
    s.card,
    overlay ? s.cardOverlay : '',
    sortable.isDragging && !overlay ? s.cardDragging : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={className}
      style={
        draggable && !overlay
          ? { transform: CSS.Translate.toString(sortable.transform) }
          : undefined
      }
      {...(draggable
        ? {
            // The whole card is the drag handle; dnd-kit's own listeners cover
            // both pointer and keyboard activation, so a plain click still
            // opens the editor.
            ...sortable.attributes,
            ...sortable.listeners,
            ref: sortable.setNodeRef,
            tabIndex: 0,
            role: 'button',
            'aria-roledescription': 'draggable assignment',
            onClick: () => onOpen?.(assignment),
          }
        : {})}
    >
      <span className={s.cardTitle}>{assignment.title}</span>
      <span className={s.cardCourse}>{assignment.course}</span>

      <div className={s.cardFooter}>
        <span className={`${s.cardDue} ${overdue ? s.cardDueOverdue : ''}`}>
          {formatCalendarDate(assignment.due_date)}
        </span>
        <Pill>{assignment.priority ?? 'Medium'}</Pill>
      </div>
    </article>
  );
}

/** Local midnight today, so "overdue" ignores the time of day. */
function startOfTodayMs(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
}

export function KanbanColumn({
  status,
  assignments,
  onOpen,
}: {
  status: AssignmentStatus;
  assignments: Assignment[];
  onOpen: (assignment: Assignment) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`${s.column} ${isOver ? s.columnOver : ''}`}
      aria-label={status}
    >
      <header className={s.column__header}>
        <h2 className={s.column__title}>{status}</h2>
        <span className={s.column__count}>{assignments.length}</span>
      </header>

      {assignments.length === 0 ? (
        <p className={s.empty}>Nothing here yet</p>
      ) : (
        // Without this context, sortableKeyboardCoordinates cannot find the
        // neighbouring column, so keyboard dragging is confined to one column.
        <SortableContext
          items={assignments.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {assignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} onOpen={onOpen} />
          ))}
        </SortableContext>
      )}
    </section>
  );
}