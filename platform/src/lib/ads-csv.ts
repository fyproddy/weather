/**
 * Reads a Google Ads campaign report exported from the Google Ads web UI
 * ("Campaigns" → Download → CSV / Excel CSV).
 *
 * Rules:
 * - Only numbers present in the file are used. Nothing is estimated.
 * - Ratios in the file (CTR, Avg. CPC, Cost / conv.) are ignored; the app
 *   recomputes them from the raw sums so totals are always consistent.
 * - Anything ambiguous is reported back rather than guessed.
 */

export type ParsedAdsRow = {
  campaignName: string;
  campaignStatus: string | null;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  currency: string | null;
  budget: number | null;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number | null;
  conversionValue: number | null;
  searchImpressionShare: number | null;
};

export type ParsedAdsReport = {
  rows: ParsedAdsRow[];
  periodStart: string;
  periodEnd: string;
  daily: boolean;
  currency: string | null;
  warnings: string[];
};

export class AdsCsvError extends Error {}

export const MAX_ROWS = 50_000;

const COLUMNS = {
  campaign: ["campaign", "campaign name"],
  status: ["campaign status", "campaign state", "status"],
  day: ["day", "date"],
  currency: ["currency code", "currency"],
  budget: ["budget", "daily budget", "avg. daily budget"],
  cost: ["cost", "spend", "amount spent"],
  impressions: ["impr.", "impressions", "impr"],
  clicks: ["clicks"],
  conversions: ["conversions", "conv."],
  conversionValue: ["conv. value", "conversion value", "total conv. value"],
  searchImpressionShare: ["search impr. share", "search impression share"],
} as const;
type ColumnKey = keyof typeof COLUMNS;

// ---- Text decoding & CSV splitting ---------------------------------------

/** Google's "Excel CSV" is UTF-16 with tabs; plain "CSV" is UTF-8 with commas. */
export function decodeReport(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  // UTF-16 without a BOM: lots of zero bytes in odd positions.
  const sample = bytes.subarray(0, 400);
  let oddZeros = 0;
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0) oddZeros++;
  if (sample.length > 20 && oddZeros > sample.length / 4) return new TextDecoder("utf-16le").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

/** RFC 4180-style splitter: quoted fields, doubled quotes, newlines inside quotes. */
export function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string) {
  const head = text.split(/\r?\n/).slice(0, 10).join("\n");
  const tabs = (head.match(/\t/g) ?? []).length;
  const commas = (head.match(/,/g) ?? []).length;
  return tabs > commas / 2 ? "\t" : ",";
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// ---- Numbers --------------------------------------------------------------

export type ParsedNumber = { value: number | null; bound?: boolean };

/**
 * Parses numbers as Google Ads writes them: "1,234.56", "R 1 234.56",
 * "12.5%", "--", "< 10%". Percentages are returned as fractions (0.125).
 */
export function parseNumber(raw: string | undefined): ParsedNumber {
  if (raw === undefined) return { value: null };
  let s = raw.replace(/ /g, " ").trim();
  if (s === "" || /^-{1,2}$/.test(s) || s === " --") return { value: null };
  if (/^[<>]/.test(s)) return { value: null, bound: true };
  const percent = s.endsWith("%");
  s = s.replace(/%$/, "");
  // Drop currency symbols/codes and spaces used as thousands separators.
  s = s.replace(/[^\d.,\-]/g, "");
  if (s === "" || s === "-") return { value: null };
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // Whichever comes last is the decimal separator.
    s = lastDot > lastComma ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if (lastComma > -1) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, ""); // 1.234.567
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null };
  return { value: percent ? n / 100 : n };
}

// ---- Dates ----------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** Accepts 2026-09-01, 2026/09/01, "Sep 1, 2026", "1 September 2026", with an optional weekday. */
export function parseDate(raw: string): string | null {
  const s = raw.trim().replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i, "");
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    return month ? iso(+m[3], month, +m[2]) : null;
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    return month ? iso(+m[3], month, +m[1]) : null;
  }
  return null;
}

/** "September 1, 2026 - September 30, 2026" → ["2026-09-01", "2026-09-30"] */
export function parseDateRange(line: string): [string, string] | null {
  const parts = line.replace(/^"|"$/g, "").split(/\s+[-–—]\s+|\s+to\s+/i);
  if (parts.length !== 2) return null;
  const a = parseDate(parts[0]);
  const b = parseDate(parts[1]);
  return a && b && a <= b ? [a, b] : null;
}

// ---- Report ---------------------------------------------------------------

