import { change, count, money, pct } from "@/lib/format";
import { formatDate } from "@/lib/date-range";
import { SOURCE_LABELS } from "@/lib/leads";
import { derive } from "@/server/ads";
import type { ReportData } from "@/server/reports";
import { DailyChart } from "./daily-chart";
import { StatTile } from "./stat";

function periodLabel(from: string, to: string) {
  const isMonth = from.endsWith("-01") && from.slice(0, 7) === to.slice(0, 7) && new Date(`${to}T00:00:00Z`).getUTCDate() === new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 0)).getUTCDate();
  return isMonth
    ? new Date(`${from}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" })
    : `${formatDate(from)} – ${formatDate(to)}`;
}

/** A client report. Used for the agency's view and the client's share link; prints cleanly to PDF. */
export function ReportView({ data, summary, title }: { data: ReportData; summary: string | null; title: string }) {
  const m = (n: number | null | undefined) => money(n, data.currency);
  const ads = data.ads;
  const d = ads ? derive(ads.current) : null;
  const pd = ads?.previous ? derive(ads.previous) : null;
  const adsDelta = (a: number | null | undefined, b: number | null | undefined) => (ads?.fair ? change(a, b) : null);
  const L = data.leads.current;
  const P = data.leads.previous;
  // Leads only compare when the previous period has leads logged; otherwise tracking may simply not have started.
  const leadDelta = (a: number, b: number) => (P.total > 0 ? change(a, b) : null);
  const vs = data.previous.label;
  const maxSource = Math.max(1, ...Object.values(L.bySource));

  return (
    <article className="mx-auto max-w-4xl space-y-8 print:space-y-6" aria-label={title}>
      <header className="border-b border-border pb-5">
        <div className="text-sm text-muted">{data.agencyName}</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{data.client.name}</h1>
        <p className="mt-1 text-muted">
          Growth report · <strong className="text-text">{periodLabel(data.period.from, data.period.to)}</strong>
          {data.client.area && ` · ${data.client.area}`}
        </p>
      </header>

      {summary && (
        <section aria-label="Summary" className="rounded-xl border border-border bg-surface p-5 print:border-0 print:p-0">
          <h2 className="mb-2 text-lg font-semibold">Summary</h2>
          <p className="whitespace-pre-line leading-relaxed">{summary}</p>
        </section>
      )}

      <section aria-label="Results">
        <h2 className="mb-3 text-lg font-semibold">Results</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3">
          <StatTile label="Enquiries (leads)" value={count(L.total)} delta={leadDelta(L.total, P.total)} comparedTo={vs} />
          <StatTile label="Jobs won" value={count(L.won)} delta={leadDelta(L.won, P.won)} comparedTo={vs} />
          <StatTile label="Value of jobs won" value={m(L.wonValue)} delta={leadDelta(L.wonValue, P.wonValue)} comparedTo={vs} />
          {ads && <StatTile label="Google Ads spend" value={m(ads.current.cost)} delta={adsDelta(ads.current.cost, ads.previous?.cost)} upIsGood={null} comparedTo={vs} />}
          {ads && (
            <StatTile
              label="Cost per lead (Google Ads)"
              value={m(data.leads.costPerLead)}
              note={data.leads.costPerLead !== null ? `${m(ads.current.cost)} ÷ ${L.bySource.google_ads ?? 0} Google Ads leads` : (data.leads.costPerLeadNote ?? "No Google Ads leads logged")}
            />
          )}
          {ads && <StatTile label="Google Ads conversions" value={count(ads.current.conversions)} delta={adsDelta(ads.current.conversions, ads.previous?.conversions)} comparedTo={vs} />}
        </div>
        {ads && !ads.complete && <p className="mt-2 text-xs text-muted">Google Ads figures cover only part of this period.</p>}
      </section>

      {ads && (
        <section aria-label="Google Ads" className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">Google Ads</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
            <StatTile label="Clicks" value={count(ads.current.clicks)} delta={adsDelta(ads.current.clicks, ads.previous?.clicks)} comparedTo={vs} />
            <StatTile label="Click-through rate" value={pct(d?.ctr)} delta={adsDelta(d?.ctr, pd?.ctr)} comparedTo={vs} />
            <StatTile label="Avg. cost per click" value={m(d?.cpc)} delta={adsDelta(d?.cpc, pd?.cpc)} upIsGood={false} comparedTo={vs} />
            <StatTile label="Cost per conversion" value={m(d?.costPerConversion)} delta={adsDelta(d?.costPerConversion, pd?.costPerConversion)} upIsGood={false} comparedTo={vs} />
          </div>
          {ads.daily.length > 1 && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <DailyChart title="Spend per day" kind="line" format="money" currency={data.currency} points={ads.daily.map((p) => ({ day: p.day, value: p.cost }))} />
            </div>
          )}
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[520px] text-sm tabular-nums">
              <caption className="sr-only">Campaigns</caption>
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 text-right font-medium">Spend</th>
                  <th className="px-3 py-2 text-right font-medium">Clicks</th>
                  <th className="px-3 py-2 text-right font-medium">Conversions</th>
                  <th className="px-3 py-2 text-right font-medium">Cost / conv.</th>
                </tr>
              </thead>
              <tbody>
                {ads.campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2 text-right">{m(c.cost)}</td>
                    <td className="px-3 py-2 text-right">{count(c.clicks)}</td>
                    <td className="px-3 py-2 text-right">{count(c.conversions)}</td>
                    <td className="px-3 py-2 text-right">{m(c.costPerConversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {L.total > 0 && (
        <section aria-label="Where enquiries came from" className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">Where enquiries came from</h2>
          <ul className="space-y-2 rounded-xl border border-border bg-surface p-5 text-sm">
            {Object.entries(L.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([s, n]) => (
                <li key={s} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 sm:grid-cols-[14rem_1fr_3rem]">
                  <span className="truncate">{SOURCE_LABELS[s]}</span>
                  <span className="h-2 rounded-full bg-surface-2" aria-hidden>
                    <span className="block h-2 rounded-full bg-chart print:[print-color-adjust:exact]" style={{ width: `${(n / maxSource) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{n}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {(data.work.done.length > 0 || data.work.approved.length > 0 || data.work.adLinesApproved > 0) && (
        <section aria-label="Work done" className="break-inside-avoid">
          <h2 className="mb-3 text-lg font-semibold">What we did</h2>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5 text-sm">
            {data.work.done.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {data.work.done.map((w) => (
                  <li key={w.title}>{w.title}</li>
                ))}
              </ul>
            )}
            {data.work.adLinesApproved > 0 && <p>Wrote and approved {data.work.adLinesApproved} new Google Ads lines.</p>}
            {data.work.approved.length > 0 && (
              <>
                <h3 className="pt-1 font-medium">Next steps</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {data.work.approved.map((w) => (
                    <li key={w.title}>{w.title}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      <footer className="border-t border-border pt-4 text-xs text-muted">
        Prepared by {data.agencyName} · figures as at{" "}
        {new Date(data.generatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}. Google
        Ads figures come from the account&apos;s own reports; enquiries are as logged.
      </footer>
    </article>
  );
}
