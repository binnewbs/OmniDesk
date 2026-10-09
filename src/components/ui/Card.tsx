import type { ReactNode } from 'react';
import Link from 'next/link';

interface CardProps {
  title?: string;
  /** A link rendered at the right end of the header, e.g. "View all". */
  action?: { href: string; label: string };
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, action, header, children, className }: CardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`}>
      {(header || title) && (
        <header className="card__header">
          {header ?? <h2 className="card__title">{title}</h2>}
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