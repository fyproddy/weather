import Link from "next/link";
import { db } from "@/db";
import { RangePicker } from "@/components/range-picker";
import { Sparkline } from "@/components/sparkline";
import { Delta, StatTile } from "@/components/stat";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/date-range";
import { change, count, money, pct } from "@/lib/format";
import { agencyAdsSummary, derive, type AdsTotals, type ClientAdsSummary } from "@/server/ads";
import { listClients, recentActivity } from "@/server/clients";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Dashboard" };

/** Sources not built yet — shown so the card is honest about what it can't tell you. */
const NOT_YET = [
  ["Organic visibility & traffic", 6],
  ["Maps visibility, rating & reviews", 7],
  ["SEO score", 8],
  ["Leads & cost per lead", 9],
] as const;

const add = (a: AdsTotals, b: AdsTotals): AdsTotals => ({
  cost: a.cost + b.cost,
  impressions: a.impressions + b.impressions,
  clicks: a.clicks + b.clicks,
  conversions: a.conversions === null && b.conversions === null ? null : (a.conversions ?? 0) + (b.conversions ?? 0),
  conversionValue: null,
});

export default async function DashboardPage(props: PageProps<"/">) {
  const ctx = await requireCtx();
  const sp = await props.searchParams;
  const { range, previous, today, agency } = await rangeFromParams(ctx, sp);
  const [clients, summaries, activity] = await Promise.all([
    listClients(db, ctx),
    agencyAdsSummary(db, ctx, range, previous),
    recentActivity(db, ctx, 8),
  ]);
  const byClient = new Map(summaries.map((s) => [s.clientId, s]));
  const compared = `previous ${range.days} day${range.days === 1 ? "" : "s"}`;

  // Agency totals: only clients whose data is in the agency's currency are added up.
  const inCurrency = summaries.filter((s) => s.current && (s.currency ?? agency.currency) === agency.currency);
  const otherCurrency = summaries.filter((s) => s.current && (s.currency ?? agency.currency) !== agency.currency).length;
  const cur = inCurrency.reduce<AdsTotals | null>((t, s) => (t ? add(t, s.current!) : s.current), null);
  const prev = inCurrency.reduce<AdsTotals | null>((t, s) => (s.previous ? (t ? add(t, s.previous) : s.previous) : t), null);
  const fair = inCurrency.length > 0 && inCurrency.every((s) => s.currentComplete && s.previousComplete);
  const d = cur ? derive(cur) : null;
  const pd = prev ? derive(prev) : null;
  const delta = (a: number | null | undefined, b: number | null | undefined) => (fair ? change(a, b) : null);
  const withData = summaries.filter((s) => s.current).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`All clients · ${range.label.toLowerCase()} (${formatDate(range.from)} – ${formatDate(range.to)})`}
        actions={
          <>
            <RangePicker value={range.key} from={range.from} to={range.to} max={today} />
            {hasRole(ctx.role, "manager") && <ButtonLink href="/clients/new">Add client</ButtonLink>}
          </>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          action={hasRole(ctx.role, "manager") && <ButtonLink href="/clients/new">Add your first client</ButtonLink>}
        >
          Add the businesses you manage. Each one gets its own Google Ads, SEO, Maps, reviews and leads view.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Agency totals" className="mb-8">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatTile label="Active clients" value={count(clients.length)} note={`${withData} with Google Ads data in range`} />
              <StatTile label="Ad spend" value={money(cur?.cost, agency.currency)} delta={delta(cur?.cost, prev?.cost)} upIsGood={null} comparedTo={compared} note={cur ? undefined : "No imported data"} />
              <StatTile label="Conversions" value={count(cur?.conversions)} delta={delta(cur?.conversions, prev?.conversions)} comparedTo={compared} />
              <StatTile label="Cost / conversion" value={money(d?.costPerConversion, agency.currency)} delta={delta(d?.costPerConversion, pd?.costPerConversion)} upIsGood={false} comparedTo={compared} />
              <StatTile label="Clicks" value={count(cur?.clicks)} delta={delta(cur?.clicks, prev?.clicks)} comparedTo={compared} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Google Ads totals from imported reports.
              {cur && !fair && " Comparisons are hidden because not every client's data covers both this and the previous period."}
              {otherCurrency > 0 && ` ${otherCurrency} client(s) in another currency are not included in these totals.`}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {clients.map((c) => (
              <ClientCard key={c.id} client={c} summary={byClient.get(c.id)} compared={compared} rangeLabel={range.label.toLowerCase()} />
            ))}
          </div>
        </>
      )}

      {activity.length > 0 && (
        <Card className="mt-8">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">Recent activity</div>
          <ul className="divide-y divide-border text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 px-5 py-2">
                <span>{describe(a.action, a.details as Record<string, string | number> | null)}</span>
                <time className="shrink-0 text-muted" dateTime={a.createdAt.toISOString()}>
                  {a.createdAt.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: agency.timezone })}
                </time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function ClientCard({
  client,
  summary,
  compared,
  rangeLabel,
}: {
  client: { id: string; name: string; industry: string | null; city: string | null; region: string | null };
  summary?: ClientAdsSummary;
  compared: string;
  rangeLabel: string;
}) {
  const s = summary;
  const currency = s?.currency ?? "ZAR";
  const cur = s?.current;
  const d = cur ? derive(cur) : null;
  const pd = s?.previous ? derive(s.previous) : null;
  const fair = !!s?.currentComplete && !!s?.previousComplete;
  const delta = (a: number | null | undefined, b: number | null | undefined) => (fair ? change(a, b) : null);
  const metric = (label: string, value: string, dv: number | null, upIsGood: boolean | null) => (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      {dv !== null && <Delta value={dv} upIsGood={upIsGood} comparedTo={compared} />}
    </div>
  );

  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <Link href={`/clients/${client.id}`} className="font-semibold hover:underline">
            {client.name}
          </Link>
          <div className="truncate text-sm text-muted">
            {[client.industry, [client.city, client.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
        {s?.dataTo ? <Badge tone="good">Ads data to {formatDate(s.dataTo)}</Badge> : <Badge>Google Ads not connected</Badge>}
      </div>

      <div className="px-5 py-4">
        {cur ? (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {metric("Ad spend", money(cur.cost, currency), delta(cur.cost, s?.previous?.cost), null)}
              {metric("Conversions", count(cur.conversions), delta(cur.conversions, s?.previous?.conversions), true)}
              {metric("Cost / conversion", money(d?.costPerConversion, currency), delta(d?.costPerConversion, pd?.costPerConversion), false)}
              {metric("Clicks", count(cur.clicks), delta(cur.clicks, s?.previous?.clicks), true)}
              {metric("CTR", pct(d?.ctr), delta(d?.ctr, pd?.ctr), true)}
              {metric("Avg. CPC", money(d?.cpc, currency), delta(d?.cpc, pd?.cpc), false)}
            </dl>
            {s!.daily.length > 1 && (
              <div className="mt-4">
                <div className="mb-1 text-xs text-muted">Daily spend, {rangeLabel}</div>
                <Sparkline label={`${client.name} daily spend`} points={s!.daily.map((p) => ({ day: p.day, value: p.cost }))} format={(n) => money(n, currency)} />
              </div>
            )}
            {!s!.currentComplete && (
              <p className="mt-3 text-xs text-warn">
                Imported data covers only part of this range ({formatDate(s!.dataFrom!)} – {formatDate(s!.dataTo!)}).
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            {s?.dataTo
              ? `No Google Ads data in this range. Imported data covers ${formatDate(s.dataFrom!)} – ${formatDate(s.dataTo)}.`
              : "No Google Ads data yet. Import a report from the Google Ads page."}
          </p>
        )}
      </div>

      <div className="mt-auto border-t border-border px-5 py-3 text-xs text-muted">
        Not yet connected: {NOT_YET.map(([label, phase]) => `${label} (P${phase})`).join(" · ")}
      </div>
    </Card>
  );
}

function describe(action: string, d: Record<string, string | number> | null) {
  const map: Record<string, string> = {
    "client.created": `Added client ${d?.name ?? ""}`,
    "client.updated": "Updated client details",
    "client.archived": "Archived a client",
    "client.restored": "Restored a client",
    "client.deleted": `Deleted client ${d?.name ?? ""}`,
    "service.added": `Added service ${d?.name ?? ""}`,
    "location.added": `Added target location ${d?.name ?? ""}`,
    "competitor.added": `Added competitor ${d?.name ?? ""}`,
    "service.removed": "Removed a service",
    "location.removed": "Removed a target location",
    "competitor.removed": "Removed a competitor",
    "fact.removed": "Removed a fact",
    "fact.added": "Added a fact",
    "fact.verified": "Verified a fact",
    "fact.unverified": "Unverified a fact",
    "user.created": `Added user ${d?.email ?? ""}`,
    "agency.updated": "Updated agency settings",
    "ads.imported": `Imported Google Ads report ${d?.filename ?? ""} (${d?.rows ?? 0} rows)`,
    "ads.import_removed": `Removed Google Ads import ${d?.filename ?? ""}`,
  };
  return map[action] ?? action.replace(".", " ");
}
