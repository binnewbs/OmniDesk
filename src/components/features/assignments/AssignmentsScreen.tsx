'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Pill';
import { Dropdown } from '@/components/ui/Dropdown';
import { ASSIGNMENT_PRIORITIES } from '@/lib/constants';
import { normalizeStatus } from '@/lib/utils/assignment';
import { KanbanBoard } from './KanbanBoard';
import { AssignmentModal } from './AssignmentModal';
import type { Assignment } from '@/types/domain';

export function AssignmentsScreen({ initial }: { initial: Assignment[] }) {
  const [course, setCourse] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [active, setActive] = useState<Assignment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  /**
   * The server rows stay authoritative — they are not copied into state, because
   * a `router.refresh()` after a save would otherwise be discarded and the board
   * would keep showing the list from mount time.
   *
   * A drag is the one case that has to feel instant, so the new status is layered
   * on top as an override keyed by id. Once the refreshed props carry that status
   * the override is a no-op, so it self-heals rather than needing a reset; the
   * map is therefore bounded by the number of assignments, not by the number of
   * drags. A failed drag clears its own override, which is the revert.
   */
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const assignments = useMemo(
    () =>
      initial.map((a) =>
        statusOverrides[a.id] !== undefined ? { ...a, status: statusOverrides[a.id] } : a,
      ),
    [initial, statusOverrides],
  );

  const courses = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.course).filter(Boolean))).sort(),
    [assignments],
  );

  // Grouping normalises status, so a legacy row still lands in a column.
  const normalized = useMemo(
    () => assignments.map((a) => ({ ...a, status: normalizeStatus(a.status) })),
    [assignments],
  );

  const visible = useMemo(
    () =>
      normalized.filter(
        (a) =>
          (course === 'all' || a.course === course) &&
          (priority === 'all' || a.priority === priority),
      ),
    [normalized, course, priority],
  );

  const openEdit = (assignment: Assignment) => {
    setActive(assignment);
    setModalOpen(true);
  };

  const openCreate = () => {
    setActive(null);
    setModalOpen(true);
  };

  // Mutations revalidate the server, so pull the authoritative list back in
  // rather than guessing which optimistic rows to keep.
  const onClose = () => {
    setModalOpen(false);
    router.refresh();
  };

  return (
    <main className="page">
      <PageHeader
        title="Assignments"
        subtitle="Track deadlines by course and priority"
        actions={
          <>
            <Chip
              active={course === 'all' && priority === 'all'}
              onClick={() => {
                setCourse('all');
                setPriority('all');
              }}
            >
              All
            </Chip>

            <Dropdown
              value={priority}
              onChange={setPriority}
              width={160}
              items={[
                { value: 'all', label: 'All priorities' },
                ...ASSIGNMENT_PRIORITIES.map((p) => ({ value: p, label: p })),
              ]}
              trigger={(props) => (
                <button {...props} type="button" className="chip">
                  {priority === 'all' ? 'Priority' : priority}
                  <ChevronDown size={16} strokeWidth={2} aria-hidden />
                </button>
              )}
            />

            <Dropdown
              value={course}
              onChange={setCourse}
              width={200}
              items={[
                { value: 'all', label: 'All courses' },
                ...courses.map((c) => ({ value: c, label: c })),
              ]}
              trigger={(props) => (
                <button {...props} type="button" className="chip">
                  {course === 'all' ? 'Course' : course}
                  <ChevronDown size={16} strokeWidth={2} aria-hidden />
                </button>
              )}
            />

            <Button variant="primary" onClick={openCreate}>
              + New
            </Button>
          </>
        }
      />

      <KanbanBoard
        assignments={visible}
        onStatusChange={(id, status) =>
          setStatusOverrides((prev) => ({ ...prev, [id]: status }))
        }
        onOpen={openEdit}
      />

      {/* Rendered only while open so a previous success cannot re-fire on reopen. */}
      {modalOpen && <AssignmentModal open onClose={onClose} assignment={active} />}
    </main>
  );
}