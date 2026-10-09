'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  ClipboardList,
  Calendar,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { signOutAction } from '@/lib/actions/auth';
import s from './Sidebar.module.css';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Wallet,
  ClipboardList,
  Calendar,
  StickyNote,
};

interface SidebarProps {
  username: string | null;
  avatar: string | null;
}

export function Sidebar({ username, avatar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={s.sidebar} aria-label="Main">
      <span className={s.brand}>Productivity</span>

      <ul className={s.nav}>
        {NAV_ITEMS.map((item) => {
          const IconCmp = ICONS[item.icon];
          // Exact match, with a "/" prefix so / and /dashboard agree.
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={s.navItem}
                aria-current={active ? 'page' : undefined}
                title={item.label}
              >
                <Icon icon={IconCmp} />
                <span className={s.navLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={s.footer}>
        <Link href="/profile" className={s.profileLink} title={username ?? 'Profile'}>
          <Avatar src={avatar} name={username} size={32} />
          <span className={s.username}>{username ?? 'Profile'}</span>
        </Link>
        <form action={signOutAction}>
          <button type="submit" className={`t-link ${s.signOut}`}>
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}