import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { adsCampaignMetrics, adsCoverage, adsImports, adsKeywordMetrics, adsSearchTermMetrics, clients } from "@/db/schema";
import { REPORT_LABELS, type ParsedAdsReport, type ReportType } from "@/lib/ads-csv";
import { addDays, isCovered } from "@/lib/date-range";
import { audit, getClient, isUuid } from "./clients";
import { assertRole, NotFoundError, type Ctx } from "./permissions";

export class AdsImportConflictError extends Error {}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Stores a parsed Google Ads report for a client.
 *
 * - Daily report: replaces every daily row the client has inside the file's
 *   period (the file is the complete truth for those days).
 * - Period report (no Day column): replaces rows for exactly the same period.
 * - Anything that would mix daily and period rows over the same dates, or two
 *   different overlapping periods, is refused — otherwise days would be
 *   counted twice.
 */
export async function importAdsReport(
  db: Db,
  ctx: Ctx,
  clientId: string,
  input: { filename: string; report: ParsedAdsReport },
) {
  assertRole(ctx, "manager");
  const client = await getClient(db, ctx, clientId);
  if (client.status !== "active") throw new AdsImportConflictError("Restore this client before importing data.");
  const { report } = input;

  const result = await db.transaction(async (tx) => {
    // Serialise imports for this client.
    await tx.execute(sql`select id from clients where id = ${clientId} for update`);

    const overlapping = await tx
      .select()
      .from(adsCoverage)
      .where(
        and(
          eq(adsCoverage.clientId, clientId),
          eq(adsCoverage.reportType, report.type),
          lte(adsCoverage.periodStart, report.periodEnd),
          gte(adsCoverage.periodEnd, report.periodStart),
        ),
      );
    for (const c of overlapping) {
      const samePeriod = c.periodStart === report.periodStart && c.periodEnd === report.periodEnd;
      if (report.daily !== c.daily || (!report.daily && !samePeriod)) {
        throw new AdsImportConflictError(
          `This ${REPORT_LABELS[report.type].toLowerCase()} report (${report.periodStart} to ${report.periodEnd}) overlaps data already imported for ${c.periodStart} to ${c.periodEnd} in a different format. ` +
            "Remove that import first, or export the same date range segmented by Day.",
        );
      }
    }

    if (report.type === "campaigns" && report.currency) {
      const [other] = await tx
        .select({ currency: adsCampaignMetrics.currency })
        .from(adsCampaignMetrics)
        .where(and(eq(adsCampaignMetrics.clientId, clientId), ne(adsCampaignMetrics.currency, report.currency)))
        .limit(1);
      if (other) {
        throw new AdsImportConflictError(
          `This client already has data in ${other.currency}, but this file is in ${report.currency}. Is it the right Google Ads account?`,
        );
      }
    }

    // Replace existing rows for these dates and trim older coverage.
    await deleteRowsInPeriod(tx, report.type, clientId, report.periodStart, report.periodEnd);
    await trimCoverage(tx, clientId, overlapping, report.periodStart, report.periodEnd);

    const [imp] = await tx
      .insert(adsImports)
      .values({
        clientId,
        userId: ctx.userId,
        reportType: report.type,
        filename: input.filename.slice(0, 200),
        rowCount: report.rows.length,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        daily: report.daily,
        currency: report.currency,
        warnings: report.warnings,
      })
      .returning();
    await tx.insert(adsCoverage).values({
      clientId,
      importId: imp.id,
      reportType: report.type,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      daily: report.daily,
    });
    await insertRows(tx, report, clientId, imp.id);
    // Imports whose data has been completely replaced no longer provide anything.
    await tx.execute(sql`
      delete from ads_imports i
      where i.client_id = ${clientId} and i.id <> ${imp.id}
        and not exists (select 1 from ads_coverage c where c.import_id = i.id)`);
    return imp;
  });

  await audit(db, ctx, "ads.imported", clientId, {
    type: report.type,
    filename: result.filename,
    rows: result.rowCount,
    from: result.periodStart,
    to: result.periodEnd,
  });
  return result;
}

