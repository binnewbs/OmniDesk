'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import s from './Dropdown.module.css';

interface DropdownProps {
  /**
   * The control that opens the menu. It is handed props that are already valid
   * DOM attributes, so `{...props}` onto a `<button>` is safe and is the
   * intended way to use it.
   *
   * The keys are spelled `aria-expanded` and `aria-haspopup` rather than a
   * friendlier `expanded` because this render prop exists precisely to supply
   * wiring the caller cannot be expected to know. Handing out a non-attribute
   * name like `expanded` invited a caller to spread it straight onto the
   * element, which React rejects as an unknown boolean DOM attribute.
   */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'listbox';
  }) => ReactNode;
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  align?: 'start' | 'end';
  width?: number;
}

/** Falls back to the first option when the current value is not in the list. */
function indexOfValue(items: DropdownProps['items'], value: string): number {
  return Math.max(0, items.findIndex((item) => item.value === value));
}

/**
 * Used for Priority ▾, Course ▾, the currency and the month selector.
 *
 * The menu is a listbox with focus left on the trigger and moved with
 * `aria-activedescendant`, which is the ARIA-recommended pattern for a menu that
 * must not steal focus from a chip styled as the control. Arrow keys, Home/End,
 * Enter and Escape are handled; picking an item returns focus to the trigger.
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
  const listId = useId();

  // Which option the arrows are currently on. Kept in state rather than derived
  // from `value` so moving the highlight does not itself change the filter.
  const [activeIndex, setActiveIndex] = useState(() => indexOfValue(items, value));

  // Reopening should start on the current selection, not wherever the arrows
  // happened to be when the menu last closed. Comparing the previous `open`
  // during render is the supported way to reset state on a prop change; doing
  // it in an effect would paint one frame with the stale highlight first.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setActiveIndex(indexOfValue(items, value));
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      onChange(item.value);
      close(true);
    },
    [items, onChange, close],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (items.length === 0) return;

      // Which keys move, rather than moving on every key and letting a later
      // handler undo it.
      const moves: Record<string, number> = {
        ArrowDown: activeIndex + 1,
        ArrowUp: activeIndex - 1,
        Home: 0,
        End: items.length - 1,
      };

      if (e.key in moves) {
        e.preventDefault();
        setActiveIndex((moves[e.key] + items.length) % items.length);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        commit(activeIndex);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, activeIndex, items, close, commit]);

  return (
    <div className={s.wrap} ref={wrapRef}>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((v) => !v),
        'aria-expanded': open,
        'aria-haspopup': 'listbox',
      })}

      {open && (
        <ul
          className={`${s.menu} ${align === 'end' ? s.menuEnd : ''}`}
          role="listbox"
          id={listId}
          aria-activedescendant={items[activeIndex] ? optionId(activeIndex) : undefined}
          style={{ width }}
        >
          {items.map((item, index) => (
            <li key={item.value}>
              <button
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={item.value === value}
                className={`${s.item} ${index === activeIndex ? s.itemActive : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(index)}
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

export function Chevron() {
  return <ChevronDown size={16} strokeWidth={2} aria-hidden />;
}