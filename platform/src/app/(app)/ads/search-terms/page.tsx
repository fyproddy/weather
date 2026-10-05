import { db } from "@/db";
import { AdsPageShell, OtherPeriods } from "@/components/ads-page-shell";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { count, money, pct } from "@/lib/format";
import { getAdsAnalysis } from "@/server/ads-analysis";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Search terms" };

export default async function SearchTermsPage(props: PageProps<"/ads/search-terms">) {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) return <><PageHeader title="Search terms" /><EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} /></>;
  const { range, previous, today } = await rangeFromParams(ctx, await props.searchParams);
  const a = await getAdsAnalysis(db, ctx, client.id, range, previous);
  const canDecide = hasRole(ctx.role, "manager");

  // Which finding (if any) applies to each search term.
  const negatives = a.findings.filter((f) => f.action?.type === "add_negative_keyword");
  const addKw = new Map(a.findings.filter((f) => f.action?.type === "add_keyword").map((f) => [f.target.toLowerCase(), f]));
  const flagFor = (term: string) => {
    const t = term.toLowerCase();
    if (addKw.has(t)) return { label: "Add as keyword", tone: "good" as const };
    const neg = negatives.find((f) =>
      f.action!.matchType === "exact" ? f.action!.text === t : new RegExp(`\\b${f.action!.text!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t),
    );
    if (neg) return { label: `Negative: ${neg.action!.matchType === "exact" ? `[${neg.action!.text}]` : `"${neg.action!.text}"`}`, tone: "bad" as const };
    return null;
  };

  return (
    <AdsPageShell title="Search terms" clientName={client.name} range={range} today={today} canImport={canDecide}>
      {a.searchTerms.length === 0 ? (
        <>
          <OtherPeriods what="search term" periods={a.available.searchTerms} />
          <EmptyState title="No search term data in this range" action={canDecide && <ButtonLink href="/ads/import">Import a Search terms report</ButtonLink>}>
            In Google Ads open Insights and reports → Search terms, pick the dates, then Download → .csv.
          </EmptyState>
        </>
      ) : (
        <Card>
          <CardHeader
            title={`What people searched (${a.searchTerms.length})`}
            description="The actual searches that showed your ads. Flags come from the Analysis tab, where you can approve them."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm tabular-nums">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  {["Search term", "Suggestion", "Keyword", "Campaign · Ad group", "Cost", "Clicks", "CTR", "Conv.", "Cost / conv."].map((h, i) => (
                    <th key={h} className={`px-3 py-2 font-medium ${i > 3 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.searchTerms.map((s) => {
                  const flag = flagFor(s.searchTerm);
                  return (
                    <tr key={`${s.campaignName}|${s.adGroupName}|${s.searchTerm}`} className="border-b border-border last:border-0">
                      <td className="min-w-52 px-3 py-2 font-medium">
                        {s.searchTerm}
                        {/excluded/i.test(s.addedExcluded ?? "") && <span className="ml-2"><Badge>Excluded</Badge></span>}
                        {/added/i.test(s.addedExcluded ?? "") && <span className="ml-2"><Badge>Keyword</Badge></span>}
                      </td>
                      <td className="px-3 py-2">{flag ? <Badge tone={flag.tone}>{flag.label}</Badge> : <span className="text-muted">—</span>}</td>
                      <td className="px-3 py-2 text-muted">{s.keyword ?? "—"}</td>
                      <td className="max-w-56 truncate px-3 py-2 text-muted" title={`${s.campaignName} · ${s.adGroupName}`}>{s.campaignName} · {s.adGroupName || "—"}</td>
                      <td className="px-3 py-2 text-right">{money(s.cost, a.currency)}</td>
                      <td className="px-3 py-2 text-right">{count(s.clicks)}</td>
                      <td className="px-3 py-2 text-right">{pct(s.ctr)}</td>
                      <td className="px-3 py-2 text-right">{count(s.conversions)}</td>
                      <td className="px-3 py-2 text-right">{money(s.costPerConversion, a.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdsPageShell>
  );
}
