"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { AdDraftError, createAdDraft, deleteAdDraft, editAdItem, setAdItemStatus } from "@/server/ad-drafts";
import { AD_WRITER_MODEL, AdWriterError, claudeAdWriter } from "@/server/ad-writer";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import { fieldErrors } from "@/lib/validation";
import type { FormState } from "./auth";

const expected = (e: unknown) =>
  e instanceof AdDraftError || e instanceof AdWriterError || e instanceof ForbiddenError || e instanceof NotFoundError;

const generateInput = z.object({
  focus: z.string().trim().min(1, "Choose what the ad is about").max(200),
  instructions: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
});

export async function generateAdsAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const values = { focus: String(formData.get("focus") ?? ""), instructions: String(formData.get("instructions") ?? "") };
  const parsed = generateInput.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  let id = "";
  try {
    id = (await createAdDraft(db, ctx, clientId, parsed.data, claudeAdWriter, AD_WRITER_MODEL)).id;
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message, values };
    throw e;
  }
  revalidatePath("/ads/creative");
  redirect(`/ads/creative/${id}`);
}

async function run(fn: () => Promise<unknown>, draftId: string): Promise<FormState> {
  await requireCtx();
  try {
    await fn();
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message };
    throw e;
  }
  revalidatePath(`/ads/creative/${draftId}`);
  return { ok: true };
}

export async function editAdItemAction(clientId: string, draftId: string, itemId: string, text: string) {
  const ctx = await requireCtx();
  return run(() => editAdItem(db, ctx, clientId, draftId, itemId, text), draftId);
}

export async function setAdItemStatusAction(clientId: string, draftId: string, itemId: string, status: string) {
  const ctx = await requireCtx();
  if (!["pending", "approved", "rejected"].includes(status)) return { error: "Unknown status." };
  return run(() => setAdItemStatus(db, ctx, clientId, draftId, itemId, status as "pending" | "approved" | "rejected"), draftId);
}

export async function deleteAdDraftAction(clientId: string, draftId: string): Promise<FormState> {
  const ctx = await requireCtx();
  try {
    await deleteAdDraft(db, ctx, clientId, draftId);
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/ads/creative");
  redirect("/ads/creative");
}
