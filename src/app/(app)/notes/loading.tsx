import { Skeleton } from '@/components/ui/Skeleton';

/** Matches the notes layout: a folders card beside pinned + recent grids. */
export default function Loading() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={110} height={28} />
          <Skeleton width={180} height={14} />
        </div>
        <div className="page-header__actions">
          <Skeleton width={120} height={40} radius="var(--radius-full)" />
          <Skeleton width={110} height={40} radius="var(--radius-full)" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        <section className="card" style={{ width: 200, flexShrink: 0 }}>
          <Skeleton width={70} height={14} />
          <Skeleton variant="card" height={36} />
          <Skeleton variant="card" height={36} />
          <Skeleton variant="card" height={36} />
        </section>

        <div className="grid grid--3" style={{ flex: 1 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <section key={i} className="card" style={{ minHeight: 170 }}>
              <Skeleton width={120} height={16} />
              <Skeleton width="90%" height={10} />
              <Skeleton width="70%" height={10} />
              <Skeleton width="45%" height={10} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}