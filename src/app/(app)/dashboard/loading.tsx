import { Skeleton } from '@/components/ui/Skeleton';

/** Matches the dashboard: 4 stat cards, then the 2×2 summary grid. */
export default function Loading() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={240} height={28} />
          <Skeleton width={300} height={14} />
        </div>
        <div className="page-header__actions">
          <Skeleton width={110} height={40} radius="var(--radius-full)" />
          <Skeleton width={140} height={40} radius="var(--radius-full)" />
        </div>
      </div>

      <div className="grid grid--4">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="card">
            <Skeleton width={140} height={14} />
            <Skeleton width={120} height={30} />
            <Skeleton width={110} height={14} />
          </section>
        ))}
      </div>

      <div className="grid grid--split">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="card">
            <Skeleton width={150} height={14} />
            <Skeleton variant="block" height={140} />
          </section>
        ))}
      </div>
    </main>
  );
}