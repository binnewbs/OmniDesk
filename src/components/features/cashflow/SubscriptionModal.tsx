'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  createSubscriptionAction,
  updateSubscriptionAction,
  type ActionState,
} from '@/lib/actions/cashflow';
import type { Subscription } from '@/types/domain';

const initial: ActionState = { ok: false };

export function SubscriptionModal({
  open,
  onClose,
  subscription,
}: {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
}) {
  const isEdit = Boolean(subscription);
  const { show } = useToast();

  const [createState, createAction, creating] = useActionState(createSubscriptionAction, initial);
  const [editState, editAction, editing] = useActionState(updateSubscriptionAction, initial);

  const action = isEdit ? editAction : createAction;
  const pending = isEdit ? editing : creating;
  const state = isEdit ? editState : createState;

  useEffect(() => {
    if (!state.ok || pending) return;
    onClose();
    show({
      tone: 'success',
      message: isEdit ? 'Subscription updated.' : 'Subscription added.',
    });
  }, [state.ok, pending, isEdit, onClose, show]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit subscription' : 'Add subscription'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="subscription-form" variant="primary" loading={pending}>
            {isEdit ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="subscription-form" action={action} className="stack" noValidate>
        {state.message && (
          <div className="alert alert--error" role="alert">
            {state.message}
          </div>
        )}

        <Input
          label="Name"
          name="name"
          defaultValue={subscription?.name ?? ''}
          placeholder="Netflix, Spotify, rent…"
          required
          error={state.errors?.name}
        />

        <Input
          label="Amount"
          name="amount"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          defaultValue={subscription ? String(Number(subscription.amount)) : ''}
          placeholder="0"
          required
          error={state.errors?.amount}
          hint="Subscriptions count as monthly expenses."
        />

        <Input
          label="Category"
          name="category"
          defaultValue={subscription?.category ?? ''}
          placeholder="Entertainment, Housing…"
          required
          error={state.errors?.category}
        />

        <Input
          label="Start date"
          name="start_date"
          type="date"
          defaultValue={
            subscription?.start_date
              ? subscription.start_date.slice(0, 10)
              : new Date().toISOString().slice(0, 10)
          }
          required
          error={state.errors?.start_date}
        />

        {isEdit && <input type="hidden" name="id" value={subscription!.id} />}
      </form>
    </Modal>
  );
}