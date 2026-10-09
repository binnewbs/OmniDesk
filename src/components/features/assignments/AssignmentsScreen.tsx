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
  const [assignments, setAssignments] = useState(initial);
  const [course, setCourse] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [active, setActive] = useState<Assignment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

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
              trigger={({ ref, onClick, expanded }) => (
                <button
                  ref={ref}
                  type="button"
                  className="chip"
                  aria-expanded={expanded}
                  aria-haspopup="listbox"
                  onClick={onClick}
                >
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
              trigger={({ ref, onClick, expanded }) => (
                <button
                  ref={ref}
                  type="button"
                  className="chip"
                  aria-expanded={expanded}
                  aria-haspopup="listbox"
                  onClick={onClick}
                >
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

      <KanbanBoard assignments={visible} onChange={setAssignments} onOpen={openEdit} />

      <AssignmentModal open={modalOpen} onClose={onClose} assignment={active} />
    </main>
  );
}