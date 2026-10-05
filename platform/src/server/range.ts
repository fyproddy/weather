import "server-only";
import { db } from "@/db";
import { previousRange, resolveRange, todayIn } from "@/lib/date-range";
import { getAgency } from "./agency";
import type { Ctx } from "./permissions";

/** Date range from the URL, in the agency's time zone, plus the period before it. */
export async function rangeFromParams(ctx: Ctx, sp: Record<string, string | string[] | undefined>) {
  const agency = await getAgency(db, ctx);
  const today = todayIn(agency.timezone);
  const range = resolveRange({ range: sp.range, from: sp.from, to: sp.to }, today);
  return { range, previous: previousRange(range), today, agency };
}
