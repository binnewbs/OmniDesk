import { Skeleton } from '@/components/ui/Skeleton';

/** Matches the schedule: five day cards with stacked blocks. */
export default function Loading() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={150} height={28} />
          <Skeleton width={200} height={14} />
        </div>
        <div className="page-header__actions">
          <Skeleton width={80} height={36} radius="var(--radius-full)" />
          <Skeleton width={80} height={36} radius="var(--radius-full)" />
          <Skeleton width={130} height={40} radius="var(--radius-full)" />
        </div>
      </div>

      <div className="grid grid--5">
        {[0, 1, 2, 3, 4].map((day) => (
          <section key={day} className="card">
            <Skeleton width={40} height={14} />
            <Skeleton variant="card" height={80} />
            <Skeleton variant="card" height={80} />
          </section>
        ))}
      </div>
    </main>
  );
}