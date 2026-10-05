import Link from "next/link";
import { db } from "@/db";
import { GenerateAdsForm } from "@/components/ad-writer-forms";
import { AdsTabs } from "@/components/ads-tabs";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { listAdDrafts } from "@/server/ad-drafts";
import { getActiveClient } from "@/server/active-client";
import { getClientProfile } from "@/server/clients";
import { hasRole } from "@/server/permissions";
import { requireCtx } from "@/server/session";

export const metadata = { title: "Ad writer" };

export default async function AdWriterPage() {
  const ctx = await requireCtx();
  const client = await getActiveClient(ctx);
  if (!client) {
    return (
      <>
        <PageHeader title="Ad writer" />
        <EmptyState title="Add a client first" action={<ButtonLink href="/clients/new">Add client</ButtonLink>} />
      </>
    );
  }
  const [profile, drafts] = await Promise.all([getClientProfile(db, ctx, client.id), listAdDrafts(db, ctx, client.id)]);
  const verified = profile.facts.filter((f) => f.verified);
  const unverified = profile.facts.length - verified.length;
  const canWrite = hasRole(ctx.role, "manager");
  const keySet = !!process.env.ANTHROPIC_API_KEY;

  return (
    <>
      <PageHeader
        title="Ad writer"
        description={<>Google Ads headlines, descriptions and callouts for <strong className="text-text">{client.name}</strong>, written by AI from verified facts only.</>}
      />
      <AdsTabs />

      <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <strong>Nothing is published to Google Ads.</strong> You review, edit and approve every line here, then copy the approved lines into
        Google Ads yourself. Lines with unverified claims, places the client doesn&apos;t serve, or too many characters can&apos;t be approved.
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          {!keySet ? (
            <div className="space-y-2 text-sm">
              <h2 className="font-semibold">Connect the AI first</h2>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Create an API key at <strong>console.anthropic.com</strong> → API keys (add a little credit under Billing).</li>
                <li>In Railway, open <strong>weather → Variables</strong> and add <code>ANTHROPIC_API_KEY</code> with the key as its value.</li>
                <li>Wait for the redeploy to finish, then reload this page.</li>
              </ol>
              <p className="text-muted">Each set of ads costs roughly R1–R3 in AI usage.</p>
            </div>
          ) : profile.services.length === 0 ? (
            <EmptyState title="Add services first" action={<ButtonLink href={`/clients/${client.id}`}>Open client profile</ButtonLink>}>
              The AI only writes about services you&apos;ve listed for this client.
            </EmptyState>
          ) : canWrite ? (
            <GenerateAdsForm clientId={client.id} services={profile.services.map((s) => s.name)} />
          ) : (
            <p className="text-sm text-muted">Viewers can read drafts but not write new ones.</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={`Verified facts the AI may use (${verified.length})`}
            description={
              <>
                Add or verify facts on the <Link href={`/clients/${client.id}`} className="underline">client profile</Link>.
                {unverified > 0 && ` ${unverified} unverified fact${unverified === 1 ? " is" : "s are"} not shared with the AI.`}
              </>
            }
          />
          {verified.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">None yet — ads will contain no offers or claims.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {verified.map((f, i) => (
                <li key={f.id} className="flex gap-2 px-5 py-2">
                  <Badge>F{i + 1}</Badge> {f.statement}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {drafts.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Drafts" />
          <ul className="divide-y divide-border text-sm">
            {drafts.map((d) => {
              const approved = d.items.filter((i) => i.status === "approved").length;
              return (
                <li key={d.id}>
                  <Link href={`/ads/creative/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-surface-2">
                    <span>
                      <span className="font-medium">{d.focus}</span>
                      <span className="block text-xs text-muted">
                        {d.createdAt.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" })}
                      </span>
                    </span>
                    <Badge tone={approved ? "good" : "neutral"}>{approved}/{d.items.length} approved</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
