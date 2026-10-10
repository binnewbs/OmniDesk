'use client';

import { Moon, Sun } from 'lucide-react';
import { toggleTheme } from '@/lib/preferences';
import s from './ThemeToggle.module.css';

/**
 * Flips the app between the dark and light palettes.
 *
 * Both the icon and the label are chosen by CSS rather than React state, on
 * purpose. The stored theme is already applied to <html> by the root layout's
 * inline script before React hydrates, so reading `document` during render here
 * would disagree with the server's markup and trip a hydration mismatch.
 * Letting the stylesheet pick from that same `data-theme` attribute means the
 * row is correct from the first paint and there is no second copy of the value
 * to keep in sync.
 *
 * Exactly one icon and one label are displayed at a time, and they always agree
 * with each other — both are driven by the one attribute.
 *
 * `title` is what a collapsed rail falls back to, since the label is visually
 * hidden there, and it is also the hover tooltip when expanded.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      className={`railRow ${s.toggle}`}
      onClick={toggleTheme}
      title="Switch theme"
    >
      <span className="railLead">
        <Moon size={18} strokeWidth={2} aria-hidden className={s.moon} />
        <Sun size={18} strokeWidth={2} aria-hidden className={s.sun} />
      </span>
      {/* The visible label names the mode being switched *to*, matching the
          icon. Both spans stay in the DOM so the row's width does not change
          when the theme flips. */}
      <span className={s.label}>
        <span className={s.toLight}>Light mode</span>
        <span className={s.toDark}>Dark mode</span>
      </span>
    </button>
  );
}
