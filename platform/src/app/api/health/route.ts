import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Used by the host to check the app and its database are up. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
