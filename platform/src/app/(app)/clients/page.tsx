import Link from "next/link";
import { db } from "@/db";
import { clientCounts, listClients } from "@/server/clients";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import { Badge, ButtonLink, Card, EmptyState, Input, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Clients" };

export default async function ClientsPage(props: PageProps<"/clients">) {
  const ctx = await requireCtx();
  const sp = await props.searchParams;
  const status = sp.status === "archived" ? "archived" : "active";
  const search = typeof sp.q === "string" ? sp.q : "";
  const [rows, counts] = await Promise.all([listClients(db, ctx, { status, search }), clientCounts(db, ctx)]);
  const canEdit = hasRole(ctx.role, "manager");

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every business you manage. Each client's data is kept completely separate."
        actions={canEdit && <ButtonLink href="/clients/new">Add client</ButtonLink>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
          {(["active", "archived"] as const).map((s) => (
            <Link
              key={s}
              href={s === "active" ? "/clients" : "/clients?status=archived"}
              className={cx("rounded-md px-3 py-1 capitalize", status === s ? "bg-surface font-medium shadow-sm" : "text-muted")}
            >
              {s} ({counts[s]})
            </Link>
          ))}
        </div>
        <form className="w-full sm:w-64">
          {status === "archived" && <input type="hidden" name="status" value="archived" />}
          <Input name="q" defaultValue={search} placeholder="Search name, industry, city" aria-label="Search clients" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? "No clients match your search" : status === "archived" ? "No archived clients" : "No clients yet"}
          action={!search && status === "active" && canEdit && <ButtonLink href="/clients/new">Add your first client</ButtonLink>}
        >
          {!search && status === "active" && "Add a business to start tracking its Google growth."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 hover:bg-surface-2">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-muted">
                  {[c.industry, [c.city, c.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No details yet"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {c.website && <span className="hidden text-sm text-muted sm:inline">{c.website.replace(/^https?:\/\//, "")}</span>}
                {status === "archived" && <Badge>Archived</Badge>}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
