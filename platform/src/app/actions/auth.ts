"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { authenticate } from "@/server/auth-core";
import { resetAdminPassword, setupAgency, SetupAlreadyDoneError } from "@/server/agency";
import { headers } from "next/headers";
import { allowAttempt } from "@/server/rate-limit";
import { endSession, startSession } from "@/server/session";
import { fieldErrors, setupInput } from "@/lib/validation";
import { setupCodeMatches, setupCodeStatus } from "@/server/setup-code";

export type FormState = {
  error?: string;
  fields?: Record<string, string>;
  /** What the user submitted, so a failed form can be re-filled instead of cleared. */
  values?: Record<string, string>;
  ok?: boolean;
  message?: string;
  warnings?: string[];
};

const loginInput = z.object({
  email: z.string().trim().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginInput.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: { email } };
  const user = await authenticate(db, parsed.data.email, parsed.data.password);
  if (!user) return { error: "Email or password is incorrect.", values: { email } };
  await startSession(user.id);
  redirect("/");
}

export async function setupAction(_: FormState, formData: FormData): Promise<FormState> {
  if (setupCodeStatus() === "missing") return { error: "Setup is locked: add a SETUP_CODE variable on the server first." };
  if (!setupCodeMatches(formData.get("setupCode"))) return { error: "That setup code is wrong." };
  const parsed = setupInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  try {
    const { user } = await setupAgency(db, parsed.data);
    await startSession(user.id);
  } catch (e) {
    if (e instanceof SetupAlreadyDoneError) return { error: e.message };
    throw e;
  }
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

const resetInput = z
  .object({
    email: z.string().trim().min(1, "Enter your email"),
    setupCode: z.string().min(1, "Enter the setup code"),
    newPassword: z.string().min(10, "Password must be at least 10 characters").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "The two passwords don't match", path: ["confirm"] });

/** Forgotten password for an admin: proven with the server's setup code. */
export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowAttempt(`reset:${ip}`)) return { error: "Too many attempts. Wait 15 minutes and try again.", values: { email } };
  if (setupCodeStatus() !== "required") return { error: "Password reset isn't available: no SETUP_CODE is set on the server.", values: { email } };
  const parsed = resetInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: { email } };
  const ok = setupCodeMatches(parsed.data.setupCode) && (await resetAdminPassword(db, parsed.data.email, parsed.data.newPassword));
  // Same message whether the code or the email was wrong, so neither can be guessed separately.
  if (!ok) return { error: "That email and setup code don't match an admin account.", values: { email } };
  return { ok: true, message: "Password changed. You can sign in now." };
}
