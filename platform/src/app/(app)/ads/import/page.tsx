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
        <Card className="p-5 text-sm lg:col-span-2">
          <h2 className="mb-2 font-semibold">How to export from Google Ads</h2>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Open the client&apos;s account in Google Ads and go to <strong>Campaigns</strong>.
            </li>
            <li>Choose the date range at the top (e.g. last 90 days).</li>
            <li>
              Click <strong>Segment</strong> → <strong>Time</strong> → <strong>Day</strong>. Daily data gives you charts and fair comparisons.
            </li>
            <li>
              Optional: add columns <strong>Conversions</strong>, <strong>Budget</strong> and <strong>Search impr. share</strong>.
            </li>
            <li>
              Click <strong>Download</strong> and choose <strong>.csv</strong>.
            </li>
          </ol>
          <p className="mt-3 text-muted">
            Only the numbers in the file are used — nothing is estimated. CTR, CPC and cost per conversion are recalculated from the totals.
          </p>
        </Card>
      </div>
    </>
  );
}
