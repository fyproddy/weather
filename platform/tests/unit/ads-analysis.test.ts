import { describe, expect, it } from "vitest";
import { analyse, stems, type AnalysisInput, type CampaignStat } from "@/lib/ads-analysis";

const camp = (campaignName: string, cost: number, clicks: number, conversions: number | null, extra: Partial<CampaignStat> = {}): CampaignStat => ({
  campaignName,
  cost,
  clicks,
  conversions,
  impressions: clicks * 25,
  status: "Enabled",
  budget: null,
  searchImpressionShare: null,
  ...extra,
});

const base = (over: Partial<AnalysisInput> = {}): AnalysisInput => ({
  currency: "ZAR",
  days: 30,
  campaigns: [],
  previousCampaigns: null,
  keywords: [],
  searchTerms: [],
  client: {
    name: "WeatherGuard",
    industry: "Waterproofing",
    services: ["Liquid rubber waterproofing", "Roof repairs", "Damp proofing"],
    locations: ["Johannesburg"],
    verifiedFacts: ["Free on-site inspection and quote"],
  },
  ...over,
});

const find = (fs: ReturnType<typeof analyse>, rule: string) => fs.filter((f) => f.id.startsWith(rule + ":"));

describe("campaign rules", () => {
  // Account: 12 + 2 + 0 conversions; A is the winner, B expensive, C wastes money.
  const input = base({
    campaigns: [camp("A", 2520, 300, 12), camp("B", 1780, 120, 2), camp("C", 1500, 90, 0)],
  });
  const fs = analyse(input);
  // account CPA = 5800 / 14 = 414.29

  it("recommends reallocating budget with the exact wording and numbers", () => {
    const [r] = find(fs, "reallocate_budget");
    expect(r.why).toBe(
      "A generated 12 conversions at R210.00 each while B generated 2 at R890.00 each. Consider reallocating budget from B to A.",
    );
    expect(r.action?.type).toBe("reallocate_budget");
  });

  it("flags winners, expensive conversions and spend with no conversions", () => {
    expect(find(fs, "campaign_winner").map((f) => f.target)).toEqual(["A"]);
    expect(find(fs, "campaign_high_cpa").map((f) => f.target)).toEqual(["B"]);
    const waste = find(fs, "campaign_wasted_spend");
    expect(waste.map((f) => f.target)).toEqual(["C"]);
    expect(waste[0].why).toContain("R1,500.00 on 90 clicks with no conversions");
    expect(waste[0].why).toContain("R414.29");
  });

  it("orders problems first, then opportunities, then winners", () => {
    const kinds = fs.map((f) => f.kind);
    expect(kinds.indexOf("problem")).toBeLessThan(kinds.indexOf("opportunity"));
    expect(kinds.lastIndexOf("opportunity")).toBeLessThan(kinds.indexOf("winner"));
  });

  it("every finding with an action explains why using money figures", () => {
    for (const f of fs.filter((f) => f.action)) expect(f.why).toMatch(/R[\d,]+\.\d\d/);
  });

  it("suggests more budget only for a winner that is limited", () => {
    const limited = analyse(base({ campaigns: [camp("A", 2520, 300, 12, { budget: 85 }), camp("B", 1780, 120, 2)] }));
    const grow = find(limited, "campaign_room_to_grow");
    expect(grow).toHaveLength(1);
    expect(grow[0].why).toContain("running out of budget");
    const notLimited = analyse(base({ campaigns: [camp("A", 2520, 300, 12, { budget: 500 }), camp("B", 1780, 120, 2)] }));
    expect(find(notLimited, "campaign_room_to_grow")).toHaveLength(0);
  });

  it("flags low CTR and landing-page problems with enough data", () => {
    const fs2 = analyse(
      base({
        campaigns: [
          camp("Good", 3000, 400, 20, { impressions: 8000 }),
          camp("Weak", 3000, 200, 2, { impressions: 20000 }),
        ],
      }),
    );
    expect(find(fs2, "campaign_low_ctr").map((f) => f.target)).toEqual(["Weak"]); // 1% vs 2.14%
    expect(find(fs2, "campaign_low_conv_rate").map((f) => f.target)).toEqual(["Weak"]); // 1% vs 3.67%
  });

  it("stays quiet when there isn't enough data", () => {
    const tiny = analyse(base({ campaigns: [camp("A", 60, 4, 1), camp("B", 40, 3, 0)] }));
    expect(tiny.filter((f) => f.kind === "problem")).toHaveLength(0);
  });

  it("only compares with the previous period when it's provided", () => {
    const now = [camp("A", 3000, 300, 6)];
    expect(find(analyse(base({ campaigns: now })), "campaign_cpa_worsened")).toHaveLength(0);
    const worse = analyse(base({ campaigns: now, previousCampaigns: [camp("A", 3000, 300, 10)] }));
    expect(find(worse, "campaign_cpa_worsened")[0].why).toContain("from R300.00 to R500.00 (67% higher)");
  });
});

