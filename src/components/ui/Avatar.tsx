import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
}

/** Falls back to initials on --avatar-fill when there is no image. */
export function Avatar({ src, name, size = 32 }: AvatarProps) {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (!src) {
    return (
      <span
        className="avatar"
        style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}
        aria-hidden={!name}
        title={name ?? undefined}
      >
        {initials || <span className="sr-only">No avatar</span>}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={name ? `${name}'s avatar` : 'Avatar'}
      width={size}
      height={size}
      className="avatar"
      style={{ width: size, height: size }}
      unoptimized
    />
  );
}