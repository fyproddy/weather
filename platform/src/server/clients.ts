import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  auditLog,
  clientCompetitors,
  clientFacts,
  clientLocations,
  clientServices,
  clients,
  googleConnections,
  googleProvider,
} from "@/db/schema";
import type { ClientInput } from "@/lib/validation";
import { assertRole, NotFoundError, type Ctx } from "./permissions";

/**
 * Every function here takes the caller's Ctx and filters by ctx.agencyId.
 * Child records (services, facts, …) are only reachable through a client
 * that has first been checked against the agency, so one agency can never
 * read or change another agency's data by guessing an id.
 */

export async function audit(
  db: Db,
  ctx: Ctx,
  action: string,
  clientId: string | null,
  details?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    agencyId: ctx.agencyId,
    userId: ctx.userId,
    clientId,
    action,
    details: details ?? null,
  });
}

export async function listClients(
  db: Db,
  ctx: Ctx,
  opts: { status?: "active" | "archived"; search?: string } = {},
) {
  const filters = [eq(clients.agencyId, ctx.agencyId), eq(clients.status, opts.status ?? "active")];
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    filters.push(or(ilike(clients.name, q), ilike(clients.industry, q), ilike(clients.city, q))!);
  }
  return db.select().from(clients).where(and(...filters)).orderBy(asc(clients.name));
}

export async function getClient(db: Db, ctx: Ctx, clientId: string) {
  if (!isUuid(clientId)) throw new NotFoundError("Client not found.");
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.agencyId, ctx.agencyId)))
    .limit(1);
  if (!client) throw new NotFoundError("Client not found.");
  return client;
}

export async function getClientProfile(db: Db, ctx: Ctx, clientId: string) {
  const client = await getClient(db, ctx, clientId);
  const [services, locations, competitors, facts, connections] = await Promise.all([
    db.select().from(clientServices).where(eq(clientServices.clientId, client.id)).orderBy(asc(clientServices.createdAt)),
    db.select().from(clientLocations).where(eq(clientLocations.clientId, client.id)).orderBy(asc(clientLocations.createdAt)),
    db.select().from(clientCompetitors).where(eq(clientCompetitors.clientId, client.id)).orderBy(asc(clientCompetitors.createdAt)),
    db.select().from(clientFacts).where(eq(clientFacts.clientId, client.id)).orderBy(asc(clientFacts.category), asc(clientFacts.createdAt)),
    db.select().from(googleConnections).where(eq(googleConnections.clientId, client.id)),
  ]);
  const byProvider = new Map(connections.map((c) => [c.provider, c]));
  return {
    client,
    services,
    locations,
    competitors,
    facts,
    connections: googleProvider.enumValues.map((provider) => ({
      provider,
      status: byProvider.get(provider)?.status ?? ("not_connected" as const),
      externalAccountName: byProvider.get(provider)?.externalAccountName ?? null,
      lastSyncedAt: byProvider.get(provider)?.lastSyncedAt ?? null,
    })),
  };
}

export async function createClient(db: Db, ctx: Ctx, input: ClientInput) {
  assertRole(ctx, "manager");
  const [client] = await db
    .insert(clients)
    .values({ ...input, agencyId: ctx.agencyId })
    .returning();
  await audit(db, ctx, "client.created", client.id, { name: client.name });
  return client;
}

export async function updateClient(db: Db, ctx: Ctx, clientId: string, input: ClientInput) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  const [client] = await db
    .update(clients)
    .set(input)
    .where(and(eq(clients.id, clientId), eq(clients.agencyId, ctx.agencyId)))
    .returning();
  await audit(db, ctx, "client.updated", client.id);
  return client;
}

export async function setClientArchived(db: Db, ctx: Ctx, clientId: string, archived: boolean) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  await db
    .update(clients)
    .set({ status: archived ? "archived" : "active", archivedAt: archived ? new Date() : null })
    .where(and(eq(clients.id, clientId), eq(clients.agencyId, ctx.agencyId)));
  await audit(db, ctx, archived ? "client.archived" : "client.restored", clientId);
}

