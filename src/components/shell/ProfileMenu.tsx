'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Ellipsis, LogOut, User } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useModal } from '@/hooks/useModal';
import { SignOutDialog } from './SignOutDialog';
import s from './ProfileMenu.module.css';

interface ProfileMenuProps {
  username: string | null;
  avatar: string | null;
}

/**
 * The rail's footer used to be three rows — profile, theme, sign out. It is now
 * one row whose click opens those actions as a popover, with the ellipsis
 * spelling out that there is more behind the name.
 *
 * This is a disclosure, not an ARIA menu: the trigger owns `aria-expanded` /
 * `aria-controls` and the panel's items stay in the normal Tab order. A menu
 * role would also promise arrow-key navigation, which three rows do not need.
 */
export function ProfileMenu({ username, avatar }: ProfileMenuProps) {
  const signOut = useModal();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    // The trigger already closes on a second click; this catches clicks on the
    // rest of the page. `mousedown` rather than `click` so the panel closes
    // before the clicked control handles its own event, matching Dropdown.
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div
      className={s.wrap}
      ref={wrapRef}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return;
        e.preventDefault();
        setOpen(false);
        // Focus would otherwise be lost with the panel that held it.
        triggerRef.current?.focus();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`railRow ${s.trigger}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account menu${username ? ` for ${username}` : ''}`}
        title={username ?? 'Account'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="railLead">
          <Avatar src={avatar} name={username} size={32} />
        </span>
        <span className={s.username}>{username ?? 'Profile'}</span>
        {/* Decorative: the whole row is the button, so the dots add no target
            and no name. Collapsed, the rail is avatar-only and this steps aside. */}
        <Ellipsis size={18} strokeWidth={2} aria-hidden className={s.more} />
      </button>

      {open && (
        <div className={s.panel} id={panelId}>
          <Link
            href="/profile"
            className={`railRow ${s.item}`}
            onClick={() => setOpen(false)}
          >
            <span className="railLead">
              <Icon icon={User} />
            </span>
            <span>View profile</span>
          </Link>

          {/* Left as its own component and left open on click: flipping back and
              forth is the point, and the labels are read while it is open. */}
          <ThemeToggle />

          <div className={s.divider} role="none" />

          <button
            type="button"
            className={`railRow ${s.signOut}`}
            onClick={() => {
              setOpen(false);
              signOut.show();
            }}
          >
            <span className="railLead">
              <Icon icon={LogOut} />
            </span>
            <span>Sign out</span>
          </button>
        </div>
      )}

      <SignOutDialog open={signOut.open} onClose={signOut.hide} />
    </div>
  );
}
