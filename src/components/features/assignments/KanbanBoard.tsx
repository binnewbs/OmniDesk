'use client';

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import { ASSIGNMENT_STATUSES } from '@/lib/constants';
import { normalizeStatus } from '@/lib/utils/assignment';
import { changeAssignmentStatusAction } from '@/lib/actions/assignments';
import { useToast } from '@/components/ui/Toast';
import { KanbanColumn, AssignmentCard } from './KanbanColumn';
import type { Assignment, AssignmentStatus } from '@/types/domain';
import s from './Kanban.module.css';

interface KanbanBoardProps {
  /** Owned by the parent so filters and the active modal stay in one place. */
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
  onOpen: (assignment: Assignment) => void;
}

export function KanbanBoard({ assignments, onChange, onOpen }: KanbanBoardProps) {
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
    // Dropping on a card inside a column means "move into that column".
    const overId = String(over.id);
    const to = (overId in ASSIGNMENT_STATUSES ? overId : statusOf(overId)) as AssignmentStatus | null;

    if (!from || !to || from === to) return;

    // Optimistic: the card moves immediately, reverts if the action fails.
    const previous = assignments;
    onChange(assignments.map((a) => (a.id === id ? { ...a, status: to } : a)));

    const result = await changeAssignmentStatusAction(id, to);
    if (!result.ok) {
      onChange(previous);
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
        {active ? <AssignmentCard assignment={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}