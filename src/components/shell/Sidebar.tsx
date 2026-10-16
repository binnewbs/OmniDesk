'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  ClipboardList,
  Calendar,
  StickyNote,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { BrandLockup } from '@/components/ui/BrandLockup';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useModal } from '@/hooks/useModal';
import { useSidebarState } from '@/hooks/useSidebarState';
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
  const confirm = useModal();

  // The stored state lives in localStorage, which the server cannot read, so
  // the first render is always the expanded default and the real value lands on
  // the first committed render. Nothing visibly jumps: the root layout's inline
  // script has already set the matching width on <html> before the first paint.
  const [sidebar, setSidebar] = useSidebarState();
  const collapsed = sidebar === 'collapsed';

  const toggleCollapsed = () => setSidebar(collapsed ? 'expanded' : 'collapsed');

  return (
    <nav className={s.sidebar} aria-label="Main">
      <div className={s.head}>
        {/* Collapsed, `.brand` is `display: none` (Sidebar.module.css), so the
            mark goes with the wordmark and the 36px toggle keeps the whole 64px
            rail to itself — there is not room for both. */}
        <BrandLockup className={s.brand} />
        <button
          type="button"
          className={s.toggle}
          onClick={toggleCollapsed}
          // The rail's collapsed state is the button's expanded state, inverted.
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} />
        </button>
      </div>

      <ul className={s.nav}>
        {NAV_ITEMS.map((item) => {
          const IconCmp = ICONS[item.icon];
          // Exact match, with a "/" prefix so / and /dashboard agree.
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`railRow ${s.navItem}`}
                aria-current={active ? 'page' : undefined}
                title={item.label}
              >
                <span className="railLead">
                  <Icon icon={IconCmp} />
                </span>
                <span className={s.navLabel}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* The footer is three rows of the same shape — `.railRow` with a
          `.railLead` in front — so the rail reads as one aligned list. The
          profile row sits between the two actions because it identifies who is
          signed in, which is what those two actions act on. */}
      <div className={s.footer}>
        <Link
          href="/profile"
          className={`railRow ${s.profileLink}`}
          title={username ?? 'Profile'}
        >
          <span className="railLead">
            <Avatar src={avatar} name={username} size={32} />
          </span>
          <span className={s.username}>{username ?? 'Profile'}</span>
        </Link>

        <ThemeToggle />

        <button
          type="button"
          className={`railRow ${s.signOut}`}
          onClick={confirm.show}
          title="Sign out"
        >
          <span className="railLead">
            <Icon icon={LogOut} />
          </span>
          <span className={s.signOutLabel}>Sign out</span>
        </button>
      </div>

      {/* Signing out is destructive and the click is easy to make by accident on
          a rail this narrow, so it asks first. The real action stays a server
          form: the dialog's confirm button submits it, which keeps sign-out
          working with JS disabled up to the point of the confirmation. */}
      <Modal
        open={confirm.open}
        onClose={confirm.hide}
        title="Sign out?"
        width={420}
        footer={
          <>
            <Button variant="secondary" onClick={confirm.hide}>
              Cancel
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="danger" iconLeft={LogOut}>
                Sign out
              </Button>
            </form>
          </>
        }
      >
        <p className={s.confirmText}>
          You will be signed out of OmniDesk. Any unsaved changes on this
          screen will be lost.
        </p>
      </Modal>
    </nav>
  );
}
