import Link from "next/link";
import { db } from "@/db";
import { AdsPageShell, OtherPeriods } from "@/components/ads-page-shell";
import { CopyButton, FindingCard } from "@/components/finding-card";
import { formatKeyword } from "@/lib/keyword-format";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader, cx } from "@/components/ui";
import { count, money, pct } from "@/lib/format";
import { getAdsAnalysis } from "@/server/ads-analysis";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Keywords" };

const MATCH = ["all", "broad", "phrase", "exact"] as const;

export default async function KeywordsPage(props: PageProps<"/ads/keywords">) {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) return <><PageHeader title="Keywords" /><EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} /></>;
  const sp = await props.searchParams;
  const { range, previous, today } = await rangeFromParams(ctx, sp);
  const a = await getAdsAnalysis(db, ctx, client.id, range, previous);
  const canDecide = hasRole(ctx.role, "manager");
  const match = MATCH.includes(sp.match as never) ? (sp.match as (typeof MATCH)[number]) : "all";
  const rows = a.keywords.filter((k) => match === "all" || k.matchType === match);
  const currency = a.currency;

  const all = [...a.findings, ...a.carried];
  const negSuggestions = a.findings.filter((f) => f.action?.type === "add_negative_keyword" && f.decision === null);
  const negApproved = all.filter((f) => f.action?.type === "add_negative_keyword" && (f.decision === "approved" || f.decision === "done"));
  const kwFlags = new Map(a.findings.filter((f) => f.level === "keyword").map((f) => [f.target, f]));
  const qs = (m: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    if (m === "all") q.delete("match");
    else q.set("match", m);
    return `?${q}`;
  };

  return (
    <AdsPageShell title="Keywords" clientName={client.name} range={range} today={today} canImport={canDecide}>
      {a.keywords.length === 0 ? (
        <>
          <OtherPeriods what="keyword" periods={a.available.keywords} />
          <EmptyState title="No keyword data in this range" action={canDecide && <ButtonLink href="/ads/import">Import a Keywords report</ButtonLink>}>
            In Google Ads open Keywords → Search keywords, pick the dates, then Download → .csv.
          </EmptyState>
        </>
      ) : (
        <Card>
          <CardHeader
            title={`Keywords (${rows.length})`}
            description="Changes to keywords are made in Google Ads. Suggestions appear on the Analysis tab."
            action={
              <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-xs" role="group" aria-label="Match type">
                {MATCH.map((m) => (
                  <Link key={m} href={qs(m)} className={cx("rounded-md px-2.5 py-1 capitalize", match === m ? "bg-surface font-medium shadow-sm" : "text-muted")}>
                    {m}
                  </Link>
                ))}
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm tabular-nums">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  {["Keyword", "Match", "Campaign · Ad group", "Status", "Max CPC", "QS", "Cost", "Impr.", "Clicks", "CTR", "Avg. CPC", "Conv.", "Cost / conv."].map((h, i) => (
                    <th key={h} className={`px-3 py-2 font-medium ${i > 3 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const flag = kwFlags.get(`${k.keyword} [${k.matchType}] · ${k.adGroupName || k.campaignName}`);
                  return (
                    <tr key={`${k.campaignName}|${k.adGroupName}|${k.keyword}|${k.matchType}`} className="border-b border-border last:border-0">
                      <td className="min-w-52 px-3 py-2 font-medium">
                        {k.keyword}
                        {flag && (
                          <span className="ml-2">
                            <Badge tone={flag.kind === "winner" ? "good" : "bad"}>{flag.kind === "winner" ? "Winner" : "Check"}</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2"><Badge>{k.matchType}</Badge></td>
                      <td className="max-w-56 truncate px-3 py-2 text-muted" title={`${k.campaignName} · ${k.adGroupName}`}>{k.campaignName} · {k.adGroupName || "—"}</td>
                      <td className="px-3 py-2">{k.status ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{money(k.maxCpc, currency)}</td>
                      <td className="px-3 py-2 text-right">{k.qualityScore ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{money(k.cost, currency)}</td>
                      <td className="px-3 py-2 text-right">{count(k.impressions)}</td>
                      <td className="px-3 py-2 text-right">{count(k.clicks)}</td>
                      <td className="px-3 py-2 text-right">{pct(k.ctr)}</td>
                      <td className="px-3 py-2 text-right">{money(k.cpc, currency)}</td>
                      <td className="px-3 py-2 text-right">{count(k.conversions)}</td>
                      <td className="px-3 py-2 text-right">{money(k.costPerConversion, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <section className="mt-8" aria-label="Negative keywords">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Negative keywords</h2>
            <p className="text-sm text-muted">Suggested from real search terms that cost money without converting. Approve, then add them in Google Ads.</p>
          </div>
          {negApproved.length > 0 && (
            <CopyButton
              label={`Copy ${negApproved.length} approved`}
              text={negApproved.map((f) => formatKeyword(f.action!.text!, f.action!.matchType)).join("\n")}
            />
          )}
        </div>
        {negApproved.length > 0 && (
          <Card className="mb-4">
            <ul className="divide-y divide-border text-sm">
              {negApproved.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <code>{formatKeyword(f.action!.text!, f.action!.matchType)}</code>
                  <Badge tone={f.decision === "done" ? "good" : "accent"}>{f.decision === "done" ? "Added in Google Ads" : "Approved — to add"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {negSuggestions.length === 0 ? (
          <p className="text-sm text-muted">
            {a.searchTerms.length === 0 ? "Import a Search terms report to get negative keyword suggestions." : "No new negative keywords suggested for this period."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {negSuggestions.map((f) => (
              <FindingCard key={f.id} clientId={client.id} finding={f} decision={f.decision} canDecide={canDecide} />
            ))}
          </div>
        )}
      </section>
    </AdsPageShell>
  );
}
