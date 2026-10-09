'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  full?: boolean;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

/**
 * Variants are CSS modifier classes, not string merging, so the symmetry rule
 * (height 40, centered text, equal padding) lives in one place in primitives.css.
 */
export function Button({
  variant = 'secondary',
  full = false,
  iconLeft,
  iconRight,
  loading = false,
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const className = [
    'btn',
    `btn--${variant}`,
    full ? 'btn--full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={className} disabled={disabled || loading} {...rest}>
      {loading ? <span className="spinner" aria-hidden /> : iconLeft ? <Icon icon={iconLeft} /> : null}
      {children}
      {!loading && iconRight ? <Icon icon={iconRight} /> : null}
    </button>
  );
}