export function parseAdsReport(
  text: string,
  opts: { fallbackPeriod?: [string, string] } = {},
): ParsedAdsReport {
  const delimiter = detectDelimiter(text);
  const table = splitRows(text, delimiter);

  const headerIndex = table.findIndex(
    (r, i) => i < 15 && r.some((c) => COLUMNS.campaign.includes(norm(c) as never)) && r.some((c) => COLUMNS.cost.includes(norm(c) as never)),
  );
  if (headerIndex === -1) {
    throw new AdsCsvError(
      "Couldn't find the column headings. The file needs at least Campaign, Cost, Impr. and Clicks columns — download it from the Campaigns page in Google Ads.",
    );
  }

  const header = table[headerIndex].map(norm);
  const col: Partial<Record<ColumnKey, number>> = {};
  for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
    const idx = header.findIndex((h) => (COLUMNS[key] as readonly string[]).includes(h));
    if (idx !== -1) col[key] = idx;
  }
  const missing = (["impressions", "clicks"] as const).filter((k) => col[k] === undefined);
  if (missing.length) {
    const label = { impressions: "Impr.", clicks: "Clicks" };
    throw new AdsCsvError(`The file is missing these columns: ${missing.map((k) => label[k]).join(", ")}.`);
  }

  const warnings: string[] = [];
  if (col.conversions === undefined) warnings.push("No Conversions column — conversion figures will show as not available.");

  // Period for non-daily reports: from the date-range line above the header.
  let filePeriod: [string, string] | null = null;
  for (const r of table.slice(0, headerIndex)) {
    filePeriod = parseDateRange(r.join(" ").trim());
    if (filePeriod) break;
  }
  const daily = col.day !== undefined;
  if (!daily && !filePeriod) {
    if (opts.fallbackPeriod) filePeriod = opts.fallbackPeriod;
    else
      throw new AdsCsvError(
        "This report has no Day column and no date range line, so we can't tell which dates it covers. Add the dates below, or re-download it segmented by Day.",
      );
  }

  const cell = (r: string[], k: ColumnKey) => (col[k] === undefined ? undefined : r[col[k]!]);
  const merged = new Map<string, ParsedAdsRow & { eligible: number | null; parts: number }>();
  let boundedShare = 0;
  const badRows: number[] = [];

  for (let i = headerIndex + 1; i < table.length; i++) {
    const r = table[i];
    if (r.every((c) => c.trim() === "")) continue;
    if (r.slice(0, 3).some((c) => /^total\b/i.test(c.trim()))) {
      continue;
    }
    const name = (cell(r, "campaign") ?? "").trim();
    if (!name) {
      badRows.push(i + 1);
      continue;
    }

    let start: string;
    let end: string;
    if (daily) {
      const d = parseDate(cell(r, "day") ?? "");
      if (!d) {
        badRows.push(i + 1);
        continue;
      }
      start = end = d;
    } else {
      [start, end] = filePeriod!;
    }

    const cost = parseNumber(cell(r, "cost")).value ?? 0;
    const impressions = parseNumber(cell(r, "impressions")).value ?? 0;
    const clicks = parseNumber(cell(r, "clicks")).value ?? 0;
    if (cost < 0 || impressions < 0 || clicks < 0) {
      badRows.push(i + 1);
      continue;
    }
    const share = parseNumber(cell(r, "searchImpressionShare"));
    if (share.bound) boundedShare++;
    const conversions = parseNumber(cell(r, "conversions")).value;
    const conversionValue = parseNumber(cell(r, "conversionValue")).value;

    const key = `${name}\u0000${start}\u0000${end}`;
    const existing = merged.get(key);
    // Eligible impressions = impressions / share; lets us combine shares correctly.
    const eligible = share.value && share.value > 0 ? impressions / share.value : null;
    if (existing) {
      existing.cost += cost;
      existing.impressions += impressions;
      existing.clicks += clicks;
      existing.conversions = sumNullable(existing.conversions, conversions);
      existing.conversionValue = sumNullable(existing.conversionValue, conversionValue);
      existing.eligible = existing.eligible !== null && eligible !== null ? existing.eligible + eligible : null;
      existing.parts++;
    } else {
      merged.set(key, {
        campaignName: name,
        campaignStatus: cell(r, "status")?.trim() || null,
        periodStart: start,
        periodEnd: end,
        currency: cell(r, "currency")?.trim().toUpperCase() || null,
        budget: parseNumber(cell(r, "budget")).value,
        cost,
        impressions,
        clicks,
        conversions,
        conversionValue,
        searchImpressionShare: null,
        eligible,
        parts: 1,
      });
    }
    if (merged.size > MAX_ROWS) throw new AdsCsvError(`The file has more than ${MAX_ROWS.toLocaleString()} rows. Export a shorter date range.`);
  }

  const rows: ParsedAdsRow[] = [...merged.values()].map(({ eligible, parts, ...row }) => ({
    ...row,
    cost: round(row.cost, 2),
    conversions: row.conversions === null ? null : round(row.conversions, 2),
    conversionValue: row.conversionValue === null ? null : round(row.conversionValue, 2),
    searchImpressionShare: eligible && eligible > 0 ? round(Math.min(1, row.impressions / eligible), 4) : null,
    // A budget can't be summed across segments; keep it only when the row wasn't split.
    budget: parts > 1 ? null : row.budget,
  }));

  if (rows.length === 0) throw new AdsCsvError("The file has headings but no campaign rows.");

  const combined = [...merged.values()].filter((r) => r.parts > 1).length;
  if (combined) warnings.push(`${combined} campaign rows were split by another segment (e.g. device) and have been added together.`);
  if (badRows.length) warnings.push(`Skipped ${badRows.length} row(s) that couldn't be read (lines ${badRows.slice(0, 5).join(", ")}${badRows.length > 5 ? ", …" : ""}).`);
  if (boundedShare) warnings.push(`${boundedShare} row(s) had search impression share reported as a range (like "< 10%"); those are left blank.`);

  const currencies = [...new Set(rows.map((r) => r.currency).filter(Boolean))] as string[];
  if (currencies.length > 1) throw new AdsCsvError(`The file mixes currencies (${currencies.join(", ")}). Import one account at a time.`);

  const days = rows.map((r) => r.periodStart).sort();
  const periodStart = filePeriod?.[0] ?? days[0];
  const periodEnd = filePeriod?.[1] ?? rows.map((r) => r.periodEnd).sort().at(-1)!;
  if (daily && filePeriod && (days[0] < filePeriod[0] || days.at(-1)! > filePeriod[1])) {
    throw new AdsCsvError("Some rows have dates outside the report's own date range. Re-download the report and try again.");
  }

  return { rows, periodStart, periodEnd, daily, currency: currencies[0] ?? null, warnings };
}

function sumNullable(a: number | null, b: number | null) {
  return a === null && b === null ? null : (a ?? 0) + (b ?? 0);
}

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
