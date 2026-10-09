import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

/** Every list needs one, so the screen never renders as an unexplained void. */
export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="stack" style={{ alignItems: 'center', padding: 'var(--space-6) 0' }}>
      <span className="icon-tile" aria-hidden>
        <Icon icon={icon} />
      </span>
      <span className="t-card">{title}</span>
      {hint && <span className="t-muted">{hint}</span>}
      {action}
    </div>
  );
}