async function deleteRowsInPeriod(tx: Tx, type: ReportType, clientId: string, from: string, to: string) {
  const t = type === "campaigns" ? adsCampaignMetrics : type === "keywords" ? adsKeywordMetrics : adsSearchTermMetrics;
  await tx.delete(t).where(and(eq(t.clientId, clientId), gte(t.periodStart, from), lte(t.periodEnd, to)));
}

async function insertRows(tx: Tx, report: ParsedAdsReport, clientId: string, importId: string) {
  for (let i = 0; i < report.rows.length; i += 1000) {
    const ids = { clientId, importId };
    if (report.type === "campaigns") {
      await tx.insert(adsCampaignMetrics).values(report.rows.slice(i, i + 1000).map((r) => ({ ...r, ...ids })));
    } else if (report.type === "keywords") {
      await tx.insert(adsKeywordMetrics).values(report.rows.slice(i, i + 1000).map((r) => ({ ...r, ...ids })));
    } else {
      await tx.insert(adsSearchTermMetrics).values(report.rows.slice(i, i + 1000).map((r) => ({ ...r, ...ids })));
    }
  }
}

async function trimCoverage(
  tx: Tx,
  clientId: string,
  overlapping: (typeof adsCoverage.$inferSelect)[],
  from: string,
  to: string,
) {
  if (overlapping.length === 0) return;
  await tx.delete(adsCoverage).where(inArray(adsCoverage.id, overlapping.map((c) => c.id)));
  const remainders = overlapping.flatMap((c) => {
    const pieces: (typeof adsCoverage.$inferInsert)[] = [];
    if (c.periodStart < from) pieces.push({ ...c, id: undefined, periodEnd: addDays(from, -1) });
    if (c.periodEnd > to) pieces.push({ ...c, id: undefined, periodStart: addDays(to, 1) });
    return pieces;
  });
  if (remainders.length) await tx.insert(adsCoverage).values(remainders.map((r) => ({ ...r, clientId })));
}

export async function deleteAdsImport(db: Db, ctx: Ctx, clientId: string, importId: string) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  if (!isUuid(importId)) throw new NotFoundError("Import not found.");
  const deleted = await db
    .delete(adsImports)
    .where(and(eq(adsImports.id, importId), eq(adsImports.clientId, clientId)))
    .returning({ filename: adsImports.filename });
  if (deleted.length === 0) throw new NotFoundError("Import not found.");
  await audit(db, ctx, "ads.import_removed", clientId, { filename: deleted[0].filename });
}

export async function listAdsImports(db: Db, ctx: Ctx, clientId: string) {
  await getClient(db, ctx, clientId);
  return db.select().from(adsImports).where(eq(adsImports.clientId, clientId)).orderBy(desc(adsImports.createdAt));
}

// ---- Reporting ------------------------------------------------------------

/** Sums of raw metrics. Ratios are derived from these, never stored. */
export type AdsTotals = {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number | null;
  conversionValue: number | null;
};

export function derive(t: AdsTotals) {
  const div = (a: number | null, b: number) => (a === null || b === 0 ? null : a / b);
  return {
    ctr: div(t.clicks, t.impressions),
    cpc: div(t.cost, t.clicks),
    conversionRate: div(t.conversions, t.clicks),
    costPerConversion: t.conversions ? t.cost / t.conversions : null,
  };
}

const sums = {
  cost: sql<number>`coalesce(sum(${adsCampaignMetrics.cost}), 0)::float8`,
  impressions: sql<number>`coalesce(sum(${adsCampaignMetrics.impressions}), 0)::float8`,
  clicks: sql<number>`coalesce(sum(${adsCampaignMetrics.clicks}), 0)::float8`,
  // Null when no row in the range reported conversions at all.
  conversions: sql<number | null>`sum(${adsCampaignMetrics.conversions})::float8`,
  conversionValue: sql<number | null>`sum(${adsCampaignMetrics.conversionValue})::float8`,
};

const inRange = (from: string, to: string) =>
  and(gte(adsCampaignMetrics.periodStart, from), lte(adsCampaignMetrics.periodEnd, to));

