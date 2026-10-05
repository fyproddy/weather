import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agencies, users, type UserRole } from "@/db/schema";
import { hashPassword } from "./auth-core";
import { audit } from "./clients";
import { assertRole, type Ctx } from "./permissions";

export async function hasAnyUser(db: Db) {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
  return row.n > 0;
}

export class SetupAlreadyDoneError extends Error {
  constructor() {
    super("Setup has already been completed. Please sign in.");
  }
}

/**
 * First-run setup: creates the agency and its first admin.
 * Runs in a transaction with a table lock so two simultaneous
 * submissions can't both create an admin.
 */
export async function setupAgency(
  db: Db,
  input: { agencyName: string; name: string; email: string; password: string },
) {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    await tx.execute(sql`lock table users in exclusive mode`);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(users);
    if (n > 0) throw new SetupAlreadyDoneError();
    const [agency] = await tx.insert(agencies).values({ name: input.agencyName }).returning();
    const [user] = await tx
      .insert(users)
      .values({
        agencyId: agency.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "admin",
      })
      .returning();
    return { agency, user };
  });
}

export async function getAgency(db: Db, ctx: Ctx) {
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, ctx.agencyId)).limit(1);
  return agency;
}

export async function updateAgencyName(db: Db, ctx: Ctx, name: string) {
  assertRole(ctx, "admin");
  await db.update(agencies).set({ name }).where(eq(agencies.id, ctx.agencyId));
  await audit(db, ctx, "agency.updated", null, { name });
}

export async function listUsers(db: Db, ctx: Ctx) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.agencyId, ctx.agencyId))
    .orderBy(asc(users.createdAt));
}

export class EmailTakenError extends Error {
  constructor() {
    super("A user with that email already exists.");
  }
}

export async function createUser(
  db: Db,
  ctx: Ctx,
  input: { name: string; email: string; password: string; role: UserRole },
) {
  assertRole(ctx, "admin");
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw new EmailTakenError();
  const [user] = await db
    .insert(users)
    .values({
      agencyId: ctx.agencyId,
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id, email: users.email, role: users.role });
  await audit(db, ctx, "user.created", null, { email: user.email, role: user.role });
  return user;
}
