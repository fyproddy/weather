import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { updateLeadAction } from "@/app/actions/leads";
import { DeleteLeadButton, LeadForm } from "@/components/lead-forms";
import { PageHeader } from "@/components/ui";
import { todayIn } from "@/lib/date-range";
import { getAgency } from "@/server/agency";
import { getActiveClient } from "@/server/active-client";
import { getClientProfile } from "@/server/clients";
import { getLead } from "@/server/leads";
import { hasRole, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Edit lead" };

export default async function EditLeadPage(props: PageProps<"/leads/[id]">) {
  const ctx = await requireCtx();
  if (!hasRole(ctx.role, "manager")) redirect("/leads");
  const { id } = await props.params;
  const client = await getActiveClient(ctx);
  if (!client) notFound();
  const lead = await getLead(db, ctx, client.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [profile, agency] = await Promise.all([getClientProfile(db, ctx, client.id), getAgency(db, ctx)]);
  const receivedOn = new Intl.DateTimeFormat("en-CA", { timeZone: agency.timezone }).format(lead.receivedAt);
  return (
    <>
      <PageHeader title={`Edit lead: ${lead.name}`} description={<>For <strong className="text-text">{client.name}</strong></>} actions={<DeleteLeadButton clientId={client.id} leadId={lead.id} />} />
      <LeadForm
        action={updateLeadAction.bind(null, client.id, lead.id)}
        lead={lead}
        services={profile.services.map((s) => s.name)}
        today={todayIn(agency.timezone)}
        receivedOn={receivedOn}
      />
    </>
  );
}