/** Per-campaign figures for a client over a date range. */
export async function campaignReport(db: Db, ctx: Ctx, clientId: string, from: string, to: string) {
  await getClient(db, ctx, clientId);
  const rows = await db
    .select({
      campaignName: adsCampaignMetrics.campaignName,
      ...sums,
      // Latest status/budget seen in the range.
      status: sql<string | null>`(array_agg(${adsCampaignMetrics.campaignStatus} order by ${adsCampaignMetrics.periodEnd} desc))[1]`,
      budget: sql<number | null>`(array_agg(${adsCampaignMetrics.budget} order by ${adsCampaignMetrics.periodEnd} desc))[1]::float8`,
      // Search impression share recombined via eligible impressions (impr / share).
      searchImpressionShare: sql<number | null>`
        sum(${adsCampaignMetrics.impressions}) filter (where ${adsCampaignMetrics.searchImpressionShare} > 0)::float8
        / nullif(sum(${adsCampaignMetrics.impressions} / ${adsCampaignMetrics.searchImpressionShare}) filter (where ${adsCampaignMetrics.searchImpressionShare} > 0), 0)::float8`,
    })
    .from(adsCampaignMetrics)
    .where(and(eq(adsCampaignMetrics.clientId, clientId), inRange(from, to)))
    .groupBy(adsCampaignMetrics.campaignName)
    .orderBy(desc(sql`sum(${adsCampaignMetrics.cost})`), asc(adsCampaignMetrics.campaignName));
  return rows.map((r) => ({ ...r, ...derive(r) }));
}

/** Daily totals for charts (daily-segmented data only). */
export async function dailySeries(db: Db, ctx: Ctx, clientId: string, from: string, to: string) {
  await getClient(db, ctx, clientId);
  return db
    .select({ day: adsCampaignMetrics.periodStart, ...sums })
    .from(adsCampaignMetrics)
    .where(
      and(
        eq(adsCampaignMetrics.clientId, clientId),
        inRange(from, to),
        eq(adsCampaignMetrics.periodStart, adsCampaignMetrics.periodEnd),
      ),
    )
    .groupBy(adsCampaignMetrics.periodStart)
    .orderBy(asc(adsCampaignMetrics.periodStart));
}

export type ClientAdsSummary = {
  clientId: string;
  currency: string | null;
  current: AdsTotals | null;
  previous: AdsTotals | null;
  /** Every day of the selected range has imported data. */
  currentComplete: boolean;
  /** Every day of the previous period has imported data (so a comparison is fair). */
  previousComplete: boolean;
  dataFrom: string | null;
  dataTo: string | null;
  daily: { day: string; cost: number; conversions: number | null }[];
};

/** Google Ads summary for every active client in the agency, for the dashboard. */
export async function agencyAdsSummary(
  db: Db,
  ctx: Ctx,
  range: { from: string; to: string },
  previous: { from: string; to: string },
): Promise<ClientAdsSummary[]> {
  const agencyClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.agencyId, ctx.agencyId), eq(clients.status, "active")));
  const ids = agencyClients.map((c) => c.id);
  if (ids.length === 0) return [];

  const totalsFor = (from: string, to: string) =>
    db
      .select({ clientId: adsCampaignMetrics.clientId, ...sums, currency: sql<string | null>`max(${adsCampaignMetrics.currency})` })
      .from(adsCampaignMetrics)
      .where(and(inArray(adsCampaignMetrics.clientId, ids), inRange(from, to)))
      .groupBy(adsCampaignMetrics.clientId);

  const [current, prev, coverage, daily] = await Promise.all([
    totalsFor(range.from, range.to),
    totalsFor(previous.from, previous.to),
    db.select().from(adsCoverage).where(and(inArray(adsCoverage.clientId, ids), eq(adsCoverage.reportType, "campaigns"))),
    db
      .select({
        clientId: adsCampaignMetrics.clientId,
        day: adsCampaignMetrics.periodStart,
        cost: sums.cost,
        conversions: sums.conversions,
      })
      .from(adsCampaignMetrics)
      .where(
        and(
          inArray(adsCampaignMetrics.clientId, ids),
          inRange(range.from, range.to),
          eq(adsCampaignMetrics.periodStart, adsCampaignMetrics.periodEnd),
        ),
      )
      .groupBy(adsCampaignMetrics.clientId, adsCampaignMetrics.periodStart)
      .orderBy(asc(adsCampaignMetrics.periodStart)),
  ]);

  return ids.map((clientId) => {
    const cov = coverage.filter((c) => c.clientId === clientId);
    const cur = current.find((c) => c.clientId === clientId);
    const pre = prev.find((c) => c.clientId === clientId);
    const pick = (t: typeof cur): AdsTotals | null =>
      t ? { cost: t.cost, impressions: t.impressions, clicks: t.clicks, conversions: t.conversions, conversionValue: t.conversionValue } : null;
    return {
      clientId,
      currency: cur?.currency ?? null,
      current: pick(cur),
      previous: pick(pre),
      currentComplete: isCovered(range.from, range.to, cov),
      previousComplete: isCovered(previous.from, previous.to, cov),
      dataFrom: cov.length ? cov.map((c) => c.periodStart).sort()[0] : null,
      dataTo: cov.length ? cov.map((c) => c.periodEnd).sort().at(-1)! : null,
      daily: daily.filter((d) => d.clientId === clientId).map(({ day, cost, conversions }) => ({ day, cost, conversions })),
    };
  });
}