describe("conversion tracking", () => {
  it("warns when money is spent and nothing is tracked, and makes no CPA judgements", () => {
    const fs = analyse(base({ campaigns: [camp("A", 3000, 300, null), camp("B", 2000, 100, null)] }));
    expect(find(fs, "no_tracking")).toHaveLength(1);
    expect(find(fs, "campaign_wasted_spend")).toHaveLength(0);
    expect(find(fs, "reallocate_budget")).toHaveLength(0);
  });
});

describe("keyword rules", () => {
  const campaigns = [camp("A", 4000, 400, 10)]; // CPA 400
  const kw = (keyword: string, cost: number, conversions: number, extra = {}) => ({
    keyword,
    matchType: "phrase",
    campaignName: "A",
    adGroupName: "Core",
    status: "Enabled",
    qualityScore: null as number | null,
    cost,
    impressions: 1000,
    clicks: 50,
    conversions,
    ...extra,
  });

  it("suggests pausing a keyword that spends without converting, unless already paused", () => {
    const fs = analyse(base({ campaigns, keywords: [kw("roof leak", 700, 0), kw("roof paint", 900, 0, { status: "Paused" }), kw("cheap fix", 100, 0)] }));
    const pause = find(fs, "keyword_wasted_spend");
    expect(pause.map((f) => f.action?.text)).toEqual(["roof leak"]);
  });

  it("finds winning keywords and low quality scores", () => {
    const fs = analyse(base({ campaigns, keywords: [kw("waterproofing johannesburg", 600, 3), kw("roof coating", 50, 0, { qualityScore: 3 })] }));
    expect(find(fs, "keyword_winner").map((f) => f.target)).toEqual(["waterproofing johannesburg [phrase] · Core"]);
    expect(find(fs, "keyword_low_quality_score")[0].why).toContain("Quality Score 3/10");
  });
});

describe("search term rules", () => {
  const campaigns = [camp("A", 4000, 400, 10)]; // CPA 400
  const st = (searchTerm: string, cost: number, conversions: number, extra = {}) => ({
    searchTerm,
    campaignName: "A",
    adGroupName: "Core",
    addedExcluded: "None",
    impressions: 100,
    clicks: 10,
    cost,
    conversions,
    ...extra,
  });

  it("groups job-seeker searches into one phrase-match negative", () => {
    const fs = analyse(base({ campaigns, searchTerms: [st("waterproofing jobs", 120, 0), st("roofing jobs johannesburg", 80, 0)] }));
    const neg = find(fs, "search_term_negative");
    expect(neg).toHaveLength(1);
    expect(neg[0].action).toMatchObject({ type: "add_negative_keyword", text: "jobs", matchType: "phrase" });
    expect(neg[0].why).toContain("2 searches");
    expect(neg[0].why).toContain("R200.00");
    expect(neg[0].why).toContain("looking for work");
  });

  it("doesn't block 'free' when the client offers something free", () => {
    const fs = analyse(base({ campaigns, searchTerms: [st("free roof inspection", 150, 0)] }));
    expect(find(fs, "search_term_negative")).toHaveLength(0);
    const noFreeOffer = analyse(base({ campaigns, searchTerms: [st("free roof inspection", 150, 0)], client: { ...base().client, verifiedFacts: [] } }));
    expect(find(noFreeOffer, "search_term_negative")[0].action?.text).toBe("free");
  });

  it("suggests exact negatives for expensive unrelated searches but not relevant ones", () => {
    const fs = analyse(
      base({ campaigns, searchTerms: [st("swimming pool builders", 450, 0), st("roof repairs sandton", 450, 0), st("pool fence", 50, 0)] }),
    );
    const neg = find(fs, "search_term_negative");
    expect(neg.map((f) => f.action?.text)).toEqual(["swimming pool builders"]);
    expect(neg[0].action?.matchType).toBe("exact");
  });

  it("ignores already-excluded terms and suggests converting terms as keywords", () => {
    const fs = analyse(
      base({
        campaigns,
        keywords: [],
        searchTerms: [st("diy waterproofing", 300, 0, { addedExcluded: "Excluded" }), st("waterproofing contractors johannesburg", 300, 3)],
      }),
    );
    expect(find(fs, "search_term_negative")).toHaveLength(0);
    expect(find(fs, "search_term_add_keyword")[0].action).toMatchObject({ text: "waterproofing contractors johannesburg", matchType: "exact" });
  });

  it("ids are stable so decisions can be remembered", () => {
    const run = () => analyse(base({ campaigns, searchTerms: [st("waterproofing jobs", 120, 0)] })).map((f) => f.id);
    expect(run()).toEqual(run());
    expect(run()).toContain("search_term_negative:search_term:jobs");
  });
});

it("stems words for matching", () => {
  expect(stems("Roof Repairs & Waterproofing in Johannesburg")).toEqual(["roof", "repair", "waterproof", "johannesburg"]);
});
