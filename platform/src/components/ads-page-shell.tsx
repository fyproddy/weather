import type { ReactNode } from "react";
import { AdsTabs } from "./ads-tabs";
import { RangePicker } from "./range-picker";
import { ButtonLink, PageHeader } from "./ui";
import { formatDate, type DateRange } from "@/lib/date-range";

/** Header + range picker + tabs shared by the Google Ads pages. */
export function AdsPageShell({
  title,
  clientName,
  range,
  today,
  canImport,
  children,
}: {
  title: string;
  clientName: string;
  range: DateRange;
  today: string;
  canImport: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={
          <>
            Showing <strong className="text-text">{clientName}</strong> · {range.label.toLowerCase()} ({formatDate(range.from)} – {formatDate(range.to)})
          </>
        }
        actions={
          <>
            <RangePicker value={range.key} from={range.from} to={range.to} max={today} />
            {canImport && <ButtonLink href="/ads/import">Import CSV</ButtonLink>}
          </>
        }
      />
      <AdsTabs />
      {children}
    </>
  );
}

/** When a report type has data but not in this range, offer to jump to it. */
export function OtherPeriods({ what, periods }: { what: string; periods: { from: string; to: string }[] }) {
  if (periods.length === 0) return null;
  return (
    <div role="note" className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm text-warn">
      No {what} data falls inside this date range. Imported {what} reports cover:{" "}
      {periods.map((p, i) => (
        <span key={p.from + p.to}>
          {i > 0 && ", "}
          <a className="font-medium underline" href={`?range=custom&from=${p.from}&to=${p.to}`}>
            {formatDate(p.from)} – {formatDate(p.to)}
          </a>
        </span>
      ))}
      .
    </div>
  );
}
