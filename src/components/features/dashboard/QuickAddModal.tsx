'use client';

import { Calendar, ClipboardList, StickyNote, Wallet } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TransactionModal } from '@/components/features/cashflow/TransactionModal';
import { AssignmentModal } from '@/components/features/assignments/AssignmentModal';
import { ClassModal } from '@/components/features/schedule/ClassModal';
import { createNoteAction } from '@/lib/actions/notes';
import { IconTile } from '@/components/ui/IconTile';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export type QuickAddKind = 'chooser' | 'transaction' | 'assignment' | 'class' | 'note';

const CHOICES: { kind: QuickAddKind; label: string; hint: string; icon: typeof Wallet }[] = [
  { kind: 'transaction', label: 'Transaction', hint: 'Record income or an expense', icon: Wallet },
  { kind: 'assignment', label: 'Assignment', hint: 'Add a deadline by course', icon: ClipboardList },
  { kind: 'class', label: 'Class', hint: 'Put a class in your timetable', icon: Calendar },
  { kind: 'note', label: 'Note', hint: 'Capture an idea', icon: StickyNote },
];

/**
 * Reuses each feature's own form rather than duplicating it, so there is one
 * implementation of every field in the app.
 */
export function QuickAddModal({
  kind,
  onKindChange,
  onDone,
}: {
  kind: QuickAddKind | null;
  onKindChange: (kind: QuickAddKind | null) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();

  const close = () => {
    onKindChange(null);
    onDone();
  };

  const onNewNote = async () => {
    const result = await createNoteAction(null);
    close();
    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not create a note.' });
      return;
    }
    // Notes live in their own screen with a full editor, so send them there.
    router.push('/notes');
  };

  return (
    <>
      <Modal
        open={kind === 'chooser'}
        onClose={() => onKindChange(null)}
        title="Quick add"
        width={420}
      >
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          {CHOICES.map(({ kind: choice, label, hint, icon }) => (
            <button
              key={choice}
              type="button"
              className="rowItem rowItem--button"
              onClick={() => (choice === 'note' ? onNewNote() : onKindChange(choice))}
            >
              <span className="rowItem__text" style={{ flexDirection: 'row', gap: 'var(--space-3)', alignItems: 'center' }}>
                <IconTile icon={icon} />
                <span className="rowItem__text">
                  <span className="rowItem__title">{label}</span>
                  <span className="rowItem__meta">{hint}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Each nested form is mounted only while its step is active, so its
          useActionState resets between quick-adds. */}
      {kind === 'transaction' && (
        <TransactionModal open onClose={close} transaction={null} />
      )}

      {kind === 'assignment' && (
        <AssignmentModal open onClose={close} assignment={null} />
      )}

      {kind === 'class' && <ClassModal open onClose={close} klass={null} />}
    </>
  );
}