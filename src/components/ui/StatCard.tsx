interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

/** Label 13px muted, value 26px/600, hint 13px muted pinned to the bottom. */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="card">
      <span className="t-muted">{label}</span>
      <span className="t-stat">{value}</span>
      {hint ? <span className="t-muted">{hint}</span> : <span aria-hidden />}
    </div>
  );
}