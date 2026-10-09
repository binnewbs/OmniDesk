'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Pill';
import { Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { WEEKDAYS } from '@/lib/constants';
import { currentWeekday, normalizeDay } from '@/lib/utils/date';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { useMounted } from '@/hooks/useMounted';
import { deleteClassAction, undoDeleteClassAction } from '@/lib/actions/cashflow';
import { WeekGrid, DayGrid } from './WeekGrid';
import { ClassModal } from './ClassModal';
import s from './WeekGrid.module.css';
import type { ScheduleClass } from '@/types/domain';

type ViewMode = 'week' | 'day';

export function ScheduleScreen({ classes }: { classes: ScheduleClass[] }) {
  const router = useRouter();
  const { show } = useToast();

  const timezone = useUserTimezone();
  const mounted = useMounted();
  const [mode, setMode] = useState<ViewMode>('week');
  // Defaults to the current weekday; on a weekend there is no column to show.
  // null means "not chosen yet", so the default is derived from the user's zone
  // rather than frozen at mount.
  const [day, setDay] = useState<string | null>(null);
  const activeDay = day ?? (mounted ? (currentWeekday(timezone) ?? WEEKDAYS[0]) : WEEKDAYS[0]);
  const [active, setActive] = useState<ScheduleClass | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    if (!active) return;
    setDeleting(true);
    const result = await deleteClassAction(active.id);
    setDeleting(false);

    if (!result.ok) {
      show({ tone: 'error', message: result.message ?? 'Could not delete this class.' });
      return;
    }
    setModalOpen(false);
    show({
      tone: 'success',
      message: 'Class deleted.',
      action: { label: 'Undo', run: () => undoDeleteClassAction(active.id) },
    });
    router.refresh();
  };

  const open = (klass: ScheduleClass) => {
    setActive(klass);
    setModalOpen(true);
  };

  const onCloseModal = () => {
    setModalOpen(false);
    router.refresh();
  };

  return (
    <main className="page">
      <PageHeader
        title="Schedule"
        subtitle="Weekly class timetable"
        actions={
          <>
            <Chip active={mode === 'week'} onClick={() => setMode('week')}>
              Week
            </Chip>
            <Chip active={mode === 'day'} onClick={() => setMode('day')}>
              Day
            </Chip>
            <Button
              variant="primary"
              onClick={() => {
                setActive(null);
                setModalOpen(true);
              }}
            >
              + Add class
            </Button>
          </>
        }
      />

      {mode === 'day' && (
        <div className={s.dayPicker}>
          <Select
            label=""
            aria-label="Day of week"
            value={activeDay}
            onChange={(e) => setDay(e.target.value)}
            options={WEEKDAYS}
          />
          {classes.some((c) => normalizeDay(c.day) === activeDay) ? null : (
            <span className="t-muted">No classes on {activeDay}</span>
          )}
        </div>
      )}

      {mode === 'week' ? (
        <WeekGrid classes={classes} onOpen={open} />
      ) : (
        <DayGrid classes={classes} day={activeDay} onOpen={open} />
      )}

      {/* Rendered only while open, so useActionState resets between sessions and a
          previous success cannot fire again on the next open. */}
      {modalOpen && (
        <ClassModal
          open
          onClose={onCloseModal}
          klass={active}
          onDelete={active ? onDelete : undefined}
          deleting={deleting}
        />
      )}
    </main>
  );
}