import { sql } from "drizzle-orm";
import { db } from "@/db";
import { setupAgency, createUser } from "@/server/agency";
import type { Ctx } from "@/server/permissions";

export async function resetDb() {
  await db.execute(sql`truncate table agencies, users, sessions, clients, audit_log, ads_imports, ads_campaign_metrics, ads_coverage, ads_keyword_metrics, ads_search_term_metrics, ads_recommendation_decisions, leads, ad_drafts, reports cascade`);
}

let n = 0;
/** Creates a fresh agency with an admin, and returns its admin ctx. */
export async function makeAgency(name = "Agency"): Promise<Ctx> {
  n += 1;
  const { agency, user } = await setupAgencyUnlocked(name, `admin${n}@example.com`);
  return { agencyId: agency.id, userId: user.id, role: "admin" };
}

// setupAgency refuses once any user exists; tests need several agencies,
// so the second+ agency is created by inserting directly.
async function setupAgencyUnlocked(agencyName: string, email: string) {
  const { agencies, users } = await import("@/db/schema");
  const { hashPassword } = await import("@/server/auth-core");
  const [agency] = await db.insert(agencies).values({ name: agencyName }).returning();
  const [user] = await db
    .insert(users)
    .values({ agencyId: agency.id, name: "Admin", email, role: "admin", passwordHash: await hashPassword("password1234") })
    .returning();
  return { agency, user };
}

export async function makeUser(admin: Ctx, role: Ctx["role"]): Promise<Ctx> {
  n += 1;
  const u = await createUser(db, admin, {
    name: role,
    email: `${role}${n}@example.com`,
    password: "password1234",
    role,
  });
  return { agencyId: admin.agencyId, userId: u.id, role };
}

export { setupAgency };
