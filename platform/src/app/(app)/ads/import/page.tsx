import { redirect } from "next/navigation";
import { AdsImportForm } from "@/components/ads-forms";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Import Google Ads report" };

export default async function AdsImportPage() {
  const ctx = await requireCtx();
  if (!hasRole(ctx.role, "manager")) redirect("/ads");
  const client = await getActiveClient(ctx);
  if (!client) return <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />;

  return (
    <>
      <PageHeader
        title="Import Google Ads report"
        description={
          <>
            Into <strong className="text-text">{client.name}</strong>. Use the client switcher at the top to import for a different client.
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <AdsImportForm clientId={client.id} />
        </Card>
        <Card className="space-y-4 p-5 text-sm lg:col-span-2">
          <div>
            <h2 className="mb-1 font-semibold">Which reports?</h2>
            <p className="text-muted">
              The file type is detected automatically. Import all three for the full analysis — use the same date range for each.
            </p>
          </div>
          <div>
            <h3 className="font-medium">1. Campaigns (required)</h3>
            <p className="text-muted">
              Campaigns → choose dates → <strong>Segment → Time → Day</strong> → Download → .csv. Add the Conversions, Budget and Search impr. share
              columns if they aren&apos;t showing.
            </p>
          </div>
          <div>
            <h3 className="font-medium">2. Keywords</h3>
            <p className="text-muted">Keywords → Search keywords → same dates → Download → .csv. Include Match type and Quality Score columns.</p>
          </div>
          <div>
            <h3 className="font-medium">3. Search terms</h3>
            <p className="text-muted">Insights and reports → Search terms → same dates → Download → .csv. This powers negative keyword suggestions.</p>
          </div>
          <p className="text-muted">
            Only the numbers in the files are used — nothing is estimated. Re-importing the same dates replaces earlier data.
          </p>
        </Card>
      </div>
    </>
  );
}
