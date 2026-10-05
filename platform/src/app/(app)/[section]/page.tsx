import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleConnections } from "@/db/schema";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { getActiveClient } from "@/server/active-client";
import { requireCtx } from "@/server/session";
import { PROVIDER_LABELS, SECTIONS } from "@/lib/sections";

export async function generateMetadata(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  return { title: SECTIONS.find((s) => s.slug === section)?.label ?? "Not found" };
}

export default async function SectionPage(props: PageProps<"/[section]">) {
  const { section: slug } = await props.params;
  const section = SECTIONS.find((s) => s.slug === slug);
  if (!section) notFound();

  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title={section.label} description={section.summary} />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>}>
          {section.label} is shown per client.
        </EmptyState>
      </>
    );
  }

  const connections = await db.select().from(googleConnections).where(eq(googleConnections.clientId, client.id));
  const statusOf = (p: string) => connections.find((c) => c.provider === p)?.status ?? "not_connected";

  return (
    <>
      <PageHeader title={section.label} description={<>{section.summary} Showing <strong className="text-text">{client.name}</strong>.</>} />

      {section.sources.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Data sources" description="This section only shows real data from these sources — never estimates." />
          <ul className="divide-y divide-border">
            {section.sources.map((p) => (
              <li key={p} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{PROVIDER_LABELS[p]}</span>
                <Badge tone={statusOf(p) === "connected" ? "good" : "neutral"}>
                  {statusOf(p) === "connected" ? "Connected" : "Not connected"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title={<span className="flex items-center gap-2">Coming in Phase {section.phase} <Badge tone="accent">Planned</Badge></span>} />
        <ul className="list-disc space-y-1.5 py-4 pl-10 pr-5 text-sm">
          {section.plans.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
