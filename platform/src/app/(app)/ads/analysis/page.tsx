import { db } from "@/db";
import { AdsPageShell, OtherPeriods } from "@/components/ads-page-shell";
import { CopyButton, FindingCard } from "@/components/finding-card";
import { formatKeyword } from "@/lib/keyword-format";
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { getAdsAnalysis, type FindingWithDecision } from "@/server/ads-analysis";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { rangeFromParams } from "@/server/range";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Google Ads analysis" };

export default async function AnalysisPage(props: PageProps<"/ads/analysis">) {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title="Google Ads analysis" />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />
      </>
    );
  }
  const { range, previous, today } = await rangeFromParams(ctx, await props.searchParams);
  const a = await getAdsAnalysis(db, ctx, client.id, range, previous);
  const canDecide = hasRole(ctx.role, "manager");

  const open = a.findings.filter((f) => f.decision === null);
  const todo = [...a.findings, ...a.carried].filter((f) => f.decision === "approved");
  const done = [...a.findings, ...a.carried].filter((f) => f.decision === "done");
  const dismissed = a.findings.filter((f) => f.decision === "dismissed");
  const negatives = todo.filter((f) => f.action?.type === "add_negative_keyword");

  const section = (title: string, items: FindingWithDecision[], description?: string) =>
    items.length > 0 && (
      <section className="mb-8" aria-label={title}>
        <h2 className="mb-1 text-lg font-semibold">
          {title} <span className="text-muted">({items.length})</span>
        </h2>
        {description && <p className="mb-3 text-sm text-muted">{description}</p>}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {items.map((f) => (
            <FindingCard key={f.id} clientId={client.id} finding={f} decision={f.decision} canDecide={canDecide} />
          ))}
        </div>
      </section>
    );

  return (
    <AdsPageShell title="Google Ads analysis" clientName={client.name} range={range} today={today} canImport={canDecide}>
      <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <strong>Nothing changes in Google Ads automatically.</strong> Approving a recommendation adds it to your to-do list; you make the change in
        Google Ads, then mark it done. Every recommendation is calculated from the imported figures shown with it.
        {!a.fair && a.campaigns.length > 0 && " Period-on-period checks are off because the previous period isn't fully imported."}
      </div>

      {a.campaigns.length === 0 ? (
        <EmptyState title="No campaign data in this range" action={canDecide && <ButtonLink href="/ads/import">Import a report</ButtonLink>}>
          Import a Campaigns report covering these dates. Add Keywords and Search terms reports for keyword and negative keyword suggestions.
        </EmptyState>
      ) : (
        <>
          {a.keywords.length === 0 && <OtherPeriods what="keyword" periods={a.available.keywords} />}
          {a.searchTerms.length === 0 && <OtherPeriods what="search term" periods={a.available.searchTerms} />}

          <div className="mb-8 grid grid-cols-3 gap-3">
            {(["problem", "opportunity", "winner"] as const).map((k) => (
              <div key={k} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="text-sm capitalize text-muted">{k === "opportunity" ? "Opportunities" : `${k}s`}</div>
                <div className="text-2xl font-semibold tabular-nums">{a.findings.filter((f) => f.kind === k).length}</div>
              </div>
            ))}
          </div>

          {todo.length > 0 && (
            <Card className="mb-8">
              <CardHeader
                title={`To do in Google Ads (${todo.length})`}
                description="Approved recommendations. Make each change in Google Ads, then mark it done."
                action={
                  negatives.length > 0 && (
                    <CopyButton
                      label={`Copy ${negatives.length} negative keyword${negatives.length === 1 ? "" : "s"}`}
                      text={negatives.map((f) => formatKeyword(f.action!.text!, f.action!.matchType)).join("\n")}
                    />
                  )
                }
              />
              <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                {todo.map((f) => (
                  <FindingCard key={f.id} clientId={client.id} finding={f} decision={f.decision} canDecide={canDecide} />
                ))}
              </div>
            </Card>
          )}

          {section("Problems", open.filter((f) => f.kind === "problem"), "Where money is being wasted or results are slipping.")}
          {section("Opportunities", open.filter((f) => f.kind === "opportunity"), "Changes likely to get more results from the same budget.")}
          {section("Winners", open.filter((f) => f.kind === "winner"), "What's working — protect these.")}
          {open.length === 0 && todo.length === 0 && (
            <EmptyState title="Nothing to flag">Every campaign is within normal ranges for this period, or there isn&apos;t enough data yet to judge.</EmptyState>
          )}

          {(done.length > 0 || dismissed.length > 0) && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted">
                Done ({done.length}) · Dismissed ({dismissed.length})
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {[...done, ...dismissed].map((f) => (
                  <FindingCard key={f.id} clientId={client.id} finding={f} decision={f.decision} canDecide={canDecide} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </AdsPageShell>
  );
}
