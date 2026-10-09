'use client';

import { useActionState, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES } from '@/lib/constants';
import {
  createAssignmentAction,
  deleteAssignmentAction,
  undoDeleteAssignmentAction,
  updateAssignmentAction,
  type ActionState,
} from '@/lib/actions/assignments';
import type { Assignment } from '@/types/domain';

const initial: ActionState = { ok: false };

/**
 * One modal for create and edit. The feature owns the form and the board
 * reuses it, so there is a single implementation of the assignment fields.
 */
export function AssignmentModal({
  open,
  onClose,
  assignment,
}: {
  open: boolean;
  onClose: () => void;
  /** null means "create" */
  assignment: Assignment | null;
}) {
  const isEdit = Boolean(assignment);
  const { show } = useToast();

  const [createState, createAction, creating] = useActionState(createAssignmentAction, initial);
  const [editState, editAction, editing] = useActionState(updateAssignmentAction, initial);
  const [deleting, setDeleting] = useState(false);

  const action = isEdit ? editAction : createAction;
  const pending = isEdit ? editing : creating;
  const state = isEdit ? editState : createState;

  // Close and toast as soon as a save succeeds.
  useEffect(() => {
    if (!state.ok || pending) return;
    onClose();
    show({ tone: 'success', message: isEdit ? 'Assignment updated.' : 'Assignment created.' });
  }, [state.ok, pending, isEdit, onClose, show]);

  const onDelete = async () => {
    if (!assignment) return;
    setDeleting(true);
    const result = await deleteAssignmentAction(assignment.id);
    setDeleting(false);

    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete the assignment.' });
      return;
    }

    onClose();
    show({
      tone: 'success',
      message: 'Assignment deleted.',
      action: { label: 'Undo', run: () => undoDeleteAssignmentAction(assignment.id) },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit assignment' : 'New assignment'}
      footer={
        <>
          {isEdit && (
            <Button variant="danger" iconLeft={Trash2} onClick={onDelete} loading={deleting}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="assignment-form" variant="primary" loading={pending}>
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="assignment-form" action={action} className="stack" noValidate>
        {state.message && (
          <div className="alert alert--error" role="alert">
            {state.message}
          </div>
        )}

        <Input
          label="Title"
          name="title"
          defaultValue={assignment?.title ?? ''}
          placeholder="Assignment title"
          required
          error={state.errors?.title}
        />

        <Input
          label="Course"
          name="course"
          defaultValue={assignment?.course ?? ''}
          placeholder="Course"
          required
          error={state.errors?.course}
        />

        <div className="grid grid--2">
          <Input
            label="Due date"
            name="due_date"
            type="date"
            defaultValue={assignment?.due_date?.slice(0, 10) ?? ''}
            error={state.errors?.due_date}
          />

          <Select
            label="Priority"
            name="priority"
            defaultValue={assignment?.priority ?? ASSIGNMENT_PRIORITIES[1]}
            options={ASSIGNMENT_PRIORITIES}
          />
        </div>

        {isEdit && (
          <Select
            label="Status"
            name="status"
            defaultValue={assignment?.status ?? ASSIGNMENT_STATUSES[0]}
            options={ASSIGNMENT_STATUSES}
          />
        )}

        <Textarea
          label="Description"
          name="description"
          defaultValue={assignment?.description ?? ''}
          placeholder="Add details, links or requirements"
          error={state.errors?.description}
        />

        {/* The id is how the action knows which row to update. */}
        {isEdit && <input type="hidden" name="id" value={assignment!.id} />}
      </form>
    </Modal>
  );
}