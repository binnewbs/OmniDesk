import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

type Tone = 'default' | 'accent';

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`pill${tone === 'accent' ? ' pill--accent' : ''}`}>{children}</span>;
}

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  iconRight?: LucideIcon;
  children: ReactNode;
}

/** Active state is carried by aria-pressed, which is also what CSS keys off. */
export function Chip({ active = false, iconRight, children, ...rest }: ChipProps) {
  return (
    <button type="button" className="chip" aria-pressed={active} {...rest}>
      {children}
      {iconRight ? <Icon icon={iconRight} size={16} /> : null}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  plain?: boolean;
}

export function IconButton({ icon, label, plain = false, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-btn${plain ? ' icon-btn--plain' : ''}`}
      {...rest}
    >
      <Icon icon={icon} />
    </button>
  );
}