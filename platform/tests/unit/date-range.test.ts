import { describe, expect, it } from "vitest";
import { isCovered, previousRange, resolveRange, todayIn } from "@/lib/date-range";

const today = "2026-10-05";

describe("resolveRange", () => {
  it("matches Google Ads presets (last N days ends yesterday)", () => {
    expect(resolveRange({ range: "today" }, today)).toMatchObject({ from: "2026-10-05", to: "2026-10-05", days: 1 });
    expect(resolveRange({ range: "yesterday" }, today)).toMatchObject({ from: "2026-10-04", to: "2026-10-04" });
    expect(resolveRange({ range: "last_7" }, today)).toMatchObject({ from: "2026-09-28", to: "2026-10-04", days: 7 });
    expect(resolveRange({ range: "last_30" }, today)).toMatchObject({ from: "2026-09-05", to: "2026-10-04", days: 30 });
    expect(resolveRange({ range: "last_90" }, today)).toMatchObject({ days: 90, to: "2026-10-04" });
    expect(resolveRange({ range: "recent_30" }, today)).toMatchObject({ from: "2026-09-06", to: "2026-10-05", days: 30 });
  });

  it("accepts a valid custom range and falls back on bad input", () => {
    expect(resolveRange({ range: "custom", from: "2026-09-01", to: "2026-09-30" }, today)).toMatchObject({ key: "custom", days: 30 });
    for (const bad of [
      { from: "2026-09-30", to: "2026-09-01" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2026-09-01", to: "2026-12-01" },
      { from: "x", to: "y" },
    ]) {
      expect(resolveRange({ range: "custom", ...bad }, today).key).toBe("last_30");
    }
    expect(resolveRange({ range: "nonsense" }, today).key).toBe("last_30");
  });

  it("gives the previous equal-length period", () => {
    expect(previousRange(resolveRange({ range: "last_7" }, today))).toEqual({ from: "2026-09-21", to: "2026-09-27" });
  });
});

describe("isCovered", () => {
  const p = (periodStart: string, periodEnd: string) => ({ periodStart, periodEnd });
  it("needs every day covered", () => {
    expect(isCovered("2026-09-01", "2026-09-30", [p("2026-09-01", "2026-09-30")])).toBe(true);
    expect(isCovered("2026-09-01", "2026-09-30", [p("2026-09-01", "2026-09-15"), p("2026-09-16", "2026-10-10")])).toBe(true);
    expect(isCovered("2026-09-01", "2026-09-30", [p("2026-09-01", "2026-09-14"), p("2026-09-16", "2026-09-30")])).toBe(false);
    expect(isCovered("2026-09-01", "2026-09-30", [p("2026-09-02", "2026-09-30")])).toBe(false);
    expect(isCovered("2026-09-01", "2026-09-30", [])).toBe(false);
  });
});

it("todayIn uses the agency's time zone", () => {
  // 23:30 UTC on 4 Oct is already 5 Oct in Johannesburg (UTC+2).
  expect(todayIn("Africa/Johannesburg", new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-05");
});
