import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { db } from "@/db";
import {
  AddCompetitorForm,
  AddFactForm,
  AddLocationForm,
  AddServiceForm,
  ArchiveButton,
  DeleteClientForm,
  RemoveButton,
  VerifyToggle,
} from "@/components/client-profile-forms";
import { Badge, ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { getClientProfile } from "@/server/clients";
import { hasRole, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import { PROVIDER_LABELS } from "@/lib/sections";
import { FACT_CATEGORY_LABEL } from "@/lib/facts";

export async function generateMetadata() {
  return { title: "Client" };
}


export default async function ClientPage(props: PageProps<"/clients/[id]">) {
  const ctx = await requireCtx();
  const { id } = await props.params;
  const profile = await getClientProfile(db, ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const { client, services, locations, competitors, facts, connections } = profile;
  const canEdit = hasRole(ctx.role, "manager") && client.status === "active";
  const archived = client.status === "archived";
  const verifiedCount = facts.filter((f) => f.verified).length;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {client.name} {archived && <Badge>Archived</Badge>}
          </span>
        }
        description={[client.industry, [client.city, client.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        actions={
          hasRole(ctx.role, "manager") && (
            <>
              {canEdit && (
                <ButtonLink href={`/clients/${client.id}/edit`} variant="secondary">
                  Edit details
                </ButtonLink>
              )}
              <ArchiveButton clientId={client.id} archived={archived} />
            </>
          )
        }
      />

      {archived && (
        <div className="mb-6 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          This client is archived. Its data is kept but it&apos;s hidden from the dashboard and can&apos;t be edited. Restore it to make changes.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Business details" />
          <dl className="grid gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-2">
            <Detail label="Website">
              {client.website ? (
                <a href={client.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {client.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </Detail>
            <Detail label="Email">{client.email}</Detail>
            <Detail label="Phone">{client.phone && <a href={`tel:${client.phone.replace(/\s/g, "")}`}>{client.phone}</a>}</Detail>
            <Detail label="WhatsApp">
              {client.whatsapp && (
                <a href={`https://wa.me/${toWaNumber(client.whatsapp)}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {client.whatsapp}
                </a>
              )}
            </Detail>
            <Detail label="Address">{[client.address, client.city, client.region, client.country].filter(Boolean).join(", ")}</Detail>
            <Detail label="Notes">{client.notes && <span className="whitespace-pre-line">{client.notes}</span>}</Detail>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Google connections" description="Connecting accounts arrives in Phase 3." />
          <ul className="divide-y divide-border">
            {connections.map((c) => (
              <li key={c.provider} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{PROVIDER_LABELS[c.provider]}</span>
                <Badge tone={c.status === "connected" ? "good" : c.status === "error" ? "bad" : "neutral"}>
                  {c.status === "connected" ? "Connected" : c.status === "error" ? "Error" : "Not connected"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Services"
          description="What the business actually offers. Used for keywords and ads."
          empty="No services added yet."
          items={services.map((s) => ({
            id: s.id,
            main: s.name,
            sub: s.description,
            remove: canEdit && <RemoveButton clientId={client.id} kind="service" id={s.id} label={s.name} />,
          }))}
          form={canEdit && <AddServiceForm clientId={client.id} />}
        />
        <ListCard
          title="Target locations"
          description="Where the business wants customers from."
          empty="No target locations yet."
          items={locations.map((l) => ({
            id: l.id,
            main: l.name,
            sub: l.radiusKm ? `${l.radiusKm} km radius` : null,
            remove: canEdit && <RemoveButton clientId={client.id} kind="location" id={l.id} label={l.name} />,
          }))}
          form={canEdit && <AddLocationForm clientId={client.id} />}
        />
        <ListCard
          title="Competitors"
          description="Businesses you want to compare against."
          empty="No competitors tracked yet."
          items={competitors.map((c) => ({
            id: c.id,
            main: c.name,
            sub: c.website?.replace(/^https?:\/\//, ""),
            remove: canEdit && <RemoveButton clientId={client.id} kind="competitor" id={c.id} label={c.name} />,
          }))}
          form={canEdit && <AddCompetitorForm clientId={client.id} />}
        />

        <Card className="lg:col-span-2">
          <CardHeader
            title="Verified facts"
            description={
              <>
                The AI assistants may only use facts marked <strong>verified</strong> — never invented prices, guarantees,
                certifications, awards or claims. {verifiedCount} of {facts.length} verified.
              </>
            }
          />
          {facts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">No facts yet. Add things the client has confirmed, like warranties or free quotes.</p>
          ) : (
            <ul className="divide-y divide-border">
              {facts.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{FACT_CATEGORY_LABEL[f.category]}</Badge>
                      {f.verified ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Not verified</Badge>}
                    </div>
                    <p className="mt-1 text-sm">{f.statement}</p>
                    {f.source && <p className="text-xs text-muted">Source: {f.source}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-3">
                      <VerifyToggle clientId={client.id} factId={f.id} verified={f.verified} />
                      <RemoveButton clientId={client.id} kind="fact" id={f.id} label="fact" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div className="border-t border-border p-5">
              <AddFactForm clientId={client.id} />
            </div>
          )}
        </Card>
      </div>

      {archived && hasRole(ctx.role, "admin") && (
        <Card className="mt-6 border-bad/30">
          <CardHeader title="Delete client" />
          <div className="p-5">
            <DeleteClientForm clientId={client.id} clientName={client.name} />
          </div>
        </Card>
      )}
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

function ListCard({
  title,
  description,
  empty,
  items,
  form,
}: {
  title: string;
  description: string;
  empty: string;
  items: { id: string; main: string; sub?: string | null; remove: ReactNode }[];
  form: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{i.main}</div>
                {i.sub && <div className="truncate text-xs text-muted">{i.sub}</div>}
              </div>
              {i.remove}
            </li>
          ))}
        </ul>
      )}
      {form && <div className="border-t border-border p-4">{form}</div>}
    </Card>
  );
}

/** wa.me needs international digits only; assume South Africa for local 0-prefixed numbers. */
function toWaNumber(n: string) {
  const digits = n.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}
