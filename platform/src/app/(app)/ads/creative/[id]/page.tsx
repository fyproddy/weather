import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { AdLine, DeleteDraftButton } from "@/components/ad-writer-forms";
import { AdsTabs } from "@/components/ads-tabs";
import { CopyButton } from "@/components/finding-card";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { TARGET_COUNTS } from "@/lib/ad-copy";
import { getAdDraft } from "@/server/ad-drafts";
import { getActiveClient } from "@/server/active-client";
import { hasRole, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Review ads" };

const SECTIONS = [
  ["headline", "Headlines", "Google shows up to 3 at a time; add at least 3 (ideally 10–15)."],
  ["description", "Descriptions", "Google shows up to 2 at a time; add at least 2."],
  ["callout", "Callouts", "Short extras shown under the ad (account or campaign assets)."],
] as const;

export default async function DraftPage(props: PageProps<"/ads/creative/[id]">) {
  const ctx = await requireCtx();
  const { id } = await props.params;
  const client = await getActiveClient(ctx);
  if (!client) notFound();
  const draft = await getAdDraft(db, ctx, client.id, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const canEdit = hasRole(ctx.role, "manager");
  const factText = Object.fromEntries(draft.facts.map((f) => [f.id, f.text]));

  return (
    <>
      <PageHeader
        title={`Ads: ${draft.focus}`}
        description={<>For <strong className="text-text">{client.name}</strong> · written by {draft.model} · {draft.createdAt.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })}</>}
        actions={canEdit && <DeleteDraftButton clientId={client.id} draftId={draft.id} />}
      />
      <AdsTabs />
      <p className="mb-4 text-sm">
        <Link href="/ads/creative" className="text-accent hover:underline">← All drafts</Link>
      </p>

      {draft.writerNotes && (
        <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          <span className="font-medium">Notes from the AI: </span>
          {draft.writerNotes}
        </div>
      )}

      <div className="space-y-6">
        {SECTIONS.map(([kind, title, hint]) => {
          const items = draft.items.filter((i) => i.kind === kind);
          const approved = items.filter((i) => i.status === "approved");
          return (
            <Card key={kind}>
              <CardHeader
                title={`${title} (${approved.length} approved of ${items.length})`}
                description={`${hint} Target: ${TARGET_COUNTS[kind]}.`}
                action={approved.length > 0 && <CopyButton label={`Copy ${approved.length} approved`} text={approved.map((i) => i.text).join("\n")} />}
              />
              <ul className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2" aria-label={title}>
                {items.map((item) => (
                  <AdLine key={`${item.id}:${item.text}:${item.status}`} clientId={client.id} draftId={draft.id} item={item} canEdit={canEdit} factText={factText} />
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
