'use client';

import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { BrandLockup } from '@/components/ui/BrandLockup';
import { Icon } from '@/components/ui/Icon';
import { useSidebarState } from '@/hooks/useSidebarState';
import { NAV_ICONS } from './navIcons';
import { ProfileMenu } from './ProfileMenu';
import s from './Sidebar.module.css';

interface SidebarProps {
  username: string | null;
  avatar: string | null;
}

export function Sidebar({ username, avatar }: SidebarProps) {
  const pathname = usePathname();

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
          const IconCmp = NAV_ICONS[item.icon];
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

      {/* One row, not three. The profile row identifies who is signed in, and
          the theme switch and sign out act on that person — so they live behind
          the profile rather than competing with the navigation above them. */}
      <div className={s.footer}>
        <ProfileMenu username={username} avatar={avatar} />
      </div>
    </nav>
  );
}
