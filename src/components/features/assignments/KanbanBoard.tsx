'use client';

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { ASSIGNMENT_STATUSES } from '@/lib/constants';
import { normalizeStatus, resolveDropStatus } from '@/lib/utils/assignment';
import { changeAssignmentStatusAction } from '@/lib/actions/assignments';
import { useToast } from '@/components/ui/Toast';
import { KanbanColumn, AssignmentCard } from './KanbanColumn';
import type { Assignment, AssignmentStatus } from '@/types/domain';
import s from './Kanban.module.css';

interface KanbanBoardProps {
  /** Owned by the parent so filters and the active modal stay in one place. */
  assignments: Assignment[];
  /**
   * Reports a status change rather than the whole next array, so the parent can
   * apply it as an optimistic override on the server rows it already holds
   * instead of taking ownership of the list.
   */
  onStatusChange: (id: string, status: AssignmentStatus) => void;
  onOpen: (assignment: Assignment) => void;
}

export function KanbanBoard({ assignments, onStatusChange, onOpen }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { show } = useToast();

  const sensors = useSensors(
    // A small activation distance keeps a click on the card (to edit) from
    // being read as the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const active = assignments.find((a) => a.id === activeId) ?? null;

  const byStatus = (status: AssignmentStatus) =>
    assignments.filter((a) => normalizeStatus(a.status) === status);

  // The board works with normalised statuses, so a column lookup is exact.
  const statusOf = (id: string): AssignmentStatus | null => {
    const found = assignments.find((a) => a.id === id);
    return found ? normalizeStatus(found.status) : null;
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active: dragged, over } = event;
    if (!over) return;

    const id = String(dragged.id);
    const from = statusOf(id);

    // Dropping on a card moves it into that card's column; dropping on the
    // column itself (an empty one, or its header) moves it there directly.
    const to = resolveDropStatus(over.id, statusOf);

    if (!from || !to || from === to) return;

    // Optimistic: the card moves immediately, then the action confirms it. The
    // server rows are the source of truth, so nothing has to be cached here to
    // roll back to — dropping the override is enough to put the card back.
    onStatusChange(id, to);

    const result = await changeAssignmentStatusAction(id, to);
    if (!result.ok) {
      onStatusChange(id, from);
      show({ tone: 'error', message: result.message ?? 'Could not move the assignment.' });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={s.board}>
        {ASSIGNMENT_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            assignments={byStatus(status)}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay>
        {active ? <AssignmentCard assignment={active} overlay draggable={false} /> : null}
      </DragOverlay>
    </DndContext>
  );
}