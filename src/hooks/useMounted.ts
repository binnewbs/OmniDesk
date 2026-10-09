'use client';

import { useSyncExternalStore } from 'react';

/**
 * False during SSR and during the hydration render, true immediately after.
 *
 * Use this to gate anything that cannot produce identical output on the server
 * and the client — portals especially. `typeof document` does NOT work for that:
 * the document already exists during hydration, so the client's first render
 * disagrees with the server's and React discards the tree.
 *
 * `useSyncExternalStore` is the right primitive here because React calls
 * `getServerSnapshot` for both the server render and the hydration render, so
 * the first client render necessarily matches the server. A `useEffect` plus
 * `setState` reaches the same result but trips the react-hooks compiler rule
 * against calling setState directly in an effect.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}