/** Coverage for one client, for the Google Ads page. */
export async function adsCoverageFor(db: Db, ctx: Ctx, clientId: string, type: ReportType = "campaigns") {
  await getClient(db, ctx, clientId);
  return db
    .select()
    .from(adsCoverage)
    .where(and(eq(adsCoverage.clientId, clientId), eq(adsCoverage.reportType, type)))
    .orderBy(asc(adsCoverage.periodStart));
}

const kwSums = (t: typeof adsKeywordMetrics | typeof adsSearchTermMetrics) => ({
  cost: sql<number>`coalesce(sum(${t.cost}), 0)::float8`,
  impressions: sql<number>`coalesce(sum(${t.impressions}), 0)::float8`,
  clicks: sql<number>`coalesce(sum(${t.clicks}), 0)::float8`,
  conversions: sql<number | null>`sum(${t.conversions})::float8`,
  conversionValue: sql<number | null>`sum(${t.conversionValue})::float8`,
});

/** Keyword figures for a date range, one row per keyword + match type + ad group. */
export async function keywordReport(db: Db, ctx: Ctx, clientId: string, from: string, to: string) {
  await getClient(db, ctx, clientId);
  const k = adsKeywordMetrics;
  const rows = await db
    .select({
      keyword: k.keyword,
      matchType: k.matchType,
      campaignName: k.campaignName,
      adGroupName: k.adGroupName,
      ...kwSums(k),
      status: sql<string | null>`(array_agg(${k.status} order by ${k.periodEnd} desc))[1]`,
      maxCpc: sql<number | null>`(array_agg(${k.maxCpc} order by ${k.periodEnd} desc))[1]::float8`,
      qualityScore: sql<number | null>`(array_agg(${k.qualityScore} order by ${k.periodEnd} desc))[1]`,
    })
    .from(k)
    .where(and(eq(k.clientId, clientId), gte(k.periodStart, from), lte(k.periodEnd, to)))
    .groupBy(k.keyword, k.matchType, k.campaignName, k.adGroupName)
    .orderBy(desc(sql`sum(${k.cost})`), asc(k.keyword));
  return rows.map((r) => ({ ...r, ...derive(r) }));
}

/** Search terms for a date range, one row per term + ad group. */
export async function searchTermReport(db: Db, ctx: Ctx, clientId: string, from: string, to: string) {
  await getClient(db, ctx, clientId);
  const t = adsSearchTermMetrics;
  const rows = await db
    .select({
      searchTerm: t.searchTerm,
      campaignName: t.campaignName,
      adGroupName: t.adGroupName,
      ...kwSums(t),
      matchType: sql<string | null>`(array_agg(${t.matchType} order by ${t.periodEnd} desc))[1]`,
      addedExcluded: sql<string | null>`(array_agg(${t.addedExcluded} order by ${t.periodEnd} desc))[1]`,
      keyword: sql<string | null>`(array_agg(${t.keyword} order by ${t.periodEnd} desc))[1]`,
    })
    .from(t)
    .where(and(eq(t.clientId, clientId), gte(t.periodStart, from), lte(t.periodEnd, to)))
    .groupBy(t.searchTerm, t.campaignName, t.adGroupName)
    .orderBy(desc(sql`sum(${t.cost})`), asc(t.searchTerm));
  return rows.map((r) => ({ ...r, ...derive(r) }));
}
