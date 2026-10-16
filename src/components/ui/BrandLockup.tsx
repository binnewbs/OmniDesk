import { Logo } from './Logo';

interface BrandLockupProps {
  /** Wordmark text. Kept overridable rather than hardcoded for i18n later. */
  label?: string;
  size?: number;
  /**
   * The caller's own class, applied to the **root** so a rule that hides the
   * brand hides the mark with it. The sidebar's collapsed rail relies on this:
   * `[data-sidebar='collapsed'] .brand { display: none }` would otherwise blank
   * the wordmark and leave the logo sitting alone in a 64px rail.
   */
  className?: string;
}

/**
 * Mark + wordmark, as one unit. Both the sidebar and the auth panel show the
 * product name, so the pairing lives once instead of being re-marked-up in each
 * feature.
 *
 * The wordmark is a bare text node rather than a wrapper span, so the caller's
 * class lands on one element and the mark cannot end up outside whatever styles
 * the brand.
 *
 * The mark carries `aria-hidden` (see `Logo`), so the accessible name is the
 * wordmark alone and nothing is announced twice.
 */
export function BrandLockup({ label = 'OmniDesk', size = 22, className }: BrandLockupProps) {
  return (
    <span className={`brandLockup${className ? ` ${className}` : ''}`}>
      <Logo size={size} />
      {label}
    </span>
  );
}