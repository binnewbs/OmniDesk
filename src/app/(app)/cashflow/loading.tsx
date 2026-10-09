import { Skeleton } from '@/components/ui/Skeleton';

/** Matches the cashflow layout: stats row, chart card, then two cards. */
export default function Loading() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={200} height={28} />
          <Skeleton width={300} height={14} />
        </div>
        <div className="page-header__actions">
          <Skeleton width={120} height={40} radius="var(--radius-full)" />
          <Skeleton width={140} height={40} radius="var(--radius-full)" />
        </div>
      </div>

      <div className="grid grid--3">
        {[0, 1, 2].map((i) => (
          <section key={i} className="card">
            <Skeleton width={100} height={14} />
            <Skeleton width={140} height={30} />
          </section>
        ))}
      </div>

      <section className="card">
        <Skeleton width={260} height={36} radius="var(--radius-full)" />
        <Skeleton variant="block" height={180} />
      </section>

      <div className="row row--2-1">
        <section className="card">
          <Skeleton width={120} height={14} />
          <Skeleton variant="block" height={220} />
        </section>
        <section className="card">
          <Skeleton width={130} height={14} />
          <Skeleton variant="block" height={160} />
        </section>
      </div>
    </main>
  );
}