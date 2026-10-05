"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { AdsCsvError, decodeReport, parseAdsReport } from "@/lib/ads-csv";
import { formatDate } from "@/lib/date-range";
import { AdsImportConflictError, deleteAdsImport, importAdsReport } from "@/server/ads";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import { requireCtx } from "@/server/session";
import type { FormState } from "./auth";

const MAX_BYTES = 5 * 1024 * 1024;
const isIsoDate = (v: FormDataEntryValue | null): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export async function importAdsAction(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireCtx();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file exported from Google Ads." };
  if (file.size > MAX_BYTES) return { error: "That file is over 5 MB. Export a shorter date range." };
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) return { error: "Upload the .csv file Google Ads gives you." };

  const from = formData.get("periodFrom");
  const to = formData.get("periodTo");
  const fallbackPeriod: [string, string] | undefined =
    isIsoDate(from) && isIsoDate(to) && from <= to ? [from, to] : undefined;

  try {
    const report = parseAdsReport(decodeReport(new Uint8Array(await file.arrayBuffer())), { fallbackPeriod });
    await importAdsReport(db, ctx, clientId, { filename: file.name, report });
    revalidatePath("/", "layout");
    const n =
      report.type === "campaigns"
        ? new Set(report.rows.map((r) => r.campaignName)).size
        : report.type === "keywords"
          ? new Set(report.rows.map((r) => `${r.keyword}|${r.matchType}|${r.adGroupName}`)).size
          : new Set(report.rows.map((r) => r.searchTerm.toLowerCase())).size;
    const noun = { campaigns: "campaign", keywords: "keyword", search_terms: "search term" }[report.type];
    return {
      ok: true,
      message: `Imported ${n} ${noun}${n === 1 ? "" : "s"} for ${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}${report.daily ? " (daily)" : ""}.`,
      warnings: report.warnings,
    };
  } catch (e) {
    if (e instanceof AdsCsvError || e instanceof AdsImportConflictError || e instanceof ForbiddenError || e instanceof NotFoundError) {
      return { error: e.message };
    }
    throw e;
  }
}

export async function deleteAdsImportAction(clientId: string, importId: string): Promise<FormState> {
  const ctx = await requireCtx();
  try {
    await deleteAdsImport(db, ctx, clientId, importId);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
