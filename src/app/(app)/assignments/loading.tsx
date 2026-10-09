import { Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page">
      <div className="page-header">
        <div className="page-header__text">
          <Skeleton width={180} height={28} />
          <Skeleton width={280} height={14} />
        </div>
        <div className="page-header__actions">
          <Skeleton width={120} height={40} radius="var(--radius-full)" />
          <Skeleton width={100} height={40} radius="var(--radius-full)" />
        </div>
      </div>

      <div className="grid grid--3">
        {[0, 1, 2].map((col) => (
          <section key={col} className="card">
            <Skeleton width={100} height={14} />
            <Skeleton variant="card" height={96} />
            <Skeleton variant="card" height={96} />
          </section>
        ))}
      </div>
    </main>
  );
}