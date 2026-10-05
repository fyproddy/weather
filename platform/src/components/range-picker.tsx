"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RANGE_PRESETS, type RangeKey } from "@/lib/date-range";

/** Date range control. Lives in the URL so views are shareable and reload-safe. */
export function RangePicker({ value, from, to, max }: { value: RangeKey; from: string; to: string; max: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [custom, setCustom] = useState(value === "custom");
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const go = (next: Record<string, string>) => {
    const q = new URLSearchParams(params);
    for (const k of ["range", "from", "to"]) q.delete(k);
    for (const [k, v] of Object.entries(next)) q.set(k, v);
    router.push(`${pathname}?${q}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="range">
        Date range
      </label>
      <select
        id="range"
        className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm"
        value={custom ? "custom" : value}
        onChange={(e) => {
          if (e.target.value === "custom") setCustom(true);
          else {
            setCustom(false);
            go({ range: e.target.value });
          }
        }}
      >
        {RANGE_PRESETS.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ range: "custom", from: f, to: t });
          }}
        >
          <input type="date" aria-label="From" className="rounded-lg border border-border bg-surface px-2 py-1 text-sm" value={f} max={t} onChange={(e) => setF(e.target.value)} required />
          <span className="text-sm text-muted">to</span>
          <input type="date" aria-label="To" className="rounded-lg border border-border bg-surface px-2 py-1 text-sm" value={t} min={f} max={max} onChange={(e) => setT(e.target.value)} required />
          <button type="submit" className="rounded-lg border border-border bg-surface px-2.5 py-1 text-sm hover:bg-surface-2">
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
