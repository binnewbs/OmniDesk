'use client';

import { Repeat, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils/date';
import { toNumber } from '@/lib/utils/money';
import type { Subscription } from '@/types/domain';
import s from './SubscriptionsList.module.css';

interface SubscriptionsListProps {
  subscriptions: Subscription[];
  currency: string;
  onAdd: () => void;
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
  onProcess: () => void;
}

export function SubscriptionsList({
  subscriptions,
  currency,
  onAdd,
  onEdit,
  onDelete,
  onProcess,
}: SubscriptionsListProps) {
  return (
    <Card
      header={
        <>
          <h2 className="card__title">Subscriptions</h2>
          <button type="button" className={s.addLink} onClick={onAdd}>
            + Add
          </button>
        </>
      }
    >
      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No subscriptions"
          hint="Add a recurring bill to track it monthly."
        />
      ) : (
        <>
          <div className={s.list}>
            {subscriptions.map((sub) => (
              <div key={sub.id} className={s.item}>
                <button type="button" className={s.itemMain} onClick={() => onEdit(sub)}>
                  <span className={s.itemText}>
                    <span className="rowItem__title truncate-1">{sub.name}</span>
                    <span className="rowItem__meta truncate-1">
                      {sub.category}
                      {' · '}
                      {sub.last_processed
                        ? `last processed ${formatDate(sub.last_processed)}`
                        : `started ${formatDate(sub.start_date)}`}
                    </span>
                  </span>
                  <Pill>{toNumber(sub.amount).toLocaleString('en-US')}</Pill>
                </button>

                <button
                  type="button"
                  className="icon-btn icon-btn--plain"
                  onClick={() => onDelete(sub)}
                  aria-label={`Delete ${sub.name}`}
                >
                  <Trash2 size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            ))}
          </div>

          <div className={s.footer}>
            <Button variant="ghost" iconLeft={Repeat} onClick={onProcess}>
              Process this month
            </Button>
            <span className="t-muted">{currency}</span>
          </div>
        </>
      )}
    </Card>
  );
}