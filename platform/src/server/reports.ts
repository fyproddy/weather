import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { adDrafts, adsRecommendationDecisions, agencies, clients, reports, type Report } from "@/db/schema";
import { addDays, daysBetween, isCovered } from "@/lib/date-range";
import type { Finding } from "@/lib/ads-analysis";
import { adsCoverageFor, campaignReport, dailySeries, derive, listAdsImports, type AdsTotals } from "./ads";
import { audit, getClient, isUuid } from "./clients";
import { leadStatsByClient, type LeadStats } from "./leads";
import { assertRole, NotFoundError, type Ctx } from "./permissions";

/** Everything a report shows. Frozen at creation; contains no lead names or contact details. */
export type ReportData = {
  version: 1;
  client: { name: string; industry: string | null; area: string | null };
  agencyName: string;
  currency: string;
  period: { from: string; to: string; days: number };
  previous: { from: string; to: string; label: string };
  ads: null | {
    complete: boolean;
    fair: boolean;
    current: AdsTotals;
    previous: AdsTotals | null;
    campaigns: { name: string; cost: number; clicks: number; conversions: number | null; costPerConversion: number | null }[];
    daily: { day: string; cost: number }[];
  };
  leads: { current: LeadStats; previous: LeadStats; costPerLead: number | null; costPerLeadNote: string | null };
  work: { done: { title: string; when: string }[]; approved: { title: string }[]; adLinesApproved: number };
  generatedAt: string;
};

const emptyLeads = (): LeadStats => ({ total: 0, won: 0, lost: 0, open: 0, wonValue: 0, bySource: {} });

