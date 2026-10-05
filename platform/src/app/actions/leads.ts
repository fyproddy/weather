"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { createLead, deleteLead, setLeadStatus, updateLead } from "@/server/leads";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import { fieldErrors, leadInput, LEAD_STATUSES } from "@/lib/validation";
import type { FormState } from "./auth";

function submitted(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

async function guard(fn: () => Promise<unknown>): Promise<FormState | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }
}

export async function createLeadAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = leadInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const err = await guard(() => createLead(db, ctx, clientId, parsed.data));
  if (err) return { ...err, values: submitted(formData) };
  revalidatePath("/", "layout");
  redirect("/leads?added=1");
}

export async function updateLeadAction(clientId: string, leadId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = leadInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const err = await guard(() => updateLead(db, ctx, clientId, leadId, parsed.data));
  if (err) return { ...err, values: submitted(formData) };
  revalidatePath("/", "layout");
  redirect("/leads");
}

export async function setLeadStatusAction(clientId: string, leadId: string, status: string): Promise<FormState> {
  const ctx = await requireCtx();
  if (!LEAD_STATUSES.includes(status as never)) return { error: "Unknown status." };
  const err = await guard(() => setLeadStatus(db, ctx, clientId, leadId, status as (typeof LEAD_STATUSES)[number]));
  revalidatePath("/", "layout");
  return err ?? { ok: true };
}

export async function deleteLeadAction(clientId: string, leadId: string): Promise<FormState> {
  const ctx = await requireCtx();
  const err = await guard(() => deleteLead(db, ctx, clientId, leadId));
  if (err) return err;
  revalidatePath("/", "layout");
  redirect("/leads");
}
