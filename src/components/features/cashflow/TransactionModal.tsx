'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSubmitFeedback } from '@/hooks/useSubmitFeedback';
import { TRANSACTION_TYPES } from '@/lib/constants';
import {
  createTransactionAction,
  updateTransactionAction,
  type ActionState,
} from '@/lib/actions/cashflow';
import type { Transaction } from '@/types/domain';

const initial: ActionState = { ok: false };

/** yyyy-mm-dd, the shape an <input type="date"> expects. */
const toDateInput = (iso: string) => iso.slice(0, 10);

export function TransactionModal({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}) {
  const isEdit = Boolean(transaction);
  const { show } = useToast();

  const [createState, createAction, creating] = useActionState(createTransactionAction, initial);
  const [editState, editAction, editing] = useActionState(updateTransactionAction, initial);

  const action = isEdit ? editAction : createAction;
  const pending = isEdit ? editing : creating;
  const state = isEdit ? editState : createState;

  useSubmitFeedback(state, pending, () => {
    onClose();
    show({ tone: 'success', message: isEdit ? 'Transaction updated.' : 'Transaction added.' });
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit transaction' : 'New transaction'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" variant="primary" loading={pending}>
            {isEdit ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" action={action} className="stack" noValidate>
        {state.message && (
          <div className="alert alert--error" role="alert">
            {state.message}
          </div>
        )}

        <Select
          label="Type"
          name="type"
          defaultValue={transaction?.type ?? TRANSACTION_TYPES[1]}
          options={TRANSACTION_TYPES}
        />

        <Input
          label="Amount"
          name="amount"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          defaultValue={transaction ? String(Number(transaction.amount)) : ''}
          placeholder="0"
          required
          error={state.errors?.amount}
        />

        <Input
          label="Category"
          name="category"
          defaultValue={transaction?.category ?? ''}
          placeholder="Food, rent, textbooks…"
          required
          error={state.errors?.category}
        />

        <Input
          label="Description"
          name="description"
          defaultValue={transaction?.description ?? ''}
          placeholder="Optional note"
          error={state.errors?.description}
        />

        <Input
          label="Date"
          name="date"
          type="date"
          defaultValue={transaction ? toDateInput(transaction.date) : toDateInput(new Date().toISOString())}
          required
          error={state.errors?.date}
        />

        {isEdit && <input type="hidden" name="id" value={transaction!.id} />}
      </form>
    </Modal>
  );
}

