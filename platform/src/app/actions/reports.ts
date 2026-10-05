"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addDays, formatDate, todayIn } from "@/lib/date-range";
import { getAgency } from "@/server/agency";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { createReport, deleteReport, lastMonth, refreshReport, setReportSharing, updateReportSummary } from "@/server/reports";
import { requireCtx } from "@/server/session";
import type { FormState } from "./auth";

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const expected = (e: unknown) => e instanceof ForbiddenError || e instanceof NotFoundError;

export async function createReportAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const agency = await getAgency(db, ctx);
  const today = todayIn(agency.timezone);
  const preset = String(formData.get("period") ?? "last_month");
  let from: string;
  let to: string;
  let title: string;
  if (preset === "last_month") {
    ({ from, to } = lastMonth(today));
    title = new Date(`${from}T00:00:00Z`).toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" });
  } else if (preset === "last_30") {
    from = addDays(today, -30);
    to = addDays(today, -1);
    title = `${formatDate(from)} – ${formatDate(to)}`;
  } else {
    const f = formData.get("from");
    const t = formData.get("to");
    if (!isDate(f) || !isDate(t) || f > t || t > today) {
      return { error: "Pick a start and end date (not in the future).", values: { period: "custom", from: String(f ?? ""), to: String(t ?? "") } };
    }
    from = f;
    to = t;
    title = `${formatDate(from)} – ${formatDate(to)}`;
  }
  let id = "";
  try {
    id = (await createReport(db, ctx, clientId, { from, to, title })).id;
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/reports");
  redirect(`/reports/${id}`);
}

async function guarded(fn: () => Promise<unknown>, id: string): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message };
    throw e;
  }
  revalidatePath(`/reports/${id}`);
  return { ok: true };
}

export async function saveSummaryAction(reportId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const summary = String(formData.get("summary") ?? "").trim().slice(0, 5000) || null;
  const r = await guarded(() => updateReportSummary(db, ctx, reportId, summary), reportId);
  return r.error ? r : { ok: true, message: "Saved." };
}

export async function refreshReportAction(reportId: string) {
  const ctx = await requireCtx();
  return guarded(() => refreshReport(db, ctx, reportId), reportId);
}

export async function setSharingAction(reportId: string, on: boolean) {
  const ctx = await requireCtx();
  return guarded(() => setReportSharing(db, ctx, reportId, on), reportId);
}

export async function deleteReportAction(reportId: string): Promise<FormState> {
  const ctx = await requireCtx();
  try {
    await deleteReport(db, ctx, reportId);
  } catch (e) {
    if (expected(e)) return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/reports");
  redirect("/reports");
}
