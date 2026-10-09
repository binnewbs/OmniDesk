'use client';

import { WEEKDAYS } from '@/lib/constants';
import { normalizeDay } from '@/lib/utils/date';
import { classTheme } from '@/lib/utils/schedule';
import s from './WeekGrid.module.css';
import type { ScheduleClass } from '@/types/domain';

export function ClassBlock({
  klass,
  onOpen,
}: {
  klass: ScheduleClass;
  onOpen: (klass: ScheduleClass) => void;
}) {
  return (
    <button
      type="button"
      className={`${s.block} ${classTheme(klass.color_theme)}`}
      onClick={() => onOpen(klass)}
    >
      <span className={s.blockName}>{klass.name}</span>
      <span className={s.blockTime}>
        {klass.start_time} – {klass.end_time}
      </span>
      {klass.room && <span className={s.blockRoom}>{klass.room}</span>}
    </button>
  );
}

/** Mon–Fri only. Weekend values have no column, so they are not rendered. */
export function WeekGrid({
  classes,
  onOpen,
}: {
  classes: ScheduleClass[];
  onOpen: (klass: ScheduleClass) => void;
}) {
  return (
    <div className={`grid grid--5 ${s.grid}`}>
      {WEEKDAYS.map((day) => {
        const dayClasses = classes
          .filter((c) => normalizeDay(c.day) === day)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        return (
          <section key={day} className={s.day} aria-label={day}>
            <h2 className={s.dayTitle}>{day}</h2>

            {dayClasses.length === 0 ? (
              <p className={s.empty}>No classes</p>
            ) : (
              dayClasses.map((klass) => (
                <ClassBlock key={klass.id} klass={klass} onOpen={onOpen} />
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}

/** A single column for the selected weekday, same block styling. */
export function DayGrid({
  classes,
  day,
  onOpen,
}: {
  classes: ScheduleClass[];
  day: string;
  onOpen: (klass: ScheduleClass) => void;
}) {
  const dayClasses = classes
    .filter((c) => normalizeDay(c.day) === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <section className={`${s.day} ${s.dayView}`} aria-label={day}>
      <h2 className={s.dayTitle}>{day}</h2>

      {dayClasses.length === 0 ? (
        <p className={s.empty}>No classes on {day}</p>
      ) : (
        dayClasses.map((klass) => <ClassBlock key={klass.id} klass={klass} onOpen={onOpen} />)
      )}
    </section>
  );
}