import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Muted icon in the top-right corner. Sized by the `.stat__icon` rule. */
  icon?: LucideIcon;
}

/** Label 13px muted, value 26px/600, hint 13px muted pinned to the bottom. */
export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="card">
      <div className="stat__top">
        <span className="t-muted">{label}</span>
        {icon ? (
          <span className="stat__icon">
            <Icon icon={icon} />
          </span>
        ) : null}
      </div>

      <span className="t-stat">{value}</span>

      {hint ? <span className="t-muted">{hint}</span> : <span aria-hidden />}
    </div>
  );
}