"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { changePassword, createUser, EmailTakenError, updateAgencyName, WrongPasswordError } from "@/server/agency";
import { ForbiddenError } from "@/server/permissions";
import { requireCtx, startSession } from "@/server/session";
import { setupCodeMatches } from "@/server/setup-code";
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

const passwordInput = z
  .object({
    current: z.string().max(200).optional().default(""),
    newPassword: z.string().min(10, "Password must be at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "The two new passwords don't match", path: ["confirm"] });

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const parsed = passwordInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const current = parsed.data.current;
  // Admins may prove themselves with the setup code instead of the old password.
  const setupCodeOk = ctx.role === "admin" && current !== "" && setupCodeMatches(current) && !!process.env.SETUP_CODE;
  try {
    await changePassword(db, ctx, { currentPassword: current, setupCodeOk, newPassword: parsed.data.newPassword });
  } catch (e) {
    if (e instanceof WrongPasswordError) return { fields: { current: e.message } };
    throw e;
  }
  // All sessions were ended; keep this browser signed in with a fresh one.
  await startSession(ctx.userId);
  return { ok: true, message: "Password changed. Use the new password next time you sign in." };
}
