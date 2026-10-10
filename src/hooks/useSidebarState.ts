'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { readSidebar, writeSidebar, type SidebarState } from '@/lib/preferences';

/** Emitted after `writeSidebar` so open subscribers re-read on the next render. */
const EVENT = 'productifku:sidebar-change';

const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
};

// React calls `getServerSnapshot` for both the server render and the hydration
// render, so the first client render necessarily matches the server's markup and
// there is no hydration mismatch. The real value arrives on the first committed
// render, after the root layout's inline script has already sized the rail — so
// nothing visibly jumps.
const getSnapshot = () => readSidebar();
const getServerSnapshot = (): SidebarState => 'expanded';

export function useSidebarState(): [SidebarState, (next: SidebarState) => void] {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // React's Strict Mode remounts components in development and resets <html> to
  // the attributes it manages from JSX, clearing the `data-sidebar` the root
  // layout's inline script set. Re-applying here keeps the toggle button and
  // the rail's width in agreement in dev. A no-op in production, where the
  // script's attribute survives.
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', readSidebar());
  }, []);

  const set = (next: SidebarState) => {
    writeSidebar(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return [state, set];
}
