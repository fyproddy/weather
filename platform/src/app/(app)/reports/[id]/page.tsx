import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { ReportControls, SummaryForm } from "@/components/report-forms";
import { ReportView } from "@/components/report-view";
import { Card } from "@/components/ui";
import { hasRole, NotFoundError } from "@/server/permissions";
import { getReport, type ReportData } from "@/server/reports";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Report" };

export default async function ReportPage(props: PageProps<"/reports/[id]">) {
  const ctx = await requireCtx();
  const { id } = await props.params;
  const report = await getReport(db, ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const shareUrl = report.shareToken ? `${origin}/r/${report.shareToken}` : null;
  const canEdit = hasRole(ctx.role, "manager");

  return (
    <>
      <div className="mb-6 space-y-4 print:hidden">
        <Link href="/reports" className="text-sm text-accent hover:underline">← All reports</Link>
        {canEdit && (
          <Card className="space-y-5 p-5">
            <ReportControls reportId={report.id} shareUrl={shareUrl} />
            <SummaryForm reportId={report.id} summary={report.summary} />
          </Card>
        )}
      </div>
      <ReportView data={report.data as ReportData} summary={report.summary} title={report.title} />
    </>
  );
}
