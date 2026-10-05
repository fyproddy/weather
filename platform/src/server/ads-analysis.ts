import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { adsRecommendationDecisions } from "@/db/schema";
import { analyse, type Finding } from "@/lib/ads-analysis";
import { isCovered } from "@/lib/date-range";
import { adsCoverageFor, campaignReport, keywordReport, listAdsImports, searchTermReport } from "./ads";
import { audit, getClientProfile } from "./clients";
import { assertRole, type Ctx } from "./permissions";

export type Decision = "approved" | "dismissed" | "done";
export type FindingWithDecision = Finding & { decision: Decision | null; decidedAt: Date | null };

/**
 * Runs the analysis for a client over a range. Findings are recomputed from
 * the imported data every time; stored decisions are merged in by id.
 */
export async function getAdsAnalysis(
  db: Db,
  ctx: Ctx,
  clientId: string,
  range: { from: string; to: string; days: number },
  previous: { from: string; to: string },
) {
  const profile = await getClientProfile(db, ctx, clientId);
  const [campaigns, prevCampaigns, keywords, searchTerms, coverage, kwCoverage, stCoverage, imports, decisions] = await Promise.all([
    campaignReport(db, ctx, clientId, range.from, range.to),
    campaignReport(db, ctx, clientId, previous.from, previous.to),
    keywordReport(db, ctx, clientId, range.from, range.to),
    searchTermReport(db, ctx, clientId, range.from, range.to),
    adsCoverageFor(db, ctx, clientId, "campaigns"),
    adsCoverageFor(db, ctx, clientId, "keywords"),
    adsCoverageFor(db, ctx, clientId, "search_terms"),
    listAdsImports(db, ctx, clientId),
    db.select().from(adsRecommendationDecisions).where(eq(adsRecommendationDecisions.clientId, clientId)),
  ]);

  const currency = imports.find((i) => i.currency)?.currency ?? "ZAR";
  const fair = isCovered(range.from, range.to, coverage) && isCovered(previous.from, previous.to, coverage);
  const findings = analyse({
    currency,
    days: range.days,
    campaigns,
    previousCampaigns: fair ? prevCampaigns : null,
    keywords,
    searchTerms,
    client: {
      name: profile.client.name,
      industry: profile.client.industry,
      services: profile.services.map((s) => [s.name, s.description].filter(Boolean).join(" ")),
      locations: [profile.client.city, profile.client.region, ...profile.locations.map((l) => l.name)].filter(Boolean) as string[],
      verifiedFacts: profile.facts.filter((f) => f.verified).map((f) => f.statement),
    },
  });

  const byId = new Map(decisions.map((d) => [d.fingerprint, d]));
  const withDecisions: FindingWithDecision[] = findings.map((f) => ({
    ...f,
    decision: byId.get(f.id)?.status ?? null,
    decidedAt: byId.get(f.id)?.updatedAt ?? null,
  }));
  // Approved/done items whose finding no longer appears in this range are still to-dos.
  const live = new Set(findings.map((f) => f.id));
  const carried = decisions
    .filter((d) => !live.has(d.fingerprint) && d.status !== "dismissed")
    .map((d) => ({ ...(d.snapshot as Finding), id: d.fingerprint, decision: d.status, decidedAt: d.updatedAt }));

  /** Other periods with data, so the page can point at them when this range has none. */
  const periodsOf = (c: { periodStart: string; periodEnd: string }[]) => c.map((x) => ({ from: x.periodStart, to: x.periodEnd }));
  return {
    currency,
    findings: withDecisions,
    carried,
    campaigns,
    keywords,
    searchTerms,
    fair,
    available: { keywords: periodsOf(kwCoverage), searchTerms: periodsOf(stCoverage) },
  };
}

export async function setRecommendationDecision(
  db: Db,
  ctx: Ctx,
  clientId: string,
  finding: Finding,
  status: Decision | null,
) {
  assertRole(ctx, "manager");
  const profile = await getClientProfile(db, ctx, clientId); // scope check
  if (status === null) {
    await db
      .delete(adsRecommendationDecisions)
      .where(and(eq(adsRecommendationDecisions.clientId, profile.client.id), eq(adsRecommendationDecisions.fingerprint, finding.id)));
  } else {
    await db
      .insert(adsRecommendationDecisions)
      .values({ clientId, fingerprint: finding.id, status, snapshot: finding, decidedById: ctx.userId })
      .onConflictDoUpdate({
        target: [adsRecommendationDecisions.clientId, adsRecommendationDecisions.fingerprint],
        set: { status, snapshot: finding, decidedById: ctx.userId, updatedAt: new Date() },
      });
  }
  await audit(db, ctx, `recommendation.${status ?? "reopened"}`, clientId, { title: finding.title });
}
