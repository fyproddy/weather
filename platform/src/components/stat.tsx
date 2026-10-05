import type { ReactNode } from "react";
import { cx } from "./ui";

/**
 * Stat tile: label · value · optional delta vs a named period.
 * `upIsGood` decides the colour; null means neutral (e.g. spend).
 * Direction is always spelled out with an arrow + text, never colour alone.
 */
export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  comparedTo,
  note,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  upIsGood?: boolean | null;
  comparedTo?: string;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {delta !== undefined && delta !== null ? (
        <Delta value={delta} upIsGood={upIsGood} comparedTo={comparedTo} />
      ) : note ? (
        <div className="mt-1 text-xs text-muted">{note}</div>
      ) : null}
    </div>
  );
}

export function Delta({ value, upIsGood, comparedTo }: { value: number; upIsGood: boolean | null; comparedTo?: string }) {
  const flat = Math.abs(value) < 0.005;
  const up = value > 0;
  const tone = flat || upIsGood === null ? "text-muted" : up === upIsGood ? "text-good" : "text-bad";
  const text = flat ? "No change" : `${up ? "Up" : "Down"} ${Math.abs(value * 100).toFixed(Math.abs(value) < 0.1 ? 1 : 0)}%`;
  return (
    <div className={cx("mt-1 flex items-center gap-1 text-xs", tone)}>
      <span aria-hidden>{flat ? "→" : up ? "▲" : "▼"}</span>
      <span>
        {text}
        {comparedTo && <span className="text-muted"> vs {comparedTo}</span>}
      </span>
    </div>
  );
}
