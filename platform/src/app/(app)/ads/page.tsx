import Link from "next/link";
import { db } from "@/db";
import { RemoveImportButton } from "@/components/ads-forms";
import { DailyChart } from "@/components/daily-chart";
import { RangePicker } from "@/components/range-picker";
import { StatTile } from "@/components/stat";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { addDays, formatDate, isCovered } from "@/lib/date-range";
import { change, count, money, pct } from "@/lib/format";
import { adsCoverageFor, campaignReport, dailySeries, derive, listAdsImports, type AdsTotals } from "@/server/ads";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Google Ads" };

function total(rows: AdsTotals[]): AdsTotals | null {
  if (rows.length === 0) return null;
  const anyConv = rows.some((r) => r.conversions !== null);
  const anyVal = rows.some((r) => r.conversionValue !== null);
  return rows.reduce<AdsTotals>(
    (t, r) => ({
      cost: t.cost + r.cost,
      impressions: t.impressions + r.impressions,
      clicks: t.clicks + r.clicks,
      conversions: anyConv ? (t.conversions ?? 0) + (r.conversions ?? 0) : null,
      conversionValue: anyVal ? (t.conversionValue ?? 0) + (r.conversionValue ?? 0) : null,
    }),
    { cost: 0, impressions: 0, clicks: 0, conversions: anyConv ? 0 : null, conversionValue: anyVal ? 0 : null },
  );
}

