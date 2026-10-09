'use client';

import { useActionState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { CLASS_THEMES, WEEKDAYS } from '@/lib/constants';
import { currentWeekday } from '@/lib/utils/date';
import {
  createClassAction,
  updateClassAction,
  type ActionState,
} from '@/lib/actions/cashflow';
import type { ScheduleClass } from '@/types/domain';
import s from './WeekGrid.module.css';

const initial: ActionState = { ok: false };

export function ClassModal({
  open,
  onClose,
  klass,
  onDelete,
  deleting = false,
}: {
  open: boolean;
  onClose: () => void;
  klass: ScheduleClass | null;
  /** Only rendered when editing; wired by the screen so the toast can undo. */
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const isEdit = Boolean(klass);
  const { show } = useToast();

  const [createState, createAction, creating] = useActionState(createClassAction, initial);
  const [editState, editAction, editing] = useActionState(updateClassAction, initial);

  const action = isEdit ? editAction : createAction;
  const pending = isEdit ? editing : creating;
  const state = isEdit ? editState : createState;

  useEffect(() => {
    if (!state.ok || pending) return;
    onClose();
    show({ tone: 'success', message: isEdit ? 'Class updated.' : 'Class added.' });
  }, [state.ok, pending, isEdit, onClose, show]);

  const currentTheme = klass?.color_theme ?? CLASS_THEMES[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit class' : 'Add class'}
      footer={
        <>
          {isEdit && onDelete && (
            <Button variant="danger" iconLeft={Trash2} onClick={onDelete} loading={deleting}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="class-form" variant="primary" loading={pending}>
            {isEdit ? 'Save changes' : 'Add class'}
          </Button>
        </>
      }
    >
      <form id="class-form" action={action} className="stack" noValidate>
        {state.message && (
          <div className="alert alert--error" role="alert">
            {state.message}
          </div>
        )}

        <Input
          label="Name"
          name="name"
          defaultValue={klass?.name ?? ''}
          placeholder="Course name"
          required
          error={state.errors?.name}
        />

        <div className="grid grid--2">
          <Input
            label="Start time"
            name="start_time"
            type="time"
            defaultValue={klass?.start_time ?? ''}
            required
            error={state.errors?.start_time}
          />
          <Input
            label="End time"
            name="end_time"
            type="time"
            defaultValue={klass?.end_time ?? ''}
            required
            error={state.errors?.end_time}
          />
        </div>

        <Input
          label="Room"
          name="room"
          defaultValue={klass?.room ?? ''}
          placeholder="Building 4, Room 201"
          error={state.errors?.room}
        />

        <Select
          label="Day"
          name="day"
          defaultValue={klass?.day ?? currentWeekday() ?? WEEKDAYS[0]}
          options={WEEKDAYS}
        />

        <fieldset className={`stack ${s.swatches}`}>
          <legend className="field__label">Color theme</legend>
          <div className={s.swatchRow}>
            {CLASS_THEMES.map((hex) => (
              <label key={hex} className={s.swatch}>
                <input
                  type="radio"
                  name="color_theme"
                  value={hex}
                  // Only pre-select on edit. On create, nothing is checked so
                  // the action auto-assigns the least-used tint.
                  defaultChecked={isEdit && currentTheme.toLowerCase() === hex.toLowerCase()}
                  className="sr-only"
                />
                <span
                  className={s.swatchDot}
                  style={{ background: hex }}
                />
                <span className="sr-only">{hex}</span>
              </label>
            ))}
          </div>
          <span className="field__hint">Leave all unselected to auto-assign the next free color.</span>
        </fieldset>

        {isEdit && <input type="hidden" name="id" value={klass!.id} />}
      </form>
    </Modal>
  );
}