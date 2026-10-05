import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agencies, clients, leads } from "@/db/schema";
import type { LeadInput } from "@/lib/validation";
import { audit, getClient, isUuid } from "./clients";
import { assertRole, NotFoundError, type Ctx } from "./permissions";

/**
 * Leads are personal information: every query goes through a client already
 * checked against the caller's agency, and changes are audit-logged
 * (without copying the person's details into the log).
 */

async function agencyTimezone(db: Db, ctx: Ctx) {
  const [a] = await db.select({ tz: agencies.timezone }).from(agencies).where(eq(agencies.id, ctx.agencyId));
  return a?.tz ?? "Africa/Johannesburg";
}

/** "2026-10-05" in the agency's time zone → that day's 08:00 local, for leads logged with only a date. */
function receivedAtFor(day: string | undefined, tz: string) {
  if (!day) return new Date();
  // Noon-ish local avoids the date shifting across zones; exact time isn't known.
  const probe = new Date(`${day}T12:00:00Z`);
  const local = new Date(probe.toLocaleString("en-US", { timeZone: tz }));
  const offset = local.getTime() - probe.getTime();
  return new Date(Date.parse(`${day}T08:00:00Z`) - offset);
}

function values(input: LeadInput) {
  const rest: Omit<LeadInput, "receivedOn"> & { receivedOn?: string } = { ...input };
  delete rest.receivedOn;
  return rest;
}

export async function createLead(db: Db, ctx: Ctx, clientId: string, input: LeadInput) {
  assertRole(ctx, "manager");
  const client = await getClient(db, ctx, clientId);
  if (client.status !== "active") throw new NotFoundError("Restore this client before adding leads.");
  const tz = await agencyTimezone(db, ctx);
  const [lead] = await db
    .insert(leads)
    .values({ ...values(input), clientId, createdById: ctx.userId, receivedAt: receivedAtFor(input.receivedOn, tz) })
    .returning();
  await audit(db, ctx, "lead.created", clientId, { source: lead.source, channel: lead.channel });
  return lead;
}

export async function getLead(db: Db, ctx: Ctx, clientId: string, leadId: string) {
  await getClient(db, ctx, clientId);
  if (!isUuid(leadId)) throw new NotFoundError("Lead not found.");
  const [lead] = await db.select().from(leads).where(and(eq(leads.id, leadId), eq(leads.clientId, clientId))).limit(1);
  if (!lead) throw new NotFoundError("Lead not found.");
  return lead;
}

export async function updateLead(db: Db, ctx: Ctx, clientId: string, leadId: string, input: LeadInput) {
  assertRole(ctx, "manager");
  const existing = await getLead(db, ctx, clientId, leadId);
  const tz = await agencyTimezone(db, ctx);
  const [lead] = await db
    .update(leads)
    .set({ ...values(input), receivedAt: input.receivedOn ? receivedAtFor(input.receivedOn, tz) : existing.receivedAt })
    .where(and(eq(leads.id, leadId), eq(leads.clientId, clientId)))
    .returning();
  await audit(db, ctx, "lead.updated", clientId, { status: lead.status });
  return lead;
}

export async function setLeadStatus(db: Db, ctx: Ctx, clientId: string, leadId: string, status: (typeof leads.$inferSelect)["status"]) {
  assertRole(ctx, "manager");
  await getLead(db, ctx, clientId, leadId);
  await db.update(leads).set({ status }).where(and(eq(leads.id, leadId), eq(leads.clientId, clientId)));
  await audit(db, ctx, "lead.status_changed", clientId, { status });
}

export async function deleteLead(db: Db, ctx: Ctx, clientId: string, leadId: string) {
  assertRole(ctx, "manager");
  await getLead(db, ctx, clientId, leadId);
  await db.delete(leads).where(and(eq(leads.id, leadId), eq(leads.clientId, clientId)));
  await audit(db, ctx, "lead.deleted", clientId);
}

/** Leads received on days from..to (inclusive) in the agency's time zone. */
const inDays = (tz: string, from: string, to: string) =>
  sql`(${leads.receivedAt} at time zone ${tz})::date between ${from}::date and ${to}::date`;

export async function listLeads(
  db: Db,
  ctx: Ctx,
  clientId: string,
  range: { from: string; to: string },
  filters: { status?: string; source?: string } = {},
) {
  await getClient(db, ctx, clientId);
  const tz = await agencyTimezone(db, ctx);
  const conds = [eq(leads.clientId, clientId), inDays(tz, range.from, range.to)];
  if (filters.status) conds.push(eq(leads.status, filters.status as never));
  if (filters.source) conds.push(eq(leads.source, filters.source as never));
  return db.select().from(leads).where(and(...conds)).orderBy(desc(leads.receivedAt));
}

export type LeadStats = {
  total: number;
  won: number;
  lost: number;
  open: number;
  wonValue: number;
  bySource: Record<string, number>;
};

/** Lead counts per client for a date range (dashboard + leads page). */
export async function leadStatsByClient(db: Db, ctx: Ctx, range: { from: string; to: string }, clientIds?: string[]) {
  const tz = await agencyTimezone(db, ctx);
  const own = await db.select({ id: clients.id }).from(clients).where(eq(clients.agencyId, ctx.agencyId));
  const ids = own.map((c) => c.id).filter((id) => !clientIds || clientIds.includes(id));
  const out = new Map<string, LeadStats>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({
      clientId: leads.clientId,
      source: leads.source,
      status: leads.status,
      n: sql<number>`count(*)::int`,
      value: sql<number>`coalesce(sum(${leads.value}), 0)::float8`,
    })
    .from(leads)
    .where(and(inArray(leads.clientId, ids), inDays(tz, range.from, range.to)))
    .groupBy(leads.clientId, leads.source, leads.status);
  for (const r of rows) {
    const s = out.get(r.clientId) ?? { total: 0, won: 0, lost: 0, open: 0, wonValue: 0, bySource: {} };
    s.total += r.n;
    s.bySource[r.source] = (s.bySource[r.source] ?? 0) + r.n;
    if (r.status === "won") {
      s.won += r.n;
      s.wonValue += r.value;
    } else if (r.status === "lost") s.lost += r.n;
    else s.open += r.n;
    out.set(r.clientId, s);
  }
  return out;
}
