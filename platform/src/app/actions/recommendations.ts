"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { setRecommendationDecision } from "@/server/ads-analysis";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import type { FormState } from "./auth";

const text = (max: number) => z.string().max(max);
const findingSchema = z.object({
  id: text(600),
  kind: z.enum(["winner", "problem", "opportunity"]),
  severity: z.enum(["high", "medium", "low"]),
  level: z.enum(["account", "campaign", "keyword", "search_term"]),
  target: text(500),
  title: text(600),
  why: text(2000),
  impact: z.number(),
  action: z
    .object({
      type: text(50),
      detail: text(1000),
      text: text(500).optional(),
      matchType: z.enum(["exact", "phrase", "broad"]).optional(),
    })
    .optional(),
});

export async function decideAction(clientId: string, finding: unknown, status: "approved" | "dismissed" | "done" | null): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = findingSchema.safeParse(finding);
  if (!parsed.success) return { error: "That recommendation couldn't be saved." };
  try {
    await setRecommendationDecision(db, ctx, clientId, parsed.data as never, status);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }
  revalidatePath("/ads", "layout");
  return { ok: true };
}