/** A full calendar month compares with the month before; any other range with the same number of days before it. */
export function previousPeriod(from: string, to: string) {
  const isMonth = from.endsWith("-01") && addDays(to, 1).endsWith("-01") && from.slice(0, 7) === to.slice(0, 7);
  if (isMonth) {
    const prevEnd = addDays(from, -1);
    const prevStart = `${prevEnd.slice(0, 7)}-01`;
    const label = new Date(`${prevStart}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
    return { from: prevStart, to: prevEnd, label };
  }
  const days = daysBetween(from, to);
  return { from: addDays(from, -days), to: addDays(from, -1), label: `previous ${days} days` };
}

/** Last full calendar month before `today`. */
export function lastMonth(today: string) {
  const end = addDays(`${today.slice(0, 7)}-01`, -1);
  return { from: `${end.slice(0, 7)}-01`, to: end };
}

export async function buildReportData(db: Db, ctx: Ctx, clientId: string, from: string, to: string): Promise<ReportData> {
  const client = await getClient(db, ctx, clientId);
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, ctx.agencyId));
  const prev = previousPeriod(from, to);

  const [campaigns, prevCampaigns, coverage, series, imports, leadNow, leadPrev, decisions, drafts] = await Promise.all([
    campaignReport(db, ctx, clientId, from, to),
    campaignReport(db, ctx, clientId, prev.from, prev.to),
    adsCoverageFor(db, ctx, clientId),
    dailySeries(db, ctx, clientId, from, to),
    listAdsImports(db, ctx, clientId),
    leadStatsByClient(db, ctx, { from, to }, [clientId]),
    leadStatsByClient(db, ctx, prev, [clientId]),
    db.select().from(adsRecommendationDecisions).where(eq(adsRecommendationDecisions.clientId, clientId)),
    db.select({ items: adDrafts.items, createdAt: adDrafts.createdAt }).from(adDrafts).where(eq(adDrafts.clientId, clientId)),
  ]);

  const sum = (rows: typeof campaigns): AdsTotals | null =>
    rows.length === 0
      ? null
      : rows.reduce<AdsTotals>(
          (t, r) => ({
            cost: t.cost + r.cost,
            impressions: t.impressions + r.impressions,
            clicks: t.clicks + r.clicks,
            conversions: r.conversions === null && t.conversions === null ? null : (t.conversions ?? 0) + (r.conversions ?? 0),
            conversionValue: null,
          }),
          { cost: 0, impressions: 0, clicks: 0, conversions: null, conversionValue: null },
        );
  const adsNow = sum(campaigns);
  const complete = isCovered(from, to, coverage);
  const fair = complete && isCovered(prev.from, prev.to, coverage);

  const leads = leadNow.get(clientId) ?? emptyLeads();
  const adsLeads = leads.bySource.google_ads ?? 0;
  const costPerLead = adsNow && complete && adsLeads > 0 ? adsNow.cost / adsLeads : null;

  // Work done: recommendations decided within the period (in the agency's time zone, by date).
  const tz = agency?.timezone ?? "Africa/Johannesburg";
  const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const inPeriod = (d: Date) => dayOf(d) >= from && dayOf(d) <= to;
  const title = (s: unknown) => (s as Finding).title;

  return {
    version: 1,
    client: { name: client.name, industry: client.industry, area: [client.city, client.region].filter(Boolean).join(", ") || null },
    agencyName: agency?.name ?? "",
    currency: imports.find((i) => i.currency)?.currency ?? agency?.currency ?? "ZAR",
    period: { from, to, days: daysBetween(from, to) },
    previous: prev,
    ads: adsNow
      ? {
          complete,
          fair,
          current: adsNow,
          previous: sum(prevCampaigns),
          campaigns: campaigns.slice(0, 10).map((c) => ({
            name: c.campaignName,
            cost: c.cost,
            clicks: c.clicks,
            conversions: c.conversions,
            costPerConversion: derive(c).costPerConversion,
          })),
          daily: series.map((d) => ({ day: d.day, cost: d.cost })),
        }
      : null,
    leads: {
      current: leads,
      previous: leadPrev.get(clientId) ?? emptyLeads(),
      costPerLead,
      costPerLeadNote: adsNow && !complete ? "Google Ads data doesn't cover the whole period." : null,
    },
    work: {
      done: decisions
        .filter((d) => d.status === "done" && inPeriod(d.updatedAt))
        .map((d) => ({ title: title(d.snapshot), when: dayOf(d.updatedAt) })),
      approved: decisions.filter((d) => d.status === "approved").map((d) => ({ title: title(d.snapshot) })),
      adLinesApproved: drafts.filter((d) => inPeriod(d.createdAt)).reduce((n, d) => n + d.items.filter((i) => i.status === "approved").length, 0),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function createReport(db: Db, ctx: Ctx, clientId: string, input: { from: string; to: string; title: string }) {
  assertRole(ctx, "manager");
  const data = await buildReportData(db, ctx, clientId, input.from, input.to);
  const [report] = await db
    .insert(reports)
    .values({ clientId, createdById: ctx.userId, title: input.title, periodStart: input.from, periodEnd: input.to, data })
    .returning();
  await audit(db, ctx, "report.created", clientId, { title: input.title });
  return report;
}

export async function listReports(db: Db, ctx: Ctx, clientId: string) {
  await getClient(db, ctx, clientId);
  return db.select().from(reports).where(eq(reports.clientId, clientId)).orderBy(desc(reports.periodEnd), desc(reports.createdAt));
}

export async function getReport(db: Db, ctx: Ctx, reportId: string): Promise<Report> {
  if (!isUuid(reportId)) throw new NotFoundError("Report not found.");
  const [row] = await db
    .select({ report: reports })
    .from(reports)
    .innerJoin(clients, eq(clients.id, reports.clientId))
    .where(and(eq(reports.id, reportId), eq(clients.agencyId, ctx.agencyId)))
    .limit(1);
  if (!row) throw new NotFoundError("Report not found.");
  return row.report;
}

export async function updateReportSummary(db: Db, ctx: Ctx, reportId: string, summary: string | null) {
  assertRole(ctx, "manager");
  const r = await getReport(db, ctx, reportId);
  await db.update(reports).set({ summary }).where(eq(reports.id, r.id));
}

export async function refreshReport(db: Db, ctx: Ctx, reportId: string) {
  assertRole(ctx, "manager");
  const r = await getReport(db, ctx, reportId);
  const data = await buildReportData(db, ctx, r.clientId, r.periodStart, r.periodEnd);
  await db.update(reports).set({ data }).where(eq(reports.id, r.id));
  await audit(db, ctx, "report.refreshed", r.clientId, { title: r.title });
}

export async function setReportSharing(db: Db, ctx: Ctx, reportId: string, on: boolean) {
  assertRole(ctx, "manager");
  const r = await getReport(db, ctx, reportId);
  const token = on ? randomBytes(24).toString("base64url") : null;
  await db.update(reports).set({ shareToken: token, sharedAt: on ? new Date() : null }).where(eq(reports.id, r.id));
  await audit(db, ctx, on ? "report.shared" : "report.unshared", r.clientId, { title: r.title });
  return token;
}

export async function deleteReport(db: Db, ctx: Ctx, reportId: string) {
  assertRole(ctx, "manager");
  const r = await getReport(db, ctx, reportId);
  await db.delete(reports).where(eq(reports.id, r.id));
  await audit(db, ctx, "report.deleted", r.clientId, { title: r.title });
}

/** Public lookup for the share link. Returns null for unknown or revoked tokens. */
export async function getSharedReport(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [r] = await db.select().from(reports).where(eq(reports.shareToken, token)).limit(1);
  return r ?? null;
}
