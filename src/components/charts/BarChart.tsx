import s from './BarChart.module.css';

export interface BarChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
  fullLabel?: string;
  showLabel?: boolean;
}

interface BarChartProps {
  data: BarChartDatum[];
  height?: number;
  formatValue: (n: number) => string;
  /**
   * Spoken summary. A screen reader cannot get anything useful from the shapes,
   * so the caller describes what the chart shows in words — for the spending
   * chart that is the period, the total, the average and the peak.
   */
  ariaLabel?: string;
}

const GUTTER = 48; // left axis labels
const PAD_BOTTOM = 24; // x-axis labels
const GAP = 6;
const STUB = 2; // zero bars keep a 2px stub so the baseline stays aligned

/** Rounds up to a readable axis top: 1, 2, 2.5 or 5 times a power of ten. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function BarChart({ data, height = 180, formatValue, ariaLabel }: BarChartProps) {
  const width = 1000; // viewBox units; the svg scales to its container
  const plotHeight = height - PAD_BOTTOM;
  const plotWidth = width - GUTTER;

  const rawMax = data.reduce((m, d) => (d.value > m ? d.value : m), 0);
  const max = niceMax(rawMax);

  const slot = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.max(2, slot - GAP);

  // Without an explicit summary the reader would only get "Bar chart", so the
  // peak bucket is described by default rather than left out.
  const peak = data.reduce<BarChartDatum | null>(
    (best, d) => (best === null || d.value > best.value ? d : best),
    null,
  );
  const described =
    ariaLabel ??
    (peak && peak.value > 0
      ? `${data.length} bars. Highest is ${peak.fullLabel ?? peak.label} at ${formatValue(peak.value)}.`
      : `${data.length} bars, all zero.`);

  return (
    <div className={s.scroll}>
      <svg
        className={s.chart}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={described}
      >
      {/* y-axis labels: max, half, zero */}
      {[0, 0.5, 1].map((fraction) => (
        <text
          key={fraction}
          className={`${s.label} ${s.labelY}`}
          x={GUTTER - 8}
          y={plotHeight * (1 - fraction) + 5}
        >
          {formatValue(max * fraction)}
        </text>
      ))}

      {/* baseline */}
      <line className={s.axis} x1={GUTTER} y1={plotHeight} x2={width} y2={plotHeight} />

      {data.map((d, i) => {
        const barHeight = d.value > 0 ? Math.max(STUB, (d.value / max) * plotHeight) : STUB;
        const x = GUTTER + i * slot + GAP / 2;
        const y = plotHeight - barHeight;
        const cx = GUTTER + i * slot + slot / 2;

        return (
          <g key={`${d.label}-${i}`}>
            <rect
              className={`${s.bar} ${d.highlight ? s.barMax : ''}`}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
            >
              <title>{`${d.fullLabel ?? d.label}: ${formatValue(d.value)}`}</title>
            </rect>

            {/* Text inside SVG is not reliably announced by screen readers, so
                the per-bar detail is carried on an SVG <title> (read on hover)
                and the whole series is summarised by aria-label above. */}
            {d.showLabel && (
              <text className={`${s.label} ${s.labelX}`} x={cx} y={height - 6}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      </svg>
    </div>
  );
}