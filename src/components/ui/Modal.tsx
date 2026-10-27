'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import s from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** 'drawer' pins the panel to the right edge, used by the note editor on narrow screens. */
  variant?: 'modal' | 'drawer';
  width?: number;
}

/**
 * One primitive for every form in the app. Esc closes, focus is trapped while
 * open, and the body behind it cannot scroll.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'modal',
  width,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const mounted = useMounted();

  // Callers pass an inline arrow, so `onClose` is a new function on every
  // render. Holding it in a ref keeps it out of the effect below: as a
  // dependency it made the effect re-run on every keystroke in a controlled
  // input, and each re-run stole focus back to the dialog.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so Tab does not walk the page behind it.
    const FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const inScope = (scope: HTMLElement | null | undefined) =>
      Array.from(scope?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );

    // Prefer the body: the close button sits in the header, ahead of the body
    // in DOM order, so focusing "the first focusable" landed on the X instead
    // of the field the dialog exists to fill in.
    const body = panelRef.current?.querySelector<HTMLElement>('[data-modal-body]');
    const first = inScope(body)[0] ?? inScope(panelRef.current)[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = inScope(panelRef.current);
      if (items.length === 0) return;

      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // `mounted`, not `typeof document`: the document exists during hydration, so a
  // modal rendered `open` on first paint would mismatch the server's output.
  if (!open || !mounted) return null;

  return createPortal(
    <div className={s.overlay} onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={variant === 'drawer' ? s.panelDrawer : s.panel}
        style={
          width && variant === 'modal'
            ? ({ '--modal-w': `${width}px` } as CSSProperties)
            : undefined
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={s.header}>
          <h2 className="card__title">{title}</h2>
          <button type="button" className="icon-btn icon-btn--plain" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={s.body} data-modal-body>
          {children}
        </div>

        {footer && <footer className={s.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}