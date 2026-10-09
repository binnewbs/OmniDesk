'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `onSuccess` exactly once per successful submission.
 *
 * The obvious version of this — an effect keyed on `state.ok` — misfires,
 * because the callback a modal receives is usually an inline arrow, so its
 * identity changes on every render of the parent. That re-runs the effect, and
 * since `state.ok` stays true after a submit, every re-render fires the
 * success path again: one "Add class" produces three toasts.
 *
 * The ref makes the success path idempotent, so it does not depend on the caller
 * memoizing its callbacks. Pair it with conditional rendering of the modal (so
 * the component unmounts on close and `useActionState` resets) — otherwise the
 * stale `ok` from a previous submission survives and fires on the next open.
 */
export function useSubmitFeedback(
  state: { ok: boolean },
  pending: boolean,
  onSuccess: () => void,
): void {
  const handled = useRef(false);

  // A failed submission re-arms the hook, so a retry that succeeds is handled.
  useEffect(() => {
    if (!state.ok) handled.current = false;
  }, [state.ok]);

  useEffect(() => {
    if (!state.ok || pending || handled.current) return;
    handled.current = true;
    onSuccess();
  }, [state.ok, pending, onSuccess]);
}