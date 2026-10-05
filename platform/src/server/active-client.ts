import "server-only";
import { cookies } from "next/headers";
import { db } from "@/db";
import type { Client } from "@/db/schema";
import { getClient, listClients } from "./clients";
import { NotFoundError, type Ctx } from "./permissions";

export const ACTIVE_CLIENT_COOKIE = "active_client";

/**
 * The client the section pages (Ads, SEO, …) are showing.
 * Always re-checked against the agency, so a stale or tampered cookie
 * falls back to the first active client instead of leaking data.
 */
export async function getActiveClient(ctx: Ctx): Promise<Client | null> {
  const id = (await cookies()).get(ACTIVE_CLIENT_COOKIE)?.value;
  if (id) {
    try {
      const client = await getClient(db, ctx, id);
      if (client.status === "active") return client;
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
    }
  }
  const [first] = await listClients(db, ctx);
  return first ?? null;
}
