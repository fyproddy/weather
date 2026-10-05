import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { parseAdsReport } from "@/lib/ads-csv";
import {
  AdsImportConflictError,
  adsCoverageFor,
  agencyAdsSummary,
  campaignReport,
  dailySeries,
  deleteAdsImport,
  importAdsReport,
  listAdsImports,
} from "@/server/ads";
import { createClient } from "@/server/clients";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { clientInput } from "@/lib/validation";
import { makeAgency, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const daily = (rows: string, range?: string) =>
  parseAdsReport(`${range ? `"${range}"\n` : ""}Day,Campaign,Currency code,Cost,Impr.,Clicks,Conversions\n${rows}`);
const period = (range: string, rows: string) => parseAdsReport(`"${range}"\nCampaign,Cost,Impr.,Clicks,Conversions\n${rows}`);

async function setup() {
  const ctx = await makeAgency();
  const client = await createClient(db, ctx, clientInput.parse({ name: "WeatherGuard" }));
  return { ctx, client };
}

describe("importing", () => {
  it("stores the fixture exactly and reports per campaign with derived ratios", async () => {
    const { ctx, client } = await setup();
    const report = parseAdsReport(readFileSync("tests/fixtures/ads-daily.csv", "utf8"));
    await importAdsReport(db, ctx, client.id, { filename: "ads.csv", report });

    const campaigns = await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-03");
    const wp = campaigns.find((c) => c.campaignName === "Waterproofing - Johannesburg")!;
    expect(wp).toMatchObject({ cost: 2634.75, impressions: 4400, clicks: 160, conversions: 6, status: "Enabled", budget: 500 });
    expect(wp.ctr).toBeCloseTo(160 / 4400, 6);
    expect(wp.cpc).toBeCloseTo(2634.75 / 160, 6);
    expect(wp.costPerConversion).toBeCloseTo(2634.75 / 6, 6);
    // Sep 2 had "< 10%" (unknown) so only Sep 1 and 3 count: (2000+900)/(2000/.455 + 900/.6)
    expect(wp.searchImpressionShare).toBeCloseTo(2900 / (2000 / 0.455 + 900 / 0.6), 4);

    const series = await dailySeries(db, ctx, client.id, "2026-09-01", "2026-09-03");
    expect(series.map((d) => d.cost)).toEqual([1234.5, 800, 600.25]);
  });

  it("re-importing the same days replaces data instead of doubling it", async () => {
    const { ctx, client } = await setup();
    await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: daily("2026-09-01,A,ZAR,100,10,1,1\n2026-09-02,A,ZAR,100,10,1,1\n") });
    await importAdsReport(db, ctx, client.id, { filename: "b.csv", report: daily("2026-09-02,A,ZAR,250,10,1,1\n2026-09-03,A,ZAR,50,10,1,1\n") });
    const [a] = await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-30");
    expect(a.cost).toBe(400); // 100 (Sep 1) + 250 (Sep 2, replaced) + 50 (Sep 3)
    const coverage = await adsCoverageFor(db, ctx, client.id);
    expect(coverage.map((c) => [c.periodStart, c.periodEnd])).toEqual([
      ["2026-09-01", "2026-09-01"],
      ["2026-09-02", "2026-09-03"],
    ]);
  });

  it("removes a day's campaigns that a newer export no longer lists", async () => {
    const { ctx, client } = await setup();
    await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: daily("2026-09-01,A,ZAR,100,10,1,1\n2026-09-01,B,ZAR,70,10,1,1\n") });
    await importAdsReport(db, ctx, client.id, { filename: "b.csv", report: daily("2026-09-01,A,ZAR,100,10,1,1\n") });
    expect((await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-01")).map((c) => c.campaignName)).toEqual(["A"]);
    // The first import no longer provides anything, so it's cleaned up.
    expect(await listAdsImports(db, ctx, client.id)).toHaveLength(1);
  });

  it("refuses to mix daily and period data over the same dates", async () => {
    const { ctx, client } = await setup();
    await importAdsReport(db, ctx, client.id, { filename: "d.csv", report: daily("2026-09-01,A,ZAR,100,10,1,1\n") });
    await expect(
      importAdsReport(db, ctx, client.id, { filename: "p.csv", report: period("September 1, 2026 - September 30, 2026", "A,999,10,1,1\n") }),
    ).rejects.toBeInstanceOf(AdsImportConflictError);
    expect((await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-30"))[0].cost).toBe(100);
  });

  it("allows replacing an identical period but not an overlapping different one", async () => {
    const { ctx, client } = await setup();
    const sep = "September 1, 2026 - September 30, 2026";
    await importAdsReport(db, ctx, client.id, { filename: "1.csv", report: period(sep, "A,100,10,1,1\n") });
    await importAdsReport(db, ctx, client.id, { filename: "2.csv", report: period(sep, "A,120,10,1,1\n") });
    expect((await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-30"))[0].cost).toBe(120);
    await expect(
      importAdsReport(db, ctx, client.id, { filename: "3.csv", report: period("September 15, 2026 - October 15, 2026", "A,1,1,1,1\n") }),
    ).rejects.toBeInstanceOf(AdsImportConflictError);
  });

  it("rejects a file in a different currency from the client's existing data", async () => {
    const { ctx, client } = await setup();
    await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: daily("2026-09-01,A,ZAR,1,1,1,1\n") });
    await expect(
      importAdsReport(db, ctx, client.id, { filename: "b.csv", report: daily("2026-09-02,A,USD,1,1,1,1\n") }),
    ).rejects.toThrow(/already has data in ZAR/);
  });

  it("removing an import removes its rows and coverage", async () => {
    const { ctx, client } = await setup();
    const imp = await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: daily("2026-09-01,A,ZAR,100,10,1,1\n") });
    await deleteAdsImport(db, ctx, client.id, imp.id);
    expect(await campaignReport(db, ctx, client.id, "2026-09-01", "2026-09-30")).toHaveLength(0);
    expect(await adsCoverageFor(db, ctx, client.id)).toHaveLength(0);
  });
});

