'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Pill';
import { Dropdown } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ASSIGNMENT_PRIORITIES } from '@/lib/constants';
import { clearFinishedAssignmentsAction, undoClearAssignmentsAction } from '@/lib/actions/assignments';
import { normalizeStatus } from '@/lib/utils/assignment';
import { KanbanBoard } from './KanbanBoard';
import { AssignmentModal } from './AssignmentModal';
import type { Assignment } from '@/types/domain';

/** Ids already cleared but not yet reflected in the refreshed props. */
const without = (set: ReadonlySet<string>, ids: readonly string[]): ReadonlySet<string> => {
  if (!ids.some((id) => set.has(id))) return set;
  const next = new Set(set);
  for (const id of ids) next.delete(id);
  return next;
};

const withAll = (set: ReadonlySet<string>, ids: readonly string[]): ReadonlySet<string> => {
  const next = new Set(set);
  for (const id of ids) next.add(id);
  return next;
};

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
  const { show } = useToast();

  /**
   * Ids the board stops rendering between a successful clear and the refresh
   * landing, for the same reason as the note grid's `hiddenIds`: the cards
   * leave as soon as the server says yes instead of lingering while the new
   * props arrive. The refresh carries rows that no longer include them, so this
   * only ever covers that gap; the Undo drops the ids so a restored row is not
   * filtered out of the fresh props.
   */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());

  /** The ids a confirmed clear would remove; null keeps the dialog closed. */
  const [pendingClear, setPendingClear] = useState<string[] | null>(null);
  const [clearing, setClearing] = useState(false);

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
          !hiddenIds.has(a.id) &&
          (course === 'all' || a.course === course) &&
          (priority === 'all' || a.priority === priority),
      ),
    [normalized, course, priority, hiddenIds],
  );

  const openEdit = (assignment: Assignment) => {
    setActive(assignment);
    setModalOpen(true);
  };

  const openCreate = () => {
    setActive(null);
    setModalOpen(true);
  };

  /** The board reports the Done column's ids; this dialog is the confirmation. */
  const onClearDone = (ids: string[]) => {
    if (ids.length > 0) setPendingClear(ids);
  };

  const onConfirmClear = async () => {
    const ids = pendingClear;
    if (!ids || ids.length === 0) return;

    setClearing(true);
    const result = await clearFinishedAssignmentsAction(ids);
    setClearing(false);

    // The dialog stays open on failure, so the clear can be retried or
    // cancelled rather than vanishing with only a toast to show for it.
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not clear finished assignments.' });
      return;
    }

    setPendingClear(null);
    setHiddenIds((prev) => withAll(prev, ids));
    // A drag override must not outlive its row: once restored, the card should
    // read its status from the server instead of a keyed-by-id value.
    setStatusOverrides((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });

    show({
      tone: 'success',
      message: `${ids.length} finished assignment${ids.length === 1 ? '' : 's'} cleared.`,
      action: {
        label: 'Undo',
        run: async () => {
          const undo = await undoClearAssignmentsAction(ids);
          // The toast refreshes either way; only a successful restore may put
          // the ids back in play.
          if (undo.ok) setHiddenIds((prev) => without(prev, ids));
        },
      },
    });
    router.refresh();
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
        onClearDone={onClearDone}
      />

      {/* Rendered only while open so a previous success cannot re-fire on reopen. */}
      {modalOpen && <AssignmentModal open onClose={onClose} assignment={active} />}

      {/* Bulk removal gets a second look: assignments have no Trash view, so
          the Undo toast is the only way back. */}
      {pendingClear && (
        <Modal
          open
          onClose={() => setPendingClear(null)}
          title="Clear finished assignments?"
          width={420}
          footer={
            <>
              <Button variant="secondary" onClick={() => setPendingClear(null)} disabled={clearing}>
                Cancel
              </Button>
              <Button variant="danger" iconLeft={Trash2} onClick={onConfirmClear} loading={clearing}>
                Clear
              </Button>
            </>
          }
        >
          <p className="t-body">
            {pendingClear.length} finished assignment{pendingClear.length === 1 ? '' : 's'} will be
            removed from this board. You can undo it right after.
          </p>
        </Modal>
      )}
    </main>
  );
}