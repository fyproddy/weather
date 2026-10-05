import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agencies, auditLog, sessions, users, type UserRole } from "@/db/schema";
import { hashPassword, verifyPassword } from "./auth-core";
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

export class WrongPasswordError extends Error {
  constructor(message = "Your current password is incorrect.") {
    super(message);
  }
}

/**
 * Changes the signed-in user's password. Proof is the current password, or —
 * for admins who've forgotten it — the server's setup code (checked by the
 * caller). Every existing session for the user is signed out.
 */
export async function changePassword(
  db: Db,
  ctx: Ctx,
  input: { currentPassword?: string; setupCodeOk?: boolean; newPassword: string },
) {
  const [user] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
  if (!user) throw new WrongPasswordError();
  const byPassword = !!input.currentPassword && (await verifyPassword(input.currentPassword, user.passwordHash));
  const bySetupCode = ctx.role === "admin" && input.setupCodeOk === true;
  if (!byPassword && !bySetupCode) {
    throw new WrongPasswordError(
      ctx.role === "admin" ? "Enter your current password or the setup code." : "Your current password is incorrect.",
    );
  }
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await audit(db, ctx, "user.password_changed", null, { via: byPassword ? "password" : "setup_code" });
}

/**
 * Signed-out recovery for admins: sets a new password for the admin with this
 * email. The caller must already have checked the server's setup code.
 * Returns false (without saying why) when no admin has that email.
 */
export async function resetAdminPassword(db: Db, email: string, newPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  if (!user || user.role !== "admin") return false;
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await db.insert(auditLog).values({ agencyId: user.agencyId, userId: user.id, action: "user.password_changed", details: { via: "reset_page" } });
  return true;
}
