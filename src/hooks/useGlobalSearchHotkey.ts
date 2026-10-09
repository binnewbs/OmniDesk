'use client';

import { useEffect } from 'react';

/**
 * ⌘K / Ctrl+K opens global search. Registered once, at the shell level.
 */
export function useGlobalSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'k') return;
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      onOpen();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}