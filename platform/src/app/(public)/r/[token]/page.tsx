import { notFound } from "next/navigation";
import { db } from "@/db";
import { ReportView } from "@/components/report-view";
import { getSharedReport, type ReportData } from "@/server/reports";

export const metadata = { title: "Growth report", robots: { index: false, follow: false } };

/** Public, read-only report reached by its private share link. */
export default async function SharedReportPage(props: PageProps<"/r/[token]">) {
  const { token } = await props.params;
  const report = await getSharedReport(db, token);
  if (!report) notFound();
  return (
    <main className="px-4 py-8 sm:px-6">
      <ReportView data={report.data as ReportData} summary={report.summary} title={report.title} />
    </main>
  );
}
