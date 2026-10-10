'use client';

import { useEffect, useRef } from 'react';

/**
 * Runs `onSuccess` exactly once per successful submission.
 *
 * Two variants of this get it wrong, so the reasoning is worth keeping:
 *
 *   - An effect keyed on `state.ok` alone misfires, because the callback a
 *     caller passes is usually an inline arrow whose identity changes on every
 *     render of the parent. That re-runs the effect, and since `state.ok` stays
 *     true after a submit, every re-render fires the success path again: one
 *     "Add class" produces three toasts.
 *   - Checking `state.ok` in a submit handler misfires the other way. At the
 *     moment the handler runs, `state` still holds the *previous* submission's
 *     result, so a form that succeeded once reports success on every later
 *     submit, successful or not.
 *
 * So the trigger is the identity of the result object rather than its contents:
 * `useActionState` keeps the same object until the next submission completes, and
 * a completed submission always produces a fresh one. Each result is therefore
 * handled at most once, and repeated successful submissions each fire once,
 * with no dependency on the caller memoizing its callback.
 */
export function useSubmitFeedback(
  state: { ok: boolean },
  pending: boolean,
  onSuccess: () => void,
): void {
  const handled = useRef<typeof state | null>(null);

  useEffect(() => {
    if (!state.ok || pending || handled.current === state) return;
    handled.current = state;
    onSuccess();
  }, [state, pending, onSuccess]);
}