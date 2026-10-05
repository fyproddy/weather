import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { createSession, deleteSession, getUserBySessionToken } from "./auth-core";
import type { Ctx } from "./permissions";

export const SESSION_COOKIE = "session";

/** Current user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(db, token);
});

/** Use in every protected page and server action. */
export async function requireCtx(): Promise<Ctx & { name: string; email: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { userId: user.id, agencyId: user.agencyId, role: user.role, name: user.name, email: user.email };
}

export async function startSession(userId: string) {
  const { token, expiresAt } = await createSession(db, userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(db, token);
  store.delete(SESSION_COOKIE);
}
