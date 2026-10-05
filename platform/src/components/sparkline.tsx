/**
 * Tiny single-series trend line. Server-rendered SVG; each day carries a
 * native tooltip, and the summary is in the aria-label.
 */
export function Sparkline({
  points,
  label,
  format,
}: {
  points: { day: string; value: number }[];
  label: string;
  format: (n: number) => string;
}) {
  if (points.length < 2) return null;
  const w = 160;
  const h = 36;
  const pad = 5;
  const max = Math.max(...points.map((p) => p.value), 0) || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points.at(-1)!;
  const slot = (w - pad * 2) / (points.length - 1);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={`${label}: ${points.length} days, latest ${format(last.value)}, peak ${format(max)}`}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
      {points.map((p, i) => (
        <rect key={p.day} x={x(i) - slot / 2} y={0} width={slot} height={h} fill="transparent">
          <title>{`${p.day}: ${format(p.value)}`}</title>
        </rect>
      ))}
    </svg>
  );
}
