'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Info, Undo2, X } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import s from './Toast.module.css';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  /** Re-issues the deleted row when clicked, within the toast's lifetime. */
  action?: { label: string; run: () => unknown | Promise<unknown> };
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const TOAST_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const mounted = useMounted();
  const router = useRouter();

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_MS),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Gated on `mounted`, not `typeof document`: the document already exists
          during hydration, so that check renders the container on the client and
          nothing on the server, which is a hydration mismatch on every page. */}
      {mounted &&
        createPortal(
          <div className={s.stack} role="status" aria-live="polite">
            {toasts.map((toast) => {
              const ToneIcon = TONE_ICON[toast.tone];
              return (
                <div key={toast.id} className={`${s.toast} ${s[toast.tone]}`}>
                  <ToneIcon size={18} strokeWidth={2} aria-hidden />
                  <span className={s.message}>{toast.message}</span>
                  {toast.action && (
                    <button
                      type="button"
                      className={s.action}
                      onClick={async () => {
                        await toast.action?.run();
                        // Every Undo is a server action that revalidates, which
                        // only marks the server cache stale. Without this the row
                        // is back in the database but still missing from the
                        // list the user is looking at.
                        router.refresh();
                        dismiss(toast.id);
                      }}
                    >
                      <Undo2 size={16} strokeWidth={2} aria-hidden />
                      {toast.action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    className={s.close}
                    onClick={() => dismiss(toast.id)}
                    aria-label="Dismiss notification"
                  >
                    <X size={16} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}