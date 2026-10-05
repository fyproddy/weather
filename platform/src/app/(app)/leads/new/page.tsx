import { redirect } from "next/navigation";
import { db } from "@/db";
import { createLeadAction } from "@/app/actions/leads";
import { LeadForm } from "@/components/lead-forms";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { todayIn } from "@/lib/date-range";
import { getAgency } from "@/server/agency";
import { getActiveClient } from "@/server/active-client";
import { getClientProfile } from "@/server/clients";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Add lead" };

export default async function NewLeadPage() {
  const ctx = await requireCtx();
  if (!hasRole(ctx.role, "manager")) redirect("/leads");
  const client = await getActiveClient(ctx);
  if (!client) return <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />;
  const [profile, agency] = await Promise.all([getClientProfile(db, ctx, client.id), getAgency(db, ctx)]);
  return (
    <>
      <PageHeader title="Add lead" description={<>For <strong className="text-text">{client.name}</strong></>} />
      <LeadForm action={createLeadAction.bind(null, client.id)} services={profile.services.map((s) => s.name)} today={todayIn(agency.timezone)} />
    </>
  );
}
