'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useModal } from '@/hooks/useModal';
import { NAV_ICONS } from './navIcons';
import { SignOutDialog } from './SignOutDialog';
import s from './BottomNav.module.css';

interface BottomNavProps {
  username: string | null;
  avatar: string | null;
}

/**
 * The desktop rail turns into a bottom bar on phones. The five destinations
 * stay primary; the avatar opens one sheet for everything that lived in the
 * rail's footer (profile, theme, sign out), so no feature becomes unreachable.
 */
export function BottomNav({ username, avatar }: BottomNavProps) {
  const pathname = usePathname();
  const account = useModal();
  const signOut = useModal();

  return (
    <>
      <nav className={s.nav} aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const IconCmp = NAV_ICONS[item.icon];
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={s.item}
              aria-current={active ? 'page' : undefined}
            >
              <span className={s.icon}>
                <Icon icon={IconCmp} size={18} />
              </span>
              <span className={s.label}>{item.shortLabel}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={s.item}
          onClick={account.show}
          aria-haspopup="dialog"
          aria-expanded={account.open}
          aria-current={pathname === '/profile' ? 'page' : undefined}
        >
          <span className={s.icon}>
            <Avatar src={avatar} name={username} size={22} />
          </span>
          <span className={s.label}>Account</span>
        </button>
      </nav>

      <Modal open={account.open} onClose={account.hide} title="Account">
        <Link
          href="/profile"
          className={`rowItem rowItem--button ${s.account}`}
          onClick={account.hide}
        >
          <span className={s.who}>
            <Avatar src={avatar} name={username} size={40} />
            <span className="rowItem__text">
              <span className="rowItem__title">{username ?? 'Profile'}</span>
              <span className="rowItem__meta">View profile</span>
            </span>
          </span>
        </Link>

        <ThemeToggle />

        <button
          type="button"
          className={`railRow ${s.action}`}
          onClick={() => {
            account.hide();
            signOut.show();
          }}
        >
          <span className="railLead">
            <Icon icon={LogOut} />
          </span>
          <span>Sign out</span>
        </button>
      </Modal>

      <SignOutDialog open={signOut.open} onClose={signOut.hide} />
    </>
  );
}
