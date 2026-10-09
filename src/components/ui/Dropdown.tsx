'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import s from './Dropdown.module.css';

interface DropdownProps {
  /** The control that opens the menu; it receives the a11y props it needs. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    expanded: boolean;
  }) => ReactNode;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  align?: 'start' | 'end';
  width?: number;
}

/**
 * Used for Priority ▾, Course ▾, the currency and the month selector.
 * Closes on outside click and on Escape, which returns focus to the trigger.
 */
export function Dropdown({
  trigger,
  items,
  value,
  onChange,
  align = 'start',
  width = 180,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={s.wrap} ref={wrapRef}>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((v) => !v),
        expanded: open,
      })}

      {open && (
        <ul
          className={`${s.menu} ${align === 'end' ? s.menuEnd : ''}`}
          role="listbox"
          aria-activedescendant={value || undefined}
          style={{ width }}
        >
          {items.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={`${s.item} ${item.value === value ? s.itemActive : ''}`}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The trigger shape used by every filter chip: chip height 36 with a chevron on
 * the right. `text` is what the chip shows, so callers keep control of the
 * placeholder-versus-selection copy.
 */
export function dropdownChipProps(expanded: boolean, onClick: () => void) {
  return {
    'aria-expanded': expanded,
    'aria-haspopup': 'listbox' as const,
    onClick,
  };
}

export function Chevron() {
  return <ChevronDown size={16} strokeWidth={2} aria-hidden />;
}