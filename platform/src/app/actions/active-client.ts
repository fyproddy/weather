"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { getClient } from "@/server/clients";
import { ACTIVE_CLIENT_COOKIE } from "@/server/active-client";
import { requireCtx } from "@/server/session";

export async function setActiveClientAction(clientId: string) {
  const ctx = await requireCtx();
  const client = await getClient(db, ctx, clientId); // throws if not this agency's
  (await cookies()).set(ACTIVE_CLIENT_COOKIE, client.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
