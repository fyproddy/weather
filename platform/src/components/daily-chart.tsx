"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = { day: string; value: number | null };

/**
 * One measure over time: a line (with area wash) or columns.
 * Hover / arrow keys show the exact value; the same values are in the
 * "Show as table" view below, so the tooltip never gates information.
 */
export function DailyChart({
  title,
  points,
  kind,
  format,
  currency = "ZAR",
}: {
  title: string;
  points: Point[];
  kind: "line" | "column";
  format: "money" | "count";
  currency?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fmt = useMemo(() => {
    const nf =
      format === "money"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 })
        : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
    return (n: number | null) => (n === null ? "—" : nf.format(n).replace(/\u00a0/g, ""));
  }, [format, currency]);

  const h = 200;
  const m = { top: 12, right: 12, bottom: 26, left: 56 };
  const iw = width - m.left - m.right;
  const ih = h - m.top - m.bottom;
  const max = Math.max(0, ...points.map((p) => p.value ?? 0));
  const ticks = niceTicks(max);
  const top = ticks.at(-1) || 1;
  const slot = iw / Math.max(points.length, 1);
  const cx = (i: number) => m.left + slot * i + slot / 2;
  const cy = (v: number) => m.top + ih - (v / top) * ih;
  const barW = Math.max(2, Math.min(24, slot - 2)); // <=24px, 2px surface gap between neighbours

  // Split at days without data so the line never bridges a gap.
  const segments: number[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    if (i > 0 && points[i - 1].value !== null && segments.length) segments.at(-1)!.push(i);
    else segments.push([i]);
  });
  const xy = (i: number) => `${cx(i).toFixed(1)},${cy(points[i].value!).toFixed(1)}`;
  const linePath = segments.map((seg) => `M${seg.map(xy).join(" L")}`).join(" ");
  const areaPath = segments
    .map((seg) => `M${cx(seg[0])},${cy(0)} L${seg.map(xy).join(" L")} L${cx(seg.at(-1)!)},${cy(0)} Z`)
    .join(" ");
  const labelIdx = points.length <= 1 ? [0] : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const onMove = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect();
    const i = Math.floor((clientX - rect.left - m.left) / slot);
    setActive(i >= 0 && i < points.length ? i : null);
  };

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No daily data in this range.</p>;
  }

  const a = active !== null ? points[active] : null;

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 text-sm font-medium">{title}</figcaption>
      <div
        ref={box}
        className="relative w-full overflow-hidden"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          width={width}
          height={h}
          role="img"
          aria-label={`${title}, ${points.length} days`}
          tabIndex={0}
          className="block focus-visible:outline-2 focus-visible:outline-accent"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? -1) + 1));
            if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length) - 1));
            if (e.key === "Escape") setActive(null);
          }}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={cy(t)} y2={cy(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={m.left - 8} y={cy(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
                {fmt(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i) => (
            <text key={i} x={cx(i)} y={h - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
              {shortDate(points[i].day)}
            </text>
          ))}

          {kind === "line" ? (
            <>
              <path d={areaPath} fill="var(--chart)" opacity={0.1} />
              {segments
                .filter((seg) => seg.length === 1)
                .map((seg) => (
                  <circle key={seg[0]} cx={cx(seg[0])} cy={cy(points[seg[0]].value!)} r={2} fill="var(--chart)" />
                ))}
              <path d={linePath} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {active !== null && (
                <line x1={cx(active)} x2={cx(active)} y1={m.top} y2={m.top + ih} stroke="var(--muted)" strokeWidth={1} />
              )}
              {a?.value !== null && a && (
                <circle cx={cx(active!)} cy={cy(a.value!)} r={4} fill="var(--chart)" stroke="var(--surface)" strokeWidth={2} />
              )}
            </>
          ) : (
            points.map((p, i) =>
              p.value ? (
                <path
                  key={p.day}
                  d={columnPath(cx(i) - barW / 2, cy(p.value), barW, cy(0) - cy(p.value))}
                  fill="var(--chart)"
                  opacity={active === null || active === i ? 1 : 0.55}
                />
              ) : null,
            )
          )}
        </svg>

        {a && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: Math.min(Math.max(cx(active!) - 60, 0), width - 130) }}
          >
            <div className="text-muted">{longDate(a.day)}</div>
            <div className="font-semibold tabular-nums">{fmt(a.value)}</div>
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-left tabular-nums">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-normal">Day</th>
              <th className="py-1 text-right font-normal">{title}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day} className="border-t border-border">
                <td className="py-1">{longDate(p.day)}</td>
                <td className="py-1 text-right">{fmt(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Column with a 4px rounded top and a square base on the baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function niceTicks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw)!;
  const out = [];
  for (let t = 0; t <= max + step * 0.999; t += step) out.push(Math.round(t * 100) / 100);
  return out;
}

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