describe("permissions and isolation", () => {
  it("viewers can't import; other agencies can't read, import or delete", async () => {
    const { ctx, client } = await setup();
    const viewer = await makeUser(ctx, "viewer");
    const other = await makeAgency("Other");
    const report = daily("2026-09-01,A,ZAR,100,10,1,1\n");
    await expect(importAdsReport(db, viewer, client.id, { filename: "a.csv", report })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(importAdsReport(db, other, client.id, { filename: "a.csv", report })).rejects.toBeInstanceOf(NotFoundError);

    const imp = await importAdsReport(db, ctx, client.id, { filename: "a.csv", report });
    await expect(campaignReport(db, other, client.id, "2026-09-01", "2026-09-30")).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteAdsImport(db, other, client.id, imp.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await agencyAdsSummary(db, other, { from: "2026-09-01", to: "2026-09-30" }, { from: "2026-08-02", to: "2026-08-31" })).toEqual([]);
  });
});

describe("dashboard summary", () => {
  it("only marks a comparison as fair when both periods are fully covered", async () => {
    const { ctx, client } = await setup();
    const rows = [];
    for (let d = 1; d <= 14; d++) rows.push(`2026-09-${String(d).padStart(2, "0")},A,ZAR,${d <= 7 ? 100 : 150},100,10,${d <= 7 ? 1 : 2}`);
    await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: daily(rows.join("\n") + "\n") });

    const [s] = await agencyAdsSummary(db, ctx, { from: "2026-09-08", to: "2026-09-14" }, { from: "2026-09-01", to: "2026-09-07" });
    expect(s.current).toMatchObject({ cost: 1050, conversions: 14 });
    expect(s.previous).toMatchObject({ cost: 700, conversions: 7 });
    expect(s.currentComplete && s.previousComplete).toBe(true);
    expect(s.daily).toHaveLength(7);
    expect(s.currency).toBe("ZAR");

    const [later] = await agencyAdsSummary(db, ctx, { from: "2026-09-10", to: "2026-09-16" }, { from: "2026-09-03", to: "2026-09-09" });
    expect(later.currentComplete).toBe(false); // no data for 15–16 Sep
  });

  it("reports no data honestly for clients without imports", async () => {
    const { ctx } = await setup();
    const [s] = await agencyAdsSummary(db, ctx, { from: "2026-09-01", to: "2026-09-30" }, { from: "2026-08-02", to: "2026-08-31" });
    expect(s).toMatchObject({ current: null, previous: null, currentComplete: false, dataFrom: null });
  });
});
