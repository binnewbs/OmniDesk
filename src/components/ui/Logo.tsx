interface LogoProps {
  /** Rendered square. Defaults to 32, which is the sidebar's row height. */
  size?: number;
  className?: string;
}

/**
 * The 2x2 mark: three filled circles and a dimmed one.
 *
 * Inline JSX rather than an `<img src="/logo.svg">` for the same reason `Icon`
 * is inline — colour comes from CSS, so the mark inherits `currentColor` from
 * whatever text it sits beside and follows the theme with no extra request.
 *
 * The dimmed circle reads `var(--logo-dim)` with the dark-theme `--muted` as its
 * fallback, so the shape is correct even where the token is not defined. It is a
 * real colour rather than an `opacity` on the accent because dimming the accent
 * that way measures 2.15:1 on the light surface, below the 3:1 that WCAG 1.4.11
 * sets for a graphic carrying meaning — `--muted` clears it in both themes.
 *
 * Decorative by default (`aria-hidden`): every place that renders it also shows
 * the product name in text, so announcing it would just repeat itself.
 */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="8" cy="8" r="6" fill="currentColor" />
      <circle cx="24" cy="8" r="6" fill="currentColor" />
      <circle cx="8" cy="24" r="6" fill="currentColor" />
      <circle cx="24" cy="24" r="6" fill="var(--logo-dim, #8b919c)" />
    </svg>
  );
}