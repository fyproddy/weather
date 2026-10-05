import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AdsCsvError, decodeReport, parseAdsReport, parseDate, parseDateRange, parseNumber } from "@/lib/ads-csv";

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, "utf8");

describe("parseNumber", () => {
  it.each([
    ["1,234.50", 1234.5],
    ["R 1 234.50", 1234.5],
    ["R1,234.50", 1234.5],
    ["1.234,50", 1234.5],
    ["2,000", 2000],
    ["3,5", 3.5],
    ["45.50%", 0.455],
    ["0.00", 0],
    ["1.234.567", 1234567],
    ["-12.5", -12.5],
  ])("%s → %s", (raw, expected) => {
    expect(parseNumber(raw).value).toBeCloseTo(expected, 6);
  });

  it("treats blanks and dashes as missing, and ranges as bounds", () => {
    expect(parseNumber("--").value).toBeNull();
    expect(parseNumber("").value).toBeNull();
    expect(parseNumber("< 10%")).toEqual({ value: null, bound: true });
    expect(parseNumber("> 90%")).toEqual({ value: null, bound: true });
  });
});

describe("parseDate", () => {
  it.each([
    ["2026-09-01", "2026-09-01"],
    ["2026/9/1", "2026-09-01"],
    ["Sep 1, 2026", "2026-09-01"],
    ["September 1, 2026", "2026-09-01"],
    ["Sept 1, 2026", "2026-09-01"],
    ["1 Sep 2026", "2026-09-01"],
    ["1 September 2026", "2026-09-01"],
    ["Tue, Sep 1, 2026", "2026-09-01"],
  ])("%s", (raw, expected) => expect(parseDate(raw)).toBe(expected));

  it("rejects impossible or ambiguous dates", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("01/09/2026")).toBeNull();
    expect(parseDate("nonsense")).toBeNull();
  });

  it("parses report date-range lines", () => {
    expect(parseDateRange("September 1, 2026 - September 30, 2026")).toEqual(["2026-09-01", "2026-09-30"]);
    expect(parseDateRange("1 September 2026 – 30 September 2026")).toEqual(["2026-09-01", "2026-09-30"]);
    expect(parseDateRange("Campaign report")).toBeNull();
  });
});

describe("parseAdsReport — daily export", () => {
  const report = parseAdsReport(fixture("ads-daily.csv"));

  it("reads the period, currency and campaign rows, skipping totals", () => {
    expect(report.daily).toBe(true);
    expect(report.periodStart).toBe("2026-09-01");
    expect(report.periodEnd).toBe("2026-09-03");
    expect(report.currency).toBe("ZAR");
    expect(report.rows).toHaveLength(4);
    expect(report.rows.some((r) => r.campaignName.startsWith("Total"))).toBe(false);
  });

  it("keeps the raw numbers exactly", () => {
    const first = report.rows.find((r) => r.periodStart === "2026-09-01" && r.campaignName.startsWith("Waterproofing"))!;
    expect(first).toMatchObject({ cost: 1234.5, impressions: 2000, clicks: 80, conversions: 4, budget: 500, campaignStatus: "Enabled" });
    expect(first.searchImpressionShare).toBeCloseTo(0.455, 4);
    const total = report.rows.reduce((s, r) => s + r.cost, 0);
    expect(total).toBeCloseTo(2634.75, 2); // matches the file's own Total row
  });

  it("leaves bounded impression share blank and says so", () => {
    const sep2 = report.rows.find((r) => r.periodStart === "2026-09-02")!;
    expect(sep2.searchImpressionShare).toBeNull();
    expect(report.warnings.join(" ")).toMatch(/range/);
  });
});

describe("parseAdsReport — other export shapes", () => {
  it("reads Google's UTF-16 tab-separated 'Excel CSV'", () => {
    const text = fixture("ads-daily.csv").replace(/"([^"]*)"/g, (_, v) => v.replace(/,/g, "")).replace(/,/g, "\t");
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
    const report = parseAdsReport(decodeReport(new Uint8Array(buf)));
    expect(report.rows).toHaveLength(4);
    expect(report.rows.reduce((s, r) => s + r.cost, 0)).toBeCloseTo(2634.75, 2);
  });

  it("uses the date-range line for a report without a Day column", () => {
    const csv = `Campaign report\n"September 1, 2026 - September 30, 2026"\nCampaign,Cost,Impr.,Clicks,Conversions\nA,"1,000.00",500,20,2\nB,250.00,100,5,0\n`;
    const report = parseAdsReport(csv);
    expect(report.daily).toBe(false);
    expect(report.rows.map((r) => [r.periodStart, r.periodEnd])).toEqual([
      ["2026-09-01", "2026-09-30"],
      ["2026-09-01", "2026-09-30"],
    ]);
  });

  it("refuses a non-daily report with no dates unless dates are supplied", () => {
    const csv = `Campaign,Cost,Impr.,Clicks\nA,10,100,5\n`;
    expect(() => parseAdsReport(csv)).toThrow(AdsCsvError);
    const report = parseAdsReport(csv, { fallbackPeriod: ["2026-08-01", "2026-08-31"] });
    expect(report.periodStart).toBe("2026-08-01");
  });

  it("adds together rows split by another segment such as device", () => {
    const csv = `Day,Campaign,Device,Cost,Impr.,Clicks,Conversions,Search impr. share\n2026-09-01,A,Mobile,100,800,40,2,40%\n2026-09-01,A,Computers,50,200,10,1,50%\n`;
    const report = parseAdsReport(csv);
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ cost: 150, impressions: 1000, clicks: 50, conversions: 3 });
    // eligible = 800/0.4 + 200/0.5 = 2400 → 1000/2400
    expect(report.rows[0].searchImpressionShare).toBeCloseTo(0.4167, 4);
    expect(report.warnings.join(" ")).toMatch(/split by another segment/);
  });

  it("explains what's wrong with files that aren't campaign reports", () => {
    expect(() => parseAdsReport("name,email\nBob,bob@x.com\n")).toThrow(/column headings/);
    expect(() => parseAdsReport("Campaign,Cost,Clicks\nA,1,2\n")).toThrow(/Impr/);
    expect(() => parseAdsReport("Day,Campaign,Cost,Impr.,Clicks\n")).toThrow(/no campaign rows/);
  });

  it("rejects a file that mixes currencies", () => {
    const csv = `Day,Campaign,Currency code,Cost,Impr.,Clicks\n2026-09-01,A,ZAR,1,1,1\n2026-09-01,B,USD,1,1,1\n`;
    expect(() => parseAdsReport(csv)).toThrow(/mixes currencies/);
  });

  it("skips unreadable rows with a warning instead of guessing", () => {
    const csv = `Day,Campaign,Cost,Impr.,Clicks\n2026-09-01,A,10,100,5\n01/09/2026,A,10,100,5\n`;
    const report = parseAdsReport(csv);
    expect(report.rows).toHaveLength(1);
    expect(report.warnings.join(" ")).toMatch(/Skipped 1 row/);
  });
});