export default async function AdsPage(props: PageProps<"/ads">) {
  const ctx = await requireCtx();
  const sp = await props.searchParams;
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title="Google Ads" />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />
      </>
    );
  }

  const { range, previous, today } = await rangeFromParams(ctx, sp);
  const [campaigns, prevCampaigns, series, coverage, imports] = await Promise.all([
    campaignReport(db, ctx, client.id, range.from, range.to),
    campaignReport(db, ctx, client.id, previous.from, previous.to),
    dailySeries(db, ctx, client.id, range.from, range.to),
    adsCoverageFor(db, ctx, client.id),
    listAdsImports(db, ctx, client.id),
  ]);
  const canImport = hasRole(ctx.role, "manager");
  const currency = imports.find((i) => i.currency)?.currency ?? "ZAR";

  const cur = total(campaigns);
  const prev = total(prevCampaigns);
  const complete = isCovered(range.from, range.to, coverage);
  const fair = complete && isCovered(previous.from, previous.to, coverage);
  const d = cur ? derive(cur) : null;
  const pd = prev ? derive(prev) : null;
  const delta = (a: number | null | undefined, b: number | null | undefined) => (fair ? change(a, b) : null);
  const compared = `previous ${range.days} day${range.days === 1 ? "" : "s"}`;

  // One point per day: real value, 0 for covered days with no activity, gap where there's no data.
  const dailyCoverage = coverage.filter((c) => c.daily);
  const byDay = new Map(series.map((s) => [s.day, s]));
  const days: string[] = [];
  for (let day = range.from; day <= range.to; day = addDays(day, 1)) days.push(day);
  const covered = (day: string) => dailyCoverage.some((c) => c.periodStart <= day && day <= c.periodEnd);
  const point = (day: string, v: (s: (typeof series)[number]) => number | null) =>
    ({ day, value: byDay.has(day) ? v(byDay.get(day)!) : covered(day) ? 0 : null });
  const hasDaily = days.some(covered);

  return (
    <>
      <PageHeader
        title="Google Ads"
        description={
          <>
            Showing <strong className="text-text">{client.name}</strong> · {range.label.toLowerCase()} ({formatDate(range.from)} – {formatDate(range.to)})
          </>
        }
        actions={
          <>
            <RangePicker value={range.key} from={range.from} to={range.to} max={today} />
            {canImport && <ButtonLink href="/ads/import">Import CSV</ButtonLink>}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          Google Ads API <Badge>Not connected — Phase 3</Badge>
        </span>
        <span className="flex items-center gap-2">
          CSV imports{" "}
          {coverage.length ? (
            <Badge tone="good">
              Data {formatDate(coverage[0].periodStart)} – {formatDate(coverage.at(-1)!.periodEnd)}
            </Badge>
          ) : (
            <Badge>None yet</Badge>
          )}
        </span>
      </div>

      {!cur ? (
        <EmptyState
          title={imports.length ? "No Google Ads data in this date range" : "No Google Ads data yet"}
          action={canImport && <ButtonLink href="/ads/import">Import a Google Ads report</ButtonLink>}
        >
          {imports.length
            ? "Pick a range covered by your imports, or import a report for these dates."
            : `Import a campaign report CSV from ${client.name}'s Google Ads account to see real figures here.`}
        </EmptyState>
      ) : (
        <>
          {!complete && (
            <div role="note" className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm text-warn">
              Imported data covers only part of this range, so totals are for the covered days only and comparisons are hidden.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Spend" value={money(cur.cost, currency)} delta={delta(cur.cost, prev?.cost)} upIsGood={null} comparedTo={compared} />
            <StatTile label="Conversions" value={count(cur.conversions)} delta={delta(cur.conversions, prev?.conversions)} comparedTo={compared} />
            <StatTile label="Cost / conversion" value={money(d?.costPerConversion, currency)} delta={delta(d?.costPerConversion, pd?.costPerConversion)} upIsGood={false} comparedTo={compared} />
            <StatTile label="Conversion rate" value={pct(d?.conversionRate)} delta={delta(d?.conversionRate, pd?.conversionRate)} comparedTo={compared} />
            <StatTile label="Clicks" value={count(cur.clicks)} delta={delta(cur.clicks, prev?.clicks)} comparedTo={compared} />
            <StatTile label="Impressions" value={count(cur.impressions)} delta={delta(cur.impressions, prev?.impressions)} comparedTo={compared} />
            <StatTile label="CTR" value={pct(d?.ctr)} delta={delta(d?.ctr, pd?.ctr)} comparedTo={compared} />
            <StatTile label="Avg. CPC" value={money(d?.cpc, currency)} delta={delta(d?.cpc, pd?.cpc)} upIsGood={false} comparedTo={compared} />
          </div>

          <Card className="mt-6 p-5">
            {hasDaily ? (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <DailyChart title="Spend per day" kind="line" format="money" currency={currency} points={days.map((day) => point(day, (s) => s.cost))} />
                <DailyChart title="Conversions per day" kind="column" format="count" points={days.map((day) => point(day, (s) => s.conversions))} />
              </div>
            ) : (
              <p className="text-sm text-muted">Daily charts need a report segmented by Day. The figures above come from period totals.</p>
            )}
          </Card>

          <Card className="mt-6">
            <CardHeader title="Campaigns" description="Ratios are calculated from the imported totals." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm tabular-nums">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-border">
                    {["Campaign", "Status", "Budget", "Spend", "Impr.", "Clicks", "CTR", "Avg. CPC", "Conv.", "Conv. rate", "Cost / conv.", "Search IS"].map((h, i) => (
                      <th key={h} className={`px-3 py-2 font-medium ${i > 1 ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.campaignName} className="border-b border-border last:border-0">
                      <td className="max-w-64 truncate px-3 py-2 font-medium" title={c.campaignName}>
                        {c.campaignName}
                      </td>
                      <td className="px-3 py-2">{c.status ? <Badge tone={/enabled|eligible/i.test(c.status) ? "good" : "neutral"}>{c.status}</Badge> : "—"}</td>
                      <td className="px-3 py-2 text-right">{money(c.budget, currency)}</td>
                      <td className="px-3 py-2 text-right">{money(c.cost, currency)}</td>
                      <td className="px-3 py-2 text-right">{count(c.impressions)}</td>
                      <td className="px-3 py-2 text-right">{count(c.clicks)}</td>
                      <td className="px-3 py-2 text-right">{pct(c.ctr)}</td>
                      <td className="px-3 py-2 text-right">{money(c.cpc, currency)}</td>
                      <td className="px-3 py-2 text-right">{count(c.conversions)}</td>
                      <td className="px-3 py-2 text-right">{pct(c.conversionRate)}</td>
                      <td className="px-3 py-2 text-right">{money(c.costPerConversion, currency)}</td>
                      <td className="px-3 py-2 text-right">{pct(c.searchImpressionShare, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {imports.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Imported reports" description="Re-importing the same dates replaces earlier data, so nothing is counted twice." />
          <ul className="divide-y divide-border text-sm">
            {imports.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.filename}</div>
                  <div className="text-xs text-muted">
                    {formatDate(i.periodStart)} – {formatDate(i.periodEnd)} · {i.daily ? "daily" : "period totals"} · {i.rowCount} rows · imported{" "}
                    {i.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" })}
                  </div>
                </div>
                {canImport && <RemoveImportButton clientId={client.id} importId={i.id} filename={i.filename} />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="mt-6 text-xs text-muted">
        Coming next: analysis of winners, problems and opportunities, search terms, keywords and budget recommendations (Phase 4). Want to see what&apos;s
        planned? <Link href="/clients" className="underline">Client profiles</Link> hold the verified facts the ad assistant will use.
      </p>
    </>
  );
}
