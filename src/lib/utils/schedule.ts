import { CLASS_THEMES } from '@/lib/constants';
import type { ScheduleClass } from '@/types/domain';

/**
 * Maps `schedule_classes.color_theme` to a tint modifier class.
 *
 * `color_theme` is free text, so an unrecognised or missing value falls back to
 * the first tint rather than rendering an uncoloured block.
 */
export function themeIndex(colorTheme: string | null | undefined): number {
  const idx = CLASS_THEMES.findIndex(
    (hex) => hex.toLowerCase() === (colorTheme ?? '').trim().toLowerCase(),
  );
  return Math.max(0, idx);
}

/** The global modifier class that paints a tint; see primitives.css. */
export function classTheme(colorTheme: string | null | undefined): string {
  return `tint--theme${themeIndex(colorTheme) + 1}`;
}

/** The tint modifier for an already-typed class. */
export const themeOf = (klass: Pick<ScheduleClass, 'color_theme'>) =>
  classTheme(klass.color_theme);