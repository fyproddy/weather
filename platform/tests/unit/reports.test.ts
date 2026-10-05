import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { parseAdsReport } from "@/lib/ads-csv";
import { leadInput, clientInput } from "@/lib/validation";
import { importAdsReport } from "@/server/ads";
import { createClient } from "@/server/clients";
import { createLead } from "@/server/leads";
import { ForbiddenError, NotFoundError } from "@/server/permissions";
import {
  createReport,
  getReport,
  getSharedReport,
  lastMonth,
  previousPeriod,
  refreshReport,
  setReportSharing,
  type ReportData,
} from "@/server/reports";
import { makeAgency, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("periods", () => {
  it("compares a calendar month with the month before, other ranges with the same length", () => {
    expect(lastMonth("2026-10-05")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(lastMonth("2026-03-15")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousPeriod("2026-09-01", "2026-09-30")).toEqual({ from: "2026-08-01", to: "2026-08-31", label: "August 2026" });
    expect(previousPeriod("2026-09-05", "2026-10-04")).toMatchObject({ from: "2026-08-06", to: "2026-09-04", label: "previous 30 days" });
  });
});

async function setup() {
  const ctx = await makeAgency();
  const client = await createClient(db, ctx, clientInput.parse({ name: "WeatherGuard", city: "Johannesburg" }));
  const rows: string[] = [];
  for (let d = 1; d <= 31; d++) rows.push(`2026-08-${String(d).padStart(2, "0")},A,ZAR,100,100,10,1`);
  for (let d = 1; d <= 30; d++) rows.push(`2026-09-${String(d).padStart(2, "0")},A,ZAR,120,100,10,2`);
  const csv = `Day,Campaign,Currency code,Cost,Impr.,Clicks,Conversions\n${rows.join("\n")}\n`;
  await importAdsReport(db, ctx, client.id, { filename: "a.csv", report: parseAdsReport(csv) });
  for (const [name, source, status] of [["Thabo", "google_ads", "won"], ["Lerato", "google_ads", "new"], ["Sipho", "referral", "new"]]) {
    await createLead(db, ctx, client.id, leadInput.parse({ name, phone: "0825551234", channel: "call", source, status, value: status === "won" ? "5000" : "", receivedOn: "2026-09-10" }));
  }
  return { ctx, client };
}

describe("reports", () => {
  it("snapshots the period's results with a fair comparison and no personal details", async () => {
    const { ctx, client } = await setup();
    const r = await createReport(db, ctx, client.id, { from: "2026-09-01", to: "2026-09-30", title: "September 2026" });
    const d = r.data as ReportData;
    expect(d.ads).toMatchObject({ complete: true, fair: true, current: { cost: 3600, conversions: 60 }, previous: { cost: 3100, conversions: 31 } });
    expect(d.leads.current).toMatchObject({ total: 3, won: 1, wonValue: 5000, bySource: { google_ads: 2, referral: 1 } });
    expect(d.leads.costPerLead).toBe(1800); // R3,600 ÷ 2 Google Ads leads
    expect(d.previous.label).toBe("August 2026");
    const text = JSON.stringify(d);
    expect(text).not.toContain("Thabo");
    expect(text).not.toContain("0825551234");
  });

  it("keeps numbers frozen until refreshed", async () => {
    const { ctx, client } = await setup();
    const r = await createReport(db, ctx, client.id, { from: "2026-09-01", to: "2026-09-30", title: "Sep" });
    await createLead(db, ctx, client.id, leadInput.parse({ name: "Late", channel: "call", source: "google_ads", receivedOn: "2026-09-20" }));
    expect(((await getReport(db, ctx, r.id)).data as ReportData).leads.current.total).toBe(3);
    await refreshReport(db, ctx, r.id);
    expect(((await getReport(db, ctx, r.id)).data as ReportData).leads.current.total).toBe(4);
  });

  it("share links work until revoked, and are unguessable", async () => {
    const { ctx, client } = await setup();
    const r = await createReport(db, ctx, client.id, { from: "2026-09-01", to: "2026-09-30", title: "Sep" });
    const token = (await setReportSharing(db, ctx, r.id, true))!;
    expect(token.length).toBeGreaterThanOrEqual(30);
    expect((await getSharedReport(db, token))?.id).toBe(r.id);
    expect(await getSharedReport(db, "short")).toBeNull();
    expect(await getSharedReport(db, token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBeNull();
    await setReportSharing(db, ctx, r.id, false);
    expect(await getSharedReport(db, token)).toBeNull();
  });

  it("is private to the agency; viewers can read but not create or share", async () => {
    const { ctx, client } = await setup();
    const r = await createReport(db, ctx, client.id, { from: "2026-09-01", to: "2026-09-30", title: "Sep" });
    const other = await makeAgency("Other");
    await expect(getReport(db, other, r.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(createReport(db, other, client.id, { from: "2026-09-01", to: "2026-09-30", title: "x" })).rejects.toBeInstanceOf(NotFoundError);
    const viewer = await makeUser(ctx, "viewer");
    expect((await getReport(db, viewer, r.id)).id).toBe(r.id);
    await expect(createReport(db, viewer, client.id, { from: "2026-09-01", to: "2026-09-30", title: "x" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setReportSharing(db, viewer, r.id, true)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
