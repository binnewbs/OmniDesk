import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  /** A link rendered at the right end of the header, e.g. "View all". */
  action?: { href: string; label: string };
  header?: ReactNode;
  /** A muted Lucide icon before the title, to give the card some identity. */
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, header, icon, children, className }: CardProps) {
  const heading =
    title === undefined ? null : (
      <span className="card__heading">
        {icon && <span className="card__icon">{<Icon icon={icon} size={16} />}</span>}
        <h2 className="card__title">{title}</h2>
      </span>
    );

  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {(header || heading) && (
        <header className="card__header">
          {header ?? heading}
          {action && (
            <Link href={action.href} className="card__link">
              {action.label}
            </Link>
          )}
        </header>
      )}
      {children}
    </section>
  );
}