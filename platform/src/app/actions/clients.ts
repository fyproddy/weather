"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { db } from "@/db";
import {
  addCompetitor,
  addFact,
  addLocation,
  addService,
  createClient,
  deleteClient,
  removeChild,
  setClientArchived,
  setFactVerified,
  updateClient,
  type ChildKind,
} from "@/server/clients";
import { ForbiddenError, NotFoundError, type Ctx } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import {
  clientInput,
  competitorInput,
  factInput,
  fieldErrors,
  locationInput,
  serviceInput,
} from "@/lib/validation";
import type { FormState } from "./auth";

/** Turns expected errors into a message for the form; anything else is a real bug and bubbles up. */
async function guarded(fn: (ctx: Ctx) => Promise<FormState | void>): Promise<FormState> {
  const ctx = await requireCtx();
  try {
    return (await fn(ctx)) ?? { ok: true };
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return { error: e.message };
    if (e instanceof Error && e.message.startsWith("Archive the client")) return { error: e.message };
    throw e;
  }
}

function parse<T extends z.ZodType>(schema: T, formData: FormData) {
  return schema.safeParse(Object.fromEntries(formData));
}

function submitted(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  return out;
}

const refresh = (clientId: string) => {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/", "layout");
};

export async function createClientAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(clientInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  let id = "";
  const result = await guarded(async (ctx) => {
    id = (await createClient(db, ctx, parsed.data)).id;
  });
  if (result.error) return { ...result, values: submitted(formData) };
  revalidatePath("/", "layout");
  redirect(`/clients/${id}`);
}

export async function updateClientAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(clientInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const result = await guarded(async (ctx) => {
    await updateClient(db, ctx, clientId, parsed.data);
  });
  if (result.error) return { ...result, values: submitted(formData) };
  refresh(clientId);
  redirect(`/clients/${clientId}`);
}

export async function setArchivedAction(clientId: string, archived: boolean): Promise<FormState> {
  const result = await guarded((ctx) => setClientArchived(db, ctx, clientId, archived));
  refresh(clientId);
  revalidatePath("/clients");
  return result;
}

export async function deleteClientAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  const result = await guarded((ctx) => deleteClient(db, ctx, clientId));
  if (result.error) return result;
  revalidatePath("/", "layout");
  redirect("/clients?status=archived");
}

export async function addServiceAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(serviceInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const result = await guarded(async (ctx) => {
    await addService(db, ctx, clientId, parsed.data);
  });
  refresh(clientId);
  return result;
}

export async function addLocationAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(locationInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const result = await guarded(async (ctx) => {
    await addLocation(db, ctx, clientId, parsed.data);
  });
  refresh(clientId);
  return result;
}

export async function addCompetitorAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(competitorInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const result = await guarded(async (ctx) => {
    await addCompetitor(db, ctx, clientId, parsed.data);
  });
  refresh(clientId);
  return result;
}

export async function addFactAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const parsed = parse(factInput, formData);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: submitted(formData) };
  const result = await guarded(async (ctx) => {
    await addFact(db, ctx, clientId, parsed.data);
  });
  refresh(clientId);
  return result;
}

export async function setFactVerifiedAction(clientId: string, factId: string, verified: boolean): Promise<FormState> {
  const result = await guarded((ctx) => setFactVerified(db, ctx, clientId, factId, verified));
  refresh(clientId);
  return result;
}

const CHILD_KINDS: ChildKind[] = ["service", "location", "competitor", "fact"];

export async function removeChildAction(clientId: string, kind: ChildKind, id: string): Promise<FormState> {
  if (!CHILD_KINDS.includes(kind)) return { error: "Unknown item." };
  const result = await guarded((ctx) => removeChild(db, ctx, clientId, kind, id));
  refresh(clientId);
  return result;
}
