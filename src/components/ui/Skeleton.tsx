interface SkeletonProps {
  variant?: 'line' | 'card' | 'avatar' | 'block';
  width?: string | number;
  height?: string | number;
  radius?: string;
}

/**
 * The one exception to "no inline styles" is a dynamic size CSS cannot know
 * (a skeleton whose width depends on its position in a list).
 */
export function Skeleton({ variant = 'line', width, height, radius }: SkeletonProps) {
  const defaults = {
    line: { width: width ?? '100%', height: height ?? 12 },
    card: { width: width ?? '100%', height: height ?? 90 },
    avatar: { width: width ?? 32, height: height ?? 32, radius: 'var(--radius-full)' },
    block: { width: width ?? '100%', height: height ?? '100%' },
  }[variant];

  return (
    <div
      className="skeleton"
      aria-hidden
      style={{
        width: defaults.width,
        height: defaults.height,
        ...(defaults.radius || radius ? { borderRadius: defaults.radius ?? radius } : null),
      }}
    />
  );
}

