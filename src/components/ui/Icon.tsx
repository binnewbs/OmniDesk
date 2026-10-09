import { type LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: 16 | 18;
}

/**
 * Size and color come from CSS, so the JSX carries no styling props.
 * The icons inherit `currentColor` from whatever control they sit in.
 */
export function Icon({ icon: IconCmp, size = 18 }: IconProps) {
  return <IconCmp size={size} strokeWidth={2} aria-hidden />;
}