'use client';

import { Wallet, ClipboardList, Calendar, StickyNote, type LucideIcon } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';
import { BrandLockup } from '@/components/ui/BrandLockup';
import s from './AuthSplit.module.css';

const FEATURES: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: Wallet, name: 'Cashflow', description: 'Track income, expenses and subscriptions' },
  { icon: ClipboardList, name: 'Assignments', description: 'Keep deadlines by course and priority' },
  { icon: Calendar, name: 'Schedule', description: 'See your weekly classes at a glance' },
  { icon: StickyNote, name: 'Notes', description: 'Capture ideas in folders and pinned notes' },
];

/**
 * The left half of every auth screen: brand, headline, four feature rows, footer.
 * The right half is the form, passed in as `children`.
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.split}>
      <aside className={s.panel}>
        <BrandLockup className={s.brand} />

        <div className={s.center}>
          <h1 className="t-hero">Everything you need to stay on top of student life.</h1>

          <ul className={s.features}>
            {FEATURES.map(({ icon, name, description }) => (
              <li key={name} className={s.feature}>
                <span className="icon-tile" aria-hidden>
                  <Icon icon={icon} />
                </span>
                <span className={s.featureText}>
                  <span className="t-card">{name}</span>
                  <span className="t-muted">{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <span className={s.footer}>OmniDesk</span>
      </aside>

      <main className={s.form}>
        {/* The left panel is `display: none` under 1024px, so on a phone this is
            the only place the product is identified at all. Hidden above that,
            where the panel already carries the lockup. */}
        <span className={s.mobileBrand}>
          <BrandLockup size={26} />
        </span>
        {children}
      </main>
    </div>
  );
}