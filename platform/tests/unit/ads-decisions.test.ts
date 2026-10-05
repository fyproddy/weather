import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { parseAdsReport } from "@/lib/ads-csv";
import { importAdsReport } from "@/server/ads";
import { getAdsAnalysis, setRecommendationDecision } from "@/server/ads-analysis";
import { addService, createClient } from "@/server/clients";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { clientInput } from "@/lib/validation";
import { makeAgency, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

const SEP = { from: "2026-09-01", to: "2026-09-30", days: 30 };
const AUG = { from: "2026-08-02", to: "2026-08-31" };

async function setup() {
  const ctx = await makeAgency();
  const client = await createClient(db, ctx, clientInput.parse({ name: "WeatherGuard", industry: "Waterproofing" }));
  await addService(db, ctx, client.id, { name: "Roof repairs", description: null });
  const range = `"September 1, 2026 - September 30, 2026"\n`;
  for (const csv of [
    `${range}Campaign,Cost,Impr.,Clicks,Conversions\nA,2520,7500,300,12\nB,1780,3000,120,2\nC,1500,2250,90,0\n`,
    `${range}Search term,Campaign,Ad group,Cost,Impr.,Clicks,Conversions\nwaterproofing jobs,A,Core,250,100,12,0\nroof repairs sandton,A,Core,300,200,20,4\n`,
  ]) {
    await importAdsReport(db, ctx, client.id, { filename: "r.csv", report: parseAdsReport(csv) });
  }
  return { ctx, client };
}

describe("analysis over imported data", () => {
  it("produces the expected recommendations from imported reports", async () => {
    const { ctx, client } = await setup();
    const a = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    const ids = a.findings.map((f) => f.id);
    expect(ids).toContain("reallocate_budget:account:b→a");
    expect(ids).toContain("campaign_wasted_spend:campaign:c");
    expect(ids).toContain("search_term_negative:search_term:jobs");
    expect(ids).toContain("search_term_add_keyword:search_term:roof repairs sandton");
    expect(a.fair).toBe(false); // August not imported → no period comparison
  });

  it("remembers decisions, keeps approved items as to-dos, and can undo", async () => {
    const { ctx, client } = await setup();
    const a = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    const neg = a.findings.find((f) => f.id === "search_term_negative:search_term:jobs")!;
    const waste = a.findings.find((f) => f.id === "campaign_wasted_spend:campaign:c")!;
    await setRecommendationDecision(db, ctx, client.id, neg, "approved");
    await setRecommendationDecision(db, ctx, client.id, waste, "dismissed");

    const b = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    expect(b.findings.find((f) => f.id === neg.id)?.decision).toBe("approved");
    expect(b.findings.find((f) => f.id === waste.id)?.decision).toBe("dismissed");

    // Viewing a range where the finding doesn't appear still shows the approved to-do.
    const oct = await getAdsAnalysis(db, ctx, client.id, { from: "2026-10-01", to: "2026-10-30", days: 30 }, SEP);
    expect(oct.carried.map((f) => f.id)).toEqual([neg.id]);

    await setRecommendationDecision(db, ctx, client.id, neg, null);
    const c = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    expect(c.findings.find((f) => f.id === neg.id)?.decision).toBeNull();
  });

  it("viewers can't decide, and other agencies can't see or decide", async () => {
    const { ctx, client } = await setup();
    const viewer = await makeUser(ctx, "viewer");
    const other = await makeAgency("Other");
    const a = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    await expect(setRecommendationDecision(db, viewer, client.id, a.findings[0], "approved")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setRecommendationDecision(db, other, client.id, a.findings[0], "approved")).rejects.toBeInstanceOf(NotFoundError);
    await expect(getAdsAnalysis(db, other, client.id, SEP, AUG)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keyword and search term imports don't disturb campaign data", async () => {
    const { ctx, client } = await setup();
    const a = await getAdsAnalysis(db, ctx, client.id, SEP, AUG);
    expect(a.campaigns.reduce((s, c) => s + c.cost, 0)).toBe(5800);
    expect(a.searchTerms).toHaveLength(2);
  });
});
