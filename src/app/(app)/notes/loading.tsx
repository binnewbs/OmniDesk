import { Skeleton } from '@/components/ui/Skeleton';
import s from '@/components/features/notes/NotesLayout.module.css';

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

      {/* Same module the real screen uses, so the skeleton collapses below
          768px exactly as the loaded layout does instead of snapping. */}
      <div className={s.layout}>
        <section className={`card ${s.folders}`}>
          <Skeleton width={70} height={14} />
          <Skeleton variant="card" height={36} />
          <Skeleton variant="card" height={36} />
          <Skeleton variant="card" height={36} />
        </section>

        <div className={`grid grid--3 ${s.gridArea}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <section key={i} className={`card ${s.noteCard}`}>
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