import type { LucideIcon } from 'lucide-react';
import { Icon } from './Icon';

/** 40px outlined tile, used by the auth feature rows and Quick add. */
export function IconTile({ icon, size = 40 }: { icon: LucideIcon; size?: number }) {
  return (
    <span className="icon-tile" style={{ width: size, height: size }} aria-hidden>
      <Icon icon={icon} />
    </span>
  );
}