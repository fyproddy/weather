import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { updateClientAction } from "@/app/actions/clients";
import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";
import { getClient } from "@/server/clients";
import { hasRole, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Edit client" };

export default async function EditClientPage(props: PageProps<"/clients/[id]/edit">) {
  const ctx = await requireCtx();
  const { id } = await props.params;
  if (!hasRole(ctx.role, "manager")) redirect(`/clients/${id}`);
  const client = await getClient(db, ctx, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  return (
    <>
      <PageHeader title={`Edit ${client.name}`} />
      <ClientForm action={updateClientAction.bind(null, client.id)} client={client} cancelHref={`/clients/${client.id}`} />
    </>
  );
}
