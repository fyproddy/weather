import { redirect } from "next/navigation";
import { createClientAction } from "@/app/actions/clients";
import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Add client" };

export default async function NewClientPage() {
  const ctx = await requireCtx();
  if (!hasRole(ctx.role, "manager")) redirect("/clients");
  return (
    <>
      <PageHeader title="Add client" description="Start with the basics. You can add services, locations, competitors and facts next." />
      <ClientForm action={createClientAction} cancelHref="/clients" />
    </>
  );
}
