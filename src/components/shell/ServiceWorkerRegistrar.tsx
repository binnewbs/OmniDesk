'use client';

import { useEffect } from 'react';

/* Registers the installability worker. Production only: under `next dev` a
   worker interferes with HMR and stale registrations are a pain to clear. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* Not fatal — the app still works as a normal website. */
    });
  }, []);

  return null;
}
