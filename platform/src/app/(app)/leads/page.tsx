import Link from "next/link";
import { db } from "@/db";
import { LeadStatusSelect } from "@/components/lead-forms";
import { RangePicker } from "@/components/range-picker";
import { StatTile } from "@/components/stat";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, cx } from "@/components/ui";
import { formatDate, isCovered } from "@/lib/date-range";
import { count, money, pct } from "@/lib/format";
import { CHANNEL_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/leads";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validation";
import { adsCoverageFor, campaignReport } from "@/server/ads";
import { getActiveClient } from "@/server/active-client";
import { leadStatsByClient, listLeads } from "@/server/leads";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Leads" };

const statusTone = { new: "accent", contacted: "neutral", quoted: "warn", won: "good", lost: "bad" } as const;

export default async function LeadsPage(props: PageProps<"/leads">) {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title="Leads" />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />
      </>
    );
  }
  const sp = await props.searchParams;
  // Leads default to a range that includes today, so a lead logged now shows up.
  const { range, today, agency } = await rangeFromParams(ctx, { ...sp, range: sp.range ?? "recent_30" });
  const status = LEAD_STATUSES.includes(sp.status as never) ? (sp.status as string) : undefined;
  const source = LEAD_SOURCES.includes(sp.source as never) ? (sp.source as string) : undefined;
  const canEdit = hasRole(ctx.role, "manager");

  const [rows, statsMap, campaigns, coverage] = await Promise.all([
    listLeads(db, ctx, client.id, range, { status, source }),
    leadStatsByClient(db, ctx, range, [client.id]),
    campaignReport(db, ctx, client.id, range.from, range.to),
    adsCoverageFor(db, ctx, client.id),
  ]);
  const stats = statsMap.get(client.id) ?? { total: 0, won: 0, lost: 0, open: 0, wonValue: 0, bySource: {} };
  const adSpend = campaigns.reduce((s, c) => s + c.cost, 0);
  const adsComplete = isCovered(range.from, range.to, coverage);
  const adsLeads = stats.bySource.google_ads ?? 0;
  const costPerLead = adsComplete && adsLeads > 0 ? adSpend / adsLeads : null;
  const decided = stats.won + stats.lost;

  const qs = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    q.delete("added");
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `?${q}`;
  };
  const maxSource = Math.max(1, ...Object.values(stats.bySource));

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          <>
            <strong className="text-text">{client.name}</strong> · {range.label.toLowerCase()} ({formatDate(range.from)} – {formatDate(range.to)})
          </>
        }
        actions={
          <>
            <RangePicker value={range.key} from={range.from} to={range.to} max={today} />
            {canEdit && <ButtonLink href="/leads/new">Add lead</ButtonLink>}
          </>
        }
      />
      {sp.added && (
        <div role="status" className="mb-4 rounded-lg border border-good/30 bg-good-soft px-4 py-2 text-sm text-good">
          Lead added.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Leads" value={count(stats.total)} note={`${stats.open} still open`} />
        <StatTile label="Won" value={count(stats.won)} note={decided ? `${pct(stats.won / decided, 0)} of decided leads` : "None decided yet"} />
        <StatTile label="Revenue won" value={money(stats.wonValue, agency.currency)} note="From job values entered" />
        <StatTile label="Leads from Google Ads" value={count(adsLeads)} />
        <StatTile
          label="Google Ads cost per lead"
          value={money(costPerLead, agency.currency)}
          note={
            costPerLead !== null
              ? `${money(adSpend, agency.currency)} spend ÷ ${adsLeads} leads`
              : !adsComplete
                ? range.to === today
                  ? "Google Ads data never covers today — pick “Last 30 days”"
                  : "Needs Google Ads data for the whole range"
                : "No Google Ads leads logged"
          }
        />
      </div>

      {stats.total > 0 && (
        <Card className="mt-6">
          <CardHeader title="Where leads come from" description="As recorded on each lead." />
          <ul className="space-y-2 p-5 text-sm">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([s, n]) => (
                <li key={s} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-3 sm:grid-cols-[14rem_1fr_3rem]">
                  <span className="truncate">{SOURCE_LABELS[s]}</span>
                  <span className="h-2 rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-2 rounded-full bg-chart" style={{ width: `${(n / maxSource) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{n}</span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <div className="mb-3 mt-8 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Filter by status">
        {[undefined, ...LEAD_STATUSES].map((st) => (
          <Link
            key={st ?? "all"}
            href={qs({ status: st })}
            className={cx("rounded-full border px-3 py-1", status === st ? "border-accent bg-accent-soft text-accent" : "border-border text-muted")}
          >
            {st ? STATUS_LABELS[st] : "All"}
          </Link>
        ))}
        {source && (
          <Link href={qs({ source: undefined })} className="rounded-full border border-accent bg-accent-soft px-3 py-1 text-accent">
            {SOURCE_LABELS[source]} ✕
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={stats.total ? "No leads match this filter" : "No leads in this period"}
          action={canEdit && !stats.total && <ButtonLink href="/leads/new">Log a lead</ButtonLink>}
        >
          {!stats.total && "Log every call, WhatsApp and form enquiry — and ask where they found the business."}
        </EmptyState>
      ) : (
        <ul className="space-y-3" aria-label="Leads">
          {rows.map((l) => (
            <li key={l.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{l.name}</span>
                      <Badge tone={statusTone[l.status]}>{STATUS_LABELS[l.status]}</Badge>
                    </div>
                    <div className="mt-0.5 text-sm text-muted">
                      {l.receivedAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: agency.timezone })} ·{" "}
                      {CHANNEL_LABELS[l.channel]} ·{" "}
                      <Link href={qs({ source: l.source })} className="underline-offset-2 hover:underline">
                        {SOURCE_LABELS[l.source]}
                      </Link>
                      {l.service && ` · ${l.service}`}
                      {l.location && ` · ${l.location}`}
                      {l.status === "won" && l.value !== null && ` · ${money(l.value, agency.currency)}`}
                    </div>
                    {l.notes && <p className="mt-1 line-clamp-2 text-sm">{l.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {l.phone && (
                      <>
                        <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="rounded-lg border border-border px-2.5 py-1 text-sm hover:bg-surface-2">
                          Call
                        </a>
                        <a
                          href={`https://wa.me/${waNumber(l.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-border px-2.5 py-1 text-sm hover:bg-surface-2"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                    <LeadStatusSelect clientId={client.id} leadId={l.id} status={l.status} disabled={!canEdit} />
                    {canEdit && (
                      <Link href={`/leads/${l.id}`} className="text-sm text-accent hover:underline" aria-label={`Edit ${l.name}`}>
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function waNumber(n: string) {
  const d = n.replace(/\D/g, "");
  return d.startsWith("0") ? `27${d.slice(1)}` : d;
}
