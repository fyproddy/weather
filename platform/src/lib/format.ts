// Same separators as the Google Ads UI ("R5,835.50", "3.64%") so figures can be checked side by side.
const LOCALE = "en-US";

export function money(n: number | null | undefined, currency = "ZAR", opts: { compact?: boolean } = {}) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    notation: opts.compact && Math.abs(n) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? (Math.abs(n) >= 10_000 ? 1 : 0) : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
  }).format(n);
}

export function count(n: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, {
    notation: opts.compact && Math.abs(n) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: opts.decimals ?? (Number.isInteger(n) ? 0 : 1),
  }).format(n);
}

export function pct(n: number | null | undefined, decimals = 2) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);
}

/** Relative change, or null when there's nothing fair to compare against. */
export function change(current: number | null | undefined, previous: number | null | undefined) {
  if (current === null || current === undefined || !previous) return null;
  return (current - previous) / previous;
}
