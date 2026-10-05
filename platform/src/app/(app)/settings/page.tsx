import { db } from "@/db";
import { AddUserForm, AgencyForm } from "@/components/settings-forms";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { getAgency, listUsers } from "@/server/agency";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireCtx();
  const isAdmin = hasRole(ctx.role, "admin");
  const [agency, users] = await Promise.all([getAgency(db, ctx), listUsers(db, ctx)]);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Agency" description={`Currency ${agency.currency} · Time zone ${agency.timezone}`} />
          <div className="p-5">{isAdmin ? <AgencyForm name={agency.name} /> : <p className="text-sm">{agency.name}</p>}</div>
        </Card>

        <Card>
          <CardHeader title="Team" description="People who can sign in to this agency." />
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <div className="font-medium">
                    {u.name} {u.id === ctx.userId && <span className="text-muted">(you)</span>}
                  </div>
                  <div className="text-muted">{u.email}</div>
                </div>
                <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role}</Badge>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <div className="border-t border-border p-5">
              <h3 className="mb-3 text-sm font-semibold">Add a team member</h3>
              <AddUserForm />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Google integration" description="Configured in Phase 3." />
          <ul className="list-disc space-y-1 py-4 pl-10 pr-5 text-sm text-muted">
            <li>Manager account: LeadPath Digital (796-732-7607)</li>
            <li>Google Ads API: enabled on Cloud project, Test access</li>
            <li>Live changes to Google Ads: off — every change will need your approval</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
