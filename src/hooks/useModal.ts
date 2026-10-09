'use client';

import { useCallback, useState } from 'react';

/**
 * One open/close boolean per modal. Screens with several forms each hold their
 * own instance rather than sharing a single "current modal" string.
 */
export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  return { open, show, hide, toggle, setOpen };
}