"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { createUser, EmailTakenError, updateAgencyName } from "@/server/agency";
import { ForbiddenError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import { fieldErrors, userInput } from "@/lib/validation";
import type { FormState } from "./auth";

const agencyInput = z.object({ name: z.string().trim().min(1, "Agency name is required").max(200) });

export async function updateAgencyAction(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = agencyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  try {
    await updateAgencyName(db, ctx, parsed.data.name);
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function createUserAction(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = userInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  try {
    await createUser(db, ctx, parsed.data);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof EmailTakenError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings");
  return { ok: true, message: `Added ${parsed.data.email}.` };
}
