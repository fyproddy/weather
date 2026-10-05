import Link from "next/link";
import { db } from "@/db";
import { CreateReportForm } from "@/components/report-forms";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, todayIn } from "@/lib/date-range";
import { getAgency } from "@/server/agency";
import { getActiveClient } from "@/server/active-client";
import { hasRole } from "@/server/permissions";
import { listReports } from "@/server/reports";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />
      </>
    );
  }
  const [rows, agency] = await Promise.all([listReports(db, ctx, client.id), getAgency(db, ctx)]);
  return (
    <>
      <PageHeader title="Reports" description={<>Client reports for <strong className="text-text">{client.name}</strong>.</>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">New report</h2>
          {hasRole(ctx.role, "manager") ? (
            <CreateReportForm clientId={client.id} today={todayIn(agency.timezone)} />
          ) : (
            <p className="text-sm text-muted">Viewers can read reports but not create them.</p>
          )}
          <p className="mt-4 text-xs text-muted">
            Reports include leads, jobs won, Google Ads results and the work you marked done. They never include a lead&apos;s name or contact details.
          </p>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title={`Reports (${rows.length})`} />
          {rows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">No reports yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-2">
                    <span>
                      <span className="font-medium">{r.title}</span>
                      <span className="block text-xs text-muted">{formatDate(r.periodStart)} – {formatDate(r.periodEnd)}</span>
                    </span>
                    {r.shareToken ? <Badge tone="good">Shared</Badge> : <Badge>Private</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
