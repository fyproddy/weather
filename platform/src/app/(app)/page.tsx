import Link from "next/link";
import { db } from "@/db";
import { googleConnections } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { listClients, recentActivity } from "@/server/clients";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Dashboard" };

/**
 * Phase 1 dashboard: every metric slot is shown but stays empty until a real
 * source is connected. Nothing here is estimated or made up.
 */
const METRICS = [
  "Google Ads",
  "Organic visibility",
  "Maps visibility",
  "SEO score",
  "Google rating",
  "Reviews",
  "Leads",
  "Ad spend",
  "Cost per lead",
  "Organic traffic",
] as const;

export default async function DashboardPage() {
  const ctx = await requireCtx();
  const [clients, activity] = await Promise.all([listClients(db, ctx), recentActivity(db, ctx, 8)]);
  const connections = clients.length
    ? await db.select().from(googleConnections).where(inArray(googleConnections.clientId, clients.map((c) => c.id)))
    : [];
  const connectedCount = (clientId: string) =>
    connections.filter((c) => c.clientId === clientId && c.status === "connected").length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="All your clients at a glance. Numbers appear once a client's Google accounts are connected."
        actions={hasRole(ctx.role, "manager") && <ButtonLink href="/clients/new">Add client</ButtonLink>}
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          action={hasRole(ctx.role, "manager") && <ButtonLink href="/clients/new">Add your first client</ButtonLink>}
        >
          Add the businesses you manage. Each one gets its own Google Ads, SEO, Maps, reviews and leads view.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clients.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <Link href={`/clients/${c.id}`} className="font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <div className="truncate text-sm text-muted">
                    {[c.industry, [c.city, c.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Badge tone={connectedCount(c.id) ? "good" : "neutral"}>{connectedCount(c.id)}/4 connected</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 text-sm">
                {METRICS.map((m) => (
                  <div key={m} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">{m}</dt>
                    <dd className="text-muted/70" title="No data source connected yet">
                      —
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto border-t border-border px-5 py-3 text-xs text-muted">
                No data yet — connect Google accounts in Phase 3.
              </div>
            </Card>
          ))}
        </div>
      )}

      {activity.length > 0 && (
        <Card className="mt-8">
          <div className="border-b border-border px-5 py-3 text-sm font-semibold">Recent activity</div>
          <ul className="divide-y divide-border text-sm">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 px-5 py-2">
                <span>{describe(a.action, a.details as Record<string, string> | null)}</span>
                <time className="shrink-0 text-muted" dateTime={a.createdAt.toISOString()}>
                  {a.createdAt.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })}
                </time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function describe(action: string, d: Record<string, string> | null) {
  const map: Record<string, string> = {
    "client.created": `Added client ${d?.name ?? ""}`,
    "client.updated": "Updated client details",
    "client.archived": "Archived a client",
    "client.restored": "Restored a client",
    "client.deleted": `Deleted client ${d?.name ?? ""}`,
    "service.added": `Added service ${d?.name ?? ""}`,
    "location.added": `Added target location ${d?.name ?? ""}`,
    "competitor.added": `Added competitor ${d?.name ?? ""}`,
    "service.removed": "Removed a service",
    "location.removed": "Removed a target location",
    "competitor.removed": "Removed a competitor",
    "fact.removed": "Removed a fact",
    "fact.added": "Added a fact",
    "fact.verified": "Verified a fact",
    "fact.unverified": "Unverified a fact",
    "user.created": `Added user ${d?.email ?? ""}`,
    "agency.updated": "Updated agency settings",
  };
  return map[action] ?? action.replace(".", " ");
}