/** Permanent delete: admin only, and only for clients already archived. */
export async function deleteClient(db: Db, ctx: Ctx, clientId: string) {
  assertRole(ctx, "admin");
  const client = await getClient(db, ctx, clientId);
  if (client.status !== "archived") {
    throw new Error("Archive the client before deleting it permanently.");
  }
  await audit(db, ctx, "client.deleted", null, { clientId, name: client.name });
  await db.delete(clients).where(and(eq(clients.id, clientId), eq(clients.agencyId, ctx.agencyId)));
}

// ---- Child records -------------------------------------------------------

type ChildTable =
  | typeof clientServices
  | typeof clientLocations
  | typeof clientCompetitors
  | typeof clientFacts;

const childTables = {
  service: clientServices,
  location: clientLocations,
  competitor: clientCompetitors,
  fact: clientFacts,
} satisfies Record<string, ChildTable>;
export type ChildKind = keyof typeof childTables;

export async function addService(db: Db, ctx: Ctx, clientId: string, input: { name: string; description: string | null }) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  const [row] = await db.insert(clientServices).values({ ...input, clientId }).returning();
  await audit(db, ctx, "service.added", clientId, { name: row.name });
  return row;
}

export async function addLocation(db: Db, ctx: Ctx, clientId: string, input: { name: string; radiusKm: number | null }) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  const [row] = await db.insert(clientLocations).values({ ...input, clientId }).returning();
  await audit(db, ctx, "location.added", clientId, { name: row.name });
  return row;
}

export async function addCompetitor(
  db: Db,
  ctx: Ctx,
  clientId: string,
  input: { name: string; website: string | null; notes: string | null },
) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  const [row] = await db.insert(clientCompetitors).values({ ...input, clientId }).returning();
  await audit(db, ctx, "competitor.added", clientId, { name: row.name });
  return row;
}

export async function addFact(
  db: Db,
  ctx: Ctx,
  clientId: string,
  input: { category: (typeof clientFacts.$inferInsert)["category"]; statement: string; source: string | null },
) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  // New facts always start unverified; verification is a separate, deliberate step.
  const [row] = await db.insert(clientFacts).values({ ...input, clientId, verified: false }).returning();
  await audit(db, ctx, "fact.added", clientId, { category: row.category });
  return row;
}

export async function setFactVerified(db: Db, ctx: Ctx, clientId: string, factId: string, verified: boolean) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  if (!isUuid(factId)) throw new NotFoundError();
  const updated = await db
    .update(clientFacts)
    .set({
      verified,
      verifiedAt: verified ? new Date() : null,
      verifiedById: verified ? ctx.userId : null,
    })
    .where(and(eq(clientFacts.id, factId), eq(clientFacts.clientId, clientId)))
    .returning({ id: clientFacts.id, statement: clientFacts.statement });
  if (updated.length === 0) throw new NotFoundError();
  await audit(db, ctx, verified ? "fact.verified" : "fact.unverified", clientId, {
    statement: updated[0].statement,
  });
}

export async function removeChild(db: Db, ctx: Ctx, clientId: string, kind: ChildKind, id: string) {
  assertRole(ctx, "manager");
  await getClient(db, ctx, clientId);
  if (!isUuid(id)) throw new NotFoundError();
  const table = childTables[kind];
  const deleted = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.clientId, clientId)))
    .returning({ id: table.id });
  if (deleted.length === 0) throw new NotFoundError();
  await audit(db, ctx, `${kind}.removed`, clientId);
}

/** Only verified facts — this is what AI assistants will be allowed to see. */
export async function getVerifiedFacts(db: Db, ctx: Ctx, clientId: string) {
  await getClient(db, ctx, clientId);
  return db
    .select()
    .from(clientFacts)
    .where(and(eq(clientFacts.clientId, clientId), eq(clientFacts.verified, true)));
}

export async function clientCounts(db: Db, ctx: Ctx) {
  const rows = await db
    .select({ status: clients.status, count: sql<number>`count(*)::int` })
    .from(clients)
    .where(eq(clients.agencyId, ctx.agencyId))
    .groupBy(clients.status);
  return {
    active: rows.find((r) => r.status === "active")?.count ?? 0,
    archived: rows.find((r) => r.status === "archived")?.count ?? 0,
  };
}

export async function recentActivity(db: Db, ctx: Ctx, limit = 10) {
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.agencyId, ctx.agencyId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string) {
  return UUID_RE.test(v);
}
