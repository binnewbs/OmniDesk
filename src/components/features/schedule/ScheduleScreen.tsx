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
import { deleteClassAction, undoDeleteClassAction } from '@/lib/actions/cashflow';
import { WeekGrid, DayGrid } from './WeekGrid';
import { ClassModal } from './ClassModal';
import s from './WeekGrid.module.css';
import type { ScheduleClass } from '@/types/domain';

type ViewMode = 'week' | 'day';

export function ScheduleScreen({ classes }: { classes: ScheduleClass[] }) {
  const router = useRouter();
  const { show } = useToast();

  const [mode, setMode] = useState<ViewMode>('week');
  // Defaults to the current weekday; on a weekend there is no column to show.
  const [day, setDay] = useState<string>(currentWeekday() ?? WEEKDAYS[0]);
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
            value={day}
            onChange={(e) => setDay(e.target.value)}
            options={WEEKDAYS}
          />
          {classes.some((c) => normalizeDay(c.day) === day) ? null : (
            <span className="t-muted">No classes on {day}</span>
          )}
        </div>
      )}

      {mode === 'week' ? (
        <WeekGrid classes={classes} onOpen={open} />
      ) : (
        <DayGrid classes={classes} day={day} onOpen={open} />
      )}

      <ClassModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          router.refresh();
        }}
        klass={active}
        onDelete={active ? onDelete : undefined}
        deleting={deleting}
      />
    </main>
  );
}