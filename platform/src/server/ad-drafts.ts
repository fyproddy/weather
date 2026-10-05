import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { adDrafts, adsKeywordMetrics, type AdDraft, type AdDraftItem } from "@/db/schema";
import { checkAdLine, type AdItemKind, type AllowedSources } from "@/lib/ad-copy";
import type { AdWriter } from "./ad-writer";
import { audit, getClientProfile, isUuid } from "./clients";
import { assertRole, NotFoundError, type Ctx } from "./permissions";

export class AdDraftError extends Error {}

async function allowedSources(db: Db, ctx: Ctx, clientId: string) {
  const p = await getClientProfile(db, ctx, clientId);
  const allowed: AllowedSources = {
    clientName: p.client.name,
    industry: p.client.industry,
    services: p.services.map((s) => [s.name, s.description].filter(Boolean).join(" — ")),
    locations: [p.client.city, p.client.region, ...p.locations.map((l) => l.name)].filter(Boolean) as string[],
    verifiedFacts: p.facts.filter((f) => f.verified).map((f) => f.statement),
  };
  return { profile: p, allowed };
}

/** Re-checks every line against the client's *current* verified facts. */
function recheck(items: AdDraftItem[], allowed: AllowedSources): AdDraftItem[] {
  return items.map((i) => {
    const flags = checkAdLine(i.kind, i.text, allowed).flags;
    // An approved line that no longer passes (e.g. a fact was un-verified) drops back to pending.
    return { ...i, flags, status: i.status === "approved" && flags.length ? "pending" : i.status };
  });
}

export async function createAdDraft(
  db: Db,
  ctx: Ctx,
  clientId: string,
  input: { focus: string; instructions: string | null },
  writer: AdWriter,
  model: string,
) {
  assertRole(ctx, "manager");
  const { profile, allowed } = await allowedSources(db, ctx, clientId);
  if (profile.client.status !== "active") throw new AdDraftError("Restore this client before writing ads.");
  if (profile.services.length === 0) throw new AdDraftError("Add the client's services on their profile first — the AI only writes about services you've listed.");

  const facts = profile.facts.filter((f) => f.verified).map((f, i) => ({ id: `F${i + 1}`, text: f.statement }));
  const keywords = await db
    .select({ keyword: adsKeywordMetrics.keyword })
    .from(adsKeywordMetrics)
    .where(and(eq(adsKeywordMetrics.clientId, clientId), gt(adsKeywordMetrics.conversions, 0)))
    .groupBy(adsKeywordMetrics.keyword)
    .orderBy(desc(sql`sum(${adsKeywordMetrics.conversions})`))
    .limit(10);

  const copy = await writer({
    clientName: profile.client.name,
    industry: profile.client.industry,
    website: profile.client.website,
    services: allowed.services,
    locations: allowed.locations,
    facts,
    focus: input.focus,
    instructions: input.instructions,
    keywords: keywords.map((k) => k.keyword),
  });

  const known = new Set(facts.map((f) => f.id));
  const toItems = (kind: AdItemKind, lines: { text: string; fact_ids: string[] }[]): AdDraftItem[] =>
    lines
      .map((l) => l.text.trim())
      .map((text, idx) => ({
        id: randomUUID(),
        kind,
        text,
        original: text,
        factIds: lines[idx].fact_ids.filter((f) => known.has(f)),
        status: "pending" as const,
        flags: [],
      }))
      .filter((i) => i.text.length > 0);
  const items = recheck(
    [...toItems("headline", copy.headlines), ...toItems("description", copy.descriptions), ...toItems("callout", copy.callouts)],
    allowed,
  );
  if (items.length === 0) throw new AdDraftError("The AI didn't return any ad lines. Please try again.");

  const [draft] = await db
    .insert(adDrafts)
    .values({
      clientId,
      createdById: ctx.userId,
      focus: input.focus,
      instructions: input.instructions,
      model,
      facts,
      items,
      writerNotes: copy.notes.trim() || null,
    })
    .returning();
  await audit(db, ctx, "ads.copy_generated", clientId, { focus: input.focus, lines: items.length });
  return draft;
}

export async function listAdDrafts(db: Db, ctx: Ctx, clientId: string) {
  await getClientProfile(db, ctx, clientId);
  return db.select().from(adDrafts).where(eq(adDrafts.clientId, clientId)).orderBy(desc(adDrafts.createdAt));
}

export async function getAdDraft(db: Db, ctx: Ctx, clientId: string, draftId: string): Promise<AdDraft> {
  const { allowed } = await allowedSources(db, ctx, clientId);
  if (!isUuid(draftId)) throw new NotFoundError("Draft not found.");
  const [draft] = await db.select().from(adDrafts).where(and(eq(adDrafts.id, draftId), eq(adDrafts.clientId, clientId))).limit(1);
  if (!draft) throw new NotFoundError("Draft not found.");
  return { ...draft, items: recheck(draft.items, allowed) };
}

/** Read-modify-write one line under a row lock so concurrent edits don't clobber each other. */
async function updateItem(
  db: Db,
  ctx: Ctx,
  clientId: string,
  draftId: string,
  itemId: string,
  change: (item: AdDraftItem, allowed: AllowedSources) => AdDraftItem,
) {
  assertRole(ctx, "manager");
  const { allowed } = await allowedSources(db, ctx, clientId);
  if (!isUuid(draftId)) throw new NotFoundError("Draft not found.");
  return db.transaction(async (tx) => {
    const [draft] = await tx
      .select()
      .from(adDrafts)
      .where(and(eq(adDrafts.id, draftId), eq(adDrafts.clientId, clientId)))
      .for("update")
      .limit(1);
    if (!draft) throw new NotFoundError("Draft not found.");
    const idx = draft.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new NotFoundError("Line not found.");
    const items = recheck(draft.items, allowed);
    items[idx] = change(items[idx], allowed);
    await tx.update(adDrafts).set({ items }).where(eq(adDrafts.id, draftId));
    return items[idx];
  });
}

export async function editAdItem(db: Db, ctx: Ctx, clientId: string, draftId: string, itemId: string, text: string) {
  const t = text.trim().slice(0, 300);
  if (!t) throw new AdDraftError("A line can't be empty — reject it instead.");
  return updateItem(db, ctx, clientId, draftId, itemId, (item, allowed) => ({
    ...item,
    text: t,
    status: "pending",
    flags: checkAdLine(item.kind, t, allowed).flags,
  }));
}

export async function setAdItemStatus(
  db: Db,
  ctx: Ctx,
  clientId: string,
  draftId: string,
  itemId: string,
  status: AdDraftItem["status"],
) {
  const item = await updateItem(db, ctx, clientId, draftId, itemId, (it) => {
    if (status === "approved" && it.flags.length) {
      throw new AdDraftError(`Can't approve: ${it.flags[0]}. Edit the line, or verify the fact on the client's profile.`);
    }
    return { ...it, status };
  });
  await audit(db, ctx, `ads.copy_${status}`, clientId, { kind: item.kind });
  return item;
}

export async function deleteAdDraft(db: Db, ctx: Ctx, clientId: string, draftId: string) {
  assertRole(ctx, "manager");
  await getClientProfile(db, ctx, clientId);
  if (!isUuid(draftId)) throw new NotFoundError("Draft not found.");
  const gone = await db.delete(adDrafts).where(and(eq(adDrafts.id, draftId), eq(adDrafts.clientId, clientId))).returning({ id: adDrafts.id });
  if (!gone.length) throw new NotFoundError("Draft not found.");
}
