export const RANGE_PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["recent_30", "Last 30 days (incl. today)"],
  ["last_7", "Last 7 days"],
  ["last_30", "Last 30 days"],
  ["last_90", "Last 90 days"],
  ["custom", "Custom"],
] as const;
export type RangeKey = (typeof RANGE_PRESETS)[number][0];

export type DateRange = { key: RangeKey; from: string; to: string; days: number; label: string };

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY);
export const daysBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY) + 1;
const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromMs(toMs(s)) === s;

/** Today's date (YYYY-MM-DD) in the agency's time zone. */
export function todayIn(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Resolves URL params into a concrete range. Like Google Ads, "Last N days"
 * ends yesterday. Bad custom input falls back to the last 30 days.
 */
export function resolveRange(params: { range?: unknown; from?: unknown; to?: unknown }, today: string): DateRange {
  const key = RANGE_PRESETS.some(([k]) => k === params.range) ? (params.range as RangeKey) : "last_30";
  const yesterday = addDays(today, -1);
  const make = (k: RangeKey, from: string, to: string): DateRange => ({
    key: k,
    from,
    to,
    days: daysBetween(from, to),
    label: k === "custom" ? `${formatDate(from)} – ${formatDate(to)}` : RANGE_PRESETS.find(([p]) => p === k)![1],
  });
  switch (key) {
    case "today":
      return make(key, today, today);
    case "yesterday":
      return make(key, yesterday, yesterday);
    case "recent_30":
      return make(key, addDays(today, -29), today);
    case "last_7":
      return make(key, addDays(today, -7), yesterday);
    case "last_90":
      return make(key, addDays(today, -90), yesterday);
    case "custom": {
      const { from, to } = params;
      if (isIsoDate(from) && isIsoDate(to) && from <= to && to <= today && daysBetween(from, to) <= 366 * 3) {
        return make("custom", from, to);
      }
      return make("last_30", addDays(today, -30), yesterday);
    }
    default:
      return make("last_30", addDays(today, -30), yesterday);
  }
}

/** The equal-length period immediately before. */
export function previousRange(r: DateRange): { from: string; to: string } {
  return { from: addDays(r.from, -r.days), to: addDays(r.from, -1) };
}

/** True when the union of `periods` covers every day from..to. */
export function isCovered(from: string, to: string, periods: { periodStart: string; periodEnd: string }[]) {
  const sorted = [...periods].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  let cursor = from; // first day not yet covered
  for (const p of sorted) {
    if (p.periodStart > cursor) break;
    if (p.periodEnd >= cursor) cursor = addDays(p.periodEnd, 1);
    if (cursor > to) return true;
  }
  return cursor > to;
}

export function formatDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Query string for a range, for building links. */
export function rangeQuery(r: Pick<DateRange, "key" | "from" | "to">) {
  return r.key === "custom" ? `range=custom&from=${r.from}&to=${r.to}` : `range=${r.key}`;
}
