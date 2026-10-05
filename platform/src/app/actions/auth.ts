"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { authenticate } from "@/server/auth-core";
import { setupAgency, SetupAlreadyDoneError } from "@/server/agency";
import { endSession, startSession } from "@/server/session";
import { fieldErrors, setupInput } from "@/lib/validation";

export type FormState = {
  error?: string;
  fields?: Record<string, string>;
  /** What the user submitted, so a failed form can be re-filled instead of cleared. */
  values?: Record<string, string>;
  ok?: boolean;
  message?: string;
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
