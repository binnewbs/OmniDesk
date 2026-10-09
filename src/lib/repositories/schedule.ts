import { createClient } from '@/lib/supabase/server';
import { requireContext } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_SCHEDULE } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import { currentWeekday, normalizeDay } from '@/lib/utils/date';
import { CLASS_THEMES } from '@/lib/constants';
import type { ScheduleClass } from '@/types/domain';

const TABLE = 'schedule_classes' as const;

/**
 * `day` is free text, so it is normalised on read and canonical values are
 * written on save. Weekend values have nowhere to render in a Mon–Fri grid.
 */
export async function listClasses(userId: string): Promise<ScheduleClass[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('schedule.list', error);

  return (data ?? [])
    .map((row) => ({ ...row, day: normalizeDay(row.day) ?? row.day.trim().slice(0, 3) }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export interface NewClass {
  name: string;
  room: string;
  day: string;
  start_time: string;
  end_time: string;
  color_theme: string;
}

export async function createClass(userId: string, input: NewClass) {
  const { supabase } = await requireContext();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: createId(),
      user_id: userId,
      name: input.name,
      room: input.room,
      day: input.day,
      start_time: input.start_time,
      end_time: input.end_time,
      color_theme: input.color_theme,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    .select()
    .single();

  if (error) throw new RepositoryError('schedule.create', error);

  await revalidate(AFFECTS_SCHEDULE);
  return data;
}

export async function updateClass(userId: string, id: string, input: NewClass) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('schedule.update', error);

  await revalidate(AFFECTS_SCHEDULE);
  return data;
}

export async function softDeleteClass(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('schedule.softDelete', error);

  await revalidate(AFFECTS_SCHEDULE);
}

export async function restoreClass(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('schedule.restore', error);

  await revalidate(AFFECTS_SCHEDULE);
}

/**
 * Picks the tint the user has used least, so new classes cycle through the four
 * colours instead of piling up on the first one.
 */
export function nextColorTheme(existing: string[]): string {
  const counts = CLASS_THEMES.map((hex) =>
    existing.filter((e) => e.toLowerCase() === hex.toLowerCase()).length,
  );
  const min = Math.min(...counts);
  return CLASS_THEMES[counts.indexOf(min)];
}

/** The dashboard's "Today's classes"; empty on the weekend by design. */
export async function listTodaysClasses(userId: string): Promise<ScheduleClass[]> {
  const today = currentWeekday();
  if (!today) return [];

  const classes = await listClasses(userId);
  return classes.filter((c) => normalizeDay(c.day) === today);
}

